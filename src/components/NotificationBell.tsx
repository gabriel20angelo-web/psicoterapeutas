"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, Clock, FileText, Users, Megaphone, BookOpen, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getNotificacoes, getUnreadCount, markAsRead, markAllAsRead } from "@/lib/data";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

const TIPO_ICONS: Record<string, ReactNode> = {
  lembrete_sessao: <Clock size={16} className="text-[var(--text-secondary)]" />,
  resumo_dia: <FileText size={16} className="text-[var(--text-secondary)]" />,
  confirmacao: <FileText size={16} className="text-[var(--text-secondary)]" />,
  paciente_inativo: <Users size={16} className="text-[var(--text-secondary)]" />,
  lembrete_supervisao: <Megaphone size={16} className="text-[var(--text-secondary)]" />,
  atividade_formacao: <BookOpen size={16} className="text-[var(--text-secondary)]" />,
  atividade_comunidade: <Users size={16} className="text-[var(--text-secondary)]" />,
};

const DEFAULT_ICON = <Bell size={16} className="text-[var(--text-secondary)]" />;

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [notifs, setNotifs] = useState<ReturnType<typeof getNotificacoes>>([]);
  const [unread, setUnread] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setNotifs(getNotificacoes());
    setUnread(getUnreadCount());
    setMounted(true);
  }, []);

  const refresh = () => { setNotifs(getNotificacoes()); setUnread(getUnreadCount()); };
  const handleRead = (id: string) => { markAsRead(id); refresh(); };
  const handleReadAll = () => { markAllAsRead(); refresh(); };

  const filtered = filter === 'unread' ? notifs.filter(n => !n.lida) : notifs;

  return (
    <>
      <button
        onClick={() => { setOpen(true); refresh(); }}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors"
        aria-label="Notificações"
      >
        <Bell size={18} className="text-[var(--text-secondary)]" />
        {mounted && unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center min-w-[18px] h-[18px]">
            {unread}
          </span>
        )}
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="fixed inset-y-0 right-0 z-[9999] w-[380px] max-w-[calc(100vw-1rem)] bg-[var(--bg-card)] border-l border-[var(--border-default)] shadow-float flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
                  <h2 className="font-fraunces font-bold text-lg text-[var(--text-primary)]">Notificações</h2>
                  <div className="flex items-center gap-2">
                    {unread > 0 && (
                      <button onClick={handleReadAll} className="font-dm text-xs text-[var(--orange-500)] hover:underline">
                        Marcar todas
                      </button>
                    )}
                    <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors">
                      <X size={18} className="text-[var(--text-secondary)]" />
                    </button>
                  </div>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 px-5 pt-3 pb-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-dm text-xs font-medium transition-colors ${filter === 'all' ? 'bg-[var(--orange-glow)] text-[var(--orange-500)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setFilter('unread')}
                    className={`px-3 py-1.5 rounded-lg font-dm text-xs font-medium transition-colors ${filter === 'unread' ? 'bg-[var(--orange-glow)] text-[var(--orange-500)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                  >
                    Não lidas {unread > 0 && `(${unread})`}
                  </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="p-8 text-center font-dm text-sm text-[var(--text-tertiary)]">
                      {filter === 'unread' ? 'Todas lidas' : 'Sem notificações'}
                    </p>
                  ) : (
                    filtered.map(n => (
                      <button
                        key={n.id}
                        onClick={() => {
                          handleRead(n.id);
                          setOpen(false);
                          if (n.link) router.push(n.link);
                        }}
                        className="w-full text-left flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border-subtle)]"
                        style={!n.lida ? { background: 'var(--orange-glow)' } : undefined}
                      >
                        <span className="mt-0.5 flex-shrink-0">{TIPO_ICONS[n.tipo] || DEFAULT_ICON}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-dm text-sm leading-snug ${!n.lida ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                            {n.titulo}
                          </p>
                          {n.mensagem && <p className="font-dm text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{n.mensagem}</p>}
                          <p className="font-dm text-[10px] text-[var(--text-tertiary)] mt-1">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                        {!n.lida && <span className="w-2 h-2 rounded-full bg-[var(--orange-500)] mt-2 flex-shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
