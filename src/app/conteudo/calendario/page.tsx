"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Calendar, ChevronLeft, ChevronRight, Plus, X,
} from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday, isSameDay,
  addMonths, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import UsinaNav from "@/components/usina/UsinaNav";
import { fadeUp } from "@/lib/animations";
import { useToast } from "@/contexts/ToastContext";
import {
  getConteudos, getConteudoRedes, getRedeSocial, getEditorias,
  createConteudo,
  type Conteudo, type Editoria,
} from "@/lib/usina-data";

// ─── Day headers ───

const DAY_HEADERS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

// ─── Main Component ───

export default function CalendarioPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [editorias, setEditorias] = useState<Editoria[]>([]);
  const [mounted, setMounted] = useState(false);

  // Create modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState("");
  const [modalTitulo, setModalTitulo] = useState("");
  const [modalEditoriaId, setModalEditoriaId] = useState("");

  // ─── Data loading ───

  const refresh = useCallback(() => {
    setConteudos(getConteudos());
    setEditorias(getEditorias());
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  // ─── Calendar grid computation ───

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Map conteudos by date string for fast lookup
  const conteudosByDate: Record<string, Conteudo[]> = {};
  for (const c of conteudos) {
    if (c.data_planejada) {
      if (!conteudosByDate[c.data_planejada]) conteudosByDate[c.data_planejada] = [];
      conteudosByDate[c.data_planejada].push(c);
    }
  }

  // ─── Handlers ───

  const goToPrevMonth = () => setCurrentMonth((m) => subMonths(m, 1));
  const goToNextMonth = () => setCurrentMonth((m) => addMonths(m, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const dayConteudos = conteudosByDate[dateStr];
    if (!dayConteudos || dayConteudos.length === 0) {
      // Open create modal pre-filled with this date
      setModalDate(dateStr);
      setModalTitulo("");
      setModalEditoriaId("");
      setModalOpen(true);
    }
  };

  const handleConteudoClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    router.push(`/conteudo/conteudos/${id}`);
  };

  const handleCreateConteudo = () => {
    const titulo = modalTitulo.trim();
    if (!titulo) return;

    createConteudo({
      titulo,
      data_planejada: modalDate || null,
      editoria_id: modalEditoriaId || null,
      status: "caixa_de_ideias",
    });

    toast("Conteúdo criado", { type: "success" });
    setModalOpen(false);
    setModalTitulo("");
    setModalDate("");
    setModalEditoriaId("");
    refresh();
  };

  if (!mounted) return null;

  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR });

  return (
    <Shell>
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        {/* Sub-navigation */}
        <motion.div {...fadeUp(0)}>
          <UsinaNav />
        </motion.div>

        {/* Header */}
        <motion.div {...fadeUp(0.05)} className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--orange-glow)" }}
          >
            <Calendar size={20} style={{ color: "var(--orange-500)" }} />
          </div>
          <div>
            <h1
              className="font-fraunces text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Calendario
            </h1>
            <p
              className="font-dm text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Visao mensal da producao de conteudo
            </p>
          </div>
        </motion.div>

        {/* Month navigation */}
        <motion.div {...fadeUp(0.1)} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goToPrevMonth}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-150"
              style={{
                background: "var(--bg-card-elevated)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-default)",
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <h2
              className="font-fraunces text-xl font-semibold capitalize min-w-[200px] text-center"
              style={{ color: "var(--text-primary)" }}
            >
              {monthLabel}
            </h2>
            <button
              onClick={goToNextMonth}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-150"
              style={{
                background: "var(--bg-card-elevated)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-default)",
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        </motion.div>

        {/* Calendar Grid */}
        <motion.div {...fadeUp(0.15)}>
          <Card className="!p-4 overflow-x-auto">
            <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_HEADERS.map((d) => (
                <div
                  key={d}
                  className="font-dm text-xs font-semibold uppercase text-center py-2"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div
              className="grid grid-cols-7"
              style={{ border: "1px solid var(--border-default)" }}
            >
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);
                const dayConteudos = conteudosByDate[dateStr] || [];

                return (
                  <div
                    key={dateStr}
                    onClick={() => handleDayClick(day)}
                    className="relative flex flex-col transition-colors duration-100 cursor-pointer"
                    style={{
                      minHeight: "100px",
                      borderRight: "1px solid var(--border-default)",
                      borderBottom: "1px solid var(--border-default)",
                      background: today
                        ? "var(--orange-glow)"
                        : inMonth
                        ? "transparent"
                        : "var(--bg-card-elevated)",
                    }}
                    onMouseEnter={(e) => {
                      if (!today) e.currentTarget.style.background = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      if (!today) {
                        e.currentTarget.style.background = inMonth
                          ? "transparent"
                          : "var(--bg-card-elevated)";
                      }
                    }}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between px-2 pt-1.5">
                      <span
                        className={`font-dm text-xs font-medium ${
                          today ? "w-6 h-6 rounded-full flex items-center justify-center" : ""
                        }`}
                        style={{
                          color: today
                            ? "white"
                            : inMonth
                            ? "var(--text-primary)"
                            : "var(--text-tertiary)",
                          background: today ? "var(--orange-500)" : "transparent",
                        }}
                      >
                        {format(day, "d")}
                      </span>
                      {dayConteudos.length === 0 && inMonth && (
                        <Plus
                          size={12}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "var(--text-tertiary)" }}
                        />
                      )}
                    </div>

                    {/* Conteudos on this day */}
                    <div className="flex-1 px-1.5 py-1 space-y-0.5 overflow-hidden">
                      {dayConteudos.slice(0, 3).map((c) => (
                        <ConteudoChip
                          key={c.id}
                          conteudo={c}
                          onClick={(e) => handleConteudoClick(e, c.id)}
                        />
                      ))}
                      {dayConteudos.length > 3 && (
                        <span
                          className="font-dm text-[10px] px-1"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          +{dayConteudos.length - 3} mais
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* ─── Create Modal ─── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md mx-4 rounded-2xl p-6"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-5">
                <h3
                  className="font-fraunces text-lg font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Novo conteudo
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Titulo */}
                <div>
                  <label
                    className="font-dm text-xs font-semibold mb-1.5 block"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Titulo
                  </label>
                  <input
                    type="text"
                    value={modalTitulo}
                    onChange={(e) => setModalTitulo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateConteudo();
                    }}
                    placeholder="Nome do conteúdo..."
                    autoFocus
                    className="w-full font-dm text-sm rounded-xl px-4 py-2.5 outline-none transition-all duration-200"
                    style={{
                      background: "var(--bg-card-elevated)",
                      color: "var(--text-primary)",
                      border: "1.5px solid var(--border-default)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--orange-500)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-default)";
                    }}
                  />
                </div>

                {/* Data planejada */}
                <div>
                  <label
                    className="font-dm text-xs font-semibold mb-1.5 block"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Data planejada
                  </label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="w-full font-dm text-sm rounded-xl px-4 py-2.5 outline-none transition-all duration-200"
                    style={{
                      background: "var(--bg-card-elevated)",
                      color: "var(--text-primary)",
                      border: "1.5px solid var(--border-default)",
                    }}
                  />
                </div>

                {/* Editoria select */}
                <div>
                  <label
                    className="font-dm text-xs font-semibold mb-1.5 block"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Editoria
                  </label>
                  <select
                    value={modalEditoriaId}
                    onChange={(e) => setModalEditoriaId(e.target.value)}
                    className="w-full font-dm text-sm rounded-xl px-4 py-2.5 outline-none transition-all duration-200 appearance-none"
                    style={{
                      background: "var(--bg-card-elevated)",
                      color: "var(--text-primary)",
                      border: "1.5px solid var(--border-default)",
                    }}
                  >
                    <option value="">Sem editoria</option>
                    {editorias.map((ed) => (
                      <option key={ed.id} value={ed.id}>
                        {ed.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status info */}
                <p
                  className="font-dm text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Status inicial: Caixa de Ideias
                </p>
              </div>

              {/* Modal actions */}
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateConteudo}
                  disabled={!modalTitulo.trim()}
                  icon={<Plus size={14} />}
                >
                  Criar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}

// ─── Conteudo Chip ───

function ConteudoChip({
  conteudo,
  onClick,
}: {
  conteudo: Conteudo;
  onClick: (e: React.MouseEvent) => void;
}) {
  const redes = getConteudoRedes(conteudo.id);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-md px-1.5 py-1 flex items-center gap-1 group/chip transition-colors duration-100"
      style={{ background: "var(--bg-card-elevated)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--orange-glow)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-card-elevated)";
      }}
    >
      {conteudo.emoji_marcador && (
        <span className="text-[11px] flex-shrink-0">{conteudo.emoji_marcador}</span>
      )}
      <span
        className="font-dm text-[11px] font-medium truncate flex-1"
        style={{ color: "var(--text-primary)" }}
      >
        {conteudo.titulo}
      </span>
      {redes.length > 0 && (
        <span className="flex gap-0.5 flex-shrink-0">
          {redes.slice(0, 3).map((cr) => {
            const rede = getRedeSocial(cr.rede_social_id);
            if (!rede) return null;
            return (
              <span
                key={cr.id}
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: rede.cor }}
                title={rede.nome}
              />
            );
          })}
        </span>
      )}
    </button>
  );
}
