// ═══════════════════════════════════════════════════
// ACADÊMICO — Academic Organization System
// Data Layer (localStorage)
// ═══════════════════════════════════════════════════

import type {
  Disciplina, DisciplinaInput,
  Conteudo, ConteudoInput,
  Tarefa, TarefaInput,
  Frequencia, FrequenciaInput,
  BibliotecaItem, BibliotecaInput,
  Meta, MetaInput,
  Reflexao, ReflexaoInput,
  Extracurricular, ExtracurricularInput,
  Periodo, PeriodoInput,
  Graduacao, GraduacaoInput,
  Avaliacao, AvaliacaoInput,
  DesempenhoDisciplina, StatusAprovacao,
  ConfigAcademica, FrequenciaResumo,
} from "@/types/academico";
import { DEFAULT_CONFIG_ACADEMICA } from "@/types/academico";
import { syncSave, syncLoad, initSync } from "./sync";

// ─── STORAGE KEYS ───

const KEYS = {
  disciplinas:      "ac:disciplinas",
  conteudos:        "ac:conteudos",
  tarefas:          "ac:tarefas",
  frequencia:       "ac:frequencia",
  biblioteca:       "ac:biblioteca",
  metas:            "ac:metas",
  reflexoes:        "ac:reflexoes",
  extracurriculares:"ac:extracurriculares",
  periodos:         "ac:periodos",
  graduacoes:       "ac:graduacoes",
  avaliacoes:       "ac:avaliacoes",
  config:           "ac:config",
};

/** Initialize sync for all academic keys. Call once on app load. */
export function initAcademicoSync(): Promise<void> {
  return initSync(Object.values(KEYS));
}

// ─── GENERIC STORAGE HELPERS (synced) ───

function load<T>(key: string, seed: T[]): T[] {
  return syncLoad<T[]>(key, seed);
}

function loadSingle<T>(key: string, seed: T): T {
  return syncLoad<T>(key, seed);
}

function save<T>(key: string, data: T) {
  syncSave(key, data);
}

function uid(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function now(): string { return new Date().toISOString(); }
function today(): string { return new Date().toISOString().slice(0, 10); }

// ═══════════════════════════════════════════════════
// DISCIPLINAS
// ═══════════════════════════════════════════════════

export function getDisciplinas(): Disciplina[] {
  return load<Disciplina>(KEYS.disciplinas, []).map(d => ({
    ...d,
    faltas_manuais: (d as any).faltas_manuais || 0,
  }));
}

export function getDisciplina(id: string): Disciplina | undefined {
  return getDisciplinas().find(d => d.id === id);
}

export function getDisciplinasByPeriodo(periodoId: string): Disciplina[] {
  return getDisciplinas().filter(d => d.periodo_id === periodoId);
}

export function getDisciplinasCursando(): Disciplina[] {
  return getDisciplinas().filter(d => d.status === "cursando");
}

/** Returns period IDs that have at least one discipline */
export function getPeriodosComDisciplinas(): string[] {
  const all = getDisciplinas().map(d => d.periodo_id);
  return Array.from(new Set(all));
}

export function createDisciplina(data: DisciplinaInput): Disciplina {
  const items = getDisciplinas();
  const novo: Disciplina = { ...data, id: `di-${uid()}`, created_at: now(), updated_at: now() };
  items.push(novo);
  save(KEYS.disciplinas, items);
  return novo;
}

export function updateDisciplina(id: string, data: Partial<Disciplina>): void {
  const items = getDisciplinas();
  const idx = items.findIndex(d => d.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data, updated_at: now() };
    save(KEYS.disciplinas, items);
  }
}

export function deleteDisciplina(id: string): void {
  // Cascade: delete related conteudos, tarefas, frequencia
  save(KEYS.disciplinas, getDisciplinas().filter(d => d.id !== id));
  save(KEYS.conteudos, getConteudos().filter(c => c.disciplina_id !== id));
  save(KEYS.tarefas, getTarefas().filter(t => t.disciplina_id !== id));
  save(KEYS.frequencia, getAllFrequencia().filter(f => f.disciplina_id !== id));
}

