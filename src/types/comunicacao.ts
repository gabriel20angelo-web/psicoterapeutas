export type CategoriaAviso = 'urgente' | 'informativo' | 'atualizacao' | 'lembrete' | string;
export type StatusEncaminhamento = 'aberto' | 'em_conversa' | 'aceito' | 'fechado';
export type TagPost = 'ajuda' | 'intervisao' | 'material' | 'discussao' | 'indicacao' | 'geral';
export type EmojiReacao = 'coracao' | 'joinha' | 'risada' | 'surpresa' | 'tristeza';
export type TipoEntidade = 'aviso' | 'encaminhamento' | 'chat' | 'post' | 'comentario';

export interface Aviso {
  id: string;
  titulo: string;
  corpo: string;
  imagem_url?: string;
  categoria: CategoriaAviso;
  fixado: boolean;
  autor_id: string;
  autor_nome: string;
  created_at: string;
  reacoes: ReacaoAgregada[];
  lido: boolean;
}

export interface Encaminhamento {
  id: string;
  autor_id: string;
  autor_nome: string;
  descricao_caso: string;
  faixa_etaria?: string;
  modalidade?: string;
  urgencia?: boolean;
  horarios_sugeridos?: string;
  terapeuta_designado_nome?: string;
  status: StatusEncaminhamento;
  created_at: string;
  respostas: EncaminhamentoResposta[];
  reacoes: ReacaoAgregada[];
}

export interface EncaminhamentoResposta {
  id: string;
  encaminhamento_id: string;
  autor_id: string;
  autor_nome: string;
  texto: string;
  created_at: string;
}

export interface ChatMensagem {
  id: string;
  autor_id: string;
  autor_nome: string;
  texto: string;
  imagem_url?: string;
  reply_to?: string;
  reply_preview?: string;
  reply_autor?: string;
  created_at: string;
  reacoes: ReacaoAgregada[];
}

export interface Post {
  id: string;
  autor_id: string;
  autor_nome: string;
  titulo?: string;
  corpo: string;
  imagem_url?: string;
  tag: TagPost;
  created_at: string;
  comentarios: PostComentario[];
  reacoes: ReacaoAgregada[];
}

export interface PostComentario {
  id: string;
  post_id: string;
  autor_id: string;
  autor_nome: string;
  texto: string;
  created_at: string;
  reacoes: ReacaoAgregada[];
}

export interface ReacaoAgregada {
  emoji: EmojiReacao;
  count: number;
  usuarios: string[];
  minha: boolean;
}

export interface Reacao {
  id: string;
  tipo_entidade: TipoEntidade;
  entidade_id: string;
  autor_id: string;
  autor_nome: string;
  emoji: EmojiReacao;
  created_at: string;
}
