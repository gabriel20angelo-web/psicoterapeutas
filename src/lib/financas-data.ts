// ═══════════════════════════════════════════════════
// FINANÇAS — Controle financeiro pessoal
// Data layer (localStorage + Supabase kv_store via sync)
// ═══════════════════════════════════════════════════

import { syncSave, syncLoad, initSync } from "./sync";

export type TxType = "variavel" | "pontual" | "fixo" | "entrada" | "entrada_fixa";

export interface Categoria {
  n: string;
  c: string;
}

export interface Transacao {
  id: number;
  desc: string;
  val: number;
  date: string;
  type: Exclude<TxType, "entrada_fixa">;
  cat: string;
  pay: string;
  parc: string | null;
  pg: number | null;
}

export interface FixoItem {
  id: number;
  desc: string;
  val: number;
  type: "fixo" | "entrada_fixa";
  cat: string;
  pay: string;
  day: number;
  active: boolean;
  /** Mapa "YYYY-MM" → tx_id indicando que o fixo foi realizado naquele mês. */
  realizacoes?: Record<string, number>;
}

export type PendenciaKind = "pagar" | "receber";
export type PendenciaStatus = "aberto" | "quitado" | "cancelado";

export interface PagamentoParcialPendencia {
  id: number;
  data: string;
  valor: number;
  tx_id?: number;
  notas?: string;
}

export interface Pendencia {
  id: number;
  kind: PendenciaKind;
  desc: string;
  val: number;
  date_due: string;
  cat: string;
  pay: string;
  status: PendenciaStatus;
  quitado_em?: string;
  tx_id?: number;
  parc_num?: number;
  parc_total?: number;
  parent_id?: number;
  credor?: string;
  notas?: string;
  /** Caixinha destino (a_receber) ou origem (a_pagar) quando a pendência for quitada. */
  caixinha_id?: number;
  /** Histórico de pagamentos parciais. Quando soma >= val, pendência é quitada. */
  pagamentos_parciais?: PagamentoParcialPendencia[];
}

export type DirecaoEmprestimo = "emprestei" | "peguei";

export interface PagamentoEmprestimo {
  id: number;
  data: string;
  valor: number;
  tx_id?: number;
  notas?: string;
}

export interface Emprestimo {
  id: number;
  direcao: DirecaoEmprestimo;
  pessoa: string;
  valor_original: number;
  data: string;
  prazo?: string;
  status: "aberto" | "quitado";
  pagamentos: PagamentoEmprestimo[];
  notas?: string;
  cat?: string;
  pay?: string;
  /** Quando emprestei: caixinha destino dos recebimentos. */
  caixinha_id?: number;
}

export interface Orcamento {
  cat: string;
  limite: number;
}

export type MovimentoTipo = "deposito" | "saque";

export interface MovimentoCaixinha {
  id: number;
  tipo: MovimentoTipo;
  valor: number;
  data: string;
  notas?: string;
}

export interface Caixinha {
  id: number;
  nome: string;
  cor: string;
  icone?: string;
  meta?: number;
  meta_data?: string;
  /** Quanto o usuário gostaria de depositar nesta caixinha por mês. */
  meta_mensal?: number;
  /** Categoria vinculada: gastos nela podem ser descontados; entradas nela podem alimentar. */
  cat_vinculada?: string;
  movimentos: MovimentoCaixinha[];
  criada_em: string;
  notas?: string;
  arquivada?: boolean;
}

export interface MetasFinanceiras {
  economia_mensal?: number;
  gasto_maximo_mensal?: number;
  patrimonio_alvo?: number;
}

export type AjusteCartaoTipo = "credito" | "debito";

export interface AjusteCartao {
  id: number;
  tipo: AjusteCartaoTipo;
  valor: number;
  data: string;
  notas?: string;
}

export interface Cartao {
  id: number;
  nome: string;
  cor: string;
  limite?: number;
  dia_fechamento?: number;
  dia_vencimento?: number;
  ajustes: AjusteCartao[];
  ativo: boolean;
  criado_em: string;
  notas?: string;
}

