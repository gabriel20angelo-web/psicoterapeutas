"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  Wallet, Plus, Minus, ChevronLeft, ChevronRight,
  Pencil, Trash2, Pause, Play, Download, Upload, Repeat, AlertCircle, Bell,
} from "lucide-react";
import Shell from "@/components/Shell";
import EmptyState from "@/components/ui/EmptyState";
import PendenciasTab from "@/components/financas/PendenciasTab";
import MetasTab from "@/components/financas/MetasTab";
import {
  getFinancas, saveCats, saveTxs, saveFixos, savePendencias, saveEmprestimos, saveOrcamentos,
  saveCaixinhas, saveMetas,
  MESES, fmtBRL, fmtDiaMes, labelPay, isEntrada, lancamentosDoMes, nextId,
  resumoPendencias, pendenciaToTx, hojeISO, pagamentoEmprestimoToTx, gastosPorCategoriaMes,
  resumoMensal, totalReservado,
  type FinancasData, type Transacao, type FixoItem, type Categoria, type TxType, type Pendencia,
  type Emprestimo, type PagamentoEmprestimo, type Orcamento, type Caixinha, type MetasFinanceiras,
} from "@/lib/financas-data";

type TabId = "lancamentos" | "fixos" | "pendencias" | "metas" | "categorias" | "graficos" | "projecao";

const TABS: { id: TabId; label: string }[] = [
  { id: "lancamentos", label: "Lançamentos" },
  { id: "fixos", label: "Fixos" },
  { id: "pendencias", label: "Pendências" },
  { id: "metas", label: "Metas & Caixinhas" },
  { id: "categorias", label: "Categorias" },
  { id: "graficos", label: "Gráficos" },
  { id: "projecao", label: "Projeção" },
];

const TIPO_LABEL: Record<string, string> = {
  fixo: "Fixo", variavel: "Variável", pontual: "Pontual",
  entrada: "Entrada", entrada_fixa: "Entrada fixa", ganho: "Entrada",
};

function tipoPillStyle(type: string): React.CSSProperties {
  if (type === "fixo") return { background: "rgba(96,165,250,.12)", color: "#60a5fa" };
  if (type === "variavel") return { background: "rgba(251,191,36,.12)", color: "#d4a017" };
  if (type === "pontual") return { background: "rgba(251,146,60,.12)", color: "#ea580c" };
  return { background: "rgba(52,211,153,.12)", color: "#10b981" };
}

// ─── Page ──────────────────────────────────────────

export default function FinancasPage() {
  return (
    <Shell>
      <FinancasInner />
    </Shell>
  );
}

