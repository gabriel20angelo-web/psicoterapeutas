import type {
  Terapeuta, Paciente, Atividade, Supervisao,
  AtividadeComunidade, Notificacao, TemplateMensagem,
} from '@/types/database';

// ─── MOCK DATA LIMPO PARA MVP ───
// Todos os arrays vazios — dados reais virão do Supabase ou serão criados pelo usuário.

export const MOCK_PACIENTES: Paciente[] = [];
export const MOCK_ATIVIDADES: Atividade[] = [];
export const MOCK_SUPERVISOES: Supervisao[] = [];
export const MOCK_ATIVIDADES_COMUNIDADE: AtividadeComunidade[] = [];
export const MOCK_NOTIFICACOES: Notificacao[] = [];
export const MOCK_TEMPLATES: TemplateMensagem[] = [];
