"use client";
import { useEffect, useRef, useCallback, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZES = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" };

const INPUT_SELECTOR = 'input:not([disabled]):not([type="hidden"]), textarea:not([disabled])';
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ isOpen, onClose, title, children, size = "md" }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const didAutoFocusRef = useRef(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab" && dialogRef.current) {
        const focusableEls = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusableEls.length === 0) return;
        const first = focusableEls[0];
        const last = focusableEls[focusableEls.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) {
      didAutoFocusRef.current = false;
      return;
    }

    // Only auto-focus ONCE when the modal first opens
    if (!didAutoFocusRef.current) {
      didAutoFocusRef.current = true;
      previousFocusRef.current = document.activeElement as HTMLElement | null;

      // Focus the first INPUT/TEXTAREA, not the close button
      requestAnimationFrame(() => {
        if (dialogRef.current) {
          const firstInput = dialogRef.current.querySelector<HTMLElement>(INPUT_SELECTOR);
          if (firstInput) {
            firstInput.focus();
          } else {
            // Fallback: focus the dialog itself so keyboard events work
            dialogRef.current.focus();
          }
        }
      });
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // Restore focus when modal closes
  useEffect(() => {
    if (!isOpen && previousFocusRef.current) {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Prevent clicks inside the dialog from bubbling to the backdrop
  const handleDialogClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: "var(--modal-backdrop)" }}
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`relative w-full ${SIZES[size]} bg-[var(--bg-card-elevated)] rounded-2xl dark:rounded-2xl border border-[var(--border-default)] max-h-[85vh] flex flex-col overflow-hidden outline-none`}
            style={{ boxShadow: "0 24px 48px rgba(0,0,0,.4)", maxWidth: `min(${size === 'sm' ? '28rem' : size === 'md' ? '32rem' : '42rem'}, 95vw)` }}
            onClick={handleDialogClick}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)]">
              <h2 id={titleId} className="font-fraunces font-bold text-lg text-[var(--text-primary)]">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Fechar"
                tabIndex={-1}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors"
              >
                <X size={18} className="text-[var(--text-tertiary)]" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto flex-1 text-[var(--text-secondary)]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
