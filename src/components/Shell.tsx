"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BackgroundEffects from "./BackgroundEffects";
import BottomNav from "./BottomNav";
import { initializeData, isDataReady } from "@/lib/data";
import { initAcademicoSync } from "@/lib/academico-data";
import { initForjaSync } from "@/lib/forja-data";
import { initUsinaSync } from "@/lib/usina-data";
import { initConteudoSync } from "@/lib/conteudo-data";

const FIXED_USER_ID = process.env.NEXT_PUBLIC_USER_ID || "00000000-0000-0000-0000-000000000001";

const SHORTCUTS = [
  { key: "n", label: "Nova atividade / Agenda", route: "/agenda" },
  { key: "t", label: "Agenda (hoje)", route: "/agenda" },
  { key: "p", label: "Pacientes", route: "/pacientes" },
  { key: "?", label: "Mostrar atalhos", route: null },
];

function ShortcutsHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-[360px] mx-4 card-base p-6"
          >
            <h2 className="font-fraunces font-bold text-lg text-[var(--text-primary)] mb-4">Atalhos do teclado</h2>
            <div className="space-y-2.5">
              {SHORTCUTS.map((s) => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="font-dm text-sm text-[var(--text-secondary)]">{s.label}</span>
                  <kbd className="font-mono text-xs bg-[var(--bg-input)] px-2 py-1 rounded-lg text-[var(--text-primary)] font-semibold min-w-[28px] text-center border border-[var(--border-default)]">
                    {s.key}
                  </kbd>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="font-dm text-sm text-[var(--text-secondary)]">Busca global</span>
                <kbd className="font-mono text-xs bg-[var(--bg-input)] px-2 py-1 rounded-lg text-[var(--text-primary)] font-semibold border border-[var(--border-default)]">Ctrl+K</kbd>
              </div>
            </div>
            <p className="font-dm text-[11px] text-[var(--text-tertiary)] mt-4">
              Atalhos funcionam quando nenhum campo de texto está focado.
            </p>
            <div className="flex justify-end mt-4">
              <button onClick={onClose} className="font-dm text-sm text-[var(--orange-500)] hover:underline">Fechar</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    Promise.all([
      initializeData(FIXED_USER_ID),
      initAcademicoSync(),
      initForjaSync(),
      initUsinaSync(),
      initConteudoSync(),
    ]).then(() => setDataReady(true)).catch(() => setDataReady(true));
  }, []);

  const handleGlobalKeydown = useCallback(
    (e: KeyboardEvent) => {
      if (document.querySelector("[role='dialog']")) return;
      const el = document.activeElement;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((el as HTMLElement)?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "n": case "t": e.preventDefault(); router.push("/agenda"); break;
        case "p": e.preventDefault(); router.push("/pacientes"); break;
        case "?": e.preventDefault(); setShowShortcuts(true); break;
      }
    },
    [router]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKeydown);
    return () => document.removeEventListener("keydown", handleGlobalKeydown);
  }, [handleGlobalKeydown]);

  if (!dataReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
        <div className="w-6 h-6 border-2 border-[var(--orange-500)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] relative">
      <BackgroundEffects />
      <Sidebar />
      <Header />
      <main id="main-content" className="lg:ml-[68px] min-h-screen transition-all duration-300 relative" style={{ paddingTop: 56 }}>
        <div className="page-enter">
          <div className="max-w-[1100px] mx-auto px-5 md:px-8 lg:px-10 py-8 relative z-[1]">
            {children}
          </div>
        </div>
      </main>
      <BottomNav />
      <ShortcutsHelpModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