export interface FinancasData {
  cats: Categoria[];
  txs: Transacao[];
  fixos: FixoItem[];
  pendencias: Pendencia[];
  emprestimos: Emprestimo[];
  orcamentos: Orcamento[];
  caixinhas: Caixinha[];
  metas: MetasFinanceiras;
  cartoes: Cartao[];
}

const KEYS = {
  cats: "fin:cats",
  txs: "fin:txs",
  fixos: "fin:fixos",
  pendencias: "fin:pendencias",
  emprestimos: "fin:emprestimos",
  orcamentos: "fin:orcamentos",
  caixinhas: "fin:caixinhas",
  metas: "fin:metas",
  cartoes: "fin:cartoes",
};

const CATS_SEED: Categoria[] = [
  { n: "Alimentação", c: "#fb923c" },
  { n: "Transporte", c: "#60a5fa" },
  { n: "Moradia", c: "#34d399" },
  { n: "Saúde", c: "#f87171" },
  { n: "Lazer", c: "#fbbf24" },
  { n: "Educação", c: "#a78bfa" },
  { n: "Salário", c: "#34d399" },
  { n: "Freelance", c: "#60a5fa" },
  { n: "Outros", c: "#6b7280" },
];

export function initFinancasSync(): Promise<void> {
  return initSync(Object.values(KEYS));
}

export function getFinancas(): FinancasData {
  return {
    cats: syncLoad<Categoria[]>(KEYS.cats, CATS_SEED),
    txs: syncLoad<Transacao[]>(KEYS.txs, []),
    fixos: syncLoad<FixoItem[]>(KEYS.fixos, []),
    pendencias: syncLoad<Pendencia[]>(KEYS.pendencias, []),
    emprestimos: syncLoad<Emprestimo[]>(KEYS.emprestimos, []),
    orcamentos: syncLoad<Orcamento[]>(KEYS.orcamentos, []),
    caixinhas: syncLoad<Caixinha[]>(KEYS.caixinhas, []),
    metas: syncLoad<MetasFinanceiras>(KEYS.metas, {}),
    cartoes: syncLoad<Cartao[]>(KEYS.cartoes, []),
  };
}

export function saveCartoes(c: Cartao[]) { syncSave(KEYS.cartoes, c); }

// ─── Cartão helpers ───

export function saldoPositivoCartao(c: Cartao): number {
  return c.ajustes.reduce(
    (a, x) => a + (x.tipo === "credito" ? x.valor : -x.valor),
    0
  );
}

export function faturaCartaoMes(
  cartaoNome: string,
  txs: Transacao[],
  fixos: FixoItem[],
  y: number,
  m: number
): { total: number; itens: { desc: string; val: number; date: string; fixo: boolean }[] } {
  const payKey = "c:" + cartaoNome;
  const itens: { desc: string; val: number; date: string; fixo: boolean }[] = [];
  let total = 0;

  for (const t of txs) {
    if (t.pay !== payKey) continue;
    if (isEntrada(t.type)) continue;
    const d = new Date(t.date + "T12:00:00");
    if (d.getFullYear() !== y || d.getMonth() !== m) continue;
    itens.push({ desc: t.desc + (t.parc ? ` ${t.parc}` : ""), val: t.val, date: t.date, fixo: false });
    total += t.val;
  }
  for (const f of fixos) {
    if (f.active === false || f.type !== "fixo" || f.pay !== payKey) continue;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const day = Math.min(f.day || 5, lastDay);
    const date = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    itens.push({ desc: f.desc, val: f.val, date, fixo: true });
    total += f.val;
  }
  itens.sort((a, b) => b.date.localeCompare(a.date));
  return { total, itens };
}

export function faturaCartaoTotal(
  cartaoNome: string,
  txs: Transacao[],
  fixos: FixoItem[]
): number {
  const payKey = "c:" + cartaoNome;
  let total = 0;
  for (const t of txs) {
    if (t.pay === payKey && !isEntrada(t.type)) total += t.val;
  }
  return total;
}

