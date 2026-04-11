import type {
  Paciente, Atividade,
  Notificacao, TemplateMensagem, StatusPaciente,
} from '@/types/database';
import { supabase } from './supabase';
import { isWithinInterval, parseISO } from 'date-fns';
// Lazy import to avoid circular dependency (notes.ts imports data.ts)

// ─── LOCAL STORAGE FALLBACK ───
function loadLocal<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : []; } catch { return []; }
}
let _storageWarningShown = false;
function saveLocal<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    if (!_storageWarningShown) {
      _storageWarningShown = true;
      if (process.env.NODE_ENV === 'development') console.warn("[Data] localStorage cheio ou indisponível");
    }
  }
}

const LS = {
  pacientes: 'allos-pacientes',
  atividades: 'allos-atividades',
  templates: 'allos-templates',
  notificacoes: 'allos-notificacoes',
} as const;

// ─── IN-MEMORY CACHE ───
let pacientes: Paciente[] = [];
let atividades: Atividade[] = [];
let notificacoes: Notificacao[] = [];
let templates: TemplateMensagem[] = [];
let _currentUserId: string | null = null;
let _initialized = false;
let _initializing = false;
let _useSupabase = false;
let _dataVersion = 0;
const _listeners: Set<() => void> = new Set();

export function onDataChange(cb: () => void): () => void {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

function notifyChange() {
  _dataVersion++;
  _listeners.forEach(cb => cb());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && Object.values(LS).includes(e.key as any)) {
      if (e.key === LS.atividades) atividades = loadLocal(LS.atividades);
      if (e.key === LS.pacientes) pacientes = loadLocal(LS.pacientes);
      if (e.key === LS.templates) templates = loadLocal(LS.templates);
      notifyChange();
    }
  });
}

export function getDataVersion(): number {
  return _dataVersion;
}

