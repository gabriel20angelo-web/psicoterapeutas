"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, Play, Plus, Check, Clock, AlertTriangle,
  ChevronDown, ChevronRight, FolderOpen, Folder,
  Calendar, RotateCcw, X, Trash2, Pencil,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isSameDay, isToday,
  startOfWeek, endOfWeek, isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import Shell from "@/components/Shell";
import ForjaNav from "@/components/forja/ForjaNav";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { fadeUp, staggerChild } from "@/lib/animations";
import {
  getTodasPastas,
  getTodosProjetos,
  getTodasAtividades,
  getTodasTarefasHoje,
  getTarefasConcluidas,
  createTarefa as createAtividade,
  completarTarefaUnificada,
  reabrirTarefa,
  deleteTarefa as deleteAtividade,
  updateTarefa as updateAtividade,
  getSubtarefas,
  createPasta,
  updatePasta,
  deletePasta,
  createProjeto,
  updateProjeto,
  deleteProjeto,
  getSessoesHoje,
  getTempoFocadoHoje,
  getPomodorosHoje,
  getTagsDaTarefa,
  getEtiquetas,
  getMetaDiaria,
  formatTempo,
  hoje,
  PRIORIDADE_CONFIG,
  type Atividade,
  type Pasta,
  type Projeto,
  type Etiqueta,
  type Tag,
  type SessaoFoco,
} from "@/lib/forja-data";

/* ── Constants ────────────────────────────────────── */

const CORES_PALETA = [
  "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6",
  "#EC4899", "#F97316", "#14B8A6", "#6366F1", "#A855F7",
  "#E11D48", "#0EA5E9", "#84CC16", "#D946EF", "#FB923C",
];

type TabId = "hoje" | "calendario" | "todas" | "concluidas";

const TABS: { id: TabId; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "calendario", label: "Calendário" },
  { id: "todas", label: "Todas" },
  { id: "concluidas", label: "Concluídas" },
];

/* ── Progress Ring (compact) ──────────────────────── */

function ProgressRing({
  value,
  max,
  size = 48,
  stroke = 5,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / Math.max(max, 1), 1);
  const offset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} className="block flex-shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border-default)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--orange-500)"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

/* ── Pomodoro Dots ────────────────────────────────── */

function PomodoroDots({ done, total }: { done: number; total: number }) {
  const dots = [];
  for (let i = 0; i < Math.max(total, done); i++) {
    dots.push(
      <span
        key={i}
        className="inline-block w-2 h-2 rounded-full"
        style={{
          background: i < done ? "var(--orange-500)" : "var(--border-default)",
        }}
      />
    );
  }
  return <span className="inline-flex gap-0.5 items-center">{dots}</span>;
}

/* ── Atividade Row ────────────────────────────────── */

