"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft, GraduationCap, Lock, CheckCircle, BookOpen,
  AlertTriangle, ChevronDown,
} from "lucide-react";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import {
  getGraduacoes, getPeriodosEntities, getDisciplinasByPeriodo,
  getDisciplina, calcularDesempenho, calcularCRGraduacao,
} from "@/lib/academico-data";
import type { Disciplina, Graduacao, Periodo, StatusDisciplina } from "@/types/academico";
import { LABEL_STATUS_DISCIPLINA, LABEL_TIPO_DISCIPLINA } from "@/types/academico";

const STATUS_STYLES: Record<StatusDisciplina, { bg: string; border: string; text: string; ring: string }> = {
  concluida: { bg: "rgba(16,185,129,.08)", border: "#10b981", text: "#10b981", ring: "rgba(16,185,129,.3)" },
  cursando:  { bg: "rgba(59,130,246,.08)", border: "#3b82f6", text: "#3b82f6", ring: "rgba(59,130,246,.3)" },
  pendente:  { bg: "var(--bg-hover)", border: "var(--border-subtle)", text: "var(--text-tertiary)", ring: "transparent" },
  trancada:  { bg: "rgba(239,68,68,.06)", border: "var(--red-text)", text: "var(--red-text)", ring: "rgba(239,68,68,.2)" },
};