/** Soma das parcelas futuras (após o mês atual) no cartão — a "dívida em aberto". */
export function parcelasFuturasCartao(
  cartaoNome: string,
  txs: Transacao[],
  refY: number,
  refM: number
): { total: number; por_mes: Array<{ y: number; m: number; val: number; count: number }> } {
  const payKey = "c:" + cartaoNome;
  const por: Record<string, { y: number; m: number; val: number; count: number }> = {};
  let total = 0;
  for (const t of txs) {
    if (t.pay !== payKey) continue;
    if (isEntrada(t.type)) continue;
    if (!t.parc) continue;
    const d = new Date(t.date + "T12:00:00");
    const y = d.getFullYear(), m = d.getMonth();
    if (y < refY || (y === refY && m <= refM)) continue;
    const key = `${y}-${m}`;
    if (!por[key]) por[key] = { y, m, val: 0, count: 0 };
    por[key].val += t.val;
    por[key].count += 1;
    total += t.val;
  }
  const por_mes = Object.values(por).sort((a, b) =>
    a.y === b.y ? a.m - b.m : a.y - b.y
  );
  return { total, por_mes };
}

/** Agrupa os parcelamentos abertos em "dívidas" pelo pg (grupo de parcelas). */
export interface DividaCartao {
  pg: number;
  desc: string;
  total: number;
  pago: number;
  restante: number;
  parcelas_total: number;
  parcelas_pagas: number;
  proxima_data?: string;
}

export function dividasAbertasCartao(
  cartaoNome: string,
  txs: Transacao[],
  refY: number,
  refM: number
): DividaCartao[] {
  const payKey = "c:" + cartaoNome;
  const grupos: Record<number, Transacao[]> = {};
  for (const t of txs) {
    if (t.pay !== payKey) continue;
    if (isEntrada(t.type)) continue;
    if (!t.parc || !t.pg) continue;
    if (!grupos[t.pg]) grupos[t.pg] = [];
    grupos[t.pg].push(t);
  }
  const out: DividaCartao[] = [];
  for (const pgKey of Object.keys(grupos)) {
    const pg = Number(pgKey);
    const parcelas = grupos[pg].slice().sort((a, b) => a.date.localeCompare(b.date));
    const total = parcelas.reduce((a: number, p: Transacao) => a + p.val, 0);
    const pagas: Transacao[] = [];
    const futuras: Transacao[] = [];
    for (const p of parcelas) {
      const d = new Date(p.date + "T12:00:00");
      if (d.getFullYear() < refY || (d.getFullYear() === refY && d.getMonth() <= refM)) pagas.push(p);
      else futuras.push(p);
    }
    if (futuras.length === 0) continue; // já quitada
    const pago = pagas.reduce((a, p) => a + p.val, 0);
    out.push({
      pg,
      desc: parcelas[0].desc,
      total,
      pago,
      restante: total - pago,
      parcelas_total: parcelas.length,
      parcelas_pagas: pagas.length,
      proxima_data: futuras[0]?.date,
    });
  }
  return out.sort((a, b) => (a.proxima_data || "").localeCompare(b.proxima_data || ""));
}

/** Fatura projetada para um mês qualquer no futuro (usado em timeline). */
export function faturaProjetadaMes(
  cartaoNome: string,
  txs: Transacao[],
  fixos: FixoItem[],
  y: number,
  m: number
): number {
  return faturaCartaoMes(cartaoNome, txs, fixos, y, m).total;
}

export function saveCats(cats: Categoria[]) { syncSave(KEYS.cats, cats); }
export function saveTxs(txs: Transacao[]) { syncSave(KEYS.txs, txs); }
export function saveFixos(fixos: FixoItem[]) { syncSave(KEYS.fixos, fixos); }
export function savePendencias(p: Pendencia[]) { syncSave(KEYS.pendencias, p); }
export function saveEmprestimos(e: Emprestimo[]) { syncSave(KEYS.emprestimos, e); }
export function saveOrcamentos(o: Orcamento[]) { syncSave(KEYS.orcamentos, o); }
export function saveCaixinhas(c: Caixinha[]) { syncSave(KEYS.caixinhas, c); }
export function saveMetas(m: MetasFinanceiras) { syncSave(KEYS.metas, m); }

// ─── Caixinhas helpers ───

