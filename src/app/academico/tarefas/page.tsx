"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, Plus, Pencil, Trash2, Search } from "lucide-react";
import Shell from "@/components/Shell";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import ViewToggle, { type ViewMode } from "../_components/ViewToggle";
import KanbanBoard, { type KanbanItem } from "../_components/KanbanBoard";
import SimpleCalendar from "../_components/SimpleCalendar";
import TarefaForm from "../_components/TarefaForm";
import {
  getTarefas, createTarefa, updateTarefa, deleteTarefa,
  getDisciplina, getDisciplinasCursando, getConteudosParaProva,
} from "@/lib/academico-data";
import type { Tarefa, TarefaInput, StatusTarefa } from "@/types/academico";
import { LABEL_TIPO_TAREFA, LABEL_STATUS_TAREFA } from "@/types/academico";

const STATUS_COLORS: Record<StatusTarefa, { bg: string; text: string; color: string }> = {
  pendente:     { bg: "var(--bg-hover)", text: "var(--text-secondary)", color: "#64748b" },
  em_andamento: { bg: "rgba(59,130,246,.1)", text: "#3b82f6", color: "#3b82f6" },
  concluida:    { bg: "rgba(16,185,129,.1)", text: "#10b981", color: "#10b981" },
};

const TIPO_COLORS: Record<string, string> = {
  prova: "#ef4444",
  trabalho: "#3b82f6",
  licao: "#8b5cf6",
  apresentacao: "#f59e0b",
  seminario: "#06b6d4",
  outro: "#64748b",
};

