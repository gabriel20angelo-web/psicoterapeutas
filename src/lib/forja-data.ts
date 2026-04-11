// ═══════════════════════════════════════════════════
// FORJA — Pomodoro & Productivity System
// Data Layer (localStorage com fallback mock)
// ═══════════════════════════════════════════════════

// ─── TYPES ───

export type Prioridade = "alta" | "media" | "baixa" | "nenhuma";
export type StatusTarefa = "pendente" | "concluida";
export type TipoSessao = "pomodoro" | "cronometro";

export interface Pasta {
  id: string;
  nome: string;
  cor: string; // hex
  icone: string; // emoji or lucide name
  ordem: number;
  created_at: string;
}

export interface Projeto {
  id: string;
  pasta_id: string;
  nome: string;
  cor: string;
  icone: string;
  ordem: number;
  arquivado: boolean;
  created_at: string;
}

export interface Recorrencia {
  tipo: "diaria" | "semanal" | "mensal";
  intervalo: number; // every N days/weeks/months
  dias_semana?: number[]; // 0-6, for semanal
}

export interface Atividade {
  id: string;
  projeto_id: string | null;
  atividade_pai_id: string | null; // for sub-steps/etapas
  titulo: string;
  descricao: string;
  notas: string;
  prioridade: Prioridade;
  data_limite: string | null; // YYYY-MM-DD
  lembrete: string | null; // ISO datetime
  recorrencia: Recorrencia | null;
  pomodoros_estimados: number;
  pomodoros_realizados: number;
  tempo_total_seg: number;
  status: StatusTarefa;
  concluida_em: string | null;
  etiqueta_ids: string[]; // tag IDs
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface Etiqueta {
  id: string;
  nome: string;
  cor: string;
}

export interface SessaoFoco {
  id: string;
  atividade_id: string | null;
  tipo: TipoSessao;
  duracao_config_seg: number;
  duracao_real_seg: number;
  completa: boolean;
  iniciada_em: string;
  finalizada_em: string;
}

export interface ConfigTimer {
  duracao_pomodoro: number; // seconds, default 1500 (25min)
  duracao_pausa: number; // seconds, default 300 (5min)
  duracao_pausa_longa: number; // seconds, default 900 (15min)
  pomodoros_ate_pausa_longa: number; // default 4
  auto_iniciar_pomodoro: boolean;
  auto_iniciar_pausa: boolean;
  som_alarme: string;
  som_ambiente: string | null;
  volume_alarme: number;
  volume_ambiente: number;
}

export interface MetaDiaria {
  minutos: number;
}

// Backward-compatible aliases
export type Tarefa = Atividade;
export type Tag = Etiqueta;

// ─── CONSTANTS ───

export const PRIORIDADE_CONFIG: Record<Prioridade, { label: string; cor: string; bg: string; icon: string }> = {
  alta:    { label: "Alta",            cor: "#EF4444", bg: "rgba(239,68,68,.1)",  icon: "arrow-up" },
  media:   { label: "Média",           cor: "#F59E0B", bg: "rgba(245,158,11,.1)", icon: "minus" },
  baixa:   { label: "Baixa",           cor: "#3B82F6", bg: "rgba(59,130,246,.1)", icon: "arrow-down" },
  nenhuma: { label: "Sem prioridade",  cor: "#6B7280", bg: "rgba(107,114,128,.1)", icon: "" },
};

export const CORES_PALETA: string[] = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16",
  "#22C55E", "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9",
  "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#D946EF",
  "#EC4899", "#F43F5E", "#78716C", "#64748B", "#1E293B",
];

export const SONS_ALARME: { id: string; nome: string }[] = [
  { id: "sino",       nome: "Sino" },
  { id: "cronometro", nome: "Cronômetro" },
  { id: "digital",    nome: "Digital" },
  { id: "suave",      nome: "Suave" },
];

export const SONS_AMBIENTE: { id: string; nome: string }[] = [
  { id: "chuva",         nome: "Chuva" },
  { id: "lareira",       nome: "Lareira" },
  { id: "ondas",         nome: "Ondas" },
  { id: "floresta",      nome: "Floresta" },
  { id: "ruido_branco",  nome: "Ruído Branco" },
  { id: "ruido_marrom",  nome: "Ruído Marrom" },
  { id: "cafe",          nome: "Café" },
];

// ─── STORAGE KEYS ───

const KEYS = {
  pastas:       "forja-pastas",
  projetos:     "forja-projetos",
  atividades:   "forja-atividades",
  etiquetas:    "forja-etiquetas",
  sessoes:      "forja-sessoes",
  config_timer: "forja-config-timer",
  meta_diaria:  "forja-meta-diaria",
};