export function saldoCaixinha(c: Caixinha): number {
  return c.movimentos.reduce((a, m) => a + (m.tipo === "deposito" ? m.valor : -m.valor), 0);
}

export function totalReservado(caixinhas: Caixinha[]): number {
  return caixinhas
    .filter((c) => !c.arquivada)
    .reduce((a, c) => a + saldoCaixinha(c), 0);
}

/**
 * Saldo virtual de uma caixinha: saldo real + valores que ainda vão entrar.
 * Soma: pendências "a receber" abertas vinculadas + restante de empréstimos
 * "emprestei" vinculados.
 */
export interface SaldoVirtualCaixinha {
  real: number;
  a_receber: number;
  total: number;
  fontes: Array<{ tipo: "pendencia" | "emprestimo"; desc: string; valor: number }>;
}

export function saldoVirtualCaixinha(
  c: Caixinha,
  pendencias: Pendencia[],
  emprestimos: Emprestimo[]
): SaldoVirtualCaixinha {
  const real = saldoCaixinha(c);
  const fontes: SaldoVirtualCaixinha["fontes"] = [];
  let a_receber = 0;

  for (const p of pendencias) {
    if (p.caixinha_id !== c.id) continue;
    if (p.kind !== "receber") continue;
    if (p.status !== "aberto") continue;
    const restante = valorRestantePendencia(p);
    if (restante <= 0) continue;
    a_receber += restante;
    fontes.push({ tipo: "pendencia", desc: p.desc, valor: restante });
  }

  for (const e of emprestimos) {
    if (e.caixinha_id !== c.id) continue;
    if (e.direcao !== "emprestei") continue;
    const restante = emprestimoRestante(e);
    if (restante <= 0) continue;
    a_receber += restante;
    fontes.push({ tipo: "emprestimo", desc: e.pessoa, valor: restante });
  }

  return { real, a_receber, total: real + a_receber, fontes };
}

/** Depósitos feitos em uma caixinha durante um mês específico. */
export function depositosNoMesCaixinha(c: Caixinha, y: number, m: number): number {
  return c.movimentos
    .filter((mv) => mv.tipo === "deposito")
    .filter((mv) => {
      const d = new Date(mv.data + "T12:00:00");
      return d.getFullYear() === y && d.getMonth() === m;
    })
    .reduce((a, mv) => a + mv.valor, 0);
}

export function progressoCaixinha(c: Caixinha): number {
  if (!c.meta || c.meta <= 0) return 0;
  return Math.min(100, (saldoCaixinha(c) / c.meta) * 100);
}

// ─── Saldos globais (o que o usuário realmente tem) ───

/**
 * Saldo real: o que já caiu/saiu da conta até hoje.
 * Caixinhas estão DENTRO disso (são só etiquetas).
 * Fixos só contam se foram realizados (viraram tx).
 */
export function saldoReal(data: FinancasData): number {
  const hoje = hojeISO();
  let saldo = 0;
  for (const t of data.txs) {
    if (t.date > hoje) continue;
    if (isEntrada(t.type)) saldo += t.val;
    else saldo -= t.val;
  }
  return saldo;
}

/** Saldo real menos o que está reservado em caixinhas. */
export function saldoLivre(data: FinancasData): number {
  return saldoReal(data) - totalReservado(data.caixinhas);
}

/** Crédito positivo total em cartões ativos (dinheiro que ainda vai ser consumido). */
export function creditoTotalCartoes(cartoes: Cartao[]): number {
  return cartoes
    .filter((c) => c.ativo)
    .reduce((a, c) => a + Math.max(0, saldoPositivoCartao(c)), 0);
}

/** Dívida líquida do cartão no mês = fatura − saldo positivo (nunca negativa). */
export function dividaCartaoMes(
  cartao: Cartao,
  txs: Transacao[],
  fixos: FixoItem[],
  y: number,
  m: number
): number {
  const fat = faturaCartaoMes(cartao.nome, txs, fixos, y, m).total;
  const saldo = Math.max(0, saldoPositivoCartao(cartao));
  return Math.max(0, fat - saldo);
}

