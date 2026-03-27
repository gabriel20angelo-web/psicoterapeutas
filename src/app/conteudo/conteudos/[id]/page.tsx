"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, Trash2, Copy, Archive, Plus, X, Check,
  Calendar, Link2, CheckCircle, Circle, Loader2,
  ChevronRight, Clock,
} from "lucide-react";
import Shell from "@/components/Shell";
import UsinaNav from "@/components/usina/UsinaNav";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { fadeUp, staggerChild } from "@/lib/animations";
import { useToast } from "@/contexts/ToastContext";
import {
  getConteudo, updateConteudo, deleteConteudo, duplicateConteudo,
  getEditorias, getRedesSociais, getConteudoRedes, addConteudoRede,
  removeConteudoRede, updateConteudoRede, getTarefas, createTarefa,
  updateTarefa, deleteTarefa,
  STATUS_CONFIG, FUNIL_CONFIG, PRIORIDADE_CONFIG,
  type Conteudo, type StatusConteudo, type Funil, type Editoria,
  type RedeSocial, type ConteudoRede, type Tarefa, type StatusRede,
  type PrioridadeTarefa,
} from "@/lib/usina-data";

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label, cor: v.cor }));
const FUNIL_OPTIONS = Object.entries(FUNIL_CONFIG).map(([k, v]) => ({ value: k, label: v.label }));

