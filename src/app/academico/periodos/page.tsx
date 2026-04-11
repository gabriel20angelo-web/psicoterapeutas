"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  GraduationCap, Plus, Copy, Trash2, ChevronDown, ChevronRight,
  ArrowLeft, Pencil, ExternalLink, BookOpen,
} from "lucide-react";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import {
  getDisciplinasByPeriodo, createDisciplina,
  updateDisciplina, deleteDisciplina, duplicarPeriodo,
  createPeriodo, getPeriodosEntities, updatePeriodo, deletePeriodo,
  getGraduacoes, createGraduacao, updateGraduacao, deleteGraduacao,
} from "@/lib/academico-data";
import DisciplinaForm from "../_components/DisciplinaForm";
import type { Disciplina, DisciplinaInput, Periodo, Graduacao } from "@/types/academico";
import { LABEL_STATUS_DISCIPLINA, LABEL_TIPO_DISCIPLINA } from "@/types/academico";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  cursando:  { bg: "var(--green-bg, rgba(16,185,129,.1))", text: "var(--green-text, #10b981)" },
  concluida: { bg: "var(--blue-bg, rgba(59,130,246,.1))", text: "var(--blue-text, #3b82f6)" },
  trancada:  { bg: "var(--red-bg)", text: "var(--red-text)" },
  pendente:  { bg: "var(--bg-hover)", text: "var(--text-tertiary)" },
};