export default function MapaGraduacaoPage() {
  const graduacoes = getGraduacoes();
  const [selectedGradId, setSelectedGradId] = useState(graduacoes[0]?.id || "");
  const [hoveredDisc, setHoveredDisc] = useState<string | null>(null);

  const grad = graduacoes.find(g => g.id === selectedGradId);
  const periodos = getPeriodosEntities()
    .filter(p => p.graduacao_id === selectedGradId)
    .sort((a, b) => a.numero - b.numero);

  // All disciplines in this graduation, organized by period
  const disciplinasPorPeriodo = useMemo(() => {
    const map = new Map<string, Disciplina[]>();
    for (const p of periodos) {
      map.set(p.id, getDisciplinasByPeriodo(p.id));
    }
    return map;
  }, [periodos]);

  const allDiscs = useMemo(() => {
    const arr: Disciplina[] = [];
    disciplinasPorPeriodo.forEach(discs => arr.push(...discs));
    return arr;
  }, [disciplinasPorPeriodo]);

  // All disc IDs that are completed
  const completedIds = new Set(allDiscs.filter(d => d.status === "concluida").map(d => d.id));

  // Check if prerequisites are met
  const prereqsMet = (disc: Disciplina): boolean => {
    const prereqs = disc.prerequisitos_ids || [];
    return prereqs.every(id => completedIds.has(id));
  };

  // Find which discs depend on a given disc (reverse deps)
  const dependentsOf = (discId: string): string[] => {
    return allDiscs.filter(d => (d.prerequisitos_ids || []).includes(discId)).map(d => d.id);
  };

  // Stats
  const crData = selectedGradId ? calcularCRGraduacao(selectedGradId) : null;
  const totalDiscs = allDiscs.length;
  const concluidas = allDiscs.filter(d => d.status === "concluida").length;
  const cursando = allDiscs.filter(d => d.status === "cursando").length;
  const trancadas = allDiscs.filter(d => d.status === "trancada").length;

  // Highlighted discs (prereqs + dependents of hovered)
  const highlighted = useMemo(() => {
    if (!hoveredDisc) return new Set<string>();
    const disc = getDisciplina(hoveredDisc);
    if (!disc) return new Set<string>();
    const set = new Set<string>();
    // Add prerequisites
    (disc.prerequisitos_ids || []).forEach(id => set.add(id));
    // Add dependents
    dependentsOf(hoveredDisc).forEach(id => set.add(id));
    return set;
  }, [hoveredDisc, allDiscs]);

  return (
    <Shell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/academico" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors">
              <ArrowLeft size={18} className="text-[var(--text-tertiary)]" />
            </Link>
            <div>
              <h1 className="font-fraunces text-xl font-bold text-[var(--text-primary)]">Mapa da Graduação</h1>
              <p className="font-dm text-sm text-[var(--text-tertiary)]">Visão completa do seu progresso acadêmico</p>
            </div>
          </div>
          {graduacoes.length > 1 && (
            <Select value={selectedGradId} onChange={setSelectedGradId}
              options={graduacoes.map(g => ({ value: g.id, label: g.nome }))} />
          )}
        </div>

        {graduacoes.length === 0 ? (
          <EmptyState icon={<GraduationCap size={40} />} message="Nenhuma graduação cadastrada. Crie graduações em Períodos." />
        ) : !grad ? (
          <EmptyState icon={<GraduationCap size={40} />} message="Selecione uma graduação." />
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card>
                <div className="p-4 text-center">
                  <p className="font-mono text-2xl font-bold text-[var(--orange-500)]">
                    {crData?.cr_geral !== null && crData?.cr_geral !== undefined ? crData.cr_geral.toFixed(2) : "—"}
                  </p>
                  <p className="font-dm text-[10px] text-[var(--text-tertiary)]">CR Geral</p>
                </div>
              </Card>
              <Card>
                <div className="p-4 text-center">
                  <p className="font-mono text-2xl font-bold text-[#10b981]">{concluidas}</p>
                  <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Concluídas</p>
                </div>
              </Card>
              <Card>
                <div className="p-4 text-center">
                  <p className="font-mono text-2xl font-bold text-[#3b82f6]">{cursando}</p>
                  <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Cursando</p>
                </div>
              </Card>
              <Card>
                <div className="p-4 text-center">
                  <p className="font-mono text-2xl font-bold text-[var(--text-tertiary)]">{totalDiscs - concluidas - cursando - trancadas}</p>
                  <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Pendentes</p>
                </div>
              </Card>
              {grad.total_creditos > 0 && (
                <Card>
                  <div className="p-4 text-center">
                    <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">{crData?.percentual_conclusao || 0}%</p>
                    <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Conclusão</p>
                  </div>
                </Card>
              )}
            </div>

            {/* Progress bar */}
            {grad.total_creditos > 0 && crData && (
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="font-dm text-xs text-[var(--text-tertiary)]">Progresso do curso</span>
                  <span className="font-mono text-xs text-[var(--text-secondary)]">{crData.total_creditos_aprovados}/{grad.total_creditos} créditos</span>
                </div>
                <div className="w-full h-3 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[var(--orange-500)] to-[#10b981] transition-all" style={{ width: `${Math.min(crData.percentual_conclusao, 100)}%` }} />
                </div>
              </div>
            )}

            {/* Grid do mapa */}
            {periodos.length === 0 ? (
              <EmptyState icon={<BookOpen size={32} />} message="Nenhum período nesta graduação." />
            ) : (
              <div className="space-y-4">
                {/* Legend */}
                <div className="flex flex-wrap gap-3">
                  {(["concluida", "cursando", "pendente", "trancada"] as StatusDisciplina[]).map(s => {
                    const style = STATUS_STYLES[s];
                    return (
                      <div key={s} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: style.bg, border: `2px solid ${style.border}` }} />
                        <span className="font-dm text-xs text-[var(--text-tertiary)]">{LABEL_STATUS_DISCIPLINA[s]}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-1.5">
                    <Lock size={12} className="text-[var(--text-tertiary)]" />
                    <span className="font-dm text-xs text-[var(--text-tertiary)]">Pré-requisito pendente</span>
                  </div>
                </div>

                {/* Period columns */}
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-3" style={{ minWidth: `${periodos.length * 220}px` }}>
                    {periodos.map(periodo => {
                      const discs = disciplinasPorPeriodo.get(periodo.id) || [];
                      const crPeriodo = crData?.cr_periodo.get(periodo.id);
                      return (
                        <div key={periodo.id} className="flex-1 min-w-[200px]">
                          {/* Period header */}
                          <div className="mb-2 px-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-fraunces text-sm font-semibold text-[var(--text-primary)]">{periodo.nome}</h3>
                              {periodo.ativo && <Badge bg="rgba(16,185,129,.1)" text="#10b981" label="Ativo" />}
                            </div>
                            {crPeriodo !== null && crPeriodo !== undefined && (
                              <p className="font-mono text-[10px] text-[var(--text-tertiary)]">CR: {crPeriodo.toFixed(2)}</p>
                            )}
                          </div>

                          {/* Discipline cards */}
                          <div className="space-y-2">
                            {discs.length === 0 ? (
                              <div className="p-3 rounded-xl border border-dashed border-[var(--border-subtle)] text-center">
                                <p className="font-dm text-xs text-[var(--text-tertiary)]">Sem disciplinas</p>
                              </div>
                            ) : (
                              discs.map(disc => {
                                const style = STATUS_STYLES[disc.status];
                                const prereqs = disc.prerequisitos_ids || [];
                                const hasPrereqs = prereqs.length > 0;
                                const prereqOk = prereqsMet(disc);
                                const isHighlighted = highlighted.has(disc.id);
                                const isHovered = hoveredDisc === disc.id;
                                const desemp = calcularDesempenho(disc.id);

                                return (
                                  <Link key={disc.id} href={`/academico/disciplinas/${disc.id}`}>
                                    <div
                                      className="p-3 rounded-xl border-2 transition-all cursor-pointer hover:scale-[1.02]"
                                      style={{
                                        backgroundColor: style.bg,
                                        borderColor: isHovered ? "var(--orange-500)" : isHighlighted ? "#f59e0b" : style.border,
                                        boxShadow: isHighlighted ? `0 0 0 3px ${style.ring}` : undefined,
                                        opacity: hoveredDisc && !isHighlighted && !isHovered ? 0.4 : 1,
                                      }}
                                      onMouseEnter={() => setHoveredDisc(disc.id)}
                                      onMouseLeave={() => setHoveredDisc(null)}
                                    >
                                      <div className="flex items-start justify-between gap-1">
                                        <div className="min-w-0 flex-1">
                                          <p className="font-dm text-xs font-semibold text-[var(--text-primary)] line-clamp-2">{disc.nome}</p>
                                          {disc.codigo && (
                                            <p className="font-mono text-[10px] text-[var(--text-tertiary)]">{disc.codigo}</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          {disc.status === "concluida" && <CheckCircle size={14} style={{ color: style.text }} />}
                                          {hasPrereqs && !prereqOk && disc.status === "pendente" && <Lock size={12} className="text-[var(--text-tertiary)]" />}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                        <span className="font-dm text-[10px]" style={{ color: style.text }}>
                                          {LABEL_STATUS_DISCIPLINA[disc.status]}
                                        </span>
                                        {disc.creditos > 0 && (
                                          <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{disc.creditos}cr</span>
                                        )}
                                        <Badge bg="var(--bg-hover)" text="var(--text-tertiary)" label={LABEL_TIPO_DISCIPLINA[disc.tipo]} />
                                      </div>

                                      {/* Nota final ou média */}
                                      {(disc.nota_final !== null || desemp.media_ponderada !== null) && (
                                        <div className="mt-1.5 flex items-center gap-1">
                                          <span className="font-dm text-[10px] text-[var(--text-tertiary)]">Nota:</span>
                                          <span className={`font-mono text-xs font-bold ${
                                            (disc.nota_final ?? desemp.media_ponderada ?? 0) >= (disc.nota_aprovacao ?? 7) ? "text-[#10b981]" : "text-[var(--red-text)]"
                                          }`}>
                                            {(disc.nota_final ?? desemp.media_ponderada)?.toFixed(1)}
                                          </span>
                                        </div>
                                      )}

                                      {/* Pré-requisitos */}
                                      {hasPrereqs && (
                                        <div className="mt-1.5 pt-1.5 border-t border-[var(--border-subtle)]">
                                          <p className="font-dm text-[9px] text-[var(--text-tertiary)]">
                                            Pré-req: {prereqs.map(id => getDisciplina(id)?.nome || "?").join(", ")}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </Link>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
