"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, TrendingUp, Plus, Pencil, Trash2, Calculator,
  ChevronDown, ChevronRight, Award, AlertTriangle, CheckCircle,
} from "lucide-react";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import {
  getDisciplinasCursando, getDisciplinas, getDisciplina,
  getAvaliacoesByDisciplina, createAvaliacao, updateAvaliacao, deleteAvaliacao,
  calcularDesempenho, calcularCRGraduacao,
  getGraduacoes, getPeriodosEntities, getDisciplinasByPeriodo,
} from "@/lib/academico-data";
import type { Avaliacao, AvaliacaoInput, TipoAvaliacao, DesempenhoDisciplina, StatusAprovacao } from "@/types/academico";
import { LABEL_TIPO_AVALIACAO } from "@/types/academico";

const STATUS_COLORS: Record<StatusAprovacao, { bg: string; text: string; label: string }> = {
  aprovado:    { bg: "rgba(16,185,129,.1)", text: "#10b981", label: "Aprovado" },
  reprovado:   { bg: "var(--red-bg)", text: "var(--red-text)", label: "Reprovado" },
  recuperacao: { bg: "rgba(245,158,11,.1)", text: "#f59e0b", label: "Recuperação" },
  cursando:    { bg: "rgba(59,130,246,.1)", text: "#3b82f6", label: "Cursando" },
  sem_nota:    { bg: "var(--bg-hover)", text: "var(--text-tertiary)", label: "Sem nota" },
};

