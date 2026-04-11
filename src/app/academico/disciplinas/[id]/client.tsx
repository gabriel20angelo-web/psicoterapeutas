"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, ClipboardCheck, Calendar, Plus,
  Pencil, Trash2, ExternalLink, User, Mail, MapPin,
  Clock, ChevronRight, Check, CalendarPlus,
} from "lucide-react";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { useToast } from "@/contexts/ToastContext";
import {
  getDisciplina, updateDisciplina, getPeriodoEntity,
  getConteudosByDisciplina, createConteudo, updateConteudo, deleteConteudo,
  getTarefasByDisciplina, createTarefa, updateTarefa, deleteTarefa,
  getFrequenciaByDisciplina, createFrequencia, deleteFrequencia, calcularFrequencia,
  getConfigAcademica, gerarEventosAgenda,
} from "@/lib/academico-data";
import { createAtividade } from "@/lib/data";
import DisciplinaForm from "../../_components/DisciplinaForm";
import type {
  Disciplina, DisciplinaInput, Conteudo, ConteudoInput,
  Tarefa, TarefaInput, Frequencia, FrequenciaInput,
  TipoTarefa, StatusTarefa, TipoPresenca,
} from "@/types/academico";
import {
  LABEL_STATUS_DISCIPLINA, LABEL_TIPO_DISCIPLINA,
  LABEL_TIPO_TAREFA, LABEL_STATUS_TAREFA, LABEL_TIPO_PRESENCA,
} from "@/types/academico";

// ─── Status colors ───

const TAREFA_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pendente:     { bg: "var(--bg-hover)", text: "var(--text-secondary)" },
  em_andamento: { bg: "rgba(59,130,246,.1)", text: "#3b82f6" },
  concluida:    { bg: "rgba(16,185,129,.1)", text: "#10b981" },
};

const PRESENCA_COLORS: Record<string, { bg: string; text: string }> = {
  presente:    { bg: "rgba(16,185,129,.1)", text: "#10b981" },
  ausente:     { bg: "var(--red-bg)", text: "var(--red-text)" },
  justificada: { bg: "rgba(245,158,11,.1)", text: "#f59e0b" },
};

