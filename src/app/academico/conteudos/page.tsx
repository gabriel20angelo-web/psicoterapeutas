"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Plus, Pencil, Trash2, Check, ChevronRight, Search } from "lucide-react";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import ViewToggle, { type ViewMode } from "../_components/ViewToggle";
import KanbanBoard, { type KanbanItem } from "../_components/KanbanBoard";
import SimpleCalendar from "../_components/SimpleCalendar";
import ConteudoForm from "../_components/ConteudoForm";
import {
  getConteudos, createConteudo, updateConteudo, deleteConteudo,
  getDisciplina, getDisciplinasCursando, getConfigAcademica,
} from "@/lib/academico-data";
import type { Conteudo, ConteudoInput } from "@/types/academico";

export default function ConteudosPage() {
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const [view, setView] = useState<ViewMode>("tabela");
  const [search, setSearch] = useState("");
  const [filterDisciplina, setFilterDisciplina] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Conteudo | null>(null);

  const config = getConfigAcademica();
  const disciplinas = getDisciplinasCursando();
  const allConteudos = getConteudos();

  // Filter
  let filtered = allConteudos;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(c => c.titulo.toLowerCase().includes(q) || c.modulo_tematico.toLowerCase().includes(q));
  }
  if (filterDisciplina) filtered = filtered.filter(c => c.disciplina_id === filterDisciplina);
  if (filterStatus) filtered = filtered.filter(c => c.status_estudo === filterStatus);

  const sorted = [...filtered].sort((a, b) => b.data_aula.localeCompare(a.data_aula));

  const handleSave = (data: ConteudoInput) => {
    if (editing) {
      updateConteudo(editing.id, data);
      toast("Conteúdo atualizado", { type: "success" });
    } else {
      createConteudo(data);
      toast("Conteúdo criado", { type: "success" });
    }
    setEditing(null);
    setShowForm(false);
    refresh();
  };

  const handleAdvanceStatus = (id: string) => {
    const c = allConteudos.find(x => x.id === id);
    if (!c) return;
    const seq = config.status_estudo_sequence;
    const idx = seq.indexOf(c.status_estudo);
    if (idx < seq.length - 1) {
      updateConteudo(id, { status_estudo: seq[idx + 1] });
      refresh();
    }
  };

  const getDiscName = (id: string) => getDisciplina(id)?.nome || "—";

  // Kanban items
  const kanbanColumns = config.status_estudo_sequence.map((s, i) => ({
    key: s,
    label: s,
    color: ["#64748b", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981"][i % 5],
  }));

  const kanbanItems: KanbanItem[] = filtered.map(c => ({
    id: c.id,
    title: c.titulo,
    subtitle: getDiscName(c.disciplina_id),
    badge: c.data_aula,
    columnKey: c.status_estudo,
  }));

  // Calendar items
  const calendarItems = filtered.filter(c => c.data_aula).map(c => ({
    id: c.id,
    date: c.data_aula,
    label: c.titulo,
    sublabel: getDiscName(c.disciplina_id),
    color: "#3b82f6",
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
              <h1 className="font-fraunces text-xl font-bold text-[var(--text-primary)]">Conteúdos e Resumos</h1>
              <p className="font-dm text-sm text-[var(--text-tertiary)]">{allConteudos.length} conteúdos registrados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle value={view} onChange={setView} />
            <Button variant="primary" size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus size={14} /> Novo
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conteúdos..."
              className="input-hamilton w-full pl-8 text-sm py-2" />
          </div>
          <select value={filterDisciplina} onChange={e => setFilterDisciplina(e.target.value)}
            className="input-hamilton text-sm py-2">
            <option value="">Todas disciplinas</option>
            {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="input-hamilton text-sm py-2">
            <option value="">Todos status</option>
            {config.status_estudo_sequence.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* ─── Table View ─── */}
        {view === "tabela" && (
          sorted.length === 0 ? (
            <EmptyState icon={<BookOpen size={32} />} message="Nenhum conteúdo. Registre suas aulas e resumos." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th className="text-left py-2 px-3 font-dm text-xs text-[var(--text-tertiary)] font-medium">Data</th>
                    <th className="text-left py-2 px-3 font-dm text-xs text-[var(--text-tertiary)] font-medium">Título</th>
                    <th className="text-left py-2 px-3 font-dm text-xs text-[var(--text-tertiary)] font-medium">Disciplina</th>
                    <th className="text-left py-2 px-3 font-dm text-xs text-[var(--text-tertiary)] font-medium">Módulo</th>
                    <th className="text-left py-2 px-3 font-dm text-xs text-[var(--text-tertiary)] font-medium">Status</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(c => {
                    const seq = config.status_estudo_sequence;
                    const idx = seq.indexOf(c.status_estudo);
                    const isLast = idx === seq.length - 1;
                    return (
                      <tr key={c.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="py-2.5 px-3 font-mono text-xs text-[var(--text-tertiary)]">{c.data_aula || "—"}</td>
                        <td className="py-2.5 px-3 font-dm text-sm text-[var(--text-primary)]">{c.titulo}</td>
                        <td className="py-2.5 px-3 font-dm text-xs text-[var(--text-secondary)]">{getDiscName(c.disciplina_id)}</td>
                        <td className="py-2.5 px-3 font-dm text-xs text-[var(--text-tertiary)]">{c.modulo_tematico || "—"}</td>
                        <td className="py-2.5 px-3">
                          <button onClick={() => handleAdvanceStatus(c.id)} disabled={isLast}
                            className={`px-2 py-0.5 rounded text-xs font-dm font-medium ${isLast ? "bg-[rgba(16,185,129,.1)] text-[#10b981]" : "bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--orange-glow)] hover:text-[var(--orange-500)]"}`}>
                            {c.status_estudo} {!isLast && <ChevronRight size={10} className="inline" />}
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><Pencil size={13} /></button>
                            <button onClick={() => { deleteConteudo(c.id); refresh(); }} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]"><Trash2 size={13} /></button>
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
            onItemClick={id => { setEditing(allConteudos.find(c => c.id === id) || null); setShowForm(true); }}
            onAdvance={handleAdvanceStatus}
          />
        )}

        {/* ─── Calendar View ─── */}
        {view === "calendario" && (
          <SimpleCalendar
            items={calendarItems}
            onItemClick={id => { setEditing(allConteudos.find(c => c.id === id) || null); setShowForm(true); }}
          />
        )}

        {/* Form Modal */}
        {showForm && (
          <ConteudoForm
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
