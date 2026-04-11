"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Sparkles, Plus, Trash2, ArrowRight, Check, ChevronDown,
  Send, Pencil, X, Target, AlertTriangle, CalendarDays,
  CheckCircle, Clock, ArrowUpRight, HelpCircle, BookOpen,
} from "lucide-react";
import { getConteudos as getAcConteudos, getBibliotecaEmLeitura, getDisciplinasCursando } from "@/lib/academico-data";
import Shell from "@/components/Shell";
import UsinaNav from "@/components/usina/UsinaNav";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { fadeUp, staggerChild } from "@/lib/animations";
import Modal from "@/components/ui/Modal";
import {
  getRascunhos, createRascunho, updateRascunho, deleteRascunho,
  createConteudo, addConteudoRede, getEditorias, getRedesSociais,
  getStatusCounts, getConteudosProximos7Dias, getConteudoRedes, getRedeSocial,
  getTarefasHoje, getTarefasAtrasadas, updateTarefa, getConteudo,
  createTarefa, deleteTarefa,
  getMetas, calcularMetaAtual,
  STATUS_CONFIG, PIPELINE_ORDER, FUNIL_CONFIG,
  type RascunhoRapido, type Conteudo, type Tarefa, type Meta,
  type Editoria, type RedeSocial, type Funil,
} from "@/lib/usina-data";

// ─── Helpers ───

