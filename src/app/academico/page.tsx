"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  GraduationCap, BookOpen, ClipboardCheck, Calendar, Play,
  BarChart3, Target, Plus, ArrowRight, TrendingUp, Map,
  AlertTriangle, Clock, BookMarked, ChevronRight,
  Flame, Sparkles, CalendarDays,
} from "lucide-react";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { staggerChild } from "@/lib/animations";
import {
  getAcademicoStats, getDisciplinasCursando,
  getTarefasProximas, getBibliotecaEmLeitura, getConfigAcademica,
} from "@/lib/academico-data";
import { getAtividades } from "@/lib/data";
import { getTodasAtividadesHoje as getForjaHoje } from "@/lib/forja-data";
import { getConteudosProximos7Dias as getUsinaProximos } from "@/lib/usina-data";
import type { Disciplina, Tarefa, BibliotecaItem } from "@/types/academico";
import { LABEL_TIPO_TAREFA, LABEL_STATUS_LEITURA } from "@/types/academico";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const NAV_CARDS = [
  { label: "Períodos", desc: "Disciplinas por semestre", href: "/academico/periodos", icon: GraduationCap, color: "var(--orange-500)" },
  { label: "Conteúdos", desc: "Aulas e resumos", href: "/academico/conteudos", icon: BookOpen, color: "#3b82f6" },
  { label: "Tarefas", desc: "Provas e entregas", href: "/academico/tarefas", icon: ClipboardCheck, color: "#8b5cf6" },
  { label: "Notas", desc: "Médias, CR e avaliações", href: "/academico/notas", icon: TrendingUp, color: "#06b6d4" },
  { label: "Frequência", desc: "Presenças e faltas", href: "/academico/frequencia", icon: Calendar, color: "#10b981" },
  { label: "Biblioteca", desc: "Leituras e livros", href: "/academico/biblioteca", icon: BookMarked, color: "#f59e0b" },
  { label: "Cursos", desc: "Cursos avulsos e trilhas", href: "/academico/cursos", icon: Play, color: "#06b6d4" },
  { label: "Metas", desc: "Objetivos e reflexões", href: "/academico/metas", icon: Target, color: "#ec4899" },
  { label: "Mapa", desc: "Fluxograma da graduação", href: "/academico/mapa", icon: Map, color: "#8b5cf6" },
  { label: "Planejamento", desc: "Semana de estudos", href: "/academico/planejamento", icon: BarChart3, color: "#64748b" },
];

