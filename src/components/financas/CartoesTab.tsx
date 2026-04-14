"use client";

import { useState, useMemo } from "react";
import {
  Plus, Pencil, Trash2, CreditCard, ChevronDown, ChevronUp, X,
  ArrowDownCircle, ArrowUpCircle, Calendar, AlertTriangle, Check,
} from "lucide-react";
import {
  type Cartao, type AjusteCartao, type AjusteCartaoTipo, type Transacao, type FixoItem,
  fmtBRL, hojeISO, nextId, saldoPositivoCartao, faturaCartaoMes,
} from "@/lib/financas-data";

const CORES_CARTAO = [
  "#1e293b", "#7c3aed", "#0891b2", "#059669", "#dc2626",
  "#ea580c", "#d97706", "#65a30d", "#0284c7", "#c026d3",
];

export interface CartoesTabProps {
  cartoes: Cartao[];
  txs: Transacao[];
  fixos: FixoItem[];
  mY: number;
  mM: number;
  mesLabel: string;
  onSave: (c: Cartao[]) => void;
}

export default function CartoesTab({
  cartoes, txs, fixos, mY, mM, mesLabel, onSave,
}: CartoesTabProps) {
  const [modal, setModal] = useState<null | { editing: Cartao | null }>(null);
  const [ajusteModal, setAjusteModal] = useState<null | { cartao: Cartao; tipo: AjusteCartaoTipo }>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggleExpand(id: number) {
    const s = new Set(expanded);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpanded(s);
  }

  function handleSave(form: CartaoForm) {
    const { editId, nome, cor, limite, dia_fechamento, dia_vencimento, notas } = form;
    if (!nome.trim()) { alert("Dê um nome ao cartão."); return; }
    if (cartoes.find((c) => c.id !== editId && c.nome.toLowerCase() === nome.toLowerCase())) {
      alert("Já existe um cartão com esse nome."); return;
    }
    const limiteNum = parseFloat(limite);
    const limiteOk = !isNaN(limiteNum) && limiteNum > 0 ? limiteNum : undefined;
    const fechOk = dia_fechamento ? parseInt(dia_fechamento) : undefined;
    const vencOk = dia_vencimento ? parseInt(dia_vencimento) : undefined;

    if (editId) {
      onSave(cartoes.map((c) => c.id === editId
        ? { ...c, nome, cor, limite: limiteOk, dia_fechamento: fechOk, dia_vencimento: vencOk, notas: notas || undefined }
        : c));
    } else {
      onSave([
        ...cartoes,
        {
          id: nextId(),
          nome, cor,
          limite: limiteOk,
          dia_fechamento: fechOk,
          dia_vencimento: vencOk,
          ajustes: [],
          ativo: true,
          criado_em: hojeISO(),
          notas: notas || undefined,
        },
      ]);
    }
    setModal(null);
  }

  function handleAjuste(valor: number, data: string, notas: string) {
    if (!ajusteModal) return;
    const { cartao, tipo } = ajusteModal;
    const aj: AjusteCartao = { id: nextId(), tipo, valor, data, notas: notas || undefined };
    onSave(cartoes.map((c) => c.id === cartao.id
      ? { ...c, ajustes: [...c.ajustes, aj] }
      : c));
    setAjusteModal(null);
  }

  function deleteCartao(id: number) {
    if (!confirm("Remover este cartão? Os lançamentos existentes continuam lá mas perdem o vínculo.")) return;
    onSave(cartoes.filter((c) => c.id !== id));
  }

  function deleteAjuste(cartaoId: number, ajusteId: number) {
    if (!confirm("Remover este ajuste de saldo?")) return;
    onSave(cartoes.map((c) => c.id === cartaoId
      ? { ...c, ajustes: c.ajustes.filter((a) => a.id !== ajusteId) }
      : c));
  }

  function toggleAtivo(id: number) {
    onSave(cartoes.map((c) => c.id === id ? { ...c, ativo: !c.ativo } : c));
  }

  const ativos = cartoes.filter((c) => c.ativo);
  const inativos = cartoes.filter((c) => !c.ativo);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <p className="font-dm text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}>
            Cartões de crédito
          </p>
          <p className="font-dm text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Fatura do mês atual: <strong>{mesLabel}</strong>
          </p>
        </div>
        <button
          onClick={() => setModal({ editing: null })}
          className="px-3 py-2 rounded-lg font-dm text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:brightness-110 text-white"
          style={{ background: "var(--orange-500)" }}
        >
          <Plus size={13} /> Novo cartão
        </button>
      </div>

      {cartoes.length === 0 ? (
        <div className="rounded-xl p-10 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
          <CreditCard size={32} className="mx-auto mb-3" style={{ color: "var(--text-tertiary)" }} />
          <p className="font-dm text-xs" style={{ color: "var(--text-tertiary)" }}>
            Nenhum cartão cadastrado. Crie um para acompanhar fatura, limite e saldo positivo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ativos.map((c) => (
            <CartaoCardView
              key={c.id}
              c={c}
              txs={txs}
              fixos={fixos}
              mY={mY}
              mM={mM}
              expanded={expanded.has(c.id)}
              onToggle={() => toggleExpand(c.id)}
              onCredito={() => setAjusteModal({ cartao: c, tipo: "credito" })}
              onDebito={() => setAjusteModal({ cartao: c, tipo: "debito" })}
              onEdit={() => setModal({ editing: c })}
              onToggleAtivo={() => toggleAtivo(c.id)}
              onDelete={() => deleteCartao(c.id)}
              onDeleteAjuste={(aid) => deleteAjuste(c.id, aid)}
            />
          ))}
        </div>
      )}

      {inativos.length > 0 && (
        <div className="mt-6">
          <p className="font-dm text-[10px] font-semibold uppercase tracking-wider mb-2"
            style={{ color: "var(--text-tertiary)" }}>
            Inativos ({inativos.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inativos.map((c) => (
              <CartaoCardView
                key={c.id}
                c={c}
                txs={txs}
                fixos={fixos}
                mY={mY}
                mM={mM}
                expanded={expanded.has(c.id)}
                onToggle={() => toggleExpand(c.id)}
                onCredito={() => setAjusteModal({ cartao: c, tipo: "credito" })}
                onDebito={() => setAjusteModal({ cartao: c, tipo: "debito" })}
                onEdit={() => setModal({ editing: c })}
                onToggleAtivo={() => toggleAtivo(c.id)}
                onDelete={() => deleteCartao(c.id)}
                onDeleteAjuste={(aid) => deleteAjuste(c.id, aid)}
              />
            ))}
          </div>
        </div>
      )}

      {modal && (
        <CartaoModal
          editing={modal.editing}
          onClose={() => setModal(null)}
          onSubmit={handleSave}
        />
      )}

      {ajusteModal && (
        <AjusteModal
          cartao={ajusteModal.cartao}
          tipo={ajusteModal.tipo}
          onClose={() => setAjusteModal(null)}
          onConfirm={handleAjuste}
        />
      )}
    </div>
  );
}