function FinancasInner() {
  const [data, setData] = useState<FinancasData>({
    cats: [], txs: [], fixos: [], pendencias: [], emprestimos: [], orcamentos: [],
    caixinhas: [], metas: {},
  });
  const [tab, setTab] = useState<TabId>("lancamentos");
  const [mY, setMY] = useState(() => new Date().getFullYear());
  const [mM, setMM] = useState(() => new Date().getMonth());

  // Modal state (lançamento)
  const [modal, setModal] = useState<null | { mode: "gasto" | "entrada"; editId: number | null }>(null);

  // Fixo form state
  const [fxEdit, setFxEdit] = useState<FixoItem | null>(null);

  useEffect(() => {
    setData(getFinancas());
  }, []);

  function commit(next: Partial<FinancasData>) {
    setData((d) => {
      const merged = { ...d, ...next };
      if (next.cats) saveCats(next.cats);
      if (next.txs) saveTxs(next.txs);
      if (next.fixos) saveFixos(next.fixos);
      if (next.pendencias) savePendencias(next.pendencias);
      if (next.emprestimos) saveEmprestimos(next.emprestimos);
      if (next.orcamentos) saveOrcamentos(next.orcamentos);
      if (next.caixinhas) saveCaixinhas(next.caixinhas);
      if (next.metas) saveMetas(next.metas);
      return merged;
    });
  }

  const txs = useMemo(() => lancamentosDoMes(data, mY, mM), [data, mY, mM]);

  // Summary
  const sum = useMemo(() => {
    let entradas = 0, gastos = 0, fixo = 0, variavel = 0;
    for (const t of txs) {
      if (isEntrada(t.type)) entradas += t.val;
      else {
        gastos += t.val;
        if (t.type === "fixo") fixo += t.val;
        if (t.type === "variavel") variavel += t.val;
      }
    }
    return { entradas, gastos, saldo: entradas - gastos, fixo, variavel };
  }, [txs]);

  function chgMonth(delta: number) {
    let y = mY, m = mM + delta;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setMY(y); setMM(m);
  }

  // ─── Import / Export ───
  const fileRef = useRef<HTMLInputElement>(null);

  function exportJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.download = `financeiro-${new Date().toISOString().slice(0, 10)}.json`;
    a.href = URL.createObjectURL(blob);
    a.click();
  }

  function importJSON(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const d = JSON.parse(String(e.target?.result));
        if (d.txs && d.cats) {
          if (!d.fixos) d.fixos = [];
          if (!d.pendencias) d.pendencias = [];
          if (!d.emprestimos) d.emprestimos = [];
          if (!d.orcamentos) d.orcamentos = [];
          if (!d.caixinhas) d.caixinhas = [];
          if (!d.metas) d.metas = {};
          commit(d);
          alert("Importado com sucesso.");
        } else alert("Arquivo inválido.");
      } catch { alert("Erro ao ler arquivo."); }
    };
    r.readAsText(f);
    ev.target.value = "";
  }

  // ─── Lançamento CRUD ───

  function deleteTx(id: number) {
    if (!confirm("Excluir este lançamento?")) return;
    commit({ txs: data.txs.filter((t) => t.id !== id) });
  }

  function submitTx(form: TxForm) {
    const { desc, val, date, type, cat, pay, parcelado, parcelas, editId } = form;
    if (!desc.trim() || isNaN(val) || !date) { alert("Preencha todos os campos."); return; }
    let newTxs = [...data.txs];
    if (editId) {
      newTxs = newTxs.map((t) => t.id === editId ? { ...t, desc, val, date, type, cat, pay } : t);
    } else if (parcelado && parcelas > 1) {
      const [y, m, d] = date.split("-").map(Number);
      const gid = Date.now();
      for (let i = 0; i < parcelas; i++) {
        const dt = new Date(y, m - 1 + i, d);
        newTxs.push({
          id: nextId() + i,
          desc, val: +(val / parcelas).toFixed(2),
          date: dt.toISOString().slice(0, 10),
          type, cat, pay,
          parc: `${i + 1}/${parcelas}`, pg: gid,
        });
      }
    } else {
      newTxs.push({ id: nextId(), desc, val, date, type, cat, pay, parc: null, pg: null });
    }
    commit({ txs: newTxs });
    setModal(null);
  }

  // ─── Fixos CRUD ───

  function submitFixo(form: FixoForm) {
    const { desc, val, type, cat, pay, day, editId } = form;
    if (!desc.trim() || isNaN(val)) { alert("Preencha descrição e valor."); return; }
    if (editId) {
      commit({ fixos: data.fixos.map((f) => f.id === editId ? { ...f, desc, val, type, cat, pay, day } : f) });
    } else {
      commit({ fixos: [...data.fixos, { id: nextId(), desc, val, type, cat, pay, day, active: true }] });
    }
    setFxEdit(null);
  }
  function toggleFixo(id: number) {
    commit({ fixos: data.fixos.map((f) => f.id === id ? { ...f, active: !f.active } : f) });
  }
  function deleteFixo(id: number) {
    if (!confirm("Remover este item fixo?")) return;
    commit({ fixos: data.fixos.filter((f) => f.id !== id) });
  }

  // ─── Pendências ───

  function savePendenciasList(pendencias: Pendencia[]) {
    commit({ pendencias });
  }

  function quitarPendencia(id: number, payDate: string) {
    const p = data.pendencias.find((x) => x.id === id);
    if (!p) return;
    const tx = pendenciaToTx(p, payDate);
    const newPendencias = data.pendencias.map((x) =>
      x.id === id ? { ...x, status: "quitado" as const, quitado_em: payDate, tx_id: tx.id } : x
    );
    commit({ txs: [...data.txs, tx], pendencias: newPendencias });
  }

  const resumoPend = useMemo(() => resumoPendencias(data.pendencias), [data.pendencias]);
  const temAlerta = resumoPend.qtd_vencidas > 0 || resumoPend.qtd_proximas_7d > 0;

  // ─── Empréstimos ───

  function saveEmprestimosList(emprestimos: Emprestimo[]) {
    commit({ emprestimos });
  }

  function registrarPagamentoEmprestimo(emprestimoId: number, pag: PagamentoEmprestimo) {
    const e = data.emprestimos.find((x) => x.id === emprestimoId);
    if (!e) return;
    const tx = pagamentoEmprestimoToTx(e, pag);
    const pagamentoComTx = { ...pag, tx_id: tx.id };
    const newEmprestimos = data.emprestimos.map((x) => {
      if (x.id !== emprestimoId) return x;
      const novosPagamentos = [...x.pagamentos, pagamentoComTx];
      const pago = novosPagamentos.reduce((a, p) => a + p.valor, 0);
      return {
        ...x,
        pagamentos: novosPagamentos,
        status: pago >= x.valor_original ? "quitado" as const : "aberto" as const,
      };
    });
    commit({ txs: [...data.txs, tx], emprestimos: newEmprestimos });
  }

  // ─── Orçamentos ───

  function saveOrcamentosList(orcamentos: Orcamento[]) {
    commit({ orcamentos });
  }

  const gastosMesPorCat = useMemo(
    () => gastosPorCategoriaMes(data, mY, mM),
    [data, mY, mM]
  );

  // ─── Metas & Caixinhas ───

  function saveCaixinhasList(caixinhas: Caixinha[]) {
    commit({ caixinhas });
  }
  function saveMetasObj(metas: MetasFinanceiras) {
    commit({ metas });
  }

  const patrimonio = useMemo(() => totalReservado(data.caixinhas), [data.caixinhas]);
  const resumo = useMemo(() => resumoMensal(data, mY, mM), [data, mY, mM]);

  // ─── Categorias ───
  function addCat(n: string, c: string) {
    if (!n.trim()) return;
    if (data.cats.find((x) => x.n.toLowerCase() === n.toLowerCase())) { alert("Já existe."); return; }
    commit({ cats: [...data.cats, { n: n.trim(), c }] });
  }
  function removeCat(i: number) {
    if (!confirm(`Remover "${data.cats[i].n}"?`)) return;
    const nc = [...data.cats]; nc.splice(i, 1);
    commit({ cats: nc });
  }

  const cartoesConhecidos = useMemo(() => {
    const s = new Set<string>();
    data.txs.forEach((t) => { if (t.pay?.startsWith("c:")) s.add(t.pay.slice(2)); });
    data.fixos.forEach((f) => { if (f.pay?.startsWith("c:")) s.add(f.pay.slice(2)); });
    return Array.from(s);
  }, [data.txs, data.fixos]);

  // ─── Render ───

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-7">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--orange-glow)", color: "var(--orange-500)" }}
          >
            <Wallet size={20} />
          </div>
          <h1 className="font-fraunces text-2xl md:text-3xl" style={{ color: "var(--text-primary)" }}>
            Controle <em style={{ color: "var(--orange-500)", fontStyle: "italic" }}>financeiro</em>
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={exportJSON} className="btn-soft"><Download size={14} /> Backup</button>
          <button onClick={() => fileRef.current?.click()} className="btn-soft"><Upload size={14} /> Importar</button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={importJSON} />
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={() => chgMonth(-1)} className="w-9 h-9 rounded-full border flex items-center justify-center"
          style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", background: "var(--bg-card)" }}>
          <ChevronLeft size={16} />
        </button>
        <span className="font-dm font-semibold text-base min-w-[180px] text-center" style={{ color: "var(--text-primary)" }}>
          {MESES[mM]} {mY}
        </span>
        <button onClick={() => chgMonth(1)} className="w-9 h-9 rounded-full border flex items-center justify-center"
          style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)", background: "var(--bg-card)" }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard label="Saldo" value={(sum.saldo >= 0 ? "+ " : "− ") + "R$ " + fmtBRL(Math.abs(sum.saldo))}
          tone={sum.saldo >= 0 ? "pos" : "neg"} sub={MESES[mM]} />
        <SummaryCard label="Entradas" value={"R$ " + fmtBRL(sum.entradas)} tone="pos"
          sub={`${txs.filter((t) => isEntrada(t.type)).length} lançamentos`} />
        <SummaryCard label="Gastos" value={"R$ " + fmtBRL(sum.gastos)} tone="neg"
          sub={`${txs.filter((t) => !isEntrada(t.type)).length} lançamentos`} />
        {resumo.disponivel > 0 || resumo.meta_economia > 0 ? (
          <SummaryCard
            label="Disponível este mês"
            value={"R$ " + fmtBRL(resumo.disponivel)}
            tone={resumo.disponivel > 0 ? "pos" : "neg"}
            sub={resumo.dias_restantes > 0 ? `R$ ${fmtBRL(resumo.por_dia_restante)}/dia · ${resumo.dias_restantes}d` : "Projetado"}
          />
        ) : (
          <SummaryCard
            label="Fixos / Variáveis"
            value={`R$ ${fmtBRL(sum.fixo)} / R$ ${fmtBRL(sum.variavel)}`}
            tone="neutral"
            sub={patrimonio > 0 ? `Reservado: R$ ${fmtBRL(patrimonio)}` : "No mês"}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <button
          onClick={() => setModal({ mode: "gasto", editId: null })}
          className="flex-1 py-3.5 rounded-xl font-dm font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110"
          style={{ background: "rgba(248,113,113,.12)", color: "#ef4444", border: "1px solid rgba(248,113,113,.25)" }}
        >
          <Minus size={16} /> Novo gasto
        </button>
        <button
          onClick={() => setModal({ mode: "entrada", editId: null })}
          className="flex-1 py-3.5 rounded-xl font-dm font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110"
          style={{ background: "rgba(52,211,153,.12)", color: "#10b981", border: "1px solid rgba(52,211,153,.25)" }}
        >
          <Plus size={16} /> Nova entrada
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-5 overflow-x-auto"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 min-w-[90px] px-3 py-2 rounded-lg font-dm text-xs font-semibold transition-all"
              style={{
                background: on ? "var(--bg-hover)" : "transparent",
                color: on ? "var(--text-primary)" : "var(--text-tertiary)",
              }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Alert banner */}
      {temAlerta && (
        <button
          onClick={() => setTab("pendencias")}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl mb-4 text-left transition-all hover:brightness-105"
          style={{
            background: resumoPend.qtd_vencidas > 0 ? "rgba(239,68,68,.08)" : "rgba(245,158,11,.08)",
            border: `1px solid ${resumoPend.qtd_vencidas > 0 ? "rgba(239,68,68,.25)" : "rgba(245,158,11,.25)"}`,
          }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: resumoPend.qtd_vencidas > 0 ? "rgba(239,68,68,.15)" : "rgba(245,158,11,.15)",
              color: resumoPend.qtd_vencidas > 0 ? "#ef4444" : "#f59e0b",
            }}>
            {resumoPend.qtd_vencidas > 0 ? <AlertCircle size={16} /> : <Bell size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            {resumoPend.qtd_vencidas > 0 && (
              <div className="font-dm text-xs font-semibold" style={{ color: "#ef4444" }}>
                {resumoPend.qtd_vencidas} {resumoPend.qtd_vencidas === 1 ? "pendência vencida" : "pendências vencidas"}
                {" · "}R$ {fmtBRL(resumoPend.vencidos_pagar + resumoPend.vencidos_receber)}
              </div>
            )}
            {resumoPend.qtd_proximas_7d > 0 && (
              <div className="font-dm text-xs" style={{ color: "var(--text-secondary)" }}>
                {resumoPend.qtd_proximas_7d} {resumoPend.qtd_proximas_7d === 1 ? "vence" : "vencem"} nos próximos 7 dias
              </div>
            )}
            <div className="font-dm text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
              A pagar 30d: R$ {fmtBRL(resumoPend.a_pagar_30d)} · A receber 30d: R$ {fmtBRL(resumoPend.a_receber_30d)}
            </div>
          </div>
          <span className="font-dm text-[10px] font-semibold" style={{ color: "var(--orange-500)" }}>
            Ver →
          </span>
        </button>
      )}

      {tab === "lancamentos" && (
        <LancamentosTab
          txs={txs}
          cats={data.cats}
          onEdit={(t) => setModal({ mode: isEntrada(t.type) ? "entrada" : "gasto", editId: t.id })}
          onDelete={deleteTx}
        />
      )}

      {tab === "fixos" && (
        <FixosTab
          fixos={data.fixos}
          cats={data.cats}
          cartoes={cartoesConhecidos}
          editing={fxEdit}
          onStartEdit={setFxEdit}
          onCancelEdit={() => setFxEdit(null)}
          onSubmit={submitFixo}
          onToggle={toggleFixo}
          onDelete={deleteFixo}
        />
      )}

      {tab === "metas" && (
        <MetasTab
          caixinhas={data.caixinhas}
          metas={data.metas}
          resumo={resumo}
          patrimonio={patrimonio}
          mesLabel={`${MESES[mM]} ${mY}`}
          onSaveCaixinhas={saveCaixinhasList}
          onSaveMetas={saveMetasObj}
        />
      )}

      {tab === "pendencias" && (
        <PendenciasTab
          pendencias={data.pendencias}
          emprestimos={data.emprestimos}
          cats={data.cats}
          cartoes={cartoesConhecidos}
          onSave={savePendenciasList}
          onSaveEmprestimos={saveEmprestimosList}
          onQuitar={quitarPendencia}
          onRegistrarPagamentoEmprestimo={registrarPagamentoEmprestimo}
        />
      )}

      {tab === "categorias" && (
        <CategoriasTab cats={data.cats} onAdd={addCat} onRemove={removeCat} />
      )}

      {tab === "graficos" && (
        <GraficosTab
          txs={txs}
          cats={data.cats}
          entradas={sum.entradas}
          gastos={sum.gastos}
          orcamentos={data.orcamentos}
          gastosPorCat={gastosMesPorCat}
          onSaveOrcamentos={saveOrcamentosList}
        />
      )}

      {tab === "projecao" && (
        <ProjecaoTab data={data} baseY={mY} baseM={mM} />
      )}

      {modal && (
        <TxModal
          mode={modal.mode}
          editTx={modal.editId ? data.txs.find((t) => t.id === modal.editId) || null : null}
          cats={data.cats}
          cartoes={cartoesConhecidos}
          onClose={() => setModal(null)}
          onSubmit={submitTx}
        />
      )}

      <style jsx>{`
        .btn-soft {
          padding: 7px 12px;
          border-radius: 10px;
          font-family: var(--font-dm), sans-serif;
          font-size: 11px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-card);
          color: var(--text-secondary);
          border: 1px solid var(--border-default);
          transition: all .15s;
          cursor: pointer;
        }
        .btn-soft:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--border-strong);
        }
      `}</style>
    </div>
  );
}