export default function AcademicoHub() {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const stats = getAcademicoStats();
  const config = getConfigAcademica();
  const tarefasProximas = getTarefasProximas(7);
  const livrosEmLeitura = getBibliotecaEmLeitura();
  const disciplinas = getDisciplinasCursando();

  // Cross-module data
  const forjaHoje = getForjaHoje().filter(a => !a.id.startsWith("academico-") && !a.id.startsWith("usina-")).slice(0, 4);
  const usinaProximos = getUsinaProximos().slice(0, 4);
  const now = new Date();
  const weekRange = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  const agendaSemana = getAtividades(weekRange).filter(a => a.status !== 'cancelada');

  return (
    <Shell>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--orange-glow)] flex items-center justify-center">
              <GraduationCap size={22} className="text-[var(--orange-500)]" />
            </div>
            <div>
              <h1 className="font-fraunces text-2xl font-bold text-[var(--text-primary)]">Acadêmico</h1>
              <p className="font-dm text-sm text-[var(--text-tertiary)]">Sua organização acadêmica completa</p>
            </div>
          </div>
        </div>

        {/* Citação */}
        {config.citacao_dashboard && (
          <div className="px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <p className="font-dm text-sm text-[var(--text-secondary)] italic text-center">
              &ldquo;{config.citacao_dashboard}&rdquo;
            </p>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <div className="p-4 text-center">
              <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">{stats.disciplinasCursando}</p>
              <p className="font-dm text-xs text-[var(--text-tertiary)] mt-1">Disciplinas</p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">{stats.tarefasPendentes}</p>
              <p className="font-dm text-xs text-[var(--text-tertiary)] mt-1">Tarefas pendentes</p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">{stats.livrosEmLeitura}</p>
              <p className="font-dm text-xs text-[var(--text-tertiary)] mt-1">Em leitura</p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="font-mono text-2xl font-bold text-[var(--orange-500)]">
                {stats.progressoLeitura.lidos}/{stats.progressoLeitura.meta}
              </p>
              <p className="font-dm text-xs text-[var(--text-tertiary)] mt-1">Livros no ano</p>
            </div>
          </Card>
        </div>

        {/* Alerts - Attendance Risk */}
        {stats.disciplinasEmRisco.length > 0 && (
          <div className="space-y-2">
            {stats.disciplinasEmRisco.map(({ disciplina, resumo }) => (
              <div key={disciplina.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--red-border)] bg-[var(--red-bg)]">
                <AlertTriangle size={18} className="text-[var(--red-text)] shrink-0" />
                <p className="font-dm text-sm text-[var(--red-text)]">
                  <span className="font-semibold">{disciplina.nome}</span> — {resumo.percentual}% de frequência ({resumo.ausentes} faltas)
                  {resumo.risco === "risco" ? " — RISCO DE REPROVAÇÃO" : " — Atenção"}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Próximas Tarefas */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-fraunces text-lg font-semibold text-[var(--text-primary)]">Próximos 7 dias</h2>
              <Link href="/academico/tarefas" className="font-dm text-xs text-[var(--orange-500)] hover:underline flex items-center gap-1">
                Ver todas <ChevronRight size={14} />
              </Link>
            </div>
            {tarefasProximas.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<ClipboardCheck size={32} />}
                  message="Nenhuma tarefa próxima. Você não tem tarefas com prazo nos próximos 7 dias."
                />
              </Card>
            ) : (
              <div className="space-y-2">
                {tarefasProximas.slice(0, 8).map((tarefa, i) => (
                  <motion.div key={tarefa.id} {...staggerChild(i)}>
                    <Card>
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <Clock size={16} className="text-[var(--text-tertiary)]" />
                          <div>
                            <p className="font-dm text-sm font-medium text-[var(--text-primary)]">{tarefa.titulo}</p>
                            <p className="font-dm text-xs text-[var(--text-tertiary)]">
                              {tarefa.data_entrega} &middot; {LABEL_TIPO_TAREFA[tarefa.tipo]}
                            </p>
                          </div>
                        </div>
                        <Badge
                          bg={tarefa.data_entrega <= new Date().toISOString().slice(0, 10) ? "var(--red-bg)" : "var(--bg-hover)"}
                          text={tarefa.data_entrega <= new Date().toISOString().slice(0, 10) ? "var(--red-text)" : "var(--text-secondary)"}
                          label={tarefa.data_entrega <= new Date().toISOString().slice(0, 10) ? "Atrasada" : tarefa.data_entrega}
                        />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar - Livros em leitura */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-fraunces text-lg font-semibold text-[var(--text-primary)]">Em leitura</h2>
              <Link href="/academico/biblioteca" className="font-dm text-xs text-[var(--orange-500)] hover:underline flex items-center gap-1">
                Ver todos <ChevronRight size={14} />
              </Link>
            </div>
            {livrosEmLeitura.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<BookMarked size={32} />}
                  message="Nenhum livro. Adicione livros na Biblioteca."
                />
              </Card>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {livrosEmLeitura.slice(0, 8).map(livro => (
                  <Link key={livro.id} href="/academico/biblioteca" className="shrink-0 group">
                    <div className="w-[72px] space-y-1.5">
                      {livro.capa_base64 ? (
                        <div className="w-[72px] h-[104px] rounded-lg overflow-hidden border border-[var(--border-subtle)] group-hover:shadow-md transition-shadow">
                          <img src={livro.capa_base64} alt={livro.titulo} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-[72px] h-[104px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-hover)] flex items-center justify-center">
                          <BookMarked size={20} className="text-[var(--text-tertiary)]" />
                        </div>
                      )}
                      <p className="font-dm text-[10px] text-[var(--text-primary)] line-clamp-2 text-center leading-tight">{livro.titulo}</p>
                      {livro.andamento && (
                        <p className="font-dm text-[9px] text-[var(--orange-500)] text-center">{livro.andamento}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Links Rápidos */}
            {config.links_rapidos.length > 0 && (
              <div className="space-y-2 mt-4">
                <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Links rápidos</h3>
                {config.links_rapidos.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                    <ArrowRight size={14} className="text-[var(--text-tertiary)]" />
                    <span className="font-dm text-sm text-[var(--text-secondary)]">{link.label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cross-module: Visão Integrada */}
        {(forjaHoje.length > 0 || usinaProximos.length > 0 || agendaSemana.length > 0) && (
          <div>
            <h2 className="font-fraunces text-lg font-semibold text-[var(--text-primary)] mb-3">Visão Integrada</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Agenda da semana */}
              <Card>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays size={14} className="text-[#C84B31]" />
                    <h3 className="font-dm text-sm font-semibold text-[var(--text-primary)]">Agenda da semana</h3>
                  </div>
                  {agendaSemana.length === 0 ? (
                    <p className="font-dm text-xs text-[var(--text-tertiary)]">Semana livre</p>
                  ) : (
                    <div className="space-y-1.5">
                      {agendaSemana.slice(0, 4).map(a => (
                        <div key={a.id} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                            background: a.tipo === 'sessao' ? '#C84B31' : a.tipo === 'supervisao' ? '#D97706' : '#9CA3AF'
                          }} />
                          <div className="min-w-0 flex-1">
                            <p className="font-dm text-xs text-[var(--text-primary)] truncate">{a.titulo}</p>
                            <p className="font-dm text-[10px] text-[var(--text-tertiary)]">
                              {format(new Date(a.data_inicio), "EEE HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {agendaSemana.length > 4 && (
                        <p className="font-dm text-[10px] text-[var(--text-tertiary)]">+{agendaSemana.length - 4} mais</p>
                      )}
                    </div>
                  )}
                  <Link href="/agenda" className="font-dm text-[10px] text-[var(--orange-500)] hover:underline mt-2 inline-block">
                    Ver agenda completa
                  </Link>
                </div>
              </Card>

              {/* Forja hoje */}
              <Card>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame size={14} className="text-[#f97316]" />
                    <h3 className="font-dm text-sm font-semibold text-[var(--text-primary)]">Forja — hoje</h3>
                  </div>
                  {forjaHoje.length === 0 ? (
                    <p className="font-dm text-xs text-[var(--text-tertiary)]">Nenhuma tarefa para hoje</p>
                  ) : (
                    <div className="space-y-1.5">
                      {forjaHoje.map(a => (
                        <div key={a.id} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#f97316]" />
                          <p className="font-dm text-xs text-[var(--text-primary)] truncate">{a.titulo}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link href="/forja" className="font-dm text-[10px] text-[var(--orange-500)] hover:underline mt-2 inline-block">
                    Abrir Forja
                  </Link>
                </div>
              </Card>

              {/* Usina próximos */}
              <Card>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-[#8b5cf6]" />
                    <h3 className="font-dm text-sm font-semibold text-[var(--text-primary)]">Usina — próximos</h3>
                  </div>
                  {usinaProximos.length === 0 ? (
                    <p className="font-dm text-xs text-[var(--text-tertiary)]">Nenhum conteúdo planejado</p>
                  ) : (
                    <div className="space-y-1.5">
                      {usinaProximos.map(c => (
                        <div key={c.id} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-[#8b5cf6]" />
                          <div className="min-w-0 flex-1">
                            <p className="font-dm text-xs text-[var(--text-primary)] truncate">{c.emoji_marcador || '✨'} {c.titulo}</p>
                            <p className="font-dm text-[10px] text-[var(--text-tertiary)]">{c.data_planejada}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link href="/conteudo" className="font-dm text-[10px] text-[var(--orange-500)] hover:underline mt-2 inline-block">
                    Abrir Usina
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Navigation Cards */}
        <div>
          <h2 className="font-fraunces text-lg font-semibold text-[var(--text-primary)] mb-3">Módulos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {NAV_CARDS.map(card => (
              <Link key={card.href} href={card.href}>
                <Card hover>
                  <div className="p-4 flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                      <card.icon size={20} style={{ color: card.color }} />
                    </div>
                    <p className="font-dm text-sm font-medium text-[var(--text-primary)]">{card.label}</p>
                    <p className="font-dm text-xs text-[var(--text-tertiary)]">{card.desc}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}
