import {
  startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth,
  addDays, format, isToday, isSameDay, getHours, getMinutes,
  differenceInMinutes, addWeeks, addMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Atividade, Recorrencia } from '@/types/database';

/**
 * Retorna o título para exibir de uma atividade.
 * Para sessões com paciente vinculado, sempre usa o nome ATUAL do paciente —
 * evita que o título fique stale se o paciente foi renomeado depois da criação.
 * Para outros tipos (ou sessões sem paciente), usa o titulo salvo.
 */
export function displayAtividadeTitulo(a: Atividade): string {
  if (a.tipo === "sessao" && a.paciente) {
    return `Sessão com ${a.paciente.nome}`;
  }
  return a.titulo;
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

export function getMonthDays(date: Date): Date[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const monthStart = startOfWeek(start, { weekStartsOn: 1 });
  const monthEnd = endOfWeek(end, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: monthStart, end: monthEnd });
}

export function getTimeSlots(startHour = 5, endHour = 23, intervalMinutes = 60): string[] {
  const slots: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

export function getActivityPosition(activity: Atividade, startHour = 5, hourHeight = 60): { top: number; height: number } {
  const start = new Date(activity.data_inicio);
  const end = new Date(activity.data_fim);
  const startMinutes = (getHours(start) - startHour) * 60 + getMinutes(start);
  const duration = differenceInMinutes(end, start);
  const pixelsPerMinute = hourHeight / 60;
  return {
    top: startMinutes * pixelsPerMinute,
    height: Math.max(duration * pixelsPerMinute, 20),
  };
}

export function hasConflict(newStart: Date, newEnd: Date, activities: Atividade[], excludeId?: string): Atividade | undefined {
  return activities.find(a => {
    if (excludeId && a.id === excludeId) return false;
    if (a.status === 'cancelada') return false;
    const aStart = new Date(a.data_inicio);
    const aEnd = new Date(a.data_fim);
    return newStart < aEnd && newEnd > aStart;
  });
}

export function formatTimeRange(start: string, end: string): string {
  return `${format(new Date(start), 'HH:mm')} – ${format(new Date(end), 'HH:mm')}`;
}

export function formatDateBR(date: string | Date): string {
  return format(new Date(date), "dd 'de' MMMM", { locale: ptBR });
}

export function formatDayHeader(date: Date): string {
  return format(date, "EEE dd", { locale: ptBR });
}

export function getGreeting(hour: number): string {
  if (hour < 12) return '☀️ Bom dia';
  if (hour < 18) return '🌤️ Boa tarde';
  return '🌙 Boa noite';
}

export const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const WEEKDAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