function formatWeekday(date: Date): string {
  return date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

function formatDayMonth(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.toISOString().slice(0, 10) === d2.toISOString().slice(0, 10);
}

function getNext7Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

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

// ─── Main Component ───

export default function UsinaDashboard() {
  const { toast } = useToast();
  // --- State ---
  const [rascunhoInput, setRascunhoInput] = useState("");
  const [rascunhos, setRascunhos] = useState<RascunhoRapido[]>([]);
  const [editingRascunhoId, setEditingRascunhoId] = useState<string | null>(null);
  const [editingRascunhoText, setEditingRascunhoText] = useState("");
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [proximos7, setProximos7] = useState<Conteudo[]>([]);
  const [tarefasHoje, setTarefasHoje] = useState<Tarefa[]>([]);
  const [tarefasAtrasadas, setTarefasAtrasadas] = useState<Tarefa[]>([]);
  const [showAtrasadas, setShowAtrasadas] = useState(false);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [mounted, setMounted] = useState(false);
  const [newTarefaText, setNewTarefaText] = useState("");
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [addingDayText, setAddingDayText] = useState("");
  const [promoverModalOpen, setPromoverModalOpen] = useState(false);
  const [promoverRascunhoId, setPromoverRascunhoId] = useState<string | null>(null);
  const [promoverForm, setPromoverForm] = useState({
    titulo: "",
    editoria_id: "",
    funil: "" as string,
    data_planejada: "",
    emoji_marcador: "",
    redesSelecionadas: [] as string[],
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // --- Load data ---
  const refresh = useCallback(() => {
    setRascunhos(getRascunhos().slice(0, 5));
    setStatusCounts(getStatusCounts());
    setProximos7(getConteudosProximos7Dias());
    setTarefasHoje(getTarefasHoje());
    setTarefasAtrasadas(getTarefasAtrasadas());
    setMetas(getMetas().filter((m) => m.ativa));
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (editingRascunhoId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingRascunhoId]);

  // --- Handlers ---
  const handleCreateRascunho = () => {
    const text = rascunhoInput.trim();
    if (!text) return;
    createRascunho(text);
    setRascunhoInput("");
    refresh();
    toast("Ideia salva", { type: "success" });
    inputRef.current?.focus();
  };

  const handleOpenPromover = (r: RascunhoRapido) => {
    setPromoverRascunhoId(r.id);
    setPromoverForm({
      titulo: r.texto,
      editoria_id: "",
      funil: "",
      data_planejada: "",
      emoji_marcador: "",
      redesSelecionadas: [],
    });
    setPromoverModalOpen(true);
  };

  const handleSubmitPromover = () => {
    if (!promoverRascunhoId || !promoverForm.titulo.trim()) return;
    const conteudo = createConteudo({
      titulo: promoverForm.titulo.trim(),
      editoria_id: promoverForm.editoria_id || null,
      funil: (promoverForm.funil as Funil) || null,
      data_planejada: promoverForm.data_planejada || null,
      emoji_marcador: promoverForm.emoji_marcador || null,
    });
    for (const redeId of promoverForm.redesSelecionadas) {
      addConteudoRede(conteudo.id, redeId);
    }
    deleteRascunho(promoverRascunhoId);
    setPromoverModalOpen(false);
    setPromoverRascunhoId(null);
    refresh();
    toast("Ideia promovida a conteúdo", { type: "success" });
  };

  const handleToggleRedePromover = (redeId: string) => {
    setPromoverForm((prev) => ({
      ...prev,
      redesSelecionadas: prev.redesSelecionadas.includes(redeId)
        ? prev.redesSelecionadas.filter((id) => id !== redeId)
        : [...prev.redesSelecionadas, redeId],
    }));
  };

  const handleDeleteRascunho = (id: string) => {
    deleteRascunho(id);
    refresh();
    toast("Ideia descartada", { type: "info" });
  };

  const handleStartEditRascunho = (r: RascunhoRapido) => {
    setEditingRascunhoId(r.id);
    setEditingRascunhoText(r.texto);
  };

  const handleSaveEditRascunho = () => {
    if (editingRascunhoId && editingRascunhoText.trim()) {
      updateRascunho(editingRascunhoId, editingRascunhoText.trim());
      setEditingRascunhoId(null);
      setEditingRascunhoText("");
      refresh();
      toast("Salvo", { type: "success" });
    }
  };

  const handleCancelEditRascunho = () => {
    setEditingRascunhoId(null);
    setEditingRascunhoText("");
  };

  const handleCreateTarefa = () => {
    const text = newTarefaText.trim();
    if (!text) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    createTarefa({ titulo: text, data_prevista: todayStr });
    setNewTarefaText("");
    refresh();
    toast("Tarefa criada", { type: "success" });
  };

  const handleDeleteTarefa = (id: string) => {
    deleteTarefa(id);
    refresh();
    toast("Tarefa excluída", { type: "info" });
  };

  const handleCreateConteudoDay = (dayStr: string) => {
    const text = addingDayText.trim();
    if (!text) return;
    createConteudo({ titulo: text, data_planejada: dayStr, status: "caixa_de_ideias" });
    setAddingDay(null);
    setAddingDayText("");
    refresh();
    toast("Conteúdo criado", { type: "success" });
  };

  const handleToggleTarefa = (id: string) => {
    updateTarefa(id, { status: "concluida" });
    refresh();
    toast("Tarefa concluída", { type: "success" });
  };

  if (!mounted) return null;

  const days = getNext7Days();
  const today = new Date().toISOString().slice(0, 10);

  // ─── Render ───
  return (
    <Shell>
      <div className="max-w-6xl mx-auto space-y-10 pb-16">
        {/* Header */}
        <motion.div {...fadeUp(0)} className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--orange-glow)" }}
          >
            <Sparkles size={20} style={{ color: "var(--orange-500)" }} />
          </div>
          <div>
            <h1 className="font-fraunces text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Usina
            </h1>
            <p className="font-dm text-sm" style={{ color: "var(--text-secondary)" }}>
              Central de produção de conteúdo
            </p>
          </div>
        </motion.div>

        <UsinaNav />

        {/* ═══ Section A — Ideia Rápida ═══ */}
        <motion.section {...fadeUp(0.05)}>
          <Card className="!p-5">
            <div className="flex items-center gap-2 mb-4">
              <Plus size={16} style={{ color: "var(--orange-500)" }} />
              <span className="font-dm text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Ideia Rápida
              </span>
              <HelpTip text="Anote ideias de conteúdo rapidamente. Depois você pode promover uma ideia para um projeto completo com editoria, redes sociais e data de publicação." />
            </div>

            {/* Input row */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={rascunhoInput}
                onChange={(e) => setRascunhoInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateRascunho(); }}
                placeholder="Joga uma ideia aqui..."
                className="flex-1 font-dm text-sm rounded-xl px-4 py-2.5 outline-none transition-all duration-200"
                style={{
                  background: "var(--bg-card-elevated)",
                  color: "var(--text-primary)",
                  border: "1.5px solid var(--border-default)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--orange-500)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
              />
              <Button
                size="sm"
                onClick={handleCreateRascunho}
                disabled={!rascunhoInput.trim()}
                icon={<Send size={14} />}
              >
                Salvar
              </Button>
            </div>

            {/* Rascunhos list */}
            {rascunhos.length > 0 && (
              <div className="mt-4 space-y-2">
                <AnimatePresence mode="popLayout">
                  {rascunhos.map((r, i) => (
                    <motion.div
                      key={r.id}
                      {...staggerChild(i, 0.02)}
                      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                      layout
                      className="flex items-center gap-2 group rounded-lg px-3 py-2 transition-colors duration-150"
                      style={{ background: "var(--bg-card-elevated)" }}
                    >
                      {editingRascunhoId === r.id ? (
                        <>
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingRascunhoText}
                            onChange={(e) => setEditingRascunhoText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEditRascunho();
                              if (e.key === "Escape") handleCancelEditRascunho();
                            }}
                            className="flex-1 font-dm text-sm bg-transparent outline-none"
                            style={{ color: "var(--text-primary)" }}
                          />
                          <button
                            onClick={handleSaveEditRascunho}
                            className="p-1 rounded-md transition-colors"
                            style={{ color: "var(--green-text)" }}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={handleCancelEditRascunho}
                            className="p-1 rounded-md transition-colors"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEditRascunho(r)}
                            className="flex-1 text-left font-dm text-sm truncate cursor-text"
                            style={{ color: "var(--text-primary)" }}
                            title="Clique para editar"
                          >
                            {r.texto}
                          </button>
                          <button
                            onClick={() => handleOpenPromover(r)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all duration-150 hover:scale-105"
                            style={{ color: "var(--orange-500)" }}
                            title="Promover para conteúdo"
                          >
                            <ArrowUpRight size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteRascunho(r.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all duration-150"
                            style={{ color: "var(--red-text)" }}
                            title="Descartar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Card>
        </motion.section>

        {/* ═══ Section B — Pipeline Resumido ═══ */}
        <motion.section {...fadeUp(0.1)}>
          <div className="flex items-center gap-2 mb-4">
            <h2
              className="font-fraunces text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Pipeline
            </h2>
            <HelpTip text="O pipeline mostra em que etapa cada conteúdo está. Da ideia inicial até a publicação, cada card mostra quantos conteúdos estão em cada fase. Clique para ver os detalhes." />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {PIPELINE_ORDER.map((status, i) => {
              const config = STATUS_CONFIG[status];
              const count = statusCounts[status] || 0;
              return (
                <motion.div key={status} {...staggerChild(i, 0.08)}>
                  <Link href={`/conteudo/conteudos?status=${status}`}>
                    <Card hover className="!p-4 min-w-[120px] sm:min-w-[140px] flex-shrink-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                        style={{ background: config.bg }}
                      >
                        <span
                          className="text-xs font-dm font-bold"
                          style={{ color: config.cor }}
                        >
                          {count}
                        </span>
                      </div>
                      <p
                        className="font-dm text-xs font-medium"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {config.label}
                      </p>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ═══ Section C — Proximos 7 Dias ═══ */}
        <motion.section {...fadeUp(0.15)}>
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={18} style={{ color: "var(--orange-500)" }} />
            <h2
              className="font-fraunces text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Próximos 7 dias
            </h2>
            <HelpTip text="Visualize os conteúdos planejados para os próximos dias. Clique no '+' para adicionar um novo conteúdo diretamente em um dia específico." />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {days.map((day, i) => {
              const dayStr = day.toISOString().slice(0, 10);
              const isToday = dayStr === today;
              const dayConteudos = proximos7.filter((c) => c.data_planejada === dayStr);

              return (
                <motion.div
                  key={dayStr}
                  {...staggerChild(i, 0.06)}
                  className="min-w-[150px] flex-shrink-0"
                >
                  <Card
                    className={`!p-3 h-full ${isToday ? "!border-[var(--orange-500)]" : ""}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="font-dm text-xs font-semibold uppercase"
                        style={{ color: isToday ? "var(--orange-500)" : "var(--text-tertiary)" }}
                      >
                        {formatWeekday(day)}
                      </span>
                      <span
                        className="font-dm text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {formatDayMonth(day)}
                      </span>
                    </div>

                    {dayConteudos.length > 0 ? (
                      <div className="space-y-2">
                        {dayConteudos.map((c) => (
                          <TimelineCard key={c.id} conteudo={c} />
                        ))}
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-center h-12 rounded-lg"
                        style={{ background: "var(--bg-card-elevated)", opacity: 0.4 }}
                      >
                        <span
                          className="font-dm text-xs"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          --
                        </span>
                      </div>
                    )}

                    {addingDay === dayStr ? (
                      <div className="mt-2">
                        <input
                          type="text"
                          autoFocus
                          value={addingDayText}
                          onChange={(e) => setAddingDayText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateConteudoDay(dayStr);
                            if (e.key === "Escape") { setAddingDay(null); setAddingDayText(""); }
                          }}
                          placeholder="Título..."
                          className="w-full font-dm text-xs rounded-lg px-2 py-1.5 outline-none"
                          style={{
                            background: "var(--bg-card-elevated)",
                            color: "var(--text-primary)",
                            border: "1.5px solid var(--orange-500)",
                          }}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingDay(dayStr); setAddingDayText(""); }}
                        className="mt-2 w-full flex items-center justify-center gap-1 rounded-lg py-1 transition-colors hover:bg-[var(--bg-hover)]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ═══ Row 2: Tarefas de Hoje + Metas da Semana ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* ═══ Section D — Tarefas de Hoje ═══ */}
        <motion.section {...fadeUp(0.2)}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={18} style={{ color: "var(--orange-500)" }} />
            <h2
              className="font-fraunces text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Tarefas de hoje
            </h2>
            <HelpTip text="Tarefas pendentes para hoje. Marque como concluída, edite ou exclua. Adicione novas tarefas rapidamente pelo campo abaixo." />
          </div>

          <Card className="!p-4">
            {tarefasHoje.length > 0 ? (
              <div className="space-y-1">
                {tarefasHoje.map((t, i) => (
                  <TarefaRow key={t.id} tarefa={t} onToggle={handleToggleTarefa} onDelete={handleDeleteTarefa} index={i} />
                ))}
              </div>
            ) : (
              <p className="font-dm text-sm text-center py-4" style={{ color: "var(--text-tertiary)" }}>
                Nenhuma tarefa para hoje
              </p>
            )}

            {/* Inline task creation */}
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newTarefaText}
                onChange={(e) => setNewTarefaText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateTarefa(); }}
                placeholder="Nova tarefa..."
                className="flex-1 font-dm text-xs rounded-lg px-3 py-2 outline-none transition-colors"
                style={{
                  background: "var(--bg-card-elevated)",
                  color: "var(--text-primary)",
                  border: "1.5px solid var(--border-default)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--orange-500)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
              />
              <button
                onClick={handleCreateTarefa}
                disabled={!newTarefaText.trim()}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-30"
                style={{ color: "var(--orange-500)" }}
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Atrasadas collapsible */}
            {tarefasAtrasadas.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border-default)" }}>
                <button
                  onClick={() => setShowAtrasadas(!showAtrasadas)}
                  className="flex items-center gap-2 w-full text-left font-dm text-sm font-semibold transition-colors"
                  style={{ color: "var(--red-text)" }}
                >
                  <AlertTriangle size={14} />
                  <span>Atrasadas ({tarefasAtrasadas.length})</span>
                  <ChevronDown
                    size={14}
                    className="ml-auto transition-transform duration-200"
                    style={{ transform: showAtrasadas ? "rotate(180deg)" : "rotate(0)" }}
                  />
                </button>

                <AnimatePresence>
                  {showAtrasadas && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-1">
                        {tarefasAtrasadas.map((t, i) => (
                          <TarefaRow
                            key={t.id}
                            tarefa={t}
                            onToggle={handleToggleTarefa}
                            onDelete={handleDeleteTarefa}
                            index={i}
                            isOverdue
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </Card>
        </motion.section>

        {/* ═══ Section E — Metas da Semana ═══ */}
        <motion.section {...fadeUp(0.25)}>
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} style={{ color: "var(--orange-500)" }} />
            <h2
              className="font-fraunces text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Metas da semana
            </h2>
            <HelpTip text="Acompanhe suas metas de publicação. As barras de progresso são atualizadas automaticamente quando você marca conteúdos como postados." />
          </div>

          {metas.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {metas.map((meta, i) => (
                <MetaCard key={meta.id} meta={meta} index={i} />
              ))}
            </div>
          ) : (
            <Card className="!p-6">
              <p className="font-dm text-sm text-center" style={{ color: "var(--text-tertiary)" }}>
                Nenhuma meta ativa
              </p>
            </Card>
          )}
        </motion.section>

        </div>{/* end Row 2 grid */}

        {/* ═══ Section F — Inspirações Acadêmicas ═══ */}
        <motion.section {...fadeUp(0.3)}>
          <div className="flex items-center gap-2 mb-4">
            <span style={{ color: "#10b981" }}>🎓</span>
            <h2 className="font-fraunces text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Inspirações Acadêmicas
            </h2>
            <HelpTip text="Conteúdos que você estudou recentemente e livros que está lendo. Use como inspiração para criar posts, artigos ou reflexões na Usina." />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent study content */}
            <Card className="!p-4">
              <h3 className="font-dm text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                <BookOpen size={14} style={{ color: "#10b981" }} />
                Últimos conteúdos estudados
              </h3>
              {(() => {
                const conteudosAcademicos = getAcConteudos()
                  .filter(c => c.resumo_html || c.titulo)
                  .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                  .slice(0, 5);

                if (conteudosAcademicos.length === 0) {
                  return <p className="font-dm text-xs text-center py-4" style={{ color: "var(--text-tertiary)" }}>Nenhum conteúdo acadêmico ainda</p>;
                }

                const disciplinas = getDisciplinasCursando();
                const getDisciplinaNome = (id: string) => disciplinas.find(d => d.id === id)?.nome || "";

                return (
                  <div className="space-y-2">
                    {conteudosAcademicos.map(c => (
                      <div
                        key={c.id}
                        className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--bg-hover)] group"
                      >
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#10b981" }} />
                        <div className="min-w-0 flex-1">
                          <p className="font-dm text-xs font-medium text-[var(--text-primary)] line-clamp-1">{c.titulo}</p>
                          <p className="font-dm text-[10px] text-[var(--text-tertiary)]">
                            {getDisciplinaNome(c.disciplina_id)}{c.data_aula ? ` · ${new Date(c.data_aula + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                          <button
                            onClick={() => setRascunhoInput(c.titulo)}
                            className="p-1 rounded hover:bg-[var(--bg-card-elevated)] transition-colors"
                            title="Usar como rascunho"
                          >
                            <Pencil size={11} className="text-[var(--text-tertiary)]" />
                          </button>
                          <button
                            onClick={() => {
                              const disc = getDisciplinaNome(c.disciplina_id);
                              const conteudo = createConteudo({
                                titulo: c.titulo,
                                descricao: disc ? `Baseado em aula de ${disc}` : '',
                                status: "caixa_de_ideias",
                              });
                              refresh();
                              toast("Conteúdo criado na Usina", { type: "success" });
                            }}
                            className="p-1 rounded hover:bg-[var(--bg-card-elevated)] transition-colors"
                            title="Criar conteúdo direto na Usina"
                          >
                            <ArrowUpRight size={11} style={{ color: "var(--orange-500)" }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Card>

            {/* Books being read */}
            <Card className="!p-4">
              <h3 className="font-dm text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                <span>📚</span>
                Lendo agora
              </h3>
              {(() => {
                const livros = getBibliotecaEmLeitura();

                if (livros.length === 0) {
                  return <p className="font-dm text-xs text-center py-4" style={{ color: "var(--text-tertiary)" }}>Nenhum livro em leitura</p>;
                }

                return (
                  <div className="space-y-2">
                    {livros.slice(0, 5).map(livro => (
                      <div
                        key={livro.id}
                        className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--bg-hover)] group"
                      >
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#8B5CF6" }} />
                        <div className="min-w-0 flex-1">
                          <p className="font-dm text-xs font-medium text-[var(--text-primary)] line-clamp-1">{livro.titulo}</p>
                          <p className="font-dm text-[10px] text-[var(--text-tertiary)]">
                            {livro.autores}{livro.andamento ? ` · ${livro.andamento}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                          <button
                            onClick={() => setRascunhoInput(`Insights do livro: ${livro.titulo}`)}
                            className="p-1 rounded hover:bg-[var(--bg-card-elevated)] transition-colors"
                            title="Usar como rascunho"
                          >
                            <Pencil size={11} className="text-[var(--text-tertiary)]" />
                          </button>
                          <button
                            onClick={() => {
                              createConteudo({
                                titulo: `Insights: ${livro.titulo}`,
                                descricao: `Baseado no livro "${livro.titulo}" de ${livro.autores}`,
                                status: "caixa_de_ideias",
                              });
                              refresh();
                              toast("Conteúdo criado na Usina", { type: "success" });
                            }}
                            className="p-1 rounded hover:bg-[var(--bg-card-elevated)] transition-colors"
                            title="Criar conteúdo direto na Usina"
                          >
                            <ArrowUpRight size={11} style={{ color: "var(--orange-500)" }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </Card>
          </div>
        </motion.section>

      </div>

      {/* Modal: Promover Rascunho */}
      <Modal isOpen={promoverModalOpen} onClose={() => setPromoverModalOpen(false)} title="Promover Rascunho" size="md">
        <div className="space-y-4">
          {/* Titulo */}
          <div>
            <label className="block font-dm text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Titulo</label>
            <input
              type="text"
              value={promoverForm.titulo}
              onChange={(e) => setPromoverForm((p) => ({ ...p, titulo: e.target.value }))}
              className="w-full rounded-xl px-3 py-2 font-dm text-sm outline-none transition-colors"
              style={{
                background: "var(--bg-card-elevated)",
                color: "var(--text-primary)",
                border: "1.5px solid var(--border-default)",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--orange-500)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
              autoFocus
            />
          </div>

          {/* Editoria */}
          <div>
            <label className="block font-dm text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Editoria</label>
            <select
              value={promoverForm.editoria_id}
              onChange={(e) => setPromoverForm((p) => ({ ...p, editoria_id: e.target.value }))}
              className="w-full rounded-xl px-3 py-2 font-dm text-sm outline-none transition-colors"
              style={{
                background: "var(--bg-card-elevated)",
                color: "var(--text-primary)",
                border: "1.5px solid var(--border-default)",
              }}
            >
              <option value="">Sem editoria</option>
              {getEditorias().map((ed) => (
                <option key={ed.id} value={ed.id}>{ed.nome}</option>
              ))}
            </select>
          </div>

          {/* Redes Sociais (checkboxes) */}
          <div>
            <label className="block font-dm text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Redes Sociais</label>
            <div className="flex flex-wrap gap-2">
              {getRedesSociais().filter((r) => r.ativa).map((rede) => {
                const selected = promoverForm.redesSelecionadas.includes(rede.id);
                return (
                  <button
                    key={rede.id}
                    type="button"
                    onClick={() => handleToggleRedePromover(rede.id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-dm text-xs font-medium transition-all duration-150"
                    style={{
                      background: selected ? `${rede.cor}20` : "var(--bg-card-elevated)",
                      color: selected ? rede.cor : "var(--text-tertiary)",
                      border: selected ? `1.5px solid ${rede.cor}` : "1.5px solid var(--border-default)",
                    }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: rede.cor }} />
                    {rede.nome}
                    {selected && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Funil */}
          <div>
            <label className="block font-dm text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Funil</label>
            <select
              value={promoverForm.funil}
              onChange={(e) => setPromoverForm((p) => ({ ...p, funil: e.target.value }))}
              className="w-full rounded-xl px-3 py-2 font-dm text-sm outline-none transition-colors"
              style={{
                background: "var(--bg-card-elevated)",
                color: "var(--text-primary)",
                border: "1.5px solid var(--border-default)",
              }}
            >
              <option value="">Sem funil</option>
              {Object.entries(FUNIL_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Data Planejada */}
          <div>
            <label className="block font-dm text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Data Planejada</label>
            <input
              type="date"
              value={promoverForm.data_planejada}
              onChange={(e) => setPromoverForm((p) => ({ ...p, data_planejada: e.target.value }))}
              className="w-full rounded-xl px-3 py-2 font-dm text-sm outline-none transition-colors"
              style={{
                background: "var(--bg-card-elevated)",
                color: "var(--text-primary)",
                border: "1.5px solid var(--border-default)",
              }}
            />
          </div>

          {/* Emoji Marcador */}
          <div>
            <label className="block font-dm text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Emoji Marcador</label>
            <input
              type="text"
              value={promoverForm.emoji_marcador}
              onChange={(e) => setPromoverForm((p) => ({ ...p, emoji_marcador: e.target.value }))}
              className="w-full rounded-xl px-3 py-2 font-dm text-sm outline-none transition-colors"
              style={{
                background: "var(--bg-card-elevated)",
                color: "var(--text-primary)",
                border: "1.5px solid var(--border-default)",
              }}
              placeholder="Ex: 🔥"
              maxLength={4}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmitPromover}
            disabled={!promoverForm.titulo.trim()}
            className="w-full"
            icon={<ArrowUpRight size={14} />}
          >
            Promover para Conteudo
          </Button>
        </div>
      </Modal>
    </Shell>
  );
}

// ─── Sub-components ───

function TimelineCard({ conteudo }: { conteudo: Conteudo }) {
  const redes = getConteudoRedes(conteudo.id);

  return (
    <div
      className="rounded-lg px-2.5 py-2 space-y-1.5"
      style={{ background: "var(--bg-card-elevated)" }}
    >
      <p className="font-dm text-xs font-medium leading-snug" style={{ color: "var(--text-primary)" }}>
        {conteudo.emoji_marcador && (
          <span className="mr-1">{conteudo.emoji_marcador}</span>
        )}
        {conteudo.titulo}
      </p>
      {redes.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {redes.map((cr) => {
            const rede = getRedeSocial(cr.rede_social_id);
            if (!rede) return null;
            return (
              <span
                key={cr.id}
                className="font-dm text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                style={{
                  color: rede.cor,
                  background: `${rede.cor}15`,
                }}
              >
                {rede.nome}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TarefaRow({
  tarefa,
  onToggle,
  onDelete,
  index,
  isOverdue = false,
}: {
  tarefa: Tarefa;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  index: number;
  isOverdue?: boolean;
}) {
  const conteudo = tarefa.conteudo_id ? getConteudo(tarefa.conteudo_id) : null;

  return (
    <motion.div
      {...staggerChild(index, 0.02)}
      className="flex items-center gap-3 rounded-lg px-3 py-2 group transition-colors"
      style={{
        background: isOverdue ? "var(--red-bg)" : "transparent",
      }}
    >
      <button
        onClick={() => onToggle(tarefa.id)}
        className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 hover:scale-110"
        style={{
          borderColor: isOverdue ? "var(--red-text)" : "var(--border-strong)",
        }}
      >
        <Check size={10} className="opacity-0 group-hover:opacity-50 transition-opacity" />
      </button>

      <span
        className="font-dm text-sm flex-1"
        style={{ color: isOverdue ? "var(--red-text)" : "var(--text-primary)" }}
      >
        {tarefa.titulo}
      </span>

      {conteudo && (
        <Link
          href={`/conteudo/conteudos?id=${conteudo.id}`}
          className="font-dm text-xs flex items-center gap-1 transition-colors hover:underline"
          style={{ color: "var(--orange-500)" }}
        >
          {conteudo.emoji_marcador && <span>{conteudo.emoji_marcador}</span>}
          <span className="max-w-[120px] truncate">{conteudo.titulo}</span>
          <ArrowRight size={10} />
        </Link>
      )}

      {isOverdue && tarefa.data_prevista && (
        <span
          className="font-dm text-[10px] flex items-center gap-1"
          style={{ color: "var(--red-text)" }}
        >
          <Clock size={10} />
          {tarefa.data_prevista}
        </span>
      )}

      {onDelete && (
        <button
          onClick={() => onDelete(tarefa.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all duration-150"
          style={{ color: "var(--red-text)" }}
          title="Excluir tarefa"
        >
          <Trash2 size={14} />
        </button>
      )}
    </motion.div>
  );
}

function MetaCard({ meta, index }: { meta: Meta; index: number }) {
  const atual = calcularMetaAtual(meta);
  const progress = meta.valor_alvo > 0 ? Math.min(atual / meta.valor_alvo, 1) : 0;
  const pct = Math.round(progress * 100);
  const rede = meta.rede_social_id ? getRedeSocial(meta.rede_social_id) : null;

  return (
    <motion.div {...staggerChild(index, 0.06)}>
      <Card className="!p-4">
        <div className="flex items-start justify-between mb-3">
          <p className="font-dm text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {meta.titulo}
          </p>
          {rede && (
            <span
              className="font-dm text-[10px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ml-2"
              style={{
                color: rede.cor,
                background: `${rede.cor}15`,
              }}
            >
              {rede.nome}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-2 rounded-full overflow-hidden mb-2"
          style={{ background: "var(--bg-card-elevated)" }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full"
            style={{
              background: rede ? rede.cor : "var(--orange-500)",
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="font-dm text-xs" style={{ color: "var(--text-tertiary)" }}>
            {atual} / {meta.valor_alvo}
          </span>
          <span
            className="font-dm text-xs font-semibold"
            style={{ color: pct >= 100 ? "var(--green-text)" : "var(--text-secondary)" }}
          >
            {pct}%
          </span>
        </div>
      </Card>
    </motion.div>
  );
}
