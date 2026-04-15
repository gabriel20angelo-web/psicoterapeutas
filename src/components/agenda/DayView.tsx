"use client";

import { useEffect, useRef, useState } from "react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { CheckCircle, Clock } from "lucide-react";
import type { Atividade } from "@/types/database";
import { getTimeSlots, getActivityPosition, displayAtividadeTitulo } from "@/lib/calendar-utils";
import { TIPO_COLORS, STATUS_COLORS } from "@/lib/status-colors";
import { getSettings } from "@/lib/data";
import Badge from "@/components/ui/Badge";
import { staggerChild } from "@/lib/animations";

interface Props {
  currentDate: Date;
  activities: Atividade[];
  onClickActivity: (activity: Atividade) => void;
  onClickSlot: (date: Date, time: string) => void;
}

const TIPO_STYLE: Record<string, { bg: string; darkBg: string; border: string; text: string; darkText: string }> = {
  sessao: { bg: "rgba(200,75,49,.12)", darkBg: "rgba(200,120,80,.10)", border: "#C84B31", text: "#9E3520", darkText: "#E8A68C" },
  supervisao: { bg: "rgba(217,119,6,.12)", darkBg: "rgba(217,160,50,.10)", border: "#D97706", text: "#92400E", darkText: "#FCD34D" },
  pessoal: { bg: "rgba(156,163,175,.10)", darkBg: "rgba(156,163,175,.08)", border: "#9CA3AF", text: "#4B5563", darkText: "#9CA3AF" },
  outro: { bg: "rgba(124,58,237,.12)", darkBg: "rgba(140,90,230,.10)", border: "#7C3AED", text: "#5B21B6", darkText: "#C4B5FD" },
};

export default function DayView({ currentDate, activities, onClickActivity, onClickSlot }: Props) {
  const settings = getSettings();
  const START_HOUR = settings.workHourStart;
  const END_HOUR = settings.workHourEnd;
  const timeSlots = getTimeSlots(START_HOUR, END_HOUR, 60);
  const dayActivities = activities.filter((a) => isSameDay(new Date(a.data_inicio), currentDate));
  const currentTimeRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (currentTimeRef.current) {
      currentTimeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentDate]);

  // Group overlapping
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

  const overlapGroups = getOverlapGroups(dayActivities);
  const activityLayout = new Map<string, { groupSize: number; indexInGroup: number }>();
  for (const group of overlapGroups) {
    group.forEach((act, idx) => {
      activityLayout.set(act.id, { groupSize: group.length, indexInGroup: idx });
    });
  }

  function getStatusOpacity(status: string): number {
    if (status === "cancelada") return 0.35;
    if (status === "ausencia") return 0.45;
    if (status === "reagendada") return 0.55;
    return 1;
  }

  return (
    <motion.div {...staggerChild(0)} className="flex-1 flex flex-col min-h-0 overflow-auto p-4">
      <div className="mb-4 flex-shrink-0">
        <h2 className="font-fraunces font-semibold text-lg text-[var(--text-primary)] capitalize">
          {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </h2>
        <p className="font-dm text-sm text-[var(--text-secondary)]">
          {dayActivities.length} atividade{dayActivities.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div ref={gridRef} className="relative grid grid-cols-[56px_1fr]" style={{ minHeight: totalHours * 60 }}>
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

        {/* Main column */}
        <div className="relative border-l border-[var(--border-subtle)] h-full">
          {/* Hour lines */}
          {timeSlots.map((slot, i) => (
            <div
              key={`line-${slot}`}
              className="absolute inset-x-0 border-t border-[var(--border-subtle)]"
              style={{ top: i * HOUR_HEIGHT }}
            />
          ))}

          {/* Clickable hour slots */}
          {timeSlots.map((slot, i) => (
            <div
              key={`click-${slot}`}
              className="absolute inset-x-0 cursor-pointer hover:bg-[var(--bg-hover)]/50 transition-colors"
              style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              role="button"
              tabIndex={0}
              aria-label={`Agendar às ${slot}`}
              onClick={() => onClickSlot(currentDate, slot)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClickSlot(currentDate, slot);
                }
              }}
            />
          ))}

          {/* Current time indicator */}
          {(() => {
            const now = new Date();
            if (!isSameDay(now, currentDate)) return null;
            const nowMinutes = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
            if (nowMinutes < 0 || nowMinutes > (END_HOUR - START_HOUR) * 60) return null;
            return (
              <div ref={currentTimeRef} className="absolute inset-x-0 h-[2px] bg-red-400 z-20 pointer-events-none" style={{ top: nowMinutes * (HOUR_HEIGHT / 60) }}>
                <div className="absolute -left-1.5 -top-[4px] w-[10px] h-[10px] rounded-full bg-red-400 shadow-[0_0_6px_rgba(239,68,68,.4)]" />
              </div>
            );
          })()}

          {/* Activity blocks */}
          {dayActivities.map((activity) => {
            const { top, height } = getActivityPosition(activity, START_HOUR, HOUR_HEIGHT);
            const startTime = format(new Date(activity.data_inicio), "HH:mm");
            const endTime = format(new Date(activity.data_fim), "HH:mm");
            const tipoColors = TIPO_COLORS[activity.tipo];
            const statusColors = STATUS_COLORS[activity.status];
            const layout = activityLayout.get(activity.id) || { groupSize: 1, indexInGroup: 0 };
            const widthPercent = 100 / layout.groupSize;
            const leftPercent = layout.indexInGroup * widthPercent;
            const tipo = TIPO_STYLE[activity.tipo] || TIPO_STYLE.outro;
            const opacity = getStatusOpacity(activity.status);

            return (
              <div
                key={activity.id}
                className="absolute z-10 rounded-xl border-l-4 px-4 py-2.5 cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:scale-[1.01] hover:brightness-105 dark:hover:brightness-125"
                style={{
                  top,
                  height: Math.max(height, 36),
                  left: `calc(8px + ${leftPercent}%)`,
                  width: `calc(${widthPercent}% - ${layout.groupSize > 1 ? 16 : 20}px)`,
                  backgroundColor: isDark ? tipo.darkBg : tipo.bg,
                  borderLeftColor: tipo.border,
                  borderStyle: activity.status === "pendente" ? "dashed" : "solid",
                  opacity,
                }}
                role="button"
                tabIndex={0}
                aria-label={`${displayAtividadeTitulo(activity)}, ${startTime} - ${endTime}`}
                onClick={(e) => { e.stopPropagation(); onClickActivity(activity); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onClickActivity(activity);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      {activity.status === "confirmada" && <CheckCircle size={10} className="text-emerald-500 flex-shrink-0" />}
                      {activity.status === "pendente" && <Clock size={10} className="text-amber-500 flex-shrink-0" />}
                      <p
                        className="font-dm text-sm font-bold leading-tight truncate"
                        style={{ color: isDark ? tipo.darkText : tipo.text }}
                      >
                        {displayAtividadeTitulo(activity)}
                      </p>
                    </div>
                    <p
                      className="font-dm text-xs mt-0.5 opacity-70"
                      style={{ color: isDark ? tipo.darkText : tipo.text }}
                    >
                      {startTime} - {endTime}
                    </p>
                    {activity.paciente && height > 55 && (
                      <p className="font-dm text-xs text-[var(--text-secondary)] mt-1">
                        {activity.paciente.nome}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge {...tipoColors} />
                    <Badge {...statusColors} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