/** Dívida total no mês somada sobre todos os cartões ativos. */
export function dividaTotalCartoesMes(
  cartoes: Cartao[],
  txs: Transacao[],
  fixos: FixoItem[],
  y: number,
  m: number
): number {
  return cartoes
    .filter((c) => c.ativo)
    .reduce((a, c) => a + dividaCartaoMes(c, txs, fixos, y, m), 0);
}

/**
 * Aplica efeito de categoria vinculada: se uma tx cai numa categoria que tem
 * caixinha vinculada, move dinheiro automaticamente (entrada → depósito; gasto → saque).
 *
 * Regras para evitar inconsistências:
 * - Só aplica em txs com data <= hoje (já realizadas). Parcelas futuras e
 *   gastos agendados no futuro NÃO disparam movimento (mantém consistência
 *   com saldoReal, que também ignora txs futuras).
 * - `skipCaixinhaIds` pula caixinhas específicas (quando o caller já aplicou
 *   manualmente um movimento — ex: pendência com caixinha_id ou fixo com
 *   caixinha de origem). Evita dupla contagem.
 *
 * O movimento gerado tem notas `Auto(tx:${tx.id})` para permitir reversão
 * exata em deletes e edições.
 *
 * Retorna o array atualizado de caixinhas.
 */
export function aplicarCategoriaCaixinhas(
  tx: Transacao,
  caixinhas: Caixinha[],
  skipCaixinhaIds?: number[]
): Caixinha[] {
  // Só aplica em txs realizadas
  if (tx.date > hojeISO()) return caixinhas;

  const entrada = isEntrada(tx.type);
  const skip = new Set(skipCaixinhaIds || []);
  return caixinhas.map((c) => {
    if (c.arquivada) return c;
    if (skip.has(c.id)) return c;
    if (!c.cat_vinculada || c.cat_vinculada !== tx.cat) return c;
    const disponivel = saldoCaixinha(c);
    const valor = entrada ? tx.val : Math.min(tx.val, disponivel);
    if (valor <= 0) return c;
    const mov: MovimentoCaixinha = {
      id: nextId(),
      tipo: entrada ? "deposito" : "saque",
      valor,
      data: tx.date,
      notas: `Auto(tx:${tx.id})`,
    };
    return { ...c, movimentos: [...c.movimentos, mov] };
  });
}

/**
 * Remove movimentos auto-gerados por uma tx que foi deletada/editada.
 * Busca por notas === `Auto(tx:${txId})` em TODAS as caixinhas não arquivadas.
 */
export function reverterCategoriaCaixinhas(
  txId: number,
  caixinhas: Caixinha[]
): Caixinha[] {
  const tag = `Auto(tx:${txId})`;
  return caixinhas.map((c) => {
    const filtered = c.movimentos.filter((m) => m.notas !== tag);
    if (filtered.length === c.movimentos.length) return c;
    return { ...c, movimentos: filtered };
  });
}

// ─── Disponível e metas mensais ───

export interface ResumoMensal {
  entradas_realizadas: number;
  entradas_previstas: number;
  entradas_total: number;
  gastos_realizados: number;
  gastos_previstos: number;
  gastos_total: number;
  saldo_realizado: number;
  saldo_projetado: number;
  disponivel: number;
  dias_restantes: number;
  por_dia_restante: number;
  meta_economia: number;
  economia_atual: number;
  meta_gasto_max: number;
  taxa_poupanca: number;
}

export function diasRestantesDoMes(y: number, m: number): number {
  const hoje = new Date();
  if (hoje.getFullYear() !== y || hoje.getMonth() !== m) {
    const dd = new Date(y, m + 1, 0);
    return dd.getDate();
  }
  const fim = new Date(y, m + 1, 0);
  const diff = fim.getDate() - hoje.getDate() + 1;
  return Math.max(1, diff);
}