export default function ConteudoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [conteudo, setConteudo] = useState<Conteudo | null>(null);
  const [editorias, setEditorias] = useState<Editoria[]>([]);
  const [redes, setRedes] = useState<RedeSocial[]>([]);
  const [conteudoRedes, setConteudoRedes] = useState<ConteudoRede[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddRede, setShowAddRede] = useState(false);
  const [showAddTarefa, setShowAddTarefa] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState({ titulo: "", data_prevista: "", prioridade: "normal" as PrioridadeTarefa });

  const reload = useCallback(() => {
    const c = getConteudo(id);
    if (!c) { router.push("/conteudo/conteudos"); return; }
    setConteudo(c);
    setEditorias(getEditorias());
    setRedes(getRedesSociais());
    setConteudoRedes(getConteudoRedes(id));
    setTarefas(getTarefas({ conteudo_id: id }));
  }, [id, router]);

  useEffect(() => { reload(); }, [reload]);

  const handleFieldBlur = (field: keyof Conteudo, value: string | boolean | null) => {
    if (!conteudo) return;
    updateConteudo(id, { [field]: value });
    reload();
    toast("Conteúdo salvo", { type: "success" });
  };

  const handleStatusChange = (status: StatusConteudo) => {
    updateConteudo(id, { status });
    reload();
    toast(`Status alterado para ${STATUS_CONFIG[status].label}`, { type: "success" });
  };

  const handleDuplicate = () => {
    const dup = duplicateConteudo(id);
    if (dup) {
      toast("Conteúdo duplicado com sucesso", { type: "success" });
      router.push(`/conteudo/conteudos/${dup.id}`);
    } else {
      toast("Erro ao duplicar conteúdo", { type: "error" });
    }
  };

  const handleArchive = () => {
    updateConteudo(id, { status: "arquivado" });
    toast("Conteúdo arquivado", { type: "success" });
    router.push("/conteudo/conteudos");
  };

  const handleDelete = () => {
    deleteConteudo(id);
    toast("Conteúdo excluído", { type: "success" });
    router.push("/conteudo/conteudos");
  };

  const handleAddRede = (redeId: string) => {
    addConteudoRede(id, redeId);
    setShowAddRede(false);
    reload();
  };

  const handleRemoveRede = (crId: string) => {
    removeConteudoRede(crId);
    reload();
  };

  const handleUpdateRede = (crId: string, data: Partial<ConteudoRede>) => {
    updateConteudoRede(crId, data);
    reload();
  };

  const handleToggleTarefa = (t: Tarefa) => {
    updateTarefa(t.id, { status: t.status === "concluida" ? "pendente" : "concluida" });
    reload();
  };

  const handleCreateTarefa = () => {
    if (!novaTarefa.titulo.trim()) return;
    createTarefa({
      titulo: novaTarefa.titulo,
      conteudo_id: id,
      data_prevista: novaTarefa.data_prevista || null,
      prioridade: novaTarefa.prioridade,
    });
    setNovaTarefa({ titulo: "", data_prevista: "", prioridade: "normal" });
    setShowAddTarefa(false);
    reload();
  };

  if (!conteudo) return null;

  const linkedRedeIds = new Set(conteudoRedes.map(cr => cr.rede_social_id));
  const availableRedes = redes.filter(r => r.ativa && !linkedRedeIds.has(r.id));

  return (
    <Shell>
      <motion.div {...fadeUp()} className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 font-dm text-sm">
          <Link href="/conteudo" className="text-[var(--text-tertiary)] hover:text-[var(--orange-500)] transition-colors">
            Usina
          </Link>
          <ChevronRight size={12} className="text-[var(--text-tertiary)]" />
          <Link href="/conteudo/conteudos" className="text-[var(--text-tertiary)] hover:text-[var(--orange-500)] transition-colors">
            Conteudos
          </Link>
          <ChevronRight size={12} className="text-[var(--text-tertiary)]" />
          <span className="text-[var(--text-primary)] font-medium truncate max-w-[200px]">
            {conteudo.titulo || "Sem titulo"}
          </span>
        </nav>

        <UsinaNav />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: 2/3 */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title */}
            <input
              type="text"
              defaultValue={conteudo.titulo}
              onBlur={(e) => handleFieldBlur("titulo", e.target.value)}
              className="w-full bg-transparent font-fraunces text-2xl md:text-3xl font-bold text-[var(--text-primary)] outline-none border-none placeholder:text-[var(--text-tertiary)] focus:ring-0"
              placeholder="Título do conteúdo..."
            />

            {/* Description */}
            <div>
              <label className="block font-dm text-xs font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">
                Descrição
              </label>
              <textarea
                defaultValue={conteudo.descricao}
                onBlur={(e) => handleFieldBlur("descricao", e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] p-3 font-dm text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--orange-400)] transition-colors resize-none"
                placeholder="Descreva o conteúdo..."
              />
            </div>

            {/* Roteiro */}
            <div>
              <label className="block font-dm text-xs font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">
                Roteiro
              </label>
              <textarea
                defaultValue={conteudo.roteiro}
                onBlur={(e) => handleFieldBlur("roteiro", e.target.value)}
                rows={14}
                className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] p-4 font-dm text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--orange-400)] transition-colors resize-y leading-relaxed"
                placeholder="Escreva o roteiro aqui..."
              />
            </div>

            {/* Notas */}
            <div>
              <label className="block font-dm text-xs font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">
                Notas
              </label>
              <textarea
                defaultValue={conteudo.notas}
                onBlur={(e) => handleFieldBlur("notas", e.target.value)}
                rows={4}
                className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] p-3 font-dm text-sm text-[var(--text-secondary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--orange-400)] transition-colors resize-none"
                placeholder="Anotacoes, referencias, lembretes..."
              />
            </div>
          </div>

          {/* RIGHT: 1/3 Properties */}
          <div className="space-y-4">
            <Card className="space-y-5">
              <h3 className="font-fraunces font-bold text-base text-[var(--text-primary)]">Propriedades</h3>

              {/* Status */}
              <div>
                <label className="block font-dm text-xs font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">Status</label>
                <select
                  value={conteudo.status}
                  onChange={(e) => handleStatusChange(e.target.value as StatusConteudo)}
                  className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
                  style={{ color: STATUS_CONFIG[conteudo.status].cor }}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Data Planejada */}
              <div>
                <label className="block font-dm text-xs font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">Data Planejada</label>
                <input
                  type="date"
                  defaultValue={conteudo.data_planejada || ""}
                  onBlur={(e) => handleFieldBlur("data_planejada", e.target.value || null)}
                  className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
                />
              </div>

              {/* Data Publicacao (only when postado) */}
              {conteudo.status === "postado" && (
                <div>
                  <label className="block font-dm text-xs font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">Data Publicacao</label>
                  <input
                    type="date"
                    defaultValue={conteudo.data_publicacao || ""}
                    onBlur={(e) => handleFieldBlur("data_publicacao", e.target.value || null)}
                    className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
                  />
                </div>
              )}

              {/* Editoria */}
              <div>
                <label className="block font-dm text-xs font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">Editoria</label>
                <select
                  value={conteudo.editoria_id || ""}
                  onChange={(e) => handleFieldBlur("editoria_id", e.target.value || null)}
                  className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
                >
                  <option value="">Sem editoria</option>
                  {editorias.map(ed => (
                    <option key={ed.id} value={ed.id}>{ed.nome}</option>
                  ))}
                </select>
              </div>

              {/* Funil */}
              <div>
                <label className="block font-dm text-xs font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">Funil</label>
                <select
                  value={conteudo.funil || ""}
                  onChange={(e) => handleFieldBlur("funil", (e.target.value || null) as Funil | null)}
                  className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
                >
                  <option value="">Sem funil</option>
                  {FUNIL_OPTIONS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              {/* Emoji Marcador */}
              <div>
                <label className="block font-dm text-xs font-medium text-[var(--text-tertiary)] mb-1.5 uppercase tracking-wider">Emoji Marcador</label>
                <input
                  type="text"
                  defaultValue={conteudo.emoji_marcador || ""}
                  onBlur={(e) => handleFieldBlur("emoji_marcador", e.target.value || null)}
                  className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
                  placeholder="Ex: 🔥"
                  maxLength={4}
                />
              </div>

              {/* Publi */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => {
                      updateConteudo(id, { is_publi: !conteudo.is_publi, parceiro_publi: !conteudo.is_publi ? conteudo.parceiro_publi : null });
                      reload();
                    }}
                    className={`w-10 h-6 rounded-full transition-colors relative ${conteudo.is_publi ? "bg-[var(--orange-400)]" : "bg-[var(--bg-input)] border border-[var(--border-strong)]"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${conteudo.is_publi ? "translate-x-5" : "translate-x-1"}`} />
                  </button>
                  <span className="font-dm text-sm text-[var(--text-secondary)]">Publi / Parceria</span>
                </label>
                {conteudo.is_publi && (
                  <input
                    type="text"
                    defaultValue={conteudo.parceiro_publi || ""}
                    onBlur={(e) => handleFieldBlur("parceiro_publi", e.target.value || null)}
                    className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
                    placeholder="Nome do parceiro"
                  />
                )}
              </div>

              {/* Separator */}
              <div className="border-t border-[var(--border-subtle)]" />

              {/* Redes Sociais */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-dm text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Redes Sociais</h4>
                  <button
                    onClick={() => setShowAddRede(true)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--orange-400)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {conteudoRedes.length === 0 ? (
                  <p className="font-dm text-xs text-[var(--text-tertiary)] italic">Nenhuma rede vinculada</p>
                ) : (
                  <div className="space-y-3">
                    {conteudoRedes.map(cr => {
                      const rede = redes.find(r => r.id === cr.rede_social_id);
                      if (!rede) return null;
                      return (
                        <div key={cr.id} className="rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ background: rede.cor }} />
                              <span className="font-dm text-sm font-medium text-[var(--text-primary)]">{rede.nome}</span>
                            </div>
                            <button onClick={() => handleRemoveRede(cr.id)} className="text-[var(--text-tertiary)] hover:text-[var(--red-text)] transition-colors">
                              <X size={14} />
                            </button>
                          </div>
                          <select
                            value={cr.status_rede}
                            onChange={(e) => handleUpdateRede(cr.id, { status_rede: e.target.value as StatusRede })}
                            className="w-full rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] px-2 py-1 font-dm text-xs text-[var(--text-secondary)] outline-none"
                          >
                            <option value="pendente">Pendente</option>
                            <option value="adaptado">Adaptado</option>
                            <option value="postado">Postado</option>
                          </select>
                          <input
                            type="text"
                            defaultValue={cr.notas_adaptacao}
                            onBlur={(e) => handleUpdateRede(cr.id, { notas_adaptacao: e.target.value })}
                            className="w-full rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] px-2 py-1 font-dm text-xs text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-tertiary)]"
                            placeholder="Notas de adaptacao..."
                          />
                          {cr.status_rede === "postado" && (
                            <input
                              type="date"
                              defaultValue={cr.data_postagem || ""}
                              onBlur={(e) => handleUpdateRede(cr.id, { data_postagem: e.target.value || null })}
                              className="w-full rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] px-2 py-1 font-dm text-xs text-[var(--text-secondary)] outline-none"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="border-t border-[var(--border-subtle)]" />

              {/* Tarefas Vinculadas */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-dm text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Tarefas Vinculadas</h4>
                  <button
                    onClick={() => setShowAddTarefa(true)}
                    className="inline-flex items-center gap-1 font-dm text-xs text-[var(--orange-400)] hover:text-[var(--orange-300)] transition-colors"
                  >
                    <Plus size={12} />
                    Tarefa
                  </button>
                </div>

                {tarefas.length === 0 ? (
                  <p className="font-dm text-xs text-[var(--text-tertiary)] italic">Nenhuma tarefa vinculada</p>
                ) : (
                  <div className="space-y-2">
                    {tarefas.map(t => (
                      <div key={t.id} className="flex items-center gap-2">
                        <button onClick={() => handleToggleTarefa(t)} className="shrink-0">
                          {t.status === "concluida" ? (
                            <CheckCircle size={16} className="text-[var(--green-text)]" />
                          ) : (
                            <Circle size={16} className="text-[var(--text-tertiary)]" />
                          )}
                        </button>
                        <span className={`font-dm text-sm flex-1 ${t.status === "concluida" ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-secondary)]"}`}>
                          {t.titulo}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="border-t border-[var(--border-subtle)]" />

              {/* Actions */}
              <div className="space-y-2">
                <Button variant="secondary" size="sm" icon={<Copy size={14} />} className="w-full justify-start" onClick={handleDuplicate}>
                  Duplicar
                </Button>
                <Button variant="secondary" size="sm" icon={<Archive size={14} />} className="w-full justify-start" onClick={handleArchive}>
                  Arquivar
                </Button>
                <Button variant="danger" size="sm" icon={<Trash2 size={14} />} className="w-full justify-start" onClick={() => setShowDeleteConfirm(true)}>
                  Excluir
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Activity Section */}
        <Card className="!p-5">
          <h3 className="font-fraunces font-bold text-base text-[var(--text-primary)] mb-4">Atividade</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[var(--text-tertiary)]" />
              <span className="font-dm text-xs text-[var(--text-tertiary)]">Criado em</span>
              <span className="font-dm text-xs font-medium text-[var(--text-secondary)]">
                {new Date(conteudo.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[var(--text-tertiary)]" />
              <span className="font-dm text-xs text-[var(--text-tertiary)]">Atualizado em</span>
              <span className="font-dm text-xs font-medium text-[var(--text-secondary)]">
                {new Date(conteudo.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-dm text-xs font-semibold"
                style={{
                  color: STATUS_CONFIG[conteudo.status].cor,
                  background: STATUS_CONFIG[conteudo.status].bg,
                }}
              >
                {STATUS_CONFIG[conteudo.status].label}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Modal: Add Rede */}
      <Modal isOpen={showAddRede} onClose={() => setShowAddRede(false)} title="Adicionar Rede Social" size="sm">
        {availableRedes.length === 0 ? (
          <p className="font-dm text-sm text-[var(--text-tertiary)]">Todas as redes ativas ja estao vinculadas.</p>
        ) : (
          <div className="space-y-2">
            {availableRedes.map(r => (
              <button
                key={r.id}
                onClick={() => handleAddRede(r.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors text-left"
              >
                <span className="w-3 h-3 rounded-full" style={{ background: r.cor }} />
                <span className="font-dm text-sm text-[var(--text-primary)]">{r.nome}</span>
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* Modal: Add Tarefa */}
      <Modal isOpen={showAddTarefa} onClose={() => setShowAddTarefa(false)} title="Nova Tarefa" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Titulo</label>
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
          <Button onClick={handleCreateTarefa} disabled={!novaTarefa.titulo.trim()} className="w-full">
            Criar Tarefa
          </Button>
        </div>
      </Modal>

      {/* Modal: Delete Confirm */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Excluir Conteúdo" size="sm">
        <div className="space-y-4">
          <p className="font-dm text-sm text-[var(--text-secondary)]">
            Tem certeza que deseja excluir <strong>&quot;{conteudo.titulo}&quot;</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} className="flex-1">
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}