export function duplicarPeriodo(periodoOrigemId: string, periodoDestinoId: string): Disciplina[] {
  const originais = getDisciplinasByPeriodo(periodoOrigemId);
  const novas: Disciplina[] = [];
  for (const orig of originais) {
    const nova = createDisciplina({
      ...orig,
      periodo_id: periodoDestinoId,
      status: "cursando",
    });
    novas.push(nova);
  }
  return novas;
}

// ═══════════════════════════════════════════════════
// CONTEÚDOS
// ═══════════════════════════════════════════════════

export function getConteudos(): Conteudo[] {
  return load<Conteudo>(KEYS.conteudos, []);
}

export function getConteudo(id: string): Conteudo | undefined {
  return getConteudos().find(c => c.id === id);
}

export function getConteudosByDisciplina(disciplinaId: string): Conteudo[] {
  return getConteudos().filter(c => c.disciplina_id === disciplinaId);
}

export function getConteudosParaProva(tarefaId: string): Conteudo[] {
  const tarefa = getTarefa(tarefaId);
  if (!tarefa || tarefa.tipo !== "prova") return [];
  const ids = new Set(tarefa.conteudos_ids);
  return getConteudos().filter(c => ids.has(c.id));
}

export function createConteudo(data: ConteudoInput): Conteudo {
  const items = getConteudos();
  const novo: Conteudo = { ...data, id: `co-${uid()}`, created_at: now(), updated_at: now() };
  items.push(novo);
  save(KEYS.conteudos, items);
  return novo;
}

export function updateConteudo(id: string, data: Partial<Conteudo>): void {
  const items = getConteudos();
  const idx = items.findIndex(c => c.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data, updated_at: now() };
    save(KEYS.conteudos, items);
  }
}

export function deleteConteudo(id: string): void {
  save(KEYS.conteudos, getConteudos().filter(c => c.id !== id));
  // Remove from any tarefa's conteudos_ids
  const tarefas = getTarefas();
  let changed = false;
  for (const t of tarefas) {
    if (t.conteudos_ids.includes(id)) {
      t.conteudos_ids = t.conteudos_ids.filter(cid => cid !== id);
      changed = true;
    }
  }
  if (changed) save(KEYS.tarefas, tarefas);
}

// ═══════════════════════════════════════════════════
// TAREFAS
// ═══════════════════════════════════════════════════

export function getTarefas(): Tarefa[] {
  return load<Tarefa>(KEYS.tarefas, []).map(t => ({
    ...t,
    biblioteca_id: (t as any).biblioteca_id || "",
  }));
}

export function getTarefa(id: string): Tarefa | undefined {
  return getTarefas().find(t => t.id === id);
}

export function getTarefasByDisciplina(disciplinaId: string): Tarefa[] {
  return getTarefas().filter(t => t.disciplina_id === disciplinaId);
}

export function getTarefasPendentes(): Tarefa[] {
  return getTarefas().filter(t => t.status !== "concluida");
}

export function getTarefasProximas(dias: number): Tarefa[] {
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  const limiteStr = limite.toISOString().slice(0, 10);
  return getTarefasPendentes()
    .filter(t => t.data_entrega && t.data_entrega <= limiteStr)
    .sort((a, b) => a.data_entrega.localeCompare(b.data_entrega));
}

export function createTarefa(data: TarefaInput): Tarefa {
  const items = getTarefas();
  const novo: Tarefa = { ...data, id: `ta-${uid()}`, created_at: now(), updated_at: now() };
  items.push(novo);
  save(KEYS.tarefas, items);
  return novo;
}

export function updateTarefa(id: string, data: Partial<Tarefa>): void {
  const items = getTarefas();
  const idx = items.findIndex(t => t.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data, updated_at: now() };
    save(KEYS.tarefas, items);
  }
}

