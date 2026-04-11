// ═══════════════════════════════════════════════════
// ACADÊMICO — Academic Organization System
// Type Definitions
// ═══════════════════════════════════════════════════

// ─── STATUS & TYPE UNIONS ───

export type StatusDisciplina = "cursando" | "concluida" | "trancada" | "pendente";
export type TipoDisciplina = "obrigatoria" | "optativa" | "estagio" | "eletiva";

export type StatusEstudo = string; // user-configurable ordered sequence
export const DEFAULT_STATUS_ESTUDO: string[] = [
  "Assistir aula",
  "Estudar",
  "Praticar/Resumir",
  "Revisar",
  "Pronto para prova",
];

export type TipoTarefa = "prova" | "trabalho" | "licao" | "apresentacao" | "seminario" | "outro";
export type StatusTarefa = "pendente" | "em_andamento" | "concluida";

export type TipoPresenca = "presente" | "ausente" | "justificada";

export type StatusLeitura = "quero_ler" | "em_progresso" | "lido" | "abandonado";
export type FormatoLeitura = "fisico" | "digital" | "audiobook";

export type TipoMeta = "anual" | "mensal" | "diaria";
export type StatusMeta = "nao_iniciada" | "em_andamento" | "concluida" | "abandonada";

export type TipoReflexao = "semanal" | "mensal";

export type TipoExtracurricular = "monitoria" | "extensao" | "congresso" | "liga" | "ic" | "curso_livre" | "outro";
export type StatusExtracurricular = "nao_iniciado" | "em_andamento" | "concluido";
export type StatusInscricao = "inscrito" | "nao_inscrito";
export type StatusCertificado = "sim" | "nao";

// ─── INTERFACES ───

export interface HorarioEstruturado {
  dia: number; // 0=dom, 1=seg, ... 6=sab
  inicio: string; // "08:00"
  fim: string;    // "10:00"
}

export interface Disciplina {
  id: string;
  nome: string;
  periodo_id: string; // ID do período (entity)
  professor: string;
  email_professor: string;
  sala: string;
  horario: string; // texto livre
  horario_estruturado: HorarioEstruturado[];
  carga_horaria: number;
  tipo: TipoDisciplina;
  codigo: string;
  link_plataforma: string;
  status: StatusDisciplina;
  total_aulas_previstas: number;
  nota_aprovacao: number; // nota mínima para aprovação (padrão 7)
  nota_final: number | null; // nota final da disciplina (concluída)
  creditos: number; // créditos/horas-aula para cálculo do CR
  prerequisitos_ids: string[]; // IDs de disciplinas que são pré-requisito
  monitoria_nome: string;
  monitoria_email: string;
  monitoria_horario: string;
  monitoria_sala: string;
  created_at: string;
  updated_at: string;
}

export interface Conteudo {
  id: string;
  disciplina_id: string;
  titulo: string;
  data_aula: string; // YYYY-MM-DD
  professor: string;
  modulo_tematico: string;
  status_estudo: string; // one of the ordered sequence values
  resumo_html: string;
  link_resumo_externo: string;
  indicacao_leitura: string;
  bibliografia: string;
  created_at: string;
  updated_at: string;
}

export interface Tarefa {
  id: string;
  disciplina_id: string;
  titulo: string;
  tipo: TipoTarefa;
  data_entrega: string; // YYYY-MM-DD
  status: StatusTarefa;
  conteudos_ids: string[]; // related content IDs (for provas)
  dia_semana_estudo: number | null; // 0-6, for weekly planning
  nota: number | null;
  observacoes: string;
  created_at: string;
  updated_at: string;
}

export interface Frequencia {
  id: string;
  disciplina_id: string;
  data: string; // YYYY-MM-DD
  presenca: TipoPresenca;
  created_at: string;
}

export interface BibliotecaItem {
  id: string;
  titulo: string;
  autores: string;
  genero: string;
  formato: FormatoLeitura;
  status: StatusLeitura;
  data_inicio: string;
  data_fim: string;
  num_paginas: number | null;
  andamento: string; // page or percentage
  ano_leitura: number | null;
  projetos: string[]; // ex: ["Graduação", "TCC", "Pessoal"]
  avaliacao: string;
  editora: string;
  nacionalidade_autor: string;
  anotacoes_html: string;
  capa_base64: string; // data URL da capa do livro (vertical)
  created_at: string;
  updated_at: string;
}

