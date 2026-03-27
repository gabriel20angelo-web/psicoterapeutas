"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, ChevronDown, ChevronUp, Send, Pencil, Trash2, Check, X } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import RichEditor from "@/components/ui/RichEditor";
import SearchInput from "@/components/ui/SearchInput";
import EmptyState from "@/components/ui/EmptyState";
import ReacaoBar from "@/components/comunicacao/ReacaoBar";
import { getPosts, createPost, comentarPost, updatePost, deletePost } from "@/lib/comunicacao-data";
import { getInitials } from "@/lib/utils";
import { staggerChild } from "@/lib/animations";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  onRefresh: () => void;
}

export default function PostsSection({ onRefresh }: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState("");
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);
  const { toast } = useToast();
  const refresh = () => { forceUpdate((n) => n + 1); onRefresh(); };

  const posts = getPosts("todos", search || undefined);

  const [form, setForm] = useState({
    titulo: "",
    corpo: "",
  });

  const handleCreate = () => {
    if (!form.corpo) return;
    createPost({ titulo: form.titulo || undefined, corpo: form.corpo, tag: "geral" });
    setForm({ titulo: "", corpo: "" });
    setShowCreate(false);
    refresh();
  };

  const handleComment = (postId: string) => {
    const text = commentTexts[postId] || "";
    if (!text.trim()) return;
    comentarPost(postId, text.trim());
    setCommentTexts(prev => { const next = { ...prev }; delete next[postId]; return next; });
    setCommentingId(null);
    refresh();
  };

  const handleEditStart = (postId: string, corpo: string) => {
    setEditingPostId(postId);
    setEditPostContent(corpo);
  };

  const handleEditSave = (postId: string) => {
    if (!editPostContent.trim()) return;
    updatePost(postId, editPostContent.trim());
    setEditingPostId(null);
    setEditPostContent("");
    toast("Post atualizado", { type: "success" });
    refresh();
  };

  const handleEditCancel = () => {
    setEditingPostId(null);
    setEditPostContent("");
  };

  const handleDeleteConfirm = (postId: string) => {
    deletePost(postId);
    setDeletingPostId(null);
    toast("Post excluído", { type: "success" });
    refresh();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar posts..."
          />
        </div>
        <Button onClick={() => setShowCreate(true)} icon={<Plus size={16} />}>
          Novo Post
        </Button>
      </div>

      {posts.length === 0 ? (
        <EmptyState message="Nenhum post encontrado." />
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => {
            const isExpanded = expandedId === post.id;
            const isOwner = post.autor_id === user?.id;
            const isEditing = editingPostId === post.id;
            const isDeleting = deletingPostId === post.id;

            return (
              <motion.div key={post.id} {...staggerChild(i)}>
                <Card>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-acc/10 dark:bg-acc/20 flex items-center justify-center flex-shrink-0">
                      <span className="font-dm text-xs font-bold text-acc">
                        {getInitials(post.autor_nome)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-dm text-sm font-semibold text-[var(--text-primary)]">
                          {post.autor_nome}
                        </span>
                        <span className="font-dm text-xs text-ink-4">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                        {isOwner && !isEditing && !isDeleting && (
                          <div className="flex items-center gap-1 ml-auto">
                            <button
                              onClick={() => handleEditStart(post.id, post.corpo)}
                              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-elevated dark:hover:bg-[#252525] transition-colors text-ink-4 hover:text-ink-2"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeletingPostId(post.id)}
                              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-ink-4 hover:text-red-500"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      {post.titulo && (
                        <h3 className="font-fraunces font-bold text-base text-ink mb-1">
                          {post.titulo}
                        </h3>
                      )}
                      {isEditing ? (
                        <div className="space-y-2">
                          <RichEditor
                            content={editPostContent}
                            onChange={setEditPostContent}
                            placeholder="Edite o conteúdo..."
                            minHeight="120px"
                          />
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => handleEditSave(post.id)} icon={<Check size={14} />}>
                              Salvar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleEditCancel} icon={<X size={14} />}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : isDeleting ? (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                          <span className="font-dm text-sm text-red-700 dark:text-red-400">Excluir este post?</span>
                          <Button size="sm" onClick={() => handleDeleteConfirm(post.id)} icon={<Trash2 size={14} />}>
                            Excluir
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeletingPostId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="prose-editor font-dm text-sm text-[var(--text-secondary)] leading-relaxed" dangerouslySetInnerHTML={{ __html: post.corpo }} />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <ReacaoBar
                      tipoEntidade="post"
                      entidadeId={post.id}
                      reacoes={post.reacoes}
                      onReact={refresh}
                    />
                    <div className="flex items-center gap-2">
                      {post.comentarios.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedId(isExpanded ? null : post.id)}
                          icon={isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        >
                          {post.comentarios.length} comentário{post.comentarios.length !== 1 ? "s" : ""}
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setCommentingId(commentingId === post.id ? null : post.id);
                          if (!isExpanded && post.comentarios.length > 0) setExpandedId(post.id);
                        }}
                        icon={<MessageSquare size={14} />}
                      >
                        Comentar
                      </Button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && post.comentarios.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-3">
                          {post.comentarios.map((comment) => (
                            <div key={comment.id} className="flex items-start gap-2 pl-4 border-l-2 border-acc/20">
                              <div className="w-7 h-7 rounded-full bg-elevated flex items-center justify-center flex-shrink-0">
                                <span className="font-dm text-[10px] font-bold text-ink-2">
                                  {getInitials(comment.autor_nome)}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-dm text-xs font-semibold text-[var(--text-primary)]">
                                    {comment.autor_nome}
                                  </span>
                                  <span className="font-dm text-xs text-ink-4">
                                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                                  </span>
                                </div>
                                <p className="font-dm text-sm text-ink-2">
                                  {comment.texto}
                                </p>
                                <div className="mt-1">
                                  <ReacaoBar
                                    tipoEntidade="comentario"
                                    entidadeId={comment.id}
                                    reacoes={comment.reacoes}
                                    onReact={refresh}
                                    compact
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {commentingId === post.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                          <div className="flex gap-2">
                            <input
                              value={commentTexts[post.id] || ""}
                              onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                              placeholder="Escreva um comentário..."
                              onKeyDown={(e) => e.key === "Enter" && handleComment(post.id)}
                              className="flex-1 px-3.5 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors placeholder:text-[var(--text-tertiary)]"
                            />
                            <Button size="sm" onClick={() => handleComment(post.id)} disabled={!(commentTexts[post.id] || "").trim()} icon={<Send size={14} />}>
                              Enviar
                            </Button>
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

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Novo Post">
        <div className="space-y-4">
          <Input
            label="Título (opcional)"
            value={form.titulo}
            onChange={(val) => setForm({ ...form, titulo: val })}
            placeholder="Título do post"
          />
          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Conteúdo <span className="text-red-400">*</span>
            </label>
            <RichEditor
              content={form.corpo}
              onChange={(html) => setForm({ ...form, corpo: html })}
              placeholder="Escreva o conteúdo do post..."
              minHeight="150px"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!form.corpo}>
              Publicar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
