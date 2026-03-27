import type {
  Aviso, Encaminhamento, EncaminhamentoResposta, ChatMensagem,
  Post, PostComentario, Reacao, ReacaoAgregada, EmojiReacao,
  CategoriaAviso, StatusEncaminhamento, TagPost, TipoEntidade,
} from '@/types/comunicacao';

// Current user info — set by the app after auth
let _currentUserId = '';
let _currentUserName = '';

export function setComunicacaoUser(userId: string, userName: string) {
  _currentUserId = userId;
  _currentUserName = userName;
}

// ─── REAÇÕES ───
let reacoes: Reacao[] = [];

function agregateReacoes(tipoEntidade: TipoEntidade, entidadeId: string): ReacaoAgregada[] {
  const entReacoes = reacoes.filter(r => r.tipo_entidade === tipoEntidade && r.entidade_id === entidadeId);
  const map = new Map<EmojiReacao, { count: number; usuarios: string[]; minha: boolean }>();
  for (const r of entReacoes) {
    const existing = map.get(r.emoji) || { count: 0, usuarios: [], minha: false };
    existing.count++;
    existing.usuarios.push(r.autor_nome);
    if (r.autor_id === _currentUserId) existing.minha = true;
    map.set(r.emoji, existing);
  }
  return Array.from(map.entries()).map(([emoji, data]) => ({ emoji, ...data }));
}

export function toggleReacao(tipoEntidade: TipoEntidade, entidadeId: string, emoji: EmojiReacao): void {
  const existing = reacoes.find(r => r.tipo_entidade === tipoEntidade && r.entidade_id === entidadeId && r.emoji === emoji && r.autor_id === _currentUserId);
  if (existing) {
    reacoes = reacoes.filter(r => r.id !== existing.id);
  } else {
    reacoes.push({ id: `r-${Date.now()}-${Math.random()}`, tipo_entidade: tipoEntidade, entidade_id: entidadeId, autor_id: _currentUserId, autor_nome: _currentUserName, emoji, created_at: new Date().toISOString() });
  }
}

// ─── AVISOS ───
let avisos: Omit<Aviso, 'reacoes' | 'lido'>[] = [];
let leituras = new Set<string>();

// ─── ENCAMINHAMENTOS ───
let encaminhamentos: Omit<Encaminhamento, 'reacoes'>[] = [];

// ─── CHAT ───
let chatMensagens: Omit<ChatMensagem, 'reacoes'>[] = [];

// ─── POSTS ───
let posts: Omit<Post, 'reacoes' | 'comentarios'>[] = [];

let postComentarios: Omit<PostComentario, 'reacoes'>[] = [];

// ─── API FUNCTIONS ───

