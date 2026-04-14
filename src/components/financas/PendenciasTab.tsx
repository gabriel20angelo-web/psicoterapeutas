"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Plus, Check, Pencil, Trash2, AlertCircle, Clock, Repeat,
  ArrowDownCircle, ArrowUpCircle, X,
} from "lucide-react";
import {
  type Pendencia, type Categoria, type PendenciaKind,
  type Emprestimo, type PagamentoEmprestimo, type Caixinha,
  fmtBRL, labelPay, isVencida, diasAteVencer, hojeISO, agruparDividas, nextId,
  type DividaGrupo,
} from "@/lib/financas-data";
import EmprestimosView from "./EmprestimosView";

type Filtro = "todos" | "pagar" | "receber" | "dividas" | "emprestimos";

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "pagar", label: "A pagar" },
  { id: "receber", label: "A receber" },
  { id: "dividas", label: "Dívidas" },
  { id: "emprestimos", label: "Empréstimos" },
];

export interface PendenciasTabProps {
  pendencias: Pendencia[];
  emprestimos: Emprestimo[];
  cats: Categoria[];
  caixinhas: Caixinha[];
  cartoes: string[];
  onSave: (pendencias: Pendencia[]) => void;
  onSaveEmprestimos: (e: Emprestimo[]) => void;
  onQuitar: (id: number, payDate: string) => void;
  onRegistrarPagamentoEmprestimo: (emprestimoId: number, pag: PagamentoEmprestimo) => void;
}

