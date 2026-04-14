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

export interface FinancasData {
  cats: Categoria[];
  txs: Transacao[];
  fixos: FixoItem[];
}

const KEYS = {
  cats: "fin:cats",
  txs: "fin:txs",
  fixos: "fin:fixos",
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
  };
}

export function saveCats(cats: Categoria[]) { syncSave(KEYS.cats, cats); }
export function saveTxs(txs: Transacao[]) { syncSave(KEYS.txs, txs); }
export function saveFixos(fixos: FixoItem[]) { syncSave(KEYS.fixos, fixos); }

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
