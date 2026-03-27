"use client";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, AlertTriangle, ChevronDown, ChevronUp, Send, UserCheck, Search } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import EmptyState from "@/components/ui/EmptyState";
import ReacaoBar from "@/components/comunicacao/ReacaoBar";
import {
  getEncaminhamentos,
  createEncaminhamento,
  responderEncaminhamento,
  updateEncaminhamentoStatus,
} from "@/lib/comunicacao-data";
import { getPacientes } from "@/lib/data";
import { getInitials } from "@/lib/utils";
import { staggerChild } from "@/lib/animations";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { StatusEncaminhamento } from "@/types/comunicacao";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";

const STATUS_COLORS: Record<StatusEncaminhamento, { bg: string; text: string; dot: string; label: string }> = {
  aberto: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", label: "Aberto" },
  em_conversa: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", label: "Em conversa" },
  aceito: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500", label: "Aceito" },
  fechado: { bg: "bg-gray-100 dark:bg-gray-800/50", text: "text-gray-600 dark:text-gray-400", dot: "bg-gray-400", label: "Fechado" },
};

const MODALIDADE_OPTIONS = [
  { value: "", label: "Selecione..." },
  { value: "presencial", label: "Presencial" },
  { value: "online", label: "Online" },
  { value: "ambos", label: "Presencial ou Online" },
];

const STATUS_UPDATE_OPTIONS = [
  { value: "aberto", label: "Aberto" },
  { value: "em_conversa", label: "Em conversa" },
  { value: "aceito", label: "Aceito" },
  { value: "fechado", label: "Fechado" },
];

interface Props {
  onRefresh: () => void;
}

