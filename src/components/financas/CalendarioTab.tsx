"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, ArrowDownRight, X } from "lucide-react";
import {
  type Transacao, type Categoria,
  fmtBRL, isEntrada, MESES,
} from "@/lib/financas-data";

export interface CalendarioTabProps {
  txs: Transacao[];
  cats: Categoria[];
  mY: number;
  mM: number;
}

type Selection =
  | { kind: "day"; date: string }
  | { kind: "week"; start: string; end: string };

function isoOf(y: number, m: number, d: number): string {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return isoOf(d.getFullYear(), d.getMonth(), d.getDate());
}

function fmtDiaLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

export default function CalendarioTab({ txs, cats, mY, mM }: CalendarioTabProps) {
  const [sel, setSel] = useState<Selection | null>(null);

  const catColor = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of cats) m[c.n] = c.c;
    return m;
  }, [cats]);

  // txs only of this month (real ones, filtered by date)
  const txsMes = useMemo(() => {
    return txs.filter((t) => {
      const d = new Date(t.date + "T12:00:00");
      return d.getFullYear() === mY && d.getMonth() === mM;
    });
  }, [txs, mY, mM]);

  // Group by day: YYYY-MM-DD → { entradas, saidas, items }
  const porDia = useMemo(() => {
    const m = new Map<string, { entradas: number; saidas: number; items: Transacao[] }>();
    for (const t of txsMes) {
      const g = m.get(t.date) || { entradas: 0, saidas: 0, items: [] };
      if (isEntrada(t.type)) g.entradas += t.val;
      else g.saidas += t.val;
      g.items.push(t);
      m.set(t.date, g);
    }
    return m;
  }, [txsMes]);

  // Build calendar grid (6 weeks × 7 days)
  const grid = useMemo(() => {
    const first = new Date(mY, mM, 1);
    const startDow = first.getDay(); // 0=Sun
    const daysInMonth = new Date(mY, mM + 1, 0).getDate();
    const cells: { iso: string; inMonth: boolean; day: number }[] = [];

    // Leading days from previous month
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(mY, mM, -i);
      cells.push({
        iso: isoOf(d.getFullYear(), d.getMonth(), d.getDate()),
        inMonth: false,
        day: d.getDate(),
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ iso: isoOf(mY, mM, d), inMonth: true, day: d });
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1];
      const next = addDaysISO(last.iso, 1);
      const nd = new Date(next + "T12:00:00");
      cells.push({ iso: next, inMonth: nd.getMonth() === mM, day: nd.getDate() });
      if (cells.length >= 42) break;
    }

    // Split into weeks
    const weeks: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [mY, mM]);

  // Helper: aggregate a range of dates
  function aggregate(dates: string[]) {
    let entradas = 0, saidas = 0;
    const items: Transacao[] = [];
    for (const d of dates) {
      const g = porDia.get(d);
      if (!g) continue;
      entradas += g.entradas;
      saidas += g.saidas;
      items.push(...g.items);
    }
    const porCat = new Map<string, number>();
    for (const t of items) {
      if (isEntrada(t.type)) continue;
      porCat.set(t.cat || "Outros", (porCat.get(t.cat || "Outros") || 0) + t.val);
    }
    const topCats = Array.from(porCat.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return { entradas, saidas, saldo: entradas - saidas, items, topCats };
  }

  const selAgg = useMemo(() => {
    if (!sel) return null;
    if (sel.kind === "day") return aggregate([sel.date]);
    const dates: string[] = [];
    let cur = sel.start;
    while (cur <= sel.end) {
      dates.push(cur);
      cur = addDaysISO(cur, 1);
    }
    return aggregate(dates);
  }, [sel, porDia]);

  // Month totals for header
  const totalMes = useMemo(() => {
    let e = 0, s = 0;
    porDia.forEach((g) => { e += g.entradas; s += g.saidas; });
    return { entradas: e, saidas: s, saldo: e - s };
  }, [porDia]);

  return (
    <div>
      {/* Header: month totals */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard label="Entradas" val={totalMes.entradas} color="#10b981" />
        <StatCard label="Saídas" val={totalMes.saidas} color="#ef4444" />
        <StatCard label="Saldo" val={totalMes.saldo} color={totalMes.saldo >= 0 ? "#10b981" : "#ef4444"} signed />
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-8 gap-1 mb-1">
        <div />
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="text-center font-dm text-[10px] font-semibold" style={{ color: "var(--text-tertiary)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex flex-col gap-1">
        {grid.map((week, wi) => {
          const weekStart = week[0].iso;
          const weekEnd = week[6].iso;
          const weekDates = week.map((c) => c.iso);
          const weekAgg = aggregate(weekDates);
          const weekActive = sel?.kind === "week" && sel.start === weekStart;

          return (
            <div key={wi} className="grid grid-cols-8 gap-1">
              {/* Week button (left column) */}
              <button
                onClick={() => setSel(weekActive ? null : { kind: "week", start: weekStart, end: weekEnd })}
                className="rounded-lg p-1 flex flex-col items-center justify-center transition-all"
                style={{
                  background: weekActive ? "var(--bg-hover)" : "var(--bg-card)",
                  border: `1px solid ${weekActive ? "var(--orange-500)" : "var(--border-default)"}`,
                  minHeight: 56,
                }}
                title={`Semana ${wi + 1}`}
              >
                <span className="font-dm text-[9px] font-semibold" style={{ color: "var(--text-tertiary)" }}>SEM</span>
                <span className="font-dm text-[10px] font-bold" style={{ color: weekAgg.saldo >= 0 ? "#10b981" : "#ef4444" }}>
                  {weekAgg.saldo >= 0 ? "+" : ""}{fmtBRL(Math.abs(weekAgg.saldo))}
                </span>
              </button>

              {/* Day cells */}
              {week.map((cell) => {
                const g = porDia.get(cell.iso);
                const isActive = sel?.kind === "day" && sel.date === cell.iso;
                const hasData = !!g;
                return (
                  <button
                    key={cell.iso}
                    onClick={() => setSel(isActive ? null : { kind: "day", date: cell.iso })}
                    className="rounded-lg p-1 flex flex-col items-center justify-start transition-all relative"
                    style={{
                      background: isActive ? "var(--bg-hover)" : "var(--bg-card)",
                      border: `1px solid ${isActive ? "var(--orange-500)" : "var(--border-default)"}`,
                      opacity: cell.inMonth ? 1 : 0.35,
                      minHeight: 56,
                    }}
                  >
                    <span
                      className="font-dm text-[11px] font-semibold"
                      style={{ color: cell.inMonth ? "var(--text-primary)" : "var(--text-tertiary)" }}
                    >
                      {cell.day}
                    </span>
                    {hasData && (
                      <div className="flex flex-col items-center gap-[1px] mt-0.5">
                        {g!.entradas > 0 && (
                          <span className="font-dm text-[8px] font-bold leading-none" style={{ color: "#10b981" }}>
                            +{fmtBRL(g!.entradas)}
                          </span>
                        )}
                        {g!.saidas > 0 && (
                          <span className="font-dm text-[8px] font-bold leading-none" style={{ color: "#ef4444" }}>
                            -{fmtBRL(g!.saidas)}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Detail panel */}
      {sel && selAgg && (
        <div
          className="mt-5 rounded-xl p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-dm text-[10px] font-semibold uppercase" style={{ color: "var(--text-tertiary)" }}>
                {sel.kind === "day" ? "Dia" : "Semana"}
              </div>
              <div className="font-dm text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                {sel.kind === "day"
                  ? fmtDiaLabel(sel.date)
                  : `${fmtDiaLabel(sel.start)} — ${fmtDiaLabel(sel.end)}`}
              </div>
            </div>
            <button
              onClick={() => setSel(null)}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
              aria-label="Fechar"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatCard label="Entradas" val={selAgg.entradas} color="#10b981" compact />
            <StatCard label="Saídas" val={selAgg.saidas} color="#ef4444" compact />
            <StatCard label="Saldo" val={selAgg.saldo} color={selAgg.saldo >= 0 ? "#10b981" : "#ef4444"} signed compact />
          </div>

          {selAgg.topCats.length > 0 && (
            <div className="mb-4">
              <div className="font-dm text-[10px] font-semibold uppercase mb-2" style={{ color: "var(--text-tertiary)" }}>
                Categorias mais frequentes
              </div>
              <div className="flex flex-col gap-1.5">
                {selAgg.topCats.map(([cat, val]) => {
                  const pct = selAgg.saidas > 0 ? (val / selAgg.saidas) * 100 : 0;
                  const color = catColor[cat] || "#60a5fa";
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: color }}
                      />
                      <span className="font-dm text-xs flex-1 truncate" style={{ color: "var(--text-primary)" }}>
                        {cat}
                      </span>
                      <span className="font-dm text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        {pct.toFixed(0)}%
                      </span>
                      <span className="font-dm text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                        R$ {fmtBRL(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selAgg.items.length > 0 ? (
            <div>
              <div className="font-dm text-[10px] font-semibold uppercase mb-2" style={{ color: "var(--text-tertiary)" }}>
                Lançamentos ({selAgg.items.length})
              </div>
              <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
                {selAgg.items
                  .slice()
                  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
                  .map((t) => {
                    const entr = isEntrada(t.type);
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-2 p-2 rounded-lg"
                        style={{ background: "var(--bg-hover)" }}
                      >
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{
                            background: entr ? "rgba(16,185,129,.12)" : "rgba(239,68,68,.12)",
                            color: entr ? "#10b981" : "#ef4444",
                          }}
                        >
                          {entr ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-dm text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                            {t.desc || "(sem descrição)"}
                          </div>
                          <div className="font-dm text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                            {t.cat || "Outros"}
                            {sel.kind === "week" && ` · ${fmtDiaLabel(t.date)}`}
                          </div>
                        </div>
                        <span
                          className="font-dm text-xs font-bold"
                          style={{ color: entr ? "#10b981" : "#ef4444" }}
                        >
                          {entr ? "+" : "-"}R$ {fmtBRL(t.val)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div
              className="font-dm text-xs text-center py-3"
              style={{ color: "var(--text-tertiary)" }}
            >
              Nenhum lançamento neste período.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, val, color, signed, compact,
}: { label: string; val: number; color: string; signed?: boolean; compact?: boolean }) {
  return (
    <div
      className={`rounded-xl ${compact ? "p-2" : "p-3"}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}
    >
      <div className="font-dm text-[9px] font-semibold uppercase" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </div>
      <div className={`font-dm font-bold ${compact ? "text-xs" : "text-sm"}`} style={{ color }}>
        {signed && val >= 0 ? "+" : ""}{signed && val < 0 ? "-" : ""}R$ {fmtBRL(Math.abs(val))}
      </div>
    </div>
  );
}
