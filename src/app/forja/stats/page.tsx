"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Flame,
  BarChart3,
  Clock,
  Zap,
  CheckSquare,
  Trophy,
  Calendar,
} from "lucide-react";
import Shell from "@/components/Shell";
import ForjaNav from "@/components/forja/ForjaNav";
import { fadeUp, staggerChild } from "@/lib/animations";
import {
  getEstatisticas,
  getTempoFocadoHoje,
  getPomodorosHoje,
  getAtividadesConcluidasHoje,
  getAtividadesConcluidasSemana,
  getDadosDiarios,
  getMetaDiaria,
  getDiasComFoco,
  formatTempo,
  hoje,
} from "@/lib/forja-data";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type Periodo = "hoje" | "semana" | "mes";

/* ── Summary Card ─────────────────────────────── */
function SummaryCard({
  icon: Icon,
  label,
  value,
  index,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  index: number;
}) {
  return (
    <motion.div
      {...staggerChild(index)}
      className="rounded-xl p-4 flex items-center gap-3"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: "var(--orange-glow)" }}
      >
        <Icon size={18} style={{ color: "var(--orange-500)" }} />
      </div>
      <div>
        <p
          className="font-fraunces font-bold text-lg leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </p>
        <p
          className="font-dm text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          {label}
        </p>
      </div>
    </motion.div>
  );
}

