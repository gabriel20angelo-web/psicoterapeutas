"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, BarChart3, ChevronLeft, ChevronRight, Clock,
  BookOpen, ClipboardCheck, GraduationCap, CalendarHeart,
  Flame, Sparkles, Eye, EyeOff,
} from "lucide-react";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import {
  getDisciplinasCursando, getTarefasPendentes,
  getConteudos, getConfigAcademica,
} from "@/lib/academico-data";
import { getAtividades } from "@/lib/data";
import { getTodasAtividades as getForjaAtividades } from "@/lib/forja-data";
import { getConteudos as getUsinaConteudos, getTarefas as getUsinaTarefas } from "@/lib/usina-data";
import type { Atividade } from "@/types/database";
import { startOfWeek, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LABEL_TIPO_TAREFA } from "@/types/academico";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const DIA_NUM = [1, 2, 3, 4, 5, 6, 0]; // Monday=1 to Sunday=0

export default function PlanejamentoPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [showForja, setShowForja] = useState(true);
  const [showUsina, setShowUsina] = useState(true);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });

  const disciplinas = getDisciplinasCursando();
  const tarefasPendentes = getTarefasPendentes();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Get agenda activities for this week
  const agendaRange = {
    start: weekStart,
    end: addDays(weekStart, 6),
  };
  const agendaActivities = getAtividades(agendaRange);

  // Get Forja activities with deadlines this week
  const forjaActivities = showForja
    ? getForjaAtividades().filter(a =>
        a.data_limite && a.status === "pendente" &&
        !a.id.startsWith("usina-") && !a.id.startsWith("academico-")
      )
    : [];

  // Get Usina content and tasks with dates this week
  const usinaConteudos = showUsina
    ? getUsinaConteudos().filter(c => c.data_planejada && !["postado", "arquivado"].includes(c.status))
    : [];
  const usinaTarefas = showUsina
    ? getUsinaTarefas({ status: "pendente" }).filter(t => t.data_prevista)
    : [];

  // Build week days
  const weekDays = DIAS.map((label, i) => {
    const date = addDays(weekStart, i);
    const dateStr = format(date, "yyyy-MM-dd");
    const diaSemana = DIA_NUM[i];
    const isToday = dateStr === todayStr;

    // Classes for this day (from horario_estruturado)
    const aulas = disciplinas.flatMap(d =>
      d.horario_estruturado
        .filter(h => h.dia === diaSemana)
        .map(h => ({
          id: `${d.id}-${h.dia}-${h.inicio}`,
          type: "aula" as const,
          titulo: d.nome,
          horario: `${h.inicio} — ${h.fim}`,
          color: "#10b981",
        }))
    );

    // Tasks due this day
    const tarefasDia = tarefasPendentes
      .filter(t => t.data_entrega === dateStr)
      .map(t => ({
        id: t.id,
        type: "tarefa" as const,
        titulo: t.titulo,
        horario: LABEL_TIPO_TAREFA[t.tipo],
        color: "#ef4444",
      }));

    // Tasks assigned to study on this day of the week
    const estudoDia = tarefasPendentes
      .filter(t => t.dia_semana_estudo === diaSemana && t.data_entrega !== dateStr)
      .map(t => ({
        id: `estudo-${t.id}`,
        type: "estudo" as const,
        titulo: `Estudar: ${t.titulo}`,
        horario: `Entrega: ${t.data_entrega || "sem data"}`,
        color: "#3b82f6",
      }));

    // Agenda activities for this day
    const agendaDia = agendaActivities
      .filter(a => a.data_inicio.slice(0, 10) === dateStr && a.status !== 'cancelada')
      .map(a => ({
        id: `agenda-${a.id}`,
        type: "agenda" as const,
        titulo: a.titulo,
        horario: `${a.data_inicio.slice(11, 16)} — ${a.data_fim.slice(11, 16)}`,
        color: a.tipo === 'sessao' ? "#C84B31" : a.tipo === 'supervisao' ? "#D97706" : "#9CA3AF",
      }));

    // Forja tasks due this day
    const forjaDia = forjaActivities
      .filter(a => a.data_limite === dateStr)
      .map(a => ({
        id: `forja-${a.id}`,
        type: "forja" as const,
        titulo: `🔥 ${a.titulo}`,
        horario: a.prioridade === "alta" ? "Prioridade alta" : "Forja",
        color: "#f97316",
      }));

    // Usina content planned for this day
    const usinaDia = [
      ...usinaConteudos
        .filter(c => c.data_planejada === dateStr)
        .map(c => ({
          id: `usina-c-${c.id}`,
          type: "usina" as const,
          titulo: `${c.emoji_marcador || "✨"} ${c.titulo}`,
          horario: c.status === "pronto_para_postar" ? "Pronto" : "Conteúdo",
          color: "#8b5cf6",
        })),
      ...usinaTarefas
        .filter(t => t.data_prevista === dateStr)
        .map(t => ({
          id: `usina-t-${t.id}`,
          type: "usina" as const,
          titulo: `✨ ${t.titulo}`,
          horario: t.prioridade === "urgente" ? "Urgente" : "Tarefa Usina",
          color: "#8b5cf6",
        })),
    ];

    return {
      label,
      date,
      dateStr,
      isToday,
      items: [...agendaDia, ...aulas, ...tarefasDia, ...estudoDia, ...forjaDia, ...usinaDia],
    };
  });

  // Unscheduled tasks (no dia_semana_estudo)
  const unscheduled = tarefasPendentes.filter(t => t.dia_semana_estudo == null);

  return (
    <Shell>
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/academico" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors">
              <ArrowLeft size={18} className="text-[var(--text-tertiary)]" />
            </Link>
            <div>
              <h1 className="font-fraunces text-xl font-bold text-[var(--text-primary)]">Planejamento Semanal</h1>
              <p className="font-dm text-sm text-[var(--text-tertiary)]">
                {format(weekStart, "dd MMM", { locale: ptBR })} — {format(addDays(weekStart, 6), "dd MMM yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setWeekOffset(0)}
              className="px-3 py-1.5 rounded-lg font-dm text-xs font-medium text-[var(--orange-500)] hover:bg-[var(--orange-glow)]">
              Hoje
            </button>
            <button onClick={() => setWeekOffset(w => w + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Legend + Toggles */}
        <div className="flex flex-wrap items-center gap-4 px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            <span className="font-dm text-[10px] text-[var(--text-tertiary)]">Aulas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span className="font-dm text-[10px] text-[var(--text-tertiary)]">Entregas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
            <span className="font-dm text-[10px] text-[var(--text-tertiary)]">Estudo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#C84B31]" />
            <span className="font-dm text-[10px] text-[var(--text-tertiary)]">Agenda</span>
          </div>

          <div className="w-px h-4 bg-[var(--border-subtle)]" />

          <button
            onClick={() => setShowForja(v => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-dm text-[10px] font-medium transition-all ${
              showForja
                ? 'bg-[#f97316] text-white'
                : 'border border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {showForja ? <Eye size={10} /> : <EyeOff size={10} />}
            Forja
          </button>
          <button
            onClick={() => setShowUsina(v => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-dm text-[10px] font-medium transition-all ${
              showUsina
                ? 'bg-[#8b5cf6] text-white'
                : 'border border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {showUsina ? <Eye size={10} /> : <EyeOff size={10} />}
            Usina
          </button>
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => (
            <div key={day.dateStr} className={`rounded-xl border ${
              day.isToday ? "border-[var(--orange-500)] bg-[var(--orange-glow)]" : "border-[var(--border-subtle)] bg-[var(--bg-card)]"
            }`}>
              {/* Day header */}
              <div className="text-center py-2 border-b border-[var(--border-subtle)]">
                <p className="font-dm text-[10px] text-[var(--text-tertiary)] uppercase">{day.label}</p>
                <p className={`font-mono text-sm font-bold ${day.isToday ? "text-[var(--orange-500)]" : "text-[var(--text-primary)]"}`}>
                  {format(day.date, "dd")}
                </p>
              </div>

              {/* Items */}
              <div className="p-1.5 space-y-1 min-h-[120px]">
                {day.items.length === 0 ? (
                  <p className="text-center font-dm text-[10px] text-[var(--text-tertiary)] py-4">Livre</p>
                ) : (
                  day.items.map(item => (
                    <div key={item.id} className="px-2 py-1.5 rounded-lg text-left"
                      style={{ backgroundColor: `${item.color}12` }}>
                      <p className="font-dm text-[10px] font-semibold line-clamp-2" style={{ color: item.color }}>
                        {item.type === "aula" && <GraduationCap size={10} className="inline mr-0.5 -mt-0.5" />}
                        {item.type === "tarefa" && <ClipboardCheck size={10} className="inline mr-0.5 -mt-0.5" />}
                        {item.type === "estudo" && <BookOpen size={10} className="inline mr-0.5 -mt-0.5" />}
                        {item.type === "agenda" && <CalendarHeart size={10} className="inline mr-0.5 -mt-0.5" />}
                        {item.type === "forja" && <Flame size={10} className="inline mr-0.5 -mt-0.5" />}
                        {item.type === "usina" && <Sparkles size={10} className="inline mr-0.5 -mt-0.5" />}
                        {item.titulo}
                      </p>
                      <p className="font-dm text-[9px] opacity-70" style={{ color: item.color }}>{item.horario}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Unscheduled tasks */}
        {unscheduled.length > 0 && (
          <div>
            <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
              Tarefas sem dia de estudo atribuído ({unscheduled.length})
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {unscheduled.map(t => (
                <Card key={t.id}>
                  <div className="p-3">
                    <p className="font-dm text-sm font-medium text-[var(--text-primary)] line-clamp-1">{t.titulo}</p>
                    <p className="font-dm text-xs text-[var(--text-tertiary)]">
                      {LABEL_TIPO_TAREFA[t.tipo]} &middot; {t.data_entrega || "Sem data"}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
            <p className="font-dm text-[10px] text-[var(--text-tertiary)] mt-2">
              Dica: Edite a tarefa e atribua um dia da semana para estudo.
            </p>
          </div>
        )}
      </div>
    </Shell>
  );
}