export function deleteTarefa(id: string): void {
  save(KEYS.tarefas, getTarefas().filter(t => t.id !== id));
}

// ═══════════════════════════════════════════════════
// FREQUÊNCIA
// ═══════════════════════════════════════════════════

export function getAllFrequencia(): Frequencia[] {
  return load<Frequencia>(KEYS.frequencia, []);
}

export function getFrequenciaByDisciplina(disciplinaId: string): Frequencia[] {
  return getAllFrequencia().filter(f => f.disciplina_id === disciplinaId);
}

export function createFrequencia(data: FrequenciaInput): Frequencia {
  const items = getAllFrequencia();
  const novo: Frequencia = { ...data, id: `fr-${uid()}`, created_at: now() };
  items.push(novo);
  save(KEYS.frequencia, items);
  return novo;
}

export function updateFrequencia(id: string, data: Partial<Frequencia>): void {
  const items = getAllFrequencia();
  const idx = items.findIndex(f => f.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data };
    save(KEYS.frequencia, items);
  }
}

export function deleteFrequencia(id: string): void {
  save(KEYS.frequencia, getAllFrequencia().filter(f => f.id !== id));
}

export function calcularFrequencia(disciplinaId: string): FrequenciaResumo {
  const disciplina = getDisciplina(disciplinaId);
  const registros = getFrequenciaByDisciplina(disciplinaId);
  const total_previstas = disciplina?.total_aulas_previstas || 0;
  const faltasManuais = (disciplina as any)?.faltas_manuais || 0;
  const presentes = registros.filter(r => r.presenca === "presente").length;
  const ausentes = registros.filter(r => r.presenca === "ausente").length + faltasManuais;
  const justificadas = registros.filter(r => r.presenca === "justificada").length;
  const total_registradas = registros.length + faltasManuais;

  // Percentual de frequência = presenças / total previstas * 100
  const percentual = total_previstas > 0
    ? Math.round((presentes + justificadas) / total_previstas * 100)
    : 100;

  // Risco: 25% faltas = reprovação. Atenção a partir de 15% faltas.
  const percentFaltas = total_previstas > 0 ? (ausentes / total_previstas) * 100 : 0;
  let risco: "ok" | "atencao" | "risco" = "ok";
  if (percentFaltas >= 25) risco = "risco";
  else if (percentFaltas >= 15) risco = "atencao";

  return { total_previstas, total_registradas, presentes, ausentes, justificadas, percentual, risco };
}

// ═══════════════════════════════════════════════════
// BIBLIOTECA
// ═══════════════════════════════════════════════════

// Migrate old StatusLeitura to StatusLeituraFull
function migrateStatus(s: string): string {
  const map: Record<string, string> = {
    em_progresso: "lendo",
    nao_lido: "para_ler",
    lido_dinamico: "lido_rapido",
    lido_resumido: "lido_resumido",
  };
  return map[s] || s;
}

export function getBiblioteca(): BibliotecaItem[] {
  return load<BibliotecaItem>(KEYS.biblioteca, []).map(b => ({
    ...b,
    tipo_leitura: (b as any).tipo_leitura || "livro",
    status: migrateStatus(b.status) as any,
    disciplina_id: (b as any).disciplina_id || "",
    pomodoros_realizados: (b as any).pomodoros_realizados || 0,
    tempo_total_seg: (b as any).tempo_total_seg || 0,
    capitulos: (b.capitulos || []).map((c: any, i: number) => ({
      ...c,
      status_leitura: migrateStatus(c.status_leitura || (c.lido ? "lido" : "para_ler")),
      herda_status: c.herda_status ?? true,
      ordem: c.ordem ?? i,
      pomodoros_realizados: c.pomodoros_realizados || 0,
      tempo_total_seg: c.tempo_total_seg || 0,
    })),
    tarefas_livro: (b.tarefas_livro || []).map((t: any) => ({
      ...t,
      subtarefas: t.subtarefas || [],
    })),
  }));
}

