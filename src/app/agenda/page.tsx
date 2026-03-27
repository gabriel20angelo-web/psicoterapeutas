"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  addWeeks, subWeeks, addMonths, subMonths, addDays, subDays,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, MoreVertical, CheckCircle, XCircle, MessageCircle, Star, MapPin, Users as UsersIcon, Calendar, CalendarDays, LayoutGrid, Eye, EyeOff, X } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import Shell from "@/components/Shell";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import WeekView from "@/components/agenda/WeekView";
import DayView from "@/components/agenda/DayView";
import MonthView from "@/components/agenda/MonthView";
import CreateActivityModal from "@/components/agenda/CreateActivityModal";
import CreateFormacaoModal from "@/components/agenda/CreateFormacaoModal";
import ActivityDetailModal from "@/components/agenda/ActivityDetailModal";
import { getAtividades, getAtividadesComunidade, createAtividade, toggleInscricao, updateAtividade, getTemplates, onDataChange } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { getTodasAtividades as getForjaAtividades } from "@/lib/forja-data";
import { getConteudos as getUsinaConteudos, STATUS_CONFIG as USINA_STATUS } from "@/lib/usina-data";
import { fillTemplate, buildWhatsAppUrl, buildMessageVars } from "@/lib/whatsapp";
import { CATEGORIA_COMUNIDADE_COLORS } from "@/lib/status-colors";
import { fadeUp, staggerChild } from "@/lib/animations";
import type { Atividade } from "@/types/database";

type AgendaMode = "pessoal" | "formacao";
type ViewMode = "semana" | "dia" | "mes";

const AGENDA_TABS = [
  { id: "pessoal", label: "Agenda Pessoal" },
  { id: "formacao", label: "Formação" },
];

const VIEW_TABS = [
  { id: "semana", label: "Semana", icon: CalendarDays },
  { id: "mes", label: "Mês", icon: LayoutGrid },
];