export function resumoMensal(
  data: FinancasData, y: number, m: number
): ResumoMensal {
  // Entradas e gastos realizados (txs)
  const noMes = (date: string) => {
    const d = new Date(date + "T12:00:00");
    return d.getFullYear() === y && d.getMonth() === m;
  };
  let e_real = 0, g_real = 0;
  for (const t of data.txs) {
    if (!noMes(t.date)) continue;
    if (isEntrada(t.type)) e_real += t.val;
    else g_real += t.val;
  }
  // Fixos ativos do mês que AINDA não foram realizados (para evitar dupla
  // contagem com a tx real criada em realizarFixo).
  for (const f of data.fixos) {
    if (f.active === false) continue;
    if (fixoRealizadoEm(f, y, m)) continue;
    if (f.type === "entrada_fixa") e_real += f.val;
    else g_real += f.val;
  }

  // Pendências abertas do mês
  let e_prev = 0, g_prev = 0;
  for (const p of data.pendencias) {
    if (p.status !== "aberto") continue;
    if (!noMes(p.date_due)) continue;
    if (p.kind === "receber") e_prev += p.val;
    else g_prev += p.val;
  }

  const entradas_total = e_real + e_prev;
  const gastos_total = g_real + g_prev;
  const saldo_realizado = e_real - g_real;
  const saldo_projetado = entradas_total - gastos_total;

  const meta_economia = data.metas.economia_mensal || 0;
  const meta_gasto_max = data.metas.gasto_maximo_mensal || 0;

  const disponivel = Math.max(0, saldo_projetado - meta_economia);
  const dias = diasRestantesDoMes(y, m);
  const por_dia = dias > 0 ? disponivel / dias : 0;

  // Economia real do mês = entradas realizadas - gastos realizados (se positivo)
  const economia_atual = Math.max(0, saldo_realizado);

  const taxa = entradas_total > 0 ? (Math.max(0, saldo_projetado) / entradas_total) * 100 : 0;

  return {
    entradas_realizadas: e_real,
    entradas_previstas: e_prev,
    entradas_total,
    gastos_realizados: g_real,
    gastos_previstos: g_prev,
    gastos_total,
    saldo_realizado,
    saldo_projetado,
    disponivel,
    dias_restantes: dias,
    por_dia_restante: por_dia,
    meta_economia,
    economia_atual,
    meta_gasto_max,
    taxa_poupanca: taxa,
  };
}

// ─── Empréstimo helpers ───

export function emprestimoPago(e: Emprestimo): number {
  return e.pagamentos.reduce((a, p) => a + p.valor, 0);
}
export function emprestimoRestante(e: Emprestimo): number {
  return Math.max(0, e.valor_original - emprestimoPago(e));
}
export function emprestimoPct(e: Emprestimo): number {
  if (e.valor_original <= 0) return 0;
  return Math.min(100, (emprestimoPago(e) / e.valor_original) * 100);
}

/** Cria transação para um pagamento/recebimento de empréstimo. */
export function pagamentoEmprestimoToTx(e: Emprestimo, p: PagamentoEmprestimo): Transacao {
  const entrada = e.direcao === "emprestei";
  return {
    id: nextId(),
    desc: `Empréstimo ${e.direcao === "emprestei" ? "recebido de" : "pago a"} ${e.pessoa}`,
    val: p.valor,
    date: p.data,
    type: entrada ? "entrada" : "variavel",
    cat: e.cat || "Outros",
    pay: e.pay || "pix",
    parc: null,
    pg: null,
  };
}

// ─── Orçamento helpers ───

export function gastosPorCategoriaMes(
  data: { txs: Transacao[]; fixos: FixoItem[] }, y: number, m: number
): Record<string, number> {
  const out: Record<string, number> = {};
  const reais = data.txs.filter((t) => {
    const d = new Date(t.date + "T12:00:00");
    return d.getFullYear() === y && d.getMonth() === m && !isEntrada(t.type);
  });
  for (const t of reais) out[t.cat || "Outros"] = (out[t.cat || "Outros"] || 0) + t.val;
  // Inclui fixos virtuais (não realizados) — realizados já foram contados como tx
  for (const f of data.fixos) {
    if (f.active === false || f.type !== "fixo") continue;
    if (fixoRealizadoEm(f, y, m)) continue;
    out[f.cat || "Outros"] = (out[f.cat || "Outros"] || 0) + f.val;
  }
  return out;
}

// ─── Pendência helpers ───

