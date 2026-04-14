// ═══════════════════════════════════════════════════
// USINA — Sistema de Autogestão de Produção de Conteúdo
// Data Layer (synced via Supabase kv_store)
// ═══════════════════════════════════════════════════

import { syncSave, syncLoad, initSync } from "./sync";

// ─── TYPES ───

export type StatusConteudo =
  | "caixa_de_ideias" | "proximo" | "roteiro_pronto" | "em_producao"
  | "gravado" | "editando" | "pronto_para_postar" | "postado" | "arquivado";

export type Funil = "topo" | "meio" | "fundo";
export type PrioridadeTarefa = "urgente" | "importante" | "normal" | "baixa";
export type StatusTarefa = "pendente" | "fazendo" | "concluida";
export type StatusRede = "pendente" | "adaptado" | "postado";
export type TipoMeta = "semanal" | "mensal" | "trimestral" | "anual";

export interface Conteudo {
  id: string;
  titulo: string;
  descricao: string;
  roteiro: string;
  status: StatusConteudo;
  data_planejada: string | null;
  data_publicacao: string | null;
  editoria_id: string | null;
  funil: Funil | null;
  is_publi: boolean;
  parceiro_publi: string | null;
  emoji_marcador: string | null;
  notas: string;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface ConteudoRede {
  id: string;
  conteudo_id: string;
  rede_social_id: string;
  status_rede: StatusRede;
  data_postagem: string | null;
  notas_adaptacao: string;
}

export interface RedeSocial {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  ativa: boolean;
  ordem: number;
}

export interface Editoria {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  conteudo_id: string | null;
  data_prevista: string | null;
  prioridade: PrioridadeTarefa;
  status: StatusTarefa;
  created_at: string;
  concluida_em: string | null;
}

export interface Meta {
  id: string;
  titulo: string;
  rede_social_id: string | null;
  tipo: TipoMeta;
  valor_alvo: number;
  valor_atual: number;
  ativa: boolean;
}

export interface RascunhoRapido {
  id: string;
  texto: string;
  created_at: string;
  promovido: boolean;
  conteudo_id: string | null;
}

// ─── CONSTANTS ───

export const STATUS_CONFIG: Record<StatusConteudo, { label: string; cor: string; bg: string; icon: string }> = {
  caixa_de_ideias:    { label: "Caixa de Ideias",    cor: "#8B95A8", bg: "rgba(139,149,168,.1)",  icon: "lightbulb" },
  proximo:            { label: "Próximo",             cor: "#3B82F6", bg: "rgba(59,130,246,.1)",   icon: "arrow-right" },
  roteiro_pronto:     { label: "Roteiro Pronto",      cor: "#8B5CF6", bg: "rgba(139,92,246,.1)",   icon: "file-text" },
  em_producao:        { label: "Em Produção",         cor: "#F59E0B", bg: "rgba(245,158,11,.1)",   icon: "clapperboard" },
  gravado:            { label: "Gravado",             cor: "#EC4899", bg: "rgba(236,72,153,.1)",   icon: "video" },
  editando:           { label: "Editando",            cor: "#EF4444", bg: "rgba(239,68,68,.1)",    icon: "scissors" },
  pronto_para_postar: { label: "Pronto p/ Postar",   cor: "#10B981", bg: "rgba(16,185,129,.1)",   icon: "check-circle" },
  postado:            { label: "Postado",             cor: "#059669", bg: "rgba(5,150,105,.1)",    icon: "send" },
  arquivado:          { label: "Arquivado",           cor: "#6B7280", bg: "rgba(107,114,128,.1)",  icon: "archive" },
};

export const PIPELINE_ORDER: StatusConteudo[] = [
  "caixa_de_ideias", "proximo", "roteiro_pronto", "em_producao",
  "gravado", "editando", "pronto_para_postar", "postado",
];

export const FUNIL_CONFIG: Record<Funil, { label: string; cor: string }> = {
  topo:  { label: "Topo",  cor: "#3B82F6" },
  meio:  { label: "Meio",  cor: "#F59E0B" },
  fundo: { label: "Fundo", cor: "#10B981" },
};

export const PRIORIDADE_CONFIG: Record<PrioridadeTarefa, { label: string; cor: string; bg: string }> = {
  urgente:    { label: "Urgente",    cor: "#EF4444", bg: "rgba(239,68,68,.1)" },
  importante: { label: "Importante", cor: "#F59E0B", bg: "rgba(245,158,11,.1)" },
  normal:     { label: "Normal",     cor: "#3B82F6", bg: "rgba(59,130,246,.1)" },
  baixa:      { label: "Baixa",      cor: "#6B7280", bg: "rgba(107,114,128,.1)" },
};

// ─── STORAGE KEYS ───

const KEYS = {
  conteudos: "usina-conteudos",
  conteudo_redes: "usina-conteudo-redes",
  redes_sociais: "usina-redes-sociais",
  editorias: "usina-editorias",
  tarefas: "usina-tarefas",
  metas: "usina-metas",
  rascunhos: "usina-rascunhos",
};

// ─── SEED DATA ───

const SEED_REDES: RedeSocial[] = [];

const SEED_EDITORIAS: Editoria[] = [];

const SEED_CONTEUDOS: Conteudo[] = [];

const SEED_CONTEUDO_REDES: ConteudoRede[] = [];

const SEED_TAREFAS: Tarefa[] = [];

const SEED_METAS: Meta[] = [];

const SEED_RASCUNHOS: RascunhoRapido[] = [];

/** Initialize sync for Usina keys. */
export function initUsinaSync(): Promise<void> {
  return initSync(Object.values(KEYS));
}

// ─── GENERIC STORAGE HELPERS (synced) ───

function load<T>(key: string, seed: T[]): T[] {
  return syncLoad<T[]>(key, seed);
}

function save<T>(key: string, data: T[]) {
  syncSave(key, data);
}

function uid(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function now(): string { return new Date().toISOString(); }

// ─── REDES SOCIAIS ───

export function getRedesSociais(): RedeSocial[] { return load(KEYS.redes_sociais, SEED_REDES).sort((a, b) => a.ordem - b.ordem); }
export function getRedeSocial(id: string): RedeSocial | undefined { return getRedesSociais().find(r => r.id === id); }
export function createRedeSocial(data: Omit<RedeSocial, "id">): RedeSocial {
  const items = getRedesSociais();
  const novo: RedeSocial = { ...data, id: `rs-${uid()}` };
  items.push(novo);
  save(KEYS.redes_sociais, items);
  return novo;
}
export function updateRedeSocial(id: string, data: Partial<RedeSocial>) {
  const items = getRedesSociais();
  const idx = items.findIndex(r => r.id === id);
  if (idx !== -1) { items[idx] = { ...items[idx], ...data }; save(KEYS.redes_sociais, items); }
}
export function deleteRedeSocial(id: string) { save(KEYS.redes_sociais, getRedesSociais().filter(r => r.id !== id)); }

// ─── EDITORIAS ───

export function getEditorias(): Editoria[] { return load(KEYS.editorias, SEED_EDITORIAS).sort((a, b) => a.ordem - b.ordem); }
export function getEditoria(id: string): Editoria | undefined { return getEditorias().find(e => e.id === id); }
export function createEditoria(data: Omit<Editoria, "id">): Editoria {
  const items = getEditorias();
  const novo: Editoria = { ...data, id: `ed-${uid()}` };
  items.push(novo);
  save(KEYS.editorias, items);
  return novo;
}
export function updateEditoria(id: string, data: Partial<Editoria>) {
  const items = getEditorias();
  const idx = items.findIndex(e => e.id === id);
  if (idx !== -1) { items[idx] = { ...items[idx], ...data }; save(KEYS.editorias, items); }
}
export function deleteEditoria(id: string) { save(KEYS.editorias, getEditorias().filter(e => e.id !== id)); }

// ─── CONTEÚDOS ───

export function getConteudos(filters?: { status?: StatusConteudo; editoria_id?: string; funil?: Funil; is_publi?: boolean; rede_social_id?: string; search?: string }): Conteudo[] {
  let items = load(KEYS.conteudos, SEED_CONTEUDOS);
  if (filters?.status) items = items.filter(c => c.status === filters.status);
  if (filters?.editoria_id) items = items.filter(c => c.editoria_id === filters.editoria_id);
  if (filters?.funil) items = items.filter(c => c.funil === filters.funil);
  if (filters?.is_publi) items = items.filter(c => c.is_publi);
  if (filters?.rede_social_id) {
    const crs = getConteudoRedes();
    const ids = new Set(crs.filter(cr => cr.rede_social_id === filters.rede_social_id).map(cr => cr.conteudo_id));
    items = items.filter(c => ids.has(c.id));
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(c => c.titulo.toLowerCase().includes(q) || c.descricao.toLowerCase().includes(q));
  }
  return items;
}

export function getConteudo(id: string): Conteudo | undefined { return load<Conteudo>(KEYS.conteudos, SEED_CONTEUDOS).find(c => c.id === id); }

export function createConteudo(data: Partial<Conteudo> & { titulo: string }): Conteudo {
  const items = load<Conteudo>(KEYS.conteudos, SEED_CONTEUDOS);
  const novo: Conteudo = {
    id: `ct-${uid()}`, titulo: data.titulo, descricao: data.descricao || "",
    roteiro: data.roteiro || "", status: data.status || "caixa_de_ideias",
    data_planejada: data.data_planejada || null, data_publicacao: data.data_publicacao || null,
    editoria_id: data.editoria_id || null, funil: data.funil || null,
    is_publi: data.is_publi || false, parceiro_publi: data.parceiro_publi || null,
    emoji_marcador: data.emoji_marcador || null, notas: data.notas || "",
    ordem: data.ordem ?? items.length, created_at: now(), updated_at: now(),
  };
  items.unshift(novo);
  save(KEYS.conteudos, items);
  return novo;
}

export function updateConteudo(id: string, data: Partial<Conteudo>) {
  const items = load<Conteudo>(KEYS.conteudos, SEED_CONTEUDOS);
  const idx = items.findIndex(c => c.id === id);
  if (idx !== -1) { items[idx] = { ...items[idx], ...data, updated_at: now() }; save(KEYS.conteudos, items); }
}

export function deleteConteudo(id: string) {
  save(KEYS.conteudos, load<Conteudo>(KEYS.conteudos, SEED_CONTEUDOS).filter(c => c.id !== id));
  // Also delete related conteudo_redes
  save(KEYS.conteudo_redes, load<ConteudoRede>(KEYS.conteudo_redes, SEED_CONTEUDO_REDES).filter(cr => cr.conteudo_id !== id));
}

export function duplicateConteudo(id: string): Conteudo | undefined {
  const original = getConteudo(id);
  if (!original) return undefined;
  return createConteudo({ ...original, titulo: `${original.titulo} (cópia)`, status: "caixa_de_ideias", data_planejada: null, data_publicacao: null });
}

// ─── CONTEÚDO ↔ REDES ───

export function getConteudoRedes(conteudo_id?: string): ConteudoRede[] {
  const items = load(KEYS.conteudo_redes, SEED_CONTEUDO_REDES);
  return conteudo_id ? items.filter(cr => cr.conteudo_id === conteudo_id) : items;
}

export function addConteudoRede(conteudo_id: string, rede_social_id: string): ConteudoRede {
  const items = load<ConteudoRede>(KEYS.conteudo_redes, SEED_CONTEUDO_REDES);
  const novo: ConteudoRede = { id: `cr-${uid()}`, conteudo_id, rede_social_id, status_rede: "pendente", data_postagem: null, notas_adaptacao: "" };
  items.push(novo);
  save(KEYS.conteudo_redes, items);
  return novo;
}

export function updateConteudoRede(id: string, data: Partial<ConteudoRede>) {
  const items = load<ConteudoRede>(KEYS.conteudo_redes, SEED_CONTEUDO_REDES);
  const idx = items.findIndex(cr => cr.id === id);
  if (idx !== -1) { items[idx] = { ...items[idx], ...data }; save(KEYS.conteudo_redes, items); }
}

export function removeConteudoRede(id: string) {
  save(KEYS.conteudo_redes, load<ConteudoRede>(KEYS.conteudo_redes, SEED_CONTEUDO_REDES).filter(cr => cr.id !== id));
}

// ─── TAREFAS ───

export function getTarefas(filters?: { conteudo_id?: string; status?: StatusTarefa; data_prevista?: string }): Tarefa[] {
  let items = load(KEYS.tarefas, SEED_TAREFAS);
  if (filters?.conteudo_id) items = items.filter(t => t.conteudo_id === filters.conteudo_id);
  if (filters?.status) items = items.filter(t => t.status === filters.status);
  if (filters?.data_prevista) items = items.filter(t => t.data_prevista === filters.data_prevista);
  return items;
}

export function createTarefa(data: Partial<Tarefa> & { titulo: string }): Tarefa {
  const items = load<Tarefa>(KEYS.tarefas, SEED_TAREFAS);
  const novo: Tarefa = {
    id: `tk-${uid()}`, titulo: data.titulo, descricao: data.descricao || "",
    conteudo_id: data.conteudo_id || null, data_prevista: data.data_prevista || null,
    prioridade: data.prioridade || "normal", status: "pendente",
    created_at: now(), concluida_em: null,
  };
  items.push(novo);
  save(KEYS.tarefas, items);
  return novo;
}

export function updateTarefa(id: string, data: Partial<Tarefa>) {
  const items = load<Tarefa>(KEYS.tarefas, SEED_TAREFAS);
  const idx = items.findIndex(t => t.id === id);
  if (idx !== -1) {
    if (data.status === "concluida" && items[idx].status !== "concluida") data.concluida_em = now();
    items[idx] = { ...items[idx], ...data };
    save(KEYS.tarefas, items);
  }
}

export function deleteTarefa(id: string) { save(KEYS.tarefas, load<Tarefa>(KEYS.tarefas, SEED_TAREFAS).filter(t => t.id !== id)); }

// ─── METAS ───

export function getMetas(): Meta[] { return load(KEYS.metas, SEED_METAS); }

export function createMeta(data: Omit<Meta, "id" | "valor_atual">): Meta {
  const items = getMetas();
  const novo: Meta = { ...data, id: `mt-${uid()}`, valor_atual: 0 };
  items.push(novo);
  save(KEYS.metas, items);
  return novo;
}

export function updateMeta(id: string, data: Partial<Meta>) {
  const items = getMetas();
  const idx = items.findIndex(m => m.id === id);
  if (idx !== -1) { items[idx] = { ...items[idx], ...data }; save(KEYS.metas, items); }
}

export function deleteMeta(id: string) { save(KEYS.metas, getMetas().filter(m => m.id !== id)); }

export function calcularMetaAtual(meta: Meta): number {
  if (!meta.rede_social_id) return meta.valor_atual; // manual
  const agora = new Date();
  const crs = getConteudoRedes();
  const postados = crs.filter(cr => {
    if (cr.rede_social_id !== meta.rede_social_id || cr.status_rede !== "postado" || !cr.data_postagem) return false;
    const dp = new Date(cr.data_postagem);
    if (meta.tipo === "semanal") {
      const inicioSemana = new Date(agora); inicioSemana.setDate(agora.getDate() - agora.getDay() + 1); inicioSemana.setHours(0,0,0,0);
      return dp >= inicioSemana;
    }
    if (meta.tipo === "mensal") return dp.getMonth() === agora.getMonth() && dp.getFullYear() === agora.getFullYear();
    return true;
  });
  return postados.length;
}

// ─── RASCUNHOS RÁPIDOS ───

export function getRascunhos(): RascunhoRapido[] {
  return load(KEYS.rascunhos, SEED_RASCUNHOS).filter(r => !r.promovido).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function createRascunho(texto: string): RascunhoRapido {
  const items = load<RascunhoRapido>(KEYS.rascunhos, SEED_RASCUNHOS);
  const novo: RascunhoRapido = { id: `rsc-${uid()}`, texto, created_at: now(), promovido: false, conteudo_id: null };
  items.push(novo);
  save(KEYS.rascunhos, items);
  return novo;
}

export function updateRascunho(id: string, texto: string) {
  const items = load<RascunhoRapido>(KEYS.rascunhos, SEED_RASCUNHOS);
  const idx = items.findIndex(r => r.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], texto };
    save(KEYS.rascunhos, items);
  }
}

export function promoverRascunho(id: string): Conteudo | undefined {
  const items = load<RascunhoRapido>(KEYS.rascunhos, SEED_RASCUNHOS);
  const idx = items.findIndex(r => r.id === id);
  if (idx === -1) return undefined;
  const conteudo = createConteudo({ titulo: items[idx].texto.slice(0, 100), descricao: items[idx].texto });
  items[idx] = { ...items[idx], promovido: true, conteudo_id: conteudo.id };
  save(KEYS.rascunhos, items);
  return conteudo;
}

export function deleteRascunho(id: string) {
  save(KEYS.rascunhos, load<RascunhoRapido>(KEYS.rascunhos, SEED_RASCUNHOS).filter(r => r.id !== id));
}

// ─── STATS HELPERS ───

export function getStatusCounts(): Record<StatusConteudo, number> {
  const conteudos = getConteudos();
  const counts = {} as Record<StatusConteudo, number>;
  for (const s of PIPELINE_ORDER) counts[s] = 0;
  counts.arquivado = 0;
  for (const c of conteudos) counts[c.status] = (counts[c.status] || 0) + 1;
  return counts;
}

export function getTarefasHoje(): Tarefa[] {
  const hoje = new Date().toISOString().slice(0, 10);
  return getTarefas().filter(t => t.data_prevista === hoje && t.status !== "concluida");
}

export function getTarefasAtrasadas(): Tarefa[] {
  const hoje = new Date().toISOString().slice(0, 10);
  return getTarefas().filter(t => t.data_prevista && t.data_prevista < hoje && t.status !== "concluida");
}

export function getConteudosProximos7Dias(): Conteudo[] {
  const hoje = new Date();
  const em7 = new Date(hoje);
  em7.setDate(em7.getDate() + 7);
  const h = hoje.toISOString().slice(0, 10);
  const f = em7.toISOString().slice(0, 10);
  return getConteudos().filter(c => c.data_planejada && c.data_planejada >= h && c.data_planejada <= f).sort((a, b) => a.data_planejada!.localeCompare(b.data_planejada!));
}

// ─── EXPORT/IMPORT ───

export function exportAllData(): string {
  return JSON.stringify({
    conteudos: load(KEYS.conteudos, SEED_CONTEUDOS),
    conteudo_redes: load(KEYS.conteudo_redes, SEED_CONTEUDO_REDES),
    redes_sociais: load(KEYS.redes_sociais, SEED_REDES),
    editorias: load(KEYS.editorias, SEED_EDITORIAS),
    tarefas: load(KEYS.tarefas, SEED_TAREFAS),
    metas: load(KEYS.metas, SEED_METAS),
    rascunhos: load(KEYS.rascunhos, SEED_RASCUNHOS),
  }, null, 2);
}

export function clearAllData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}