// ─── Card visual do cartão ────────────────────────

function CartaoCardView({
  c, txs, fixos, mY, mM, expanded,
  onToggle, onCredito, onDebito, onEdit, onToggleAtivo, onDelete, onDeleteAjuste,
}: {
  c: Cartao;
  txs: Transacao[];
  fixos: FixoItem[];
  mY: number;
  mM: number;
  expanded: boolean;
  onToggle: () => void;
  onCredito: () => void;
  onDebito: () => void;
  onEdit: () => void;
  onToggleAtivo: () => void;
  onDelete: () => void;
  onDeleteAjuste: (id: number) => void;
}) {
  const fatura = useMemo(() => faturaCartaoMes(c.nome, txs, fixos, mY, mM), [c.nome, txs, fixos, mY, mM]);
  const saldoPos = saldoPositivoCartao(c);
  const faturaLiquida = fatura.total - saldoPos;
  const pctLimite = c.limite ? Math.min(100, (fatura.total / c.limite) * 100) : 0;
  const proximoLimite = c.limite ? pctLimite > 80 : false;
  const estouro = c.limite ? fatura.total > c.limite : false;

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${c.cor}55`,
        opacity: c.ativo ? 1 : 0.55,
      }}>
      {/* Visual "cartão físico" */}
      <div className="p-5 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${c.cor}, ${c.cor}cc 60%, ${c.cor}88)`,
          color: "#fff",
        }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
          style={{ background: "#fff", transform: "translate(30%,-30%)" }} />
        <div className="relative flex items-start justify-between mb-6">
          <CreditCard size={24} style={{ opacity: 0.9 }} />
          <div className="text-right">
            <p className="font-dm text-[9px] uppercase tracking-wider opacity-80">Fatura do mês</p>
            <p className="font-fraunces text-2xl">R$ {fmtBRL(fatura.total)}</p>
          </div>
        </div>
        <div className="relative">
          <p className="font-fraunces text-lg">{c.nome}</p>
          <div className="flex justify-between items-center mt-1">
            <p className="font-dm text-[10px] opacity-80">
              {fatura.itens.length} {fatura.itens.length === 1 ? "lançamento" : "lançamentos"}
            </p>
            {(c.dia_fechamento || c.dia_vencimento) && (
              <p className="font-dm text-[10px] opacity-80 flex items-center gap-1">
                <Calendar size={9} />
                {c.dia_fechamento && `Fecha ${c.dia_fechamento}`}
                {c.dia_fechamento && c.dia_vencimento && " · "}
                {c.dia_vencimento && `Vence ${c.dia_vencimento}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Infos e actions */}
      <div className="p-4">
        {/* Limite bar */}
        {c.limite && (
          <div className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="font-dm text-[10px] font-semibold"
                style={{ color: estouro ? "#ef4444" : proximoLimite ? "#f59e0b" : "var(--text-secondary)" }}>
                {estouro ? "Limite estourado" : proximoLimite ? "Perto do limite" : "Uso do limite"}
              </span>
              <span className="font-mono text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                R$ {fmtBRL(fatura.total)} / R$ {fmtBRL(c.limite)}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
              <div className="h-full transition-all"
                style={{
                  width: `${Math.min(100, pctLimite)}%`,
                  background: estouro ? "#ef4444" : proximoLimite ? "#f59e0b" : c.cor,
                  opacity: 0.85,
                }} />
            </div>
          </div>
        )}

        {/* Saldo positivo destacado */}
        {saldoPos > 0 && (
          <div className="mb-3 p-3 rounded-lg"
            style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.25)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check size={14} style={{ color: "#10b981" }} />
                <span className="font-dm text-[11px] font-semibold" style={{ color: "#10b981" }}>
                  Saldo positivo no cartão
                </span>
              </div>
              <span className="font-mono text-sm font-semibold" style={{ color: "#10b981" }}>
                R$ {fmtBRL(saldoPos)}
              </span>
            </div>
            <p className="font-dm text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
              Fatura líquida considerando o crédito: {faturaLiquida <= 0
                ? <strong style={{ color: "#10b981" }}>R$ 0,00 (ainda sobra R$ {fmtBRL(-faturaLiquida)})</strong>
                : <strong>R$ {fmtBRL(faturaLiquida)}</strong>}
            </p>
          </div>
        )}
        {saldoPos < 0 && (
          <div className="mb-3 p-3 rounded-lg"
            style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)" }}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} style={{ color: "#ef4444" }} />
              <span className="font-dm text-[11px]" style={{ color: "#ef4444" }}>
                Saldo ajustado negativo: R$ {fmtBRL(Math.abs(saldoPos))} — verifique os ajustes.
              </span>
            </div>
          </div>
        )}

        {c.notas && (
          <p className="font-dm text-[11px] italic mb-3" style={{ color: "var(--text-tertiary)" }}>
            {c.notas}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={onCredito}
            className="flex-1 px-3 py-2 rounded-md font-dm text-[11px] font-semibold inline-flex items-center justify-center gap-1"
            style={{ background: "rgba(16,185,129,.12)", color: "#10b981", border: "1px solid rgba(16,185,129,.25)" }}
            title="Paguei a mais / recebi estorno">
            <ArrowUpCircle size={11} /> + Saldo positivo
          </button>
          <button onClick={onDebito}
            className="flex-1 px-3 py-2 rounded-md font-dm text-[11px] font-semibold inline-flex items-center justify-center gap-1"
            style={{ background: "rgba(251,146,60,.12)", color: "#fb923c", border: "1px solid rgba(251,146,60,.25)" }}
            title="Usei o saldo positivo">
            <ArrowDownCircle size={11} /> − Usei saldo
          </button>
        </div>

        <div className="flex gap-1 justify-between mt-3">
          <button onClick={onToggle}
            className="px-3 py-1.5 rounded-md font-dm text-[11px] inline-flex items-center gap-1"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border-default)", background: "transparent" }}>
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            Detalhes
          </button>
          <div className="flex gap-1">
            <IconBtn onClick={onEdit} title="Editar"><Pencil size={12} /></IconBtn>
            <IconBtn onClick={onToggleAtivo} title={c.ativo ? "Desativar" : "Ativar"}>
              {c.ativo ? <X size={12} /> : <Check size={12} />}
            </IconBtn>
            <IconBtn onClick={onDelete} title="Excluir" danger><Trash2 size={12} /></IconBtn>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--border-default)", background: "var(--bg-hover)" }}>
          {/* Lançamentos do mês */}
          <div className="p-4">
            <p className="font-dm text-[10px] font-bold uppercase tracking-wider mb-2"
              style={{ color: "var(--text-tertiary)" }}>
              Lançamentos do mês ({fatura.itens.length})
            </p>
            {fatura.itens.length === 0 ? (
              <p className="font-dm text-[11px] italic" style={{ color: "var(--text-tertiary)" }}>
                Nenhum lançamento neste cartão no mês atual.
              </p>
            ) : (
              <div className="space-y-1">
                {fatura.itens.map((it, i) => (
                  <div key={i} className="flex justify-between items-center py-1 font-dm text-[11px]">
                    <span style={{ color: "var(--text-secondary)" }}>
                      <span className="font-mono text-[10px] mr-2" style={{ color: "var(--text-tertiary)" }}>
                        {it.date.slice(8, 10)}/{it.date.slice(5, 7)}
                      </span>
                      {it.desc}
                      {it.fixo && (
                        <span className="ml-1 text-[9px] font-semibold" style={{ color: "#a78bfa" }}>⟳</span>
                      )}
                    </span>
                    <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                      R$ {fmtBRL(it.val)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico de ajustes */}
          {c.ajustes.length > 0 && (
            <div className="p-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <p className="font-dm text-[10px] font-bold uppercase tracking-wider mb-2"
                style={{ color: "var(--text-tertiary)" }}>
                Ajustes de saldo ({c.ajustes.length})
              </p>
              <div className="space-y-1.5">
                {c.ajustes.slice().sort((a, b) => b.data.localeCompare(a.data)).map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded"
                    style={{ background: "var(--bg-card)" }}>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {a.tipo === "credito"
                        ? <ArrowUpCircle size={11} style={{ color: "#10b981" }} />
                        : <ArrowDownCircle size={11} style={{ color: "#fb923c" }} />}
                      <span className="font-mono text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        {a.data.slice(8, 10)}/{a.data.slice(5, 7)}
                      </span>
                      {a.notas && (
                        <span className="font-dm text-[10px] italic truncate" style={{ color: "var(--text-tertiary)" }}>
                          — {a.notas}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] font-semibold"
                      style={{ color: a.tipo === "credito" ? "#10b981" : "#fb923c" }}>
                      {a.tipo === "credito" ? "+ " : "− "}R$ {fmtBRL(a.valor)}
                    </span>
                    <button onClick={() => onDeleteAjuste(a.id)}
                      className="w-5 h-5 rounded inline-flex items-center justify-center"
                      style={{ color: "var(--text-tertiary)" }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modal: criar/editar cartão ───────────────────

interface CartaoForm {
  editId: number | null;
  nome: string;
  cor: string;
  limite: string;
  dia_fechamento: string;
  dia_vencimento: string;
  notas: string;
}

function CartaoModal({
  editing, onClose, onSubmit,
}: {
  editing: Cartao | null;
  onClose: () => void;
  onSubmit: (f: CartaoForm) => void;
}) {
  const [nome, setNome] = useState(editing?.nome || "");
  const [cor, setCor] = useState(editing?.cor || CORES_CARTAO[0]);
  const [limite, setLimite] = useState(editing?.limite ? String(editing.limite) : "");
  const [fech, setFech] = useState(editing?.dia_fechamento ? String(editing.dia_fechamento) : "");
  const [venc, setVenc] = useState(editing?.dia_vencimento ? String(editing.dia_vencimento) : "");
  const [notas, setNotas] = useState(editing?.notas || "");

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-7"
        style={{ background: "var(--bg-card-elevated)", border: "1px solid var(--border-default)" }}>
        <div className="flex justify-between items-start mb-5">
          <h2 className="font-fraunces text-xl flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: cor, color: "#fff" }}>
              <CreditCard size={14} />
            </span>
            {editing ? "Editar cartão" : "Novo cartão"}
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)" }}>
            <X size={18} />
          </button>
        </div>

        <Field label="Nome">
          <Input value={nome} onChange={setNome} placeholder="Ex: Nubank, Itaú Black..." autoFocus />
        </Field>

        <Field label="Cor">
          <div className="flex gap-2 flex-wrap">
            {CORES_CARTAO.map((c) => (
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

        <Field label="Limite (R$) — opcional">
          <Input type="number" value={limite} onChange={setLimite} placeholder="Ex: 5000" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Dia de fechamento (opc.)">
            <Input type="number" value={fech} onChange={setFech} placeholder="1-31" />
          </Field>
          <Field label="Dia de vencimento (opc.)">
            <Input type="number" value={venc} onChange={setVenc} placeholder="1-31" />
          </Field>
        </div>

        <Field label="Notas (opcional)">
          <Input value={notas} onChange={setNotas} placeholder="Observações sobre este cartão" />
        </Field>

        {editing && (
          <p className="font-dm text-[10px] mb-2" style={{ color: "var(--text-tertiary)" }}>
            💡 Renomear o cartão NÃO atualiza lançamentos antigos (eles ficam presos ao nome antigo).
          </p>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-lg font-dm text-xs font-semibold"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
            Cancelar
          </button>
          <button onClick={() => onSubmit({
            editId: editing?.id ?? null,
            nome, cor, limite, dia_fechamento: fech, dia_vencimento: venc, notas,
          })}
            className="flex-1 py-3 rounded-lg font-dm text-xs font-semibold text-white transition-all hover:brightness-110"
            style={{ background: cor }}>
            {editing ? "Salvar" : "Criar cartão"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: ajuste de saldo ───────────────────────

function AjusteModal({
  cartao, tipo, onClose, onConfirm,
}: {
  cartao: Cartao;
  tipo: AjusteCartaoTipo;
  onClose: () => void;
  onConfirm: (valor: number, data: string, notas: string) => void;
}) {
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [notas, setNotas] = useState("");
  const credito = tipo === "credito";

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl w-full max-w-sm p-6"
        style={{ background: "var(--bg-card-elevated)", border: "1px solid var(--border-default)" }}>
        <h2 className="font-fraunces text-lg mb-1" style={{ color: "var(--text-primary)" }}>
          {credito ? "Adicionar saldo positivo" : "Consumir saldo positivo"}
        </h2>
        <p className="font-dm text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: cartao.cor }}>{cartao.nome}</strong> · saldo atual R$ {fmtBRL(saldoPositivoCartao(cartao))}
        </p>
        <p className="font-dm text-[11px] mb-4" style={{ color: "var(--text-tertiary)" }}>
          {credito
            ? "Use quando pagar a mais na fatura, receber estorno ou qualquer crédito que fique no cartão."
            : "Use quando o saldo positivo já foi consumido por uma compra nova (caiu automaticamente)."}
        </p>

        <Field label="Valor (R$)">
          <Input type="number" value={valor} onChange={setValor} autoFocus />
        </Field>
        <Field label="Data">
          <Input type="date" value={data} onChange={setData} />
        </Field>
        <Field label="Notas (opcional)">
          <Input value={notas} onChange={setNotas}
            placeholder={credito ? "Ex: paguei fatura a mais" : "Ex: consumido em compra X"} />
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
            style={{ background: credito ? "#10b981" : "#fb923c" }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Primitivos ───────────────────────────────────

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
