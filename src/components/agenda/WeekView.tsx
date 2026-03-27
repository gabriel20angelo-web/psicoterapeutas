"use client";

import { useRef, useState, useEffect } from "react";
import { format, isToday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { CheckCircle, Clock } from "lucide-react";
import type { Atividade } from "@/types/database";
import { getTimeSlots, getActivityPosition, getWeekDays } from "@/lib/calendar-utils";
import { getSettings } from "@/lib/data";
import { staggerChild } from "@/lib/animations";

interface Props {
  currentDate: Date;
  activities: Atividade[];
  onClickActivity: (activity: Atividade) => void;
  onClickSlot: (date: Date, time: string) => void;
}

// Cores por tipo — matching the reference screenshot
const TIPO_BG: Record<string, { bg: string; darkBg: string; border: string; text: string; darkText: string }> = {
  sessao: {
    bg: "rgba(200,75,49,.12)",
    darkBg: "rgba(200,120,80,.10)",
    border: "#C84B31",
    text: "#9E3520",
    darkText: "#E8A68C",
  },
  supervisao: {
    bg: "rgba(217,119,6,.12)",
    darkBg: "rgba(217,160,50,.10)",
    border: "#D97706",
    text: "#92400E",
    darkText: "#FCD34D",
  },
  pessoal: {
    bg: "rgba(156,163,175,.10)",
    darkBg: "rgba(156,163,175,.08)",
    border: "#9CA3AF",
    text: "#4B5563",
    darkText: "#9CA3AF",
  },
  outro: {
    bg: "rgba(124,58,237,.12)",
    darkBg: "rgba(140,90,230,.10)",
    border: "#7C3AED",
    text: "#5B21B6",
    darkText: "#C4B5FD",
  },
};

export default function WeekView({ currentDate, activities, onClickActivity, onClickSlot }: Props) {
  const settings = getSettings();
  const START_HOUR = settings.workHourStart;
  const END_HOUR = settings.workHourEnd;
  const days = getWeekDays(currentDate);
  const timeSlots = getTimeSlots(START_HOUR, END_HOUR, 60);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridHeight, setGridHeight] = useState(0);
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) setGridHeight(entry.contentRect.height);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const totalHours = END_HOUR - START_HOUR;
  const HOUR_HEIGHT = Math.max(60, gridHeight > 0 ? gridHeight / totalHours : 60);

  function getActivitiesForDay(day: Date) {
    return activities.filter((a) => isSameDay(new Date(a.data_inicio), day));
  }

  function getStatusOpacity(status: string): number {
    if (status === "cancelada") return 0.35;
    if (status === "ausencia") return 0.45;
    if (status === "reagendada") return 0.55;
    return 1;
  }

  // Group overlapping activities
  function getOverlapGroups(acts: Atividade[]): Atividade[][] {
    if (acts.length === 0) return [];
    const sorted = [...acts].sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());
    const groups: Atividade[][] = [];
    let currentGroup: Atividade[] = [sorted[0]];
    let groupEnd = new Date(sorted[0].data_fim).getTime();

    for (let i = 1; i < sorted.length; i++) {
      const startTime = new Date(sorted[i].data_inicio).getTime();
      if (startTime < groupEnd) {
        currentGroup.push(sorted[i]);
        groupEnd = Math.max(groupEnd, new Date(sorted[i].data_fim).getTime());
      } else {
        groups.push(currentGroup);
        currentGroup = [sorted[i]];
        groupEnd = new Date(sorted[i].data_fim).getTime();
      }
    }
    groups.push(currentGroup);
    return groups;
  }

  return (
    <motion.div {...staggerChild(0)} className="flex-1 flex flex-col min-h-0 overflow-auto">
      <div className="overflow-x-auto flex-1 flex flex-col min-h-0">
        {/* ═══ Day headers ═══ */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-[var(--border-default)] flex-shrink-0 min-w-[700px]">
          <div className="h-14" />
          {days.map((day, i) => {
            const today = isToday(day);
            return (
              <div
                key={format(day, 'yyyy-MM-dd')}
                className={`h-14 flex flex-col items-center justify-center border-l border-[var(--border-subtle)] ${
                  today ? "bg-[var(--orange-glow)] dark:bg-[rgba(200,75,49,.06)]" : ""
                }`}
              >
                <span className="font-dm text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  {format(day, "EEE", { locale: ptBR })}
                </span>
                <span
                  className={`font-dm text-base mt-0.5 ${
                    today
                      ? "text-white bg-[var(--orange-500)] w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-[0_0_12px_rgba(200,75,49,.3)]"
                      : "text-[var(--text-primary)] font-medium"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
            );
          })}
        </div>

        {/* ═══ Time grid ═══ */}
        <div ref={gridRef} className="relative grid grid-cols-[56px_repeat(7,1fr)] min-w-[700px]" style={{ minHeight: totalHours * 60 }}>
          {/* Time labels */}
          <div className="relative">
            {timeSlots.map((slot, i) => (
              <div
                key={slot}
                className="absolute right-3 font-dm text-[11px] font-medium text-[var(--text-tertiary)] -translate-y-1/2"
                style={{ top: i * HOUR_HEIGHT }}
              >
                {slot}
              </div>
            ))}
          </div>

          {/* Horizontal hour lines */}
          {timeSlots.map((slot, i) => (
            <div
              key={`line-${slot}`}
              className="absolute left-[56px] right-0 border-t border-[var(--border-subtle)]"
              style={{ top: i * HOUR_HEIGHT }}
            />
          ))}

          {/* Current time indicator */}
          {(() => {
            const now = new Date();
            const todayIndex = days.findIndex((d) => isToday(d));
            if (todayIndex === -1) return null;
            const nowMinutes = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
            if (nowMinutes < 0 || nowMinutes > (END_HOUR - START_HOUR) * 60) return null;
            const top = nowMinutes * (HOUR_HEIGHT / 60);
            return (
              <div
                className="absolute h-[2px] bg-red-400 dark:bg-red-400 z-20 pointer-events-none"
                style={{
                  top,
                  left: `calc(56px + ${(todayIndex / 7) * 100}%)`,
                  width: `${100 / 7}%`,
                }}
              >
                <div className="absolute -left-1.5 -top-[4px] w-[10px] h-[10px] rounded-full bg-red-400 dark:bg-red-400 shadow-[0_0_6px_rgba(239,68,68,.4)]" />
              </div>
            );
          })()}

          {/* ═══ Day columns ═══ */}
          {days.map((day, dayIdx) => {
            const dayActivities = getActivitiesForDay(day);
            const today = isToday(day);
            const groups = getOverlapGroups(dayActivities);
            const layoutMap = new Map<string, { groupSize: number; indexInGroup: number }>();
            for (const group of groups) {
              group.forEach((act, idx) => {
                layoutMap.set(act.id, { groupSize: group.length, indexInGroup: idx });
              });
            }

            return (
              <div
                key={dayIdx}
                className={`relative border-l border-[var(--border-subtle)] h-full ${
                  today ? "bg-[var(--orange-glow)]/30 dark:bg-[rgba(200,75,49,.02)]" : ""
                }`}
              >
                {/* Clickable hour slots */}
                {timeSlots.map((slot, i) => (
                  <div
                    key={slot}
                    className="absolute inset-x-0 cursor-pointer hover:bg-[var(--bg-hover)]/50 transition-colors"
                    style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Agendar ${format(day, "EEEE", { locale: ptBR })} às ${slot}`}
                    onClick={() => onClickSlot(day, slot)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onClickSlot(day, slot);
                      }
                    }}
                  />
                ))}

                {/* Activity blocks */}
                {dayActivities.map((activity) => {
                  const { top, height } = getActivityPosition(activity, START_HOUR, HOUR_HEIGHT);
                  const startTime = format(new Date(activity.data_inicio), "HH:mm");
                  const endTime = format(new Date(activity.data_fim), "HH:mm");
                  const tooltipText = `${activity.titulo} (${startTime} - ${endTime})${activity.paciente ? ` - ${activity.paciente.nome}` : ""}`;
                  const layout = layoutMap.get(activity.id) || { groupSize: 1, indexInGroup: 0 };
                  const widthPercent = 100 / layout.groupSize;
                  const leftPercent = layout.indexInGroup * widthPercent;
                  const tipo = TIPO_BG[activity.tipo] || TIPO_BG.outro;
                  const opacity = getStatusOpacity(activity.status);

                  return (
                    <div
                      key={activity.id}
                      className="absolute z-10 rounded-lg border-l-[3px] px-2 py-1 cursor-pointer overflow-hidden transition-all hover:shadow-md hover:brightness-105 dark:hover:brightness-125"
                      style={{
                        top,
                        height: Math.max(height, 24),
                        left: `calc(3px + ${leftPercent}%)`,
                        width: `calc(${widthPercent}% - 6px)`,
                        backgroundColor: isDark ? tipo.darkBg : tipo.bg,
                        borderLeftColor: tipo.border,
                        borderStyle: activity.status === "pendente" ? "dashed" : "solid",
                        opacity,
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={tooltipText}
                      title={tooltipText}
                      onClick={(e) => { e.stopPropagation(); onClickActivity(activity); }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          onClickActivity(activity);
                        }
                      }}
                    >
                      <div className="flex items-center gap-0.5">
                        {activity.status === "confirmada" && <CheckCircle size={8} className="text-emerald-500 flex-shrink-0" />}
                        {activity.status === "pendente" && <Clock size={8} className="text-amber-500 flex-shrink-0" />}
                        <p
                          className="font-dm text-[11px] font-bold leading-tight truncate"
                          style={{ color: isDark ? tipo.darkText : tipo.text }}
                        >
                          {activity.titulo}
                        </p>
                      </div>
                      {height > 30 && (
                        <p
                          className="font-dm text-[10px] leading-tight mt-0.5 opacity-70"
                          style={{ color: isDark ? tipo.darkText : tipo.text }}
                        >
                          {startTime}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
