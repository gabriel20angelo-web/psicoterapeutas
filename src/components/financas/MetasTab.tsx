"use client";

import { useState } from "react";
import {
  Plus, Pencil, Trash2, PiggyBank, Target, ArrowDownToLine, ArrowUpFromLine,
  TrendingUp, Calendar, X, Archive, ArchiveRestore, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  type Caixinha, type MovimentoCaixinha, type MovimentoTipo, type MetasFinanceiras,
  type ResumoMensal,
  fmtBRL, hojeISO, nextId, saldoCaixinha, totalReservado, progressoCaixinha,
} from "@/lib/financas-data";

const CORES_CAIXINHA = [
  "#C84B31", "#10b981", "#60a5fa", "#a78bfa", "#fb923c",
  "#fbbf24", "#ec4899", "#14b8a6", "#6366f1", "#f97316",
];

export interface MetasTabProps {
  caixinhas: Caixinha[];
  metas: MetasFinanceiras;
  resumo: ResumoMensal;
  patrimonio: number;
  mesLabel: string;
  onSaveCaixinhas: (c: Caixinha[]) => void;
  onSaveMetas: (m: MetasFinanceiras) => void;
}

export default function MetasTab({
  caixinhas, metas, resumo, patrimonio, mesLabel,
  onSaveCaixinhas, onSaveMetas,
}: MetasTabProps) {
  const [caixinhaModal, setCaixinhaModal] = useState<null | { editing: Caixinha | null }>(null);
  const [movModal, setMovModal] = useState<null | { caixinha: Caixinha; tipo: MovimentoTipo }>(null);
  const [editingMetas, setEditingMetas] = useState(false);
  const [expandedCx, setExpandedCx] = useState<Set<number>>(new Set());

  function toggleExpand(id: number) {
    const s = new Set(expandedCx);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpandedCx(s);
  }

  function handleSaveCaixinha(form: CaixinhaForm) {
    const { editId, nome, cor, meta, meta_data, notas } = form;
    if (!nome.trim()) { alert("Dê um nome para a caixinha."); return; }
    const metaNum = parseFloat(meta);
    const metaOk = !isNaN(metaNum) && metaNum > 0 ? metaNum : undefined;

    if (editId) {
      onSaveCaixinhas(caixinhas.map((c) => c.id === editId
        ? { ...c, nome, cor, meta: metaOk, meta_data: meta_data || undefined, notas: notas || undefined }
        : c));
    } else {
      onSaveCaixinhas([
        ...caixinhas,
        {
          id: nextId(),
          nome, cor, meta: metaOk,
          meta_data: meta_data || undefined,
          movimentos: [],
          criada_em: hojeISO(),
          notas: notas || undefined,
        },
      ]);
    }
    setCaixinhaModal(null);
  }

  function handleMovimento(valor: number, data: string, notas: string) {
    if (!movModal) return;
    const { caixinha, tipo } = movModal;
    if (tipo === "saque" && valor > saldoCaixinha(caixinha)) {
      if (!confirm("Saque maior que saldo. Continuar mesmo assim?")) return;
    }
    const mov: MovimentoCaixinha = { id: nextId(), tipo, valor, data, notas: notas || undefined };
    onSaveCaixinhas(caixinhas.map((c) => c.id === caixinha.id
      ? { ...c, movimentos: [...c.movimentos, mov] }
      : c));
    setMovModal(null);
  }

  function deleteCaixinha(id: number) {
    const c = caixinhas.find((x) => x.id === id);
    if (!c) return;
    const saldo = saldoCaixinha(c);
    const msg = saldo > 0
      ? `"${c.nome}" tem saldo de R$ ${fmtBRL(saldo)}. Excluir mesmo assim?`
      : `Remover "${c.nome}"?`;
    if (!confirm(msg)) return;
    onSaveCaixinhas(caixinhas.filter((c) => c.id !== id));
  }

  function toggleArquivar(id: number) {
    onSaveCaixinhas(caixinhas.map((c) => c.id === id ? { ...c, arquivada: !c.arquivada } : c));
  }

  function deleteMovimento(caixinhaId: number, movId: number) {
    if (!confirm("Remover este movimento?")) return;
    onSaveCaixinhas(caixinhas.map((c) => c.id === caixinhaId
      ? { ...c, movimentos: c.movimentos.filter((m) => m.id !== movId) }
      : c));
  }

  const ativas = caixinhas.filter((c) => !c.arquivada);
  const arquivadas = caixinhas.filter((c) => c.arquivada);

  return (
    <div className="space-y-6">
      {/* ─── DISPONÍVEL DO MÊS ─── */}
      <DisponivelCard resumo={resumo} mesLabel={mesLabel} />

      {/* ─── METAS GERAIS ─── */}
      <MetasCard
        metas={metas}
        editing={editingMetas}
        patrimonio={patrimonio}
        resumo={resumo}
        onStartEdit={() => setEditingMetas(true)}
        onCancel={() => setEditingMetas(false)}
        onSave={(m) => { onSaveMetas(m); setEditingMetas(false); }}
      />

      {/* ─── CAIXINHAS ─── */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <p className="font-dm text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}>
              Caixinhas (envelopes de economia)
            </p>
            <p className="font-dm text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Patrimônio reservado: <strong style={{ color: "var(--orange-500)" }}>R$ {fmtBRL(patrimonio)}</strong>
            </p>
          </div>
          <button
            onClick={() => setCaixinhaModal({ editing: null })}
            className="px-3 py-2 rounded-lg font-dm text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:brightness-110 text-white"
            style={{ background: "var(--orange-500)" }}
          >
            <Plus size={13} /> Nova caixinha
          </button>
        </div>

        {ativas.length === 0 && arquivadas.length === 0 ? (
          <div className="rounded-xl p-10 text-center"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
            <PiggyBank size={32} className="mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
            <p className="font-dm text-xs" style={{ color: "var(--text-tertiary)" }}>
              Nenhuma caixinha. Crie uma para começar a guardar dinheiro com propósito.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ativas.map((c) => (
              <CaixinhaCard
                key={c.id}
                c={c}
                expanded={expandedCx.has(c.id)}
                onToggle={() => toggleExpand(c.id)}
                onDeposito={() => setMovModal({ caixinha: c, tipo: "deposito" })}
                onSaque={() => setMovModal({ caixinha: c, tipo: "saque" })}
                onEdit={() => setCaixinhaModal({ editing: c })}
                onArquivar={() => toggleArquivar(c.id)}
                onDelete={() => deleteCaixinha(c.id)}
                onDeleteMov={(movId) => deleteMovimento(c.id, movId)}
              />
            ))}
          </div>
        )}

        {arquivadas.length > 0 && (
          <div className="mt-6">
            <p className="font-dm text-[10px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--text-tertiary)" }}>
              Arquivadas ({arquivadas.length})
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {arquivadas.map((c) => (
                <CaixinhaCard
                  key={c.id}
                  c={c}
                  expanded={expandedCx.has(c.id)}
                  onToggle={() => toggleExpand(c.id)}
                  onDeposito={() => setMovModal({ caixinha: c, tipo: "deposito" })}
                  onSaque={() => setMovModal({ caixinha: c, tipo: "saque" })}
                  onEdit={() => setCaixinhaModal({ editing: c })}
                  onArquivar={() => toggleArquivar(c.id)}
                  onDelete={() => deleteCaixinha(c.id)}
                  onDeleteMov={(movId) => deleteMovimento(c.id, movId)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {caixinhaModal && (
        <CaixinhaModal
          editing={caixinhaModal.editing}
          onClose={() => setCaixinhaModal(null)}
          onSubmit={handleSaveCaixinha}
        />
      )}

      {movModal && (
        <MovimentoModal
          caixinha={movModal.caixinha}
          tipo={movModal.tipo}
          onClose={() => setMovModal(null)}
          onConfirm={handleMovimento}
        />
      )}
    </div>
  );
}

// ─── Card: Disponível do mês ──────────────────────

function DisponivelCard({ resumo, mesLabel }: { resumo: ResumoMensal; mesLabel: string }) {
  const perigoso = resumo.saldo_projetado < 0;
  const acimaMax = resumo.meta_gasto_max > 0 && resumo.gastos_total > resumo.meta_gasto_max;
  const pctEconomia = resumo.meta_economia > 0
    ? Math.min(100, (resumo.economia_atual / resumo.meta_economia) * 100)
    : 0;

  return (
    <div className="rounded-xl p-6 relative overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${perigoso ? "rgba(239,68,68,.3)" : "var(--border-default)"}`,
      }}>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
        <div>
          <p className="font-dm text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: "var(--text-tertiary)" }}>
            Disponível neste mês · {mesLabel}
          </p>
          <p className="font-fraunces text-4xl"
            style={{ color: perigoso ? "#ef4444" : "var(--text-primary)" }}>
            R$ {fmtBRL(resumo.disponivel)}
          </p>
          {resumo.dias_restantes > 0 && resumo.disponivel > 0 && (
            <p className="font-dm text-xs mt-1.5" style={{ color: "var(--text-tertiary)" }}>
              <Calendar size={11} className="inline -mt-0.5 mr-1" />
              {resumo.dias_restantes} {resumo.dias_restantes === 1 ? "dia restante" : "dias restantes"}
              {" · "}R$ {fmtBRL(resumo.por_dia_restante)}/dia
            </p>
          )}
        </div>
        {resumo.taxa_poupanca > 0 && (
          <div className="text-right">
            <p className="font-dm text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}>
              Taxa de poupança
            </p>
            <p className="font-fraunces text-2xl" style={{ color: "#10b981" }}>
              {resumo.taxa_poupanca.toFixed(0)}%
            </p>
          </div>
        )}
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <Linha
          label="Entradas"
          real={resumo.entradas_realizadas}
          prev={resumo.entradas_previstas}
          color="#10b981"
        />
        <Linha
          label="Gastos"
          real={resumo.gastos_realizados}
          prev={resumo.gastos_previstos}
          color="#ef4444"
        />
        <div>
          <p className="font-dm text-[10px] uppercase tracking-wide font-semibold"
            style={{ color: "var(--text-tertiary)" }}>
            Saldo projetado
          </p>
          <p className="font-mono text-sm font-semibold"
            style={{ color: resumo.saldo_projetado >= 0 ? "#10b981" : "#ef4444" }}>
            {resumo.saldo_projetado >= 0 ? "+ " : "− "}R$ {fmtBRL(Math.abs(resumo.saldo_projetado))}
          </p>
        </div>
        {resumo.meta_economia > 0 && (
          <div>
            <p className="font-dm text-[10px] uppercase tracking-wide font-semibold"
              style={{ color: "var(--text-tertiary)" }}>
              Meta economia
            </p>
            <p className="font-mono text-sm font-semibold" style={{ color: "var(--orange-500)" }}>
              R$ {fmtBRL(resumo.meta_economia)}
            </p>
          </div>
        )}
      </div>

      {/* Progress bars */}
      {resumo.meta_economia > 0 && (
        <div className="mt-4">
          <div className="flex justify-between mb-1">
            <span className="font-dm text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
              Progresso da meta de economia
            </span>
            <span className="font-mono text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              R$ {fmtBRL(resumo.economia_atual)} / R$ {fmtBRL(resumo.meta_economia)}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
            <div className="h-full transition-all"
              style={{ width: `${pctEconomia}%`, background: "#10b981", opacity: 0.85 }} />
          </div>
        </div>
      )}

      {resumo.meta_gasto_max > 0 && (
        <div className="mt-3">
          <div className="flex justify-between mb-1">
            <span className="font-dm text-[10px] font-semibold"
              style={{ color: acimaMax ? "#ef4444" : "var(--text-secondary)" }}>
              Limite de gastos do mês {acimaMax && "· ESTOURADO"}
            </span>
            <span className="font-mono text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              R$ {fmtBRL(resumo.gastos_total)} / R$ {fmtBRL(resumo.meta_gasto_max)}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
            <div className="h-full transition-all"
              style={{
                width: `${Math.min(100, (resumo.gastos_total / resumo.meta_gasto_max) * 100)}%`,
                background: acimaMax ? "#ef4444" : "#f59e0b",
                opacity: 0.85,
              }} />
          </div>
        </div>
      )}
    </div>
  );
}

function Linha({ label, real, prev, color }: { label: string; real: number; prev: number; color: string }) {
  return (
    <div>
      <p className="font-dm text-[10px] uppercase tracking-wide font-semibold"
        style={{ color: "var(--text-tertiary)" }}>
        {label}
      </p>
      <p className="font-mono text-sm font-semibold" style={{ color }}>
        R$ {fmtBRL(real + prev)}
      </p>
      {prev > 0 && (
        <p className="font-dm text-[9px]" style={{ color: "var(--text-tertiary)" }}>
          R$ {fmtBRL(real)} real + R$ {fmtBRL(prev)} previsto
        </p>
      )}
    </div>
  );
}

// ─── Card: Metas gerais ───────────────────────────

function MetasCard({
  metas, editing, patrimonio, resumo,
  onStartEdit, onCancel, onSave,
}: {
  metas: MetasFinanceiras;
  editing: boolean;
  patrimonio: number;
  resumo: ResumoMensal;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: (m: MetasFinanceiras) => void;
}) {
  const [economia, setEconomia] = useState(metas.economia_mensal ? String(metas.economia_mensal) : "");
  const [gasto, setGasto] = useState(metas.gasto_maximo_mensal ? String(metas.gasto_maximo_mensal) : "");
  const [patAlvo, setPatAlvo] = useState(metas.patrimonio_alvo ? String(metas.patrimonio_alvo) : "");

  function parseOpt(s: string): number | undefined {
    const v = parseFloat(s);
    return !isNaN(v) && v > 0 ? v : undefined;
  }

  const temMetas = metas.economia_mensal || metas.gasto_maximo_mensal || metas.patrimonio_alvo;
  const pctPatrimonio = metas.patrimonio_alvo
    ? Math.min(100, (patrimonio / metas.patrimonio_alvo) * 100)
    : 0;

  return (
    <div className="rounded-xl p-6"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Target size={14} style={{ color: "var(--orange-500)" }} />
          <p className="font-dm text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}>
            Metas financeiras
          </p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="px-3 py-1.5 rounded-md font-dm text-[11px]"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
              Cancelar
            </button>
            <button onClick={() => onSave({
              economia_mensal: parseOpt(economia),
              gasto_maximo_mensal: parseOpt(gasto),
              patrimonio_alvo: parseOpt(patAlvo),
            })}
              className="px-3 py-1.5 rounded-md font-dm text-[11px] font-semibold text-white"
              style={{ background: "var(--orange-500)" }}>
              Salvar
            </button>
          </div>
        ) : (
          <button onClick={onStartEdit}
            className="px-3 py-1.5 rounded-md font-dm text-[11px] font-semibold"
            style={{ background: "var(--orange-glow)", color: "var(--orange-500)", border: "1px solid var(--border-orange)" }}>
            {temMetas ? "Editar" : "+ Definir metas"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <Field label="Economia mensal alvo (R$)">
            <Input type="number" value={economia} onChange={setEconomia} placeholder="Ex: 500" />
          </Field>
          <Field label="Gasto máximo mensal (R$)">
            <Input type="number" value={gasto} onChange={setGasto} placeholder="Ex: 3000" />
          </Field>
          <Field label="Meta de patrimônio reservado (R$)">
            <Input type="number" value={patAlvo} onChange={setPatAlvo} placeholder="Ex: 10000" />
          </Field>
          <p className="font-dm text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            Deixe em branco para não usar uma meta específica.
          </p>
        </div>
      ) : !temMetas ? (
        <p className="font-dm text-xs text-center py-4" style={{ color: "var(--text-tertiary)" }}>
          Nenhuma meta definida. Defina alvos para medir seu progresso.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metas.economia_mensal && (
            <MetaMini
              label="Economia do mês"
              icon={<TrendingUp size={12} />}
              color="#10b981"
              atual={resumo.economia_atual}
              alvo={metas.economia_mensal}
            />
          )}
          {metas.gasto_maximo_mensal && (
            <MetaMini
              label="Gasto máximo do mês"
              icon={<ArrowUpFromLine size={12} />}
              color="#f59e0b"
              atual={resumo.gastos_total}
              alvo={metas.gasto_maximo_mensal}
              inverter
            />
          )}
          {metas.patrimonio_alvo && (
            <div>
              <p className="font-dm text-[10px] font-semibold mb-1.5 inline-flex items-center gap-1"
                style={{ color: "var(--text-tertiary)" }}>
                <PiggyBank size={12} /> Patrimônio reservado
              </p>
              <p className="font-mono text-sm font-semibold mb-1" style={{ color: "var(--orange-500)" }}>
                R$ {fmtBRL(patrimonio)} / R$ {fmtBRL(metas.patrimonio_alvo)}
              </p>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                <div className="h-full transition-all"
                  style={{ width: `${pctPatrimonio}%`, background: "var(--orange-500)", opacity: 0.85 }} />
              </div>
              <p className="font-dm text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                {pctPatrimonio.toFixed(0)}% alcançado
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetaMini({
  label, icon, color, atual, alvo, inverter,
}: { label: string; icon: React.ReactNode; color: string; atual: number; alvo: number; inverter?: boolean }) {
  const pct = (atual / alvo) * 100;
  const bom = inverter ? pct <= 100 : pct >= 100;
  const mostrar = Math.min(100, pct);
  return (
    <div>
      <p className="font-dm text-[10px] font-semibold mb-1.5 inline-flex items-center gap-1"
        style={{ color: "var(--text-tertiary)" }}>
        {icon} {label}
      </p>
      <p className="font-mono text-sm font-semibold mb-1"
        style={{ color: inverter && pct > 100 ? "#ef4444" : color }}>
        R$ {fmtBRL(atual)} / R$ {fmtBRL(alvo)}
      </p>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
        <div className="h-full transition-all"
          style={{
            width: `${mostrar}%`,
            background: inverter && pct > 100 ? "#ef4444" : color,
            opacity: 0.85,
          }} />
      </div>
      <p className="font-dm text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
        {pct.toFixed(0)}% {bom ? "✓" : ""}
      </p>
    </div>
  );
}

// ─── Card: Caixinha ───────────────────────────────

function CaixinhaCard({
  c, expanded, onToggle, onDeposito, onSaque, onEdit, onArquivar, onDelete, onDeleteMov,
}: {
  c: Caixinha;
  expanded: boolean;
  onToggle: () => void;
  onDeposito: () => void;
  onSaque: () => void;
  onEdit: () => void;
  onArquivar: () => void;
  onDelete: () => void;
  onDeleteMov: (movId: number) => void;
}) {
  const saldo = saldoCaixinha(c);
  const pct = progressoCaixinha(c);
  const atingida = c.meta && saldo >= c.meta;

  return (
    <div className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${c.cor}40`,
        opacity: c.arquivada ? 0.6 : 1,
      }}>
      <div className="px-4 py-4" style={{
        background: `linear-gradient(135deg, ${c.cor}12, transparent 60%)`,
      }}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: c.cor + "22", color: c.cor }}>
              <PiggyBank size={16} />
            </div>
            <div>
              <div className="font-fraunces text-base" style={{ color: "var(--text-primary)" }}>
                {c.nome}
              </div>
              {c.meta && (
                <div className="font-dm text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  Meta: R$ {fmtBRL(c.meta)}
                  {c.meta_data && ` · até ${fmtData(c.meta_data)}`}
                </div>
              )}
            </div>
          </div>
          {atingida && (
            <span className="font-dm text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
              style={{ background: "rgba(16,185,129,.12)", color: "#10b981" }}>
              Meta atingida
            </span>
          )}
        </div>

        <div className="mb-2">
          <p className="font-mono text-xl font-semibold" style={{ color: c.cor }}>
            R$ {fmtBRL(saldo)}
          </p>
        </div>

        {c.meta && (
          <div className="mb-3">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
              <div className="h-full transition-all"
                style={{ width: `${pct}%`, background: c.cor, opacity: 0.85 }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="font-dm text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                {pct.toFixed(0)}% da meta
              </span>
              {c.meta > saldo && (
                <span className="font-mono text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  faltam R$ {fmtBRL(c.meta - saldo)}
                </span>
              )}
            </div>
          </div>
        )}

        {c.notas && (
          <p className="font-dm text-[11px] italic mb-3" style={{ color: "var(--text-tertiary)" }}>
            {c.notas}
          </p>
        )}

        <div className="flex gap-2 flex-wrap">
          {!c.arquivada && (
            <>
              <button onClick={onDeposito}
                className="flex-1 px-3 py-2 rounded-md font-dm text-[11px] font-semibold inline-flex items-center justify-center gap-1"
                style={{ background: "rgba(16,185,129,.12)", color: "#10b981", border: "1px solid rgba(16,185,129,.25)" }}>
                <ArrowDownToLine size={11} /> Depositar
              </button>
              <button onClick={onSaque}
                className="flex-1 px-3 py-2 rounded-md font-dm text-[11px] font-semibold inline-flex items-center justify-center gap-1"
                style={{ background: "rgba(239,68,68,.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,.2)" }}>
                <ArrowUpFromLine size={11} /> Sacar
              </button>
            </>
          )}
        </div>

        <div className="flex gap-1 justify-end mt-2">
          <IconBtn onClick={onToggle} title="Histórico">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </IconBtn>
          <IconBtn onClick={onEdit} title="Editar"><Pencil size={12} /></IconBtn>
          <IconBtn onClick={onArquivar} title={c.arquivada ? "Desarquivar" : "Arquivar"}>
            {c.arquivada ? <ArchiveRestore size={12} /> : <Archive size={12} />}
          </IconBtn>
          <IconBtn onClick={onDelete} title="Excluir" danger><Trash2 size={12} /></IconBtn>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--border-default)", background: "var(--bg-hover)" }}>
          {c.movimentos.length === 0 ? (
            <p className="font-dm text-[11px] italic text-center py-4" style={{ color: "var(--text-tertiary)" }}>
              Nenhum movimento ainda.
            </p>
          ) : (
            <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
              {c.movimentos.slice().sort((a, b) => b.data.localeCompare(a.data)).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded"
                  style={{ background: "var(--bg-card)" }}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {m.tipo === "deposito"
                      ? <ArrowDownToLine size={11} style={{ color: "#10b981" }} />
                      : <ArrowUpFromLine size={11} style={{ color: "#ef4444" }} />}
                    <span className="font-mono text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                      {fmtData(m.data)}
                    </span>
                    {m.notas && (
                      <span className="font-dm text-[10px] italic truncate" style={{ color: "var(--text-tertiary)" }}>
                        — {m.notas}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] font-semibold"
                    style={{ color: m.tipo === "deposito" ? "#10b981" : "#ef4444" }}>
                    {m.tipo === "deposito" ? "+ " : "− "}R$ {fmtBRL(m.valor)}
                  </span>
                  <button onClick={() => onDeleteMov(m.id)}
                    className="w-5 h-5 rounded inline-flex items-center justify-center"
                    style={{ color: "var(--text-tertiary)" }}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modal: criar/editar caixinha ─────────────────

interface CaixinhaForm {
  editId: number | null;
  nome: string;
  cor: string;
  meta: string;
  meta_data: string;
  notas: string;
}

function CaixinhaModal({
  editing, onClose, onSubmit,
}: {
  editing: Caixinha | null;
  onClose: () => void;
  onSubmit: (f: CaixinhaForm) => void;
}) {
  const [nome, setNome] = useState(editing?.nome || "");
  const [cor, setCor] = useState(editing?.cor || CORES_CAIXINHA[0]);
  const [meta, setMeta] = useState(editing?.meta ? String(editing.meta) : "");
  const [meta_data, setMetaData] = useState(editing?.meta_data || "");
  const [notas, setNotas] = useState(editing?.notas || "");

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-7"
        style={{ background: "var(--bg-card-elevated)", border: "1px solid var(--border-default)" }}>
        <div className="flex justify-between items-start mb-5">
          <h2 className="font-fraunces text-xl flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: cor + "22", color: cor }}>
              <PiggyBank size={15} />
            </span>
            {editing ? "Editar caixinha" : "Nova caixinha"}
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)" }}>
            <X size={18} />
          </button>
        </div>

        <Field label="Nome">
          <Input value={nome} onChange={setNome} placeholder="Ex: Viagem, Reserva emergência..." autoFocus />
        </Field>

        <Field label="Cor">
          <div className="flex gap-2 flex-wrap">
            {CORES_CAIXINHA.map((c) => (
              <button key={c} onClick={() => setCor(c)}
                className="w-8 h-8 rounded-lg transition-all"
                style={{
                  background: c,
                  transform: cor === c ? "scale(1.15)" : "scale(1)",
                  border: cor === c ? "2px solid var(--text-primary)" : "2px solid transparent",
                }} />
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Meta (R$) — opcional">
            <Input type="number" value={meta} onChange={setMeta} placeholder="Ex: 5000" />
          </Field>
          <Field label="Prazo (opcional)">
            <Input type="date" value={meta_data} onChange={setMetaData} />
          </Field>
        </div>

        <Field label="Notas (opcional)">
          <Input value={notas} onChange={setNotas} placeholder="Para que serve esta caixinha?" />
        </Field>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-lg font-dm text-xs font-semibold"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
            Cancelar
          </button>
          <button onClick={() => onSubmit({
            editId: editing?.id ?? null,
            nome, cor, meta, meta_data, notas,
          })}
            className="flex-1 py-3 rounded-lg font-dm text-xs font-semibold text-white transition-all hover:brightness-110"
            style={{ background: cor }}>
            {editing ? "Salvar" : "Criar caixinha"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: depositar / sacar ─────────────────────

function MovimentoModal({
  caixinha, tipo, onClose, onConfirm,
}: {
  caixinha: Caixinha;
  tipo: MovimentoTipo;
  onClose: () => void;
  onConfirm: (valor: number, data: string, notas: string) => void;
}) {
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [notas, setNotas] = useState("");
  const dep = tipo === "deposito";
  const cor = dep ? "#10b981" : "#ef4444";

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl w-full max-w-sm p-6"
        style={{ background: "var(--bg-card-elevated)", border: "1px solid var(--border-default)" }}>
        <h2 className="font-fraunces text-lg mb-1" style={{ color: "var(--text-primary)" }}>
          {dep ? "Depositar" : "Sacar"}
        </h2>
        <p className="font-dm text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: caixinha.cor }}>{caixinha.nome}</strong> · saldo atual R$ {fmtBRL(saldoCaixinha(caixinha))}
        </p>

        <Field label="Valor (R$)">
          <Input type="number" value={valor} onChange={setValor} autoFocus />
        </Field>
        <Field label="Data">
          <Input type="date" value={data} onChange={setData} />
        </Field>
        <Field label="Notas (opcional)">
          <Input value={notas} onChange={setNotas} placeholder="De onde veio / para onde foi" />
        </Field>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-dm text-xs font-semibold"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
            Cancelar
          </button>
          <button onClick={() => {
            const v = parseFloat(valor);
            if (isNaN(v) || v <= 0) { alert("Valor inválido."); return; }
            onConfirm(v, data, notas);
          }}
            className="flex-1 py-2.5 rounded-lg font-dm text-xs font-semibold text-white"
            style={{ background: cor }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Primitives ───────────────────────────────────

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
}: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; autoFocus?: boolean }) {
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
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--orange-500)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
    />
  );
}

function IconBtn({
  children, onClick, title, danger,
}: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  const hoverColor = danger ? "#ef4444" : "var(--orange-500)";
  const hoverBg = danger ? "rgba(239,68,68,.08)" : "var(--orange-glow)";
  return (
    <button onClick={onClick} title={title}
      className="w-7 h-7 rounded-md border flex items-center justify-center transition-all"
      style={{ borderColor: "transparent", color: "var(--text-tertiary)", background: "transparent" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = hoverColor;
        e.currentTarget.style.color = hoverColor;
        e.currentTarget.style.background = hoverBg;
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

function fmtData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}