// ─── Summary card ──────────────────────────────────

function SummaryCard({
  label, value, tone, sub,
}: { label: string; value: string; tone: "pos" | "neg" | "neutral"; sub: string }) {
  const color = tone === "pos" ? "#10b981" : tone === "neg" ? "#ef4444" : "var(--text-primary)";
  return (
    <div className="rounded-xl p-5 relative overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
      <p className="font-dm text-[10px] uppercase tracking-wider font-semibold mb-2"
        style={{ color: "var(--text-tertiary)" }}>
        {label}
      </p>
      <p className="font-fraunces text-2xl" style={{ color }}>
        {value}
      </p>
      <p className="font-dm text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>{sub}</p>
    </div>
  );
}

// ─── Lançamentos Tab ───────────────────────────────

function LancamentosTab({
  txs, cats, onEdit, onDelete,
}: {
  txs: (Transacao & { _fixo?: boolean })[];
  cats: Categoria[];
  onEdit: (t: Transacao) => void;
  onDelete: (id: number) => void;
}) {
  if (!txs.length) {
    return (
      <div className="rounded-xl p-10 text-center"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
        <EmptyState message="Nenhum lançamento este mês. Use os botões acima para adicionar gastos ou entradas." />
      </div>
    );
  }
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
      <div className="px-4 py-3 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-default)" }}>
        <span className="font-dm text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          Lançamentos do mês
        </span>
        <span className="font-dm text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          {txs.length} {txs.length === 1 ? "item" : "itens"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
              <Th>Data</Th><Th>Descrição</Th><Th>Tipo</Th><Th>Categoria</Th>
              <Th>Pagamento</Th><Th>Parcela</Th><Th alignRight>Valor</Th><Th></Th>
            </tr>
          </thead>
          <tbody>
            {txs.map((t) => {
              const entrada = isEntrada(t.type);
              const catO = cats.find((c) => c.n === t.cat);
              const catBg = catO ? catO.c + "22" : "rgba(107,114,128,.15)";
              const catFg = catO ? catO.c : "#6b7280";
              return (
                <tr key={t.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    background: t._fixo ? "rgba(167,139,250,.04)" : undefined,
                  }}>
                  <Td mono>{fmtDiaMes(t.date)}</Td>
                  <Td>
                    <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{t.desc}</span>
                    {t._fixo && (
                      <span className="ml-2 font-dm text-[9px] font-bold inline-flex items-center gap-0.5"
                        style={{ color: "#a78bfa" }}>
                        <Repeat size={9} /> FIXO
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className="px-2 py-0.5 rounded font-dm text-[9px] font-bold uppercase tracking-wide"
                      style={tipoPillStyle(t.type)}>
                      {TIPO_LABEL[t.type] || t.type}
                    </span>
                  </Td>
                  <Td>
                    <span className="px-2 py-0.5 rounded-full font-dm text-[10px]"
                      style={{ background: catBg, color: catFg, fontWeight: 500 }}>
                      {t.cat || "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="px-1.5 py-0.5 rounded font-dm text-[9px]"
                      style={{ background: "var(--bg-hover)", color: "var(--text-tertiary)" }}>
                      {labelPay(t.pay)}
                    </span>
                  </Td>
                  <Td>
                    {t.parc && (
                      <span className="font-dm text-[10px] font-semibold" style={{ color: "var(--orange-500)" }}>
                        {t.parc}
                      </span>
                    )}
                  </Td>
                  <Td alignRight>
                    <span className="font-mono text-xs font-semibold whitespace-nowrap"
                      style={{ color: entrada ? "#10b981" : "#ef4444" }}>
                      {entrada ? "+ " : "− "}R$ {fmtBRL(t.val)}
                    </span>
                  </Td>
                  <Td>
                    {t._fixo ? (
                      <span className="font-dm text-[9px] italic" style={{ color: "var(--text-tertiary)" }}>
                        aba Fixos
                      </span>
                    ) : (
                      <div className="flex gap-1">
                        <IconBtn onClick={() => onEdit(t)} title="Editar"><Pencil size={12} /></IconBtn>
                        <IconBtn onClick={() => onDelete(t.id)} title="Excluir" danger><Trash2 size={12} /></IconBtn>
                      </div>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, alignRight }: { children?: React.ReactNode; alignRight?: boolean }) {
  return (
    <th className="font-dm text-[9px] uppercase tracking-wider font-semibold px-4 py-2.5"
      style={{ color: "var(--text-tertiary)", textAlign: alignRight ? "right" : "left" }}>
      {children}
    </th>
  );
}

function Td({ children, alignRight, mono }: { children?: React.ReactNode; alignRight?: boolean; mono?: boolean }) {
  return (
    <td className={"px-4 py-2.5 " + (mono ? "font-mono text-[11px]" : "text-xs")}
      style={{ color: "var(--text-secondary)", textAlign: alignRight ? "right" : "left", verticalAlign: "middle" }}>
      {children}
    </td>
  );
}

function IconBtn({
  children, onClick, title, danger,
}: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button onClick={onClick} title={title}
      className="w-7 h-7 rounded-md border flex items-center justify-center transition-all"
      style={{
        borderColor: "transparent",
        color: "var(--text-tertiary)",
        background: "transparent",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = danger ? "#ef4444" : "var(--orange-500)";
        e.currentTarget.style.color = danger ? "#ef4444" : "var(--orange-500)";
        e.currentTarget.style.background = danger ? "rgba(239,68,68,.08)" : "var(--orange-glow)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "transparent";
        e.currentTarget.style.color = "var(--text-tertiary)";
        e.currentTarget.style.background = "transparent";
      }}>
      {children}
    </button>
  );
}

// ─── Fixos Tab ─────────────────────────────────────

interface FixoForm {
  desc: string; val: number; type: "fixo" | "entrada_fixa";
  cat: string; pay: string; day: number; editId: number | null;
}

function FixosTab({
  fixos, cats, cartoes, editing, onStartEdit, onCancelEdit, onSubmit, onToggle, onDelete,
}: {
  fixos: FixoItem[];
  cats: Categoria[];
  cartoes: string[];
  editing: FixoItem | null;
  onStartEdit: (f: FixoItem) => void;
  onCancelEdit: () => void;
  onSubmit: (f: FixoForm) => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [desc, setDesc] = useState("");
  const [val, setVal] = useState("");
  const [type, setType] = useState<"fixo" | "entrada_fixa">("fixo");
  const [cat, setCat] = useState(cats[0]?.n || "");
  const [pay, setPay] = useState("pix");
  const [day, setDay] = useState(5);

  useEffect(() => {
    if (editing) {
      setDesc(editing.desc);
      setVal(String(editing.val));
      setType(editing.type);
      setCat(editing.cat);
      setPay(editing.pay);
      setDay(editing.day);
    } else {
      setDesc(""); setVal(""); setType("fixo");
      setCat(cats[0]?.n || ""); setPay("pix"); setDay(5);
    }
  }, [editing, cats]);

  function handleSubmit() {
    onSubmit({
      desc, val: parseFloat(val), type, cat, pay, day,
      editId: editing?.id ?? null,
    });
    if (!editing) { setDesc(""); setVal(""); }
  }

  return (
    <div>
      <p className="font-dm text-[11px] font-semibold uppercase tracking-wider mb-1"
        style={{ color: "var(--text-tertiary)" }}>
        Gastos e entradas que se repetem todo mês
      </p>
      <p className="font-dm text-[11px] italic mb-5" style={{ color: "var(--text-tertiary)" }}>
        Estes valores aparecem automaticamente em todos os meses.
      </p>

      <div className="rounded-xl p-5 mb-5"
        style={{
          background: "var(--bg-card)",
          border: `1px solid ${type === "entrada_fixa" ? "rgba(16,185,129,.25)" : "var(--border-default)"}`,
        }}>
        <p className="font-dm text-xs font-semibold mb-4"
          style={{ color: type === "entrada_fixa" ? "#10b981" : "var(--text-primary)" }}>
          {editing
            ? (type === "entrada_fixa" ? "✎ Editando entrada mensal" : "✎ Editando gasto fixo")
            : (type === "entrada_fixa" ? "+ Nova entrada mensal" : "+ Novo gasto fixo")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Field label="Descrição">
            <Input value={desc} onChange={setDesc} placeholder="Ex: Aluguel, Salário..." />
          </Field>
          <Field label="Valor (R$)">
            <Input type="number" value={val} onChange={setVal} placeholder="0,00" />
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Field label="Tipo">
            <Select value={type} onChange={(v) => setType(v as any)}>
              <option value="fixo">Gasto fixo</option>
              <option value="entrada_fixa">Entrada fixa</option>
            </Select>
          </Field>
          <Field label="Categoria">
            <Select value={cat} onChange={setCat}>
              {cats.map((c) => <option key={c.n} value={c.n}>{c.n}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <Field label="Pagamento">
            <PaySelect value={pay} onChange={setPay} cartoes={cartoes} />
          </Field>
          <Field label="Dia do mês">
            <Input type="number" value={String(day)} onChange={(v) => setDay(parseInt(v) || 1)} />
          </Field>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSubmit}
            className="px-5 py-2.5 rounded-lg font-dm text-xs font-semibold text-white transition-all hover:brightness-110"
            style={{ background: type === "entrada_fixa" ? "#10b981" : "var(--orange-500)" }}>
            {editing
              ? "Salvar alterações"
              : type === "entrada_fixa" ? "+ Adicionar entrada mensal" : "+ Adicionar gasto fixo"}
          </button>
          {editing && (
            <button onClick={onCancelEdit}
              className="px-4 py-2.5 rounded-lg font-dm text-xs font-semibold transition-all"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      {fixos.length === 0 ? (
        <div className="rounded-xl p-8 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
          <p className="font-dm text-xs" style={{ color: "var(--text-tertiary)" }}>
            Nenhum item fixo cadastrado.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
          <div className="px-4 py-3 flex justify-between items-center" style={{ borderBottom: "1px solid var(--border-default)" }}>
            <span className="font-dm text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              Itens fixos mensais
            </span>
            <span className="font-dm text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {fixos.length} itens
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <Th>Descrição</Th><Th>Tipo</Th><Th>Categoria</Th>
                  <Th>Pagamento</Th><Th>Dia</Th><Th alignRight>Valor</Th><Th></Th>
                </tr>
              </thead>
              <tbody>
                {fixos.map((f) => {
                  const entrada = f.type === "entrada_fixa";
                  const catO = cats.find((c) => c.n === f.cat);
                  const catBg = catO ? catO.c + "22" : "rgba(107,114,128,.15)";
                  const catFg = catO ? catO.c : "#6b7280";
                  return (
                    <tr key={f.id} style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      opacity: f.active === false ? 0.4 : 1,
                    }}>
                      <Td><span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{f.desc}</span></Td>
                      <Td>
                        <span className="px-2 py-0.5 rounded font-dm text-[9px] font-bold uppercase tracking-wide"
                          style={tipoPillStyle(entrada ? "entrada" : "fixo")}>
                          {entrada ? "Entrada" : "Gasto"}
                        </span>
                      </Td>
                      <Td>
                        <span className="px-2 py-0.5 rounded-full font-dm text-[10px]"
                          style={{ background: catBg, color: catFg, fontWeight: 500 }}>
                          {f.cat || "—"}
                        </span>
                      </Td>
                      <Td>
                        <span className="px-1.5 py-0.5 rounded font-dm text-[9px]"
                          style={{ background: "var(--bg-hover)", color: "var(--text-tertiary)" }}>
                          {labelPay(f.pay)}
                        </span>
                      </Td>
                      <Td mono><span style={{ color: "var(--text-tertiary)" }}>Dia {f.day}</span></Td>
                      <Td alignRight>
                        <span className="font-mono text-xs font-semibold whitespace-nowrap"
                          style={{ color: entrada ? "#10b981" : "#ef4444" }}>
                          {entrada ? "+ " : "− "}R$ {fmtBRL(f.val)}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex gap-1">
                          <IconBtn onClick={() => onToggle(f.id)} title={f.active === false ? "Ativar" : "Pausar"}>
                            {f.active === false ? <Play size={12} /> : <Pause size={12} />}
                          </IconBtn>
                          <IconBtn onClick={() => onStartEdit(f)} title="Editar"><Pencil size={12} /></IconBtn>
                          <IconBtn onClick={() => onDelete(f.id)} title="Excluir" danger><Trash2 size={12} /></IconBtn>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Categorias Tab ────────────────────────────────

function CategoriasTab({
  cats, onAdd, onRemove,
}: { cats: Categoria[]; onAdd: (n: string, c: string) => void; onRemove: (i: number) => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#C84B31");
  return (
    <div>
      <p className="font-dm text-[11px] font-semibold uppercase tracking-wider mb-4"
        style={{ color: "var(--text-tertiary)" }}>
        Suas categorias
      </p>
      <div className="flex flex-wrap gap-2 mb-6">
        {cats.map((c, i) => (
          <div key={c.n} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c.c }} />
            <span className="font-dm text-xs" style={{ color: "var(--text-secondary)" }}>{c.n}</span>
            <button onClick={() => onRemove(i)} className="text-[11px] hover:text-red-500"
              style={{ color: "var(--text-tertiary)" }}>
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nova categoria..."
          className="px-3 py-2 rounded-lg font-dm text-xs outline-none"
          style={{ background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border-default)", width: 180 }}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-9 h-9 rounded-lg cursor-pointer"
          style={{ border: "1px solid var(--border-default)", background: "none" }}
        />
        <button onClick={() => { onAdd(name, color); setName(""); }}
          className="px-4 py-2 rounded-lg font-dm text-xs font-semibold text-white"
          style={{ background: "var(--orange-500)" }}>
          + Criar
        </button>
      </div>
    </div>
  );
}

// ─── Gráficos Tab ──────────────────────────────────

function GraficosTab({
  txs, cats, entradas, gastos, orcamentos, gastosPorCat, onSaveOrcamentos,
}: {
  txs: Transacao[];
  cats: Categoria[];
  entradas: number;
  gastos: number;
  orcamentos: Orcamento[];
  gastosPorCat: Record<string, number>;
  onSaveOrcamentos: (o: Orcamento[]) => void;
}) {
  const byCat = useMemo(() => {
    const map = new Map<string, number>();
    txs.filter((t) => !isEntrada(t.type))
      .forEach((t) => map.set(t.cat || "Outros", (map.get(t.cat || "Outros") || 0) + t.val));
    return Array.from(map.entries());
  }, [txs]);

  const total = byCat.reduce((a, [, v]) => a + v, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
        <p className="font-dm text-[11px] font-bold uppercase tracking-wider mb-5"
          style={{ color: "var(--text-tertiary)" }}>
          Gastos por categoria
        </p>
        {byCat.length === 0 ? (
          <p className="font-dm text-xs text-center py-6" style={{ color: "var(--text-tertiary)" }}>
            Sem gastos este mês.
          </p>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Donut data={byCat.map(([label, value]) => ({
              label, value, color: cats.find((c) => c.n === label)?.c || "#6b7280",
            }))} />
            <div className="flex-1 w-full space-y-2">
              {byCat.map(([label, value]) => {
                const cor = cats.find((c) => c.n === label)?.c || "#6b7280";
                const pct = total > 0 ? (value / total) * 100 : 0;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: cor }} />
                    <span className="flex-1 font-dm text-xs" style={{ color: "var(--text-secondary)" }}>{label}</span>
                    <span className="font-mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                      {pct.toFixed(0)}%
                    </span>
                    <span className="font-mono text-xs font-semibold min-w-[80px] text-right"
                      style={{ color: "var(--text-primary)" }}>
                      R$ {fmtBRL(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
        <p className="font-dm text-[11px] font-bold uppercase tracking-wider mb-5"
          style={{ color: "var(--text-tertiary)" }}>
          Entradas vs Gastos
        </p>
        <FlowBar label="Entradas" value={entradas} max={Math.max(entradas, gastos, 1)} color="#10b981" />
        <div className="h-3" />
        <FlowBar label="Gastos" value={gastos} max={Math.max(entradas, gastos, 1)} color="#ef4444" />
      </div>

      <OrcamentosCard
        cats={cats}
        orcamentos={orcamentos}
        gastosPorCat={gastosPorCat}
        onSave={onSaveOrcamentos}
      />
    </div>
  );
}

function OrcamentosCard({
  cats, orcamentos, gastosPorCat, onSave,
}: {
  cats: Categoria[];
  orcamentos: Orcamento[];
  gastosPorCat: Record<string, number>;
  onSave: (o: Orcamento[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  function startEdit() {
    const d: Record<string, string> = {};
    for (const o of orcamentos) d[o.cat] = String(o.limite);
    setDraft(d);
    setEditing(true);
  }

  function saveEdit() {
    const novos: Orcamento[] = [];
    for (const cat of Object.keys(draft)) {
      const v = parseFloat(draft[cat]);
      if (!isNaN(v) && v > 0) novos.push({ cat, limite: v });
    }
    onSave(novos);
    setEditing(false);
  }

  const temOrcamento = orcamentos.length > 0;

  return (
    <div className="rounded-xl p-6"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <p className="font-dm text-[11px] font-bold uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)" }}>
          Orçamentos por categoria
        </p>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)}
              className="px-3 py-1.5 rounded-md font-dm text-[11px]"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
              Cancelar
            </button>
            <button onClick={saveEdit}
              className="px-3 py-1.5 rounded-md font-dm text-[11px] font-semibold text-white"
              style={{ background: "var(--orange-500)" }}>
              Salvar
            </button>
          </div>
        ) : (
          <button onClick={startEdit}
            className="px-3 py-1.5 rounded-md font-dm text-[11px] font-semibold"
            style={{ background: "var(--orange-glow)", color: "var(--orange-500)", border: "1px solid var(--border-orange)" }}>
            {temOrcamento ? "Editar limites" : "+ Definir limites"}
          </button>
        )}
      </div>

      {!editing && !temOrcamento && (
        <p className="font-dm text-xs text-center py-4" style={{ color: "var(--text-tertiary)" }}>
          Defina um limite mensal por categoria para ver o progresso aqui.
        </p>
      )}

      {editing && (
        <div className="space-y-2">
          {cats.map((c) => (
            <div key={c.n} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c.c }} />
              <span className="flex-1 font-dm text-xs" style={{ color: "var(--text-secondary)" }}>{c.n}</span>
              <span className="font-dm text-[11px]" style={{ color: "var(--text-tertiary)" }}>R$</span>
              <input
                type="number"
                value={draft[c.n] || ""}
                onChange={(e) => setDraft({ ...draft, [c.n]: e.target.value })}
                placeholder="0"
                className="w-24 px-2 py-1.5 rounded-md font-mono text-xs outline-none"
                style={{
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-default)",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {!editing && temOrcamento && (
        <div className="space-y-3">
          {orcamentos.map((o) => {
            const gasto = gastosPorCat[o.cat] || 0;
            const pct = (gasto / o.limite) * 100;
            const cor = cats.find((c) => c.n === o.cat)?.c || "#6b7280";
            const estourado = pct > 100;
            const proximo = pct > 80 && pct <= 100;
            return (
              <div key={o.cat}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: cor }} />
                    <span className="font-dm text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                      {o.cat}
                    </span>
                    {estourado && (
                      <span className="font-dm text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(239,68,68,.12)", color: "#ef4444" }}>
                        Estourado
                      </span>
                    )}
                    {proximo && (
                      <span className="font-dm text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(245,158,11,.12)", color: "#f59e0b" }}>
                        Quase lá
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px]"
                    style={{ color: estourado ? "#ef4444" : "var(--text-secondary)" }}>
                    R$ {fmtBRL(gasto)} / R$ {fmtBRL(o.limite)}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                  <div className="h-full transition-all"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      background: estourado ? "#ef4444" : proximo ? "#f59e0b" : cor,
                      opacity: 0.85,
                    }} />
                </div>
                <div className="font-dm text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {pct.toFixed(0)}% usado{estourado && ` · excedido em R$ ${fmtBRL(gasto - o.limite)}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Donut({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (total === 0) return null;
  const size = 170, r = 70, cx = size / 2, cy = size / 2, sw = 22;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={sw} />
      {data.map((d, i) => {
        const frac = d.value / total;
        const len = C * frac;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={d.color} strokeWidth={sw}
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += len;
        return el;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontFamily: "var(--font-fraunces)", fontSize: 18, fill: "var(--text-primary)" }}>
        R$ {fmtBRL(total)}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" style={{ fontFamily: "var(--font-dm)", fontSize: 10, fill: "var(--text-tertiary)" }}>
        Total gastos
      </text>
    </svg>
  );
}

function FlowBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="font-dm text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="font-mono text-xs font-semibold" style={{ color }}>R$ {fmtBRL(value)}</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
        <div className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color, opacity: 0.85 }} />
      </div>
    </div>
  );
}

// ─── Projeção Tab ──────────────────────────────────

function ProjecaoTab({ data, baseY, baseM }: { data: FinancasData; baseY: number; baseM: number }) {
  const meses = useMemo(() => {
    const out: { label: string; saldo: number; gastos: number; entradas: number; items: any[] }[] = [];
    const activeFixos = data.fixos.filter((f) => f.active !== false);
    for (let i = 1; i <= 6; i++) {
      const d = new Date(baseY, baseM + i, 1);
      const y = d.getFullYear(), m = d.getMonth();
      const parcTxs = data.txs.filter((t) => {
        const td = new Date(t.date + "T12:00:00");
        return td.getFullYear() === y && td.getMonth() === m && t.parc;
      });
      const pendAbertas = data.pendencias.filter((p) => {
        if (p.status !== "aberto") return false;
        const pd = new Date(p.date_due + "T12:00:00");
        return pd.getFullYear() === y && pd.getMonth() === m;
      });
      const fixoItems = activeFixos.map((f) => ({
        desc: f.desc, val: f.val, parc: "⟳ fixo",
        isIn: f.type === "entrada_fixa",
      }));
      const pendItems = pendAbertas.map((p) => ({
        desc: p.desc, val: p.val,
        parc: p.parc_num && p.parc_total ? `${p.parc_num}/${p.parc_total}` : (p.kind === "pagar" ? "⏳ a pagar" : "⏳ a receber"),
        isIn: p.kind === "receber",
      }));
      const items = [
        ...parcTxs.map((t) => ({ desc: t.desc, val: t.val, parc: t.parc!, isIn: isEntrada(t.type) })),
        ...fixoItems,
        ...pendItems,
      ];
      if (items.length === 0) continue;
      let entradas = 0, gastos = 0;
      items.forEach((t) => { if (t.isIn) entradas += t.val; else gastos += t.val; });
      out.push({ label: `${MESES[m]} ${y}`, saldo: entradas - gastos, gastos, entradas, items });
    }
    return out;
  }, [data, baseY, baseM]);

  if (meses.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
        <p className="font-dm text-xs" style={{ color: "var(--text-tertiary)" }}>
          Nenhuma parcela futura ou item fixo registrado.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-dm text-[11px] font-semibold uppercase tracking-wider mb-4"
        style={{ color: "var(--text-tertiary)" }}>
        Próximos 6 meses (fixos + parcelas)
      </p>
      <div className="space-y-3">
        {meses.map((m) => (
          <div key={m.label} className="rounded-xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
            <div className="px-4 py-3 flex justify-between items-center"
              style={{ borderBottom: "1px solid var(--border-default)" }}>
              <span className="font-dm text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{m.label}</span>
              <span className="font-mono text-sm font-semibold"
                style={{ color: m.saldo >= 0 ? "#10b981" : "#ef4444" }}>
                {m.saldo >= 0 ? "+ " : "− "}R$ {fmtBRL(Math.abs(m.saldo))}
              </span>
            </div>
            <div className="px-4 py-2">
              {m.items.map((t: any, i: number) => (
                <div key={i} className="flex justify-between items-center py-1.5">
                  <span className="font-dm text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    {t.desc}{" "}
                    <span className="ml-1 font-dm text-[10px] font-semibold"
                      style={{ color: "var(--orange-500)" }}>
                      {t.parc}
                    </span>
                  </span>
                  <span className="font-mono text-[11px] font-semibold"
                    style={{ color: t.isIn ? "#10b981" : "#ef4444" }}>
                    {t.isIn ? "+ " : "− "}R$ {fmtBRL(t.val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Transaction Modal ─────────────────────────────

interface TxForm {
  desc: string; val: number; date: string;
  type: Transacao["type"]; cat: string; pay: string;
  parcelado: boolean; parcelas: number; editId: number | null;
}

function TxModal({
  mode, editTx, cats, cartoes, onClose, onSubmit,
}: {
  mode: "gasto" | "entrada";
  editTx: Transacao | null;
  cats: Categoria[];
  cartoes: string[];
  onClose: () => void;
  onSubmit: (f: TxForm) => void;
}) {
  const isEdit = !!editTx;
  const typeOptions = mode === "gasto"
    ? [{ v: "variavel", l: "Variável" }, { v: "pontual", l: "Pontual" }]
    : [{ v: "entrada", l: "Entrada pontual" }];

  const [desc, setDesc] = useState(editTx?.desc || "");
  const [val, setVal] = useState(editTx ? String(editTx.val) : "");
  const [date, setDate] = useState(editTx?.date || new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<Transacao["type"]>(
    editTx?.type || (mode === "entrada" ? "entrada" : "variavel")
  );
  const [cat, setCat] = useState(editTx?.cat || cats[0]?.n || "");
  const [pay, setPay] = useState(editTx?.pay || "pix");
  const [parcelado, setParcelado] = useState(false);
  const [parcelas, setParcelas] = useState(2);

  function handleSubmit() {
    onSubmit({
      desc, val: parseFloat(val), date, type, cat, pay,
      parcelado, parcelas, editId: editTx?.id ?? null,
    });
  }

  const gasto = mode === "gasto";

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-7"
        style={{ background: "var(--bg-card-elevated)", border: "1px solid var(--border-default)" }}>
        <h2 className="font-fraunces text-xl mb-5 flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
          <span className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: gasto ? "rgba(239,68,68,.12)" : "rgba(16,185,129,.12)",
              color: gasto ? "#ef4444" : "#10b981",
            }}>
            {isEdit ? <Pencil size={15} /> : gasto ? <Minus size={15} /> : <Plus size={15} />}
          </span>
          {isEdit ? `Editar ${gasto ? "gasto" : "entrada"}` : `${gasto ? "Novo gasto" : "Nova entrada"}`}
        </h2>

        {!gasto && !isEdit && (
          <p className="font-dm text-[10px] mb-3 px-3 py-2 rounded-lg"
            style={{ background: "rgba(16,185,129,.06)", color: "var(--text-tertiary)", border: "1px dashed rgba(16,185,129,.25)" }}>
            💡 Para entradas que se repetem todo mês (salário, aluguel recebido), use a aba <strong>Fixos</strong>.
          </p>
        )}
        <Field label="Descrição">
          <Input value={desc} onChange={setDesc} placeholder={gasto ? "Ex: Almoço, Netflix..." : "Ex: Venda extra, reembolso..."} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)"><Input type="number" value={val} onChange={setVal} placeholder="0,00" /></Field>
          <Field label="Data"><Input type="date" value={date} onChange={setDate} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={type} onChange={(v) => setType(v as any)}>
              {typeOptions.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </Select>
          </Field>
          <Field label="Categoria">
            <Select value={cat} onChange={setCat}>
              {cats.map((c) => <option key={c.n} value={c.n}>{c.n}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pagamento"><PaySelect value={pay} onChange={setPay} cartoes={cartoes} /></Field>
          {!isEdit && (
            <Field label="Parcelado?">
              <Select value={parcelado ? "sim" : "nao"} onChange={(v) => setParcelado(v === "sim")}>
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </Select>
            </Field>
          )}
        </div>
        {parcelado && !isEdit && (
          <Field label="Nº de parcelas">
            <Input type="number" value={String(parcelas)} onChange={(v) => setParcelas(parseInt(v) || 2)} />
          </Field>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-lg font-dm text-xs font-semibold"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
            Cancelar
          </button>
          <button onClick={handleSubmit}
            className="flex-1 py-3 rounded-lg font-dm text-xs font-semibold text-white transition-all hover:brightness-110"
            style={{ background: gasto ? "#ef4444" : "#10b981" }}>
            {isEdit ? "Salvar alterações" : gasto ? "Adicionar gasto" : "Adicionar entrada"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Form primitives ───────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 mb-3">
      <label className="font-dm text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-tertiary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value, onChange, type = "text", placeholder, autoFocus,
}: {
  value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; autoFocus?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="px-3 py-2.5 rounded-lg font-dm text-sm outline-none transition-all"
      style={{
        background: "var(--bg-input)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-default)",
        colorScheme: "dark",
      }}
      onFocus={(e) => e.currentTarget.style.borderColor = "var(--orange-500)"}
      onBlur={(e) => e.currentTarget.style.borderColor = "var(--border-default)"}
    />
  );
}

function Select({
  value, onChange, children,
}: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2.5 rounded-lg font-dm text-sm outline-none cursor-pointer"
      style={{
        background: "var(--bg-input)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-default)",
      }}
    >
      {children}
    </select>
  );
}

function PaySelect({
  value, onChange, cartoes,
}: { value: string; onChange: (v: string) => void; cartoes: string[] }) {
  return (
    <Select
      value={value}
      onChange={(v) => {
        if (v === "__novo") {
          const n = prompt("Nome do cartão:");
          if (n && n.trim()) onChange("c:" + n.trim());
        } else {
          onChange(v);
        }
      }}
    >
      <option value="pix">Pix</option>
      <option value="dinheiro">Dinheiro</option>
      <option value="debito">Débito</option>
      {cartoes.map((c) => <option key={c} value={"c:" + c}>Cartão: {c}</option>)}
      {value.startsWith("c:") && !cartoes.includes(value.slice(2)) && (
        <option value={value}>Cartão: {value.slice(2)}</option>
      )}
      <option value="__novo">+ Novo cartão...</option>
    </Select>
  );
}