export default function DisciplinaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);
  const [activeTab, setActiveTab] = useState("geral");

  const id = params.id as string;
  const disciplina = getDisciplina(id);

  // Form states
  const [showEditDisciplina, setShowEditDisciplina] = useState(false);
  const [showConteudoForm, setShowConteudoForm] = useState(false);
  const [showTarefaForm, setShowTarefaForm] = useState(false);
  const [showFrequenciaForm, setShowFrequenciaForm] = useState(false);
  const [editingConteudo, setEditingConteudo] = useState<Conteudo | null>(null);
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null);

  // Conteudo form
  const [conteudoTitulo, setConteudoTitulo] = useState("");
  const [conteudoData, setConteudoData] = useState("");
  const [conteudoModulo, setConteudoModulo] = useState("");

  // Tarefa form
  const [tarefaTitulo, setTarefaTitulo] = useState("");
  const [tarefaTipo, setTarefaTipo] = useState<TipoTarefa>("trabalho");
  const [tarefaData, setTarefaData] = useState("");
  const [tarefaObs, setTarefaObs] = useState("");

  // Frequencia form
  const [freqData, setFreqData] = useState(new Date().toISOString().slice(0, 10));
  const [freqPresenca, setFreqPresenca] = useState<TipoPresenca>("presente");

  if (!disciplina) {
    return (
      <Shell>
        <div className="max-w-4xl mx-auto">
          <EmptyState icon={<BookOpen size={40} />} message="Disciplina não encontrada. Esta disciplina pode ter sido excluída." />
          <div className="mt-4 text-center">
            <Link href="/academico/periodos" className="font-dm text-sm text-[var(--orange-500)] hover:underline">Voltar para períodos</Link>
          </div>
        </div>
      </Shell>
    );
  }

  const conteudos = getConteudosByDisciplina(id).sort((a, b) => b.data_aula.localeCompare(a.data_aula));
  const tarefas = getTarefasByDisciplina(id).sort((a, b) => a.data_entrega.localeCompare(b.data_entrega));
  const frequencia = getFrequenciaByDisciplina(id).sort((a, b) => b.data.localeCompare(a.data));
  const resumoFreq = calcularFrequencia(id);
  const config = getConfigAcademica();

  // ─── Handlers ───

  const handleSaveConteudo = () => {
    if (!conteudoTitulo.trim()) return;
    if (editingConteudo) {
      updateConteudo(editingConteudo.id, { titulo: conteudoTitulo, data_aula: conteudoData, modulo_tematico: conteudoModulo });
    } else {
      createConteudo({
        disciplina_id: id,
        titulo: conteudoTitulo,
        data_aula: conteudoData,
        professor: disciplina.professor,
        modulo_tematico: conteudoModulo,
        status_estudo: config.status_estudo_sequence[0] || "Assistir aula",
        resumo_html: "",
        link_resumo_externo: "",
        indicacao_leitura: "",
        bibliografia: "",
      });
    }
    toast(editingConteudo ? "Conteúdo atualizado" : "Conteúdo criado", { type: "success" });
    resetConteudoForm();
    refresh();
  };

  const resetConteudoForm = () => {
    setShowConteudoForm(false);
    setEditingConteudo(null);
    setConteudoTitulo("");
    setConteudoData("");
    setConteudoModulo("");
  };

  const startEditConteudo = (c: Conteudo) => {
    setEditingConteudo(c);
    setConteudoTitulo(c.titulo);
    setConteudoData(c.data_aula);
    setConteudoModulo(c.modulo_tematico);
    setShowConteudoForm(true);
  };

  const advanceConteudoStatus = (c: Conteudo) => {
    const seq = config.status_estudo_sequence;
    const idx = seq.indexOf(c.status_estudo);
    if (idx < seq.length - 1) {
      updateConteudo(c.id, { status_estudo: seq[idx + 1] });
      refresh();
    }
  };

  const handleSaveTarefa = () => {
    if (!tarefaTitulo.trim()) return;
    if (editingTarefa) {
      updateTarefa(editingTarefa.id, { titulo: tarefaTitulo, tipo: tarefaTipo, data_entrega: tarefaData, observacoes: tarefaObs });
    } else {
      createTarefa({
        disciplina_id: id,
        biblioteca_id: "",
        titulo: tarefaTitulo,
        tipo: tarefaTipo,
        data_entrega: tarefaData,
        status: "pendente",
        conteudos_ids: [],
        dia_semana_estudo: null,
        nota: null,
        observacoes: tarefaObs,
      });
    }
    toast(editingTarefa ? "Tarefa atualizada" : "Tarefa criada", { type: "success" });
    resetTarefaForm();
    refresh();
  };

  const resetTarefaForm = () => {
    setShowTarefaForm(false);
    setEditingTarefa(null);
    setTarefaTitulo("");
    setTarefaTipo("trabalho");
    setTarefaData("");
    setTarefaObs("");
  };

  const startEditTarefa = (t: Tarefa) => {
    setEditingTarefa(t);
    setTarefaTitulo(t.titulo);
    setTarefaTipo(t.tipo);
    setTarefaData(t.data_entrega);
    setTarefaObs(t.observacoes);
    setShowTarefaForm(true);
  };

  const cycleTarefaStatus = (t: Tarefa) => {
    const order: StatusTarefa[] = ["pendente", "em_andamento", "concluida"];
    const idx = order.indexOf(t.status);
    const next = order[(idx + 1) % order.length];
    updateTarefa(t.id, { status: next });
    refresh();
  };

  const handleSaveFrequencia = () => {
    createFrequencia({ disciplina_id: id, data: freqData, presenca: freqPresenca });
    toast("Presença registrada", { type: "success" });
    setShowFrequenciaForm(false);
    refresh();
  };

  const handleEditDisciplina = (data: DisciplinaInput) => {
    updateDisciplina(id, data);
    toast("Disciplina atualizada", { type: "success" });
    setShowEditDisciplina(false);
    refresh();
  };

  const tabs = [
    { id: "geral", label: "Visão Geral" },
    { id: "conteudos", label: `Conteúdos (${conteudos.length})` },
    { id: "tarefas", label: `Tarefas (${tarefas.length})` },
    { id: "frequencia", label: `Frequência (${resumoFreq.percentual}%)` },
  ];

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/academico/periodos" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors">
              <ArrowLeft size={18} className="text-[var(--text-tertiary)]" />
            </Link>
            <div>
              <h1 className="font-fraunces text-xl font-bold text-[var(--text-primary)]">{disciplina.nome}</h1>
              <p className="font-dm text-sm text-[var(--text-tertiary)]">
                {getPeriodoEntity(disciplina.periodo_id)?.nome || "Sem período"} &middot; {LABEL_TIPO_DISCIPLINA[disciplina.tipo]}
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => setShowEditDisciplina(true)}>
            <Pencil size={14} /> Editar
          </Button>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {/* ─── Tab: Visão Geral ─── */}
        {activeTab === "geral" && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <div className="p-4 space-y-3">
                <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Informações</h3>
                {disciplina.professor && (
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-[var(--text-tertiary)]" />
                    <span className="font-dm text-sm text-[var(--text-secondary)]">{disciplina.professor}</span>
                  </div>
                )}
                {disciplina.email_professor && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-[var(--text-tertiary)]" />
                    <a href={`mailto:${disciplina.email_professor}`} className="font-dm text-sm text-[var(--orange-500)] hover:underline">{disciplina.email_professor}</a>
                  </div>
                )}
                {disciplina.sala && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-[var(--text-tertiary)]" />
                    <span className="font-dm text-sm text-[var(--text-secondary)]">{disciplina.sala}</span>
                  </div>
                )}
                {disciplina.horario && (
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[var(--text-tertiary)]" />
                    <span className="font-dm text-sm text-[var(--text-secondary)]">{disciplina.horario}</span>
                  </div>
                )}
                {disciplina.link_plataforma && (
                  <div className="flex items-center gap-2">
                    <ExternalLink size={14} className="text-[var(--text-tertiary)]" />
                    <a href={disciplina.link_plataforma} target="_blank" rel="noopener noreferrer" className="font-dm text-sm text-[var(--orange-500)] hover:underline">Plataforma online</a>
                  </div>
                )}
                {disciplina.codigo && (
                  <p className="font-dm text-xs text-[var(--text-tertiary)]">Código: {disciplina.codigo}</p>
                )}
              </div>
            </Card>

            <Card>
              <div className="p-4 space-y-3">
                <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Frequência</h3>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-bold text-[var(--text-primary)]">{resumoFreq.percentual}%</span>
                  <Badge
                    bg={resumoFreq.risco === "ok" ? "rgba(16,185,129,.1)" : resumoFreq.risco === "atencao" ? "rgba(245,158,11,.1)" : "var(--red-bg)"}
                    text={resumoFreq.risco === "ok" ? "#10b981" : resumoFreq.risco === "atencao" ? "#f59e0b" : "var(--red-text)"}
                    label={resumoFreq.risco === "ok" ? "OK" : resumoFreq.risco === "atencao" ? "Atenção" : "Risco"}
                  />
                </div>
                <div className="font-dm text-xs text-[var(--text-tertiary)] space-y-1">
                  <p>Aulas previstas: {resumoFreq.total_previstas}</p>
                  <p>Presenças: {resumoFreq.presentes} &middot; Faltas: {resumoFreq.ausentes} &middot; Justificadas: {resumoFreq.justificadas}</p>
                </div>
              </div>
            </Card>

            {/* Sync com agenda */}
            {disciplina.horario_estruturado.length > 0 && (
              <Card>
                <div className="p-4 space-y-3">
                  <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Horários na Agenda</h3>
                  <div className="space-y-1">
                    {disciplina.horario_estruturado.map((h, i) => (
                      <p key={i} className="font-dm text-sm text-[var(--text-secondary)]">
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][h.dia]} — {h.inicio} às {h.fim}
                      </p>
                    ))}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => {
                    const events = gerarEventosAgenda(id);
                    if (events.length === 0) {
                      toast("Defina datas de início e fim no período para gerar eventos.", { type: "info" });
                      return;
                    }
                    if (!confirm(`Criar ${events.length} eventos na agenda?`)) return;
                    for (const ev of events) {
                      createAtividade({
                        terapeuta_id: "",
                        tipo: "outro",
                        titulo: `📚 ${ev.titulo}`,
                        descricao: `Aula de ${disciplina.nome}`,
                        data_inicio: ev.data_inicio,
                        data_fim: ev.data_fim,
                        status: "confirmada",
                        recorrencia: "nenhuma",
                      });
                    }
                    toast(`${events.length} aulas adicionadas à agenda!`, { type: "success" });
                  }}>
                    <CalendarPlus size={14} /> Sincronizar com agenda
                  </Button>
                </div>
              </Card>
            )}

            {(disciplina.monitoria_nome || disciplina.monitoria_email) && (
              <Card>
                <div className="p-4 space-y-2">
                  <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Monitoria</h3>
                  {disciplina.monitoria_nome && <p className="font-dm text-sm text-[var(--text-secondary)]">{disciplina.monitoria_nome}</p>}
                  {disciplina.monitoria_email && <p className="font-dm text-sm text-[var(--orange-500)]">{disciplina.monitoria_email}</p>}
                  {disciplina.monitoria_horario && <p className="font-dm text-xs text-[var(--text-tertiary)]">{disciplina.monitoria_horario} {disciplina.monitoria_sala && `· ${disciplina.monitoria_sala}`}</p>}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ─── Tab: Conteúdos ─── */}
        {activeTab === "conteudos" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setShowConteudoForm(true)}>
                <Plus size={14} /> Novo conteúdo
              </Button>
            </div>
            {conteudos.length === 0 ? (
              <EmptyState icon={<BookOpen size={32} />} message="Nenhum conteúdo. Registre as aulas desta disciplina." />
            ) : (
              conteudos.map(c => {
                const seq = config.status_estudo_sequence;
                const statusIdx = seq.indexOf(c.status_estudo);
                const isLast = statusIdx === seq.length - 1;
                return (
                  <Card key={c.id}>
                    <div className="flex items-center justify-between p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-dm text-sm font-medium text-[var(--text-primary)]">{c.titulo}</p>
                          {c.modulo_tematico && (
                            <Badge bg="var(--bg-hover)" text="var(--text-tertiary)" label={c.modulo_tematico} />
                          )}
                        </div>
                        <p className="font-dm text-xs text-[var(--text-tertiary)]">{c.data_aula}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => advanceConteudoStatus(c)}
                          disabled={isLast}
                          className={`px-2.5 py-1 rounded-lg font-dm text-xs font-medium transition-colors ${
                            isLast
                              ? "bg-[rgba(16,185,129,.1)] text-[#10b981]"
                              : "bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--orange-glow)] hover:text-[var(--orange-500)]"
                          }`}
                          title={isLast ? "Concluído" : `Avançar para: ${seq[statusIdx + 1]}`}
                        >
                          {isLast ? <Check size={14} /> : c.status_estudo}
                          {!isLast && <ChevronRight size={12} className="inline ml-1" />}
                        </button>
                        <button onClick={() => startEditConteudo(c)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { deleteConteudo(c.id); refresh(); }} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* ─── Tab: Tarefas ─── */}
        {activeTab === "tarefas" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setShowTarefaForm(true)}>
                <Plus size={14} /> Nova tarefa
              </Button>
            </div>
            {tarefas.length === 0 ? (
              <EmptyState icon={<ClipboardCheck size={32} />} message="Nenhuma tarefa. Adicione provas, trabalhos e entregas." />
            ) : (
              tarefas.map(t => {
                const colors = TAREFA_STATUS_COLORS[t.status] || TAREFA_STATUS_COLORS.pendente;
                const isOverdue = t.status !== "concluida" && t.data_entrega && t.data_entrega < new Date().toISOString().slice(0, 10);
                return (
                  <Card key={t.id}>
                    <div className="flex items-center justify-between p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-dm text-sm font-medium ${t.status === "concluida" ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"}`}>
                            {t.titulo}
                          </p>
                          <Badge bg="var(--bg-hover)" text="var(--text-tertiary)" label={LABEL_TIPO_TAREFA[t.tipo]} />
                        </div>
                        <p className={`font-dm text-xs ${isOverdue ? "text-[var(--red-text)]" : "text-[var(--text-tertiary)]"}`}>
                          {t.data_entrega}{isOverdue && " — Atrasada"}{t.nota != null && ` · Nota: ${t.nota}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => cycleTarefaStatus(t)}
                          className="px-2.5 py-1 rounded-lg font-dm text-xs font-medium transition-colors"
                          style={{ backgroundColor: colors.bg, color: colors.text }}>
                          {LABEL_STATUS_TAREFA[t.status]}
                        </button>
                        <button onClick={() => startEditTarefa(t)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { deleteTarefa(t.id); refresh(); }} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* ─── Tab: Frequência ─── */}
        {activeTab === "frequencia" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setShowFrequenciaForm(true)}>
                <Plus size={14} /> Registrar presença
              </Button>
            </div>
            {frequencia.length === 0 ? (
              <EmptyState icon={<Calendar size={32} />} message="Nenhum registro. Registre suas presenças e faltas." />
            ) : (
              frequencia.map(f => {
                const colors = PRESENCA_COLORS[f.presenca] || PRESENCA_COLORS.presente;
                return (
                  <Card key={f.id}>
                    <div className="flex items-center justify-between p-3">
                      <p className="font-dm text-sm text-[var(--text-primary)]">{f.data}</p>
                      <div className="flex items-center gap-2">
                        <Badge bg={colors.bg} text={colors.text} label={LABEL_TIPO_PRESENCA[f.presenca]} />
                        <button onClick={() => { deleteFrequencia(f.id); refresh(); }} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* ─── Modals ─── */}

        {/* Edit Disciplina */}
        {showEditDisciplina && (
          <DisciplinaForm open onClose={() => setShowEditDisciplina(false)} onSave={handleEditDisciplina} initial={disciplina} />
        )}

        {/* Conteudo Form */}
        <Modal isOpen={showConteudoForm} onClose={resetConteudoForm} title={editingConteudo ? "Editar Conteúdo" : "Novo Conteúdo"} size="md">
          <div className="space-y-3">
            <Input label="Título *" value={conteudoTitulo} onChange={setConteudoTitulo} />
            <Input label="Data da aula" type="date" value={conteudoData} onChange={setConteudoData} />
            <Input label="Módulo temático" value={conteudoModulo} onChange={setConteudoModulo} placeholder="Ex: Psicanálise, TCC" />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={resetConteudoForm}>Cancelar</Button>
              <Button variant="primary" onClick={handleSaveConteudo}>{editingConteudo ? "Salvar" : "Criar"}</Button>
            </div>
          </div>
        </Modal>

        {/* Tarefa Form */}
        <Modal isOpen={showTarefaForm} onClose={resetTarefaForm} title={editingTarefa ? "Editar Tarefa" : "Nova Tarefa"} size="md">
          <div className="space-y-3">
            <Input label="Título *" value={tarefaTitulo} onChange={setTarefaTitulo} />
            <Select label="Tipo" value={tarefaTipo} onChange={val => setTarefaTipo(val as TipoTarefa)} options={[
              { value: "prova", label: "Prova" },
              { value: "trabalho", label: "Trabalho" },
              { value: "licao", label: "Lição" },
              { value: "apresentacao", label: "Apresentação" },
              { value: "seminario", label: "Seminário" },
              { value: "outro", label: "Outro" },
            ]} />
            <Input label="Data de entrega" type="date" value={tarefaData} onChange={setTarefaData} />
            <Textarea label="Observações" value={tarefaObs} onChange={setTarefaObs} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={resetTarefaForm}>Cancelar</Button>
              <Button variant="primary" onClick={handleSaveTarefa}>{editingTarefa ? "Salvar" : "Criar"}</Button>
            </div>
          </div>
        </Modal>

        {/* Frequencia Form */}
        <Modal isOpen={showFrequenciaForm} onClose={() => setShowFrequenciaForm(false)} title="Registrar Presença" size="sm">
          <div className="space-y-3">
            <Input label="Data" type="date" value={freqData} onChange={setFreqData} />
            <Select label="Presença" value={freqPresenca} onChange={val => setFreqPresenca(val as TipoPresenca)} options={[
              { value: "presente", label: "Presente" },
              { value: "ausente", label: "Ausente" },
              { value: "justificada", label: "Justificada" },
            ]} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowFrequenciaForm(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSaveFrequencia}>Registrar</Button>
            </div>
          </div>
        </Modal>
      </div>
    </Shell>
  );
}