export function getBibliotecaItem(id: string): BibliotecaItem | undefined {
  return getBiblioteca().find(b => b.id === id);
}

export function getBibliotecaEmLeitura(): BibliotecaItem[] {
  const emProgresso = ["lendo_rapido", "lendo", "lendo_resumindo", "lendo_resumindo_mapa"];
  return getBiblioteca().filter(b => emProgresso.includes(b.status));
}

export function getBibliotecaPorAno(ano: number): BibliotecaItem[] {
  const concluidos = ["lido_rapido", "lido", "lido_resumido", "lido_resumido_mapa"];
  return getBiblioteca().filter(b => b.ano_leitura === ano && concluidos.includes(b.status));
}

export function getProgressoLeitura(ano: number): { lidos: number; meta: number; percentual: number } {
  const config = getConfigAcademica();
  const lidos = getBibliotecaPorAno(ano).length;
  const meta = config.meta_leitura_anual;
  return { lidos, meta, percentual: meta > 0 ? Math.round((lidos / meta) * 100) : 0 };
}

export function createBibliotecaItem(data: BibliotecaInput): BibliotecaItem {
  const items = getBiblioteca();
  const novo: BibliotecaItem = { ...data, id: `bi-${uid()}`, created_at: now(), updated_at: now() };
  items.push(novo);
  save(KEYS.biblioteca, items);
  return novo;
}

export function updateBibliotecaItem(id: string, data: Partial<BibliotecaItem>): void {
  const items = getBiblioteca();
  const idx = items.findIndex(b => b.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data, updated_at: now() };
    save(KEYS.biblioteca, items);
  }
}

export function deleteBibliotecaItem(id: string): void {
  save(KEYS.biblioteca, getBiblioteca().filter(b => b.id !== id));
}

/** Get all book tasks with deadlines (for Forja/Agenda integration) */
export function getTarefasLivrosComPrazo(): { tarefa: import("@/types/academico").TarefaLivro; livro: BibliotecaItem }[] {
  const result: { tarefa: import("@/types/academico").TarefaLivro; livro: BibliotecaItem }[] = [];
  for (const livro of getBiblioteca()) {
    for (const t of livro.tarefas_livro || []) {
      if (t.prazo && t.status !== "concluida") {
        result.push({ tarefa: t, livro });
      }
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════
// METAS
// ═══════════════════════════════════════════════════

export function getMetas(): Meta[] {
  return load<Meta>(KEYS.metas, []);
}

export function getMeta(id: string): Meta | undefined {
  return getMetas().find(m => m.id === id);
}

export function getMetasByAno(ano: number): Meta[] {
  return getMetas().filter(m => m.ano === ano);
}

export function getMetasAnuais(ano: number): Meta[] {
  return getMetas().filter(m => m.ano === ano && m.tipo === "anual");
}

export function getMetasMensais(ano: number, mes?: number): Meta[] {
  return getMetas().filter(m => m.ano === ano && m.tipo === "mensal" && (mes == null || m.mes === mes));
}

export function getMetasDiarias(dia: string): Meta[] {
  return getMetas().filter(m => m.tipo === "diaria" && m.dia === dia);
}

export function createMeta(data: MetaInput): Meta {
  const items = getMetas();
  const novo: Meta = { ...data, id: `me-${uid()}`, created_at: now(), updated_at: now() };
  items.push(novo);
  save(KEYS.metas, items);
  return novo;
}

export function updateMeta(id: string, data: Partial<Meta>): void {
  const items = getMetas();
  const idx = items.findIndex(m => m.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data, updated_at: now() };
    save(KEYS.metas, items);
  }
}

export function deleteMeta(id: string): void {
  save(KEYS.metas, getMetas().filter(m => m.id !== id));
}

// ═══════════════════════════════════════════════════
// REFLEXÕES
// ═══════════════════════════════════════════════════

export function getReflexoes(): Reflexao[] {
  return load<Reflexao>(KEYS.reflexoes, []);
}

export function getReflexao(id: string): Reflexao | undefined {
  return getReflexoes().find(r => r.id === id);
}

export function createReflexao(data: ReflexaoInput): Reflexao {
  const items = getReflexoes();
  const novo: Reflexao = { ...data, id: `re-${uid()}`, created_at: now(), updated_at: now() };
  items.push(novo);
  save(KEYS.reflexoes, items);
  return novo;
}

export function updateReflexao(id: string, data: Partial<Reflexao>): void {
  const items = getReflexoes();
  const idx = items.findIndex(r => r.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data, updated_at: now() };
    save(KEYS.reflexoes, items);
  }
}

export function deleteReflexao(id: string): void {
  save(KEYS.reflexoes, getReflexoes().filter(r => r.id !== id));
}

// ═══════════════════════════════════════════════════
// EXTRACURRICULARES
// ═══════════════════════════════════════════════════

export function getExtracurriculares(): Extracurricular[] {
  return load<Extracurricular>(KEYS.extracurriculares, []);
}

export function getExtracurricular(id: string): Extracurricular | undefined {
  return getExtracurriculares().find(e => e.id === id);
}

export function createExtracurricular(data: ExtracurricularInput): Extracurricular {
  const items = getExtracurriculares();
  const novo: Extracurricular = { ...data, id: `ex-${uid()}`, created_at: now(), updated_at: now() };
  items.push(novo);
  save(KEYS.extracurriculares, items);
  return novo;
}

export function updateExtracurricular(id: string, data: Partial<Extracurricular>): void {
  const items = getExtracurriculares();
  const idx = items.findIndex(e => e.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data, updated_at: now() };
    save(KEYS.extracurriculares, items);
  }
}

