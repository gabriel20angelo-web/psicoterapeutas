"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import type { ToastItem } from "@/contexts/ToastContext";
import { EASE } from "@/lib/animations";

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const colors = {
  success: "bg-[var(--bg-card-elevated)] border border-[var(--green-border)] text-[var(--text-primary)]",
  error: "bg-[var(--bg-card-elevated)] border border-[var(--red-border)] text-[var(--text-primary)]",
  warning: "bg-[var(--bg-card-elevated)] border border-[var(--amber-border)] text-[var(--text-primary)]",
  info: "bg-[var(--bg-card-elevated)] border border-[var(--border-orange)] text-[var(--text-primary)]",
} as const;

const iconColors = {
  success: "text-[var(--green-text)]",
  error: "text-[var(--red-text)]",
  warning: "text-[var(--amber-text)]",
  info: "text-[var(--orange-400)]",
} as const;

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const Icon = icons[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.3, ease: EASE }}
      className={`relative flex items-center gap-3 rounded-[14px] shadow-[0_8px_32px_rgba(0,0,0,.25)] px-4 py-3.5 min-w-[300px] max-w-[420px] font-dm text-sm overflow-hidden ${colors[toast.type]}`}
    >
      <Icon className={`h-[18px] w-[18px] shrink-0 ${iconColors[toast.type]}`} />
      <span className="flex-1">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => { toast.action!.onClick(); onDismiss(toast.id); }}
          className="shrink-0 underline underline-offset-2 font-medium hover:opacity-80 transition-opacity"
        >
          {toast.action.label}
        </button>
      )}
      <button onClick={() => onDismiss(toast.id)} className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors" aria-label="Fechar notificacao">
        <X className="h-4 w-4" />
      </button>
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-[2px] rounded-b-[14px]"
        style={{
          background: "var(--orange-400)",
          animation: `toastBar ${toast.duration}ms linear forwards`,
          width: "100%",
        }}
      />
    </motion.div>
  );
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-[72px] right-5 z-[250] flex flex-col items-end space-y-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard toast={t} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