const PERIODOS_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}º Período`,
}));

export default function PeriodosPage() {
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const [expandedPeriodo, setExpandedPeriodo] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formPeriodoId, setFormPeriodoId] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [editingDisciplina, setEditingDisciplina] = useState<Disciplina | null>(null);
  const [showDuplicar, setShowDuplicar] = useState(false);
  const [duplicarOrigem, setDuplicarOrigem] = useState("");
  const [duplicarDestino, setDuplicarDestino] = useState("");
  const [showCreatePeriodo, setShowCreatePeriodo] = useState(false);
  const [editingPeriodo, setEditingPeriodo] = useState<Periodo | null>(null);
  const [periodoFormNumero, setPeriodoFormNumero] = useState("");
  const [periodoFormInicio, setPeriodoFormInicio] = useState("");
  const [periodoFormFim, setPeriodoFormFim] = useState("");
  const [periodoFormAtivo, setPeriodoFormAtivo] = useState(false);
  const [periodoFormGradId, setPeriodoFormGradId] = useState("");

  // Graduação state
  const [showGradForm, setShowGradForm] = useState(false);
  const [editingGrad, setEditingGrad] = useState<Graduacao | null>(null);
  const [gradNome, setGradNome] = useState("");
  const [gradInstituicao, setGradInstituicao] = useState("");
  const [gradTotalCreditos, setGradTotalCreditos] = useState("");

  const graduacoes = getGraduacoes();
  const periodosEntities = getPeriodosEntities().sort((a, b) => a.numero - b.numero);

  // Group periods by graduation
  const periodsByGrad = new Map<string, Periodo[]>();
  const unlinkedPeriods: Periodo[] = [];
  for (const p of periodosEntities) {
    if (p.graduacao_id && graduacoes.some(g => g.id === p.graduacao_id)) {
      if (!periodsByGrad.has(p.graduacao_id)) periodsByGrad.set(p.graduacao_id, []);
      periodsByGrad.get(p.graduacao_id)!.push(p);
    } else {
      unlinkedPeriods.push(p);
    }
  }

  const handleCreate = (data: DisciplinaInput) => {
    createDisciplina(data);
    toast("Disciplina criada!", { type: "success" });
    refresh();
  };

  const handleUpdate = (data: DisciplinaInput) => {
    if (!editingDisciplina) return;
    updateDisciplina(editingDisciplina.id, data);
    toast("Disciplina atualizada!", { type: "success" });
    setEditingDisciplina(null);
    refresh();
  };

  const handleDelete = (id: string, nome: string) => {
    if (!confirm(`Excluir "${nome}" e todos os seus conteúdos, tarefas e registros de frequência?`)) return;
    deleteDisciplina(id);
    toast("Disciplina excluída", { type: "info" });
    refresh();
  };

  const openCreatePeriodo = (gradId?: string) => {
    setPeriodoFormNumero("");
    setPeriodoFormInicio("");
    setPeriodoFormFim("");
    setPeriodoFormAtivo(false);
    setPeriodoFormGradId(gradId || "");
    setEditingPeriodo(null);
    setShowCreatePeriodo(true);
  };

  const openEditPeriodo = (periodo: Periodo) => {
    setPeriodoFormNumero(String(periodo.numero));
    setPeriodoFormInicio(periodo.data_inicio);
    setPeriodoFormFim(periodo.data_fim);
    setPeriodoFormAtivo(periodo.ativo);
    setPeriodoFormGradId(periodo.graduacao_id || "");
    setEditingPeriodo(periodo);
    setShowCreatePeriodo(false);
  };

  const handleCreatePeriodo = () => {
    const num = Number(periodoFormNumero);
    if (!num) return;
    createPeriodo({
      numero: num,
      nome: `${num}º Período`,
      graduacao_id: periodoFormGradId,
      data_inicio: periodoFormInicio,
      data_fim: periodoFormFim,
      ativo: periodoFormAtivo,
    });
    toast("Período criado!", { type: "success" });
    setShowCreatePeriodo(false);
    refresh();
  };

  const handleUpdatePeriodo = () => {
    if (!editingPeriodo) return;
    const num = Number(periodoFormNumero);
    if (!num) return;
    updatePeriodo(editingPeriodo.id, {
      numero: num,
      nome: `${num}º Período`,
      graduacao_id: periodoFormGradId,
      data_inicio: periodoFormInicio,
      data_fim: periodoFormFim,
      ativo: periodoFormAtivo,
    });
    toast("Período atualizado!", { type: "success" });
    setEditingPeriodo(null);
    refresh();
  };

  const handleDeletePeriodo = (id: string, nome: string) => {
    const discs = getDisciplinasByPeriodo(id);
    const msg = discs.length > 0
      ? `Excluir "${nome}" e suas ${discs.length} disciplinas (com todos os conteúdos, tarefas e frequência)?`
      : `Excluir "${nome}"?`;
    if (!confirm(msg)) return;
    deletePeriodo(id);
    toast("Período excluído", { type: "info" });
    refresh();
  };

  const handleTogglePeriodoAtivo = (id: string) => {
    const periodo = periodosEntities.find(p => p.id === id);
    if (!periodo) return;
    updatePeriodo(id, { ativo: !periodo.ativo });
    toast(periodo.ativo ? "Período desativado" : "Período marcado como ativo!", { type: "success" });
    refresh();
  };

  const handleDuplicar = () => {
    if (!duplicarOrigem || !duplicarDestino) return;
    const novas = duplicarPeriodo(duplicarOrigem, duplicarDestino);
    const destPeriodo = periodosEntities.find(p => p.id === duplicarDestino);
    toast(`${novas.length} disciplinas duplicadas para ${destPeriodo?.nome || "período"}`, { type: "success" });
    setShowDuplicar(false);
    setDuplicarOrigem("");
    setDuplicarDestino("");
    refresh();
  };

  // Graduação handlers
  const openGradForm = (grad?: Graduacao) => {
    if (grad) {
      setEditingGrad(grad);
      setGradNome(grad.nome);
      setGradInstituicao(grad.instituicao);
      setGradTotalCreditos(String(grad.total_creditos || ""));
    } else {
      setEditingGrad(null);
      setGradNome("");
      setGradInstituicao("");
      setGradTotalCreditos("");
    }
    setShowGradForm(true);
  };

  const handleSaveGrad = () => {
    if (!gradNome.trim()) return;
    if (editingGrad) {
      updateGraduacao(editingGrad.id, { nome: gradNome, instituicao: gradInstituicao, total_creditos: Number(gradTotalCreditos) || 0 });
      toast("Graduação atualizada!", { type: "success" });
    } else {
      createGraduacao({ nome: gradNome, instituicao: gradInstituicao, total_creditos: Number(gradTotalCreditos) || 0 });
      toast("Graduação criada!", { type: "success" });
    }
    setShowGradForm(false);
    setEditingGrad(null);
    refresh();
  };

  const handleDeleteGrad = (id: string, nome: string) => {
    const periodos = periodosEntities.filter(p => p.graduacao_id === id);
    const msg = periodos.length > 0
      ? `Excluir "${nome}" e seus ${periodos.length} períodos (com todas as disciplinas)?`
      : `Excluir "${nome}"?`;
    if (!confirm(msg)) return;
    deleteGraduacao(id);
    toast("Graduação excluída", { type: "info" });
    refresh();
  };

  const periodoModalOpen = showCreatePeriodo || !!editingPeriodo;
  const periodoModalKey = editingPeriodo ? `edit-${editingPeriodo.id}` : showCreatePeriodo ? "create" : "closed";

  // Numbers available for creation (per graduation scope)
  const numerosUsadosNaGrad = new Set(
    periodosEntities.filter(p => p.graduacao_id === periodoFormGradId).map(p => p.numero)
  );
  const numerosDisponiveis = PERIODOS_OPTIONS.filter(opt => {
    const num = Number(opt.value);
    if (editingPeriodo && editingPeriodo.numero === num) return true;
    return !numerosUsadosNaGrad.has(num);
  });

  // Render period card
  const renderPeriodo = (periodo: Periodo) => {
    const disciplinas = getDisciplinasByPeriodo(periodo.id);
    const expanded = expandedPeriodo === periodo.id;
    return (
      <Card key={periodo.id}>
        <div>
          <button
            onClick={() => setExpandedPeriodo(expanded ? null : periodo.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-hover)] transition-colors rounded-t-xl"
          >
            <div className="flex items-center gap-3">
              {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              <h2 className="font-fraunces text-lg font-semibold text-[var(--text-primary)]">
                {periodo.nome}
              </h2>
              {periodo.ativo && (
                <Badge bg="rgba(16,185,129,.1)" text="#10b981" label="Ativo" />
              )}
              <Badge bg="var(--bg-hover)" text="var(--text-secondary)" label={`${disciplinas.length} disciplinas`} />
              {(periodo.data_inicio || periodo.data_fim) && (
                <span className="font-dm text-xs text-[var(--text-tertiary)] hidden sm:inline">
                  {periodo.data_inicio && new Date(periodo.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')}
                  {periodo.data_inicio && periodo.data_fim && ' — '}
                  {periodo.data_fim && new Date(periodo.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              <button onClick={() => handleTogglePeriodoAtivo(periodo.id)}
                className={`px-2 py-1 rounded-lg font-dm text-[10px] font-medium transition-colors ${
                  periodo.ativo ? 'bg-[rgba(16,185,129,.1)] text-[#10b981]' : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[#10b981]'
                }`}>
                {periodo.ativo ? 'Desativar' : 'Ativar'}
              </button>
              <button onClick={() => openEditPeriodo(periodo)}
                className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                <Pencil size={13} />
              </button>
              <button onClick={() => handleDeletePeriodo(periodo.id, periodo.nome)}
                className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]">
                <Trash2 size={13} />
              </button>
            </div>
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2">
                  {disciplinas.length === 0 ? (
                    <p className="font-dm text-sm text-[var(--text-tertiary)] text-center py-4">
                      Nenhuma disciplina neste período.
                    </p>
                  ) : (
                    disciplinas.map(disc => {
                      const colors = STATUS_COLORS[disc.status] || STATUS_COLORS.pendente;
                      return (
                        <div key={disc.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div>
                              <Link href={`/academico/disciplinas/${disc.id}`}
                                className="font-dm text-sm font-medium text-[var(--text-primary)] hover:text-[var(--orange-500)] transition-colors">
                                {disc.nome}
                              </Link>
                              <p className="font-dm text-xs text-[var(--text-tertiary)]">
                                {disc.professor && `${disc.professor} · `}{disc.horario || "Sem horário"}{disc.sala && ` · ${disc.sala}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge bg={colors.bg} text={colors.text} label={LABEL_STATUS_DISCIPLINA[disc.status]} />
                            <Badge bg="var(--bg-hover)" text="var(--text-tertiary)" label={LABEL_TIPO_DISCIPLINA[disc.tipo]} />
                            {disc.link_plataforma && (
                              <a href={disc.link_plataforma} target="_blank" rel="noopener noreferrer"
                                className="p-1 text-[var(--text-tertiary)] hover:text-[var(--orange-500)]">
                                <ExternalLink size={14} />
                              </a>
                            )}
                            <button onClick={() => setEditingDisciplina(disc)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(disc.id, disc.nome)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <button
                    onClick={() => { setFormPeriodoId(periodo.id); setFormKey(k => k + 1); setShowForm(true); }}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[var(--border-subtle)] hover:border-[var(--orange-500)] hover:bg-[var(--bg-hover)] transition-colors font-dm text-sm text-[var(--text-tertiary)] hover:text-[var(--orange-500)]"
                  >
                    <Plus size={16} /> Nova disciplina
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    );
  };

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/academico" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors">
              <ArrowLeft size={18} className="text-[var(--text-tertiary)]" />
            </Link>
            <div>
              <h1 className="font-fraunces text-xl font-bold text-[var(--text-primary)]">Períodos e Disciplinas</h1>
              <p className="font-dm text-sm text-[var(--text-tertiary)]">Organize sua trajetória acadêmica</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => openGradForm()}>
              <BookOpen size={16} /> Nova graduação
            </Button>
            {periodosEntities.length >= 2 && (
              <Button variant="secondary" onClick={() => setShowDuplicar(true)}>
                <Copy size={16} /> Duplicar
              </Button>
            )}
            <Button variant="primary" onClick={() => openCreatePeriodo()}>
              <Plus size={16} /> Novo período
            </Button>
          </div>
        </div>

        {/* Graduações com períodos */}
        {graduacoes.length === 0 && periodosEntities.length === 0 ? (
          <Card>
            <EmptyState
              icon={<GraduationCap size={40} />}
              message="Nenhum período cadastrado. Crie uma graduação e seus períodos para começar."
            />
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Períodos agrupados por graduação */}
            {graduacoes.map(grad => {
              const periodos = periodsByGrad.get(grad.id) || [];
              return (
                <div key={grad.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={18} className="text-[var(--orange-500)]" />
                      <h2 className="font-fraunces text-lg font-semibold text-[var(--text-primary)]">{grad.nome}</h2>
                      {grad.instituicao && (
                        <span className="font-dm text-xs text-[var(--text-tertiary)]">— {grad.instituicao}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openCreatePeriodo(grad.id)}
                        className="px-2 py-1 rounded-lg font-dm text-xs text-[var(--orange-500)] hover:bg-[var(--bg-hover)]">
                        <Plus size={12} className="inline mr-1" />Período
                      </button>
                      <button onClick={() => openGradForm(grad)}
                        className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDeleteGrad(grad.id, grad.nome)}
                        className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {periodos.length === 0 ? (
                    <Card>
                      <div className="p-4 text-center">
                        <p className="font-dm text-sm text-[var(--text-tertiary)]">Nenhum período nesta graduação.</p>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {periodos.map(renderPeriodo)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Períodos sem graduação (legado ou sem vínculo) */}
            {unlinkedPeriods.length > 0 && (
              <div>
                {graduacoes.length > 0 && (
                  <h2 className="font-fraunces text-lg font-semibold text-[var(--text-primary)] mb-3">Sem graduação</h2>
                )}
                <div className="space-y-3">
                  {unlinkedPeriods.map(renderPeriodo)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Disciplina Modal */}
        {showForm && (
          <DisciplinaForm
            key={`new-disc-${formPeriodoId}-${formKey}`}
            open={showForm}
            onClose={() => setShowForm(false)}
            onSave={handleCreate}
            defaultPeriodoId={formPeriodoId}
          />
        )}

        {/* Edit Disciplina Modal */}
        {editingDisciplina && (
          <DisciplinaForm
            key={`edit-disc-${editingDisciplina.id}`}
            open={!!editingDisciplina}
            onClose={() => setEditingDisciplina(null)}
            onSave={handleUpdate}
            initial={editingDisciplina}
          />
        )}

        {/* Duplicar Modal */}
        <Modal isOpen={showDuplicar} onClose={() => setShowDuplicar(false)} title="Duplicar Período" size="sm">
          <div className="space-y-4">
            <p className="font-dm text-sm text-[var(--text-secondary)]">
              Copie todas as disciplinas de um período para outro. Os dados de conteúdo, tarefas e frequência não são copiados.
            </p>
            <Select label="Período de origem" value={duplicarOrigem} onChange={setDuplicarOrigem}
              options={periodosEntities.map(p => ({ value: p.id, label: p.nome }))} />
            <Select label="Período de destino" value={duplicarDestino} onChange={setDuplicarDestino}
              options={periodosEntities.filter(p => p.id !== duplicarOrigem).map(p => ({ value: p.id, label: p.nome }))} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowDuplicar(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleDuplicar} disabled={!duplicarOrigem || !duplicarDestino}>Duplicar</Button>
            </div>
          </div>
        </Modal>

        {/* Graduação Form Modal */}
        <Modal isOpen={showGradForm} onClose={() => { setShowGradForm(false); setEditingGrad(null); }}
          title={editingGrad ? "Editar Graduação" : "Nova Graduação"} size="sm">
          <div className="space-y-4">
            <Input label="Nome do curso *" value={gradNome} onChange={setGradNome} placeholder="Ex: Psicologia" />
            <Input label="Instituição" value={gradInstituicao} onChange={setGradInstituicao} placeholder="Ex: UFMG" />
            <Input label="Total de créditos do curso" type="number" value={gradTotalCreditos} onChange={setGradTotalCreditos} placeholder="Ex: 240" />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setShowGradForm(false); setEditingGrad(null); }}>Cancelar</Button>
              <Button variant="primary" onClick={handleSaveGrad} disabled={!gradNome.trim()}>
                {editingGrad ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Create/Edit Periodo Modal */}
        <Modal
          key={periodoModalKey}
          isOpen={periodoModalOpen}
          onClose={() => { setShowCreatePeriodo(false); setEditingPeriodo(null); }}
          title={editingPeriodo ? "Editar Período" : "Novo Período"}
          size="sm"
        >
          <div className="space-y-4">
            {graduacoes.length > 0 && (
              <Select
                label="Graduação"
                value={periodoFormGradId}
                onChange={setPeriodoFormGradId}
                options={[
                  { value: "", label: "Sem graduação" },
                  ...graduacoes.map(g => ({ value: g.id, label: g.nome })),
                ]}
              />
            )}
            <Select
              label="Número do período"
              value={periodoFormNumero}
              onChange={setPeriodoFormNumero}
              options={[
                { value: "", label: "Selecione..." },
                ...numerosDisponiveis,
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Início</label>
                <input type="date" value={periodoFormInicio} onChange={e => setPeriodoFormInicio(e.target.value)}
                  className="input-hamilton w-full text-sm" />
              </div>
              <div>
                <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Fim</label>
                <input type="date" value={periodoFormFim} onChange={e => setPeriodoFormFim(e.target.value)}
                  className="input-hamilton w-full text-sm" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={periodoFormAtivo} onChange={e => setPeriodoFormAtivo(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border-default)] accent-[#10b981]" />
              <span className="font-dm text-sm text-[var(--text-secondary)]">Período ativo (atual)</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setShowCreatePeriodo(false); setEditingPeriodo(null); }}>Cancelar</Button>
              <Button variant="primary" onClick={editingPeriodo ? handleUpdatePeriodo : handleCreatePeriodo} disabled={!periodoFormNumero}>
                {editingPeriodo ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Shell>
  );
}
