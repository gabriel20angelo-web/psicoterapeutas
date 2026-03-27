"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus, CheckCircle, Circle, Clock, AlertTriangle,
  Calendar, Link2, Search, HelpCircle, Trash2,
} from "lucide-react";
import Shell from "@/components/Shell";
import UsinaNav from "@/components/usina/UsinaNav";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Tabs from "@/components/ui/Tabs";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { fadeUp, staggerChild } from "@/lib/animations";
import {
  getTarefas, createTarefa, updateTarefa, deleteTarefa,
  getConteudos, getTarefasHoje, getTarefasAtrasadas,
  PRIORIDADE_CONFIG,
  type Tarefa, type PrioridadeTarefa, type Conteudo,
} from "@/lib/usina-data";

// ─── HelpTip ───

function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button onClick={() => setOpen(!open)} className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors" title="Ajuda">
        <HelpCircle size={14} />
      </button>
      {open && (
        <div className="absolute left-full ml-2 top-0 z-50 w-64 p-3 rounded-xl card-base shadow-float text-left">
          <p className="font-dm text-xs text-[var(--text-secondary)] leading-relaxed">{text}</p>
          <button onClick={() => setOpen(false)} className="font-dm text-[10px] text-[var(--orange-500)] mt-2 hover:underline">Entendi</button>
        </div>
      )}
    </div>
  );
}

const TAB_LIST = [
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Semana" },
  { id: "todas", label: "Todas" },
  { id: "atrasadas", label: "Atrasadas" },
];

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