export default function EncaminhamentosSection({ onRefresh }: Props) {
  const { user, profile, canCreateEncaminhamento } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [terapeutaSearch, setTerapeutaSearch] = useState("");
  const [showTerapeutaList, setShowTerapeutaList] = useState(false);
  const [, forceUpdate] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const refresh = () => { forceUpdate((n) => n + 1); onRefresh(); };

  const encaminhamentos = getEncaminhamentos("todos");

  // Load all therapists from profiles
  const [allProfiles, setAllProfiles] = useState<{ full_name: string }[]>([]);
  useEffect(() => {
    supabase.from('profiles').select('full_name').order('full_name').then(({ data }) => {
      if (data) setAllProfiles(data);
    });
  }, []);

  const [form, setForm] = useState({
    nome_completo: "",
    data_nascimento: "",
    telefone: "",
    disponibilidade: "",
    contato_apoio: "",
    status_financeiro: "",
    observacoes: "",
    modalidade: "",
    urgencia: false,
    terapeuta_designado_nome: "",
  });

  const handleCreate = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    // Build description from structured fields
    const parts: string[] = [];
    if (form.nome_completo) parts.push(`Nome completo: ${form.nome_completo}`);
    if (form.data_nascimento) parts.push(`Data de nascimento: ${form.data_nascimento}`);
    if (form.telefone) parts.push(`Número de telefone: ${form.telefone}`);
    if (form.disponibilidade) parts.push(`Disponibilidade para terapia: ${form.disponibilidade}`);
    if (form.contato_apoio) parts.push(`Contato de apoio: ${form.contato_apoio}`);
    if (form.status_financeiro) parts.push(`\nStatus financeiro:\n${form.status_financeiro}`);
    if (form.observacoes) parts.push(`\n${form.observacoes}`);

    const descricao = parts.join('\n');

    createEncaminhamento({
      descricao_caso: descricao,
      modalidade: form.modalidade || undefined,
      urgencia: form.urgencia,
      horarios_sugeridos: form.disponibilidade || undefined,
      terapeuta_designado_nome: form.terapeuta_designado_nome || undefined,
    });

    // Send notification to designated therapist (via toast for now)
    if (form.terapeuta_designado_nome) {
      toast(`Encaminhamento enviado para ${form.terapeuta_designado_nome}`, { type: "success" });
    } else {
      toast("Encaminhamento publicado", { type: "success" });
    }

    setForm({ nome_completo: "", data_nascimento: "", telefone: "", disponibilidade: "", contato_apoio: "", status_financeiro: "", observacoes: "", modalidade: "", urgencia: false, terapeuta_designado_nome: "" });
    setShowCreate(false);
    setIsSubmitting(false);
    refresh();
  };

  const handleReply = (encId: string) => {
    const text = replyTexts[encId] || "";
    if (!text.trim()) return;
    responderEncaminhamento(encId, text.trim());
    setReplyTexts(prev => { const next = { ...prev }; delete next[encId]; return next; });
    setReplyingId(null);
    refresh();
  };

  const handleStatusUpdate = (id: string, status: string) => {
    updateEncaminhamentoStatus(id, status as StatusEncaminhamento);
    refresh();
  };

  const filteredTerapeutas = useMemo(() => {
    if (!terapeutaSearch) return [];
    const q = terapeutaSearch.toLowerCase();
    return allProfiles
      .map(p => p.full_name)
      .filter(name => name && name.toLowerCase().includes(q));
  }, [terapeutaSearch, allProfiles]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-fraunces font-bold text-lg text-[var(--text-primary)]">Encaminhamentos</h2>
        {canCreateEncaminhamento && (
          <Button onClick={() => setShowCreate(true)} icon={<Plus size={16} />}>Novo Encaminhamento</Button>
        )}
      </div>

      {encaminhamentos.length === 0 ? (
        <EmptyState message="Nenhum encaminhamento encontrado." />
      ) : (
        <div className="space-y-4">
          {encaminhamentos.map((enc, i) => {
            const status = STATUS_COLORS[enc.status];
            const isExpanded = expandedId === enc.id;
            const isOwner = enc.autor_id === user?.id;
            return (
              <motion.div key={enc.id} {...staggerChild(i)}>
                <Card>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--orange-500)]/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-dm text-xs font-bold text-[var(--orange-500)]">{getInitials(enc.autor_nome)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-dm text-sm font-semibold text-[var(--text-primary)]">{enc.autor_nome}</span>
                        <Badge bg={status.bg} text={status.text} dot={status.dot} label={status.label} />
                        {enc.urgencia && <Badge bg="bg-red-100 dark:bg-red-900/30" text="text-red-700 dark:text-red-400" dot="bg-red-500" label="Urgente" />}
                      </div>
                      <pre className="font-dm text-sm text-[var(--text-secondary)] leading-relaxed mb-2 whitespace-pre-wrap font-sans">{enc.descricao_caso}</pre>
                      {enc.terapeuta_designado_nome && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <UserCheck size={14} className="text-[var(--orange-500)]" />
                          <span className="font-dm text-xs font-medium text-[var(--orange-500)]">Designado: {enc.terapeuta_designado_nome}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-dm text-xs text-[var(--text-tertiary)]">
                        {formatDistanceToNow(new Date(enc.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                      <ReacaoBar tipoEntidade="encaminhamento" entidadeId={enc.id} reacoes={enc.reacoes} onReact={refresh} />
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner && (
                        <Select value={enc.status} onChange={(val) => handleStatusUpdate(enc.id, val)} options={STATUS_UPDATE_OPTIONS} className="w-36" />
                      )}
                      {enc.respostas.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : enc.id)} icon={isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}>
                          {enc.respostas.length} resposta{enc.respostas.length !== 1 ? "s" : ""}
                        </Button>
                      )}
                      {!isOwner && (
                        <Button variant="secondary" size="sm" onClick={() => setReplyingId(replyingId === enc.id ? null : enc.id)}>Responder</Button>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && enc.respostas.length > 0 && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-3">
                          {enc.respostas.map((resp) => (
                            <div key={resp.id} className="flex items-start gap-2 pl-4 border-l-2 border-[var(--orange-500)]/20">
                              <div className="w-7 h-7 rounded-full bg-[var(--bg-input)] flex items-center justify-center flex-shrink-0">
                                <span className="font-dm text-[10px] font-bold text-[var(--text-secondary)]">{getInitials(resp.autor_nome)}</span>
                              </div>
                              <div>
                                <span className="font-dm text-xs font-semibold text-[var(--text-primary)]">{resp.autor_nome}</span>
                                <span className="font-dm text-xs text-[var(--text-tertiary)] ml-2">{formatDistanceToNow(new Date(resp.created_at), { addSuffix: true, locale: ptBR })}</span>
                                <p className="font-dm text-sm text-[var(--text-secondary)] mt-0.5">{resp.texto}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {replyingId === enc.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                          <div className="flex gap-2">
                            <input
                              value={replyTexts[enc.id] || ""}
                              onChange={(e) => setReplyTexts(prev => ({ ...prev, [enc.id]: e.target.value }))}
                              placeholder="Escreva sua resposta..."
                              onKeyDown={(e) => e.key === "Enter" && handleReply(enc.id)}
                              className="flex-1 px-3.5 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors placeholder:text-[var(--text-tertiary)]"
                            />
                            <Button size="sm" onClick={() => handleReply(enc.id)} disabled={!(replyTexts[enc.id] || "").trim()} icon={<Send size={14} />}>Enviar</Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Novo Encaminhamento" size="lg">
        <div className="space-y-4">
          <p className="font-dm text-xs text-[var(--text-tertiary)] -mt-2 mb-2">Preencha os dados do paciente para encaminhamento.</p>

          <Input
            label="Nome completo"
            value={form.nome_completo}
            onChange={(val) => setForm({ ...form, nome_completo: val })}
            placeholder="Nome completo do paciente"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Data de nascimento"
              value={form.data_nascimento}
              onChange={(val) => setForm({ ...form, data_nascimento: val })}
              placeholder="DD/MM/AAAA"
            />
            <Input
              label="Telefone"
              value={form.telefone}
              onChange={(val) => setForm({ ...form, telefone: val })}
              placeholder="(XX) XXXXX-XXXX"
            />
          </div>

          <Input
            label="Disponibilidade para terapia"
            value={form.disponibilidade}
            onChange={(val) => setForm({ ...form, disponibilidade: val })}
            placeholder="Ex: Segunda feira 15h às 16h"
          />

          <Input
            label="Contato de apoio"
            value={form.contato_apoio}
            onChange={(val) => setForm({ ...form, contato_apoio: val })}
            placeholder="Ex: Maria (mãe): 19 99999-9999"
          />

          <Textarea
            label="Status financeiro"
            value={form.status_financeiro}
            onChange={(val) => setForm({ ...form, status_financeiro: val })}
            placeholder="Ex: Clínica Allos Pro - R$450/mês&#10;Primeira parcela: R$293,50&#10;Próxima: 10/4/26 - R$450"
            rows={3}
          />

          <Select
            label="Modalidade"
            value={form.modalidade}
            onChange={(val) => setForm({ ...form, modalidade: val })}
            options={MODALIDADE_OPTIONS}
          />

          {/* Terapeuta designado com busca */}
          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Terapeuta designado</label>
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    value={form.terapeuta_designado_nome || terapeutaSearch}
                    onChange={(e) => {
                      setTerapeutaSearch(e.target.value);
                      setForm({ ...form, terapeuta_designado_nome: "" });
                      setShowTerapeutaList(true);
                    }}
                    onFocus={() => setShowTerapeutaList(true)}
                    placeholder="Buscar terapeuta pelo nome..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors placeholder:text-[var(--text-tertiary)]"
                  />
                </div>
                {form.terapeuta_designado_nome && (
                  <button onClick={() => { setForm({ ...form, terapeuta_designado_nome: "" }); setTerapeutaSearch(""); }} className="text-[var(--text-tertiary)] hover:text-red-500 text-sm">×</button>
                )}
              </div>
              {showTerapeutaList && terapeutaSearch && filteredTerapeutas.length > 0 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-[var(--bg-card-elevated)] border border-[var(--border-default)] rounded-xl shadow-lg max-h-40 overflow-y-auto">
                  {filteredTerapeutas.map(name => (
                    <button
                      key={name}
                      onClick={() => { setForm({ ...form, terapeuta_designado_nome: name }); setTerapeutaSearch(""); setShowTerapeutaList(false); }}
                      className="w-full text-left px-3.5 py-2.5 font-dm text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
              {showTerapeutaList && terapeutaSearch && filteredTerapeutas.length === 0 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-[var(--bg-card-elevated)] border border-[var(--border-default)] rounded-xl shadow-lg p-3">
                  <p className="font-dm text-xs text-[var(--text-tertiary)]">Nenhum terapeuta encontrado. Você pode digitar o nome manualmente.</p>
                  <button
                    onClick={() => { setForm({ ...form, terapeuta_designado_nome: terapeutaSearch }); setShowTerapeutaList(false); }}
                    className="mt-2 font-dm text-xs text-[var(--orange-500)] hover:underline"
                  >
                    Usar "{terapeutaSearch}"
                  </button>
                </div>
              )}
            </div>
          </div>

          <Textarea
            label="Observações adicionais"
            value={form.observacoes}
            onChange={(val) => setForm({ ...form, observacoes: val })}
            placeholder="Informações extras, links, observações..."
            rows={2}
          />

          <label className="flex items-center gap-2 font-dm text-sm text-[var(--text-primary)] cursor-pointer">
            <input
              type="checkbox"
              checked={form.urgencia}
              onChange={(e) => setForm({ ...form, urgencia: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--orange-500)] focus:ring-[var(--orange-500)]"
            />
            <AlertTriangle size={14} className="text-red-500" />
            Caso urgente
          </label>

          {form.terapeuta_designado_nome && (
            <div className="bg-[var(--orange-500)]/5 border border-[var(--orange-500)]/20 rounded-xl p-3 flex items-center gap-2">
              <UserCheck size={14} className="text-[var(--orange-500)] flex-shrink-0" />
              <p className="font-dm text-xs text-[var(--orange-500)]">
                {form.terapeuta_designado_nome} será notificado sobre este encaminhamento.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Publicar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