export function deleteExtracurricular(id: string): void {
  save(KEYS.extracurriculares, getExtracurriculares().filter(e => e.id !== id));
}

// ═══════════════════════════════════════════════════
// CONFIG ACADÊMICA (singleton)
// ═══════════════════════════════════════════════════

export function getConfigAcademica(): ConfigAcademica {
  return loadSingle<ConfigAcademica>(KEYS.config, DEFAULT_CONFIG_ACADEMICA);
}

export function updateConfigAcademica(data: Partial<ConfigAcademica>): void {
  const current = getConfigAcademica();
  save(KEYS.config, { ...current, ...data });
}

// ═══════════════════════════════════════════════════
// AVALIAÇÕES
// ═══════════════════════════════════════════════════

export function getAvaliacoes(): Avaliacao[] {
  return load<Avaliacao>(KEYS.avaliacoes, []).map(a => ({
    ...a,
    biblioteca_id: (a as any).biblioteca_id || "",
  }));
}

export function getAvaliacoesByDisciplina(disciplinaId: string): Avaliacao[] {
  return getAvaliacoes().filter(a => a.disciplina_id === disciplinaId);
}

export function createAvaliacao(data: AvaliacaoInput): Avaliacao {
  const items = getAvaliacoes();
  const novo: Avaliacao = { ...data, id: `av-${uid()}`, created_at: now(), updated_at: now() };
  items.push(novo);
  save(KEYS.avaliacoes, items);
  return novo;
}

export function updateAvaliacao(id: string, data: Partial<Avaliacao>): void {
  const items = getAvaliacoes();
  const idx = items.findIndex(a => a.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data, updated_at: now() };
    save(KEYS.avaliacoes, items);
  }
}

export function deleteAvaliacao(id: string): void {
  save(KEYS.avaliacoes, getAvaliacoes().filter(a => a.id !== id));
}