export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Adiciona N meses a uma data-base sem rolover de dia. Se o dia não existe
 * no mês alvo (ex: 31 em fevereiro), usa o último dia do mês alvo.
 * Retorna string "YYYY-MM-DD".
 */
export function addMesesSemRollover(baseISO: string, meses: number): string {
  const [y, m, d] = baseISO.split("-").map(Number);
  const alvoY = meses === 0 ? y : new Date(y, m - 1 + meses, 1).getFullYear();
  const alvoM = meses === 0 ? m - 1 : new Date(y, m - 1 + meses, 1).getMonth();
  const ultimoDia = new Date(alvoY, alvoM + 1, 0).getDate();
  const diaFinal = Math.min(d, ultimoDia);
  return `${alvoY}-${String(alvoM + 1).padStart(2, "0")}-${String(diaFinal).padStart(2, "0")}`;
}

export function isVencida(p: Pendencia): boolean {
  return p.status === "aberto" && p.date_due < hojeISO();
}

export function diasAteVencer(p: Pendencia): number {
  const due = new Date(p.date_due + "T12:00:00").getTime();
  const now = new Date(hojeISO() + "T12:00:00").getTime();
  return Math.round((due - now) / (1000 * 60 * 60 * 24));
}

export interface ResumoPendencias {
  a_pagar_total: number;
  a_receber_total: number;
  a_pagar_30d: number;
  a_receber_30d: number;
  vencidos_pagar: number;
  vencidos_receber: number;
  qtd_vencidas: number;
  qtd_proximas_7d: number;
}

export function resumoPendencias(pendencias: Pendencia[]): ResumoPendencias {
  const hoje = hojeISO();
  const d30 = new Date(); d30.setDate(d30.getDate() + 30);
  const em30 = d30.toISOString().slice(0, 10);
  const d7 = new Date(); d7.setDate(d7.getDate() + 7);
  const em7 = d7.toISOString().slice(0, 10);
  const r: ResumoPendencias = {
    a_pagar_total: 0, a_receber_total: 0,
    a_pagar_30d: 0, a_receber_30d: 0,
    vencidos_pagar: 0, vencidos_receber: 0,
    qtd_vencidas: 0, qtd_proximas_7d: 0,
  };
  for (const p of pendencias) {
    if (p.status !== "aberto") continue;
    if (p.kind === "pagar") r.a_pagar_total += p.val;
    else r.a_receber_total += p.val;
    if (p.date_due < hoje) {
      r.qtd_vencidas++;
      if (p.kind === "pagar") r.vencidos_pagar += p.val;
      else r.vencidos_receber += p.val;
    } else {
      if (p.date_due <= em7) r.qtd_proximas_7d++;
      if (p.date_due <= em30) {
        if (p.kind === "pagar") r.a_pagar_30d += p.val;
        else r.a_receber_30d += p.val;
      }
    }
  }
  return r;
}

/** Agrupa pendências parceladas (dívidas) por parent_id. */
export interface DividaGrupo {
  parent_id: number;
  desc: string;
  credor: string;
  kind: PendenciaKind;
  parcelas: Pendencia[];
  total: number;
  pago: number;
  restante: number;
  pct: number;
  proxima?: Pendencia;
}

export function agruparDividas(pendencias: Pendencia[]): DividaGrupo[] {
  const groups: Record<number, Pendencia[]> = {};
  for (const p of pendencias) {
    if (!p.parent_id || !p.parc_total || p.parc_total < 2) continue;
    if (!groups[p.parent_id]) groups[p.parent_id] = [];
    groups[p.parent_id].push(p);
  }
  const out: DividaGrupo[] = [];
  for (const key of Object.keys(groups)) {
    const parent_id = Number(key);
    const parcelas = groups[parent_id];
    parcelas.sort((a: Pendencia, b: Pendencia) => (a.parc_num || 0) - (b.parc_num || 0));
    const total = parcelas.reduce((a: number, p: Pendencia) => a + p.val, 0);
    const pago = parcelas
      .filter((p: Pendencia) => p.status === "quitado")
      .reduce((a: number, p: Pendencia) => a + p.val, 0);
    const proxima = parcelas.find((p: Pendencia) => p.status === "aberto");
    out.push({
      parent_id,
      desc: parcelas[0].desc.replace(/ \(\d+\/\d+\)$/, ""),
      credor: parcelas[0].credor || "",
      kind: parcelas[0].kind,
      parcelas,
      total,
      pago,
      restante: total - pago,
      pct: total > 0 ? (pago / total) * 100 : 0,
      proxima,
    });
  }
  return out.sort((a, b) => {
    if (!a.proxima && b.proxima) return 1;
    if (a.proxima && !b.proxima) return -1;
    return (a.proxima?.date_due || "").localeCompare(b.proxima?.date_due || "");
  });
}