// Avisos
export function getAvisos(): Aviso[] {
  const sorted = [...avisos].sort((a, b) => {
    if (a.fixado && !b.fixado) return -1;
    if (!a.fixado && b.fixado) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return sorted.map(a => ({ ...a, reacoes: agregateReacoes('aviso', a.id), lido: leituras.has(a.id) }));
}

export function createAviso(data: { titulo: string; corpo: string; categoria: CategoriaAviso; fixado?: boolean; imagem_url?: string }): void {
  avisos.push({ id: `av-${Date.now()}`, ...data, fixado: data.fixado || false, autor_id: _currentUserId, autor_nome: _currentUserName, created_at: new Date().toISOString() });
}

export function marcarAvisoLido(id: string): void { leituras.add(id); }
export function getAvisosNaoLidos(): number { return avisos.filter(a => !leituras.has(a.id)).length; }

// Encaminhamentos
export function getEncaminhamentos(statusFilter?: StatusEncaminhamento | 'todos'): Encaminhamento[] {
  let result = [...encaminhamentos];
  if (statusFilter && statusFilter !== 'todos') result = result.filter(e => e.status === statusFilter);
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return result.map(e => ({ ...e, reacoes: agregateReacoes('encaminhamento', e.id) }));
}

export function createEncaminhamento(data: { descricao_caso: string; faixa_etaria?: string; modalidade?: string; urgencia?: boolean; horarios_sugeridos?: string; terapeuta_designado_nome?: string }): void {
  encaminhamentos.push({ id: `enc-${Date.now()}`, ...data, autor_id: _currentUserId, autor_nome: _currentUserName, status: 'aberto', created_at: new Date().toISOString(), respostas: [] });
}

export function responderEncaminhamento(encId: string, texto: string): void {
  const enc = encaminhamentos.find(e => e.id === encId);
  if (!enc) return;
  enc.respostas.push({ id: `encr-${Date.now()}`, encaminhamento_id: encId, autor_id: _currentUserId, autor_nome: _currentUserName, texto, created_at: new Date().toISOString() });
  if (enc.status === 'aberto') enc.status = 'em_conversa';
}

const VALID_ENC_STATUS = ['aberto', 'em_conversa', 'aceito', 'fechado'];

export function updateEncaminhamentoStatus(id: string, status: StatusEncaminhamento): void {
  if (!VALID_ENC_STATUS.includes(status)) return;
  const enc = encaminhamentos.find(e => e.id === id);
  if (enc) enc.status = status;
}

// Chat
export function getChatMensagens(): ChatMensagem[] {
  return chatMensagens.map(m => ({ ...m, reacoes: agregateReacoes('chat', m.id) }));
}

export function enviarMensagem(data: { texto: string; imagem_url?: string; reply_to?: string; reply_preview?: string; reply_autor?: string }): void {
  chatMensagens.push({ id: `chat-${Date.now()}`, ...data, autor_id: _currentUserId, autor_nome: _currentUserName, created_at: new Date().toISOString() });
}

export function editarMensagem(id: string, texto: string): void {
  const msg = chatMensagens.find(m => m.id === id);
  if (msg && msg.autor_id === _currentUserId) msg.texto = texto;
}

export function deletarMensagem(id: string): void {
  chatMensagens = chatMensagens.filter(m => !(m.id === id && m.autor_id === _currentUserId));
}

// Posts
export function getPosts(tagFilter?: TagPost | 'todos', search?: string): Post[] {
  let result = [...posts];
  if (tagFilter && tagFilter !== 'todos') result = result.filter(p => p.tag === tagFilter);
  if (search) { const q = search.toLowerCase(); result = result.filter(p => p.titulo?.toLowerCase().includes(q) || p.corpo.toLowerCase().includes(q)); }
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return result.map(p => ({
    ...p,
    reacoes: agregateReacoes('post', p.id),
    comentarios: postComentarios.filter(c => c.post_id === p.id).map(c => ({ ...c, reacoes: agregateReacoes('comentario', c.id) })),
  }));
}

export function createPost(data: { titulo?: string; corpo: string; tag?: TagPost; imagem_url?: string }): void {
  posts.push({ id: `post-${Date.now()}`, ...data, tag: 'geral', autor_id: _currentUserId, autor_nome: _currentUserName, created_at: new Date().toISOString() });
}

export function comentarPost(postId: string, texto: string): void {
  postComentarios.push({ id: `pc-${Date.now()}`, post_id: postId, autor_id: _currentUserId, autor_nome: _currentUserName, texto, created_at: new Date().toISOString() });
}

export function updatePost(postId: string, corpo: string): void {
  const post = posts.find(p => p.id === postId);
  if (post) post.corpo = corpo;
}

export function deletePost(postId: string): void {
  posts = posts.filter(p => p.id !== postId);
  postComentarios = postComentarios.filter(c => c.post_id !== postId);
}

export function updateAviso(avisoId: string, data: { titulo?: string; corpo?: string }): void {
  const aviso = avisos.find(a => a.id === avisoId);
  if (aviso) {
    if (data.titulo !== undefined) aviso.titulo = data.titulo;
    if (data.corpo !== undefined) aviso.corpo = data.corpo;
  }
}

export function deleteAviso(avisoId: string): void {
  avisos = avisos.filter(a => a.id !== avisoId);
}

// Badges (unread counts)
export function getComunicacaoBadges(): { avisos: number; encaminhamentos: number; chat: number; posts: number; total: number } {
  const a = getAvisosNaoLidos();
  return { avisos: a, encaminhamentos: 0, chat: 0, posts: 0, total: a };
}
