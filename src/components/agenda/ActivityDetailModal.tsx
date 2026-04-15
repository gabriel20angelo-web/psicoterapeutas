"use client";

import { useState, useMemo } from "react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle, Calendar, Ban, Send, Clock, User, Tag, Trash2, FileText, Copy, Pencil,
} from "lucide-react";
import Link from "next/link";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Badge from "@/components/ui/Badge";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import type { Atividade } from "@/types/database";
import { updateAtividade, deleteAtividade, getTemplates, createAtividade } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { fillTemplate, buildWhatsAppUrl, buildMessageVars } from "@/lib/whatsapp";
import { formatTimeRange, displayAtividadeTitulo } from "@/lib/calendar-utils";
import { TIPO_COLORS, STATUS_COLORS } from "@/lib/status-colors";
import { useToast } from "@/contexts/ToastContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activity: Atividade | null;
  onUpdated: () => void;
}

type ActionMode = null | "editar" | "reagendar" | "cancelar" | "ausencia" | "whatsapp_confirm";

export default function ActivityDetailModal({ isOpen, onClose, activity, onUpdated }: Props) {
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [editDate, setEditDate] = useState("");
  const [editTimeStart, setEditTimeStart] = useState("");
  const [editTimeEnd, setEditTimeEnd] = useState("");
  const [editTitulo, setEditTitulo] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [observacao, setObservacao] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const templates = useMemo(() => getTemplates(), []);
  const { profile } = useAuth();

  if (!activity) return null;

  const tipoColors = TIPO_COLORS[activity.tipo];
  const statusColors = STATUS_COLORS[activity.status];
  const isPast = ["realizada", "ausencia", "cancelada"].includes(activity.status);
  const hasPaciente = !!activity.paciente;

  function resetAndClose() {
    setActionMode(null);
    setObservacao("");
    setShowDeleteConfirm(false);
    onClose();
  }

  function openEditMode() {
    if (!activity) return;
    setEditDate(format(new Date(activity.data_inicio), "yyyy-MM-dd"));
    setEditTimeStart(format(new Date(activity.data_inicio), "HH:mm"));
    setEditTimeEnd(format(new Date(activity.data_fim), "HH:mm"));
    setEditTitulo(activity.titulo);
    setEditDescricao(activity.descricao || "");
    setEditStatus(activity.status);
    setActionMode("editar");
  }

  function openReagendarMode() {
    if (!activity) return;
    setEditDate(format(new Date(activity.data_inicio), "yyyy-MM-dd"));
    setEditTimeStart(format(new Date(activity.data_inicio), "HH:mm"));
    setEditTimeEnd(format(new Date(activity.data_fim), "HH:mm"));
    setObservacao("");
    setActionMode("reagendar");
  }

  function handleSaveEdit() {
    if (!activity || !editDate) return;
    const startDt = new Date(`${editDate}T${editTimeStart}:00`);
    const endDt = new Date(`${editDate}T${editTimeEnd}:00`);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) { toast("Data ou horário inválido", { type: "error" }); return; }
    if (endDt <= startDt) { toast("Horário de fim deve ser depois do início", { type: "error" }); return; }
    updateAtividade(activity.id, {
      titulo: editTitulo,
      descricao: editDescricao || undefined,
      status: editStatus as Atividade['status'],
      data_inicio: startDt.toISOString(),
      data_fim: endDt.toISOString(),
    });
    toast("Atividade atualizada", { type: "success" });
    onUpdated();
    resetAndClose();
  }

  function handleReagendar() {
    if (!activity || !editDate) return;
    const startDt = new Date(`${editDate}T${editTimeStart}:00`);
    const endDt = new Date(`${editDate}T${editTimeEnd}:00`);
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) { toast("Data ou horário inválido", { type: "error" }); return; }
    if (endDt <= startDt) { toast("Horário de fim deve ser depois do início", { type: "error" }); return; }
    updateAtividade(activity.id, {
      status: "reagendada",
      data_inicio: startDt.toISOString(),
      data_fim: endDt.toISOString(),
      descricao: observacao ? `${activity.descricao ? activity.descricao + '\n' : ''}[Reagendamento] ${observacao}` : activity.descricao,
    });
    toast("Sessão reagendada", { type: "success" });
    onUpdated();
    resetAndClose();
  }

  function handleCancelar() {
    if (!activity) return;
    updateAtividade(activity.id, {
      status: "cancelada",
      motivo_cancelamento: observacao || undefined,
    });
    toast("Atividade cancelada", { type: "warning" });
    onUpdated();
    resetAndClose();
  }

  function handleAusencia() {
    if (!activity) return;
    updateAtividade(activity.id, {
      status: "ausencia",
      descricao: observacao ? `${activity.descricao ? activity.descricao + '\n' : ''}[Ausência] ${observacao}` : activity.descricao,
    });
    toast("Ausência registrada", { type: "warning" });
    onUpdated();
    resetAndClose();
  }

  function handlePresenca() {
    if (!activity) return;
    updateAtividade(activity.id, { status: "realizada", presenca_registrada: true });
    toast("Presença registrada", { type: "success" });
    onUpdated();
    resetAndClose();
  }

  function handleConfirmar() {
    if (!activity) return;
    updateAtividade(activity.id, { status: "confirmada" });
    toast("Sessão confirmada", { type: "success" });
    onUpdated();
  }

  function handleWhatsApp() {
    if (!activity?.paciente?.telefone) return;
    const confirmTemplate = templates.find(t => t.tipo === 'confirmacao');
    if (!confirmTemplate) { toast("Nenhum template encontrado", { type: "error" }); return; }
    setActionMode("whatsapp_confirm");
  }

  function handleWhatsAppConfirmed() {
    if (!activity?.paciente?.telefone) return;
    const confirmTemplate = templates.find(t => t.tipo === 'confirmacao');
    if (!confirmTemplate) return;
    const vars = buildMessageVars(profile!, activity.paciente, activity);
    const msg = fillTemplate(confirmTemplate.conteudo, vars);
    window.open(buildWhatsAppUrl(activity.paciente.telefone, msg), "_blank");
    setActionMode(null);
  }

  function handleDelete() {
    if (!activity) return;
    deleteAtividade(activity.id);
    toast("Atividade excluída", { type: "warning" });
    onUpdated();
    resetAndClose();
  }

  function handleDuplicate() {
    if (!activity) return;
    const newStart = addDays(new Date(activity.data_inicio), 7);
    const newEnd = addDays(new Date(activity.data_fim), 7);
    createAtividade({
      terapeuta_id: activity.terapeuta_id,
      paciente_id: activity.paciente_id || undefined,
      tipo: activity.tipo,
      titulo: activity.titulo,
      descricao: activity.descricao || undefined,
      data_inicio: newStart.toISOString(),
      data_fim: newEnd.toISOString(),
      status: "pendente",
      recorrencia: activity.recorrencia,
    });
    toast(`Duplicada para ${format(newStart, "dd/MM/yyyy")}`, { type: "success" });
    onUpdated();
    resetAndClose();
  }

  function handleProximaSemana() {
    if (!activity) return;
    const d = addDays(new Date(activity.data_inicio), 7);
    setEditDate(format(d, "yyyy-MM-dd"));
    setEditTimeStart(format(new Date(activity.data_inicio), "HH:mm"));
    setEditTimeEnd(format(new Date(activity.data_fim), "HH:mm"));
  }

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Detalhes da Atividade" size="md">
      <div className="space-y-5">
        {/* Header */}
        <div>
          {/* Título dinâmico via helper central (displayAtividadeTitulo) — garante
              que sessões mostrem sempre o nome atual do paciente vinculado,
              mesmo que o título salvo esteja stale (paciente renomeado). */}
          <h3 className="font-fraunces font-bold text-lg text-[var(--text-primary)] mb-2">
            {displayAtividadeTitulo(activity)}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge {...tipoColors} size="md" />
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors.bg} ${statusColors.text}`}>
              <span className={`w-2 h-2 rounded-full ${statusColors.dot}`} />
              {statusColors.label}
            </span>
          </div>
          <div className="space-y-2 text-sm font-dm">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Calendar size={15} />
              <span>{format(new Date(activity.data_inicio), "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Clock size={15} />
              <span>{formatTimeRange(activity.data_inicio, activity.data_fim)}</span>
            </div>
            {activity.paciente && (
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <User size={15} />
                <span>{activity.paciente.nome}</span>
                {activity.paciente.modalidade && <span className="text-xs text-[var(--text-tertiary)]">({activity.paciente.modalidade})</span>}
              </div>
            )}
            {activity.recorrencia !== "nenhuma" && (
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Tag size={15} />
                <span className="capitalize">Recorrência: {activity.recorrencia}</span>
              </div>
            )}
          </div>
        </div>

        {/* Observações / descrição */}
        {activity.descricao && actionMode !== "editar" && (
          <div className="p-3 rounded-xl bg-[var(--bg-input)]">
            <p className="font-dm text-xs text-[var(--text-tertiary)] mb-1">Observações</p>
            <p className="font-dm text-sm text-[var(--text-primary)] whitespace-pre-wrap">{activity.descricao}</p>
          </div>
        )}

        {activity.motivo_cancelamento && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="font-dm text-xs text-red-600 dark:text-red-400 mb-1">Motivo do cancelamento</p>
            <p className="font-dm text-sm text-red-800 dark:text-red-300">{activity.motivo_cancelamento}</p>
          </div>
        )}

        {/* ── EDITAR PANEL ── */}
        {actionMode === "editar" && (
          <div className="p-4 rounded-xl border border-[var(--border-default)] space-y-3">
            <p className="font-dm text-sm font-medium text-[var(--text-primary)]">Editar atividade</p>
            <Input label="Título" value={editTitulo} onChange={setEditTitulo} />
            <Input label="Data" type="date" value={editDate} onChange={setEditDate} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Início" type="time" value={editTimeStart} onChange={setEditTimeStart} />
              <Input label="Fim" type="time" value={editTimeEnd} onChange={setEditTimeEnd} />
            </div>
            <div>
              <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Status</label>
              <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors">
                <option value="pendente">Pendente</option>
                <option value="confirmada">Confirmada</option>
                <option value="reagendada">Reagendada</option>
                <option value="realizada">Realizada</option>
                <option value="cancelada">Cancelada</option>
                <option value="ausencia">Ausência</option>
              </select>
            </div>
            <Textarea label="Observações" value={editDescricao} onChange={setEditDescricao} placeholder="Observações..." rows={2} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setActionMode(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={!editDate}>Salvar</Button>
            </div>
          </div>
        )}

        {/* ── REAGENDAR PANEL ── */}
        {actionMode === "reagendar" && (
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-dm text-sm font-medium text-blue-700 dark:text-blue-400">Reagendar</p>
              <Button variant="ghost" size="sm" onClick={handleProximaSemana} icon={<Calendar size={12} />}>Próxima semana</Button>
            </div>
            <Input label="Nova data" type="date" value={editDate} onChange={setEditDate} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Início" type="time" value={editTimeStart} onChange={setEditTimeStart} />
              <Input label="Fim" type="time" value={editTimeEnd} onChange={setEditTimeEnd} />
            </div>
            <Textarea value={observacao} onChange={setObservacao} placeholder="Motivo do reagendamento (opcional)..." rows={2} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setActionMode(null)}>Voltar</Button>
              <Button size="sm" onClick={handleReagendar} disabled={!editDate}>Confirmar</Button>
            </div>
          </div>
        )}

        {/* ── CANCELAR PANEL ── */}
        {actionMode === "cancelar" && (
          <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 space-y-3">
            <p className="font-dm text-sm font-medium text-red-700 dark:text-red-400">Cancelar atividade</p>
            <Textarea value={observacao} onChange={setObservacao} placeholder="Motivo do cancelamento (opcional)..." rows={2} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setActionMode(null)}>Voltar</Button>
              <Button variant="danger" size="sm" onClick={handleCancelar}>Confirmar cancelamento</Button>
            </div>
          </div>
        )}

        {/* ── AUSÊNCIA PANEL ── */}
        {actionMode === "ausencia" && (
          <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800 space-y-3">
            <p className="font-dm text-sm font-medium text-rose-700 dark:text-rose-400">Registrar ausência</p>
            <Textarea value={observacao} onChange={setObservacao} placeholder="Observação sobre a ausência (opcional)..." rows={2} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setActionMode(null)}>Voltar</Button>
              <Button size="sm" onClick={handleAusencia}>Confirmar ausência</Button>
            </div>
          </div>
        )}

        {/* ── WHATSAPP CONFIRM ── */}
        {actionMode === "whatsapp_confirm" && (
          <div className="p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 space-y-3">
            <p className="font-dm text-sm font-medium text-[var(--text-primary)]">Enviar mensagem via WhatsApp para {activity.paciente?.nome}?</p>
            <p className="font-dm text-xs text-[var(--text-tertiary)]">Será aberta uma conversa no WhatsApp. O status não será alterado.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setActionMode(null)}>Cancelar</Button>
              <Button size="sm" onClick={handleWhatsAppConfirmed} icon={<WhatsAppIcon size={14} />}>Enviar</Button>
            </div>
          </div>
        )}

        {/* ── ACTION BUTTONS (etiquetas de status) ── */}
        {actionMode === null && (
          <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
            {/* Status actions as tag-like buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={openEditMode} icon={<Pencil size={14} />}>Editar</Button>

              {!isPast && (
                <>
                  {activity.status !== 'confirmada' && (
                    <button onClick={handleConfirmar} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Confirmar
                    </button>
                  )}
                  <button onClick={handlePresenca} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-teal-100 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-teal-500" /> Presença
                  </button>
                  <button onClick={() => { setObservacao(""); setActionMode("ausencia"); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Ausência
                  </button>
                  <button onClick={openReagendarMode} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Reagendar
                  </button>
                  <button onClick={() => { setObservacao(""); setActionMode("cancelar"); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Cancelar
                  </button>
                </>
              )}

              <Button variant="secondary" size="sm" onClick={handleDuplicate} icon={<Copy size={14} />}>Duplicar</Button>
            </div>

            {/* Extras: WhatsApp + patient link */}
            <div className="flex flex-wrap gap-2">
              {hasPaciente && activity.paciente?.telefone && (
                <Button variant="ghost" size="sm" onClick={handleWhatsApp} icon={<WhatsAppIcon size={14} />}>WhatsApp</Button>
              )}
              {hasPaciente && activity.paciente_id && (
                <Link href={`/pacientes?id=${activity.paciente_id}`} onClick={resetAndClose}>
                  <Button variant="ghost" size="sm" icon={<FileText size={14} />}>Anotações</Button>
                </Link>
              )}
            </div>

            {/* Excluir */}
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-3">
                  <p className="font-dm text-sm text-red-500">Tem certeza?</p>
                  <Button variant="danger" size="sm" onClick={handleDelete}>Sim, excluir</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Não</Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)} icon={<Trash2 size={14} />} className="text-red-400 hover:text-red-500">
                  Excluir atividade
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