function AtividadeRow({
  atividade,
  projetos,
  onComplete,
  onDelete,
  onReopen,
  onClickTitle,
  showConcluida,
}: {
  atividade: Atividade;
  projetos: Projeto[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onReopen?: (id: string) => void;
  onClickTitle?: (atividade: Atividade) => void;
  showConcluida?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const isOverdue =
    atividade.data_limite &&
    atividade.data_limite < hoje() &&
    atividade.status !== "concluida";
  const prioConfig = PRIORIDADE_CONFIG[atividade.prioridade];
  const projeto = atividade.projeto_id
    ? projetos.find((p) => p.id === atividade.projeto_id)
    : null;
  const pomodorosDone = atividade.pomodoros_realizados ?? 0;
  const pomodorosTotal = atividade.pomodoros_estimados ?? 0;
  const isDone = atividade.status === "concluida";
  const etiquetas = getTagsDaTarefa(atividade.id);
  const subAtividades = expanded ? getSubtarefas(atividade.id) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{ overflow: "hidden" }}
    >
      <div
        className="flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors group"
        style={{
          background: "var(--bg-input)",
          opacity: isDone && !showConcluida ? 0.5 : 1,
        }}
      >
        {/* expand arrow */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
          style={{ color: "var(--text-tertiary)" }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* checkbox */}
        <button
          onClick={() =>
            isDone && onReopen ? onReopen(atividade.id) : onComplete(atividade.id)
          }
          className="flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors"
          style={{
            borderColor: isDone ? "var(--orange-500)" : "var(--border-default)",
            background: isDone ? "var(--orange-500)" : "transparent",
          }}
        >
          {isDone && <Check size={12} style={{ color: "white" }} />}
        </button>

        {/* priority dot */}
        <span
          className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
          style={{ background: prioConfig?.cor ?? "var(--text-tertiary)" }}
        />

        {/* title */}
        <span
          className={`font-dm text-sm flex-1 truncate cursor-pointer hover:underline ${
            atividade.prioridade === "alta" ? "font-bold" : ""
          }`}
          style={{
            color: "var(--text-primary)",
            textDecoration: isDone ? "line-through" : "none",
          }}
          onClick={() => onClickTitle?.(atividade)}
        >
          {atividade.titulo}
        </span>

        {/* overdue badge */}
        {isOverdue && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-dm font-semibold bg-red-500/15 text-red-500">
            <AlertTriangle size={10} />
            Atrasada
          </span>
        )}

        {/* project chip */}
        {projeto && (
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-dm font-medium"
            style={{
              background: `${projeto.cor ?? "var(--orange-500)"}22`,
              color: projeto.cor ?? "var(--orange-500)",
            }}
          >
            {projeto.nome}
          </span>
        )}

        {/* etiqueta chips */}
        {etiquetas.map((et) => (
          <span
            key={et.id}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-dm font-medium"
            style={{
              background: `${et.cor}22`,
              color: et.cor,
            }}
          >
            {et.nome}
          </span>
        ))}

        {/* pomodoro dots */}
        {pomodorosTotal > 0 && (
          <PomodoroDots done={pomodorosDone} total={pomodorosTotal} />
        )}

        {/* concluida date */}
        {showConcluida && atividade.concluida_em && (
          <span
            className="font-dm text-[10px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {format(new Date(atividade.concluida_em), "dd/MM", { locale: ptBR })}
          </span>
        )}

        {/* play button */}
        {!isDone && (
          <a
            href={`/forja/foco?atividade=${atividade.id}`}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "var(--orange-500)" }}
            title="Iniciar foco"
          >
            <Play size={12} fill="white" style={{ color: "white" }} />
          </a>
        )}

        {/* reopen button (for concluidas tab) */}
        {isDone && onReopen && (
          <button
            onClick={() => onReopen(atividade.id)}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
            style={{ background: "var(--bg-card-elevated)" }}
            title="Reabrir"
          >
            <RotateCcw size={12} style={{ color: "var(--text-secondary)" }} />
          </button>
        )}

        {/* delete button */}
        <button
          onClick={() => onDelete(atividade.id)}
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
          style={{ background: "var(--bg-card-elevated)" }}
          title="Excluir"
        >
          <Trash2 size={12} style={{ color: "var(--text-tertiary)" }} />
        </button>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="ml-12 mt-1 mb-2 p-3 rounded-lg text-sm font-dm space-y-2"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
              }}
            >
              {atividade.notas && (
                <p style={{ color: "var(--text-secondary)" }}>
                  {atividade.notas}
                </p>
              )}
              {atividade.data_limite && (
                <p style={{ color: "var(--text-tertiary)" }}>
                  <Calendar size={12} className="inline mr-1" />
                  Prazo: {format(new Date(atividade.data_limite + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
              {subAtividades.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Sub-atividades ({subAtividades.length})
                  </p>
                  {subAtividades.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2 py-1.5 px-2 rounded group/sub"
                      style={{ background: "var(--bg-input)" }}
                    >
                      <button
                        onClick={() => sub.status === "concluida" ? onReopen?.(sub.id) : onComplete(sub.id)}
                        className="flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center"
                        style={{
                          borderColor: sub.status === "concluida" ? "var(--orange-500)" : "var(--border-default)",
                          background: sub.status === "concluida" ? "var(--orange-500)" : "transparent",
                        }}
                      >
                        {sub.status === "concluida" && <Check size={10} style={{ color: "white" }} />}
                      </button>
                      <span
                        className="text-xs flex-1 cursor-pointer hover:underline"
                        style={{
                          color: "var(--text-primary)",
                          textDecoration: sub.status === "concluida" ? "line-through" : "none",
                        }}
                        onClick={() => onClickTitle?.(sub)}
                      >
                        {sub.titulo}
                      </span>
                      {sub.status !== "concluida" && (
                        <a
                          href={`/forja/foco?atividade=${sub.id}`}
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "var(--orange-500)" }}
                          title="Iniciar foco"
                        >
                          <Play size={10} fill="white" style={{ color: "white" }} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!atividade.notas && subAtividades.length === 0 && (
                <p style={{ color: "var(--text-tertiary)" }}>
                  Sem notas ou sub-atividades.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Session Timeline (compact horizontal) ────────── */

function SessionTimeline({ sessoes }: { sessoes: SessaoFoco[] }) {
  if (sessoes.length === 0) {
    return (
      <p
        className="font-dm text-xs text-center py-3"
        style={{ color: "var(--text-tertiary)" }}
      >
        Nenhuma sessao registrada hoje.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-thin">
      {sessoes.map((s) => {
        const inicio = new Date(s.iniciada_em);
        const hora = `${String(inicio.getHours()).padStart(2, "0")}:${String(
          inicio.getMinutes()
        ).padStart(2, "0")}`;
        return (
          <div
            key={s.id}
            className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-dm"
            style={{
              background: s.completa
                ? "var(--orange-500)"
                : "var(--bg-card-elevated)",
              color: s.completa ? "white" : "var(--text-secondary)",
              border: s.completa
                ? "none"
                : "1px solid var(--border-default)",
            }}
          >
            <Clock size={10} />
            <span className="font-medium">{hora}</span>
            <span>{formatTempo(s.duracao_real_seg ?? 0)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Create Pasta Modal ───────────────────────────── */

function CreatePastaModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(CORES_PALETA[0]);
  const [icone, setIcone] = useState("folder");

  const handleSubmit = () => {
    if (!nome.trim()) return;
    const pastas = getTodasPastas();
    createPasta({ nome: nome.trim(), cor, icone, ordem: pastas.length });
    setNome("");
    setCor(CORES_PALETA[0]);
    setIcone("folder");
    onCreated();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-[95vw] sm:max-w-[400px] mx-4 rounded-2xl p-6"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="font-fraunces font-bold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            Nova Pasta
          </h2>
          <button onClick={onClose}>
            <X size={18} style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              className="font-dm text-xs font-medium block mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Nome
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full px-3 py-2 rounded-lg font-dm text-sm border-none outline-none"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-primary)",
              }}
              placeholder="Nome da pasta"
              autoFocus
            />
          </div>

          <div>
            <label
              className="font-dm text-xs font-medium block mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Cor
            </label>
            <div className="flex flex-wrap gap-2">
              {CORES_PALETA.map((c) => (
                <button
                  key={c}
                  onClick={() => setCor(c)}
                  className="w-7 h-7 rounded-full transition-transform"
                  style={{
                    background: c,
                    transform: cor === c ? "scale(1.2)" : "scale(1)",
                    boxShadow:
                      cor === c ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${c}` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label
              className="font-dm text-xs font-medium block mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Icone (texto)
            </label>
            <input
              type="text"
              value={icone}
              onChange={(e) => setIcone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg font-dm text-sm border-none outline-none"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-primary)",
              }}
              placeholder="ex: folder, book, heart"
            />
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Criar Pasta
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Create Projeto Modal ─────────────────────────── */

function CreateProjetoModal({
  open,
  onClose,
  onCreated,
  pastas,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  pastas: Pasta[];
}) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(CORES_PALETA[2]);
  const [pastaId, setPastaId] = useState<string | null>(
    pastas.length > 0 ? pastas[0].id : null
  );

  const handleSubmit = () => {
    if (!nome.trim()) return;
    const projetos = getTodosProjetos();
    createProjeto({
      nome: nome.trim(),
      cor,
      pasta_id: pastaId || "",
      icone: "",
      ordem: projetos.length,
      arquivado: false,
    });
    setNome("");
    setCor(CORES_PALETA[2]);
    onCreated();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-[95vw] sm:max-w-[400px] mx-4 rounded-2xl p-6"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="font-fraunces font-bold text-lg"
            style={{ color: "var(--text-primary)" }}
          >
            Novo Projeto
          </h2>
          <button onClick={onClose}>
            <X size={18} style={{ color: "var(--text-tertiary)" }} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              className="font-dm text-xs font-medium block mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Nome
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full px-3 py-2 rounded-lg font-dm text-sm border-none outline-none"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-primary)",
              }}
              placeholder="Nome do projeto"
              autoFocus
            />
          </div>

          <div>
            <label
              className="font-dm text-xs font-medium block mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Pasta
            </label>
            <select
              value={pastaId ?? ""}
              onChange={(e) =>
                setPastaId(e.target.value === "" ? null : e.target.value)
              }
              className="w-full px-3 py-2 rounded-lg font-dm text-sm border-none outline-none"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-primary)",
              }}
            >
              <option value="">Sem pasta</option>
              {pastas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="font-dm text-xs font-medium block mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Cor
            </label>
            <div className="flex flex-wrap gap-2">
              {CORES_PALETA.map((c) => (
                <button
                  key={c}
                  onClick={() => setCor(c)}
                  className="w-7 h-7 rounded-full transition-transform"
                  style={{
                    background: c,
                    transform: cor === c ? "scale(1.2)" : "scale(1)",
                    boxShadow:
                      cor === c ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${c}` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Criar Projeto
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Sidebar Tree ─────────────────────────────────── */

function SidebarTree({
  pastas,
  projetos,
  allAtividades,
  selectedFilter,
  onSelect,
  onCreatePasta,
  onCreateProjeto,
  onReload,
}: {
  pastas: Pasta[];
  projetos: Projeto[];
  allAtividades: Atividade[];
  selectedFilter: { type: "todas" | "pasta" | "projeto"; id?: string };
  onSelect: (filter: { type: "todas" | "pasta" | "projeto"; id?: string }) => void;
  onCreatePasta: () => void;
  onCreateProjeto: () => void;
  onReload: () => void;
}) {
  const [expandedPastas, setExpandedPastas] = useState<Set<string>>(
    new Set(pastas.map((p) => p.id))
  );
  const [editingPastaId, setEditingPastaId] = useState<string | null>(null);
  const [editingPastaName, setEditingPastaName] = useState("");
  const [editingProjetoId, setEditingProjetoId] = useState<string | null>(null);
  const [editingProjetoName, setEditingProjetoName] = useState("");

  const togglePasta = (id: string) => {
    setExpandedPastas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const countPending = (projetoId: string) =>
    allAtividades.filter(
      (a) => a.projeto_id === projetoId && a.status === "pendente"
    ).length;

  // Group projetos without pasta
  const orphanProjetos = projetos.filter((p) => !p.pasta_id);

  return (
    <div className="space-y-1">
      {/* "Todas" option */}
      <button
        onClick={() => onSelect({ type: "todas" })}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-dm text-sm transition-colors"
        style={{
          background:
            selectedFilter.type === "todas" ? "var(--orange-glow)" : "transparent",
          color:
            selectedFilter.type === "todas"
              ? "var(--orange-500)"
              : "var(--text-secondary)",
        }}
      >
        <FolderOpen size={14} />
        <span className="font-medium">Todas</span>
      </button>

      {/* Pasta tree */}
      {pastas.map((pasta) => {
        const isExpanded = expandedPastas.has(pasta.id);
        const pastaSelected =
          selectedFilter.type === "pasta" && selectedFilter.id === pasta.id;
        const pastaProjetos = projetos.filter((p) => p.pasta_id === pasta.id);

        return (
          <div key={pasta.id}>
            <div className="group relative">
              {editingPastaId === pasta.id ? (
                <div className="flex items-center gap-2 px-3 py-2">
                  <input
                    type="text"
                    value={editingPastaName}
                    onChange={(e) => setEditingPastaName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updatePasta(pasta.id, { nome: editingPastaName.trim() });
                        setEditingPastaId(null);
                        onReload();
                      }
                      if (e.key === "Escape") setEditingPastaId(null);
                    }}
                    onBlur={() => {
                      updatePasta(pasta.id, { nome: editingPastaName.trim() });
                      setEditingPastaId(null);
                      onReload();
                    }}
                    className="flex-1 px-2 py-0.5 rounded font-dm text-sm border-none outline-none"
                    style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  onClick={() => {
                    togglePasta(pasta.id);
                    onSelect({ type: "pasta", id: pasta.id });
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg font-dm text-sm transition-colors"
                  style={{
                    background: pastaSelected ? "var(--orange-glow)" : "transparent",
                    color: pastaSelected
                      ? "var(--orange-500)"
                      : "var(--text-primary)",
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: pasta.cor }}
                  />
                  {isExpanded ? (
                    <ChevronDown size={12} style={{ color: "var(--text-tertiary)" }} />
                  ) : (
                    <ChevronRight size={12} style={{ color: "var(--text-tertiary)" }} />
                  )}
                  <span className="font-medium truncate flex-1 text-left">
                    {pasta.nome}
                  </span>
                </button>
              )}
              {editingPastaId !== pasta.id && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded px-0.5" style={{ background: "var(--bg-card)" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPastaId(pasta.id);
                      setEditingPastaName(pasta.nome);
                    }}
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ background: "var(--bg-input)" }}
                    title="Renomear pasta"
                  >
                    <Pencil size={10} style={{ color: "var(--text-tertiary)" }} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Excluir pasta "${pasta.nome}"?`)) {
                        deletePasta(pasta.id);
                        onSelect({ type: "todas" });
                        onReload();
                      }
                    }}
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ background: "var(--bg-input)" }}
                    title="Excluir pasta"
                  >
                    <Trash2 size={10} style={{ color: "#EF4444" }} />
                  </button>
                </div>
              )}
            </div>

            {/* Projetos inside pasta */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  {pastaProjetos.map((proj) => {
                    const projSelected =
                      selectedFilter.type === "projeto" &&
                      selectedFilter.id === proj.id;
                    const pending = countPending(proj.id);
                    return (
                      <div key={proj.id} className="group relative">
                        {editingProjetoId === proj.id ? (
                          <div className="flex items-center gap-2 pl-8 pr-3 py-1.5">
                            <input
                              type="text"
                              value={editingProjetoName}
                              onChange={(e) => setEditingProjetoName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateProjeto(proj.id, { nome: editingProjetoName.trim() });
                                  setEditingProjetoId(null);
                                  onReload();
                                }
                                if (e.key === "Escape") setEditingProjetoId(null);
                              }}
                              onBlur={() => {
                                updateProjeto(proj.id, { nome: editingProjetoName.trim() });
                                setEditingProjetoId(null);
                                onReload();
                              }}
                              className="flex-1 px-2 py-0.5 rounded font-dm text-xs border-none outline-none"
                              style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              onSelect({ type: "projeto", id: proj.id })
                            }
                            className="w-full flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-lg font-dm text-xs transition-colors"
                            style={{
                              background: projSelected
                                ? "var(--orange-glow)"
                                : "transparent",
                              color: projSelected
                                ? "var(--orange-500)"
                                : "var(--text-secondary)",
                            }}
                          >
                            <span className="truncate flex-1 text-left">
                              {proj.nome}
                            </span>
                            {pending > 0 && (
                              <span
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: `${proj.cor}22`,
                                  color: proj.cor,
                                }}
                              >
                                {pending}
                              </span>
                            )}
                          </button>
                        )}
                        {editingProjetoId !== proj.id && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded px-0.5" style={{ background: "var(--bg-card)" }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProjetoId(proj.id);
                                setEditingProjetoName(proj.nome);
                              }}
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{ background: "var(--bg-input)" }}
                              title="Renomear projeto"
                            >
                              <Pencil size={10} style={{ color: "var(--text-tertiary)" }} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Excluir projeto "${proj.nome}"?`)) {
                                  deleteProjeto(proj.id);
                                  onSelect({ type: "todas" });
                                  onReload();
                                }
                              }}
                              className="w-5 h-5 rounded flex items-center justify-center"
                              style={{ background: "var(--bg-input)" }}
                              title="Excluir projeto"
                            >
                              <Trash2 size={10} style={{ color: "#EF4444" }} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Orphan projects */}
      {orphanProjetos.length > 0 && (
        <div className="pt-1">
          {orphanProjetos.map((proj) => {
            const projSelected =
              selectedFilter.type === "projeto" &&
              selectedFilter.id === proj.id;
            const pending = countPending(proj.id);
            return (
              <div key={proj.id} className="group relative">
                {editingProjetoId === proj.id ? (
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <Folder size={12} style={{ color: "var(--text-tertiary)" }} />
                    <input
                      type="text"
                      value={editingProjetoName}
                      onChange={(e) => setEditingProjetoName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateProjeto(proj.id, { nome: editingProjetoName.trim() });
                          setEditingProjetoId(null);
                          onReload();
                        }
                        if (e.key === "Escape") setEditingProjetoId(null);
                      }}
                      onBlur={() => {
                        updateProjeto(proj.id, { nome: editingProjetoName.trim() });
                        setEditingProjetoId(null);
                        onReload();
                      }}
                      className="flex-1 px-2 py-0.5 rounded font-dm text-xs border-none outline-none"
                      style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => onSelect({ type: "projeto", id: proj.id })}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg font-dm text-xs transition-colors"
                    style={{
                      background: projSelected
                        ? "var(--orange-glow)"
                        : "transparent",
                      color: projSelected
                        ? "var(--orange-500)"
                        : "var(--text-secondary)",
                    }}
                  >
                    <Folder size={12} />
                    <span className="truncate flex-1 text-left">{proj.nome}</span>
                    {pending > 0 && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `${proj.cor}22`,
                          color: proj.cor,
                        }}
                      >
                        {pending}
                      </span>
                    )}
                  </button>
                )}
                {editingProjetoId !== proj.id && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded px-0.5" style={{ background: "var(--bg-card)" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProjetoId(proj.id);
                        setEditingProjetoName(proj.nome);
                      }}
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ background: "var(--bg-input)" }}
                      title="Renomear projeto"
                    >
                      <Pencil size={10} style={{ color: "var(--text-tertiary)" }} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Excluir projeto "${proj.nome}"?`)) {
                          deleteProjeto(proj.id);
                          onSelect({ type: "todas" });
                          onReload();
                        }
                      }}
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ background: "var(--bg-input)" }}
                      title="Excluir projeto"
                    >
                      <Trash2 size={10} style={{ color: "#EF4444" }} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create buttons */}
      <div
        className="pt-3 mt-3 border-t flex gap-2"
        style={{ borderColor: "var(--border-default)" }}
      >
        <Button variant="ghost" size="sm" onClick={onCreatePasta} icon={<Plus size={12} />}>
          Pasta
        </Button>
        <Button variant="ghost" size="sm" onClick={onCreateProjeto} icon={<Plus size={12} />}>
          Projeto
        </Button>
      </div>
    </div>
  );
}

/* ── Calendar Tab ─────────────────────────────────── */

function CalendarTab({
  allAtividades,
  projetos,
  onComplete,
  onDelete,
  onReopen,
  onCreateAtividade,
  onClickTitle,
}: {
  allAtividades: Atividade[];
  projetos: Projeto[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onReopen: (id: string) => void;
  onCreateAtividade: (date: string) => void;
  onClickTitle?: (atividade: Atividade) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

  // Group atividades by date
  const atividadesByDate = useMemo(() => {
    const map = new Map<string, Atividade[]>();
    allAtividades.forEach((a) => {
      if (a.data_limite) {
        const key = a.data_limite;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(a);
      }
    });
    return map;
  }, [allAtividades]);

  const selectedDateStr = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : null;
  const selectedAtividades = selectedDateStr
    ? atividadesByDate.get(selectedDateStr) ?? []
    : [];

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <h3
          className="font-fraunces font-semibold text-base capitalize"
          style={{ color: "var(--text-primary)" }}
        >
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCurrentMonth(new Date());
              setSelectedDate(new Date());
            }}
          >
            Hoje
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            &larr;
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            &rarr;
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-1 min-w-[500px]">
        {/* Header */}
        {weekDays.map((d) => (
          <div
            key={d}
            className="text-center font-dm text-xs font-medium py-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            {d}
          </div>
        ))}

        {/* Days */}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayAtividades = atividadesByDate.get(dateStr) ?? [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          // Get unique project colors for dots
          const dotColors = Array.from(new Set(
              dayAtividades
                .filter((a) => a.status === "pendente")
                .map((a) => {
                  const proj = a.projeto_id
                    ? projetos.find((p) => p.id === a.projeto_id)
                    : null;
                  return proj?.cor ?? "var(--orange-500)";
                })
            )).slice(0, 3);

          return (
            <button
              key={dateStr}
              onClick={() => {
                setSelectedDate(day);
                if (dayAtividades.length === 0) {
                  onCreateAtividade(dateStr);
                }
              }}
              className="relative flex flex-col items-center justify-center py-2 rounded-lg transition-colors min-h-[48px]"
              style={{
                background: isSelected
                  ? "var(--orange-glow)"
                  : isTodayDate
                  ? "var(--bg-card-elevated)"
                  : "transparent",
                opacity: isCurrentMonth ? 1 : 0.3,
              }}
            >
              <span
                className={`font-dm text-sm ${
                  isTodayDate ? "font-bold" : ""
                }`}
                style={{
                  color: isSelected
                    ? "var(--orange-500)"
                    : isTodayDate
                    ? "var(--orange-500)"
                    : "var(--text-primary)",
                }}
              >
                {format(day, "d")}
              </span>
              {dotColors.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dotColors.map((color, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: color }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
      </div>

      {/* Selected date atividades */}
      {selectedDate && (
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
        >
          <h4
            className="font-fraunces font-semibold text-sm mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </h4>
          {selectedAtividades.length === 0 ? (
            <p
              className="font-dm text-sm text-center py-4"
              style={{ color: "var(--text-tertiary)" }}
            >
              Nenhuma atividade neste dia.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedAtividades.map((a) => (
                <AtividadeRow
                  key={a.id}
                  atividade={a}
                  projetos={projetos}
                  onComplete={onComplete}
                  onDelete={onDelete}
                  onReopen={onReopen}
                  onClickTitle={onClickTitle}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Activity Detail Panel ─────────────────────────── */

function AtividadeDetailPanel({
  atividade,
  projetos,
  onClose,
  onUpdated,
  onSelectAtividade,
}: {
  atividade: Atividade;
  projetos: Projeto[];
  onClose: () => void;
  onUpdated: () => void;
  onSelectAtividade: (a: Atividade) => void;
}) {
  const [titulo, setTitulo] = useState(atividade.titulo);
  const [notas, setNotas] = useState(atividade.notas);
  const [pomodorosEst, setPomodorosEst] = useState(atividade.pomodoros_estimados);
  const [dataLimite, setDataLimite] = useState(atividade.data_limite ?? "");
  const [prioridade, setPrioridade] = useState(atividade.prioridade);
  const [recTipo, setRecTipo] = useState<string>(atividade.recorrencia?.tipo ?? "nenhuma");
  const [recIntervalo, setRecIntervalo] = useState(atividade.recorrencia?.intervalo ?? 1);
  const [subAtividades, setSubAtividades] = useState<Atividade[]>([]);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [allEtiquetas, setAllEtiquetas] = useState<Etiqueta[]>([]);
  const [newSubTitulo, setNewSubTitulo] = useState("");

  useEffect(() => {
    setTitulo(atividade.titulo);
    setNotas(atividade.notas);
    setPomodorosEst(atividade.pomodoros_estimados);
    setDataLimite(atividade.data_limite ?? "");
    setPrioridade(atividade.prioridade);
    setRecTipo(atividade.recorrencia?.tipo ?? "nenhuma");
    setRecIntervalo(atividade.recorrencia?.intervalo ?? 1);
    setSubAtividades(getSubtarefas(atividade.id));
    setEtiquetas(getTagsDaTarefa(atividade.id));
    setAllEtiquetas(getEtiquetas());
  }, [atividade]);

  const saveField = (field: string, value: unknown) => {
    if (field === "recorrencia") {
      updateAtividade(atividade.id, { recorrencia: value as Atividade["recorrencia"] });
    } else {
      updateAtividade(atividade.id, { [field]: value });
    }
    onUpdated();
  };

  const handleRemoveEtiqueta = (etId: string) => {
    const newIds = atividade.etiqueta_ids.filter((id) => id !== etId);
    updateAtividade(atividade.id, { etiqueta_ids: newIds });
    setEtiquetas(etiquetas.filter((e) => e.id !== etId));
    onUpdated();
  };

  const handleAddEtiqueta = (etId: string) => {
    if (atividade.etiqueta_ids.includes(etId)) return;
    const newIds = [...atividade.etiqueta_ids, etId];
    updateAtividade(atividade.id, { etiqueta_ids: newIds });
    const et = allEtiquetas.find((e) => e.id === etId);
    if (et) setEtiquetas([...etiquetas, et]);
    onUpdated();
  };

  const handleCreateSub = () => {
    if (!newSubTitulo.trim()) return;
    createAtividade({
      titulo: newSubTitulo.trim(),
      atividade_pai_id: atividade.id,
      projeto_id: atividade.projeto_id,
    } as { titulo: string });
    setNewSubTitulo("");
    setSubAtividades(getSubtarefas(atividade.id));
    onUpdated();
  };

  const handleToggleSub = (subId: string, isDone: boolean) => {
    if (isDone) {
      reabrirTarefa(subId);
    } else {
      completarTarefaUnificada(subId);
    }
    setSubAtividades(getSubtarefas(atividade.id));
    onUpdated();
  };

  const handleDeleteAtividade = () => {
    if (!confirm("Excluir esta atividade?")) return;
    deleteAtividade(atividade.id);
    onUpdated();
    onClose();
  };

  const prioColors: Record<string, string> = {
    alta: "#EF4444",
    media: "#F59E0B",
    baixa: "#3B82F6",
    nenhuma: "var(--text-tertiary)",
  };

  const availableEtiquetas = allEtiquetas.filter(
    (e) => !atividade.etiqueta_ids.includes(e.id)
  );

  const pomDone = atividade.pomodoros_realizados ?? 0;
  const pomPct = pomodorosEst > 0 ? Math.min(pomDone / pomodorosEst, 1) * 100 : 0;

  return (
    <motion.div
      initial={{ x: 420 }}
      animate={{ x: 0 }}
      exit={{ x: 420 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="fixed top-0 right-0 h-full z-[9998] overflow-y-auto"
      style={{
        width: 400,
        background: "var(--bg-card)",
        borderLeft: "1px solid var(--border-default)",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
      }}
    >
      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3
            className="font-fraunces font-bold text-base"
            style={{ color: "var(--text-primary)" }}
          >
            Detalhes
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteAtividade}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "var(--bg-input)" }}
              title="Excluir atividade"
            >
              <Trash2 size={13} style={{ color: "#EF4444" }} />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "var(--bg-input)" }}
            >
              <X size={14} style={{ color: "var(--text-tertiary)" }} />
            </button>
          </div>
        </div>

        {/* Titulo */}
        <div>
          <label className="font-dm text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>
            Titulo
          </label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={(e) => saveField("titulo", e.currentTarget.value)}
            className="w-full px-3 py-2 rounded-lg font-dm text-sm border-none outline-none"
            style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
          />
        </div>

        {/* Pomodoros */}
        <div>
          <label className="font-dm text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>
            Pomodoros
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              value={pomodorosEst}
              onChange={(e) => setPomodorosEst(Number(e.target.value))}
              onBlur={(e) => saveField("pomodoros_estimados", Number(e.currentTarget.value))}
              className="w-20 px-3 py-2 rounded-lg font-dm text-sm border-none outline-none"
              style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
            />
            <span className="font-dm text-xs" style={{ color: "var(--text-tertiary)" }}>
              {pomDone} / {pomodorosEst} realizados
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: "var(--border-default)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pomPct}%`, background: "var(--orange-500)" }}
            />
          </div>
        </div>

        {/* Duracao pomodoro info */}
        <div>
          <label className="font-dm text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>
            Duração do pomodoro
          </label>
          <p className="font-dm text-xs" style={{ color: "var(--text-tertiary)" }}>
            Usa a configuração global do timer (ver Configurações).
          </p>
        </div>

        {/* Data limite */}
        <div>
          <label className="font-dm text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>
            Data limite
          </label>
          <input
            type="date"
            value={dataLimite}
            onChange={(e) => {
              setDataLimite(e.target.value);
              saveField("data_limite", e.target.value || null);
            }}
            className="w-full px-3 py-2 rounded-lg font-dm text-sm border-none outline-none"
            style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
          />
        </div>

        {/* Prioridade */}
        <div>
          <label className="font-dm text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>
            Prioridade
          </label>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: prioColors[prioridade] }} />
            <select
              value={prioridade}
              onChange={(e) => {
                const val = e.target.value as Atividade["prioridade"];
                setPrioridade(val);
                saveField("prioridade", val);
              }}
              className="flex-1 px-3 py-2 rounded-lg font-dm text-sm border-none outline-none"
              style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
            >
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baixa">Baixa</option>
              <option value="nenhuma">Nenhuma</option>
            </select>
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="font-dm text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>
            Notas
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            onBlur={(e) => saveField("notas", e.currentTarget.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg font-dm text-sm border-none outline-none resize-y"
            style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
            placeholder="Adicionar notas..."
          />
        </div>

        {/* Recorrencia */}
        <div>
          <label className="font-dm text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>
            Recorrencia
          </label>
          <div className="flex items-center gap-2">
            <select
              value={recTipo}
              onChange={(e) => {
                const val = e.target.value;
                setRecTipo(val);
                if (val === "nenhuma") {
                  saveField("recorrencia", null);
                } else {
                  saveField("recorrencia", { tipo: val, intervalo: recIntervalo });
                }
              }}
              className="flex-1 px-3 py-2 rounded-lg font-dm text-sm border-none outline-none"
              style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
            >
              <option value="nenhuma">Nenhuma</option>
              <option value="diaria">Diaria</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
            </select>
            {recTipo !== "nenhuma" && (
              <input
                type="number"
                min={1}
                value={recIntervalo}
                onChange={(e) => setRecIntervalo(Number(e.target.value))}
                onBlur={(e) => {
                  const val = Number(e.currentTarget.value);
                  saveField("recorrencia", { tipo: recTipo, intervalo: val });
                }}
                className="w-16 px-2 py-2 rounded-lg font-dm text-sm border-none outline-none text-center"
                style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
              />
            )}
          </div>
        </div>

        {/* Etiquetas */}
        <div>
          <label className="font-dm text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>
            Etiquetas
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {etiquetas.map((et) => (
              <span
                key={et.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-dm font-medium"
                style={{ background: `${et.cor}22`, color: et.cor }}
              >
                {et.nome}
                <button onClick={() => handleRemoveEtiqueta(et.id)} className="ml-0.5 hover:opacity-70">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          {availableEtiquetas.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) handleAddEtiqueta(e.target.value);
              }}
              className="w-full px-3 py-1.5 rounded-lg font-dm text-xs border-none outline-none"
              style={{ background: "var(--bg-input)", color: "var(--text-tertiary)" }}
            >
              <option value="">+ Adicionar etiqueta...</option>
              {availableEtiquetas.map((et) => (
                <option key={et.id} value={et.id}>{et.nome}</option>
              ))}
            </select>
          )}
        </div>

        {/* Sub-atividades / Etapas */}
        <div>
          <label className="font-dm text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>
            Etapas / Sub-atividades ({subAtividades.length})
          </label>
          <div className="space-y-1">
            {subAtividades.map((sub) => {
              const subDone = sub.status === "concluida";
              return (
                <div
                  key={sub.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-lg group"
                  style={{ background: "var(--bg-input)" }}
                >
                  <button
                    onClick={() => handleToggleSub(sub.id, subDone)}
                    className="flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center"
                    style={{
                      borderColor: subDone ? "var(--orange-500)" : "var(--border-default)",
                      background: subDone ? "var(--orange-500)" : "transparent",
                    }}
                  >
                    {subDone && <Check size={10} style={{ color: "white" }} />}
                  </button>
                  <span
                    className="flex-1 font-dm text-xs cursor-pointer hover:underline"
                    style={{
                      color: "var(--text-primary)",
                      textDecoration: subDone ? "line-through" : "none",
                    }}
                    onClick={() => onSelectAtividade(sub)}
                  >
                    {sub.titulo}
                  </span>
                  {!subDone && (
                    <a
                      href={`/forja/foco?atividade=${sub.id}`}
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "var(--orange-500)" }}
                      title="Iniciar foco"
                    >
                      <Play size={8} fill="white" style={{ color: "white" }} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          <div
            className="flex items-center gap-2 mt-2 py-1.5 px-2 rounded-lg"
            style={{ background: "var(--bg-input)" }}
          >
            <button
              onClick={handleCreateSub}
              className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors"
              style={{ color: "var(--orange-500)" }}
              title="Adicionar sub-atividade"
            >
              <Plus size={12} />
            </button>
            <input
              type="text"
              value={newSubTitulo}
              onChange={(e) => setNewSubTitulo(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateSub(); }}
              placeholder="Nova sub-atividade..."
              className="flex-1 bg-transparent border-none outline-none font-dm text-xs"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>

        {/* Play button */}
        {atividade.status !== "concluida" && (
          <a
            href={`/forja/foco?atividade=${atividade.id}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-dm text-sm font-medium transition-colors"
            style={{ background: "var(--orange-500)", color: "white" }}
          >
            <Play size={14} fill="white" />
            Iniciar Pomodoro
          </a>
        )}
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════ */

export default function ForjaPage() {
  const { toast } = useToast();

  // ── Data state ──
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [allAtividades, setAllAtividades] = useState<Atividade[]>([]);
  const [atividadesHoje, setAtividadesHoje] = useState<Atividade[]>([]);
  const [atividadesConcluidas, setAtividadesConcluidas] = useState<Atividade[]>([]);
  const [sessoes, setSessoes] = useState<SessaoFoco[]>([]);
  const [tempoFocado, setTempoFocado] = useState(0);
  const [pomodorosHoje, setPomodorosHojeState] = useState(0);
  const [meta, setMeta] = useState(0);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState<TabId>("hoje");
  const [sidebarFilter, setSidebarFilter] = useState<{
    type: "todas" | "pasta" | "projeto";
    id?: string;
  }>({ type: "todas" });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [showCreatePasta, setShowCreatePasta] = useState(false);
  const [showCreateProjeto, setShowCreateProjeto] = useState(false);
  const [selectedAtividade, setSelectedAtividade] = useState<Atividade | null>(null);

  // ── Load data ──
  const reload = useCallback(() => {
    setPastas(getTodasPastas());
    setProjetos(getTodosProjetos());
    setAllAtividades(getTodasAtividades());
    setAtividadesHoje(getTodasTarefasHoje());
    setAtividadesConcluidas(getTarefasConcluidas());
    setSessoes(getSessoesHoje());
    setTempoFocado(getTempoFocadoHoje());
    setPomodorosHojeState(getPomodorosHoje());
    setMeta(getMetaDiaria());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Re-sincroniza quando a aba volta a ser visível (ex: user vem de /forja/foco)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", reload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", reload);
    };
  }, [reload]);

  // ── Handlers ──
  const handleComplete = (id: string) => {
    completarTarefaUnificada(id);
    reload();
    toast("Atividade concluida!", { type: "success" });
  };

  const handleReopen = (id: string) => {
    reabrirTarefa(id);
    reload();
    toast("Atividade reaberta", { type: "success" });
  };

  const handleDelete = (id: string) => {
    deleteAtividade(id);
    reload();
    toast("Atividade excluida", { type: "success" });
  };

  const handleAddTask = (dataLimite?: string) => {
    const titulo = newTask.trim();
    if (!titulo) return;
    const extra: Record<string, unknown> = { titulo, data_limite: dataLimite ?? hoje() };
    if (sidebarFilter.type === "projeto" && sidebarFilter.id) {
      extra.projeto_id = sidebarFilter.id;
    }
    createAtividade(extra as { titulo: string });
    setNewTask("");
    reload();
    toast("Atividade criada", { type: "success" });
  };

  const handleCreateFromCalendar = (date: string) => {
    // Just set focus to the input -- or we can auto-create with a prompt
    // For now, just set date context
    setNewTask("");
    const titulo = prompt("Nova atividade para " + date + ":");
    if (titulo && titulo.trim()) {
      const extra: Record<string, unknown> = { titulo: titulo.trim(), data_limite: date };
      if (sidebarFilter.type === "projeto" && sidebarFilter.id) {
        extra.projeto_id = sidebarFilter.id;
      }
      createAtividade(extra as { titulo: string });
      reload();
      toast("Atividade criada", { type: "success" });
    }
  };

  // ── Filter atividades based on sidebar selection ──
  const filterBySelection = useCallback(
    (list: Atividade[]) => {
      if (sidebarFilter.type === "todas") return list;
      if (sidebarFilter.type === "projeto") {
        return list.filter((a) => a.projeto_id === sidebarFilter.id);
      }
      if (sidebarFilter.type === "pasta") {
        const pastaProjetoIds = new Set(
          projetos
            .filter((p) => p.pasta_id === sidebarFilter.id)
            .map((p) => p.id)
        );
        return list.filter(
          (a) => a.projeto_id && pastaProjetoIds.has(a.projeto_id)
        );
      }
      return list;
    },
    [sidebarFilter, projetos]
  );

  // ── Derived data ──
  const filteredHoje = useMemo(
    () => filterBySelection(atividadesHoje),
    [filterBySelection, atividadesHoje]
  );
  const filteredAll = useMemo(
    () => filterBySelection(allAtividades.filter((a) => a.status === "pendente")),
    [filterBySelection, allAtividades]
  );
  const filteredConcluidas = useMemo(
    () => filterBySelection(atividadesConcluidas),
    [filterBySelection, atividadesConcluidas]
  );
  const filteredCalendar = useMemo(
    () => filterBySelection(allAtividades),
    [filterBySelection, allAtividades]
  );

  const hojePendentes = filteredHoje.filter((t) => t.status !== "concluida");
  const hojeConcluidas = filteredHoje.filter((t) => t.status === "concluida");

  // Sort: overdue first, then by priority
  const PRIO_ORDER: Record<string, number> = { alta: 0, media: 1, baixa: 2, nenhuma: 3 };
  const overdueFirst = [...hojePendentes].sort((a, b) => {
    const aOverdue = a.data_limite && a.data_limite < hoje() ? 0 : 1;
    const bOverdue = b.data_limite && b.data_limite < hoje() ? 0 : 1;
    if (aOverdue !== bOverdue) return aOverdue - bOverdue;
    return (PRIO_ORDER[a.prioridade] ?? 3) - (PRIO_ORDER[b.prioridade] ?? 3);
  });

  // Group "Todas" by project
  const allGrouped = useMemo(() => {
    const groups: Map<string, { projeto: Projeto | null; atividades: Atividade[] }> =
      new Map();
    filteredAll.forEach((a) => {
      const key = a.projeto_id ?? "__none__";
      if (!groups.has(key)) {
        groups.set(key, {
          projeto: a.projeto_id
            ? projetos.find((p) => p.id === a.projeto_id) ?? null
            : null,
          atividades: [],
        });
      }
      groups.get(key)!.atividades.push(a);
    });
    return Array.from(groups.values());
  }, [filteredAll, projetos]);

  // Stats -- meta is in minutes from data layer, tempoFocado is in seconds
  const metaSeg = meta * 60;
  const horas = Math.floor(tempoFocado / 3600);
  const minutos = Math.floor((tempoFocado % 3600) / 60);
  const atividadesConcluidasHojeCount = atividadesHoje.filter(
    (t) => t.status === "concluida"
  ).length;

  return (
    <Shell>
      {/* Header */}
      <motion.div {...fadeUp()} className="flex items-center gap-3 mb-6">
        <Flame size={28} style={{ color: "var(--orange-500)" }} />
        <div>
          <h1
            className="font-fraunces font-bold text-2xl"
            style={{ color: "var(--text-primary)" }}
          >
            Forja
          </h1>
          <p
            className="font-dm text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Foco e produtividade
          </p>
        </div>
      </motion.div>

      <ForjaNav />

      {/* Layout: Sidebar + Main */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── LEFT SIDEBAR ─────────────────────────── */}
        {/* Mobile: dropdown toggle */}
        <div className="lg:hidden w-full">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            icon={sidebarOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            className="w-full justify-start"
          >
            {sidebarFilter.type === "todas"
              ? "Todas as pastas"
              : sidebarFilter.type === "pasta"
              ? pastas.find((p) => p.id === sidebarFilter.id)?.nome ?? "Pasta"
              : projetos.find((p) => p.id === sidebarFilter.id)?.nome ?? "Projeto"}
          </Button>
        </div>

        {/* Desktop sidebar (always visible) / Mobile sidebar (collapsible) */}
        <motion.div
          className={`w-full lg:w-[280px] flex-shrink-0 rounded-2xl p-4 ${
            sidebarOpen ? "block" : "hidden lg:block"
          }`}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
          {...staggerChild(0)}
        >
          <h3
            className="font-fraunces font-semibold text-sm mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            Pastas & Projetos
          </h3>
          <SidebarTree
            pastas={pastas}
            projetos={projetos}
            allAtividades={allAtividades}
            selectedFilter={sidebarFilter}
            onSelect={(f) => setSidebarFilter(f)}
            onCreatePasta={() => setShowCreatePasta(true)}
            onCreateProjeto={() => setShowCreateProjeto(true)}
            onReload={reload}
          />
        </motion.div>

        {/* ── MAIN AREA ────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <motion.div {...staggerChild(1)} className="mb-6">
            <div
              className="inline-flex items-center gap-1 p-1 rounded-xl"
              style={{ background: "var(--bg-card)" }}
            >
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-dm text-sm font-medium transition-all duration-150"
                    style={{
                      background: active ? "var(--orange-glow)" : "transparent",
                      color: active
                        ? "var(--orange-500)"
                        : "var(--text-tertiary)",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* ── TAB: HOJE ──────────────────────────── */}
          {activeTab === "hoje" && (
            <motion.div {...staggerChild(2)} className="space-y-6">
              {/* Resumo do dia (compact horizontal) */}
              <div
                className="rounded-2xl p-4 flex items-center gap-6 flex-wrap"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <ProgressRing value={tempoFocado} max={metaSeg} size={48} stroke={5} />
                <div className="flex items-center gap-4 font-dm text-sm flex-wrap">
                  <span style={{ color: "var(--text-primary)" }}>
                    <strong className="font-fraunces">
                      {horas}h {minutos}min
                    </strong>{" "}
                    focado
                  </span>
                  <span
                    className="w-px h-4"
                    style={{ background: "var(--border-default)" }}
                  />
                  <span style={{ color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--orange-500)" }}>
                      {pomodorosHoje}
                    </strong>{" "}
                    pomodoros
                  </span>
                  <span
                    className="w-px h-4"
                    style={{ background: "var(--border-default)" }}
                  />
                  <span style={{ color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--orange-500)" }}>
                      {atividadesConcluidasHojeCount}
                    </strong>{" "}
                    atividades concluidas
                  </span>
                </div>
              </div>

              {/* Atividades de Hoje */}
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <h2
                  className="font-fraunces font-semibold text-base mb-4"
                  style={{ color: "var(--text-primary)" }}
                >
                  Atividades de Hoje
                </h2>

                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {overdueFirst.map((a) => (
                      <AtividadeRow
                        key={a.id}
                        atividade={a}
                        projetos={projetos}
                        onComplete={handleComplete}
                        onDelete={handleDelete}
                        onClickTitle={setSelectedAtividade}
                      />
                    ))}
                  </AnimatePresence>

                  {overdueFirst.length === 0 && (
                    <EmptyState
                      message="Nenhuma atividade para hoje. Adicione uma abaixo!"
                      icon={<Flame size={24} />}
                    />
                  )}

                  {/* Add atividade input */}
                  <div
                    className="flex items-center gap-2 py-2 px-3 rounded-lg"
                    style={{ background: "var(--bg-input)" }}
                  >
                    <button
                      onClick={() => handleAddTask()}
                      className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors"
                      style={{ color: "var(--orange-500)" }}
                      title="Adicionar atividade"
                    >
                      <Plus size={16} />
                    </button>
                    <input
                      type="text"
                      placeholder="Adicionar atividade"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddTask();
                      }}
                      className="flex-1 bg-transparent border-none outline-none font-dm text-sm"
                      style={{ color: "var(--text-primary)" }}
                    />
                  </div>

                  {/* Completed atividades */}
                  {hojeConcluidas.length > 0 && (
                    <div
                      className="pt-3 mt-2 border-t"
                      style={{ borderColor: "var(--border-default)" }}
                    >
                      <p
                        className="font-dm text-xs mb-2"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        Concluidas ({hojeConcluidas.length})
                      </p>
                      <AnimatePresence mode="popLayout">
                        {hojeConcluidas.map((a) => (
                          <AtividadeRow
                            key={a.id}
                            atividade={a}
                            projetos={projetos}
                            onComplete={handleComplete}
                            onDelete={handleDelete}
                            onReopen={handleReopen}
                            onClickTitle={setSelectedAtividade}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>

              {/* Sessoes de Hoje (compact timeline) */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <h3
                  className="font-fraunces font-semibold text-sm mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  Sessoes de Hoje
                </h3>
                <SessionTimeline sessoes={sessoes} />
              </div>
            </motion.div>
          )}

          {/* ── TAB: CALENDARIO ────────────────────── */}
          {activeTab === "calendario" && (
            <motion.div
              {...staggerChild(2)}
              className="rounded-2xl p-6"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
              }}
            >
              <CalendarTab
                allAtividades={filteredCalendar}
                projetos={projetos}
                onComplete={handleComplete}
                onDelete={handleDelete}
                onReopen={handleReopen}
                onCreateAtividade={handleCreateFromCalendar}
                onClickTitle={setSelectedAtividade}
              />
            </motion.div>
          )}

          {/* ── TAB: TODAS ─────────────────────────── */}
          {activeTab === "todas" && (
            <motion.div {...staggerChild(2)} className="space-y-4">
              {allGrouped.length === 0 && (
                <EmptyState
                  message="Nenhuma atividade pendente."
                  icon={<Check size={24} />}
                />
              )}
              {allGrouped.map((group, i) => (
                <TodasGroup
                  key={group.projeto?.id ?? "__none__"}
                  projeto={group.projeto}
                  atividades={group.atividades}
                  projetos={projetos}
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                  onClickTitle={setSelectedAtividade}
                />
              ))}
            </motion.div>
          )}

          {/* ── TAB: CONCLUIDAS ────────────────────── */}
          {activeTab === "concluidas" && (
            <motion.div {...staggerChild(2)} className="space-y-2">
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <h2
                  className="font-fraunces font-semibold text-base mb-4"
                  style={{ color: "var(--text-primary)" }}
                >
                  Atividades Concluidas
                </h2>
                {filteredConcluidas.length === 0 ? (
                  <EmptyState
                    message="Nenhuma atividade concluida ainda."
                    icon={<Check size={24} />}
                  />
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {filteredConcluidas
                        .sort((a, b) =>
                          (b.concluida_em ?? "").localeCompare(a.concluida_em ?? "")
                        )
                        .map((a) => (
                          <AtividadeRow
                            key={a.id}
                            atividade={a}
                            projetos={projetos}
                            onComplete={handleComplete}
                            onDelete={handleDelete}
                            onReopen={handleReopen}
                            onClickTitle={setSelectedAtividade}
                            showConcluida
                          />
                        ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────── */}
      <CreatePastaModal
        open={showCreatePasta}
        onClose={() => setShowCreatePasta(false)}
        onCreated={reload}
      />
      <CreateProjetoModal
        open={showCreateProjeto}
        onClose={() => setShowCreateProjeto(false)}
        onCreated={reload}
        pastas={pastas}
      />

      {/* ── Activity Detail Panel ───────────────────── */}
      <AnimatePresence>
        {selectedAtividade && (
          <>
            <motion.div
              key="detail-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9997]"
              style={{ background: "rgba(0,0,0,0.3)" }}
              onClick={() => setSelectedAtividade(null)}
            />
            <AtividadeDetailPanel
              key={selectedAtividade.id}
              atividade={selectedAtividade}
              projetos={projetos}
              onClose={() => setSelectedAtividade(null)}
              onUpdated={() => {
                reload();
                // Refresh selectedAtividade with latest data
                const updated = getTodasAtividades().find((a) => a.id === selectedAtividade.id);
                if (updated) setSelectedAtividade(updated);
              }}
              onSelectAtividade={(a) => setSelectedAtividade(a)}
            />
          </>
        )}
      </AnimatePresence>
    </Shell>
  );
}

/* ── Todas Group (collapsible project group) ──────── */

function TodasGroup({
  projeto,
  atividades,
  projetos,
  onComplete,
  onDelete,
  onClickTitle,
}: {
  projeto: Projeto | null;
  atividades: Atividade[];
  projetos: Projeto[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onClickTitle?: (atividade: Atividade) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
      }}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 mb-2"
      >
        {collapsed ? (
          <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
        ) : (
          <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />
        )}
        {projeto && (
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: projeto.cor }}
          />
        )}
        <span
          className="font-fraunces font-semibold text-sm"
          style={{ color: "var(--text-primary)" }}
        >
          {projeto?.nome ?? "Sem projeto"}
        </span>
        <span
          className="font-dm text-xs ml-auto"
          style={{ color: "var(--text-tertiary)" }}
        >
          {atividades.length} atividade{atividades.length !== 1 ? "s" : ""}
        </span>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-2"
          >
            {atividades.map((a) => (
              <AtividadeRow
                key={a.id}
                atividade={a}
                projetos={projetos}
                onComplete={onComplete}
                onDelete={onDelete}
                onClickTitle={onClickTitle}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
