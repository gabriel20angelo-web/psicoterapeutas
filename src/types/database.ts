export type StatusPaciente = 'ativo' | 'inativo' | 'espera';
export type TipoAtividade = 'sessao' | 'supervisao' | 'pessoal' | 'outro';
export type StatusAtividade = 'confirmada' | 'pendente' | 'reagendada' | 'cancelada' | 'realizada' | 'ausencia';
export type Recorrencia = 'nenhuma' | 'semanal' | 'quinzenal' | 'mensal';
export type Modalidade = 'presencial' | 'online' | 'hibrido';
export type CategoriaComunidade = 'formacao_allos' | 'grupo_estudos' | 'intervisao' | 'evento_externo' | 'outro';
export type TipoComunidade = 'canonico' | 'comunidade';
export type TipoNotificacao = 'lembrete_sessao' | 'resumo_dia' | 'confirmacao' | 'paciente_inativo' | 'lembrete_supervisao' | 'atividade_formacao' | 'atividade_comunidade';
export type TipoTemplate = 'confirmacao' | 'cobranca' | 'reagendamento' | 'personalizado';

export interface Terapeuta {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  crp?: string;
  especialidades?: string[];
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Paciente {
  id: string;
  terapeuta_id: string;
  nome: string;
  telefone?: string;
  email?: string;
  data_nascimento?: string;
  status: StatusPaciente;
  contato_emergencia_nome?: string;
  contato_emergencia_telefone?: string;
  contato_emergencia_relacao?: string;
  dia_fixo?: string;
  horario_fixo?: string;
  modalidade: Modalidade;
  observacoes?: string;
  data_inicio_atendimento?: string;
  created_at: string;
  updated_at: string;
}

export interface Atividade {
  id: string;
  terapeuta_id: string;
  paciente_id?: string;
  tipo: TipoAtividade;
  titulo: string;
  descricao?: string;
  data_inicio: string;
  data_fim: string;
  status: StatusAtividade;
  recorrencia: Recorrencia;
  recorrencia_pai_id?: string;
  motivo_cancelamento?: string;
  nota_pos_sessao?: string;
  presenca_registrada: boolean;
  created_at: string;
  updated_at: string;
  // joined
  paciente?: Paciente;
}

export interface Supervisao {
  id: string;
  atividade_id: string;
  paciente_id: string;
  notas?: string;
  created_at: string;
  // joined
  paciente?: Paciente;
  atividade?: Atividade;
}

export interface AtividadeComunidade {
  id: string;
  criador_id: string;
  titulo: string;
  descricao?: string;
  categoria: CategoriaComunidade;
  tipo: TipoComunidade;
  data_inicio: string;
  data_fim: string;
  local_ou_link?: string;
  max_participantes?: number;
  recorrencia: Recorrencia;
  created_at: string;
  updated_at: string;
  // computed
  criador?: Terapeuta;
  total_inscritos?: number;
  inscrito?: boolean;
}

export interface InscricaoComunidade {
  id: string;
  atividade_comunidade_id: string;
  terapeuta_id: string;
  inscrito_em: string;
}

export interface Notificacao {
  id: string;
  terapeuta_id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem?: string;
  lida: boolean;
  link?: string;
  created_at: string;
}

export interface TemplateMensagem {
  id: string;
  terapeuta_id: string;
  nome: string;
  tipo: TipoTemplate;
  conteudo: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin_master' | 'admin' | 'terapeuta_senior' | 'terapeuta';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  username: string;
  is_admin: boolean;
  approved: boolean;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// Permission helpers
export function isAdminRole(role?: string): boolean {
  return role === 'admin_master' || role === 'admin';
}

export function isAdminMaster(role?: string): boolean {
  return role === 'admin_master';
}

export function canCreateEncaminhamento(role?: string): boolean {
  return role === 'admin_master' || role === 'admin' || role === 'terapeuta_senior';
}

export function canCreateAviso(role?: string): boolean {
  return role === 'admin_master' || role === 'admin';
}

export function canCreateFormacaoCanonica(role?: string): boolean {
  return role === 'admin_master' || role === 'admin';
}

export function canApproveBlog(role?: string): boolean {
  return role === 'admin_master' || role === 'admin';
}

export function canManageUsers(role?: string): boolean {
  return role === 'admin_master' || role === 'admin';
}

export function canRemoveUser(myRole?: string, targetRole?: string): boolean {
  if (myRole === 'admin_master') return true;
  if (myRole === 'admin' && targetRole !== 'admin_master') return true;
  return false;
}