/** Calcula o desempenho (média ponderada, status, nota necessária) de uma disciplina */
export function calcularDesempenho(disciplinaId: string): DesempenhoDisciplina {
  const disc = getDisciplina(disciplinaId);
  const avaliacoes = getAvaliacoesByDisciplina(disciplinaId);
  const notaAprovacao = disc?.nota_aprovacao ?? 7;

  const total_peso = avaliacoes.reduce((s, a) => s + a.peso, 0);
  const avaliadas = avaliacoes.filter(a => a.nota !== null);
  const peso_avaliado = avaliadas.reduce((s, a) => s + a.peso, 0);

  let media_ponderada: number | null = null;
  if (peso_avaliado > 0) {
    const soma = avaliadas.reduce((s, a) => s + (a.nota! / a.nota_maxima) * 10 * a.peso, 0);
    media_ponderada = Math.round((soma / peso_avaliado) * 100) / 100;
  }

  // Calcular nota necessária nas avaliações restantes
  let nota_necessaria: number | null = null;
  const peso_restante = total_peso - peso_avaliado;
  if (peso_restante > 0 && total_peso > 0) {
    const pontos_obtidos = avaliadas.reduce((s, a) => s + (a.nota! / a.nota_maxima) * 10 * a.peso, 0);
    const pontos_necessarios = notaAprovacao * total_peso;
    const faltam = pontos_necessarios - pontos_obtidos;
    nota_necessaria = Math.round((faltam / peso_restante) * 100) / 100;
    if (nota_necessaria < 0) nota_necessaria = 0;
    if (nota_necessaria > 10) nota_necessaria = 10;
  }

  // Determinar status
  let status: StatusAprovacao = "sem_nota";
  if (disc?.status === "cursando") {
    if (media_ponderada !== null) {
      if (peso_restante === 0) {
        status = media_ponderada >= notaAprovacao ? "aprovado" : "reprovado";
      } else if (nota_necessaria !== null && nota_necessaria > 10) {
        status = "reprovado";
      } else {
        status = "cursando";
      }
    } else {
      status = "cursando";
    }
  } else if (disc?.status === "concluida") {
    const notaFinal = disc.nota_final ?? media_ponderada;
    status = (notaFinal !== null && notaFinal >= notaAprovacao) ? "aprovado" : "reprovado";
  }

  return { disciplina_id: disciplinaId, media_ponderada, total_peso, peso_avaliado, status, nota_necessaria, avaliacoes };
}

/** Calcula o CR (Coeficiente de Rendimento) de um conjunto de disciplinas */
export function calcularCR(disciplinaIds: string[]): number | null {
  let somaNotasCreditos = 0;
  let somaCreditos = 0;
  for (const id of disciplinaIds) {
    const disc = getDisciplina(id);
    if (!disc || disc.status !== "concluida") continue;
    const creditos = disc.creditos || disc.carga_horaria || 0;
    if (creditos === 0) continue;
    const desemp = calcularDesempenho(id);
    const nota = disc.nota_final ?? desemp.media_ponderada;
    if (nota === null) continue;
    somaNotasCreditos += nota * creditos;
    somaCreditos += creditos;
  }
  if (somaCreditos === 0) return null;
  return Math.round((somaNotasCreditos / somaCreditos) * 100) / 100;
}

/** Calcula o CR geral e por período de uma graduação */
export function calcularCRGraduacao(graduacaoId: string) {
  const periodos = getPeriodosEntities().filter(p => p.graduacao_id === graduacaoId);
  const todasDiscs = periodos.flatMap(p => getDisciplinasByPeriodo(p.id));
  const grad = getGraduacao(graduacaoId);

  const cr_geral = calcularCR(todasDiscs.map(d => d.id));
  const cr_periodo = new Map<string, number | null>();
  for (const p of periodos) {
    const discs = getDisciplinasByPeriodo(p.id);
    cr_periodo.set(p.id, calcularCR(discs.map(d => d.id)));
  }

  const total_creditos_aprovados = todasDiscs
    .filter(d => d.status === "concluida")
    .reduce((s, d) => s + (d.creditos || d.carga_horaria || 0), 0);
  const total_creditos_cursados = todasDiscs
    .filter(d => d.status === "cursando" || d.status === "concluida")
    .reduce((s, d) => s + (d.creditos || d.carga_horaria || 0), 0);
  const total_creditos_grad = grad?.total_creditos || 0;
  const percentual_conclusao = total_creditos_grad > 0
    ? Math.round((total_creditos_aprovados / total_creditos_grad) * 100)
    : 0;

  return { cr_geral, cr_periodo, total_creditos_cursados, total_creditos_aprovados, percentual_conclusao };
}

