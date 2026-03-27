"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, X, Reply, Plus, Pencil, Trash2, Check } from "lucide-react";
import ReacaoBar from "@/components/comunicacao/ReacaoBar";
import { getChatMensagens, enviarMensagem, editarMensagem, deletarMensagem } from "@/lib/comunicacao-data";
import { getInitials } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ChatMensagem } from "@/types/comunicacao";
import { useAuth } from "@/contexts/AuthContext";

const AVATAR_COLORS: Record<string, string> = {
  "t-001": "bg-[#2B9E8B]",
  "t-002": "bg-indigo-500",
  "t-003": "bg-pink-500",
  "t-004": "bg-amber-500",
  "admin-1": "bg-gray-500",
};

function getAvatarColor(id: string) {
  return AVATAR_COLORS[id] || "bg-[#2B9E8B]";
}

function formatDateSeparator(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, "d 'de' MMMM", { locale: ptBR });
}

interface Props {
  onRefresh: () => void;
}

export default function ChatSection({ onRefresh }: Props) {
  const { user } = useAuth();
  const [texto, setTexto] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMensagem | null>(null);
  const [openReactionId, setOpenReactionId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editMsgText, setEditMsgText] = useState("");
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refresh = () => { forceUpdate((n) => n + 1); onRefresh(); };

  const mensagens = getChatMensagens();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens.length]);

  const handleSend = () => {
    if (!texto.trim()) return;
    enviarMensagem({
      texto: texto.trim(),
      reply_to: replyTo?.id,
      reply_preview: replyTo ? replyTo.texto.slice(0, 80) + (replyTo.texto.length > 80 ? "..." : "") : undefined,
      reply_autor: replyTo?.autor_nome,
    });
    setTexto("");
    setReplyTo(null);
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    refresh();
  };

  const handleReply = (msg: ChatMensagem) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  };

  const handleEditStart = (msg: ChatMensagem) => {
    setEditingMsgId(msg.id);
    setEditMsgText(msg.texto);
  };

  const handleEditSave = () => {
    if (editingMsgId && editMsgText.trim()) {
      editarMensagem(editingMsgId, editMsgText.trim());
      setEditingMsgId(null);
      setEditMsgText("");
      refresh();
    }
  };

  const handleDelete = (id: string) => {
    deletarMensagem(id);
    setDeletingMsgId(null);
    refresh();
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "auto";
    target.style.height = Math.min(target.scrollHeight, 120) + "px";
  };

  const shouldShowHeader = (msg: ChatMensagem, idx: number) => {
    if (idx === 0) return true;
    const prev = mensagens[idx - 1];
    return prev.autor_id !== msg.autor_id;
  };

  const shouldShowDateSeparator = (msg: ChatMensagem, idx: number): boolean => {
    if (idx === 0) return true;
    const prev = mensagens[idx - 1];
    const prevDate = new Date(prev.created_at);
    const currDate = new Date(msg.created_at);
    return prevDate.toDateString() !== currDate.toDateString();
  };

  return (
    <div
      className="flex flex-col card-base overflow-hidden"
      style={{ height: "calc(100vh - 300px)", minHeight: 400 }}
    >
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
        {mensagens.map((msg, idx) => {
          const isOwn = msg.autor_id === user?.id;
          const showHeader = shouldShowHeader(msg, idx);
          const isReactionOpen = openReactionId === msg.id;
          const showDateSep = shouldShowDateSeparator(msg, idx);

          return (
            <div key={msg.id}>
              {showDateSep && (
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                  <span className="text-xs text-[var(--text-tertiary)] font-dm font-medium px-2">
                    {formatDateSeparator(new Date(msg.created_at))}
                  </span>
                  <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${isOwn ? "justify-end" : "justify-start"} ${showHeader ? "mt-4" : "mt-0.5"}`}
              >
                <div className={`flex gap-2.5 max-w-[85%] sm:max-w-[75%] ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Avatar */}
                  {!isOwn && showHeader ? (
                    <div className={`w-9 h-9 rounded-full ${getAvatarColor(msg.autor_id)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className="font-dm text-[10px] font-bold text-white">
                        {getInitials(msg.autor_nome)}
                      </span>
                    </div>
                  ) : !isOwn ? (
                    <div className="w-9 flex-shrink-0" />
                  ) : null}

                  <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                    {/* Author name */}
                    {showHeader && !isOwn && (
                      <span className="font-dm text-xs font-semibold text-[var(--text-primary)] mb-1 ml-1">
                        {msg.autor_nome}
                      </span>
                    )}

                    {/* Message bubble */}
                    <div className="group relative">
                      {editingMsgId === msg.id ? (
                        <div className="space-y-1.5">
                          <textarea
                            value={editMsgText}
                            onChange={e => setEditMsgText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); } if (e.key === 'Escape') { setEditingMsgId(null); } }}
                            rows={2}
                            autoFocus
                            className="w-full px-3.5 py-2 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--orange-500)] text-[var(--text-primary)] outline-none resize-none"
                          />
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => setEditingMsgId(null)} className="px-2 py-1 rounded-lg font-dm text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">Cancelar</button>
                            <button onClick={handleEditSave} className="px-2 py-1 rounded-lg font-dm text-xs text-white bg-[var(--orange-500)] hover:brightness-110 transition-all flex items-center gap-1"><Check size={12} /> Salvar</button>
                          </div>
                        </div>
                      ) : deletingMsgId === msg.id ? (
                        <div className="px-3.5 py-2.5 rounded-2xl bg-[var(--red-bg)] border border-[var(--red-border)]">
                          <p className="font-dm text-xs text-[var(--red-text)] mb-2">Excluir esta mensagem?</p>
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => setDeletingMsgId(null)} className="px-2 py-1 rounded-lg font-dm text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">Não</button>
                            <button onClick={() => handleDelete(msg.id)} className="px-2 py-1 rounded-lg font-dm text-xs text-white bg-red-500 hover:bg-red-600 transition-colors">Excluir</button>
                          </div>
                        </div>
                      ) : (
                      <div
                        className={`px-4 py-2.5 rounded-2xl font-dm text-sm leading-relaxed ${
                          isOwn
                            ? "bg-[#2B9E8B] text-white rounded-br-md shadow-[0_2px_8px_rgba(43,158,139,.2)]"
                            : "bg-[var(--bg-card-elevated)] text-[var(--text-primary)] rounded-bl-md border border-[var(--border-subtle)]"
                        }`}
                      >
                        {/* Reply quote */}
                        {msg.reply_to && (
                          <div
                            className={`mb-2 px-3 py-2 rounded-lg text-xs border-l-2 ${
                              isOwn
                                ? "bg-white/15 border-l-white/50"
                                : "bg-[var(--bg-hover)] border-l-[#2B9E8B]"
                            }`}
                          >
                            <span className={`font-semibold block ${isOwn ? "text-white/80" : "text-[#2B9E8B]"}`}>
                              {msg.reply_autor}
                            </span>
                            <span className={isOwn ? "text-white/70" : "text-[var(--text-secondary)]"}>
                              {msg.reply_preview}
                            </span>
                          </div>
                        )}
                        {msg.texto}
                      </div>
                      )}

                      {/* Actions */}
                      {editingMsgId !== msg.id && deletingMsgId !== msg.id && (
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity ${
                          isOwn ? "right-full mr-1" : "left-full ml-1"
                        }`}
                      >
                        <button
                          onClick={() => handleReply(msg)}
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                          title="Responder"
                        >
                          <Reply size={14} />
                        </button>
                        {isOwn && (
                          <>
                            <button
                              onClick={() => handleEditStart(msg)}
                              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeletingMsgId(msg.id)}
                              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--red-bg)] transition-colors text-[var(--text-tertiary)] hover:text-[var(--red-text)]"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setOpenReactionId(isReactionOpen ? null : msg.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                          title="Reagir"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      )}

                      {/* Reactions */}
                      {(msg.reacoes.length > 0 || isReactionOpen) && (
                        <div className="mt-1">
                          <ReacaoBar
                            tipoEntidade="chat"
                            entidadeId={msg.id}
                            reacoes={msg.reacoes}
                            onReact={() => { setOpenReactionId(null); refresh(); }}
                            compact
                          />
                        </div>
                      )}
                    </div>

                    {/* Time */}
                    <span className={`font-dm text-[10px] text-[var(--text-tertiary)] mt-0.5 ${isOwn ? "mr-1" : "ml-1"}`}>
                      {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="px-5 py-2.5 bg-[var(--bg-card-elevated)] border-t border-[var(--border-subtle)] flex items-center gap-2">
          <div className="flex-1 border-l-2 border-[#2B9E8B] pl-2.5">
            <span className="font-dm text-xs font-semibold text-[#2B9E8B]">{replyTo.autor_nome}</span>
            <p className="font-dm text-xs text-[var(--text-secondary)] truncate">
              {replyTo.texto}
            </p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <div className="flex gap-2.5 items-end">
          <textarea
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onInput={handleTextareaInput}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Digite sua mensagem..."
            rows={1}
            style={{ maxHeight: 120 }}
            className="flex-1 px-4 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-strong)] text-[var(--text-primary)] outline-none focus:border-[#2B9E8B] transition-colors placeholder:text-[var(--text-tertiary)] resize-none overflow-y-auto"
          />
          <button
            onClick={handleSend}
            disabled={!texto.trim()}
            className="w-10 h-10 rounded-xl bg-[#2B9E8B] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0 shadow-[0_2px_8px_rgba(43,158,139,.25)]"
          >
            <Send size={18} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