export default function AgendaPage() {
  const [agendaMode, setAgendaMode] = useState<AgendaMode>("pessoal");
  const [viewMode, setViewMode] = useState<ViewMode>("semana");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-refresh when any data mutation happens anywhere in the app
  useEffect(() => {
    return onDataChange(() => setRefreshKey(k => k + 1));
  }, []);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | undefined>();
  const [prefillTime, setPrefillTime] = useState<string | undefined>();
  const [selectedActivity, setSelectedActivity] = useState<Atividade | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Forja activities toggle (persisted in localStorage)
  const [showForja, setShowForja] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('allos-agenda-show-forja') !== 'false';
    return true;
  });
  const [showUsina, setShowUsina] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('allos-agenda-show-usina') !== 'false';
    return true;
  });

  useEffect(() => { localStorage.setItem('allos-agenda-show-forja', String(showForja)); }, [showForja]);
  useEffect(() => { localStorage.setItem('allos-agenda-show-usina', String(showUsina)); }, [showUsina]);

  // Formação state
  const [formacaoViewMode, setFormacaoViewMode] = useState<ViewMode>("semana");
  const [formacaoDate, setFormacaoDate] = useState(new Date());
  const [showAllosFormacao, setShowAllosFormacao] = useState(true);
  const [showComunidadeFormacao, setShowComunidadeFormacao] = useState(true);
  const [formacaoDisplay, setFormacaoDisplay] = useState<'calendario' | 'lista'>('calendario');
  const [showFormacaoCreateModal, setShowFormacaoCreateModal] = useState(false);
  const [formacaoPrefillDate, setFormacaoPrefillDate] = useState<string | undefined>();
  const [formacaoPrefillTime, setFormacaoPrefillTime] = useState<string | undefined>();

  const { profile, canCreateFormacaoCanonica } = useAuth();
  const { toast } = useToast();
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const batchMenuRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [calendarHeight, setCalendarHeight] = useState<number | null>(null);

  useEffect(() => {
    function measure() {
      if (calendarRef.current) {
        const rect = calendarRef.current.getBoundingClientRect();
        const available = window.innerHeight - rect.top - 24;
        setCalendarHeight(Math.max(available, 300));
      }
    }
    measure();
    window.addEventListener('resize', measure);
    const timer = setTimeout(measure, 500);
    return () => { window.removeEventListener('resize', measure); clearTimeout(timer); };
  }, [viewMode, agendaMode, formacaoViewMode, formacaoDisplay]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (batchMenuRef.current && !batchMenuRef.current.contains(e.target as Node)) setShowBatchMenu(false);
    }
    if (showBatchMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBatchMenu]);

  // ── Personal agenda data ──
  const dateRange = useMemo(() => {
    if (viewMode === "semana") return { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) };
    if (viewMode === "dia") { const s = new Date(currentDate); s.setHours(0,0,0,0); const e = new Date(currentDate); e.setHours(23,59,59,999); return { start: s, end: e }; }
    return { start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }) };
  }, [viewMode, currentDate]);

  const activities = useMemo(
    () => getAtividades(dateRange),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateRange.start.getTime(), dateRange.end.getTime(), refreshKey]
  );

  // ── Convert Forja activities to Atividade format ──
  function forjaToAtividades(): Atividade[] {
    return getForjaAtividades()
      .filter(a => a.data_limite && a.status === 'pendente')
      .map(a => ({
        id: `forja-${a.id}`,
        terapeuta_id: 'system',
        tipo: 'pessoal' as const,
        titulo: `🔥 ${a.titulo}`,
        descricao: a.notas || a.descricao || '',
        data_inicio: `${a.data_limite}T09:00:00`,
        data_fim: `${a.data_limite}T09:30:00`,
        status: 'pendente' as const,
        recorrencia: 'nenhuma' as const,
        presenca_registrada: false,
        created_at: a.created_at,
        updated_at: a.updated_at || a.created_at,
      }));
  }

  // ── Convert Usina content to Atividade format ──
  function usinaToAtividades(): Atividade[] {
    return getUsinaConteudos()
      .filter(c => c.data_planejada && !['postado', 'arquivado'].includes(c.status))
      .map(c => ({
        id: `usina-${c.id}`,
        terapeuta_id: 'system',
        tipo: 'outro' as const,
        titulo: `✨ ${c.emoji_marcador || ''} ${c.titulo}`.trim(),
        descricao: c.descricao || '',
        data_inicio: `${c.data_planejada}T10:00:00`,
        data_fim: `${c.data_planejada}T10:30:00`,
        status: 'pendente' as const,
        recorrencia: 'nenhuma' as const,
        presenca_registrada: false,
        created_at: c.created_at,
        updated_at: c.updated_at,
      }));
  }

  // ── Merge all activities ──
  const allActivities = useMemo(() => {
    let merged = [...activities];
    if (showForja) {
      const forja = forjaToAtividades().filter(a => {
        const d = new Date(a.data_inicio);
        return d >= dateRange.start && d <= dateRange.end;
      });
      merged = [...merged, ...forja];
    }
    if (showUsina) {
      const usina = usinaToAtividades().filter(a => {
        const d = new Date(a.data_inicio);
        return d >= dateRange.start && d <= dateRange.end;
      });
      merged = [...merged, ...usina];
    }
    return merged;
  }, [activities, showForja, showUsina, dateRange, refreshKey]);

  // ── Formação data ──
  const formacaoActivities = useMemo(() => {
    const all = getAtividadesComunidade({ tipo: 'todos' });
    return all.filter(a => {
      if (a.tipo === 'canonico' && !showAllosFormacao) return false;
      if (a.tipo === 'comunidade' && !showComunidadeFormacao) return false;
      return true;
    });
  }, [showAllosFormacao, showComunidadeFormacao, refreshKey]);

  const formacaoAsAtividades: Atividade[] = useMemo(() => {
    return formacaoActivities.map(a => ({
      id: a.id, terapeuta_id: profile?.id || '', tipo: 'outro' as const,
      titulo: a.titulo, descricao: a.descricao, data_inicio: a.data_inicio, data_fim: a.data_fim,
      status: 'confirmada' as const, recorrencia: 'nenhuma' as const,
      presenca_registrada: false, created_at: a.created_at, updated_at: a.updated_at,
    }));
  }, [formacaoActivities, profile?.id || '']);

  // Formação detail modal
  const [selectedFormacao, setSelectedFormacao] = useState<typeof formacaoActivities[0] | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  // ── Personal navigation ──
  function goToday() { setCurrentDate(new Date()); }
  function goPrev() {
    if (viewMode === "semana") setCurrentDate(d => subWeeks(d, 1));
    else if (viewMode === "dia") setCurrentDate(d => subDays(d, 1));
    else setCurrentDate(d => subMonths(d, 1));
  }
  function goNext() {
    if (viewMode === "semana") setCurrentDate(d => addWeeks(d, 1));
    else if (viewMode === "dia") setCurrentDate(d => addDays(d, 1));
    else setCurrentDate(d => addMonths(d, 1));
  }
  function getHeaderLabel(): string {
    if (viewMode === "semana") {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 });
      const e = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(s, "d", { locale: ptBR })}\u2013${format(e, "d 'de' MMMM yyyy", { locale: ptBR })}`;
    }
    if (viewMode === "dia") return format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  }

  // ── Formação navigation ──
  function formacaoGoToday() { setFormacaoDate(new Date()); }
  function formacaoGoPrev() {
    if (formacaoViewMode === "semana") setFormacaoDate(d => subWeeks(d, 1));
    else if (formacaoViewMode === "dia") setFormacaoDate(d => subDays(d, 1));
    else setFormacaoDate(d => subMonths(d, 1));
  }
  function formacaoGoNext() {
    if (formacaoViewMode === "semana") setFormacaoDate(d => addWeeks(d, 1));
    else if (formacaoViewMode === "dia") setFormacaoDate(d => addDays(d, 1));
    else setFormacaoDate(d => addMonths(d, 1));
  }
  function formacaoGetHeaderLabel(): string {
    if (formacaoViewMode === "semana") {
      const s = startOfWeek(formacaoDate, { weekStartsOn: 1 });
      const e = endOfWeek(formacaoDate, { weekStartsOn: 1 });
      return `${format(s, "d", { locale: ptBR })}\u2013${format(e, "d 'de' MMMM yyyy", { locale: ptBR })}`;
    }
    if (formacaoViewMode === "dia") return format(formacaoDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    return format(formacaoDate, "MMMM 'de' yyyy", { locale: ptBR });
  }

  function handleClickSlot(date: Date, time: string) { setPrefillDate(format(date, "yyyy-MM-dd")); setPrefillTime(time); setShowCreateModal(true); }
  // State for external activity detail modal
  const [externalDetail, setExternalDetail] = useState<{ source: 'forja' | 'usina'; activity: Atividade } | null>(null);

  function handleClickActivity(activity: Atividade) {
    if (activity.id.startsWith('forja-') || activity.id.startsWith('usina-')) {
      setExternalDetail({
        source: activity.id.startsWith('forja-') ? 'forja' : 'usina',
        activity,
      });
      return;
    }
    setSelectedActivity(activity); setShowDetailModal(true);
  }
  function handleMonthDaySelect(date: Date) { setCurrentDate(date); setViewMode("dia"); }
  function handleOpenCreate() { setPrefillDate(undefined); setPrefillTime(undefined); setShowCreateModal(true); }

  // ── Batch operations ──
  const dayActivities = useMemo(() => activities.filter(a => isSameDay(new Date(a.data_inicio), currentDate)), [activities, currentDate]);
  const pendingDayActivities = useMemo(() => dayActivities.filter(a => a.status === 'pendente'), [dayActivities]);

  function handleBatchConfirmAll() {
    let count = 0;
    for (const a of pendingDayActivities) { updateAtividade(a.id, { status: 'confirmada' }); count++; }
    refresh(); setShowBatchMenu(false);
    toast(`${count} sessão(ões) confirmada(s)`, { type: 'success' });
  }

  function handleBatchCancelAll() {
    let count = 0;
    for (const a of dayActivities.filter(act => act.status !== 'cancelada')) { updateAtividade(a.id, { status: 'cancelada' }); count++; }
    refresh(); setShowBatchMenu(false); setShowCancelConfirm(false);
    toast(`${count} sessão(ões) cancelada(s)`, { type: 'warning' });
  }

  function handleBatchWhatsApp() {
    const pending = pendingDayActivities.filter(a => a.paciente?.telefone);
    if (pending.length === 0) { toast('Nenhum paciente com telefone e sessão pendente', { type: 'info' }); setShowBatchMenu(false); return; }
    const tmpl = getTemplates().find(t => t.tipo === 'confirmacao');
    for (const a of pending) {
      if (a.paciente?.telefone && tmpl) {
        const vars = buildMessageVars(profile!, a.paciente, a);
        window.open(buildWhatsAppUrl(a.paciente.telefone, fillTemplate(tmpl.conteudo, vars)), '_blank');
      }
    }
    setShowBatchMenu(false);
    toast(`WhatsApp aberto para ${pending.length} paciente(s)`, { type: 'success' });
  }

  const handleToggleInscricao = (id: string) => { toggleInscricao(id); refresh(); };

  const handleAddToPersonal = (ac: typeof formacaoActivities[0]) => {
    createAtividade({
      terapeuta_id: profile?.id || '', tipo: 'outro',
      titulo: `Formação: ${ac.titulo}`, descricao: ac.descricao || undefined,
      data_inicio: ac.data_inicio, data_fim: ac.data_fim,
      status: 'confirmada', recorrencia: 'nenhuma',
    });
    refresh();
    toast('Adicionado à agenda pessoal', { type: 'success' });
  };

  // Legend colors
  const LEGEND = [
    { label: "Sessão", color: "#C84B31" },
    { label: "Supervisão", color: "#D97706" },
    { label: "Pessoal", color: "#9CA3AF" },
    { label: "Outro", color: "#7C3AED" },
  ];

  return (
    <Shell>
      {/* ═══ HEADER — Calendário Allos style ═══ */}
      <motion.div {...fadeUp()} className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--orange-glow)] dark:bg-[rgba(200,75,49,.08)] flex items-center justify-center border border-[var(--border-subtle)]">
              <CalendarDays size={20} className="text-[var(--orange-500)]" />
            </div>
            <div>
              <h1 className="font-fraunces font-bold text-2xl">Calendário Allos</h1>
              <p className="font-dm text-xs text-[var(--text-secondary)] mt-0.5">
                {agendaMode === "pessoal" ? "Grupos, intervisões e encontros" : "Formações e atividades da comunidade"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div className="inline-flex rounded-xl border border-[var(--border-default)] overflow-hidden">
              {VIEW_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = (agendaMode === "pessoal" ? viewMode : formacaoViewMode) === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => agendaMode === "pessoal" ? setViewMode(tab.id as ViewMode) : setFormacaoViewMode(tab.id as ViewMode)}
                    className={`flex items-center gap-1.5 px-4 py-2 font-dm text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[var(--bg-card)] dark:bg-[rgba(17,21,32,.8)] text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {agendaMode === "pessoal" && (
              <Button onClick={handleOpenCreate} icon={<Plus size={16} />}>Novo</Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Agenda mode tabs */}
      <motion.div {...staggerChild(0)} className="mb-4">
        <div className="inline-flex gap-1 p-1 rounded-xl bg-[var(--bg-card)]/40 dark:bg-[rgba(17,21,32,.4)] border border-[var(--border-subtle)]">
          {AGENDA_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAgendaMode(tab.id as AgendaMode)}
              className={`px-4 py-2 rounded-lg font-dm text-sm font-medium transition-all ${
                agendaMode === tab.id
                  ? "text-[var(--text-primary)] bg-[var(--bg-card)] dark:bg-[rgba(17,21,32,.8)] shadow-sm border border-[var(--border-default)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ─── AGENDA PESSOAL ─── */}
      {agendaMode === "pessoal" && (
        <>
          {/* Navigation bar */}
          <motion.div {...staggerChild(1)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={goToday}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] font-dm text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Hoje
              </button>
              <button onClick={goPrev} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-colors">
                <ChevronLeft size={18} className="text-[var(--text-secondary)]" />
              </button>
              <button onClick={goNext} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-colors">
                <ChevronRight size={18} className="text-[var(--text-secondary)]" />
              </button>
              <span className="font-fraunces text-lg font-semibold text-[var(--text-primary)] capitalize ml-1">
                {getHeaderLabel()}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Forja activities toggle */}
              <button
                onClick={() => setShowForja(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-dm text-xs font-medium transition-all ${
                  showForja
                    ? 'bg-[var(--orange-500)] text-white shadow-sm'
                    : 'border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
                title={showForja ? 'Ocultar atividades da Forja' : 'Mostrar atividades da Forja'}
              >
                {showForja ? <Eye size={13} /> : <EyeOff size={13} />}
                Forja
              </button>

              {/* Usina content toggle */}
              <button
                onClick={() => setShowUsina(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-dm text-xs font-medium transition-all ${
                  showUsina
                    ? 'bg-[var(--orange-500)] text-white shadow-sm'
                    : 'border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
                title={showUsina ? 'Ocultar conteúdos da Usina' : 'Mostrar conteúdos da Usina'}
              >
                {showUsina ? <Eye size={13} /> : <EyeOff size={13} />}
                Usina
              </button>

              {/* Legend */}
              <div className="hidden md:flex items-center gap-4">
                {LEGEND.map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="font-dm text-xs text-[var(--text-secondary)]">{l.label}</span>
                  </div>
                ))}
              </div>

              {/* Batch actions (day view only) */}
              {viewMode === "dia" && (
                <div className="relative" ref={batchMenuRef}>
                  <button
                    onClick={() => setShowBatchMenu(v => !v)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-colors text-[var(--text-secondary)]"
                    title="Ações do dia"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {showBatchMenu && (
                    <div className="absolute right-0 top-full mt-1 w-64 card-base overflow-hidden z-50">
                      <button onClick={handleBatchConfirmAll} disabled={pendingDayActivities.length === 0}
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                        <div><p className="font-dm text-sm text-[var(--text-primary)]">Confirmar pendentes</p><p className="font-dm text-[11px] text-[var(--text-tertiary)]">{pendingDayActivities.length} pendente(s)</p></div>
                      </button>
                      <button onClick={() => { setShowCancelConfirm(true); setShowBatchMenu(false); }} disabled={dayActivities.filter(a => a.status !== 'cancelada').length === 0}
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors border-t border-[var(--border-subtle)] disabled:opacity-40 disabled:cursor-not-allowed">
                        <XCircle size={16} className="text-red-500 flex-shrink-0" />
                        <div><p className="font-dm text-sm text-[var(--text-primary)]">Cancelar todas</p></div>
                      </button>
                      <button onClick={handleBatchWhatsApp} disabled={pendingDayActivities.filter(a => a.paciente?.telefone).length === 0}
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-[var(--bg-hover)] transition-colors border-t border-[var(--border-subtle)] disabled:opacity-40 disabled:cursor-not-allowed">
                        <MessageCircle size={16} className="text-green-500 flex-shrink-0" />
                        <div><p className="font-dm text-sm text-[var(--text-primary)]">WhatsApp em massa</p></div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Cancel all confirmation */}
          {showCancelConfirm && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)} />
              <div className="relative w-full max-w-[95vw] sm:max-w-[400px] mx-4 card-base modal-glass p-6">
                <h3 className="font-fraunces font-bold text-lg text-[var(--text-primary)] mb-2">Cancelar todas as sessões?</h3>
                <p className="font-dm text-sm text-[var(--text-secondary)] mb-6">
                  {dayActivities.filter(a => a.status !== 'cancelada').length} sessão(ões) do dia {format(currentDate, "dd/MM/yyyy")} serão canceladas.
                </p>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setShowCancelConfirm(false)}>Voltar</Button>
                  <button onClick={handleBatchCancelAll} className="px-4 py-2 rounded-xl bg-red-500 text-white font-dm text-sm font-medium hover:bg-red-600 transition-colors">
                    Sim, cancelar todas
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Calendar container */}
          <motion.div
            ref={calendarRef}
            {...staggerChild(2)}
            className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] dark:bg-[rgba(17,21,32,.5)] dark:backdrop-blur-sm overflow-auto flex flex-col"
            style={{ height: calendarHeight || 'auto', maxHeight: calendarHeight || undefined }}
          >
            {viewMode === "semana" && <WeekView currentDate={currentDate} activities={allActivities} onClickActivity={handleClickActivity} onClickSlot={handleClickSlot} />}
            {viewMode === "dia" && <DayView currentDate={currentDate} activities={allActivities} onClickActivity={handleClickActivity} onClickSlot={handleClickSlot} />}
            {viewMode === "mes" && <MonthView currentDate={currentDate} activities={allActivities} onSelectDay={handleMonthDaySelect} />}
          </motion.div>

          <CreateActivityModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={refresh} prefillDate={prefillDate} prefillTime={prefillTime} />
          <ActivityDetailModal isOpen={showDetailModal} onClose={() => { setShowDetailModal(false); setSelectedActivity(null); }} activity={selectedActivity} onUpdated={refresh} />
        </>
      )}

      {/* ─── AGENDA DE FORMAÇÃO ─── */}
      {agendaMode === "formacao" && (
        <>
          {/* Add event button */}
          <motion.div {...staggerChild(0.5)} className="flex justify-end mb-3">
            <Button onClick={() => { setFormacaoPrefillDate(undefined); setFormacaoPrefillTime(undefined); setShowFormacaoCreateModal(true); }} icon={<Plus size={16} />}>Novo Evento</Button>
          </motion.div>

          {/* Controls row */}
          <motion.div {...staggerChild(1)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Display toggle */}
              <div className="inline-flex rounded-xl border border-[var(--border-default)] overflow-hidden">
                {[{ id: "calendario", label: "Calendário" }, { id: "lista", label: "Lista" }].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFormacaoDisplay(tab.id as 'calendario' | 'lista')}
                    className={`px-4 py-2 font-dm text-sm font-medium transition-all ${
                      formacaoDisplay === tab.id
                        ? "bg-[var(--bg-card)] dark:bg-[rgba(17,21,32,.8)] text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {/* Visibility toggles */}
              <div className="flex gap-1">
                <button
                  onClick={() => setShowAllosFormacao(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-dm text-xs font-medium transition-colors ${
                    showAllosFormacao
                      ? 'bg-[var(--orange-glow)] text-[var(--orange-500)] border border-[var(--orange-500)]/30'
                      : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] line-through'
                  }`}
                >
                  {showAllosFormacao ? <Eye size={14} /> : <EyeOff size={14} />} Allos
                </button>
                <button
                  onClick={() => setShowComunidadeFormacao(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-dm text-xs font-medium transition-colors ${
                    showComunidadeFormacao
                      ? 'bg-[var(--orange-glow)] text-[var(--orange-500)] border border-[var(--orange-500)]/30'
                      : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] line-through'
                  }`}
                >
                  {showComunidadeFormacao ? <Eye size={14} /> : <EyeOff size={14} />} Comunidade
                </button>
              </div>
            </div>

            {/* Calendar navigation */}
            {formacaoDisplay === "calendario" && (
              <div className="flex items-center gap-2">
                <button onClick={formacaoGoToday} className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] font-dm text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
                  Hoje
                </button>
                <button onClick={formacaoGoPrev} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-colors">
                  <ChevronLeft size={18} className="text-[var(--text-secondary)]" />
                </button>
                <button onClick={formacaoGoNext} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-colors">
                  <ChevronRight size={18} className="text-[var(--text-secondary)]" />
                </button>
                <span className="font-fraunces text-lg font-semibold text-[var(--text-primary)] capitalize ml-1">
                  {formacaoGetHeaderLabel()}
                </span>
              </div>
            )}
          </motion.div>

          {/* Calendar view */}
          {formacaoDisplay === "calendario" && (
            <motion.div
              ref={calendarRef}
              {...staggerChild(2)}
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] dark:bg-[rgba(17,21,32,.5)] dark:backdrop-blur-sm overflow-auto flex flex-col"
              style={{ height: calendarHeight || 'auto', maxHeight: calendarHeight || undefined }}
            >
              {formacaoViewMode === "semana" && <WeekView currentDate={formacaoDate} activities={formacaoAsAtividades} onClickActivity={(a) => { const original = formacaoActivities.find(f => f.id === a.id); if (original) setSelectedFormacao(original); }} onClickSlot={(date, time) => { setFormacaoPrefillDate(format(date, "yyyy-MM-dd")); setFormacaoPrefillTime(time); setShowFormacaoCreateModal(true); }} />}
              {formacaoViewMode === "dia" && <DayView currentDate={formacaoDate} activities={formacaoAsAtividades} onClickActivity={(a) => { const original = formacaoActivities.find(f => f.id === a.id); if (original) setSelectedFormacao(original); }} onClickSlot={(date, time) => { setFormacaoPrefillDate(format(date, "yyyy-MM-dd")); setFormacaoPrefillTime(time); setShowFormacaoCreateModal(true); }} />}
              {formacaoViewMode === "mes" && <MonthView currentDate={formacaoDate} activities={formacaoAsAtividades} onSelectDay={(d) => { setFormacaoDate(d); setFormacaoViewMode("dia"); }} />}
            </motion.div>
          )}

          {/* List view */}
          {formacaoDisplay === "lista" && (
            <motion.div {...staggerChild(2)}>
              {formacaoActivities.length === 0 ? (
                <EmptyState message="Nenhuma atividade de formação encontrada" />
              ) : (
                <div className="space-y-3">
                  {formacaoActivities.map((a, i) => {
                    const cat = CATEGORIA_COMUNIDADE_COLORS[a.categoria];
                    const isCanon = a.tipo === 'canonico';
                    return (
                      <motion.div key={a.id} {...staggerChild(i)}>
                        <Card className={isCanon ? 'border-l-4 border-l-emerald-500' : ''}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {isCanon && <Star size={14} className="text-emerald-500 fill-emerald-500" />}
                                <Badge bg={cat.bg} text={cat.text} label={cat.label} dot={cat.dot} />
                              </div>
                              <h3 className="font-fraunces font-bold text-[var(--text-primary)] mb-1">{a.titulo}</h3>
                              {a.descricao && <p className="font-dm text-sm text-[var(--text-secondary)] mb-2 line-clamp-2">{a.descricao}</p>}
                              <div className="flex flex-wrap items-center gap-3 font-dm text-xs text-[var(--text-secondary)]">
                                <span className="flex items-center gap-1"><Calendar size={13} />{format(new Date(a.data_inicio), "dd MMM 'às' HH:mm", { locale: ptBR })}</span>
                                {a.local_ou_link && <span className="flex items-center gap-1"><MapPin size={13} />{a.local_ou_link}</span>}
                                <span className="flex items-center gap-1"><UsersIcon size={13} />{a.total_inscritos || 0} inscritos{a.max_participantes ? ` / ${a.max_participantes}` : ''}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <Button variant={a.inscrito ? "secondary" : "primary"} size="sm" onClick={() => handleToggleInscricao(a.id)}>
                                {a.inscrito ? "Inscrito ✓" : "Participar"}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleAddToPersonal(a)} icon={<Plus size={12} />}>
                                Minha agenda
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          <CreateFormacaoModal
            isOpen={showFormacaoCreateModal}
            onClose={() => { setShowFormacaoCreateModal(false); setFormacaoPrefillDate(undefined); setFormacaoPrefillTime(undefined); }}
            onCreated={refresh}
            prefillDate={formacaoPrefillDate}
            prefillTime={formacaoPrefillTime}
          />
        </>
      )}
      {/* External activity detail modal (Forja / Usina) */}
      {externalDetail && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setExternalDetail(null)} />
          <div className="relative w-full max-w-[95vw] sm:max-w-[480px] mx-4 card-base modal-glass p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">{externalDetail.source === 'forja' ? '🔥' : '✨'}</span>
                <h3 className="font-fraunces font-bold text-lg text-[var(--text-primary)]">
                  {externalDetail.activity.titulo.replace(/^[🔥✨]\s*/, '')}
                </h3>
              </div>
              <button onClick={() => setExternalDetail(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)]">
                <X size={18} className="text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="font-dm text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                  background: externalDetail.source === 'forja' ? 'rgba(239,68,68,.1)' : 'rgba(139,92,246,.1)',
                  color: externalDetail.source === 'forja' ? '#EF4444' : '#8B5CF6',
                }}>
                  {externalDetail.source === 'forja' ? 'Forja' : 'Usina'}
                </span>
                <span className="font-dm text-xs text-[var(--text-tertiary)]">
                  {externalDetail.activity.tipo === 'pessoal' ? 'Atividade' : 'Conteúdo'}
                </span>
              </div>

              {externalDetail.activity.descricao && (
                <p className="font-dm text-sm text-[var(--text-secondary)] leading-relaxed">
                  {externalDetail.activity.descricao}
                </p>
              )}

              <div className="font-dm text-xs text-[var(--text-tertiary)] space-y-1">
                <p>📅 {format(new Date(externalDetail.activity.data_inicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                <p>🕐 {format(new Date(externalDetail.activity.data_inicio), "HH:mm")} – {format(new Date(externalDetail.activity.data_fim), "HH:mm")}</p>
                <p>Status: {externalDetail.activity.status}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setExternalDetail(null);
                  if (externalDetail.source === 'forja') {
                    window.location.href = '/forja';
                  } else {
                    const realId = externalDetail.activity.id.replace('usina-', '');
                    window.location.href = `/conteudo/conteudos/${realId}`;
                  }
                }}
                className="px-4 py-2 rounded-xl font-dm text-sm font-medium text-white transition-colors"
                style={{ background: 'var(--orange-500)' }}
              >
                {externalDetail.source === 'forja' ? 'Abrir no Forja' : 'Abrir na Usina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Formação detail modal */}
      {selectedFormacao && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedFormacao(null)} />
          <div className="relative w-full max-w-[95vw] sm:max-w-[450px] mx-4 card-base modal-glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-fraunces font-bold text-lg text-[var(--text-primary)]">{selectedFormacao.titulo}</h3>
              <button onClick={() => setSelectedFormacao(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)]">
                <X size={18} className="text-[var(--text-secondary)]" />
              </button>
            </div>
            {selectedFormacao.descricao && <p className="font-dm text-sm text-[var(--text-secondary)] mb-4">{selectedFormacao.descricao}</p>}
            <div className="font-dm text-xs text-[var(--text-tertiary)] space-y-1">
              <p>📅 {format(new Date(selectedFormacao.data_inicio), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
              {selectedFormacao.local_ou_link && <p>📍 {selectedFormacao.local_ou_link}</p>}
              <p>👥 {selectedFormacao.total_inscritos || 0} inscritos</p>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