// ─── INITIALIZATION ───
export async function initializeData(userId: string): Promise<void> {
  if (_initialized && _currentUserId === userId) return;
  if (_initializing) return;
  _initializing = true;
  _currentUserId = userId;

  try {
    const [pRes, aRes, tRes, nRes] = await Promise.all([
      supabase.from('pacientes').select('*').eq('terapeuta_id', userId).order('nome'),
      supabase.from('atividades').select('*').eq('terapeuta_id', userId).order('data_inicio'),
      supabase.from('templates_mensagem').select('*').eq('terapeuta_id', userId).order('created_at'),
      supabase.from('notificacoes').select('*').eq('terapeuta_id', userId).order('created_at', { ascending: false }),
    ]);

    if (!pRes.error && !aRes.error) {
      _useSupabase = true;
      pacientes = pRes.data || [];
      atividades = aRes.data || [];
      templates = tRes.data || [];
      notificacoes = nRes.data || [];

      const localAtividades = loadLocal<Atividade>(LS.atividades);
      if (localAtividades.length > 0) {
        const supabaseIds = new Set(atividades.map(a => a.id));
        const oneDayAgo = Date.now() - 86400000;
        const localOnly = localAtividades.filter(a => {
          if (supabaseIds.has(a.id)) return false;
          if (!a.id.startsWith('a-')) return false;
          const timestamp = parseInt(a.id.split('-')[1] || '0', 10);
          if (timestamp < oneDayAgo) return false;
          return true;
        });
        if (localOnly.length > 0) {
          atividades.push(...localOnly);
          for (const a of localOnly) {
            const { id: _id, paciente: _p, ...insertData } = a as Atividade & { paciente?: any };
            supabase.from('atividades').insert(insertData).select().single().then(({ data: row }) => {
              if (row) {
                const idx = atividades.findIndex(x => x.id === a.id);
                if (idx !== -1) atividades[idx] = { ...row, paciente: atividades[idx].paciente };
                saveLocal(LS.atividades, atividades);
              }
            });
          }
        }
      }

      saveLocal(LS.pacientes, pacientes);
      saveLocal(LS.atividades, atividades);
      saveLocal(LS.templates, templates);

      if (templates.length === 0) {
        const defaults = [
          { terapeuta_id: userId, nome: 'Confirmação padrão', tipo: 'confirmacao', conteudo: 'Olá {nome_paciente}, confirmando nossa sessão no dia {data_sessao} às {horario_sessao}. Até lá!' },
          { terapeuta_id: userId, nome: 'Reagendamento padrão', tipo: 'reagendamento', conteudo: 'Olá {nome_paciente}, nossa sessão foi reagendada para {data_sessao} às {horario_sessao}. Pode confirmar?' },
          { terapeuta_id: userId, nome: 'Cobrança padrão', tipo: 'cobranca', conteudo: 'Olá {nome_paciente}, segue o lembrete sobre o pagamento da sessão de {data_sessao}.' },
        ];
        const { data } = await supabase.from('templates_mensagem').insert(defaults).select();
        if (data) {
          templates = data;
          saveLocal(LS.templates, templates);
        } else {
          templates = defaults.map((d, i) => ({ ...d, id: `tmpl-${i}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })) as TemplateMensagem[];
          saveLocal(LS.templates, templates);
        }
      }

      if (process.env.NODE_ENV === 'development') console.log("[Data] Supabase:", pacientes.length, "pacientes,", atividades.length, "atividades");
    } else {
      throw new Error("Supabase tables not found");
    }
  } catch (e) {
    _useSupabase = false;
    if (process.env.NODE_ENV === 'development') console.warn("[Data] Supabase indisponível, usando localStorage");
    pacientes = loadLocal(LS.pacientes);
    atividades = loadLocal(LS.atividades);
    templates = loadLocal(LS.templates);
    notificacoes = loadLocal(LS.notificacoes);

    if (templates.length === 0) {
      templates = [
        { id: 'tmpl-0', terapeuta_id: userId, nome: 'Confirmação padrão', tipo: 'confirmacao' as const, conteudo: 'Olá {nome_paciente}, confirmando nossa sessão no dia {data_sessao} às {horario_sessao}. Até lá!', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'tmpl-1', terapeuta_id: userId, nome: 'Reagendamento padrão', tipo: 'reagendamento' as const, conteudo: 'Olá {nome_paciente}, nossa sessão foi reagendada para {data_sessao} às {horario_sessao}. Pode confirmar?', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 'tmpl-2', terapeuta_id: userId, nome: 'Cobrança padrão', tipo: 'cobranca' as const, conteudo: 'Olá {nome_paciente}, segue o lembrete sobre o pagamento da sessão de {data_sessao}.', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ];
      saveLocal(LS.templates, templates);
    }
  }

  _initialized = true;
  _initializing = false;
}

export function isDataReady(): boolean {
  return _initialized;
}

export function getCurrentUserId(): string {
  return _currentUserId || '';
}

export function resetData(): void {
  _initialized = false;
  _initializing = false;
  _currentUserId = null;
  pacientes = [];
  atividades = [];
  templates = [];
  notificacoes = [];
  _useSupabase = false;
}

// ─── PACIENTES ───
export function getPacientes(filters?: {
  search?: string;
  status?: StatusPaciente | 'todos';
  sort?: 'nome_asc' | 'nome_desc' | 'recente';
}): Paciente[] {
  let result = [...pacientes];
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(p => p.nome.toLowerCase().includes(q));
  }
  if (filters?.status && filters.status !== 'todos') {
    result = result.filter(p => p.status === filters.status);
  }
  if (filters?.sort === 'nome_desc') {
    result.sort((a, b) => b.nome.localeCompare(a.nome));
  } else if (filters?.sort === 'recente') {
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else {
    result.sort((a, b) => a.nome.localeCompare(b.nome));
  }
  return result;
}

export function getPaciente(id: string): Paciente | undefined {
  return pacientes.find(p => p.id === id);
}

export function createPaciente(data: Omit<Paciente, 'id' | 'created_at' | 'updated_at'>): Paciente {
  const terapeutaId = _currentUserId || data.terapeuta_id;
  if (!terapeutaId) throw new Error("Usuário não configurado");
  const novo: Paciente = {
    ...data,
    terapeuta_id: terapeutaId,
    id: `p-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  pacientes.push(novo);
  saveLocal(LS.pacientes, pacientes);
  notifyChange();

  // Create Obsidian vault folder for this patient (lazy import to avoid circular dep)
  import('./notes').then(m => m.createPatientVaultFolder(novo.nome)).catch(() => {});

  if (_useSupabase) {
    const { id: _oldId, ...rest } = novo;
    supabase.from('pacientes').insert({ ...rest }).select().single().then(({ data: row, error }) => {
      if (row) {
        const oldId = novo.id;
        const idx = pacientes.findIndex(p => p.id === oldId);
        if (idx !== -1) {
          pacientes[idx] = row;
          atividades.forEach(a => {
            if (a.paciente_id === oldId) a.paciente_id = row.id;
          });
          saveLocal(LS.pacientes, pacientes);
          saveLocal(LS.atividades, atividades);
          notifyChange();
        }
      }
      if (error) console.error("[Data] createPaciente insert failed:", error.message);
    });
  }

  return novo;
}

export function updatePaciente(id: string, data: Partial<Paciente>): Paciente | undefined {
  const idx = pacientes.findIndex(p => p.id === id);
  if (idx === -1) return undefined;
  pacientes[idx] = { ...pacientes[idx], ...data, updated_at: new Date().toISOString() };
  saveLocal(LS.pacientes, pacientes);
  notifyChange();
  if (_useSupabase) supabase.from('pacientes').update(data).eq('id', id);
  return pacientes[idx];
}

export function deletePaciente(id: string): boolean {
  const len = pacientes.length;
  pacientes = pacientes.filter(p => p.id !== id);
  const deleted = pacientes.length < len;
  if (deleted) {
    const sessionsBefore = atividades.length;
    atividades = atividades.filter(a => a.paciente_id !== id);
    saveLocal(LS.pacientes, pacientes);
    try {
      localStorage.removeItem(`allos-notes-${id}`);
      localStorage.removeItem(`allos-prenotes-${id}`);
      localStorage.removeItem(`allos-general-note-${id}`);
    } catch {}
    if (atividades.length < sessionsBefore) saveLocal(LS.atividades, atividades);
    notifyChange();
    if (_useSupabase) {
      supabase.from('atividades').delete().eq('paciente_id', id);
      supabase.from('pacientes').delete().eq('id', id);
    }
  }
  return deleted;
}

// ─── ATIVIDADES ───
export function getAtividades(dateRange?: { start: Date; end: Date }): Atividade[] {
  let result = [...atividades];

  // Book tasks are injected via getAtividadesWithBookTasks() wrapper

  if (dateRange) {
    result = result.filter(a => {
      const d = parseISO(a.data_inicio);
      return isWithinInterval(d, { start: dateRange.start, end: dateRange.end });
    });
  }
  result.sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());
  return result.map(a => ({
    ...a,
    paciente: a.paciente_id ? pacientes.find(p => p.id === a.paciente_id) : undefined,
  }));
}

export function getAtividade(id: string): (Atividade & { paciente?: Paciente }) | undefined {
  const a = atividades.find(x => x.id === id);
  if (!a) return undefined;
  return { ...a, paciente: a.paciente_id ? pacientes.find(p => p.id === a.paciente_id) : undefined };
}

export function getAtividadesByPaciente(pacienteId: string): Atividade[] {
  return atividades
    .filter(a => a.paciente_id === pacienteId)
    .sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime());
}

export function createAtividade(data: Omit<Atividade, 'id' | 'created_at' | 'updated_at' | 'presenca_registrada'>): Atividade {
  const terapeutaId = _currentUserId || data.terapeuta_id;
  const tempId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const nova: Atividade = {
    ...data,
    terapeuta_id: terapeutaId,
    id: tempId,
    presenca_registrada: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  atividades.push(nova);
  saveLocal(LS.atividades, atividades);
  notifyChange();

  if (_useSupabase) {
    const { paciente: _p, id: _tempId, ...insertData } = nova as Atividade & { paciente?: any };
    supabase.from('atividades').insert(insertData).select().single().then(({ data: row, error }) => {
      if (row) {
        const idx = atividades.findIndex(a => a.id === tempId);
        if (idx !== -1) {
          atividades[idx] = { ...row, paciente: atividades[idx].paciente };
        }
        saveLocal(LS.atividades, atividades);
        notifyChange();
      }
      if (error) console.error("[Data] createAtividade insert failed:", error.message);
    });
  }

  return nova;
}

export function updateAtividade(id: string, data: Partial<Atividade>): Atividade | undefined {
  const idx = atividades.findIndex(a => a.id === id);
  if (idx === -1) return undefined;
  const { paciente: _p, ...cleanData } = data as Partial<Atividade> & { paciente?: any };
  atividades[idx] = { ...atividades[idx], ...data, updated_at: new Date().toISOString() };
  saveLocal(LS.atividades, atividades);
  notifyChange();
  if (_useSupabase) {
    supabase.from('atividades').update(cleanData).eq('id', id).then(({ error }) => {
      if (error) console.error("[Data] updateAtividade failed:", error.message, "id:", id);
    });
  }
  return atividades[idx];
}

export function deleteAtividade(id: string): boolean {
  const len = atividades.length;
  atividades = atividades.filter(a => a.id !== id);
  const deleted = atividades.length < len;
  if (deleted) {
    saveLocal(LS.atividades, atividades);
    notifyChange();
    if (_useSupabase) supabase.from('atividades').delete().eq('id', id);
  }
  return deleted;
}

// ─── NOTIFICAÇÕES ───
export function getNotificacoes(unreadOnly = false): Notificacao[] {
  let result = [...notificacoes];
  if (unreadOnly) result = result.filter(n => !n.lida);
  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return result;
}

export function getUnreadCount(): number {
  return notificacoes.filter(n => !n.lida).length;
}

export function markAsRead(id: string): void {
  const n = notificacoes.find(x => x.id === id);
  if (n) {
    n.lida = true;
    supabase.from('notificacoes').update({ lida: true }).eq('id', id);
  }
}

export function markAllAsRead(): void {
  notificacoes.forEach(n => { n.lida = true; });
  if (_currentUserId) {
    supabase.from('notificacoes').update({ lida: true }).eq('terapeuta_id', _currentUserId).eq('lida', false);
  }
}

// ─── TEMPLATES ───
export function getTemplates(): TemplateMensagem[] {
  return [...templates];
}

export function updateTemplate(id: string, conteudo: string): TemplateMensagem | undefined {
  const idx = templates.findIndex(t => t.id === id);
  if (idx === -1) return undefined;
  templates[idx] = { ...templates[idx], conteudo, updated_at: new Date().toISOString() };
  supabase.from('templates_mensagem').update({ conteudo }).eq('id', id);
  return templates[idx];
}

// ─── BUSCA GLOBAL ───
export interface SearchResult {
  type: 'paciente' | 'atividade';
  id: string;
  title: string;
  subtitle: string;
  link: string;
}

export function searchGlobal(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: SearchResult[] = [];

  pacientes.forEach(p => {
    if (p.nome.toLowerCase().includes(q)) {
      results.push({ type: 'paciente', id: p.id, title: p.nome, subtitle: `${p.status} · ${p.modalidade}`, link: `/pacientes/${p.id}` });
    }
  });

  atividades.forEach(a => {
    if (a.titulo.toLowerCase().includes(q)) {
      const d = new Date(a.data_inicio);
      results.push({ type: 'atividade', id: a.id, title: a.titulo, subtitle: `${d.toLocaleDateString('pt-BR')} · ${a.status}`, link: '/agenda' });
    }
  });

  return results;
}

// ─── CONFIGURAÇÕES ───
const SETTINGS_KEY = 'allos-settings';

export interface AppSettings {
  workHourStart: number;
  workHourEnd: number;
}

const DEFAULT_SETTINGS: AppSettings = { workHourStart: 5, workHourEnd: 24 };

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch { return DEFAULT_SETTINGS; }
}

export function updateSettings(data: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const updated = { ...current, ...data };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  return updated;
}

// ─── ALERTAS CRUZADOS ───
export interface AlertaCruzado {
  id: string;
  tipo: 'sessao_sem_preparo' | 'conteudo_atrasado' | 'tarefa_vencida' | 'meta_em_risco' | 'paciente_inativo' | 'sem_foco_hoje';
  titulo: string;
  mensagem: string;
  link?: string;
  prioridade: 'alta' | 'media' | 'baixa';
  icone: string;
}

export function getAlertasCruzados(): AlertaCruzado[] {
  const alertas: AlertaCruzado[] = [];
  const agora = new Date();
  const hoje = agora.toISOString().slice(0, 10);

  // 1. Sessão em menos de 2h sem preparação no Forja
  const atividadesHoje = getAtividades({
    start: new Date(hoje + 'T00:00:00'),
    end: new Date(hoje + 'T23:59:59')
  }).filter(a => a.tipo === 'sessao' && ['confirmada', 'pendente'].includes(a.status));

  for (const sessao of atividadesHoje) {
    const inicio = new Date(sessao.data_inicio);
    const diffMin = (inicio.getTime() - agora.getTime()) / 60000;
    if (diffMin > 0 && diffMin < 120 && sessao.paciente) {
      try {
        const { getTodasAtividades } = require('./forja-data');
        const forjaTasks = getTodasAtividades();
        const hasPrep = forjaTasks.some((t: any) =>
          t.titulo.toLowerCase().includes(sessao.paciente!.nome.toLowerCase()) &&
          t.status === 'pendente'
        );
        if (!hasPrep) {
          alertas.push({
            id: `prep-${sessao.id}`,
            tipo: 'sessao_sem_preparo',
            titulo: 'Sessão sem preparação',
            mensagem: `Sessão com ${sessao.paciente.nome} em ${Math.round(diffMin)}min. Nenhuma tarefa de preparação encontrada.`,
            link: `/forja`,
            prioridade: 'alta',
            icone: 'alert-triangle',
          });
        }
      } catch {}
    }
  }

  // 2. Conteúdo atrasado
  try {
    const { getConteudos } = require('./usina-data');
    const conteudos = getConteudos();
    const atrasados = conteudos.filter((c: any) =>
      c.data_planejada && c.data_planejada < hoje &&
      !['postado', 'arquivado'].includes(c.status)
    );
    if (atrasados.length > 0) {
      alertas.push({
        id: 'conteudo-atrasado', tipo: 'conteudo_atrasado',
        titulo: `${atrasados.length} conteúdo${atrasados.length > 1 ? 's' : ''} atrasado${atrasados.length > 1 ? 's' : ''}`,
        mensagem: `Conteúdos com data de publicação vencida no pipeline da Usina.`,
        link: '/conteudo/conteudos', prioridade: 'media', icone: 'sparkles',
      });
    }
  } catch {}

  // 3. Tarefas vencidas no Forja
  try {
    const { getTarefasAtrasadas } = require('./forja-data');
    const atrasadas = getTarefasAtrasadas();
    if (atrasadas.length > 0) {
      alertas.push({
        id: 'tarefas-atrasadas', tipo: 'tarefa_vencida',
        titulo: `${atrasadas.length} tarefa${atrasadas.length > 1 ? 's' : ''} atrasada${atrasadas.length > 1 ? 's' : ''}`,
        mensagem: 'Atividades com prazo vencido no Forja.',
        link: '/forja', prioridade: 'media', icone: 'flame',
      });
    }
  } catch {}

  // 4. Meta semanal em risco
  try {
    const { getMetas, calcularMetaAtual } = require('./usina-data');
    const metas = getMetas().filter((m: any) => m.ativa && m.tipo === 'semanal');
    const dayOfWeek = agora.getDay();
    const weekProgress = dayOfWeek === 0 ? 1 : dayOfWeek / 7;
    for (const meta of metas) {
      const atual = calcularMetaAtual(meta);
      const actualProgress = meta.valor_alvo > 0 ? atual / meta.valor_alvo : 0;
      if (weekProgress > 0.5 && actualProgress < weekProgress * 0.5) {
        alertas.push({
          id: `meta-risco-${meta.id}`, tipo: 'meta_em_risco',
          titulo: 'Meta em risco',
          mensagem: `"${meta.titulo}" — ${atual}/${meta.valor_alvo} com ${Math.round(weekProgress * 100)}% da semana passada.`,
          link: '/conteudo/metas', prioridade: 'baixa', icone: 'target',
        });
      }
    }
  } catch {}

  // 5. Pacientes inativos
  const ativos = pacientes.filter(p => p.status === 'ativo');
  for (const paciente of ativos) {
    const sessoes = getAtividadesByPaciente(paciente.id).filter(a => a.tipo === 'sessao' && a.status === 'realizada');
    if (sessoes.length > 0) {
      const ultimaSessao = new Date(sessoes[0].data_inicio);
      const diasSemSessao = Math.floor((agora.getTime() - ultimaSessao.getTime()) / 86400000);
      if (diasSemSessao > 21) {
        alertas.push({
          id: `inativo-${paciente.id}`, tipo: 'paciente_inativo',
          titulo: 'Paciente sem sessão recente',
          mensagem: `${paciente.nome} está há ${diasSemSessao} dias sem sessão realizada.`,
          link: `/pacientes/${paciente.id}`, prioridade: 'baixa', icone: 'user-x',
        });
      }
    }
  }

  // 6. Sem foco hoje
  if (agora.getHours() >= 14) {
    try {
      const { getTempoFocadoHoje } = require('./forja-data');
      if (getTempoFocadoHoje() === 0) {
        alertas.push({
          id: 'sem-foco-hoje', tipo: 'sem_foco_hoje',
          titulo: 'Sem foco hoje',
          mensagem: 'Você ainda não registrou nenhuma sessão de foco hoje.',
          link: '/forja/foco', prioridade: 'baixa', icone: 'flame',
        });
      }
    } catch {}
  }

  const prioOrder = { alta: 0, media: 1, baixa: 2 };
  alertas.sort((a, b) => prioOrder[a.prioridade] - prioOrder[b.prioridade]);
  return alertas;
}

// ─── STATS ───
export function getHorasClinicas(): { sessoes: number; supervisao: number; total: number } {
  const realizadas = atividades.filter(a => a.status === 'realizada');
  const sessaoHoras = realizadas.filter(a => a.tipo === 'sessao').reduce((sum, a) => {
    return sum + (new Date(a.data_fim).getTime() - new Date(a.data_inicio).getTime()) / 3600000;
  }, 0);
  const supHoras = realizadas.filter(a => a.tipo === 'supervisao').reduce((sum, a) => {
    return sum + (new Date(a.data_fim).getTime() - new Date(a.data_inicio).getTime()) / 3600000;
  }, 0);
  return {
    sessoes: Math.round(sessaoHoras * 10) / 10,
    supervisao: Math.round(supHoras * 10) / 10,
    total: Math.round((sessaoHoras + supHoras) * 10) / 10,
  };
}