/** Cria transação realizada a partir de uma pendência (quitação).
 *  `pg` usa parent_id negativo para evitar colisão com grupos de parcelas
 *  de compras no cartão (que usam pg positivo). */
export function pendenciaToTx(p: Pendencia, payDate: string, valor?: number): Transacao {
  return {
    id: nextId(),
    desc: p.desc,
    val: valor ?? p.val,
    date: payDate,
    type: p.kind === "pagar" ? "variavel" : "entrada",
    cat: p.cat,
    pay: p.pay,
    parc: p.parc_num && p.parc_total ? `${p.parc_num}/${p.parc_total}` : null,
    pg: p.parent_id ? -Math.abs(p.parent_id) : null,
  };
}

/** Quanto já foi pago de uma pendência (pagamentos parciais). */
export function valorPagoPendencia(p: Pendencia): number {
  return (p.pagamentos_parciais || []).reduce((a, pp) => a + pp.valor, 0);
}

/** Quanto ainda resta pagar de uma pendência. */
export function valorRestantePendencia(p: Pendencia): number {
  return Math.max(0, p.val - valorPagoPendencia(p));
}

// ─── Helpers ───

export const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export function fmtBRL(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export function fmtDiaMes(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function labelPay(pay: string): string {
  if (!pay) return "Pix";
  if (pay.startsWith("c:")) return `Cartão: ${pay.slice(2)}`;
  return pay.charAt(0).toUpperCase() + pay.slice(1);
}

export function isEntrada(type: string): boolean {
  return type === "entrada" || type === "entrada_fixa" || type === "ganho";
}

export function fixoMesKey(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function fixoRealizadoEm(f: FixoItem, y: number, m: number): boolean {
  return !!f.realizacoes?.[fixoMesKey(y, m)];
}

/** Virtual transações que representam os itens fixos ativos NÃO realizados no mês */
export function materializarFixos(fixos: FixoItem[], y: number, m: number): Transacao[] {
  const lastDay = new Date(y, m + 1, 0).getDate();
  return fixos
    .filter((f) => f.active !== false && !fixoRealizadoEm(f, y, m))
    .map((f) => {
      const day = Math.min(f.day || 5, lastDay);
      const date = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return {
        id: -f.id,
        desc: f.desc,
        val: f.val,
        date,
        type: f.type === "entrada_fixa" ? "entrada" : "fixo",
        cat: f.cat,
        pay: f.pay,
        parc: null,
        pg: null,
        _fixo: true,
      } as Transacao & { _fixo?: boolean };
    });
}

export function lancamentosDoMes(d: FinancasData, y: number, m: number) {
  const reais = d.txs.filter((t) => {
    const dt = new Date(t.date + "T12:00:00");
    return dt.getFullYear() === y && dt.getMonth() === m;
  });
  const fixos = materializarFixos(d.fixos, y, m);
  return [...reais, ...fixos].sort((a, b) => b.date.localeCompare(a.date));
}

// Counter monotônico em memória + base Date.now() garantem unicidade mesmo
// em calls sucessivas no mesmo ms. Persistência entre reloads é dispensável
// porque o Date.now() avança a cada ms.
let _idCounter = 0;
let _idLastBase = 0;
export function nextId(): number {
  const base = Date.now();
  if (base === _idLastBase) {
    _idCounter++;
  } else {
    _idLastBase = base;
    _idCounter = 0;
  }
  return base * 1000 + _idCounter;
}
