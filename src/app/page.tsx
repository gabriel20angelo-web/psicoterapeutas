"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Send, ChevronDown, FileText, BookOpen, Megaphone, Flame, Sparkles, AlertTriangle } from "lucide-react";
import Link from "next/link";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { getAtividades, getAtividadesComunidade, updateAtividade, getTemplates, getAlertasCruzados, onDataChange } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import type { AlertaCruzado } from "@/lib/data";
import { getBlogPosts } from "@/lib/blog-data";
import { getAvisos } from "@/lib/comunicacao-data";
import { getTempoFocadoHoje, getPomodorosHoje, getMetaDiaria, formatTempo, createTarefa as createForjaAtividade } from "@/lib/forja-data";
import { getConteudosProximos7Dias, STATUS_CONFIG as USINA_STATUS_CONFIG } from "@/lib/usina-data";
import { fillTemplate, buildWhatsAppUrl, buildMessageVars } from "@/lib/whatsapp";
import { STATUS_COLORS, TIPO_COLORS } from "@/lib/status-colors";
import { formatTimeRange } from "@/lib/calendar-utils";
import { staggerChild } from "@/lib/animations";
import { format, differenceInMinutes, differenceInSeconds, startOfDay, endOfDay, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/contexts/ToastContext";
import { saveSessionNote as saveSessionNoteLib } from "@/lib/notes";
import type { Atividade } from "@/types/database";

export default function DashboardPage() {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  useEffect(() => {
    return onDataChange(refresh);
  }, []);
  const { toast } = useToast();

  const [noteSessionId, setNoteSessionId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [showWeekSummary, setShowWeekSummary] = useState(false);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const todayActivities = getAtividades({ start: todayStart, end: todayEnd }).filter(a => a.tipo !== 'pessoal');
  const weekActivities = getAtividades({ start: weekStart, end: weekEnd });
  const comunidade = getAtividadesComunidade();

  // Last week summary
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekActivities = getAtividades({ start: lastWeekStart, end: lastWeekEnd });
  const lastWeekRealizadas = lastWeekActivities.filter(a => a.status === 'realizada').length;
  const lastWeekCanceladas = lastWeekActivities.filter(a => a.status === 'cancelada').length;
  const lastWeekClinicalHours = lastWeekActivities
    .filter(a => a.tipo === 'sessao' && a.status === 'realizada')
    .reduce((acc, a) => acc + differenceInMinutes(new Date(a.data_fim), new Date(a.data_inicio)) / 60, 0);

  const nextSession = todayActivities.find(a => {
    const d = new Date(a.data_inicio);
    return d > now && (a.status === 'confirmada' || a.status === 'pendente');
  });

  const nextFormacao = comunidade.find(a => a.tipo === 'canonico' && new Date(a.data_inicio) > now);

  const weekStats = {
    agendadas: weekActivities.filter(a => ['confirmada', 'pendente'].includes(a.status)).length,
    realizadas: weekActivities.filter(a => a.status === 'realizada').length,
    canceladas: weekActivities.filter(a => a.status === 'cancelada').length,
    ausencias: weekActivities.filter(a => a.status === 'ausencia').length,
  };

  const { profile } = useAuth();
  const templates = getTemplates();

  const [confirmAction, setConfirmAction] = useState<{ type: 'presenca' | 'ausencia'; activity: Atividade } | null>(null);

  const handlePresenca = (a: Atividade) => {
    setConfirmAction({ type: 'presenca', activity: a });
  };

  const executePresenca = (a: Atividade) => {
    const previousStatus = a.status;
    updateAtividade(a.id, { status: 'realizada', presenca_registrada: true });
    setNoteSessionId(a.id);
    setNoteContent("");
    setConfirmAction(null);
    refresh();
    toast("Presença registrada", {
      type: "success",
      action: {
        label: "Desfazer",
        onClick: () => {
          updateAtividade(a.id, { status: previousStatus, presenca_registrada: false });
          setNoteSessionId(null);
          refresh();
        },
      },
    });
  };

  const handleSaveNote = (a: Atividade) => {
    if (a.paciente && noteContent.trim()) {
      saveSessionNoteLib(a.paciente.id, a.id, a.data_inicio, noteContent.trim());
    }
    setNoteSessionId(null);
    setNoteContent("");
  };

  const handleSkipNote = () => {
    setNoteSessionId(null);
    setNoteContent("");
  };

  const handleConfirmarWhatsApp = (a: Atividade) => {
    if (!a.paciente?.telefone) return;
    const confirmTemplate = templates.find(t => t.tipo === 'confirmacao');
    if (!confirmTemplate) return;
    const vars = buildMessageVars(profile!, a.paciente, a);
    const msg = fillTemplate(confirmTemplate.conteudo, vars);
    const url = buildWhatsAppUrl(a.paciente.telefone, msg);
    updateAtividade(a.id, { status: 'confirmada' });
    window.open(url, "_blank");
    refresh();
    toast("Confirmação enviada via WhatsApp", {
      type: "success",
      action: {
        label: "Criar tarefa de preparação",
        onClick: () => {
          createForjaAtividade({
            titulo: `Preparar sessão: ${a.paciente?.nome || a.titulo}`,
            descricao: `Sessão em ${format(new Date(a.data_inicio), "dd/MM 'às' HH:mm")}`,
            data_limite: format(new Date(a.data_inicio), "yyyy-MM-dd"),
            prioridade: "media",
            projeto_id: null,
            pomodoros_estimados: 1,
          });
          toast("Tarefa de preparação criada no Forja", { type: "success" });
        },
      },
    });
  };

  // Countdown
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    if (!nextSession) return;
    const update = () => {
      const secs = differenceInSeconds(new Date(nextSession.data_inicio), new Date());
      if (secs <= 0) setCountdown("Agora");
      else if (secs < 60) setCountdown(`em ${secs}s`);
      else if (secs <= 300) { const m = Math.floor(secs / 60); setCountdown(`em ${m}min ${secs % 60}s`); }
      else { const mins = Math.floor(secs / 60); setCountdown(mins < 60 ? `em ${mins}min` : `em ${Math.floor(mins / 60)}h ${mins % 60}min`); }
    };
    update();
    const secsAway = differenceInSeconds(new Date(nextSession.data_inicio), new Date());
    const i = setInterval(update, secsAway <= 300 ? 1000 : 60000);
    return () => clearInterval(i);
  }, [nextSession]);

  useEffect(() => {
    if (!nextSession) return;
    const secsAway = differenceInSeconds(new Date(nextSession.data_inicio), new Date());
    if (secsAway > 300 && secsAway <= 360) {
      const timeout = setTimeout(refresh, (secsAway - 300) * 1000);
      return () => clearTimeout(timeout);
    }
  }, [nextSession]);

  return (
    <Shell>
      {/* Smart Alerts */}
      {(() => {
        const alertas = getAlertasCruzados();
        if (alertas.length === 0) return null;
        return (
          <motion.div {...staggerChild(0)} className="mb-6">
            <div className="space-y-2">
              {alertas.slice(0, 4).map(alerta => (
                <Link key={alerta.id} href={alerta.link || '#'}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-[var(--bg-hover)] ${
                    alerta.prioridade === 'alta' ? 'border-[var(--red-border)] bg-[var(--red-bg)]' :
                    alerta.prioridade === 'media' ? 'border-[var(--amber-border)] bg-[var(--amber-bg)]' :
                    'border-[var(--border-default)] bg-[var(--bg-card)]'
                  }`}
                >
                  <AlertTriangle size={16} className={
                    alerta.prioridade === 'alta' ? 'text-[var(--red-text)]' :
                    alerta.prioridade === 'media' ? 'text-[var(--amber-text)]' :
                    'text-[var(--text-tertiary)]'
                  } />
                  <div className="flex-1 min-w-0">
                    <p className={`font-dm text-sm font-semibold ${
                      alerta.prioridade === 'alta' ? 'text-[var(--red-text)]' :
                      alerta.prioridade === 'media' ? 'text-[var(--amber-text)]' :
                      'text-[var(--text-primary)]'
                    }`}>{alerta.titulo}</p>
                    <p className="font-dm text-xs text-[var(--text-secondary)] truncate">{alerta.mensagem}</p>
                  </div>
                  <ArrowRight size={14} className="text-[var(--text-tertiary)] flex-shrink-0" />
                </Link>
              ))}
            </div>
          </motion.div>
        );
      })()}

      {/* Weekly summary — collapsible */}
      {lastWeekActivities.length > 0 && (
        <motion.div {...staggerChild(0.5)} className="mb-6">
          <button
            onClick={() => setShowWeekSummary(!showWeekSummary)}
            className="w-full text-left p-4 rounded-2xl bg-[var(--bg-surface-orange)] border border-[var(--border-orange)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-center justify-between">
              <p className="font-dm text-xs font-semibold uppercase tracking-wider text-[var(--orange-500)]">Resumo da semana anterior</p>
              <ChevronDown size={16} className={`text-[var(--orange-500)] transition-transform ${showWeekSummary ? 'rotate-180' : ''}`} />
            </div>
            {!showWeekSummary && (
              <p className="font-dm text-sm text-[var(--text-primary)] mt-1">
                {lastWeekRealizadas} {lastWeekRealizadas === 1 ? 'sessão' : 'sessões'} · {lastWeekClinicalHours.toFixed(1).replace('.0', '')}h clínicas
                {lastWeekCanceladas > 0 && ` · ${lastWeekCanceladas} cancelamento${lastWeekCanceladas !== 1 ? 's' : ''}`}
              </p>
            )}
            {showWeekSummary && (
              <p className="font-dm text-sm text-[var(--text-primary)] leading-relaxed mt-2">
                Na semana passada você realizou <span className="font-semibold text-[var(--orange-500)]">{lastWeekRealizadas} {lastWeekRealizadas === 1 ? 'sessão' : 'sessões'}</span>
                {lastWeekCanceladas > 0 && (<>, teve <span className="font-semibold">{lastWeekCanceladas} cancelamento{lastWeekCanceladas !== 1 ? 's' : ''}</span></>)}
                {' '}e acumulou <span className="font-semibold text-[var(--orange-500)]">{lastWeekClinicalHours.toFixed(1).replace('.0', '')}h clínicas</span>.
                {lastWeekRealizadas >= 10 ? ' Excelente ritmo!' : lastWeekRealizadas >= 5 ? ' Bom trabalho!' : ' Cada sessão conta!'}
              </p>
            )}
          </button>
        </motion.div>
      )}

      {/* Hero: Next session */}
      {nextSession && (
        <motion.div {...staggerChild(1.5)}>
          <Card className="mb-6 border-l-4 border-l-[var(--orange-500)]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-dm text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider mb-1">Próxima sessão</p>
                <p className="font-fraunces font-bold text-xl text-[var(--text-primary)] truncate">
                  {nextSession.paciente?.nome || nextSession.titulo}
                </p>
                <p className="font-dm text-sm text-[var(--text-secondary)]">
                  {formatTimeRange(nextSession.data_inicio, nextSession.data_fim)}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  {nextSession.paciente && (
                    <Link href={`/pacientes/${nextSession.paciente.id}`}>
                      <Button variant="ghost" size="sm" icon={<FileText size={14} />}>Anotações</Button>
                    </Link>
                  )}
                  {nextSession.paciente?.telefone && (
                    <Button variant="ghost" size="sm" onClick={() => handleConfirmarWhatsApp(nextSession)} icon={<Send size={14} />}>WhatsApp</Button>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-fraunces font-bold text-2xl text-[var(--orange-500)]">{countdown}</p>
                <Badge {...STATUS_COLORS[nextSession.status]} />
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Mini-timeline of today */}
      <motion.div {...staggerChild(2.5)}>
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-fraunces font-bold text-lg text-[var(--text-primary)]">Hoje</h2>
            <Link href="/agenda" className="font-dm text-xs text-[var(--orange-500)] hover:underline flex items-center gap-1">
              Ver agenda <ArrowRight size={12} />
            </Link>
          </div>
          {todayActivities.length === 0 ? (
            <EmptyState message="Nenhuma sessão hoje" />
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[54px] top-2 bottom-2 w-px bg-[var(--bg-hover)]" />

              <div className="space-y-1">
                {todayActivities.map((a, i) => {
                  const isPast = new Date(a.data_fim) < now;
                  const isCurrent = new Date(a.data_inicio) <= now && new Date(a.data_fim) >= now;
                  return (
                    <div key={a.id}>
                      <div className={`flex items-center gap-3 py-2.5 px-2 rounded-xl transition-colors ${isCurrent ? 'bg-[var(--bg-surface-orange)]' : 'hover:bg-[var(--bg-hover)]'} ${isPast && a.status !== 'realizada' ? 'opacity-50' : ''}`}>
                        {/* Time */}
                        <div className="font-dm text-xs font-medium text-[var(--text-secondary)] w-[44px] flex-shrink-0 text-right">
                          {format(new Date(a.data_inicio), 'HH:mm')}
                        </div>
                        {/* Dot */}
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 z-10 ${
                          isCurrent ? 'bg-[var(--orange-500)] ring-4 ring-[rgba(200,75,49,0.2)]' :
                          a.status === 'realizada' ? 'bg-emerald-500' :
                          a.status === 'cancelada' ? 'bg-red-400' :
                          a.status === 'ausencia' ? 'bg-red-400' :
                          'bg-[var(--border-default)] dark:bg-[#555]'
                        }`} />
                        {/* Content */}
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          {a.paciente ? (
                            <Link
                              href={`/pacientes/${a.paciente.id}`}
                              className="font-dm text-sm text-[var(--text-primary)] truncate hover:text-[var(--orange-500)] hover:underline transition-colors"
                            >
                              {a.paciente.nome}
                            </Link>
                          ) : (
                            <span className="font-dm text-sm text-[var(--text-primary)] truncate">{a.titulo}</span>
                          )}
                          <Badge {...STATUS_COLORS[a.status]} size="sm" />
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {a.paciente?.telefone && ['pendente', 'confirmada'].includes(a.status) && (
                            <button onClick={() => handleConfirmarWhatsApp(a)} title="WhatsApp" aria-label="Enviar confirmação via WhatsApp" className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                              <Send size={14} />
                            </button>
                          )}
                          {a.status === 'confirmada' && (
                            <button onClick={() => handlePresenca(a)} title="Presença" aria-label="Registrar presença" className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Post-session note */}
                      {noteSessionId === a.id && (
                        <div className="ml-[68px] mb-2 p-3 rounded-xl bg-[var(--bg-hover)]/60 dark:bg-[var(--bg-hover)] border border-[var(--border-default)]">
                          <textarea
                            value={noteContent}
                            onChange={e => setNoteContent(e.target.value)}
                            placeholder="Nota rápida pós-sessão (opcional)"
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg font-dm text-sm bg-white dark:bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors placeholder:text-[var(--text-tertiary)] dark:placeholder:text-[#555] resize-y"
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <Button variant="ghost" size="sm" onClick={handleSkipNote}>Pular</Button>
                            <Button size="sm" onClick={() => handleSaveNote(a)}>Salvar</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Week stats (compact) + upcoming event (single line) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <motion.div {...staggerChild(3.5)}>
          <Card>
            <h2 className="font-fraunces font-bold text-[var(--text-primary)] mb-3">Esta semana</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Agendadas', value: weekStats.agendadas, color: '#C84B31' },
                { label: 'Realizadas', value: weekStats.realizadas, color: 'var(--green-text)' },
                { label: 'Canceladas', value: weekStats.canceladas, color: 'var(--red-text)' },
                { label: 'Ausências', value: weekStats.ausencias, color: 'var(--red-text)' },
              ].map(s => (
                <div key={s.label} className="text-center p-2 rounded-xl bg-[var(--bg-hover)]">
                  <p className="font-fraunces font-bold text-lg" style={{ color: s.color }}>{s.value}</p>
                  <p className="font-dm text-[10px] text-[var(--text-secondary)]">{s.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {nextFormacao && (
          <motion.div {...staggerChild(4.5)}>
            <Card>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <p className="font-dm text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Próxima formação</p>
              </div>
              <h3 className="font-fraunces font-bold text-[var(--text-primary)] mb-1">{nextFormacao.titulo}</h3>
              <p className="font-dm text-sm text-[var(--text-secondary)]">
                {format(new Date(nextFormacao.data_inicio), "dd MMM 'às' HH:mm", { locale: ptBR })}
              </p>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Foco de Hoje (Forja) */}
      {(() => {
        const tempoHoje = getTempoFocadoHoje();
        const pomodorosHoje = getPomodorosHoje();
        const metaMinutos = getMetaDiaria();
        const metaSegundos = metaMinutos * 60;
        const progresso = metaSegundos > 0 ? Math.min((tempoHoje / metaSegundos) * 100, 100) : 0;
        return (
          <motion.div {...staggerChild(5.5)}>
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flame size={18} className="text-[var(--orange-500)]" />
                  <h2 className="font-fraunces font-bold text-lg text-[var(--text-primary)]">Foco de Hoje</h2>
                </div>
                <Link href="/forja" className="font-dm text-xs text-[var(--orange-500)] hover:underline flex items-center gap-1">
                  Ver detalhes <ArrowRight size={12} />
                </Link>
              </div>
              <div className="flex items-center gap-6 mb-3">
                <div>
                  <p className="font-fraunces font-bold text-xl text-[var(--text-primary)]">{formatTempo(tempoHoje)}</p>
                  <p className="font-dm text-xs text-[var(--text-secondary)]">tempo focado</p>
                </div>
                <div>
                  <p className="font-fraunces font-bold text-xl text-[var(--text-primary)]">{pomodorosHoje}</p>
                  <p className="font-dm text-xs text-[var(--text-secondary)]">pomodoros</p>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-dm text-xs text-[var(--text-secondary)]">Meta diária: {metaMinutos}min</p>
                  <p className="font-dm text-xs font-semibold text-[var(--text-secondary)]">{Math.round(progresso)}%</p>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--bg-hover)]">
                  <div
                    className="h-2 rounded-full bg-[var(--orange-500)] transition-all"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
              </div>
              <Link href="/forja/foco" className="font-dm text-sm text-[var(--orange-500)] hover:underline flex items-center gap-1">
                Iniciar foco <ArrowRight size={14} />
              </Link>
            </Card>
          </motion.div>
        );
      })()}

      {/* Blog: latest posts */}
      <motion.div {...staggerChild(6.5)}>
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-[var(--orange-500)]" />
              <h2 className="font-fraunces font-bold text-lg text-[var(--text-primary)]">Últimos do Blog</h2>
            </div>
            <Link href="/blog" className="font-dm text-xs text-[var(--orange-500)] hover:underline flex items-center gap-1">
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {getBlogPosts({ status: 'publicado' }).slice(0, 3).map(post => (
              <div key={post.id} className="flex items-start justify-between gap-4 py-2 border-b border-[var(--border-default)] last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="font-fraunces font-semibold text-sm text-[var(--text-primary)] truncate">{post.titulo}</p>
                  <p className="font-dm text-xs text-[var(--text-secondary)] mt-0.5">
                    {post.autor_nome} · {format(new Date(post.updated_at), "dd MMM yyyy", { locale: ptBR })}
                  </p>
                </div>
                <Link href={`/blog/${post.id}`} className="font-dm text-xs text-[var(--orange-500)] hover:underline flex-shrink-0 mt-0.5">
                  Ler
                </Link>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Conteúdo Próximo (Usina) */}
      {(() => {
        const proximosConteudos = getConteudosProximos7Dias().slice(0, 3);
        if (proximosConteudos.length === 0) return null;
        return (
          <motion.div {...staggerChild(7.5)}>
            <Card className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-[var(--orange-500)]" />
                  <h2 className="font-fraunces font-bold text-lg text-[var(--text-primary)]">Conteúdo Próximo</h2>
                </div>
                <Link href="/conteudo/conteudos" className="font-dm text-xs text-[var(--orange-500)] hover:underline flex items-center gap-1">
                  Ver pipeline <ArrowRight size={12} />
                </Link>
              </div>
              <div className="space-y-3">
                {proximosConteudos.map(item => {
                  const cfg = USINA_STATUS_CONFIG[item.status];
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3 py-2 border-b border-[var(--border-default)] last:border-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-base flex-shrink-0">{item.emoji_marcador || '📝'}</span>
                        <div className="min-w-0">
                          <p className="font-fraunces font-semibold text-sm text-[var(--text-primary)] truncate">{item.titulo}</p>
                          <p className="font-dm text-xs text-[var(--text-secondary)]">
                            {item.data_planejada ? format(new Date(item.data_planejada + 'T12:00:00'), "dd MMM", { locale: ptBR }) : '—'}
                          </p>
                        </div>
                      </div>
                      <span
                        className="font-dm text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ color: cfg.cor, backgroundColor: cfg.bg }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        );
      })()}

      {/* Atualizações da equipe */}
      {(() => {
        const avisos = getAvisos().slice(0, 3);
        if (avisos.length === 0) return null;
        return (
          <motion.div {...staggerChild(8.5)} className="mb-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Megaphone size={18} className="text-[#2B9E8B]" />
                  <h2 className="font-fraunces font-bold text-lg text-[var(--text-primary)]">Atualizações da Equipe</h2>
                </div>
                <Link href="/comunicacao" className="font-dm text-xs text-[var(--orange-500)] hover:underline flex items-center gap-1">
                  Ver todos <ArrowRight size={12} />
                </Link>
              </div>
              <div className="space-y-3">
                {avisos.map(aviso => (
                  <div key={aviso.id} className="py-2.5 border-b border-[var(--border-subtle)] last:border-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-fraunces font-semibold text-sm text-[var(--text-primary)]">{aviso.titulo}</p>
                        {aviso.corpo && <p className="font-dm text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{aviso.corpo}</p>}
                      </div>
                      <span className="font-dm text-[10px] text-[var(--text-tertiary)] flex-shrink-0 mt-0.5">
                        {format(new Date(aviso.created_at), "dd MMM", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        );
      })()}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmAction(null)} />
          <div className="relative w-full max-w-[95vw] sm:max-w-[400px] mx-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] shadow-float card-base p-6">
            <h3 className="font-fraunces font-bold text-lg text-[var(--text-primary)] mb-2">
              {confirmAction.type === 'presenca' ? 'Registrar presença?' : 'Registrar ausência?'}
            </h3>
            <p className="font-dm text-sm text-[var(--text-secondary)] mb-6">
              Confirmar que {confirmAction.activity.paciente?.nome || confirmAction.activity.titulo} {confirmAction.type === 'presenca' ? 'compareceu' : 'não compareceu'} à sessão?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancelar</Button>
              <Button onClick={() => executePresenca(confirmAction.activity)}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