function getWeekDates(): string[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function daysBetween(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
}

export default function TarefasPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState("hoje");
  const [allTarefas, setAllTarefas] = useState<Tarefa[]>([]);
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState({ titulo: "", descricao: "", data_prevista: "", prioridade: "normal" as PrioridadeTarefa, conteudo_id: "" });
  const [searchConteudo, setSearchConteudo] = useState("");
  const [editingTarefaId, setEditingTarefaId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ titulo: "", descricao: "", data_prevista: "", prioridade: "normal" as PrioridadeTarefa });
  const [expandedTarefaId, setExpandedTarefaId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setAllTarefas(getTarefas());
    setConteudos(getConteudos());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const weekDates = useMemo(() => getWeekDates(), []);

  const tarefasHoje = useMemo(() =>
    allTarefas.filter(t => t.data_prevista === hoje && t.status !== "concluida"),
    [allTarefas, hoje]
  );

  const tarefasAtrasadas = useMemo(() =>
    allTarefas.filter(t => t.data_prevista && t.data_prevista < hoje && t.status !== "concluida"),
    [allTarefas, hoje]
  );

  const conteudoMap = useMemo(() => {
    const map = new Map<string, Conteudo>();
    conteudos.forEach(c => map.set(c.id, c));
    return map;
  }, [conteudos]);

  const filteredConteudos = useMemo(() => {
    if (!searchConteudo) return conteudos;
    const q = searchConteudo.toLowerCase();
    return conteudos.filter(c => c.titulo.toLowerCase().includes(q));
  }, [conteudos, searchConteudo]);

  const handleDelete = (id: string) => {
    deleteTarefa(id);
    reload();
    toast("Tarefa excluída", { type: "success" });
  };

  const handleToggle = (t: Tarefa) => {
    const newStatus = t.status === "concluida" ? "pendente" : "concluida";
    updateTarefa(t.id, { status: newStatus });
    reload();
    toast(newStatus === "concluida" ? "Tarefa concluída" : "Tarefa reaberta", { type: "success" });
  };

  const handleCreate = () => {
    if (!novaTarefa.titulo.trim()) return;
    createTarefa({
      titulo: novaTarefa.titulo,
      descricao: novaTarefa.descricao,
      data_prevista: novaTarefa.data_prevista || null,
      prioridade: novaTarefa.prioridade,
      conteudo_id: novaTarefa.conteudo_id || null,
    });
    setNovaTarefa({ titulo: "", descricao: "", data_prevista: "", prioridade: "normal", conteudo_id: "" });
    setShowModal(false);
    reload();
    toast("Tarefa criada", { type: "success" });
  };

  const startEditTarefa = (t: Tarefa) => {
    setEditingTarefaId(t.id);
    setEditForm({ titulo: t.titulo, descricao: t.descricao || "", data_prevista: t.data_prevista || "", prioridade: t.prioridade });
  };

  const saveEditTarefa = () => {
    if (!editingTarefaId || !editForm.titulo.trim()) return;
    updateTarefa(editingTarefaId, {
      titulo: editForm.titulo,
      descricao: editForm.descricao,
      data_prevista: editForm.data_prevista || null,
      prioridade: editForm.prioridade,
    });
    setEditingTarefaId(null);
    reload();
    toast("Tarefa atualizada", { type: "success" });
  };

  const cancelEditTarefa = () => {
    setEditingTarefaId(null);
  };

  const TarefaItem = ({ t, showDate, showLate }: { t: Tarefa; showDate?: boolean; showLate?: boolean }) => {
    const conteudo = t.conteudo_id ? conteudoMap.get(t.conteudo_id) : null;
    const prioConfig = PRIORIDADE_CONFIG[t.prioridade];
    const late = showLate && t.data_prevista ? daysBetween(t.data_prevista) : 0;
    const isEditing = editingTarefaId === t.id;
    const isExpanded = expandedTarefaId === t.id;

    if (isEditing) {
      return (
        <div className="px-4 py-3 space-y-3 rounded-xl" style={{ background: "var(--bg-card-elevated)" }}>
          <input
            type="text"
            value={editForm.titulo}
            onChange={(e) => setEditForm(prev => ({ ...prev, titulo: e.target.value }))}
            className="w-full rounded-lg bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
            placeholder="Titulo"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") saveEditTarefa(); if (e.key === "Escape") cancelEditTarefa(); }}
          />
          <textarea
            value={editForm.descricao}
            onChange={(e) => setEditForm(prev => ({ ...prev, descricao: e.target.value }))}
            className="w-full rounded-lg bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)] resize-none"
            placeholder="Descrição (opcional)"
            rows={2}
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={editForm.data_prevista}
              onChange={(e) => setEditForm(prev => ({ ...prev, data_prevista: e.target.value }))}
              className="flex-1 rounded-lg bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-1.5 font-dm text-xs text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
            />
            <select
              value={editForm.prioridade}
              onChange={(e) => setEditForm(prev => ({ ...prev, prioridade: e.target.value as PrioridadeTarefa }))}
              className="flex-1 rounded-lg bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-1.5 font-dm text-xs text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
            >
              {Object.entries(PRIORIDADE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={cancelEditTarefa} className="px-3 py-1.5 rounded-lg font-dm text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
              Cancelar
            </button>
            <button onClick={saveEditTarefa} className="px-3 py-1.5 rounded-lg font-dm text-xs font-semibold text-white transition-colors" style={{ background: "var(--orange-500)" }}>
              Salvar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 py-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors group">
        <div className="flex items-center gap-3">
          <button onClick={() => handleToggle(t)} className="shrink-0">
            {t.status === "concluida" ? (
              <CheckCircle size={18} className="text-[var(--green-text)]" />
            ) : (
              <Circle size={18} className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => startEditTarefa(t)}
              className={`font-dm text-sm block truncate text-left w-full cursor-pointer hover:underline ${t.status === "concluida" ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"}`}
              title="Clique para editar"
            >
              {t.titulo}
            </button>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded-md font-dm text-[10px] font-semibold"
                style={{ background: prioConfig.bg, color: prioConfig.cor }}
              >
                {prioConfig.label}
              </span>
              {conteudo && (
                <a
                  href={`/conteudo/conteudos/${conteudo.id}`}
                  className="inline-flex items-center gap-1 font-dm text-[10px] text-[var(--text-tertiary)] hover:text-[var(--orange-400)] transition-colors"
                >
                  <Link2 size={10} />
                  {conteudo.titulo.slice(0, 30)}{conteudo.titulo.length > 30 ? "..." : ""}
                </a>
              )}
              {showDate && t.data_prevista && (
                <span className="inline-flex items-center gap-1 font-dm text-[10px] text-[var(--text-tertiary)]">
                  <Calendar size={10} />
                  {t.data_prevista}
                </span>
              )}
              {showLate && late > 0 && (
                <span className="inline-flex items-center gap-1 font-dm text-[10px] font-semibold text-[var(--red-text)]">
                  <AlertTriangle size={10} />
                  {late} dia{late > 1 ? "s" : ""} atrasada
                </span>
              )}
              {t.descricao && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpandedTarefaId(isExpanded ? null : t.id); }}
                  className="font-dm text-[10px] text-[var(--text-tertiary)] hover:text-[var(--orange-400)] transition-colors"
                >
                  {isExpanded ? "ocultar" : "detalhes"}
                </button>
              )}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--red-text)] hover:bg-[var(--bg-hover)] opacity-0 group-hover:opacity-100 transition-all"
            title="Excluir tarefa"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {isExpanded && t.descricao && (
          <div className="ml-9 mt-2 font-dm text-xs text-[var(--text-secondary)] whitespace-pre-wrap rounded-lg p-2" style={{ background: "var(--bg-card-elevated)" }}>
            {t.descricao}
          </div>
        )}
      </div>
    );
  };

  const renderHoje = () => {
    if (tarefasHoje.length === 0) {
      return <EmptyState message="Nenhuma tarefa para hoje" icon={<CheckCircle size={32} />} />;
    }
    const grouped = Object.entries(PRIORIDADE_CONFIG).map(([key, config]) => ({
      key,
      config,
      items: tarefasHoje.filter(t => t.prioridade === key),
    })).filter(g => g.items.length > 0);

    return (
      <div className="space-y-4">
        {grouped.map(g => (
          <div key={g.key}>
            <h3 className="font-dm text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: g.config.cor }}>
              {g.config.label}
            </h3>
            <Card className="p-0 divide-y divide-[var(--border-subtle)]">
              {g.items.map(t => <TarefaItem key={t.id} t={t} />)}
            </Card>
          </div>
        ))}
      </div>
    );
  };

  const renderSemana = () => {
    const semNoData = allTarefas.filter(t => !t.data_prevista && t.status !== "concluida");

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto pb-2"><div className="grid grid-cols-7 gap-2 min-w-[700px]">
          {weekDates.map((date, i) => {
            const dayTarefas = allTarefas.filter(t => t.data_prevista === date);
            const isToday = date === hoje;

            return (
              <div key={date} className="min-h-[200px]">
                <div className={`font-dm text-xs font-semibold text-center py-2 rounded-t-xl ${isToday ? "bg-[var(--orange-400)] text-white" : "bg-[var(--bg-card)] text-[var(--text-secondary)]"}`}>
                  {DIAS_SEMANA[i]}
                  <span className="block text-[10px] font-normal opacity-70">{date.slice(5)}</span>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] border-t-0 rounded-b-xl p-1.5 space-y-1 min-h-[160px]">
                  {dayTarefas.map(t => (
                    <div
                      key={t.id}
                      className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    >
                      <button onClick={() => handleToggle(t)} className="shrink-0 mt-0.5">
                        {t.status === "concluida" ? (
                          <CheckCircle size={12} className="text-[var(--green-text)]" />
                        ) : (
                          <Circle size={12} className="text-[var(--text-tertiary)]" />
                        )}
                      </button>
                      <span className={`font-dm text-[11px] leading-tight ${t.status === "concluida" ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"}`}>
                        {t.titulo}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div></div>

        {semNoData.length > 0 && (
          <div>
            <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Sem data</h3>
            <Card className="p-0 divide-y divide-[var(--border-subtle)]">
              {semNoData.map(t => <TarefaItem key={t.id} t={t} showDate />)}
            </Card>
          </div>
        )}
      </div>
    );
  };

  const renderTodas = () => {
    if (allTarefas.length === 0) {
      return <EmptyState message="Nenhuma tarefa criada" icon={<Calendar size={32} />} />;
    }
    return (
      <Card className="p-0 divide-y divide-[var(--border-subtle)]">
        {allTarefas.map(t => <TarefaItem key={t.id} t={t} showDate />)}
      </Card>
    );
  };

  const renderAtrasadas = () => {
    if (tarefasAtrasadas.length === 0) {
      return <EmptyState message="Nenhuma tarefa atrasada" icon={<CheckCircle size={32} />} />;
    }
    return (
      <Card className="p-0 divide-y divide-[var(--border-subtle)]">
        {tarefasAtrasadas.map(t => <TarefaItem key={t.id} t={t} showLate />)}
      </Card>
    );
  };

  return (
    <Shell>
      <motion.div {...fadeUp()} className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <h1 className="font-fraunces text-2xl font-bold text-[var(--text-primary)]">Tarefas</h1>
            <HelpTip text="Gerencie todas as suas tarefas de produção. Cada tarefa pode ser vinculada a um conteúdo específico. Use as abas para filtrar por período. Clique no título de uma tarefa para editá-la." />
          </div>
          <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>
            Nova Tarefa
          </Button>
        </div>

        <UsinaNav />

        <div className="flex items-center gap-4 flex-wrap">
          <Tabs tabs={TAB_LIST} active={tab} onChange={setTab} layoutId="tarefas-tabs" />
          {tab === "semana" && (
            <HelpTip text="Arraste mentalmente suas tarefas entre os dias. Tarefas sem data aparecem no final." />
          )}
          {tab === "atrasadas" && (
            <>
              <HelpTip text="Tarefas que passaram do prazo. Redefina a data ou conclua para limpar a lista." />
              {tarefasAtrasadas.length > 0 && (
                <span className="font-dm text-xs font-semibold px-2.5 py-1 rounded-full bg-[rgba(239,68,68,.1)] text-[var(--red-text)]">
                  {tarefasAtrasadas.length} atrasada{tarefasAtrasadas.length > 1 ? "s" : ""}
                </span>
              )}
            </>
          )}
        </div>

        <motion.div {...fadeUp(0.1)}>
          {tab === "hoje" && renderHoje()}
          {tab === "semana" && renderSemana()}
          {tab === "todas" && renderTodas()}
          {tab === "atrasadas" && renderAtrasadas()}
        </motion.div>
      </motion.div>

      {/* Modal: New Task */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Tarefa">
        <div className="space-y-4">
          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Titulo *</label>
            <input
              type="text"
              value={novaTarefa.titulo}
              onChange={(e) => setNovaTarefa(prev => ({ ...prev, titulo: e.target.value }))}
              className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
              placeholder="O que precisa ser feito?"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Descrição</label>
            <textarea
              value={novaTarefa.descricao}
              onChange={(e) => setNovaTarefa(prev => ({ ...prev, descricao: e.target.value }))}
              className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)] resize-none"
              placeholder="Detalhes da tarefa (opcional)"
              rows={2}
            />
          </div>

          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Data Prevista</label>
            <input
              type="date"
              value={novaTarefa.data_prevista}
              onChange={(e) => setNovaTarefa(prev => ({ ...prev, data_prevista: e.target.value }))}
              className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
            />
          </div>

          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Prioridade</label>
            <select
              value={novaTarefa.prioridade}
              onChange={(e) => setNovaTarefa(prev => ({ ...prev, prioridade: e.target.value as PrioridadeTarefa }))}
              className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
            >
              {Object.entries(PRIORIDADE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Conteúdo vinculado</label>
            <input
              type="text"
              value={searchConteudo}
              onChange={(e) => setSearchConteudo(e.target.value)}
              className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)] mb-2"
              placeholder="Buscar conteúdo..."
            />
            <select
              value={novaTarefa.conteudo_id}
              onChange={(e) => setNovaTarefa(prev => ({ ...prev, conteudo_id: e.target.value }))}
              className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
            >
              <option value="">Nenhum</option>
              {filteredConteudos.map(c => (
                <option key={c.id} value={c.id}>{c.titulo}</option>
              ))}
            </select>
          </div>

          <Button onClick={handleCreate} disabled={!novaTarefa.titulo.trim()} className="w-full">
            Criar Tarefa
          </Button>
        </div>
      </Modal>
    </Shell>
  );
}
