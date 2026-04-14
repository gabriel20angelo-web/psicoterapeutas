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
}

export type PendenciaKind = "pagar" | "receber";
export type PendenciaStatus = "aberto" | "quitado" | "cancelado";

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
}

export interface Orcamento {
  cat: string;
  limite: number;
}

export interface FinancasData {
  cats: Categoria[];
  txs: Transacao[];
  fixos: FixoItem[];
  pendencias: Pendencia[];
  emprestimos: Emprestimo[];
  orcamentos: Orcamento[];
}

const KEYS = {
  cats: "fin:cats",
  txs: "fin:txs",
  fixos: "fin:fixos",
  pendencias: "fin:pendencias",
  emprestimos: "fin:emprestimos",
  orcamentos: "fin:orcamentos",
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
  };
}

export function saveCats(cats: Categoria[]) { syncSave(KEYS.cats, cats); }
export function saveTxs(txs: Transacao[]) { syncSave(KEYS.txs, txs); }
export function saveFixos(fixos: FixoItem[]) { syncSave(KEYS.fixos, fixos); }
export function savePendencias(p: Pendencia[]) { syncSave(KEYS.pendencias, p); }
export function saveEmprestimos(e: Emprestimo[]) { syncSave(KEYS.emprestimos, e); }
export function saveOrcamentos(o: Orcamento[]) { syncSave(KEYS.orcamentos, o); }

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
  // Include fixos (virtuais)
  for (const f of data.fixos) {
    if (f.active === false || f.type !== "fixo") continue;
    out[f.cat || "Outros"] = (out[f.cat || "Outros"] || 0) + f.val;
  }
  return out;
}

// ─── Pendência helpers ───

export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
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

/** Cria transação realizada a partir de uma pendência (quitação). */
export function pendenciaToTx(p: Pendencia, payDate: string): Transacao {
  return {
    id: nextId(),
    desc: p.desc,
    val: p.val,
    date: payDate,
    type: p.kind === "pagar" ? "variavel" : "entrada",
    cat: p.cat,
    pay: p.pay,
    parc: p.parc_num && p.parc_total ? `${p.parc_num}/${p.parc_total}` : null,
    pg: p.parent_id || null,
  };
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

/** Virtual transações que representam os itens fixos ativos no mês */
export function materializarFixos(fixos: FixoItem[], y: number, m: number): Transacao[] {
  const lastDay = new Date(y, m + 1, 0).getDate();
  return fixos
    .filter((f) => f.active !== false)
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

export function nextId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}