// ─── GENERIC STORAGE HELPERS ───

function load<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : seed;
  } catch { return seed; }
}

function loadSingle<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : seed;
  } catch { return seed; }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function uid(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
export function now(): string { return new Date().toISOString(); }

// ─── DATE HELPERS ───

export function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function amanha(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function fimDeSemana(): string {
  const d = new Date();
  const dia = d.getDay();
  const diff = dia === 0 ? 0 : 7 - dia;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function inicioSemana(): string {
  const d = new Date();
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function formatTempo(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  if (h > 0) return `${h}h ${m}min`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

// ─── SEED DATA ───

const SEED_PASTAS: Pasta[] = [];

const SEED_PROJETOS: Projeto[] = [];

const SEED_ETIQUETAS: Etiqueta[] = [];

const SEED_ATIVIDADES: Atividade[] = [];

const SEED_SESSOES: SessaoFoco[] = [];

const DEFAULT_CONFIG_TIMER: ConfigTimer = {
  duracao_pomodoro: 1500,
  duracao_pausa: 300,
  duracao_pausa_longa: 900,
  pomodoros_ate_pausa_longa: 4,
  auto_iniciar_pomodoro: false,
  auto_iniciar_pausa: false,
  som_alarme: "sino",
  som_ambiente: null,
  volume_alarme: 0.7,
  volume_ambiente: 0.3,
};

const DEFAULT_META_DIARIA: MetaDiaria = { minutos: 120 };

// ─── PASTAS ───

export function getPastas(): Pasta[] {
  return load(KEYS.pastas, SEED_PASTAS).sort((a, b) => a.ordem - b.ordem);
}

export function createPasta(data: Omit<Pasta, "id" | "created_at">): Pasta {
  const items = getPastas();
  const novo: Pasta = { ...data, id: `pa-${uid()}`, created_at: now() };
  items.push(novo);
  save(KEYS.pastas, items);
  return novo;
}

export function updatePasta(id: string, data: Partial<Pasta>) {
  const items = getPastas();
  const idx = items.findIndex(p => p.id === id);
  if (idx !== -1) { items[idx] = { ...items[idx], ...data }; save(KEYS.pastas, items); }
}

export function deletePasta(id: string) {
  save(KEYS.pastas, getPastas().filter(p => p.id !== id));
  // Cascade: delete projetos and their atividades
  const projetos = getProjetos().filter(p => p.pasta_id === id);
  for (const proj of projetos) {
    deleteProjeto(proj.id);
  }
}

// ─── PROJETOS ───

export function getProjetos(): Projeto[] {
  return load(KEYS.projetos, SEED_PROJETOS).sort((a, b) => a.ordem - b.ordem);
}

export function getProjeto(id: string): Projeto | undefined {
  return getProjetos().find(p => p.id === id);
}

export function getProjetosByPasta(pasta_id: string): Projeto[] {
  return getProjetos().filter(p => p.pasta_id === pasta_id);
}

export function createProjeto(data: Omit<Projeto, "id" | "created_at">): Projeto {
  const items = getProjetos();
  const novo: Projeto = { ...data, id: `pj-${uid()}`, created_at: now() };
  items.push(novo);
  save(KEYS.projetos, items);
  return novo;
}

export function updateProjeto(id: string, data: Partial<Projeto>) {
  const items = getProjetos();
  const idx = items.findIndex(p => p.id === id);
  if (idx !== -1) { items[idx] = { ...items[idx], ...data }; save(KEYS.projetos, items); }
}

export function deleteProjeto(id: string) {
  save(KEYS.projetos, getProjetos().filter(p => p.id !== id));
  // Cascade: delete atividades of this project
  const atividades = load<Atividade>(KEYS.atividades, SEED_ATIVIDADES);
  save(KEYS.atividades, atividades.filter(a => a.projeto_id !== id));
}

// ─── ATIVIDADES ───

export function getAtividades(filters?: {
  projeto_id?: string;
  status?: StatusTarefa;
  data_limite?: string;
  search?: string;
  etiqueta_id?: string;
}): Atividade[] {
  let items = load<Atividade>(KEYS.atividades, SEED_ATIVIDADES);
  if (filters?.projeto_id) items = items.filter(a => a.projeto_id === filters.projeto_id);
  if (filters?.status) items = items.filter(a => a.status === filters.status);
  if (filters?.data_limite) items = items.filter(a => a.data_limite === filters.data_limite);
  if (filters?.etiqueta_id) items = items.filter(a => a.etiqueta_ids.includes(filters.etiqueta_id!));
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(a =>
      a.titulo.toLowerCase().includes(q) ||
      a.descricao.toLowerCase().includes(q) ||
      a.notas.toLowerCase().includes(q)
    );
  }
  return items;
}

export function getAtividade(id: string): Atividade | undefined {
  return load<Atividade>(KEYS.atividades, SEED_ATIVIDADES).find(a => a.id === id);
}

export function createAtividade(data: Partial<Atividade> & { titulo: string }): Atividade {
  const items = load<Atividade>(KEYS.atividades, SEED_ATIVIDADES);
  const novo: Atividade = {
    id: `at-${uid()}`,
    titulo: data.titulo,
    projeto_id: data.projeto_id ?? null,
    atividade_pai_id: data.atividade_pai_id ?? null,
    descricao: data.descricao ?? "",
    notas: data.notas ?? "",
    prioridade: data.prioridade ?? "nenhuma",
    data_limite: data.data_limite ?? null,
    lembrete: data.lembrete ?? null,
    recorrencia: data.recorrencia ?? null,
    pomodoros_estimados: data.pomodoros_estimados ?? 0,
    pomodoros_realizados: data.pomodoros_realizados ?? 0,
    tempo_total_seg: data.tempo_total_seg ?? 0,
    status: "pendente",
    concluida_em: null,
    etiqueta_ids: data.etiqueta_ids ?? [],
    ordem: data.ordem ?? items.length,
    created_at: now(),
    updated_at: now(),
  };
  items.push(novo);
  save(KEYS.atividades, items);
  return novo;
}

export function updateAtividade(id: string, data: Partial<Atividade>) {
  const items = load<Atividade>(KEYS.atividades, SEED_ATIVIDADES);
  const idx = items.findIndex(a => a.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data, updated_at: now() };
    save(KEYS.atividades, items);
  }
}

export function deleteAtividade(id: string) {
  const items = load<Atividade>(KEYS.atividades, SEED_ATIVIDADES);
  // Collect IDs to delete (cascade sub-atividades recursively)
  const idsToDelete = new Set<string>([id]);
  let found = true;
  while (found) {
    found = false;
    for (const a of items) {
      if (a.atividade_pai_id && idsToDelete.has(a.atividade_pai_id) && !idsToDelete.has(a.id)) {
        idsToDelete.add(a.id);
        found = true;
      }
    }
  }
  save(KEYS.atividades, items.filter(a => !idsToDelete.has(a.id)));
}

export function getSubAtividades(atividade_pai_id: string): Atividade[] {
  return load<Atividade>(KEYS.atividades, SEED_ATIVIDADES)
    .filter(a => a.atividade_pai_id === atividade_pai_id)
    .sort((a, b) => a.ordem - b.ordem);
}

export function getAtividadesHoje(): Atividade[] {
  const h = hoje();
  return load<Atividade>(KEYS.atividades, SEED_ATIVIDADES).filter(a =>
    a.status === "pendente" && a.data_limite !== null && a.data_limite <= h
  );
}

export function getAtividadesAmanha(): Atividade[] {
  const a = amanha();
  return load<Atividade>(KEYS.atividades, SEED_ATIVIDADES).filter(at =>
    at.status === "pendente" && at.data_limite === a
  );
}

export function getAtividadesSemana(): Atividade[] {
  const h = hoje();
  const fs = fimDeSemana();
  return load<Atividade>(KEYS.atividades, SEED_ATIVIDADES).filter(a =>
    a.status === "pendente" && a.data_limite !== null && a.data_limite >= h && a.data_limite <= fs
  );
}

export function getAtividadesPlanejadas(): Atividade[] {
  const fs = fimDeSemana();
  return load<Atividade>(KEYS.atividades, SEED_ATIVIDADES).filter(a =>
    a.status === "pendente" && a.data_limite !== null && a.data_limite > fs
  );
}

export function getAtividadesAlgumDia(): Atividade[] {
  return load<Atividade>(KEYS.atividades, SEED_ATIVIDADES).filter(a =>
    a.status === "pendente" && a.data_limite === null
  );
}

export function getAtividadesAtrasadas(): Atividade[] {
  const h = hoje();
  return load<Atividade>(KEYS.atividades, SEED_ATIVIDADES).filter(a =>
    a.status === "pendente" && a.data_limite !== null && a.data_limite < h
  );
}

export function getAtividadesConcluidas(): Atividade[] {
  return load<Atividade>(KEYS.atividades, SEED_ATIVIDADES).filter(a => a.status === "concluida");
}

function criarProximaRecorrencia(atividade: Atividade): void {
  if (!atividade.recorrencia || !atividade.data_limite) return;

  const rec = atividade.recorrencia;
  const dataAtual = new Date(atividade.data_limite + "T00:00:00");
  let proximaData: Date;

  switch (rec.tipo) {
    case "diaria":
      proximaData = new Date(dataAtual);
      proximaData.setDate(proximaData.getDate() + rec.intervalo);
      break;
    case "semanal":
      proximaData = new Date(dataAtual);
      proximaData.setDate(proximaData.getDate() + (rec.intervalo * 7));
      break;
    case "mensal":
      proximaData = new Date(dataAtual);
      proximaData.setMonth(proximaData.getMonth() + rec.intervalo);
      break;
    default:
      return;
  }

  createAtividade({
    titulo: atividade.titulo,
    projeto_id: atividade.projeto_id,
    atividade_pai_id: atividade.atividade_pai_id,
    descricao: atividade.descricao,
    notas: atividade.notas,
    prioridade: atividade.prioridade,
    data_limite: proximaData.toISOString().slice(0, 10),
    lembrete: atividade.lembrete,
    recorrencia: atividade.recorrencia,
    pomodoros_estimados: atividade.pomodoros_estimados,
    etiqueta_ids: [...atividade.etiqueta_ids],
    ordem: atividade.ordem,
  });
}

export function completarAtividade(id: string) {
  const items = load<Atividade>(KEYS.atividades, SEED_ATIVIDADES);
  const idx = items.findIndex(a => a.id === id);
  if (idx !== -1) {
    items[idx].status = "concluida";
    items[idx].concluida_em = now();
    items[idx].updated_at = now();
    save(KEYS.atividades, items);

    // If recurring, create next instance
    if (items[idx].recorrencia) {
      criarProximaRecorrencia(items[idx]);
    }
  }
}

export function reabrirAtividade(id: string) {
  const items = load<Atividade>(KEYS.atividades, SEED_ATIVIDADES);
  const idx = items.findIndex(a => a.id === id);
  if (idx !== -1) {
    items[idx].status = "pendente";
    items[idx].concluida_em = null;
    items[idx].updated_at = now();
    save(KEYS.atividades, items);
  }
}

// ─── ETIQUETAS ───

export function getEtiquetas(): Etiqueta[] {
  return load(KEYS.etiquetas, SEED_ETIQUETAS);
}

export function createEtiqueta(data: Omit<Etiqueta, "id">): Etiqueta {
  const items = getEtiquetas();
  const novo: Etiqueta = { ...data, id: `et-${uid()}` };
  items.push(novo);
  save(KEYS.etiquetas, items);
  return novo;
}

export function updateEtiqueta(id: string, data: Partial<Etiqueta>) {
  const items = getEtiquetas();
  const idx = items.findIndex(e => e.id === id);
  if (idx !== -1) { items[idx] = { ...items[idx], ...data }; save(KEYS.etiquetas, items); }
}

export function deleteEtiqueta(id: string) {
  save(KEYS.etiquetas, getEtiquetas().filter(e => e.id !== id));
  // Remove etiqueta from all atividades that reference it
  const atividades = load<Atividade>(KEYS.atividades, SEED_ATIVIDADES);
  let changed = false;
  for (const a of atividades) {
    const idx = a.etiqueta_ids.indexOf(id);
    if (idx !== -1) {
      a.etiqueta_ids.splice(idx, 1);
      changed = true;
    }
  }
  if (changed) save(KEYS.atividades, atividades);
}

// ─── SESSÕES DE FOCO ───

export function getSessoes(filters?: { data?: string; atividade_id?: string }): SessaoFoco[] {
  let items = load(KEYS.sessoes, SEED_SESSOES);
  if (filters?.data) {
    items = items.filter(s => s.iniciada_em.slice(0, 10) === filters.data);
  }
  if (filters?.atividade_id) {
    items = items.filter(s => s.atividade_id === filters.atividade_id);
  }
  return items;
}

export function getSessoesHoje(): SessaoFoco[] {
  return getSessoes({ data: hoje() });
}

export function createSessao(data: Omit<SessaoFoco, "id">): SessaoFoco {
  const items = load<SessaoFoco>(KEYS.sessoes, SEED_SESSOES);
  const novo: SessaoFoco = { ...data, id: `sf-${uid()}` };
  items.push(novo);
  save(KEYS.sessoes, items);

  // Auto-increment atividade pomodoros/tempo if linked
  if (data.atividade_id) {
    const atividades = load<Atividade>(KEYS.atividades, SEED_ATIVIDADES);
    const idx = atividades.findIndex(a => a.id === data.atividade_id);
    if (idx !== -1) {
      atividades[idx].tempo_total_seg += data.duracao_real_seg;
      if (data.completa && data.tipo === "pomodoro") {
        atividades[idx].pomodoros_realizados += 1;
      }
      atividades[idx].updated_at = now();
      save(KEYS.atividades, atividades);
    }
  }

  return novo;
}

export function getTempoFocadoHoje(): number {
  return getSessoesHoje().reduce((sum, s) => sum + s.duracao_real_seg, 0);
}

export function getTempoFocadoPeriodo(inicio: string, fim: string): number {
  return load<SessaoFoco>(KEYS.sessoes, SEED_SESSOES)
    .filter(s => s.iniciada_em.slice(0, 10) >= inicio && s.iniciada_em.slice(0, 10) <= fim)
    .reduce((sum, s) => sum + s.duracao_real_seg, 0);
}

export function getPomodorosHoje(): number {
  return getSessoesHoje().filter(s => s.tipo === "pomodoro" && s.completa).length;
}

// ─── STATS ───

export function getEstatisticas(periodo: "hoje" | "semana" | "mes" | "ano"): {
  tempoTotal: number;
  diasComFoco: number;
  mediaDiaria: number;
  pomodorosCompletos: number;
  atividadesConcluidas: number;
  streak: number;
  tempoHoje: number;
  tempoSemana: number;
} {
  const agora = new Date();
  let inicio: string;

  switch (periodo) {
    case "hoje":
      inicio = hoje();
      break;
    case "semana":
      inicio = inicioSemana();
      break;
    case "mes": {
      const m = new Date(agora.getFullYear(), agora.getMonth(), 1);
      inicio = m.toISOString().slice(0, 10);
      break;
    }
    case "ano": {
      const a = new Date(agora.getFullYear(), 0, 1);
      inicio = a.toISOString().slice(0, 10);
      break;
    }
  }

  const fim = hoje();
  const sessoes = load<SessaoFoco>(KEYS.sessoes, SEED_SESSOES)
    .filter(s => s.iniciada_em.slice(0, 10) >= inicio && s.iniciada_em.slice(0, 10) <= fim);

  const tempoTotal = sessoes.reduce((sum, s) => sum + s.duracao_real_seg, 0);
  const diasSet = new Set(sessoes.map(s => s.iniciada_em.slice(0, 10)));
  const diasComFoco = diasSet.size;
  const mediaDiaria = diasComFoco > 0 ? Math.round(tempoTotal / diasComFoco) : 0;
  const pomodorosCompletos = sessoes.filter(s => s.tipo === "pomodoro" && s.completa).length;

  // Atividades concluídas no período
  const atividades = load<Atividade>(KEYS.atividades, SEED_ATIVIDADES);
  const atividadesConcluidas = atividades.filter(a =>
    a.status === "concluida" && a.concluida_em && a.concluida_em.slice(0, 10) >= inicio && a.concluida_em.slice(0, 10) <= fim
  ).length;

  // Streak: consecutive days with focus sessions ending today
  const allSessoes = load<SessaoFoco>(KEYS.sessoes, SEED_SESSOES);
  const allDias = new Set(allSessoes.map(s => s.iniciada_em.slice(0, 10)));
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = d.toISOString().slice(0, 10);
    if (allDias.has(ds)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  // tempoHoje and tempoSemana always computed
  const tempoHoje = getTempoFocadoHoje();
  const tempoSemana = getTempoFocadoPeriodo(inicioSemana(), hoje());

  return { tempoTotal, diasComFoco, mediaDiaria, pomodorosCompletos, atividadesConcluidas, streak, tempoHoje, tempoSemana };
}

export function getAtividadesConcluidasHoje(): number {
  const h = hoje();
  return load<Atividade>(KEYS.atividades, SEED_ATIVIDADES).filter(a =>
    a.status === "concluida" && a.concluida_em && a.concluida_em.slice(0, 10) === h
  ).length;
}

export function getAtividadesConcluidasSemana(): number {
  const is = inicioSemana();
  const fs = fimDeSemana();
  return load<Atividade>(KEYS.atividades, SEED_ATIVIDADES).filter(a =>
    a.status === "concluida" && a.concluida_em &&
    a.concluida_em.slice(0, 10) >= is && a.concluida_em.slice(0, 10) <= fs
  ).length;
}

export function getDadosDiarios(dias: number): { data: string; minutos: number }[] {
  const sessoes = load<SessaoFoco>(KEYS.sessoes, SEED_SESSOES);
  const resultado: { data: string; minutos: number }[] = [];
  const d = new Date();

  for (let i = dias - 1; i >= 0; i--) {
    const ref = new Date(d);
    ref.setDate(ref.getDate() - i);
    const ds = ref.toISOString().slice(0, 10);
    const totalSeg = sessoes
      .filter(s => s.iniciada_em.slice(0, 10) === ds)
      .reduce((sum, s) => sum + s.duracao_real_seg, 0);
    resultado.push({ data: ds, minutos: Math.round(totalSeg / 60) });
  }

  return resultado;
}

export function getComunidadeStats(): { mediaGlobal: number; topUsuarios: { nome: string; minutos: number }[] } {
  return {
    mediaGlobal: 0,
    topUsuarios: [],
  };
}

// ─── CONFIG ───

export function getConfigTimer(): ConfigTimer {
  return loadSingle<ConfigTimer>(KEYS.config_timer, DEFAULT_CONFIG_TIMER);
}

export function updateConfigTimer(data: Partial<ConfigTimer>) {
  const current = getConfigTimer();
  save(KEYS.config_timer, { ...current, ...data });
}

export function getMetaDiaria(): number {
  return loadSingle<MetaDiaria>(KEYS.meta_diaria, DEFAULT_META_DIARIA).minutos;
}

export function setMetaDiaria(min: number) {
  save(KEYS.meta_diaria, { minutos: min });
}

// ─── EXPORT/IMPORT ───

export function exportAllForjaData(): string {
  return JSON.stringify({
    pastas: load(KEYS.pastas, SEED_PASTAS),
    projetos: load(KEYS.projetos, SEED_PROJETOS),
    atividades: load(KEYS.atividades, SEED_ATIVIDADES),
    etiquetas: load(KEYS.etiquetas, SEED_ETIQUETAS),
    sessoes: load(KEYS.sessoes, SEED_SESSOES),
    config_timer: getConfigTimer(),
    meta_diaria: getMetaDiaria(),
  }, null, 2);
}

export function clearAllForjaData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}

// ─── BACKWARD-COMPATIBLE ALIASES ───

export const getTarefas = getAtividades;
export const getTarefa = getAtividade;
export const createTarefa = createAtividade;
export const updateTarefa = updateAtividade;
export const deleteTarefa = deleteAtividade;
export const getSubtarefas = getSubAtividades;
export const getTarefasHoje = getAtividadesHoje;
export const getTarefasAmanha = getAtividadesAmanha;
export const getTarefasSemana = getAtividadesSemana;
export const getTarefasPlanejadas = getAtividadesPlanejadas;
export const getTarefasAlgumDia = getAtividadesAlgumDia;
export const getTarefasAtrasadas = getAtividadesAtrasadas;
export const getTarefasConcluidas = getAtividadesConcluidas;
export const completarTarefa = completarAtividade;
export const reabrirTarefa = reabrirAtividade;
export const getTags = getEtiquetas;
export const createTag = createEtiqueta;
export const deleteTag = deleteEtiqueta;

// Alias: getTagsDaTarefa — returns etiquetas linked to an atividade
export function getTagsDaTarefa(atividadeId: string): Etiqueta[] {
  const atividade = getAtividade(atividadeId);
  if (!atividade || !atividade.etiqueta_ids || atividade.etiqueta_ids.length === 0) return [];
  const allEtiquetas = getEtiquetas();
  return allEtiquetas.filter(e => atividade.etiqueta_ids.includes(e.id));
}

// Alias: getDiasComFoco — returns Set of date strings that had focus sessions
export function getDiasComFoco(): Set<string> {
  const sessoes = load<SessaoFoco>(KEYS.sessoes, SEED_SESSOES);
  return new Set(sessoes.map(s => s.iniciada_em.slice(0, 10)));
}

// ═══════════════════════════════════════════════════
// INTEGRAÇÃO USINA → FORJA
// Traz tarefas e conteúdos da Usina como pastas/projetos/atividades virtuais
// ═══════════════════════════════════════════════════

import {
  getTarefas as getUsinaTarefas,
  getConteudos as getUsinaConteudos,
  getEditorias as getUsinaEditorias,
  updateTarefa as updateUsinaTarefa,
  type Tarefa as UsinaTarefa,
  type Conteudo as UsinaConteudo,
  type Editoria as UsinaEditoria,
} from "./usina-data";

import {
  getDisciplinasCursando as getAcDisciplinas,
  getTarefas as getAcTarefas,
  getConteudos as getAcConteudos,
  updateTarefa as updateAcTarefa,
  updateConteudo as updateAcConteudo,
} from "./academico-data";

// Pasta virtual da Usina
export const USINA_PASTA: Pasta = {
  id: "usina-pasta",
  nome: "Usina (Conteúdo)",
  cor: "#F59E0B",
  icone: "sparkles",
  ordem: 999,
  created_at: "2026-01-01T00:00:00Z",
};

// Converte editorias da Usina em projetos do Forja
export function getProjetosUsina(): Projeto[] {
  const editorias = getUsinaEditorias();
  const projetos: Projeto[] = [
    // Projeto genérico para tarefas sem editoria
    { id: "usina-geral", pasta_id: "usina-pasta", nome: "Tarefas Gerais", cor: "#F59E0B", icone: "clipboard-list", ordem: 0, arquivado: false, created_at: "2026-01-01T00:00:00Z" },
  ];
  editorias.forEach((ed, i) => {
    projetos.push({
      id: `usina-ed-${ed.id}`,
      pasta_id: "usina-pasta",
      nome: ed.nome,
      cor: ed.cor,
      icone: "folder",
      ordem: i + 1,
      arquivado: false,
      created_at: "2026-01-01T00:00:00Z",
    });
  });
  // Projeto para conteúdos em produção
  projetos.push({
    id: "usina-conteudos",
    pasta_id: "usina-pasta",
    nome: "Conteúdos em Produção",
    cor: "#8B5CF6",
    icone: "clapperboard",
    ordem: 100,
    arquivado: false,
    created_at: "2026-01-01T00:00:00Z",
  });
  return projetos;
}

// Converte tarefas da Usina em atividades do Forja
export function getAtividadesUsina(): Atividade[] {
  const usinaTarefas = getUsinaTarefas();
  const usinaConteudos = getUsinaConteudos().filter(c =>
    !["postado", "arquivado"].includes(c.status)
  );

  const atividades: Atividade[] = [];
  const ts = now();

  // Converter tarefas da Usina
  usinaTarefas.forEach((ut, i) => {
    const conteudo = ut.conteudo_id
      ? getUsinaConteudos().find(c => c.id === ut.conteudo_id)
      : null;
    const editoriaId = conteudo?.editoria_id;

    atividades.push({
      id: `usina-t-${ut.id}`,
      projeto_id: editoriaId ? `usina-ed-${editoriaId}` : "usina-geral",
      atividade_pai_id: null,
      titulo: ut.titulo,
      descricao: ut.descricao || (conteudo ? `Conteúdo: ${conteudo.titulo}` : ""),
      notas: "",
      prioridade: ut.prioridade === "urgente" ? "alta" : ut.prioridade === "importante" ? "media" : "baixa",
      data_limite: ut.data_prevista,
      lembrete: null,
      recorrencia: null,
      pomodoros_estimados: 0,
      pomodoros_realizados: 0,
      tempo_total_seg: 0,
      status: ut.status === "concluida" ? "concluida" : "pendente",
      concluida_em: ut.concluida_em,
      etiqueta_ids: [],
      ordem: i,
      created_at: ut.created_at,
      updated_at: ut.created_at,
    });
  });

  // Converter conteúdos em produção como atividades
  usinaConteudos.forEach((uc, i) => {
    atividades.push({
      id: `usina-c-${uc.id}`,
      projeto_id: "usina-conteudos",
      atividade_pai_id: null,
      titulo: `${uc.emoji_marcador || "📝"} ${uc.titulo}`,
      descricao: uc.descricao || "",
      notas: "",
      prioridade: uc.data_planejada ? "media" : "baixa",
      data_limite: uc.data_planejada,
      lembrete: null,
      recorrencia: null,
      pomodoros_estimados: 0,
      pomodoros_realizados: 0,
      tempo_total_seg: 0,
      status: "pendente",
      concluida_em: null,
      etiqueta_ids: [],
      ordem: i,
      created_at: uc.created_at,
      updated_at: uc.created_at,
    });
  });

  return atividades;
}

// Backward-compatible alias
export const getTarefasUsina = getAtividadesUsina;

// Combina pastas nativas + pasta Usina
export function getTodasPastas(): Pasta[] {
  return [...getPastas(), USINA_PASTA, ACADEMICO_PASTA];
}

// Combina projetos nativos + projetos Usina
export function getTodosProjetos(): Projeto[] {
  return [...getProjetos(), ...getProjetosUsina(), ...getProjetosAcademico()];
}

// Combina atividades nativas + atividades Usina
export function getTodasAtividades(): Atividade[] {
  return [...getAtividades(), ...getAtividadesUsina(), ...getAtividadesAcademico()];
}

// Backward-compatible alias
export const getTodasTarefas = getTodasAtividades;

// Filtra todas as atividades (nativas + Usina) para hoje
export function getTodasAtividadesHoje(): Atividade[] {
  const h = hoje();
  return getTodasAtividades().filter(a => {
    if (a.status === "concluida") return false;
    if (a.data_limite === h) return true;
    if (a.data_limite && a.data_limite < h) return true; // atrasadas
    return false;
  });
}

// Backward-compatible alias
export const getTodasTarefasHoje = getTodasAtividadesHoje;

// Verifica se atividade é da Usina
export function isUsinaAtividade(id: string): boolean {
  return id.startsWith("usina-t-") || id.startsWith("usina-c-");
}

// Backward-compatible alias
export const isUsinaTarefa = isUsinaAtividade;

// Completa atividade (nativa ou Usina)
export function completarAtividadeUnificada(id: string) {
  if (id.startsWith("usina-t-")) {
    const realId = id.replace("usina-t-", "");
    updateUsinaTarefa(realId, { status: "concluida", concluida_em: now() } as any);
  } else if (id.startsWith("academico-t-")) {
    const realId = id.replace("academico-t-", "");
    updateAcTarefa(realId, { status: "concluida" as any });
  } else if (id.startsWith("academico-co-")) {
    const realId = id.replace("academico-co-", "");
    updateAcConteudo(realId, { status_estudo: "dominado" as any });
  } else {
    completarAtividade(id);
  }
}

// Backward-compatible alias
export const completarTarefaUnificada = completarAtividadeUnificada;

// ═══════════════════════════════════════════════════
// INTEGRAÇÃO ACADÊMICO → FORJA
// Traz disciplinas e tarefas acadêmicas como pastas/projetos/atividades virtuais
// ═══════════════════════════════════════════════════

// (imports moved to Usina import block above)

// Pasta virtual do Acadêmico
export const ACADEMICO_PASTA: Pasta = {
  id: "academico-pasta",
  nome: "Acadêmico",
  cor: "#10b981",
  icone: "graduation-cap",
  ordem: 998,
  created_at: "2026-01-01T00:00:00Z",
};

// Converte disciplinas cursando em projetos do Forja
export function getProjetosAcademico(): Projeto[] {
  const disciplinas = getAcDisciplinas();
  return disciplinas.map((d, i) => ({
    id: `academico-di-${d.id}`,
    pasta_id: "academico-pasta",
    nome: d.nome,
    cor: "#10b981",
    icone: "book-open",
    ordem: i,
    arquivado: false,
    created_at: d.created_at,
  }));
}

// Converte tarefas acadêmicas em atividades do Forja
export function getAtividadesAcademico(): Atividade[] {
  const tarefas = getAcTarefas();
  const conteudos = getAcConteudos().filter(c => c.status_estudo !== "dominado");
  const TIPO_LABEL: Record<string, string> = { prova: "Prova", trabalho: "Trabalho", licao: "Lição", apresentacao: "Apresentação", seminario: "Seminário", outro: "Outro" };
  const STATUS_LABEL: Record<string, string> = { nao_estudado: "Não estudado", em_revisao: "Em revisão", dominado: "Dominado" };

  const tarefaAtividades: Atividade[] = tarefas.map((t, i) => ({
    id: `academico-t-${t.id}`,
    projeto_id: `academico-di-${t.disciplina_id}`,
    atividade_pai_id: null,
    titulo: `${TIPO_LABEL[t.tipo] || t.tipo}: ${t.titulo}`,
    descricao: t.observacoes || "",
    notas: "",
    prioridade: t.tipo === "prova" ? "alta" as const : t.tipo === "trabalho" ? "media" as const : "baixa" as const,
    data_limite: t.data_entrega || null,
    lembrete: null,
    recorrencia: null,
    pomodoros_estimados: t.tipo === "prova" ? 4 : 2,
    pomodoros_realizados: 0,
    tempo_total_seg: 0,
    status: t.status === "concluida" ? "concluida" as const : "pendente" as const,
    concluida_em: t.status === "concluida" ? t.updated_at : null,
    etiqueta_ids: [],
    ordem: i,
    created_at: t.created_at,
    updated_at: t.updated_at,
  }));

  // Conteúdos de aula como atividades de estudo (para usar Pomodoro)
  const conteudoAtividades: Atividade[] = conteudos.map((c, i) => ({
    id: `academico-co-${c.id}`,
    projeto_id: `academico-di-${c.disciplina_id}`,
    atividade_pai_id: null,
    titulo: `📖 Estudar: ${c.titulo}`,
    descricao: c.modulo_tematico ? `Módulo: ${c.modulo_tematico}` : "",
    notas: "",
    prioridade: c.status_estudo === "nao_estudado" ? "media" as const : "baixa" as const,
    data_limite: c.data_aula || null,
    lembrete: null,
    recorrencia: null,
    pomodoros_estimados: 2,
    pomodoros_realizados: 0,
    tempo_total_seg: 0,
    status: c.status_estudo === "dominado" ? "concluida" as const : "pendente" as const,
    concluida_em: null,
    etiqueta_ids: [],
    ordem: tarefas.length + i,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));

  return [...tarefaAtividades, ...conteudoAtividades];
}

// Verifica se atividade é do Acadêmico
export function isAcademicoAtividade(id: string): boolean {
  return id.startsWith("academico-t-") || id.startsWith("academico-co-");
}