/* ── Bar Chart (CSS-based) ───────────────────── */
function BarChart({
  data,
  metaSeg,
}: {
  data: { data: string; minutos: number }[];
  metaSeg: number;
}) {
  const maxVal = Math.max(...data.map((d) => d.minutos * 60), metaSeg, 1);
  const barMaxH = 160;

  return (
    <div className="relative">
      {/* Dashed meta line */}
      {metaSeg > 0 && (
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed pointer-events-none z-10"
          style={{
            borderColor: "var(--orange-500)",
            opacity: 0.4,
            bottom: `${(metaSeg / maxVal) * barMaxH + 24}px`,
          }}
        />
      )}

      <div className="flex items-end gap-1.5 pt-4 pb-2 overflow-x-auto">
        {data.map((d) => {
          const h = (d.minutos * 60 / maxVal) * barMaxH;
          const isAboveMeta = d.minutos * 60 >= metaSeg && metaSeg > 0;
          return (
            <div
              key={d.data}
              className="flex flex-col items-center flex-1 min-w-[28px]"
            >
              <span
                className="font-dm text-[10px] mb-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                {d.minutos * 60 > 0 ? formatTempo(d.minutos * 60) : ""}
              </span>
              <div
                className="w-full max-w-[32px] rounded-t-md transition-all duration-300"
                style={{
                  height: Math.max(h, 2),
                  background: isAboveMeta
                    ? "var(--green-text)"
                    : "var(--text-tertiary)",
                  opacity: isAboveMeta ? 1 : 0.35,
                }}
              />
              <span
                className="font-dm text-[10px] mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                {dayAbbr(d.data)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function dayAbbr(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

/* ── Mini Calendar ───────────────────────────── */
function MiniCalendar({ meta }: { meta: number }) {
  const now = new Date();
  const currentMonth = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const calStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const diasComFoco = getDiasComFoco();

  // Get sessions by day for checking if met goal
  const dadosMes = getDadosDiarios(31);
  const dadosPorDia: Record<string, number> = {};
  dadosMes.forEach((d) => {
    dadosPorDia[d.data] = d.minutos * 60; // seconds
  });

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  return (
    <motion.div
      {...fadeUp(0.15)}
      className="rounded-2xl p-6"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={16} style={{ color: "var(--orange-500)" }} />
        <h2
          className="font-fraunces font-semibold text-base capitalize"
          style={{ color: "var(--text-primary)" }}
        >
          {format(now, "MMMM yyyy", { locale: ptBR })}
        </h2>
      </div>

      <div className="overflow-x-auto"><div className="grid grid-cols-7 gap-0 min-w-[280px]">
        {/* Day headers */}
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
          <div
            key={d}
            className="text-center font-dm text-[10px] py-1 border-b border-[var(--border-subtle)]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {d}
          </div>
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const hasFocus = diasComFoco.has(dateStr);
          const segundos = dadosPorDia[dateStr] || 0;
          const metBatida = meta > 0 && segundos >= meta;

          return (
            <div
              key={dateStr}
              className="p-1 text-center border border-[var(--border-subtle)] min-h-[36px] relative cursor-pointer"
              onClick={() => setSelectedDay(selectedDay === dateStr ? null : dateStr)}
            >
              <span
                className={`font-dm text-xs ${
                  today
                    ? "bg-[var(--orange-500)] text-white rounded-full w-6 h-6 inline-flex items-center justify-center"
                    : inMonth
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-tertiary)] opacity-40"
                }`}
              >
                {format(day, "d")}
              </span>
              {hasFocus && inMonth && (
                <div
                  className={`w-1.5 h-1.5 rounded-full mx-auto mt-0.5 ${
                    metBatida ? "bg-[var(--green-text)]" : "bg-[var(--orange-500)]"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div></div>

      {/* Selected day summary */}
      {selectedDay && (
        <div
          className="mt-3 rounded-lg p-3"
          style={{ background: "var(--bg-input)" }}
        >
          <p className="font-dm text-xs" style={{ color: "var(--text-tertiary)" }}>
            {format(new Date(selectedDay + "T12:00:00"), "dd 'de' MMMM", { locale: ptBR })}
          </p>
          <p className="font-fraunces font-bold text-sm" style={{ color: "var(--text-primary)" }}>
            {dadosPorDia[selectedDay]
              ? formatTempo(dadosPorDia[selectedDay])
              : "Sem foco registrado"}
          </p>
          {dadosPorDia[selectedDay] && meta > 0 && (
            <p className="font-dm text-xs mt-0.5" style={{
              color: dadosPorDia[selectedDay] >= meta ? "var(--green-text)" : "var(--orange-500)",
            }}>
              {dadosPorDia[selectedDay] >= meta ? "Meta atingida!" : "Meta nao atingida"}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ── Main Page ────────────────────────────────── */
export default function ForjaStatsPage() {
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [stats, setStats] = useState({
    tempoTotal: 0,
    pomodorosCompletos: 0,
    atividadesConcluidas: 0,
    streak: 0,
    diasComFoco: 0,
    mediaDiaria: 0,
    tempoHoje: 0,
    tempoSemana: 0,
  });
  const [tempoHoje, setTempoHoje] = useState(0);
  const [meta, setMeta] = useState(0);
  const [atividadesHoje, setAtividadesHoje] = useState(0);
  const [atividadesSemana, setAtividadesSemana] = useState(0);
  const [chartData, setChartData] = useState<
    { data: string; minutos: number }[]
  >([]);

  const reload = useCallback(() => {
    const est = getEstatisticas(periodo);
    setStats(est);
    setTempoHoje(getTempoFocadoHoje());
    setMeta(getMetaDiaria());
    setAtividadesHoje(getAtividadesConcluidasHoje());
    setAtividadesSemana(getAtividadesConcluidasSemana());
    const dias = periodo === "hoje" ? 1 : periodo === "semana" ? 7 : 30;
    setChartData(getDadosDiarios(dias));
  }, [periodo]);

  useEffect(() => {
    reload();
  }, [reload]);

  const tabs: { key: Periodo; label: string }[] = [
    { key: "hoje", label: "Hoje" },
    { key: "semana", label: "Semana" },
    { key: "mes", label: "Mês" },
  ];

  return (
    <Shell>
      {/* Header */}
      <motion.div {...fadeUp()} className="flex items-center gap-3 mb-6">
        <Flame size={28} style={{ color: "var(--orange-500)" }} />
        <div>
          <h1
            className="font-fraunces font-bold text-2xl"
            style={{ color: "var(--text-primary)" }}
          >
            Forja
          </h1>
          <p
            className="font-dm text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Foco e produtividade
          </p>
        </div>
      </motion.div>

      <ForjaNav />

      {/* Period tabs */}
      <motion.div {...fadeUp(0.05)} className="mb-6">
        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl"
          style={{ background: "var(--bg-input)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPeriodo(tab.key)}
              className="px-4 py-1.5 rounded-lg font-dm text-sm font-medium transition-all duration-150"
              style={{
                background:
                  periodo === tab.key ? "var(--orange-glow)" : "transparent",
                color:
                  periodo === tab.key
                    ? "var(--orange-500)"
                    : "var(--text-tertiary)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryCard
          icon={Clock}
          label="Tempo focado"
          value={formatTempo(stats.tempoTotal)}
          index={0}
        />
        <SummaryCard
          icon={Zap}
          label="Pomodoros completados"
          value={stats.pomodorosCompletos}
          index={1}
        />
        <SummaryCard
          icon={CheckSquare}
          label="Atividades concluidas"
          value={stats.atividadesConcluidas}
          index={2}
        />
        <SummaryCard
          icon={Trophy}
          label="Streak"
          value={`${stats.streak} dia${stats.streak !== 1 ? "s" : ""}`}
          index={3}
        />
      </div>

      {/* Additional stats */}
      <motion.div
        {...fadeUp(0.08)}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
      >
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
        >
          <p
            className="font-dm text-xs mb-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Tempo focado hoje
          </p>
          <p
            className="font-fraunces font-bold text-base"
            style={{ color: "var(--text-primary)" }}
          >
            {formatTempo(tempoHoje)}
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
        >
          <p
            className="font-dm text-xs mb-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Tempo focado na semana
          </p>
          <p
            className="font-fraunces font-bold text-base"
            style={{ color: "var(--text-primary)" }}
          >
            {formatTempo(stats.mediaDiaria * stats.diasComFoco)}
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
        >
          <p
            className="font-dm text-xs mb-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Atividades concluidas hoje
          </p>
          <p
            className="font-fraunces font-bold text-base"
            style={{ color: "var(--text-primary)" }}
          >
            {atividadesHoje}
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
        >
          <p
            className="font-dm text-xs mb-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Atividades concluidas na semana
          </p>
          <p
            className="font-fraunces font-bold text-base"
            style={{ color: "var(--text-primary)" }}
          >
            {atividadesSemana}
          </p>
        </div>
      </motion.div>

      {/* Mini Calendar */}
      <div className="mb-6">
        <MiniCalendar meta={meta} />
      </div>

      {/* Bar chart */}
      {periodo !== "hoje" && (
        <motion.div
          {...fadeUp(0.1)}
          className="rounded-2xl p-6 mb-6"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h2
              className="font-fraunces font-semibold text-base"
              style={{ color: "var(--text-primary)" }}
            >
              <BarChart3
                size={16}
                className="inline mr-2"
                style={{ color: "var(--orange-500)" }}
              />
              Tempo por dia
            </h2>
            {meta > 0 && (
              <span
                className="font-dm text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                Meta: {formatTempo(meta)}
              </span>
            )}
          </div>

          <BarChart data={chartData} metaSeg={meta} />
        </motion.div>
      )}

    </Shell>
  );
}