// ═══════════════════════════════════════════════════
// GRADUAÇÕES
// ═══════════════════════════════════════════════════

// Map old etapa "concluida" boolean to new status string
function migrateEtapaStatus(e: any): string {
  if (e.status) return e.status;
  if (e.concluida) {
    // map by tipo
    const map: Record<string, string> = {
      aula: "assistido", leitura: "lido", exercicio: "feito",
      projeto: "concluido", outro: "concluido",
    };
    return map[e.tipo] || "concluido";
  }
  const initial: Record<string, string> = {
    aula: "nao_assistido", leitura: "nao_lido", exercicio: "nao_feito",
    projeto: "nao_iniciado", outro: "nao_iniciado",
  };
  return initial[e.tipo] || "nao_iniciado";
}

export function getGraduacoes(): Graduacao[] {
  return load<Graduacao>(KEYS.graduacoes, []).map(g => ({
    ...g,
    tipo: (g as any).tipo || "graduacao",
    ativa: (g as any).ativa ?? true,
    link: (g as any).link || "",
    status_curso: (g as any).status_curso || "nao_iniciado",
    etapas: ((g as any).etapas || []).map((e: any, i: number) => {
      const status = migrateEtapaStatus(e);
      return {
        ...e,
        ordem: e.ordem ?? i,
        biblioteca_id: e.biblioteca_id || "",
        status,
        concluida: ["assistido", "assistido_resumido", "lido", "lido_resumido", "feito", "feito_corrigido", "concluido"].includes(status),
        posicao: e.posicao || "",
      };
    }),
    anotacoes_gerais: (g as any).anotacoes_gerais || "",
    pomodoros_realizados: (g as any).pomodoros_realizados || 0,
    tempo_total_seg: (g as any).tempo_total_seg || 0,
  }));
}

export function getGraduacao(id: string): Graduacao | undefined {
  return getGraduacoes().find(g => g.id === id);
}

export function createGraduacao(data: GraduacaoInput): Graduacao {
  const items = getGraduacoes();
  const novo: Graduacao = { ...data, id: `gr-${uid()}`, created_at: now() };
  items.push(novo);
  save(KEYS.graduacoes, items);
  return novo;
}

export function updateGraduacao(id: string, data: Partial<Graduacao>): void {
  const items = getGraduacoes();
  const idx = items.findIndex(g => g.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data };
    save(KEYS.graduacoes, items);
  }
}

export function deleteGraduacao(id: string): void {
  // Cascade: delete all periods in this graduation
  const periodosNaGrad = getPeriodosEntities().filter(p => p.graduacao_id === id);
  for (const p of periodosNaGrad) {
    deletePeriodo(p.id);
  }
  save(KEYS.graduacoes, getGraduacoes().filter(g => g.id !== id));
}

// ═══════════════════════════════════════════════════
// PERÍODOS
// ═══════════════════════════════════════════════════

export function getPeriodosEntities(): Periodo[] {
  return load<Periodo>(KEYS.periodos, []);
}

export function getPeriodoEntity(id: string): Periodo | undefined {
  return getPeriodosEntities().find(p => p.id === id);
}

export function getPeriodoAtivo(): Periodo | undefined {
  return getPeriodosEntities().find(p => p.ativo);
}

