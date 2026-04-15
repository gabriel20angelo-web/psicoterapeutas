"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Send, FileText, User } from "lucide-react";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import Badge from "@/components/ui/Badge";
import { STATUS_PACIENTE_COLORS } from "@/lib/status-colors";
import { staggerChild } from "@/lib/animations";
import { getAtividadesByPaciente } from "@/lib/data";
import { differenceInYears } from "date-fns";
import type { Paciente, Atividade } from "@/types/database";

interface Props {
  paciente: Paciente;
  index: number;
  lastSessionDate?: string;
  nextSession?: Atividade;
  onConfirmSession?: (paciente: Paciente, session: Atividade) => void;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return phone;
}

export default function PatientCard({ paciente, index, lastSessionDate, nextSession, onConfirmSession }: Props) {
  const statusColor = STATUS_PACIENTE_COLORS[paciente.status];
  const age = paciente.data_nascimento ? differenceInYears(new Date(), new Date(paciente.data_nascimento)) : null;

  // Attendance trend: last 5 sessions
  const allSessions = getAtividadesByPaciente(paciente.id).filter(a => a.tipo === 'sessao');
  const sortedSessions = allSessions.sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime());
  const last5 = sortedSessions.slice(0, 5);
  const absenceCount = last5.filter(s => s.status === 'ausencia').length;

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (paciente.telefone) window.open(`https://wa.me/${paciente.telefone.replace(/\D/g, "")}`, "_blank");
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (nextSession && onConfirmSession) onConfirmSession(paciente, nextSession);
  };

  return (
    <motion.div {...staggerChild(index)}>
      <Link
        href={`/pacientes?id=${paciente.id}`}
        className="group block card-base p-5 cursor-pointer"
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-[var(--orange-glow)] dark:bg-[rgba(200,75,49,.12)] flex items-center justify-center flex-shrink-0 border border-[var(--border-subtle)]">
            <User size={20} className="text-[var(--orange-500)]" strokeWidth={2} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Name + actions */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-fraunces font-semibold text-[var(--text-primary)] truncate">
                {paciente.nome}
                {age !== null && <span className="font-dm text-xs font-normal text-[var(--text-secondary)] ml-1">{age} anos</span>}
              </h3>
              <div className="flex items-center gap-0.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/pacientes?id=${paciente.id}&tab=sessoes`}
                  onClick={e => e.stopPropagation()}
                  title="Anotações"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--orange-500)] hover:bg-[var(--orange-glow)] transition-colors"
                >
                  <FileText size={15} />
                </Link>
                {nextSession && paciente.telefone && (
                  <button
                    onClick={handleConfirm}
                    title="Confirmar sessão via WhatsApp"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--orange-500)] hover:bg-[var(--orange-glow)] transition-colors"
                  >
                    <Send size={15} />
                  </button>
                )}
                {paciente.telefone && (
                  <button
                    onClick={handleWhatsApp}
                    title="Abrir WhatsApp"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#25D366] opacity-70 hover:opacity-100 hover:bg-[#25D366]/10 transition-colors"
                  >
                    <WhatsAppIcon size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Phone */}
            {paciente.telefone && (
              <p className="font-dm text-xs text-[var(--text-secondary)] mb-2.5">{formatPhone(paciente.telefone)}</p>
            )}

            {/* Status + info */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge bg={statusColor.bg} text={statusColor.text} label={statusColor.label} />
              {nextSession && (
                <span className="font-dm text-[11px] text-[var(--orange-500)] font-medium">
                  Próxima: {new Date(nextSession.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {new Date(nextSession.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {!nextSession && lastSessionDate && (
                <span className="font-dm text-[11px] text-[var(--text-tertiary)]">Última: {lastSessionDate}</span>
              )}
            </div>

            {/* Attendance trend */}
            {last5.length > 0 && (
              <div className="mt-2.5 pt-2.5 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5">
                  {last5.map((s, i) => {
                    let color = '';
                    if (s.status === 'realizada') color = '#4ADE80';
                    else if (s.status === 'ausencia') color = '#F87171';
                    else if (s.status === 'cancelada') color = 'var(--text-tertiary)';
                    return (
                      <span
                        key={i}
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={color ? { backgroundColor: color } : { border: '1.5px solid var(--border-strong)' }}
                      />
                    );
                  })}
                  {absenceCount >= 2 && (
                    <span className="font-dm text-[10px] text-amber-500 ml-1.5 font-medium">Faltas frequentes</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
