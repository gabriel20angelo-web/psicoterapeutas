import type { StatusAtividade, TipoAtividade } from '@/types/database';

export const STATUS_COLORS: Record<StatusAtividade, { bg: string; text: string; label: string; dot: string }> = {
  pendente:   { bg: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/40', text: 'text-amber-700 dark:text-amber-400', label: 'Pendente', dot: 'bg-amber-500' },
  confirmada: { bg: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/40', text: 'text-emerald-700 dark:text-emerald-400', label: 'Confirmada', dot: 'bg-emerald-500' },
  reagendada: { bg: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/40', text: 'text-blue-700 dark:text-blue-400', label: 'Reagendada', dot: 'bg-blue-500' },
  realizada:  { bg: 'bg-teal-100 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800/40', text: 'text-teal-700 dark:text-teal-400', label: 'Realizada', dot: 'bg-teal-500' },
  cancelada:  { bg: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800/40', text: 'text-red-600 dark:text-red-400', label: 'Cancelada', dot: 'bg-red-500' },
  ausencia:   { bg: 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/40', text: 'text-rose-600 dark:text-rose-400', label: 'Ausência', dot: 'bg-rose-500' },
};

export const TIPO_COLORS: Record<TipoAtividade, { bg: string; text: string; label: string; calendarBg: string }> = {
  sessao:     { bg: 'bg-orange-500/10 border-orange-500/20', text: 'text-orange-500', label: 'Sessão', calendarBg: 'bg-orange-500' },
  supervisao: { bg: 'bg-[var(--amber-bg)] border-[var(--amber-border)]', text: 'text-[var(--amber-text)]', label: 'Supervisão', calendarBg: 'bg-amber-600' },
  pessoal:    { bg: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700', text: 'text-gray-600 dark:text-gray-400', label: 'Pessoal', calendarBg: 'bg-gray-400' },
  outro:      { bg: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800/40', text: 'text-purple-700 dark:text-purple-400', label: 'Outro', calendarBg: 'bg-purple-500' },
};

// Calendar event color: combines tipo base color with status accent
export const STATUS_CALENDAR_ACCENT: Record<StatusAtividade, string> = {
  pendente: '',
  confirmada: 'ring-2 ring-emerald-400/50',
  reagendada: 'ring-2 ring-blue-400/50 opacity-80',
  realizada: 'opacity-60',
  cancelada: 'opacity-40 line-through',
  ausencia: 'opacity-40 ring-2 ring-rose-400/50',
};

export const STATUS_PACIENTE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ativo:   { bg: 'bg-[var(--green-bg)] border-[var(--green-border)]', text: 'text-[var(--green-text)]', label: 'Ativo' },
  inativo: { bg: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700', text: 'text-gray-600 dark:text-gray-400', label: 'Inativo' },
  espera:  { bg: 'bg-[var(--amber-bg)] border-[var(--amber-border)]', text: 'text-[var(--amber-text)]', label: 'Em espera' },
};