export interface Meta {
  id: string;
  ano: number;
  tipo: TipoMeta;
  categoria: string; // ex: "Acadêmico", "Pessoal", "Saúde"
  descricao: string;
  status: StatusMeta;
  mes: number | null; // 1-12, for monthly goals
  dia: string | null; // YYYY-MM-DD, for daily goals
  created_at: string;
  updated_at: string;
}

export interface Reflexao {
  id: string;
  tipo: TipoReflexao;
  data: string; // YYYY-MM-DD
  conteudo_html: string;
  created_at: string;
  updated_at: string;
}

export interface Extracurricular {
  id: string;
  tipo: TipoExtracurricular;
  titulo: string;
  data_inicio: string;
  data_fim: string;
  carga_horaria: number | null;
  status: StatusExtracurricular;
  inscricao: StatusInscricao;
  certificado: StatusCertificado;
  link: string;
  created_at: string;
  updated_at: string;
}

export interface Graduacao {
  id: string;
  nome: string; // ex: "Psicologia", "Ciência da Computação"
  instituicao: string;
  total_creditos: number; // total de créditos para conclusão do curso
  created_at: string;
}

export type GraduacaoInput = Omit<Graduacao, "id" | "created_at">;

export interface Periodo {
  id: string;
  numero: number; // 1-10
  nome: string; // display: "1º Período", "2º Período", etc.
  graduacao_id: string; // ID da graduação
  data_inicio: string; // YYYY-MM-DD
  data_fim: string; // YYYY-MM-DD
  ativo: boolean;
  created_at: string;
}

export type PeriodoInput = Omit<Periodo, "id" | "created_at">;

export interface LinkRapido {
  label: string;
  url: string;
}

export interface ConfigAcademica {
  meta_leitura_anual: number;
  status_estudo_sequence: string[];
  citacao_dashboard: string;
  links_rapidos: LinkRapido[];
  ano_metas_atual: number;
  fazer_mais: string[];
  fazer_menos: string[];
  regras_do_ano: string[];
  categorias_meta: string[];
}

// ─── INPUT TYPES (for creation) ───

export type DisciplinaInput = Omit<Disciplina, "id" | "created_at" | "updated_at">;
export type ConteudoInput = Omit<Conteudo, "id" | "created_at" | "updated_at">;
export type TarefaInput = Omit<Tarefa, "id" | "created_at" | "updated_at">;
export type FrequenciaInput = Omit<Frequencia, "id" | "created_at">;
export type BibliotecaInput = Omit<BibliotecaItem, "id" | "created_at" | "updated_at">;
export type MetaInput = Omit<Meta, "id" | "created_at" | "updated_at">;
export type ReflexaoInput = Omit<Reflexao, "id" | "created_at" | "updated_at">;
export type ExtracurricularInput = Omit<Extracurricular, "id" | "created_at" | "updated_at">;

// ─── DEFAULTS ───

export const DEFAULT_CONFIG_ACADEMICA: ConfigAcademica = {
  meta_leitura_anual: 12,
  status_estudo_sequence: DEFAULT_STATUS_ESTUDO,
  citacao_dashboard: "",
  links_rapidos: [],
  ano_metas_atual: new Date().getFullYear(),
  fazer_mais: [],
  fazer_menos: [],
  regras_do_ano: [],
  categorias_meta: ["Acadêmico", "Pessoal", "Saúde", "Financeiro", "Idiomas", "Profissional"],
};

// ─── LABEL MAPS ───

export const LABEL_STATUS_DISCIPLINA: Record<StatusDisciplina, string> = {
  cursando: "Cursando",
  concluida: "Concluída",
  trancada: "Trancada",
  pendente: "Pendente",
};

export const LABEL_TIPO_DISCIPLINA: Record<TipoDisciplina, string> = {
  obrigatoria: "Obrigatória",
  optativa: "Optativa",
  estagio: "Estágio",
  eletiva: "Eletiva",
};

