"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Send, UserX, User, Pencil, Download, ChevronDown, Plus, X, MoreVertical, Trash2, CheckCircle, XCircle, Calendar } from "lucide-react";
import Link from "next/link";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import CanvasEditor from "@/components/anotacoes/CanvasEditor";
import { getPaciente, getAtividadesByPaciente, getAtividades, updatePaciente, getTemplates, updateAtividade, createAtividade, deleteAtividade } from "@/lib/data";
import ActivityDetailModal from "@/components/agenda/ActivityDetailModal";
import { useAuth } from "@/contexts/AuthContext";
import { fillTemplate, buildWhatsAppUrl, buildMessageVars } from "@/lib/whatsapp";
import { STATUS_PACIENTE_COLORS, STATUS_COLORS } from "@/lib/status-colors";
import { fadeUp, staggerChild } from "@/lib/animations";
import { format, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/contexts/ToastContext";
import type { Modalidade } from "@/types/database";

import {
  loadSessionNotes, saveSessionNote as saveSessionNoteLib,
  loadPreSessionNotes, savePreSessionNote as savePreNoteLib,
  loadGeneralNote, saveGeneralNote,
  type SessionNote,
} from "@/lib/notes";

type MainTab = "sessoes" | "caso" | "canvas" | "info";
type SessionMode = "texto" | "canvas";
type NoteTab = "pre" | "pos";

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const paciente = getPaciente(id);
  const { profile } = useAuth();
  const templates = getTemplates();

  const tabParam = searchParams.get('tab');
  const initialMainTab: MainTab = tabParam === 'info' ? 'info' : tabParam === 'caso' ? 'caso' : tabParam === 'canvas' ? 'canvas' : 'sessoes';
  const [mainTab, setMainTab] = useState<MainTab>(initialMainTab);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showEmergencyContact, setShowEmergencyContact] = useState(false);
  const [, forceUpdate] = useState(0);
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([]);
  const [preSessionNotes, setPreSessionNotes] = useState<SessionNote[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editingPreId, setEditingPreId] = useState<string | null>(null);
  const [editPreContent, setEditPreContent] = useState("");
  const [sessionModes, setSessionModes] = useState<Record<string, SessionMode>>({});
  const [noteTab, setNoteTab] = useState<Record<string, NoteTab>>({});
  const [generalNote, setGeneralNote] = useState('');
  const [generalSaved, setGeneralSaved] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: paciente?.nome || '',
    telefone: paciente?.telefone || '',
    email: paciente?.email || '',
    data_nascimento: paciente?.data_nascimento || '',
    modalidade: paciente?.modalidade || 'presencial',
    dia_fixo: paciente?.dia_fixo || '',
    horario_fixo: paciente?.horario_fixo || '',
    contato_emergencia_nome: paciente?.contato_emergencia_nome || '',
    contato_emergencia_telefone: paciente?.contato_emergencia_telefone || '',
    contato_emergencia_relacao: paciente?.contato_emergencia_relacao || '',
    observacoes: paciente?.observacoes || '',
  });
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSession, setNewSession] = useState(() => {
    const now = new Date();
    const hour = now.getHours();
    return {
      data: format(now, 'yyyy-MM-dd'),
      horaInicio: `${String(hour).padStart(2, '0')}:00`,
      horaFim: `${String(Math.floor((hour * 60 + 50) / 60)).padStart(2, '0')}:${String((hour * 60 + 50) % 60).padStart(2, '0')}`,
      status: 'pendente' as string,
      notas: '',
    };
  });
  const { toast } = useToast();

  // ─── Load async notes on mount ───
  const [generalNoteLoaded, setGeneralNoteLoaded] = useState(false);
  useEffect(() => {
    if (!paciente) return;
    let cancelled = false;
    (async () => {
      const [sNotes, pNotes, gNote] = await Promise.all([
        loadSessionNotes(paciente.id),
        loadPreSessionNotes(paciente.id),
        loadGeneralNote(paciente.id),
      ]);
      if (cancelled) return;
      setSessionNotes(sNotes);
      setPreSessionNotes(pNotes);
      setGeneralNote(gNote);
      setGeneralNoteLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [paciente?.id]);

  // ─── Dirty state tracking & beforeunload warning (#4) ───
  const [isDirty, setIsDirty] = useState(false);

  const savedGeneralNoteRef = useRef('');
  useEffect(() => {
    if (!paciente || !generalNoteLoaded) return;
    let cancelled = false;
    (async () => {
      const savedValue = await loadGeneralNote(paciente.id);
      if (cancelled) return;
      savedGeneralNoteRef.current = savedValue;
      setIsDirty(generalNote !== savedValue || editingId !== null);
    })();
    return () => { cancelled = true; };
  }, [generalNote, editingId, paciente, generalNoteLoaded]);

  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // ─── Autosave for general note (#5) ───
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGeneralNoteChange = useCallback((value: string) => {
    setGeneralNote(value);

    // Clear previous timer
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    // Set new debounce timer (2 seconds)
    autoSaveTimerRef.current = setTimeout(async () => {
      if (paciente) {
        setAutoSaveStatus('saving');
        await saveGeneralNote(paciente.id, value);
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      }
    }, 2000);
  }, [paciente]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  if (!paciente) {
    return <Shell><div className="text-center py-20"><p className="font-dm text-lg text-[var(--text-secondary)]">Paciente não encontrado</p><Link href="/pacientes" className="font-dm text-sm text-[var(--orange-500)] hover:underline mt-2 block">Voltar</Link></div></Shell>;
  }

  const sessions = getAtividadesByPaciente(paciente.id).filter(a => a.tipo === 'sessao').sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime());
  const statusColor = STATUS_PACIENTE_COLORS[paciente.status];
  const getNoteContent = (sid: string) => sessionNotes.find(n => n.sessionId === sid)?.content || '';
  const getPreNoteContent = (sid: string) => preSessionNotes.find(n => n.sessionId === sid)?.content || '';
  const saveSessionNote = async (sid: string, date: string, content: string) => { const updated = await saveSessionNoteLib(paciente.id, sid, date, content); setSessionNotes(updated); setEditingId(null); };
  const savePreNote = async (sid: string, date: string, content: string) => { const updated = await savePreNoteLib(paciente.id, sid, date, content); setPreSessionNotes(updated); setEditingPreId(null); };
  const handleSaveGeneral = async () => { await saveGeneralNote(paciente.id, generalNote); setGeneralSaved(true); setTimeout(() => setGeneralSaved(false), 2000); };
  const handleConfirmSession = (sessionId: string) => { if (!paciente.telefone) return; const session = sessions.find(s => s.id === sessionId); if (!session) return; const tmpl = templates.find(t => t.tipo === 'confirmacao'); if (!tmpl) { toast("Nenhum template de confirmação encontrado", { type: "error" }); return; } const vars = buildMessageVars(profile!, paciente, session); const msg = fillTemplate(tmpl.conteudo, vars); window.open(buildWhatsAppUrl(paciente.telefone, msg), "_blank"); toast("WhatsApp aberto para confirmação", { type: "success" }); };
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionMenuOpen, setSessionMenuOpen] = useState<string | null>(null);

  // Close session menu when clicking outside
  useEffect(() => {
    if (!sessionMenuOpen) return;
    const close = () => setSessionMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [sessionMenuOpen]);

  const handleSessionAction = (session: any, action: string) => {
    setSessionMenuOpen(null);
    if (action === 'detail') { setSelectedSession({ ...session, paciente }); setShowSessionModal(true); }
    else if (action === 'realizada') { updateAtividade(session.id, { status: 'realizada', presenca_registrada: true }); toast('Sessão marcada como realizada', { type: 'success' }); forceUpdate(n => n + 1); }
    else if (action === 'ausencia') { updateAtividade(session.id, { status: 'ausencia' }); toast('Ausência registrada', { type: 'warning' }); forceUpdate(n => n + 1); }
    else if (action === 'cancelada') { updateAtividade(session.id, { status: 'cancelada' }); toast('Sessão cancelada', { type: 'warning' }); forceUpdate(n => n + 1); }
    else if (action === 'delete') { deleteAtividade(session.id); toast('Sessão excluída', { type: 'warning' }); forceUpdate(n => n + 1); }
  };
  const [showInactiveConfirm, setShowInactiveConfirm] = useState(false);
  const toggleInactive = () => { updatePaciente(paciente.id, { status: paciente.status === 'ativo' ? 'inativo' : 'ativo' }); setShowInactiveConfirm(false); toast(paciente.status === 'ativo' ? 'Paciente inativado' : 'Paciente reativado', { type: 'success' }); forceUpdate(n => n + 1); };
  const handleCreateSession = () => {
    const startDt = new Date(`${newSession.data}T${newSession.horaInicio}:00`);
    const endDt = new Date(`${newSession.data}T${newSession.horaFim}:00`);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) { toast("Data ou horário inválido", { type: "error" }); return; }
    if (endDt <= startDt) { toast("Horário de fim deve ser depois do início", { type: "error" }); return; }
    // Check conflicts
    const allActs = getAtividades();
    const conflict = allActs.find((a: any) => {
      if (a.status === 'cancelada') return false;
      const aStart = new Date(a.data_inicio).getTime();
      const aEnd = new Date(a.data_fim).getTime();
      return startDt.getTime() < aEnd && endDt.getTime() > aStart;
    });
    if (conflict && !confirm(`Conflito com "${conflict.titulo}". Criar mesmo assim?`)) return;
    createAtividade({
      terapeuta_id: profile?.id || '',
      tipo: 'sessao',
      titulo: `Sessão com ${paciente.nome}`,
      data_inicio: `${newSession.data}T${newSession.horaInicio}:00`,
      data_fim: `${newSession.data}T${newSession.horaFim}:00`,
      status: newSession.status as any,
      recorrencia: 'nenhuma',
      paciente_id: paciente.id,
      nota_pos_sessao: newSession.notas || undefined,
    });
    setShowNewSession(false);
    const now = new Date();
    const hour = now.getHours();
    setNewSession({
      data: format(now, 'yyyy-MM-dd'),
      horaInicio: `${String(hour).padStart(2, '0')}:00`,
      horaFim: `${String(Math.floor((hour * 60 + 50) / 60)).padStart(2, '0')}:${String((hour * 60 + 50) % 60).padStart(2, '0')}`,
      status: 'pendente',
      notas: '',
    });
    toast('Sessão criada com sucesso', { type: 'success' });
    forceUpdate(n => n + 1);
  };
  const getMode = (sid: string): SessionMode => sessionModes[sid] || "texto";
  const age = paciente.data_nascimento ? differenceInYears(new Date(), new Date(paciente.data_nascimento)) : null;

  const handleStartEdit = () => {
    setEditForm({
      nome: paciente.nome,
      telefone: paciente.telefone || '',
      email: paciente.email || '',
      data_nascimento: paciente.data_nascimento || '',
      modalidade: paciente.modalidade,
      dia_fixo: paciente.dia_fixo || '',
      horario_fixo: paciente.horario_fixo || '',
      contato_emergencia_nome: paciente.contato_emergencia_nome || '',
      contato_emergencia_telefone: paciente.contato_emergencia_telefone || '',
      contato_emergencia_relacao: paciente.contato_emergencia_relacao || '',
      observacoes: paciente.observacoes || '',
    });
    setIsEditingInfo(true);
  };

  const handleSaveInfo = () => {
    updatePaciente(paciente.id, {
      nome: editForm.nome,
      telefone: editForm.telefone || undefined,
      email: editForm.email || undefined,
      data_nascimento: editForm.data_nascimento || undefined,
      modalidade: editForm.modalidade as 'presencial' | 'online' | 'hibrido',
      dia_fixo: editForm.dia_fixo || undefined,
      horario_fixo: editForm.horario_fixo || undefined,
      contato_emergencia_nome: editForm.contato_emergencia_nome || undefined,
      contato_emergencia_telefone: editForm.contato_emergencia_telefone || undefined,
      contato_emergencia_relacao: editForm.contato_emergencia_relacao || undefined,
      observacoes: editForm.observacoes || undefined,
    });
    setIsEditingInfo(false);
    toast("Dados atualizados", { type: "success" });
    forceUpdate(n => n + 1);
  };

  // ─── PDF Export (#32) ───
  const handleExportPDF = async () => {
    const generalNoteContent = await loadGeneralNote(paciente.id);
    const win = window.open('', '_blank');
    if (!win) { toast('Permita pop-ups para exportar PDF', { type: 'warning' }); return; }

    const sessionsHtml = sessions.length === 0
      ? '<p style="color:#888;font-style:italic">Nenhuma sessão registrada.</p>'
      : sessions.map((s, i) => {
          const note = getNoteContent(s.id);
          return `<div style="margin-bottom:16px;padding:12px;border:1px solid #ddd;border-radius:8px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <strong>Sessão ${sessions.length - i}</strong>
              <span style="color:#888">${format(new Date(s.data_inicio), 'dd/MM/yyyy')} · ${format(new Date(s.data_inicio), 'HH:mm')} – ${format(new Date(s.data_fim), 'HH:mm')}</span>
            </div>
            <div style="color:#888;font-size:12px;margin-bottom:4px">Status: ${s.status}</div>
            ${note ? `<p style="white-space:pre-wrap;margin:0">${note.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : '<p style="color:#aaa;font-style:italic">Sem anotação</p>'}
          </div>`;
        }).join('');

    win.document.write(`<!DOCTYPE html><html><head><title>Prontuário - ${paciente.nome}</title>
      <style>
        body { font-family: 'Segoe UI', system-ui, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; font-size: 14px; line-height: 1.6; }
        h1 { color: #C84B31; border-bottom: 2px solid #C84B31; padding-bottom: 8px; }
        h2 { color: #333; margin-top: 32px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .info-item label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-item p { margin: 0; font-weight: 500; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; color: #888; font-size: 12px; text-align: center; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <h1>Prontuário — ${paciente.nome}</h1>
      <h2>Dados do Paciente</h2>
      <div class="info-grid">
        <div class="info-item"><label>Nome</label><p>${paciente.nome}</p></div>
        ${age !== null ? `<div class="info-item"><label>Idade</label><p>${age} anos</p></div>` : ''}
        ${paciente.telefone ? `<div class="info-item"><label>Telefone</label><p>${paciente.telefone}</p></div>` : ''}
        ${paciente.email ? `<div class="info-item"><label>E-mail</label><p>${paciente.email}</p></div>` : ''}
        <div class="info-item"><label>Modalidade</label><p>${paciente.modalidade}</p></div>
        <div class="info-item"><label>Status</label><p>${paciente.status}</p></div>
        ${paciente.dia_fixo ? `<div class="info-item"><label>Dia fixo</label><p>${paciente.dia_fixo}</p></div>` : ''}
        ${paciente.horario_fixo ? `<div class="info-item"><label>Horário fixo</label><p>${paciente.horario_fixo}</p></div>` : ''}
      </div>
      ${paciente.contato_emergencia_nome ? `
        <h2>Contato de Emergência</h2>
        <div class="info-grid">
          <div class="info-item"><label>Nome</label><p>${paciente.contato_emergencia_nome}</p></div>
          ${paciente.contato_emergencia_telefone ? `<div class="info-item"><label>Telefone</label><p>${paciente.contato_emergencia_telefone}</p></div>` : ''}
          ${paciente.contato_emergencia_relacao ? `<div class="info-item"><label>Relação</label><p>${paciente.contato_emergencia_relacao}</p></div>` : ''}
        </div>` : ''}
      ${paciente.observacoes ? `<h2>Observações</h2><p style="white-space:pre-wrap">${paciente.observacoes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : ''}
      <h2>Histórico de Sessões</h2>
      ${sessionsHtml}
      ${generalNoteContent ? `<h2>Anotação Geral do Caso</h2><p style="white-space:pre-wrap">${generalNoteContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : ''}
      <div class="footer">Exportado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} · Allos</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  const handleExport = async () => {
    const lines: string[] = [];
    lines.push('='.repeat(60));
    lines.push(`PRONTUARIO - ${paciente.nome}`);
    lines.push('='.repeat(60));
    lines.push('');
    lines.push('DADOS DO PACIENTE');
    lines.push('-'.repeat(40));
    lines.push(`Nome: ${paciente.nome}`);
    if (age !== null) lines.push(`Idade: ${age} anos`);
    if (paciente.telefone) lines.push(`Telefone: ${paciente.telefone}`);
    if (paciente.email) lines.push(`E-mail: ${paciente.email}`);
    if (paciente.data_nascimento) lines.push(`Data de nascimento: ${paciente.data_nascimento}`);
    if (paciente.data_inicio_atendimento) lines.push(`Inicio do atendimento: ${paciente.data_inicio_atendimento}`);
    lines.push(`Modalidade: ${paciente.modalidade}`);
    if (paciente.dia_fixo) lines.push(`Dia fixo: ${paciente.dia_fixo}`);
    if (paciente.horario_fixo) lines.push(`Horario fixo: ${paciente.horario_fixo}`);
    lines.push(`Status: ${paciente.status}`);
    if (paciente.contato_emergencia_nome) {
      lines.push('');
      lines.push('CONTATO DE EMERGENCIA');
      lines.push('-'.repeat(40));
      lines.push(`Nome: ${paciente.contato_emergencia_nome}`);
      if (paciente.contato_emergencia_telefone) lines.push(`Telefone: ${paciente.contato_emergencia_telefone}`);
      if (paciente.contato_emergencia_relacao) lines.push(`Relacao: ${paciente.contato_emergencia_relacao}`);
    }
    if (paciente.observacoes) {
      lines.push('');
      lines.push('OBSERVACOES');
      lines.push('-'.repeat(40));
      lines.push(paciente.observacoes);
    }
    lines.push('');
    lines.push('HISTORICO DE SESSOES');
    lines.push('-'.repeat(40));
    if (sessions.length === 0) {
      lines.push('Nenhuma sessao registrada.');
    } else {
      sessions.forEach((s, i) => {
        const note = getNoteContent(s.id);
        lines.push(`\nSessao ${sessions.length - i}`);
        lines.push(`Data: ${format(new Date(s.data_inicio), 'dd/MM/yyyy')} - ${format(new Date(s.data_inicio), 'HH:mm')} ate ${format(new Date(s.data_fim), 'HH:mm')}`);
        lines.push(`Status: ${s.status}`);
        if (note) {
          lines.push(`Anotacao:`);
          lines.push(note);
        }
      });
    }
    const generalNoteContent = await loadGeneralNote(paciente.id);
    if (generalNoteContent) {
      lines.push('');
      lines.push('ANOTACAO GERAL DO CASO');
      lines.push('-'.repeat(40));
      lines.push(generalNoteContent);
    }
    lines.push('');
    lines.push('='.repeat(60));
    lines.push(`Exportado em: ${format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}`);

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = paciente.nome.replace(/\s+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    a.href = url;
    a.download = `prontuario_${safeName}_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("Prontuario exportado", { type: "success" });
  };

  return (
    <Shell>
      <motion.div {...fadeUp()}>
        <button onClick={() => router.push('/pacientes')} className="flex items-center gap-1.5 font-dm text-sm text-[var(--text-secondary)] hover:text-[var(--orange-500)] transition-colors mb-4"><ArrowLeft size={16} /> Voltar</button>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--orange-500)] flex items-center justify-center"><span className="font-fraunces font-bold text-white text-lg">{paciente.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}</span></div>
            <div>
              <div className="flex items-center gap-2"><h1 className="font-fraunces font-bold text-xl text-[var(--text-primary)]">{paciente.nome}{age !== null && <span className="font-dm text-sm font-normal text-[var(--text-secondary)]">, {age} anos</span>}</h1><Badge {...statusColor} /></div>
              <p className="font-dm text-sm text-[var(--text-secondary)]">{paciente.modalidade}{paciente.dia_fixo && paciente.horario_fixo ? ` · ${paciente.dia_fixo} às ${paciente.horario_fixo}` : ''}</p>
              <div className="flex items-center gap-3 mt-1 font-dm text-xs text-[var(--text-tertiary)]">
                <span>{sessions.length} {sessions.length === 1 ? 'sessão' : 'sessões'}</span>
                {sessions.length > 0 && <span>Última: {format(new Date(sessions[0].data_inicio), 'dd/MM')}</span>}
                {(() => { const next = sessions.find(s => new Date(s.data_inicio) > new Date() && ['confirmada', 'pendente'].includes(s.status)); return next ? <span className="text-[var(--orange-500)]">Próxima: {format(new Date(next.data_inicio), 'dd/MM')}</span> : null; })()}
                {sessions.length >= 5 && <span className="flex items-center gap-0.5">{sessions.slice(0, 5).map((s, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full inline-block ${s.status === 'realizada' ? 'bg-emerald-400' : s.status === 'ausencia' ? 'bg-red-400' : 'bg-gray-300 dark:bg-gray-600'}`} />)}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowExportModal(true)} icon={<Download size={14} />}>Exportar</Button>
            <Button variant="ghost" size="sm" onClick={() => paciente.status === 'ativo' ? setShowInactiveConfirm(true) : toggleInactive()} icon={paciente.status === 'ativo' ? <UserX size={14} /> : <User size={14} />}>{paciente.status === 'ativo' ? 'Inativar' : 'Reativar'}</Button>
          </div>
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="mb-6">
        <Tabs tabs={[{ id: "sessoes", label: "Sessões" }, { id: "caso", label: "Caso geral" }, { id: "canvas", label: "Canvas" }, { id: "info", label: "Informações" }]} active={mainTab} onChange={id => setMainTab(id as MainTab)} layoutId="patient-main" />
      </motion.div>

      {/* ══ SESSÕES ══ */}
      {mainTab === "sessoes" && (<motion.div {...fadeUp(0.15)}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-fraunces font-bold text-lg text-[var(--text-primary)]">Sessões</h2>
            <Button size="sm" onClick={() => setShowNewSession(!showNewSession)} icon={showNewSession ? <X size={14} /> : <Plus size={14} />}>{showNewSession ? 'Cancelar' : 'Nova Sessão'}</Button>
          </div>

          {showNewSession && (
            <Card className="mb-4">
              <h3 className="font-fraunces font-bold text-[var(--text-primary)] mb-4">Nova Sessão</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block font-dm text-xs font-medium text-[var(--text-secondary)] mb-1">Data</label>
                  <input type="date" value={newSession.data} onChange={e => setNewSession(s => ({ ...s, data: e.target.value }))} className="w-full px-3 py-2 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors" />
                </div>
                <div>
                  <label className="block font-dm text-xs font-medium text-[var(--text-secondary)] mb-1">Horário início</label>
                  <input type="time" value={newSession.horaInicio} onChange={e => setNewSession(s => ({ ...s, horaInicio: e.target.value }))} className="w-full px-3 py-2 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors" />
                </div>
                <div>
                  <label className="block font-dm text-xs font-medium text-[var(--text-secondary)] mb-1">Horário fim</label>
                  <input type="time" value={newSession.horaFim} onChange={e => setNewSession(s => ({ ...s, horaFim: e.target.value }))} className="w-full px-3 py-2 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors" />
                </div>
              </div>
              <div className="mb-3">
                <label className="block font-dm text-xs font-medium text-[var(--text-secondary)] mb-1">Status</label>
                <select value={newSession.status} onChange={e => setNewSession(s => ({ ...s, status: e.target.value }))} className="w-full px-3 py-2 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors">
                  <option value="pendente">Pendente</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="realizada">Realizada</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="ausencia">Ausência</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="block font-dm text-xs font-medium text-[var(--text-secondary)] mb-1">Notas (opcional)</label>
                <textarea value={newSession.notas} onChange={e => setNewSession(s => ({ ...s, notas: e.target.value }))} placeholder="Observações sobre a sessão..." rows={3} className="w-full px-3 py-2 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors placeholder:text-[var(--text-tertiary)] resize-y" />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleCreateSession}>Criar Sessão</Button>
              </div>
            </Card>
          )}

          {sessions.length === 0 && !showNewSession ? <EmptyState message="Nenhuma sessão registrada" /> : sessions.length > 0 ? (
            <div className="space-y-4">{sessions.map((s, i) => {
              const note = getNoteContent(s.id); const isEditing = editingId === s.id; const mode = getMode(s.id);
              const canvasKey = `allos-canvas-session-${paciente.id}-${s.id}`; const sColor = STATUS_COLORS[s.status];
              const isFuture = new Date(s.data_inicio) > new Date();
              return (<motion.div key={s.id} {...staggerChild(i)} style={sessionMenuOpen === s.id ? { zIndex: 100, position: 'relative' } : undefined}><Card className="!overflow-visible">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2"><p className="font-dm text-sm font-semibold text-[var(--text-primary)]">{format(new Date(s.data_inicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p><Badge {...sColor} /></div>
                    <p className="font-dm text-xs text-[var(--text-secondary)]">{format(new Date(s.data_inicio), 'HH:mm')} – {format(new Date(s.data_fim), 'HH:mm')}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isFuture && paciente.telefone && ['pendente', 'confirmada'].includes(s.status) && (
                      <button onClick={() => handleConfirmSession(s.id)} title="Enviar confirmação via WhatsApp" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--orange-500)] hover:bg-[var(--orange-glow)] transition-colors"><Send size={15} /></button>
                    )}
                    <div className="flex gap-0.5 p-0.5 rounded-lg bg-[var(--bg-hover)]">
                      <button onClick={() => setSessionModes(m => ({ ...m, [s.id]: "texto" }))} className={`px-2.5 py-1 rounded-md font-dm text-[11px] font-medium transition-colors ${mode === "texto" ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)]"}`}>Texto</button>
                      <button onClick={() => setSessionModes(m => ({ ...m, [s.id]: "canvas" }))} className={`px-2.5 py-1 rounded-md font-dm text-[11px] font-medium transition-colors ${mode === "canvas" ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)]"}`}>Canvas</button>
                    </div>
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setSessionMenuOpen(sessionMenuOpen === s.id ? null : s.id); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] transition-colors"><MoreVertical size={15} /></button>
                      {sessionMenuOpen === s.id && (
                        <div className="absolute right-0 top-9 z-[200] w-48 py-1 rounded-xl bg-[var(--bg-card-elevated)] border border-[var(--border-default)] shadow-xl">
                          <button onClick={() => handleSessionAction(s, 'detail')} className="w-full text-left px-3 py-2 font-dm text-xs text-[var(--text-primary)] hover:bg-[var(--bg-hover)] flex items-center gap-2"><Calendar size={13} /> Editar / Reagendar</button>
                          {s.status !== 'realizada' && <button onClick={() => handleSessionAction(s, 'realizada')} className="w-full text-left px-3 py-2 font-dm text-xs text-green-600 hover:bg-[var(--bg-hover)] flex items-center gap-2"><CheckCircle size={13} /> Marcar realizada</button>}
                          {s.status !== 'ausencia' && <button onClick={() => handleSessionAction(s, 'ausencia')} className="w-full text-left px-3 py-2 font-dm text-xs text-amber-600 hover:bg-[var(--bg-hover)] flex items-center gap-2"><XCircle size={13} /> Marcar ausência</button>}
                          {s.status !== 'cancelada' && <button onClick={() => handleSessionAction(s, 'cancelada')} className="w-full text-left px-3 py-2 font-dm text-xs text-red-500 hover:bg-[var(--bg-hover)] flex items-center gap-2"><X size={13} /> Cancelar sessão</button>}
                          <div className="border-t border-[var(--border-subtle)] my-1" />
                          <button onClick={() => handleSessionAction(s, 'delete')} className="w-full text-left px-3 py-2 font-dm text-xs text-red-500 hover:bg-[var(--bg-hover)] flex items-center gap-2"><Trash2 size={13} /> Excluir</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {mode === "texto" ? (() => {
                  const preNote = getPreNoteContent(s.id);
                  const currentNoteTab = noteTab[s.id] || "pre";
                  const isEditingPre = editingPreId === s.id;
                  return (
                    <div className="space-y-2">
                      {/* Tab: Pré / Pós sessão */}
                      <div className="flex gap-0.5 p-0.5 rounded-lg bg-[var(--bg-hover)] w-fit">
                        <button onClick={() => setNoteTab(t => ({ ...t, [s.id]: "pre" }))} className={`px-3 py-1 rounded-md font-dm text-[11px] font-medium transition-colors ${currentNoteTab === "pre" ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)]"}`}>Pré-sessão</button>
                        <button onClick={() => setNoteTab(t => ({ ...t, [s.id]: "pos" }))} className={`px-3 py-1 rounded-md font-dm text-[11px] font-medium transition-colors ${currentNoteTab === "pos" ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)]"}`}>Pós-sessão</button>
                      </div>

                      {currentNoteTab === "pre" ? (
                        isEditingPre ? (
                          <div className="space-y-2">
                            <textarea value={editPreContent} onChange={e => setEditPreContent(e.target.value)} placeholder="Planejamento, temas a abordar, objetivos..." rows={4} className="w-full px-3.5 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors placeholder:text-[var(--text-tertiary)] resize-y" />
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setEditingPreId(null)}>Cancelar</Button>
                              <Button size="sm" onClick={() => savePreNote(s.id, s.data_inicio, editPreContent)}>Salvar</Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {preNote ? <p className="font-dm text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{preNote}</p> : <p className="font-dm text-xs text-[var(--text-tertiary)] italic">Sem anotação pré-sessão</p>}
                            <div className="mt-2"><Button variant="ghost" size="sm" onClick={() => { setEditingPreId(s.id); setEditPreContent(preNote); }}>{preNote ? 'Editar' : 'Anotar'}</Button></div>
                          </div>
                        )
                      ) : (
                        isEditing ? (
                          <div className="space-y-2">
                            <textarea value={editContent} onChange={e => setEditContent(e.target.value)} placeholder="Registro pós-sessão, observações clínicas..." rows={4} className="w-full px-3.5 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors placeholder:text-[var(--text-tertiary)] resize-y" />
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
                              <Button size="sm" onClick={() => saveSessionNote(s.id, s.data_inicio, editContent)}>Salvar</Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {note ? <p className="font-dm text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{note}</p> : <p className="font-dm text-xs text-[var(--text-tertiary)] italic">Sem anotação pós-sessão</p>}
                            <div className="mt-2"><Button variant="ghost" size="sm" onClick={() => { setEditingId(s.id); setEditContent(note); }}>{note ? 'Editar' : 'Anotar'}</Button></div>
                          </div>
                        )
                      )}
                    </div>
                  );
                })() : <div className="mt-1"><CanvasEditor pacienteId={paciente.id} storageKey={canvasKey} /></div>}
              </Card></motion.div>);
            })}</div>
          ) : null}
        </motion.div>)}

      {/* ══ CASO GERAL ══ */}
      {mainTab === "caso" && (<motion.div {...fadeUp(0.15)}><Card>
          <div className="flex items-center justify-between mb-3">
            <p className="font-dm text-sm font-semibold text-[var(--text-primary)]">Anotação geral do caso</p>
            <div className="flex items-center gap-2">
              {autoSaveStatus === 'saving' && <span className="font-dm text-xs text-amber-500">Salvando...</span>}
              {autoSaveStatus === 'saved' && <span className="font-dm text-xs text-emerald-500">Salvo automaticamente</span>}
              {generalSaved && <span className="font-dm text-xs text-emerald-500">Salvo</span>}
            </div>
          </div>
          <textarea value={generalNote} onChange={e => handleGeneralNoteChange(e.target.value)} placeholder="Hipóteses, observações longitudinais, plano terapêutico, formulação de caso..." rows={14} className="w-full px-4 py-3 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors placeholder:text-[var(--text-tertiary)] resize-y leading-relaxed" />
          <div className="flex justify-end mt-3"><Button onClick={handleSaveGeneral}>Salvar</Button></div>
        </Card></motion.div>)}

      {/* ══ CANVAS ══ */}
      {mainTab === "canvas" && (<motion.div {...fadeUp(0.15)}><CanvasEditor pacienteId={paciente.id} /></motion.div>)}

      {/* ══ INFORMAÇÕES ══ */}
      {mainTab === "info" && (<motion.div {...fadeUp(0.15)}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-fraunces font-bold text-lg text-[var(--text-primary)]">Informações</h2>
          {!isEditingInfo && <Button variant="ghost" size="sm" onClick={handleStartEdit} icon={<Pencil size={14} />}>Editar</Button>}
        </div>
        {isEditingInfo ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card><h3 className="font-fraunces font-bold text-[var(--text-primary)] mb-4">Dados pessoais</h3>
              <div className="space-y-3">
                <Input label="Nome" value={editForm.nome} onChange={v => setEditForm(f => ({ ...f, nome: v }))} />
                <Input label="Telefone" value={editForm.telefone} onChange={v => setEditForm(f => ({ ...f, telefone: v }))} />
                <Input label="E-mail" type="email" value={editForm.email} onChange={v => setEditForm(f => ({ ...f, email: v }))} />
                <Input label="Data de nascimento" type="date" value={editForm.data_nascimento} onChange={v => setEditForm(f => ({ ...f, data_nascimento: v }))} />
                <div>
                  <label className="block font-dm text-sm font-medium text-[var(--text-primary)] mb-1.5">Modalidade</label>
                  <select value={editForm.modalidade} onChange={e => setEditForm(f => ({ ...f, modalidade: e.target.value as Modalidade }))} className="w-full px-3.5 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors">
                    <option value="presencial">Presencial</option>
                    <option value="online">Online</option>
                    <option value="hibrido">Hibrido</option>
                  </select>
                </div>
                <Input label="Dia fixo" value={editForm.dia_fixo} onChange={v => setEditForm(f => ({ ...f, dia_fixo: v }))} />
                <Input label="Horario fixo" type="time" value={editForm.horario_fixo} onChange={v => setEditForm(f => ({ ...f, horario_fixo: v }))} />
              </div>
            </Card>
            <Card><h3 className="font-fraunces font-bold text-[var(--text-primary)] mb-4">Contato de emergencia</h3>
              <div className="space-y-3">
                <Input label="Nome" value={editForm.contato_emergencia_nome} onChange={v => setEditForm(f => ({ ...f, contato_emergencia_nome: v }))} />
                <Input label="Telefone" value={editForm.contato_emergencia_telefone} onChange={v => setEditForm(f => ({ ...f, contato_emergencia_telefone: v }))} />
                <Input label="Relacao" value={editForm.contato_emergencia_relacao} onChange={v => setEditForm(f => ({ ...f, contato_emergencia_relacao: v }))} />
              </div>
            </Card>
            <Card className="lg:col-span-2">
              <h3 className="font-fraunces font-bold text-[var(--text-primary)] mb-2">Observações</h3>
              <textarea value={editForm.observacoes} onChange={e => setEditForm(f => ({ ...f, observacoes: e.target.value }))} rows={4} className="w-full px-3.5 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors placeholder:text-[var(--text-tertiary)] resize-y" />
            </Card>
            <div className="lg:col-span-2 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsEditingInfo(false)}>Cancelar</Button>
              <Button onClick={handleSaveInfo}>Salvar</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card><h3 className="font-fraunces font-bold text-[var(--text-primary)] mb-4">Dados pessoais</h3>
              <div className="space-y-3">
                {[{ label: 'Nome', value: paciente.nome }, { label: 'Telefone', value: paciente.telefone }, { label: 'E-mail', value: paciente.email }, { label: 'Data de nascimento', value: paciente.data_nascimento }, { label: 'Inicio', value: paciente.data_inicio_atendimento }, { label: 'Modalidade', value: paciente.modalidade }, { label: 'Dia fixo', value: paciente.dia_fixo }, { label: 'Horario fixo', value: paciente.horario_fixo }].map(item => item.value ? <div key={item.label}><p className="font-dm text-xs text-[var(--text-secondary)]">{item.label}</p><p className={`font-dm text-sm text-[var(--text-primary)]${item.label !== 'E-mail' ? ' capitalize' : ''}`}>{item.value}</p></div> : null)}
              </div>
            </Card>
            <Card>
              <button onClick={() => setShowEmergencyContact(!showEmergencyContact)} className="w-full flex items-center justify-between">
                <h3 className="font-fraunces font-bold text-[var(--text-primary)]">Contato de emergência</h3>
                <ChevronDown size={16} className={`text-[var(--text-secondary)] transition-transform ${showEmergencyContact ? 'rotate-180' : ''}`} />
              </button>
              {showEmergencyContact && (
                <div className="mt-4">
                  {paciente.contato_emergencia_nome ? (<div className="space-y-3">
                    <div><p className="font-dm text-xs text-[var(--text-secondary)]">Nome</p><p className="font-dm text-sm text-[var(--text-primary)]">{paciente.contato_emergencia_nome}</p></div>
                    <div><p className="font-dm text-xs text-[var(--text-secondary)]">Telefone</p><p className="font-dm text-sm text-[var(--text-primary)]">{paciente.contato_emergencia_telefone}</p></div>
                    {paciente.contato_emergencia_relacao && <div><p className="font-dm text-xs text-[var(--text-secondary)]">Relação</p><p className="font-dm text-sm text-[var(--text-primary)]">{paciente.contato_emergencia_relacao}</p></div>}
                  </div>) : <p className="font-dm text-sm text-[var(--text-tertiary)] italic">Não informado</p>}
                </div>
              )}
            </Card>
            {paciente.observacoes && <Card className="lg:col-span-2"><h3 className="font-fraunces font-bold text-[var(--text-primary)] mb-2">Observações</h3><p className="font-dm text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{paciente.observacoes}</p></Card>}
          </div>
        )}
      </motion.div>)}

      {/* Confirmation dialog for inactivation (#2) */}
      {showInactiveConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowInactiveConfirm(false)} />
          <div className="relative w-full max-w-[95vw] sm:max-w-[400px] mx-4 card-base modal-glass p-6">
            <h3 className="font-fraunces font-bold text-lg text-[var(--text-primary)] mb-2">Inativar paciente?</h3>
            <p className="font-dm text-sm text-[var(--text-secondary)] mb-6">
              Tem certeza que deseja inativar <strong>{paciente.nome}</strong>? O paciente poderá ser reativado depois.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowInactiveConfirm(false)}>Cancelar</Button>
              <button onClick={toggleInactive} className="px-4 py-2 rounded-xl bg-red-500 text-white font-dm text-sm font-medium hover:bg-red-600 transition-colors">
                Sim, inativar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowExportModal(false)} />
          <div className="relative w-full max-w-[320px] mx-4 card-base modal-glass p-6">
            <h3 className="font-fraunces font-bold text-lg text-[var(--text-primary)] mb-4">Exportar prontuário</h3>
            <div className="space-y-2">
              <button onClick={() => { handleExportPDF(); setShowExportModal(false); }}
                className="w-full px-4 py-3 rounded-xl bg-[var(--orange-500)] text-white font-dm text-sm font-medium hover:opacity-90 transition-colors">
                Exportar PDF
              </button>
              <button onClick={() => { handleExport(); setShowExportModal(false); }}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-hover)] text-[var(--text-primary)] font-dm text-sm font-medium hover:bg-[var(--border-default)] transition-colors">
                Exportar TXT
              </button>
            </div>
            <button onClick={() => setShowExportModal(false)} className="w-full text-center mt-3 font-dm text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Session detail/edit modal */}
      <ActivityDetailModal
        isOpen={showSessionModal}
        onClose={() => { setShowSessionModal(false); setSelectedSession(null); }}
        activity={selectedSession}
        onUpdated={() => forceUpdate(n => n + 1)}
      />
    </Shell>
  );
}
