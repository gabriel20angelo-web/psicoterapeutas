"use client";

import { useState } from "react";
import {
  Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp,
  HandCoins, HandHelping,
} from "lucide-react";
import {
  type Emprestimo, type Categoria, type DirecaoEmprestimo, type PagamentoEmprestimo,
  fmtBRL, hojeISO, emprestimoPago, emprestimoRestante, emprestimoPct, nextId,
} from "@/lib/financas-data";

export interface EmprestimosViewProps {
  emprestimos: Emprestimo[];
  cats: Categoria[];
  cartoes: string[];
  onSave: (e: Emprestimo[]) => void;
  onRegistrarPagamento: (emprestimoId: number, pag: PagamentoEmprestimo) => void;
}

export default function EmprestimosView({
  emprestimos, cats, cartoes, onSave, onRegistrarPagamento,
}: EmprestimosViewProps) {
  const [modal, setModal] = useState<null | { editing: Emprestimo | null; direcao: DirecaoEmprestimo }>(null);
  const [pagModal, setPagModal] = useState<Emprestimo | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(id: number) {
    const s = new Set(expanded);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpanded(s);
  }

  function handleDelete(id: number) {
    if (!confirm("Remover este empréstimo? Os pagamentos já lançados não serão excluídos.")) return;
    onSave(emprestimos.filter((e) => e.id !== id));
  }

  function handleSave(form: EmprestimoForm) {
    const { editId, direcao, pessoa, valor_original, data, prazo, notas, cat, pay } = form;
    if (!pessoa.trim() || isNaN(valor_original) || valor_original <= 0 || !data) {
      alert("Preencha pessoa, valor e data."); return;
    }
    if (editId) {
      onSave(emprestimos.map((e) => e.id === editId
        ? { ...e, direcao, pessoa, valor_original, data, prazo: prazo || undefined, notas: notas || undefined, cat, pay }
        : e));
    } else {
      onSave([
        ...emprestimos,
        {
          id: nextId(),
          direcao, pessoa, valor_original, data,
          prazo: prazo || undefined,
          status: "aberto",
          pagamentos: [],
          notas: notas || undefined,
          cat, pay,
        },
      ]);
    }
    setModal(null);
  }

  function handleRegistrarPagamento(valor: number, data: string, notas: string) {
    if (!pagModal) return;
    const pag: PagamentoEmprestimo = {
      id: nextId(),
      data,
      valor,
      notas: notas || undefined,
    };
    onRegistrarPagamento(pagModal.id, pag);
    setPagModal(null);
  }

  function removerPagamento(emprestimoId: number, pagId: number) {
    if (!confirm("Remover este pagamento? O lançamento associado não será apagado.")) return;
    onSave(emprestimos.map((e) => e.id === emprestimoId
      ? { ...e, pagamentos: e.pagamentos.filter((p) => p.id !== pagId), status: "aberto" as const }
      : e));
  }

  const abertos = emprestimos.filter((e) => emprestimoRestante(e) > 0);
  const quitados = emprestimos.filter((e) => emprestimoRestante(e) === 0);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <p className="font-dm text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}>
            Empréstimos informais
          </p>
          <p className="font-dm text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Dinheiro que você emprestou ou pegou emprestado com histórico de pagamentos.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setModal({ editing: null, direcao: "emprestei" })}
            className="px-3 py-2 rounded-lg font-dm text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:brightness-110"
            style={{ background: "rgba(96,165,250,.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,.25)" }}
          >
            <HandCoins size={13} /> Emprestei
          </button>
          <button
            onClick={() => setModal({ editing: null, direcao: "peguei" })}
            className="px-3 py-2 rounded-lg font-dm text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:brightness-110"
            style={{ background: "rgba(251,146,60,.12)", color: "#fb923c", border: "1px solid rgba(251,146,60,.25)" }}
          >
            <HandHelping size={13} /> Peguei
          </button>
        </div>
      </div>

      {emprestimos.length === 0 ? (
        <div className="rounded-xl p-10 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
          <p className="font-dm text-xs" style={{ color: "var(--text-tertiary)" }}>
            Nenhum empréstimo registrado.<br />
            Use os botões acima para começar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {abertos.map((e) => (
            <Card
              key={e.id}
              e={e}
              expanded={expanded.has(e.id)}
              onToggle={() => toggle(e.id)}
              onEdit={() => setModal({ editing: e, direcao: e.direcao })}
              onDelete={() => handleDelete(e.id)}
              onRegistrar={() => setPagModal(e)}
              onRemoverPagamento={(pagId) => removerPagamento(e.id, pagId)}
            />
          ))}
          {quitados.length > 0 && (
            <div>
              <p className="font-dm text-[10px] font-semibold uppercase tracking-wider mt-6 mb-2"
                style={{ color: "var(--text-tertiary)" }}>
                Quitados ({quitados.length})
              </p>
              <div className="space-y-3">
                {quitados.map((e) => (
                  <Card
                    key={e.id}
                    e={e}
                    expanded={expanded.has(e.id)}
                    onToggle={() => toggle(e.id)}
                    onEdit={() => setModal({ editing: e, direcao: e.direcao })}
                    onDelete={() => handleDelete(e.id)}
                    onRegistrar={() => setPagModal(e)}
                    onRemoverPagamento={(pagId) => removerPagamento(e.id, pagId)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {modal && (
        <EmprestimoModal
          editing={modal.editing}
          direcao={modal.direcao}
          cats={cats}
          cartoes={cartoes}
          onClose={() => setModal(null)}
          onSubmit={handleSave}
        />
      )}

      {pagModal && (
        <PagamentoModal
          emprestimo={pagModal}
          onClose={() => setPagModal(null)}
          onConfirm={handleRegistrarPagamento}
        />
      )}
    </div>
  );
}

// ─── Card de empréstimo ────────────────────────────

function Card({
  e, expanded, onToggle, onEdit, onDelete, onRegistrar, onRemoverPagamento,
}: {
  e: Emprestimo;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRegistrar: () => void;
  onRemoverPagamento: (pagId: number) => void;
}) {
  const pago = emprestimoPago(e);
  const restante = emprestimoRestante(e);
  const pct = emprestimoPct(e);
  const quitado = restante === 0;
  const emp = e.direcao === "emprestei";
  const cor = emp ? "#60a5fa" : "#fb923c";

  return (
    <div className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        opacity: quitado ? 0.65 : 1,
      }}>
      <div className="px-5 py-4">
        <div className="flex justify-between items-start gap-3 mb-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-dm text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded inline-flex items-center gap-1"
                style={{ background: cor + "22", color: cor }}>
                {emp ? <><HandCoins size={11} /> Emprestei</> : <><HandHelping size={11} /> Peguei</>}
              </span>
              <span className="font-fraunces text-base" style={{ color: "var(--text-primary)" }}>
                {e.pessoa}
              </span>
              {quitado && (
                <span className="font-dm text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                  style={{ background: "rgba(16,185,129,.12)", color: "#10b981" }}>
                  Quitado
                </span>
              )}
            </div>
            <div className="font-dm text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>
              Desde {fmtData(e.data)}{e.prazo && ` · previsto: ${fmtData(e.prazo)}`}
            </div>
            {e.notas && (
              <div className="font-dm text-[11px] italic mt-1" style={{ color: "var(--text-tertiary)" }}>
                {e.notas}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="font-mono text-sm font-semibold" style={{ color: cor }}>
              R$ {fmtBRL(restante)}
            </div>
            <div className="font-dm text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              de R$ {fmtBRL(e.valor_original)}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
          <div className="h-full transition-all"
            style={{ width: `${pct}%`, background: cor, opacity: 0.85 }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="font-dm text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            {e.pagamentos.length} {e.pagamentos.length === 1 ? "pagamento" : "pagamentos"} · R$ {fmtBRL(pago)} {emp ? "recebidos" : "pagos"}
          </span>
          <span className="font-dm text-[10px] font-semibold" style={{ color: cor }}>
            {pct.toFixed(0)}%
          </span>
        </div>

        <div className="flex gap-2 mt-4 flex-wrap">
          {!quitado && (
            <button onClick={onRegistrar}
              className="px-3 py-1.5 rounded-md font-dm text-[11px] font-semibold inline-flex items-center gap-1 transition-all hover:brightness-110"
              style={{ background: "rgba(16,185,129,.12)", color: "#10b981", border: "1px solid rgba(16,185,129,.25)" }}>
              <Plus size={11} /> {emp ? "Registrar recebimento" : "Registrar pagamento"}
            </button>
          )}
          <button onClick={onToggle}
            className="px-3 py-1.5 rounded-md font-dm text-[11px] inline-flex items-center gap-1"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border-default)", background: "transparent" }}>
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            Histórico ({e.pagamentos.length})
          </button>
          <button onClick={onEdit}
            className="px-3 py-1.5 rounded-md font-dm text-[11px] inline-flex items-center gap-1"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border-default)", background: "transparent" }}>
            <Pencil size={11} /> Editar
          </button>
          <button onClick={onDelete}
            className="px-3 py-1.5 rounded-md font-dm text-[11px] inline-flex items-center gap-1"
            style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,.25)", background: "transparent" }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {expanded && e.pagamentos.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border-default)", background: "var(--bg-hover)" }}>
          <div className="p-4 space-y-2">
            {e.pagamentos.slice().sort((a, b) => b.data.localeCompare(a.data)).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                <div className="flex items-center gap-2">
                  <Check size={12} style={{ color: "#10b981" }} />
                  <span className="font-mono text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    {fmtData(p.data)}
                  </span>
                  {p.notas && (
                    <span className="font-dm text-[11px] italic" style={{ color: "var(--text-tertiary)" }}>
                      — {p.notas}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold" style={{ color: cor }}>
                    R$ {fmtBRL(p.valor)}
                  </span>
                  <button onClick={() => onRemoverPagamento(p.id)}
                    className="w-6 h-6 rounded inline-flex items-center justify-center"
                    style={{ color: "var(--text-tertiary)" }}
                    title="Remover pagamento">
                    <X size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {expanded && e.pagamentos.length === 0 && (
        <div className="px-5 py-3 font-dm text-[11px] italic text-center"
          style={{ borderTop: "1px solid var(--border-default)", color: "var(--text-tertiary)" }}>
          Nenhum pagamento registrado ainda.
        </div>
      )}
    </div>
  );
}

// ─── Modal: criar/editar empréstimo ────────────────

interface EmprestimoForm {
  editId: number | null;
  direcao: DirecaoEmprestimo;
  pessoa: string;
  valor_original: number;
  data: string;
  prazo: string;
  notas: string;
  cat: string;
  pay: string;
}

function EmprestimoModal({
  editing, direcao, cats, cartoes, onClose, onSubmit,
}: {
  editing: Emprestimo | null;
  direcao: DirecaoEmprestimo;
  cats: Categoria[];
  cartoes: string[];
  onClose: () => void;
  onSubmit: (f: EmprestimoForm) => void;
}) {
  const [pessoa, setPessoa] = useState(editing?.pessoa || "");
  const [valor, setValor] = useState(editing ? String(editing.valor_original) : "");
  const [data, setData] = useState(editing?.data || hojeISO());
  const [prazo, setPrazo] = useState(editing?.prazo || "");
  const [notas, setNotas] = useState(editing?.notas || "");
  const [cat, setCat] = useState(editing?.cat || cats[0]?.n || "Outros");
  const [pay, setPay] = useState(editing?.pay || "pix");
  const emp = direcao === "emprestei";

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-7"
        style={{ background: "var(--bg-card-elevated)", border: "1px solid var(--border-default)" }}>
        <div className="flex justify-between items-start mb-5">
          <h2 className="font-fraunces text-xl flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: emp ? "rgba(96,165,250,.12)" : "rgba(251,146,60,.12)",
                color: emp ? "#60a5fa" : "#fb923c",
              }}>
              {emp ? <HandCoins size={15} /> : <HandHelping size={15} />}
            </span>
            {editing ? "Editar empréstimo" : emp ? "Novo empréstimo (emprestei)" : "Novo empréstimo (peguei)"}
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)" }}>
            <X size={18} />
          </button>
        </div>

        <Field label={emp ? "Emprestei para" : "Peguei de"}>
          <Input value={pessoa} onChange={setPessoa} placeholder="Nome da pessoa" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)"><Input type="number" value={valor} onChange={setValor} placeholder="0,00" /></Field>
          <Field label="Data"><Input type="date" value={data} onChange={setData} /></Field>
        </div>
        <Field label="Prazo previsto (opcional)">
          <Input type="date" value={prazo} onChange={setPrazo} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <Select value={cat} onChange={setCat}>
              {cats.map((c) => <option key={c.n} value={c.n}>{c.n}</option>)}
            </Select>
          </Field>
          <Field label="Forma padrão">
            <PaySelect value={pay} onChange={setPay} cartoes={cartoes} />
          </Field>
        </div>
        <Field label="Notas (opcional)">
          <Input value={notas} onChange={setNotas} placeholder="Observações..." />
        </Field>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-lg font-dm text-xs font-semibold"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
            Cancelar
          </button>
          <button onClick={() => onSubmit({
            editId: editing?.id ?? null,
            direcao, pessoa, valor_original: parseFloat(valor), data, prazo, notas, cat, pay,
          })}
            className="flex-1 py-3 rounded-lg font-dm text-xs font-semibold text-white transition-all hover:brightness-110"
            style={{ background: emp ? "#60a5fa" : "#fb923c" }}>
            {editing ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: registrar pagamento ────────────────────

function PagamentoModal({
  emprestimo, onClose, onConfirm,
}: {
  emprestimo: Emprestimo;
  onClose: () => void;
  onConfirm: (valor: number, data: string, notas: string) => void;
}) {
  const restante = emprestimoRestante(emprestimo);
  const [valor, setValor] = useState(String(restante));
  const [data, setData] = useState(hojeISO());
  const [notas, setNotas] = useState("");
  const emp = emprestimo.direcao === "emprestei";

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl w-full max-w-sm p-6"
        style={{ background: "var(--bg-card-elevated)", border: "1px solid var(--border-default)" }}>
        <h2 className="font-fraunces text-lg mb-3" style={{ color: "var(--text-primary)" }}>
          {emp ? "Registrar recebimento" : "Registrar pagamento"}
        </h2>
        <p className="font-dm text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>{emprestimo.pessoa}</strong><br />
          Restante: R$ {fmtBRL(restante)}
        </p>
        <p className="font-dm text-[11px] mb-3" style={{ color: "var(--text-tertiary)" }}>
          Isso cria um lançamento real na data escolhida.
        </p>
        <Field label="Valor (R$)">
          <Input type="number" value={valor} onChange={setValor} />
        </Field>
        <Field label="Data">
          <Input type="date" value={data} onChange={setData} />
        </Field>
        <Field label="Notas (opcional)">
          <Input value={notas} onChange={setNotas} placeholder="Ex: Parcela 1 de 3" />
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
            style={{ background: "#10b981" }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Primitivos ────────────────────────────────────

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

function Select({
  value, onChange, children,
}: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2.5 rounded-lg font-dm text-sm outline-none cursor-pointer"
      style={{
        background: "var(--bg-input)",
        color: "var(--text-primary)",
        border: "1px solid var(--border-default)",
      }}>
      {children}
    </select>
  );
}

function PaySelect({
  value, onChange, cartoes,
}: { value: string; onChange: (v: string) => void; cartoes: string[] }) {
  return (
    <Select value={value} onChange={(v) => {
      if (v === "__novo") {
        const n = prompt("Nome do cartão:");
        if (n && n.trim()) onChange("c:" + n.trim());
      } else onChange(v);
    }}>
      <option value="pix">Pix</option>
      <option value="dinheiro">Dinheiro</option>
      <option value="debito">Débito</option>
      <option value="boleto">Boleto</option>
      {cartoes.map((c) => <option key={c} value={"c:" + c}>Cartão: {c}</option>)}
      {value.startsWith("c:") && !cartoes.includes(value.slice(2)) && (
        <option value={value}>Cartão: {value.slice(2)}</option>
      )}
      <option value="__novo">+ Novo cartão...</option>
    </Select>
  );
}

function fmtData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}