export default function PendenciasTab({
  pendencias, emprestimos, cats, caixinhas, cartoes, onSave, onSaveEmprestimos, onQuitar, onRegistrarPagamentoEmprestimo,
}: PendenciasTabProps) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [modal, setModal] = useState<null | { editing: Pendencia | null; kind: PendenciaKind }>(null);
  const [quitarModal, setQuitarModal] = useState<Pendencia | null>(null);

  // Listagem filtrada (abertas primeiro, por data)
  const lista = useMemo(() => {
    let list = [...pendencias];
    if (filtro === "pagar") list = list.filter((p) => p.kind === "pagar");
    if (filtro === "receber") list = list.filter((p) => p.kind === "receber");
    list.sort((a, b) => {
      if (a.status !== b.status) return a.status === "aberto" ? -1 : 1;
      return a.date_due.localeCompare(b.date_due);
    });
    return list;
  }, [pendencias, filtro]);

  const dividas = useMemo(() => agruparDividas(pendencias), [pendencias]);

  function deletePendencia(id: number) {
    const p = pendencias.find((x) => x.id === id);
    if (!p) return;
    const msg = p.parc_total && p.parc_total > 1
      ? `Remover esta parcela (${p.parc_num}/${p.parc_total})?`
      : "Remover esta pendência?";
    if (!confirm(msg)) return;
    onSave(pendencias.filter((p) => p.id !== id));
  }

  function deleteDivida(grupo: DividaGrupo) {
    if (!confirm(`Remover a dívida "${grupo.desc}" inteira (${grupo.parcelas.length} parcelas)?`)) return;
    onSave(pendencias.filter((p) => p.parent_id !== grupo.parent_id));
  }

  function savePendencia(form: PendenciaForm) {
    const { editId, desc, val, date_due, cat, pay, kind, credor, notas, caixinha_id, parcelar, parcelas } = form;
    if (!desc.trim() || isNaN(val) || !date_due) { alert("Preencha descrição, valor e vencimento."); return; }

    if (editId) {
      onSave(pendencias.map((p) => p.id === editId
        ? { ...p, desc, val, date_due, cat, pay, credor, notas, caixinha_id }
        : p));
    } else if (parcelar && parcelas > 1) {
      const parent_id = Date.now();
      const [y, m, d] = date_due.split("-").map(Number);
      const valParc = +(val / parcelas).toFixed(2);
      const novas: Pendencia[] = [];
      for (let i = 0; i < parcelas; i++) {
        const dt = new Date(y, m - 1 + i, d);
        novas.push({
          id: nextId() + i,
          kind,
          desc,
          val: valParc,
          date_due: dt.toISOString().slice(0, 10),
          cat, pay,
          status: "aberto",
          parc_num: i + 1,
          parc_total: parcelas,
          parent_id,
          credor: credor || undefined,
          notas: notas || undefined,
          caixinha_id,
        });
      }
      onSave([...pendencias, ...novas]);
    } else {
      onSave([
        ...pendencias,
        {
          id: nextId(),
          kind, desc, val, date_due, cat, pay,
          status: "aberto",
          credor: credor || undefined,
          notas: notas || undefined,
          caixinha_id,
        },
      ]);
    }
    setModal(null);
  }

  const count = {
    todos: pendencias.filter((p) => p.status === "aberto").length,
    pagar: pendencias.filter((p) => p.status === "aberto" && p.kind === "pagar").length,
    receber: pendencias.filter((p) => p.status === "aberto" && p.kind === "receber").length,
    dividas: dividas.length,
    emprestimos: emprestimos.filter((e) => e.pagamentos.reduce((a, p) => a + p.valor, 0) < e.valor_original).length,
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <p className="font-dm text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)" }}>
          Pendências financeiras — compromissos e recebíveis
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setModal({ editing: null, kind: "pagar" })}
            className="px-3 py-2 rounded-lg font-dm text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:brightness-110"
            style={{ background: "rgba(239,68,68,.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,.25)" }}
          >
            <Plus size={13} /> A pagar
          </button>
          <button
            onClick={() => setModal({ editing: null, kind: "receber" })}
            className="px-3 py-2 rounded-lg font-dm text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:brightness-110"
            style={{ background: "rgba(16,185,129,.12)", color: "#10b981", border: "1px solid rgba(16,185,129,.25)" }}
          >
            <Plus size={13} /> A receber
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTROS.map((f) => {
          const on = filtro === f.id;
          const n = count[f.id];
          return (
            <button key={f.id} onClick={() => setFiltro(f.id)}
              className="px-3 py-1.5 rounded-full font-dm text-[11px] font-semibold transition-all flex items-center gap-1.5"
              style={{
                background: on ? "var(--orange-500)" : "var(--bg-card)",
                color: on ? "#fff" : "var(--text-secondary)",
                border: `1px solid ${on ? "var(--orange-500)" : "var(--border-default)"}`,
              }}>
              {f.label}
              {n > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background: on ? "rgba(255,255,255,.2)" : "var(--bg-hover)",
                    color: on ? "#fff" : "var(--text-tertiary)",
                  }}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtro === "emprestimos" ? (
        <EmprestimosView
          emprestimos={emprestimos}
          cats={cats}
          cartoes={cartoes}
          onSave={onSaveEmprestimos}
          onRegistrarPagamento={onRegistrarPagamentoEmprestimo}
        />
      ) : filtro === "dividas" ? (
        <DividasView
          dividas={dividas}
          cats={cats}
          onStartEditParcela={(p) => setModal({ editing: p, kind: p.kind })}
          onQuitarParcela={(p) => setQuitarModal(p)}
          onDeleteDivida={deleteDivida}
        />
      ) : (
        <ListaPendencias
          lista={lista}
          cats={cats}
          onEdit={(p) => setModal({ editing: p, kind: p.kind })}
          onQuitar={(p) => setQuitarModal(p)}
          onDelete={deletePendencia}
        />
      )}

      {modal && (
        <PendenciaModal
          editing={modal.editing}
          kind={modal.kind}
          cats={cats}
          caixinhas={caixinhas}
          cartoes={cartoes}
          onClose={() => setModal(null)}
          onSubmit={savePendencia}
        />
      )}

      {quitarModal && (
        <QuitarModal
          pendencia={quitarModal}
          onClose={() => setQuitarModal(null)}
          onConfirm={(payDate) => {
            onQuitar(quitarModal.id, payDate);
            setQuitarModal(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Lista plana ───────────────────────────────────

function ListaPendencias({
  lista, cats, onEdit, onQuitar, onDelete,
}: {
  lista: Pendencia[];
  cats: Categoria[];
  onEdit: (p: Pendencia) => void;
  onQuitar: (p: Pendencia) => void;
  onDelete: (id: number) => void;
}) {
  if (lista.length === 0) {
    return (
      <div className="rounded-xl p-10 text-center"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
        <p className="font-dm text-xs" style={{ color: "var(--text-tertiary)" }}>
          Nenhuma pendência cadastrada.<br />
          Use os botões acima para adicionar um item a pagar ou receber.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
              <Th>Tipo</Th><Th>Descrição</Th><Th>Categoria</Th>
              <Th>Vencimento</Th><Th>Status</Th><Th alignRight>Valor</Th><Th></Th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => {
              const pagar = p.kind === "pagar";
              const vencida = isVencida(p);
              const dias = diasAteVencer(p);
              const catO = cats.find((c) => c.n === p.cat);
              const catBg = catO ? catO.c + "22" : "rgba(107,114,128,.15)";
              const catFg = catO ? catO.c : "#6b7280";

              let statusLabel = "Aberto";
              let statusColor = "var(--text-tertiary)";
              let statusBg = "var(--bg-hover)";

              if (p.status === "quitado") {
                statusLabel = pagar ? "Pago" : "Recebido";
                statusColor = "#10b981";
                statusBg = "rgba(16,185,129,.1)";
              } else if (p.status === "cancelado") {
                statusLabel = "Cancelado";
                statusColor = "var(--text-tertiary)";
              } else if (vencida) {
                statusLabel = "Vencido";
                statusColor = "#ef4444";
                statusBg = "rgba(239,68,68,.1)";
              } else if (dias <= 7) {
                statusLabel = dias === 0 ? "Hoje" : `${dias}d`;
                statusColor = "#f59e0b";
                statusBg = "rgba(245,158,11,.1)";
              }

              return (
                <tr key={p.id} style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  opacity: p.status === "aberto" ? 1 : 0.55,
                }}>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 font-dm text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                      style={{
                        background: pagar ? "rgba(239,68,68,.12)" : "rgba(16,185,129,.12)",
                        color: pagar ? "#ef4444" : "#10b981",
                      }}>
                      {pagar ? <ArrowUpCircle size={11} /> : <ArrowDownCircle size={11} />}
                      {pagar ? "Pagar" : "Receber"}
                    </span>
                  </Td>
                  <Td>
                    <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                      {p.desc}
                      {p.parc_num && p.parc_total && (
                        <span className="ml-1 font-dm text-[10px] font-semibold" style={{ color: "var(--orange-500)" }}>
                          {p.parc_num}/{p.parc_total}
                        </span>
                      )}
                    </div>
                    {p.credor && (
                      <div className="font-dm text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                        {p.credor}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <span className="px-2 py-0.5 rounded-full font-dm text-[10px]"
                      style={{ background: catBg, color: catFg, fontWeight: 500 }}>
                      {p.cat || "—"}
                    </span>
                  </Td>
                  <Td mono>
                    <span style={{ color: vencida && p.status === "aberto" ? "#ef4444" : "var(--text-tertiary)" }}>
                      {fmtData(p.date_due)}
                    </span>
                  </Td>
                  <Td>
                    <span className="px-2 py-0.5 rounded font-dm text-[10px] font-bold uppercase tracking-wide inline-flex items-center gap-1"
                      style={{ background: statusBg, color: statusColor }}>
                      {p.status === "aberto" && vencida && <AlertCircle size={10} />}
                      {p.status === "aberto" && !vencida && dias <= 7 && dias >= 0 && <Clock size={10} />}
                      {statusLabel}
                    </span>
                  </Td>
                  <Td alignRight>
                    <span className="font-mono text-xs font-semibold whitespace-nowrap"
                      style={{ color: pagar ? "#ef4444" : "#10b981" }}>
                      {pagar ? "− " : "+ "}R$ {fmtBRL(p.val)}
                    </span>
                    <div className="font-dm text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                      {labelPay(p.pay)}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex gap-1 justify-end">
                      {p.status === "aberto" && (
                        <IconBtn onClick={() => onQuitar(p)} title={pagar ? "Marcar como pago" : "Marcar como recebido"} success>
                          <Check size={12} />
                        </IconBtn>
                      )}
                      <IconBtn onClick={() => onEdit(p)} title="Editar"><Pencil size={12} /></IconBtn>
                      <IconBtn onClick={() => onDelete(p.id)} title="Excluir" danger><Trash2 size={12} /></IconBtn>
                    </div>
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

// ─── Dívidas view (agrupadas) ──────────────────────

function DividasView({
  dividas, cats, onStartEditParcela, onQuitarParcela, onDeleteDivida,
}: {
  dividas: DividaGrupo[];
  cats: Categoria[];
  onStartEditParcela: (p: Pendencia) => void;
  onQuitarParcela: (p: Pendencia) => void;
  onDeleteDivida: (g: DividaGrupo) => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(parent_id: number) {
    const s = new Set(expanded);
    if (s.has(parent_id)) s.delete(parent_id); else s.add(parent_id);
    setExpanded(s);
  }

  if (dividas.length === 0) {
    return (
      <div className="rounded-xl p-10 text-center"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-default)" }}>
        <p className="font-dm text-xs" style={{ color: "var(--text-tertiary)" }}>
          Nenhuma dívida parcelada. Crie uma pendência com parcelamento para ver aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dividas.map((g) => {
        const isOpen = expanded.has(g.parent_id);
        const completa = g.restante === 0;
        return (
          <div key={g.parent_id} className="rounded-xl overflow-hidden"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              opacity: completa ? 0.6 : 1,
            }}>
            <button onClick={() => toggle(g.parent_id)}
              className="w-full px-5 py-4 text-left transition-colors"
              style={{ background: "transparent" }}>
              <div className="flex justify-between items-center flex-wrap gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Repeat size={14} style={{ color: g.kind === "pagar" ? "#ef4444" : "#10b981" }} />
                    <span className="font-fraunces text-base" style={{ color: "var(--text-primary)" }}>
                      {g.desc}
                    </span>
                    {completa && (
                      <span className="font-dm text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                        style={{ background: "rgba(16,185,129,.12)", color: "#10b981" }}>
                        Quitada
                      </span>
                    )}
                  </div>
                  {g.credor && (
                    <div className="font-dm text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {g.credor}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold"
                    style={{ color: g.kind === "pagar" ? "#ef4444" : "#10b981" }}>
                    R$ {fmtBRL(g.restante)}
                  </div>
                  <div className="font-dm text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    de R$ {fmtBRL(g.total)} · {g.parcelas.filter((p) => p.status === "quitado").length}/{g.parcelas.length} parcelas
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
                <div className="h-full transition-all"
                  style={{
                    width: `${g.pct}%`,
                    background: g.kind === "pagar" ? "#ef4444" : "#10b981",
                    opacity: 0.85,
                  }} />
              </div>
              {g.proxima && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-dm text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                    Próxima: parcela {g.proxima.parc_num}/{g.proxima.parc_total} — {fmtData(g.proxima.date_due)}
                    {isVencida(g.proxima) && (
                      <span className="ml-1 font-semibold" style={{ color: "#ef4444" }}>(vencida)</span>
                    )}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onQuitarParcela(g.proxima!); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onQuitarParcela(g.proxima!); }
                    }}
                    className="px-2 py-1 rounded-md font-dm text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    style={{ background: "rgba(16,185,129,.12)", color: "#10b981" }}>
                    <Check size={10} /> Quitar próxima
                  </span>
                </div>
              )}
            </button>

            {isOpen && (
              <div style={{ borderTop: "1px solid var(--border-default)" }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {g.parcelas.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <Td mono>
                            <span style={{ color: "var(--text-tertiary)" }}>{p.parc_num}/{p.parc_total}</span>
                          </Td>
                          <Td mono>{fmtData(p.date_due)}</Td>
                          <Td>
                            <span className="font-dm text-[10px]" style={{
                              color: p.status === "quitado" ? "#10b981" :
                                     isVencida(p) ? "#ef4444" : "var(--text-tertiary)",
                            }}>
                              {p.status === "quitado" ? "Pago" : isVencida(p) ? "Vencida" : "Aberta"}
                            </span>
                          </Td>
                          <Td alignRight>
                            <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                              R$ {fmtBRL(p.val)}
                            </span>
                          </Td>
                          <Td>
                            <div className="flex gap-1 justify-end">
                              {p.status === "aberto" && (
                                <IconBtn onClick={() => onQuitarParcela(p)} title="Quitar" success>
                                  <Check size={12} />
                                </IconBtn>
                              )}
                              <IconBtn onClick={() => onStartEditParcela(p)} title="Editar"><Pencil size={12} /></IconBtn>
                            </div>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 flex justify-end" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteDivida(g); }}
                    className="px-3 py-1.5 rounded font-dm text-[10px] font-semibold inline-flex items-center gap-1"
                    style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,.25)", background: "transparent" }}>
                    <Trash2 size={11} /> Remover dívida inteira
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Modal: criar/editar pendência ─────────────────

interface PendenciaForm {
  editId: number | null;
  kind: PendenciaKind;
  desc: string;
  val: number;
  date_due: string;
  cat: string;
  pay: string;
  credor: string;
  notas: string;
  caixinha_id?: number;
  parcelar: boolean;
  parcelas: number;
}

function PendenciaModal({
  editing, kind, cats, caixinhas, cartoes, onClose, onSubmit,
}: {
  editing: Pendencia | null;
  kind: PendenciaKind;
  cats: Categoria[];
  caixinhas: Caixinha[];
  cartoes: string[];
  onClose: () => void;
  onSubmit: (f: PendenciaForm) => void;
}) {
  const isEdit = !!editing;
  const [desc, setDesc] = useState(editing?.desc || "");
  const [val, setVal] = useState(editing ? String(editing.val) : "");
  const [date_due, setDateDue] = useState(editing?.date_due || hojeISO());
  const [cat, setCat] = useState(editing?.cat || cats[0]?.n || "");
  const [pay, setPay] = useState(editing?.pay || "pix");
  const [credor, setCredor] = useState(editing?.credor || "");
  const [notas, setNotas] = useState(editing?.notas || "");
  const [caixinhaId, setCaixinhaId] = useState(editing?.caixinha_id ? String(editing.caixinha_id) : "");
  const [parcelar, setParcelar] = useState(false);
  const [parcelas, setParcelas] = useState(2);

  const pagar = kind === "pagar";
  const caixinhasAtivas = caixinhas.filter((c) => !c.arquivada);

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-7"
        style={{ background: "var(--bg-card-elevated)", border: "1px solid var(--border-default)" }}>
        <div className="flex justify-between items-start mb-5">
          <h2 className="font-fraunces text-xl flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: pagar ? "rgba(239,68,68,.12)" : "rgba(16,185,129,.12)",
                color: pagar ? "#ef4444" : "#10b981",
              }}>
              {pagar ? <ArrowUpCircle size={15} /> : <ArrowDownCircle size={15} />}
            </span>
            {isEdit ? "Editar" : pagar ? "A pagar" : "A receber"}
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)" }}>
            <X size={18} />
          </button>
        </div>

        <Field label="Descrição">
          <Input value={desc} onChange={setDesc} placeholder={pagar ? "Ex: Conta de luz, Aluguel..." : "Ex: Sessão cliente X..."} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)"><Input type="number" value={val} onChange={setVal} placeholder="0,00" /></Field>
          <Field label="Vencimento"><Input type="date" value={date_due} onChange={setDateDue} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <Select value={cat} onChange={setCat}>
              {cats.map((c) => <option key={c.n} value={c.n}>{c.n}</option>)}
            </Select>
          </Field>
          <Field label="Pagamento"><PaySelect value={pay} onChange={setPay} cartoes={cartoes} /></Field>
        </div>
        <Field label={pagar ? "Credor (opcional)" : "Devedor (opcional)"}>
          <Input value={credor} onChange={setCredor} placeholder={pagar ? "Ex: Banco X, Loja Y" : "Ex: Cliente Z"} />
        </Field>
        {!isEdit && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Parcelado?">
                <Select value={parcelar ? "sim" : "nao"} onChange={(v) => setParcelar(v === "sim")}>
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </Select>
              </Field>
              {parcelar && (
                <Field label="Nº de parcelas">
                  <Input type="number" value={String(parcelas)} onChange={(v) => setParcelas(parseInt(v) || 2)} />
                </Field>
              )}
            </div>
            {parcelar && (
              <p className="font-dm text-[10px] -mt-1 mb-3" style={{ color: "var(--text-tertiary)" }}>
                Valor será dividido e parcelas geradas uma por mês a partir do vencimento.
              </p>
            )}
          </>
        )}
        {caixinhasAtivas.length > 0 && (
          <Field label={pagar ? "Pagar a partir de uma caixinha (opc.)" : "Depositar em uma caixinha (opc.)"}>
            <select value={caixinhaId} onChange={(e) => setCaixinhaId(e.target.value)}
              className="px-3 py-2.5 rounded-lg font-dm text-sm outline-none cursor-pointer"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
              }}>
              <option value="">— Nenhuma —</option>
              {caixinhasAtivas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
        )}

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
            kind, desc, val: parseFloat(val), date_due, cat, pay, credor, notas,
            caixinha_id: caixinhaId ? parseInt(caixinhaId) : undefined,
            parcelar, parcelas,
          })}
            className="flex-1 py-3 rounded-lg font-dm text-xs font-semibold text-white transition-all hover:brightness-110"
            style={{ background: pagar ? "#ef4444" : "#10b981" }}>
            {isEdit ? "Salvar" : "Criar pendência"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: confirmar quitação ─────────────────────

function QuitarModal({
  pendencia, onClose, onConfirm,
}: { pendencia: Pendencia; onClose: () => void; onConfirm: (date: string) => void }) {
  const [date, setDate] = useState(hojeISO());
  const pagar = pendencia.kind === "pagar";
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-2xl w-full max-w-sm p-6"
        style={{ background: "var(--bg-card-elevated)", border: "1px solid var(--border-default)" }}>
        <h2 className="font-fraunces text-lg mb-3" style={{ color: "var(--text-primary)" }}>
          {pagar ? "Marcar como pago" : "Marcar como recebido"}
        </h2>
        <p className="font-dm text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>{pendencia.desc}</strong> — R$ {fmtBRL(pendencia.val)}
        </p>
        <p className="font-dm text-[11px] mb-4" style={{ color: "var(--text-tertiary)" }}>
          Isso vai criar um lançamento real na data escolhida e marcar a pendência como quitada.
        </p>
        <Field label={pagar ? "Data de pagamento" : "Data de recebimento"}>
          <Input type="date" value={date} onChange={setDate} />
        </Field>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg font-dm text-xs font-semibold"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" }}>
            Cancelar
          </button>
          <button onClick={() => onConfirm(date)}
            className="flex-1 py-2.5 rounded-lg font-dm text-xs font-semibold text-white"
            style={{ background: "#10b981" }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Form primitives (duplicados p/ encapsular) ───

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

// ─── Table primitives (duplicados) ───

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
  children, onClick, title, danger, success,
}: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean; success?: boolean }) {
  const hoverColor = danger ? "#ef4444" : success ? "#10b981" : "var(--orange-500)";
  const hoverBg = danger ? "rgba(239,68,68,.08)" : success ? "rgba(16,185,129,.1)" : "var(--orange-glow)";
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