export const LABEL_TIPO_TAREFA: Record<TipoTarefa, string> = {
  prova: "Prova",
  trabalho: "Trabalho",
  licao: "Lição",
  apresentacao: "Apresentação",
  seminario: "Seminário",
  outro: "Outro",
};

export const LABEL_STATUS_TAREFA: Record<StatusTarefa, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

export const LABEL_STATUS_LEITURA: Record<StatusLeitura, string> = {
  quero_ler: "Quero ler",
  em_progresso: "Em progresso",
  lido: "Lido",
  abandonado: "Abandonado",
};

export const LABEL_FORMATO_LEITURA: Record<FormatoLeitura, string> = {
  fisico: "Físico",
  digital: "Digital",
  audiobook: "Audiobook",
};

export const LABEL_TIPO_PRESENCA: Record<TipoPresenca, string> = {
  presente: "Presente",
  ausente: "Ausente",
  justificada: "Justificada",
};

export const LABEL_STATUS_META: Record<StatusMeta, string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  abandonada: "Abandonada",
};

export const LABEL_TIPO_EXTRACURRICULAR: Record<TipoExtracurricular, string> = {
  monitoria: "Monitoria",
  extensao: "Extensão",
  congresso: "Congresso",
  liga: "Liga Acadêmica",
  ic: "Iniciação Científica",
  curso_livre: "Curso Livre",
  outro: "Outro",
};

export const LABEL_STATUS_EXTRACURRICULAR: Record<StatusExtracurricular, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

// ─── AVALIAÇÕES / NOTAS ───

export type TipoAvaliacao = "prova" | "trabalho" | "seminario" | "participacao" | "projeto" | "outro";

export interface Avaliacao {
  id: string;
  disciplina_id: string;
  titulo: string; // ex: "P1", "Trabalho Final", "Seminário 2"
  tipo: TipoAvaliacao;
  peso: number; // 0-100, percentual no cálculo da média
  nota: number | null; // 0-10, null = ainda não avaliado
  nota_maxima: number; // padrão 10
  data: string; // YYYY-MM-DD
  observacoes: string;
  created_at: string;
  updated_at: string;
}

export type AvaliacaoInput = Omit<Avaliacao, "id" | "created_at" | "updated_at">;

export const LABEL_TIPO_AVALIACAO: Record<TipoAvaliacao, string> = {
  prova: "Prova",
  trabalho: "Trabalho",
  seminario: "Seminário",
  participacao: "Participação",
  projeto: "Projeto",
  outro: "Outro",
};

export type StatusAprovacao = "aprovado" | "reprovado" | "recuperacao" | "cursando" | "sem_nota";

export interface DesempenhoDisciplina {
  disciplina_id: string;
  media_ponderada: number | null; // null = sem avaliações com nota
  total_peso: number; // soma dos pesos das avaliações cadastradas
  peso_avaliado: number; // soma dos pesos das avaliações COM nota
  status: StatusAprovacao;
  nota_necessaria: number | null; // null se já aprovado/reprovado ou sem avaliações pendentes
  avaliacoes: Avaliacao[];
}

export interface CRAcademico {
  cr_geral: number | null;
  cr_periodo: Map<string, number | null>; // periodo_id -> CR
  total_creditos_cursados: number;
  total_creditos_aprovados: number;
  percentual_conclusao: number; // 0-100, baseado em créditos previstos da graduação
}

// ─── PRÉ-REQUISITOS ───

export interface PreRequisito {
  disciplina_id: string; // disciplina que tem o pré-requisito
  prerequisito_id: string; // disciplina que é pré-requisito
}

// ─── GRADUAÇÃO EXPANDIDA ───

export interface GraduacaoCompleta extends Graduacao {
  total_creditos: number; // total de créditos para concluir o curso
}

// ─── FREQUENCIA RESULT ───

export interface FrequenciaResumo {
  total_previstas: number;
  total_registradas: number;
  presentes: number;
  ausentes: number;
  justificadas: number;
  percentual: number; // 0-100
  risco: "ok" | "atencao" | "risco";
}
