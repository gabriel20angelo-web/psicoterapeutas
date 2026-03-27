"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import type { ReacaoAgregada, EmojiReacao, TipoEntidade } from "@/types/comunicacao";
import { toggleReacao } from "@/lib/comunicacao-data";

// SVG emoji components
function HeartSvg({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="#ef4444" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
}
function ThumbsUpSvg({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#C84B31" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>;
}
function LaughSvg({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
}
function SurpriseSvg({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="16" r="2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
}
function SadSvg({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
}

const EMOJIS: { emoji: EmojiReacao; icon: (size?: number) => React.ReactNode; label: string }[] = [
  { emoji: 'coracao', icon: (s) => <HeartSvg size={s} />, label: 'Amei' },
  { emoji: 'joinha', icon: (s) => <ThumbsUpSvg size={s} />, label: 'Curtir' },
  { emoji: 'risada', icon: (s) => <LaughSvg size={s} />, label: 'Haha' },
  { emoji: 'surpresa', icon: (s) => <SurpriseSvg size={s} />, label: 'Surpreso' },
  { emoji: 'tristeza', icon: (s) => <SadSvg size={s} />, label: 'Triste' },
];

export function getEmojiIcon(emoji: EmojiReacao, size = 16): React.ReactNode {
  return EMOJIS.find(e => e.emoji === emoji)?.icon(size) || null;
}

interface Props {
  tipoEntidade: TipoEntidade;
  entidadeId: string;
  reacoes: ReacaoAgregada[];
  onReact: () => void;
  compact?: boolean;
}

export default function ReacaoBar({ tipoEntidade, entidadeId, reacoes, onReact, compact }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) { document.addEventListener("mousedown", handleClick); return () => document.removeEventListener("mousedown", handleClick); }
  }, [open]);

  const handleClick = (emoji: EmojiReacao) => {
    toggleReacao(tipoEntidade, entidadeId, emoji);
    onReact();
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reacoes.map(r => {
        const emojiData = EMOJIS.find(e => e.emoji === r.emoji);
        return (
          <motion.button
            key={r.emoji}
            whileTap={{ scale: 1.2 }}
            onClick={() => handleClick(r.emoji)}
            title={r.usuarios.join(', ')}
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-dm transition-colors ${r.minha ? 'bg-acc/15 border border-acc/30' : 'bg-elevated border border-transparent hover:border-line dark:hover:border-[#444]'}`}
          >
            {emojiData?.icon(compact ? 13 : 14)}
            <span className={`font-medium ${r.minha ? 'text-acc' : 'text-ink-2'}`}>{r.count}</span>
          </motion.button>
        );
      })}
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          aria-label="Adicionar reação"
          className={`${compact ? 'w-6 h-6' : 'w-7 h-7'} rounded-full flex items-center justify-center transition-colors ${open ? 'bg-elevated text-ink-2' : 'text-ink-4 hover:text-ink-2 hover:bg-elevated dark:hover:bg-[#252525]'}`}
        >
          <Plus size={compact ? 12 : 14} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full left-0 mb-1 flex gap-0.5 p-1.5 rounded-xl bg-[var(--bg-card-elevated)] border border-[var(--border-default)] shadow-lg z-50"
            >
              {EMOJIS.map(e => (
                <motion.button
                  key={e.emoji}
                  whileTap={{ scale: 1.3 }}
                  onClick={() => handleClick(e.emoji)}
                  title={e.label}
                  aria-label={e.label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-elevated dark:hover:bg-[#333] transition-colors"
                >
                  {e.icon(18)}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