export default function TarefasPage() {
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const [view, setView] = useState<ViewMode>("tabela");
  const [search, setSearch] = useState("");
  const [filterDisciplina, setFilterDisciplina] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showConcluidas, setShowConcluidas] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Tarefa | null>(null);
  const [provaDetalhe, setProvaDetalhe] = useState<Tarefa | null>(null);

  const disciplinas = getDisciplinasCursando();
  const allTarefas = getTarefas();

  // Filter
  let filtered = allTarefas;
  if (!showConcluidas) filtered = filtered.filter(t => t.status !== "concluida");
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(t => t.titulo.toLowerCase().includes(q));
  }
  if (filterDisciplina) filtered = filtered.filter(t => t.disciplina_id === filterDisciplina);
  if (filterTipo) filtered = filtered.filter(t => t.tipo === filterTipo);
  if (filterStatus) filtered = filtered.filter(t => t.status === filterStatus);

  const sorted = [...filtered].sort((a, b) => (a.data_entrega || "9999").localeCompare(b.data_entrega || "9999"));
  const todayStr = new Date().toISOString().slice(0, 10);

  const handleSave = (data: TarefaInput) => {
    if (editing) {
      updateTarefa(editing.id, data);
      toast("Tarefa atualizada", { type: "success" });
    } else {
      createTarefa(data);
      toast("Tarefa criada", { type: "success" });
    }
    setEditing(null);
    setShowForm(false);
    refresh();
  };

  const cycleStatus = (t: Tarefa) => {
    const order: StatusTarefa[] = ["pendente", "em_andamento", "concluida"];
    const idx = order.indexOf(t.status);
    updateTarefa(t.id, { status: order[(idx + 1) % order.length] });
    refresh();
  };

  const getDiscName = (id: string) => getDisciplina(id)?.nome || "—";

  // Kanban items
  const kanbanColumns = (["pendente", "em_andamento", "concluida"] as StatusTarefa[]).map(s => ({
    key: s,
    label: LABEL_STATUS_TAREFA[s],
    color: STATUS_COLORS[s].color,
  }));

  const kanbanItems: KanbanItem[] = filtered.map(t => ({
    id: t.id,
    title: t.titulo,
    subtitle: `${getDiscName(t.disciplina_id)} · ${t.data_entrega || "Sem data"}`,
    badge: LABEL_TIPO_TAREFA[t.tipo],
    badgeColor: TIPO_COLORS[t.tipo],
    columnKey: t.status,
  }));

  // Calendar items
  const calendarItems = filtered.filter(t => t.data_entrega).map(t => ({
    id: t.id,
    date: t.data_entrega,
    label: t.titulo,
    color: TIPO_COLORS[t.tipo] || "#64748b",
  }));

  return (
    <Shell>
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/academico" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors">
              <ArrowLeft size={18} className="text-[var(--text-tertiary)]" />
            </Link>
            <div>
              <h1 className="font-fraunces text-xl font-bold text-[var(--text-primary)]">Tarefas e Avaliações</h1>
              <p className="font-dm text-sm text-[var(--text-tertiary)]">{allTarefas.filter(t => t.status !== "concluida").length} pendentes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle value={view} onChange={setView} />
            <Button variant="primary" size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus size={14} /> Nova
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar tarefas..."
              className="input-hamilton w-full pl-8 text-sm py-2" />
          </div>
          <select value={filterDisciplina} onChange={e => setFilterDisciplina(e.target.value)} className="input-hamilton text-sm py-2">
            <option value="">Todas disciplinas</option>
            {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="input-hamilton text-sm py-2">
            <option value="">Todos tipos</option>
            <option value="prova">Prova</option>
            <option value="trabalho">Trabalho</option>
            <option value="licao">Lição</option>
            <option value="apresentacao">Apresentação</option>
            <option value="seminario">Seminário</option>
            <option value="outro">Outro</option>
          </select>
          <label className="flex items-center gap-1.5 font-dm text-xs text-[var(--text-tertiary)] cursor-pointer">
            <input type="checkbox" checked={showConcluidas} onChange={e => setShowConcluidas(e.target.checked)} className="rounded" />
            Concluídas
          </label>
        </div>

        {/* ─── Table View ─── */}
        {view === "tabela" && (
          sorted.length === 0 ? (
            <EmptyState icon={<ClipboardCheck size={32} />} message="Nenhuma tarefa. Adicione provas, trabalhos e entregas." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="text-left py-2 px-3 font-dm text-xs text-[var(--text-tertiary)] font-medium">Entrega</th>
                    <th className="text-left py-2 px-3 font-dm text-xs text-[var(--text-tertiary)] font-medium">Título</th>
                    <th className="text-left py-2 px-3 font-dm text-xs text-[var(--text-tertiary)] font-medium">Disciplina</th>
                    <th className="text-left py-2 px-3 font-dm text-xs text-[var(--text-tertiary)] font-medium">Tipo</th>
                    <th className="text-left py-2 px-3 font-dm text-xs text-[var(--text-tertiary)] font-medium">Status</th>
                    <th className="text-left py-2 px-3 font-dm text-xs text-[var(--text-tertiary)] font-medium">Nota</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(t => {
                    const sc = STATUS_COLORS[t.status];
                    const isOverdue = t.status !== "concluida" && t.data_entrega && t.data_entrega < todayStr;
                    return (
                      <tr key={t.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors">
                        <td className={`py-2.5 px-3 font-mono text-xs ${isOverdue ? "text-[var(--red-text)] font-semibold" : "text-[var(--text-tertiary)]"}`}>
                          {t.data_entrega || "—"}{isOverdue && " !"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`font-dm text-sm ${t.status === "concluida" ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"}`}>
                            {t.titulo}
                          </span>
                          {t.tipo === "prova" && t.conteudos_ids.length > 0 && (
                            <button onClick={() => setProvaDetalhe(t)} className="ml-2 font-dm text-[10px] text-[var(--orange-500)] hover:underline">
                              {t.conteudos_ids.length} conteúdos
                            </button>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-dm text-xs text-[var(--text-secondary)]">{getDiscName(t.disciplina_id)}</td>
                        <td className="py-2.5 px-3">
                          <Badge bg={`${TIPO_COLORS[t.tipo]}15`} text={TIPO_COLORS[t.tipo]} label={LABEL_TIPO_TAREFA[t.tipo]} />
                        </td>
                        <td className="py-2.5 px-3">
                          <button onClick={() => cycleStatus(t)}
                            className="px-2 py-0.5 rounded text-xs font-dm font-medium transition-colors"
                            style={{ backgroundColor: sc.bg, color: sc.text }}>
                            {LABEL_STATUS_TAREFA[t.status]}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-[var(--text-tertiary)]">{t.nota ?? "—"}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditing(t); setShowForm(true); }} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><Pencil size={13} /></button>
                            <button onClick={() => { deleteTarefa(t.id); refresh(); }} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ─── Kanban View ─── */}
        {view === "kanban" && (
          <KanbanBoard
            columns={kanbanColumns}
            items={kanbanItems}
            onItemClick={id => { setEditing(allTarefas.find(t => t.id === id) || null); setShowForm(true); }}
            onAdvance={id => { cycleStatus(allTarefas.find(t => t.id === id)!); }}
          />
        )}

        {/* ─── Calendar View ─── */}
        {view === "calendario" && (
          <SimpleCalendar
            items={calendarItems}
            onItemClick={id => { setEditing(allTarefas.find(t => t.id === id) || null); setShowForm(true); }}
          />
        )}

        {/* Prova Detail Modal */}
        {provaDetalhe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setProvaDetalhe(null)}>
            <div onClick={e => e.stopPropagation()} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-float p-6 max-w-md w-full mx-4">
              <h3 className="font-fraunces text-lg font-semibold text-[var(--text-primary)] mb-1">{provaDetalhe.titulo}</h3>
              <p className="font-dm text-xs text-[var(--text-tertiary)] mb-4">{provaDetalhe.data_entrega} &middot; {getDiscName(provaDetalhe.disciplina_id)}</p>
              <p className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Conteúdos cobrados</p>
              <div className="space-y-1.5">
                {getConteudosParaProva(provaDetalhe.id).map(c => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border-subtle)]">
                    <span className="font-dm text-sm text-[var(--text-primary)]">{c.titulo}</span>
                    <Badge bg="var(--bg-hover)" text="var(--text-secondary)" label={c.status_estudo} />
                  </div>
                ))}
              </div>
              <div className="mt-4 text-right">
                <Button variant="secondary" size="sm" onClick={() => setProvaDetalhe(null)}>Fechar</Button>
              </div>
            </div>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <TarefaForm
            open
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSave={handleSave}
            initial={editing || undefined}
          />
        )}
      </div>
    </Shell>
  );
}