export function createPeriodo(data: PeriodoInput): Periodo {
  const items = getPeriodosEntities();
  // If new period is active, deactivate others
  if (data.ativo) {
    items.forEach(p => p.ativo = false);
  }
  const novo: Periodo = { ...data, id: `pe-${uid()}`, created_at: now() };
  items.push(novo);
  save(KEYS.periodos, items);
  return novo;
}

export function updatePeriodo(id: string, data: Partial<Periodo>): void {
  const items = getPeriodosEntities();
  // If activating this period, deactivate others
  if (data.ativo) {
    items.forEach(p => p.ativo = false);
  }
  const idx = items.findIndex(p => p.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...data };
    save(KEYS.periodos, items);
  }
}

export function deletePeriodo(id: string): void {
  // Cascade: delete all disciplines in this period (which cascades to their conteudos/tarefas/frequencia)
  const discsNoPeriodo = getDisciplinasByPeriodo(id);
  for (const d of discsNoPeriodo) {
    deleteDisciplina(d.id);
  }
  save(KEYS.periodos, getPeriodosEntities().filter(p => p.id !== id));
}

// ═══════════════════════════════════════════════════
// COMPUTED / AGGREGATE HELPERS
// ═══════════════════════════════════════════════════

/** All disciplines with attendance risk */
export function getDisciplinasComRisco(): { disciplina: Disciplina; resumo: FrequenciaResumo }[] {
  return getDisciplinasCursando().map(d => ({
    disciplina: d,
    resumo: calcularFrequencia(d.id),
  }));
}

/** Dashboard stats */
export function getAcademicoStats() {
  const cursando = getDisciplinasCursando();
  const tarefasPendentes = getTarefasPendentes();
  const proximaTarefa = tarefasPendentes.sort((a, b) =>
    (a.data_entrega || "9999").localeCompare(b.data_entrega || "9999")
  )[0];
  const emLeitura = getBibliotecaEmLeitura();
  const progressoLeitura = getProgressoLeitura(new Date().getFullYear());
  const riscos = getDisciplinasComRisco().filter(d => d.resumo.risco !== "ok");

  return {
    disciplinasCursando: cursando.length,
    tarefasPendentes: tarefasPendentes.length,
    proximaTarefa,
    livrosEmLeitura: emLeitura.length,
    progressoLeitura,
    disciplinasEmRisco: riscos,
  };
}

/** Generate agenda events from discipline schedules within a period's date range */
export function gerarEventosAgenda(disciplinaId: string): { titulo: string; data_inicio: string; data_fim: string }[] {
  const disc = getDisciplina(disciplinaId);
  if (!disc || disc.horario_estruturado.length === 0) return [];
  const periodo = getPeriodoEntity(disc.periodo_id);
  if (!periodo || !periodo.data_inicio || !periodo.data_fim) return [];

  const start = new Date(periodo.data_inicio + "T00:00:00");
  const end = new Date(periodo.data_fim + "T23:59:59");
  const events: { titulo: string; data_inicio: string; data_fim: string }[] = [];

  for (const h of disc.horario_estruturado) {
    const current = new Date(start);
    while (current <= end) {
      if (current.getDay() === h.dia) {
        const dateStr = current.toISOString().slice(0, 10);
        events.push({
          titulo: disc.nome,
          data_inicio: `${dateStr}T${h.inicio}:00`,
          data_fim: `${dateStr}T${h.fim}:00`,
        });
      }
      current.setDate(current.getDate() + 1);
    }
  }
  return events;
}

/** Export all data as JSON */
export function exportAllData() {
  return {
    disciplinas: getDisciplinas(),
    conteudos: getConteudos(),
    tarefas: getTarefas(),
    frequencia: getAllFrequencia(),
    biblioteca: getBiblioteca(),
    metas: getMetas(),
    reflexoes: getReflexoes(),
    extracurriculares: getExtracurriculares(),
    periodos: getPeriodosEntities(),
    graduacoes: getGraduacoes(),
    config: getConfigAcademica(),
  };
}