export default function NotasPage() {
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const [expandedDisc, setExpandedDisc] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formDiscId, setFormDiscId] = useState("");
  const [editingAv, setEditingAv] = useState<Avaliacao | null>(null);
  const [showCalc, setShowCalc] = useState(false);
  const [calcDiscId, setCalcDiscId] = useState("");

  // Form state
  const [avTitulo, setAvTitulo] = useState("");
  const [avTipo, setAvTipo] = useState<TipoAvaliacao>("prova");
  const [avPeso, setAvPeso] = useState("30");
  const [avNota, setAvNota] = useState("");
  const [avNotaMaxima, setAvNotaMaxima] = useState("10");
  const [avData, setAvData] = useState("");
  const [avObs, setAvObs] = useState("");

  const disciplinasCursando = getDisciplinasCursando();
  const graduacoes = getGraduacoes();

  // Desempenho de cada disciplina cursando
  const desempenhos = disciplinasCursando.map(d => ({
    disciplina: d,
    desempenho: calcularDesempenho(d.id),
  }));

  const openForm = (discId: string, av?: Avaliacao) => {
    setFormDiscId(discId);
    if (av) {
      setEditingAv(av);
      setAvTitulo(av.titulo);
      setAvTipo(av.tipo);
      setAvPeso(String(av.peso));
      setAvNota(av.nota !== null ? String(av.nota) : "");
      setAvNotaMaxima(String(av.nota_maxima));
      setAvData(av.data);
      setAvObs(av.observacoes);
    } else {
      setEditingAv(null);
      setAvTitulo("");
      setAvTipo("prova");
      setAvPeso("30");
      setAvNota("");
      setAvNotaMaxima("10");
      setAvData("");
      setAvObs("");
    }
    setShowForm(true);
  };

  const handleSave = () => {
    if (!avTitulo.trim() || !formDiscId) return;
    const data: AvaliacaoInput = {
      disciplina_id: formDiscId,
      titulo: avTitulo,
      tipo: avTipo,
      peso: Number(avPeso) || 0,
      nota: avNota !== "" ? Number(avNota) : null,
      nota_maxima: Number(avNotaMaxima) || 10,
      data: avData,
      observacoes: avObs,
    };
    if (editingAv) {
      updateAvaliacao(editingAv.id, data);
      toast("Avaliação atualizada", { type: "success" });
    } else {
      createAvaliacao(data);
      toast("Avaliação criada", { type: "success" });
    }
    setShowForm(false);
    refresh();
  };

  // Calculadora
  const calcDisc = calcDiscId ? getDisciplina(calcDiscId) : null;
  const calcDesemp = calcDiscId ? calcularDesempenho(calcDiscId) : null;

  return (
    <Shell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/academico" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors">
              <ArrowLeft size={18} className="text-[var(--text-tertiary)]" />
            </Link>
            <div>
              <h1 className="font-fraunces text-xl font-bold text-[var(--text-primary)]">Notas e Desempenho</h1>
              <p className="font-dm text-sm text-[var(--text-tertiary)]">Avaliações, médias e CR acadêmico</p>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => { setCalcDiscId(disciplinasCursando[0]?.id || ""); setShowCalc(true); }}>
            <Calculator size={14} /> Calculadora
          </Button>
        </div>

        {/* CR por graduação */}
        {graduacoes.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {graduacoes.map(grad => {
              const crData = calcularCRGraduacao(grad.id);
              return (
                <Card key={grad.id}>
                  <div className="p-4">
                    <p className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">{grad.nome}</p>
                    <div className="flex items-baseline gap-3">
                      <div>
                        <p className="font-mono text-3xl font-bold text-[var(--orange-500)]">
                          {crData.cr_geral !== null ? crData.cr_geral.toFixed(2) : "—"}
                        </p>
                        <p className="font-dm text-[10px] text-[var(--text-tertiary)]">CR Geral</p>
                      </div>
                      {grad.total_creditos > 0 && (
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-dm text-[10px] text-[var(--text-tertiary)]">Conclusão</span>
                            <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{crData.percentual_conclusao}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                            <div className="h-full rounded-full bg-[var(--orange-500)] transition-all" style={{ width: `${Math.min(crData.percentual_conclusao, 100)}%` }} />
                          </div>
                          <p className="font-dm text-[10px] text-[var(--text-tertiary)] mt-1">
                            {crData.total_creditos_aprovados}/{grad.total_creditos} créditos
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Disciplinas cursando com avaliações */}
        {disciplinasCursando.length === 0 ? (
          <EmptyState icon={<TrendingUp size={40} />} message="Nenhuma disciplina cursando. Cadastre disciplinas em Períodos." />
        ) : (
          <div className="space-y-3">
            {desempenhos.map(({ disciplina: d, desempenho: desemp }) => {
              const expanded = expandedDisc === d.id;
              const sc = STATUS_COLORS[desemp.status];
              return (
                <Card key={d.id}>
                  <div>
                    {/* Header */}
                    <button
                      onClick={() => setExpandedDisc(expanded ? null : d.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-hover)] transition-colors rounded-t-xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <div className="min-w-0">
                          <h3 className="font-dm text-sm font-semibold text-[var(--text-primary)] text-left">{d.nome}</h3>
                          <p className="font-dm text-xs text-[var(--text-tertiary)]">
                            {desemp.avaliacoes.length} avaliações · Peso total: {desemp.total_peso}%
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Média */}
                        <div className="text-right">
                          <p className="font-mono text-lg font-bold text-[var(--text-primary)]">
                            {desemp.media_ponderada !== null ? desemp.media_ponderada.toFixed(1) : "—"}
                          </p>
                          <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Média</p>
                        </div>
                        {/* Nota necessária */}
                        {desemp.nota_necessaria !== null && desemp.status === "cursando" && (
                          <div className="text-right">
                            <p className={`font-mono text-lg font-bold ${desemp.nota_necessaria > 8 ? "text-[var(--red-text)]" : desemp.nota_necessaria > 6 ? "text-[#f59e0b]" : "text-[#10b981]"}`}>
                              {desemp.nota_necessaria.toFixed(1)}
                            </p>
                            <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Precisa</p>
                          </div>
                        )}
                        <Badge bg={sc.bg} text={sc.text} label={sc.label} />
                      </div>
                    </button>

                    {/* Avaliações expandidas */}
                    {expanded && (
                      <div className="px-4 pb-4 space-y-2">
                        {desemp.avaliacoes.length === 0 ? (
                          <p className="font-dm text-sm text-[var(--text-tertiary)] text-center py-3">
                            Nenhuma avaliação cadastrada.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-[var(--border-subtle)]">
                                  <th className="text-left py-2 px-2 font-dm text-xs text-[var(--text-tertiary)] font-medium">Avaliação</th>
                                  <th className="text-left py-2 px-2 font-dm text-xs text-[var(--text-tertiary)] font-medium">Tipo</th>
                                  <th className="text-center py-2 px-2 font-dm text-xs text-[var(--text-tertiary)] font-medium">Peso</th>
                                  <th className="text-center py-2 px-2 font-dm text-xs text-[var(--text-tertiary)] font-medium">Nota</th>
                                  <th className="text-left py-2 px-2 font-dm text-xs text-[var(--text-tertiary)] font-medium">Data</th>
                                  <th className="py-2 px-2"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {desemp.avaliacoes.sort((a, b) => a.data.localeCompare(b.data)).map(av => (
                                  <tr key={av.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)]">
                                    <td className="py-2 px-2 font-dm text-sm text-[var(--text-primary)]">{av.titulo}</td>
                                    <td className="py-2 px-2">
                                      <Badge bg="var(--bg-hover)" text="var(--text-tertiary)" label={LABEL_TIPO_AVALIACAO[av.tipo]} />
                                    </td>
                                    <td className="py-2 px-2 text-center font-mono text-xs text-[var(--text-secondary)]">{av.peso}%</td>
                                    <td className="py-2 px-2 text-center">
                                      {av.nota !== null ? (
                                        <span className={`font-mono text-sm font-bold ${av.nota / av.nota_maxima * 10 >= (d.nota_aprovacao ?? 7) ? "text-[#10b981]" : "text-[var(--red-text)]"}`}>
                                          {av.nota}/{av.nota_maxima}
                                        </span>
                                      ) : (
                                        <span className="font-dm text-xs text-[var(--text-tertiary)]">Pendente</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-2 font-mono text-xs text-[var(--text-tertiary)]">{av.data || "—"}</td>
                                    <td className="py-2 px-2">
                                      <div className="flex items-center gap-1">
                                        <button onClick={() => openForm(d.id, av)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><Pencil size={12} /></button>
                                        <button onClick={() => { deleteAvaliacao(av.id); refresh(); }} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]"><Trash2 size={12} /></button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Barra de progresso dos pesos */}
                        {desemp.total_peso > 0 && (
                          <div className="mt-2">
                            <div className="flex justify-between mb-1">
                              <span className="font-dm text-[10px] text-[var(--text-tertiary)]">Pesos avaliados</span>
                              <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{desemp.peso_avaliado}%/{desemp.total_peso}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                              <div className="h-full rounded-full bg-[var(--orange-500)]" style={{ width: `${desemp.total_peso > 0 ? (desemp.peso_avaliado / desemp.total_peso) * 100 : 0}%` }} />
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => openForm(d.id)}
                          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-[var(--border-subtle)] hover:border-[var(--orange-500)] hover:bg-[var(--bg-hover)] transition-colors font-dm text-sm text-[var(--text-tertiary)] hover:text-[var(--orange-500)]"
                        >
                          <Plus size={14} /> Nova avaliação
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Form Modal */}
        <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingAv ? "Editar Avaliação" : "Nova Avaliação"} size="md">
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Título *" value={avTitulo} onChange={setAvTitulo} placeholder="Ex: P1, Trabalho Final" />
              <Select label="Tipo" value={avTipo} onChange={val => setAvTipo(val as TipoAvaliacao)} options={[
                { value: "prova", label: "Prova" },
                { value: "trabalho", label: "Trabalho" },
                { value: "seminario", label: "Seminário" },
                { value: "participacao", label: "Participação" },
                { value: "projeto", label: "Projeto" },
                { value: "outro", label: "Outro" },
              ]} />
              <Input label="Peso (%)" type="number" value={avPeso} onChange={setAvPeso} placeholder="30" />
              <Input label="Nota máxima" type="number" value={avNotaMaxima} onChange={setAvNotaMaxima} placeholder="10" />
              <Input label="Nota obtida" type="number" value={avNota} onChange={setAvNota} placeholder="Deixe vazio se pendente" />
              <Input label="Data" type="date" value={avData} onChange={setAvData} />
            </div>
            <Input label="Observações" value={avObs} onChange={setAvObs} placeholder="Ex: Matéria dos caps 1-5" />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSave}>{editingAv ? "Salvar" : "Criar"}</Button>
            </div>
          </div>
        </Modal>

        {/* Calculadora Modal */}
        <Modal isOpen={showCalc} onClose={() => setShowCalc(false)} title="Calculadora — Quanto preciso?" size="md">
          <div className="space-y-4">
            <Select label="Disciplina" value={calcDiscId} onChange={setCalcDiscId}
              options={disciplinasCursando.map(d => ({ value: d.id, label: d.nome }))} />

            {calcDisc && calcDesemp && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-[var(--bg-hover)]">
                    <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                      {calcDesemp.media_ponderada !== null ? calcDesemp.media_ponderada.toFixed(2) : "—"}
                    </p>
                    <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Média atual</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--bg-hover)]">
                    <p className="font-mono text-2xl font-bold text-[var(--orange-500)]">
                      {calcDisc.nota_aprovacao ?? 7}
                    </p>
                    <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Nota mínima</p>
                  </div>
                  <div className="p-3 rounded-xl" style={{ backgroundColor: calcDesemp.nota_necessaria !== null && calcDesemp.nota_necessaria > 10 ? "var(--red-bg)" : calcDesemp.nota_necessaria !== null && calcDesemp.nota_necessaria > 8 ? "rgba(245,158,11,.1)" : "rgba(16,185,129,.1)" }}>
                    <p className={`font-mono text-2xl font-bold ${calcDesemp.nota_necessaria !== null && calcDesemp.nota_necessaria > 10 ? "text-[var(--red-text)]" : calcDesemp.nota_necessaria !== null && calcDesemp.nota_necessaria > 8 ? "text-[#f59e0b]" : "text-[#10b981]"}`}>
                      {calcDesemp.nota_necessaria !== null ? calcDesemp.nota_necessaria.toFixed(2) : "—"}
                    </p>
                    <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Precisa tirar</p>
                  </div>
                </div>

                {/* Detalhamento */}
                <div className="space-y-1.5">
                  {calcDesemp.avaliacoes.map(av => (
                    <div key={av.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border-subtle)]">
                      <div>
                        <p className="font-dm text-sm text-[var(--text-primary)]">{av.titulo}</p>
                        <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Peso: {av.peso}%</p>
                      </div>
                      <div className="text-right">
                        {av.nota !== null ? (
                          <p className="font-mono text-sm font-bold text-[var(--text-primary)]">{av.nota}/{av.nota_maxima}</p>
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertTriangle size={12} className="text-[#f59e0b]" />
                            <span className="font-dm text-xs text-[#f59e0b]">Pendente</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {calcDesemp.nota_necessaria !== null && calcDesemp.nota_necessaria > 10 && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--red-border)] bg-[var(--red-bg)]">
                    <AlertTriangle size={16} className="text-[var(--red-text)]" />
                    <p className="font-dm text-sm text-[var(--red-text)]">
                      Nota necessária ({calcDesemp.nota_necessaria.toFixed(2)}) excede o máximo. Aprovação por nota comprometida.
                    </p>
                  </div>
                )}

                {calcDesemp.nota_necessaria !== null && calcDesemp.nota_necessaria <= 10 && calcDesemp.nota_necessaria >= 0 && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-hover)]">
                    {calcDesemp.nota_necessaria <= 5 ? (
                      <CheckCircle size={16} className="text-[#10b981]" />
                    ) : (
                      <Calculator size={16} className="text-[var(--text-tertiary)]" />
                    )}
                    <p className="font-dm text-sm text-[var(--text-secondary)]">
                      Você precisa de <span className="font-mono font-bold">{calcDesemp.nota_necessaria.toFixed(2)}</span> nas avaliações restantes ({calcDesemp.total_peso - calcDesemp.peso_avaliado}% do peso total).
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      </div>
    </Shell>
  );
}
