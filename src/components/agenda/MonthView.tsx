"use client";

import { format, isSameDay, isSameMonth, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import type { Atividade } from "@/types/database";
import { getMonthDays, WEEKDAYS_SHORT, displayAtividadeTitulo } from "@/lib/calendar-utils";
import { staggerChild } from "@/lib/animations";

interface Props {
  currentDate: Date;
  activities: Atividade[];
  onSelectDay: (date: Date) => void;
}

const DOT_COLORS: Record<string, string> = {
  sessao: "#C84B31",
  supervisao: "#D97706",
  pessoal: "#9CA3AF",
  outro: "#7C3AED",
};

const COMPACT_BG: Record<string, { bg: string; darkBg: string; text: string; darkText: string }> = {
  sessao: { bg: "rgba(200,75,49,.08)", darkBg: "rgba(200,120,80,.10)", text: "#9E3520", darkText: "#E8A68C" },
  supervisao: { bg: "rgba(217,119,6,.08)", darkBg: "rgba(217,160,50,.10)", text: "#92400E", darkText: "#FCD34D" },
  pessoal: { bg: "rgba(156,163,175,.08)", darkBg: "rgba(156,163,175,.08)", text: "#4B5563", darkText: "#9CA3AF" },
  outro: { bg: "rgba(124,58,237,.08)", darkBg: "rgba(140,90,230,.10)", text: "#5B21B6", darkText: "#C4B5FD" },
};

export default function MonthView({ currentDate, activities, onSelectDay }: Props) {
  const days = getMonthDays(currentDate);
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  function getActivitiesForDay(day: Date) {
    return activities.filter((a) => isSameDay(new Date(a.data_inicio), day));
  }

  return (
    <motion.div {...staggerChild(0)} className="flex flex-col flex-1 min-h-0 p-1 overflow-x-auto">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1 flex-shrink-0 min-w-[500px]">
        {WEEKDAYS_SHORT.map((wd) => (
          <div key={wd} className="text-center font-dm text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] py-2">
            {wd}
          </div>
        ))}
      </div>

      {/* Weeks grid */}
      <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden flex flex-col flex-1 min-h-0 min-w-[500px]">
        {weeks.map((week, wi) => (
          <div key={wi} className={`grid grid-cols-7 flex-1 ${wi > 0 ? "border-t border-[var(--border-subtle)]" : ""}`}>
            {week.map((day, di) => {
              const inMonth = isSameMonth(day, currentDate);
              const today = isToday(day);
              const dayActs = getActivitiesForDay(day);
              return (
                <div
                  key={di}
                  className={`p-2 cursor-pointer transition-colors hover:bg-[var(--bg-hover)] ${
                    di > 0 ? "border-l border-[var(--border-subtle)]" : ""
                  } ${!inMonth ? "opacity-40" : ""} ${
                    today ? "bg-[var(--orange-glow)]/30 dark:bg-[rgba(200,75,49,.04)]" : ""
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${format(day, "dd 'de' MMMM", { locale: ptBR })}, ${dayActs.length} atividade${dayActs.length !== 1 ? "s" : ""}`}
                  onClick={() => onSelectDay(day)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectDay(day);
                    }
                  }}
                >
                  <div className="flex items-center justify-center mb-1">
                    <span
                      className={`font-dm text-sm w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                        today
                          ? "bg-[var(--orange-500)] text-white font-bold shadow-[0_0_10px_rgba(200,75,49,.3)]"
                          : inMonth
                          ? "text-[var(--text-primary)] font-medium"
                          : "text-[var(--text-tertiary)]"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Activity dots */}
                  <div className="flex flex-wrap gap-1 justify-center">
                    {dayActs.slice(0, 5).map((act) => (
                      <div
                        key={act.id}
                        className={`w-2 h-2 rounded-full ${act.status === "cancelada" ? "opacity-30" : ""}`}
                        style={{ backgroundColor: DOT_COLORS[act.tipo] || DOT_COLORS.outro }}
                        title={`${displayAtividadeTitulo(act)} - ${format(new Date(act.data_inicio), "HH:mm")}`}
                      />
                    ))}
                    {dayActs.length > 5 && (
                      <span className="font-dm text-[9px] text-[var(--text-tertiary)]">+{dayActs.length - 5}</span>
                    )}
                  </div>

                  {/* Compact list for larger screens */}
                  <div className="hidden lg:block mt-1 space-y-0.5">
                    {dayActs.slice(0, 3).map((act) => {
                      const style = COMPACT_BG[act.tipo] || COMPACT_BG.outro;
                      return (
                        <div
                          key={act.id}
                          className={`font-dm text-[10px] leading-tight truncate px-1.5 py-0.5 rounded ${
                            act.status === "cancelada" ? "opacity-40 line-through" : ""
                          }`}
                          style={{
                            backgroundColor: isDark ? style.darkBg : style.bg,
                            color: isDark ? style.darkText : style.text,
                          }}
                        >
                          {format(new Date(act.data_inicio), "HH:mm")} {displayAtividadeTitulo(act)}
                        </div>
                      );
                    })}
                    {dayActs.length > 3 && (
                      <p className="font-dm text-[9px] text-[var(--text-tertiary)] text-center">
                        +{dayActs.length - 3} mais
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
