"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BackgroundEffects from "./BackgroundEffects";
import OnboardingModal from "./OnboardingModal";
import { useAuth, forceLogout } from "@/contexts/AuthContext";
import { setComunicacaoUser } from "@/lib/comunicacao-data";
import { initializeData, isDataReady } from "@/lib/data";

const SHORTCUTS = [
  { key: "n", label: "Nova atividade / Agenda", route: "/agenda" },
  { key: "t", label: "Agenda (hoje)", route: "/agenda" },
  { key: "p", label: "Pacientes", route: "/pacientes" },
  { key: "e", label: "Equipe", route: "/comunicacao" },
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
  const { user, profile, loading, profileReady, isApproved } = useAuth();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      setComunicacaoUser(profile.id, profile.full_name);
      initializeData(profile.id).then(() => setDataReady(true)).catch(() => setDataReady(true));
    }
  }, [profile]);

  const handleGlobalKeydown = useCallback(
    (e: KeyboardEvent) => {
      // Block all shortcuts when a modal/dialog is open
      if (document.querySelector("[role='dialog']")) return;

      const el = document.activeElement;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if ((el as HTMLElement)?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "n": case "t": e.preventDefault(); router.push("/agenda"); break;
        case "p": e.preventDefault(); router.push("/pacientes"); break;
        case "e": e.preventDefault(); router.push("/comunicacao"); break;
        case "?": e.preventDefault(); setShowShortcuts(true); break;
      }
    },
    [router]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKeydown);
    return () => document.removeEventListener("keydown", handleGlobalKeydown);
  }, [handleGlobalKeydown]);

  // Loading auth, profile check, or data initialization
  if (loading || (user && !profileReady) || (user && profileReady && isApproved && !dataReady)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
        <div className="w-6 h-6 border-2 border-[var(--orange-500)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!user) return null;

  // Awaiting approval (only show AFTER DB check completed)
  if (profileReady && !isApproved) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] relative">
        <BackgroundEffects />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-[420px] relative z-10">
            <div className="text-center mb-8">
              <h1 className="font-fraunces font-bold text-3xl text-[var(--text-primary)]">
                Allos <span className="text-[var(--orange-500)]">Terapeutas</span>
              </h1>
            </div>
            <div className="card-base p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--orange-500)]/10 flex items-center justify-center mx-auto mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--orange-500)]"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h2 className="font-fraunces font-bold text-xl text-[var(--text-primary)] mb-3">Aguardando aprovação</h2>
              <p className="font-dm text-sm text-[var(--text-secondary)] mb-2">Sua conta foi criada com sucesso!</p>
              <p className="font-dm text-sm text-[var(--text-tertiary)] mb-6">
                Um administrador precisa aprovar seu acesso antes de você poder usar o painel. Você será notificado quando sua conta for aprovada.
              </p>
              <div className="px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] mb-6">
                <p className="font-dm text-xs text-[var(--text-tertiary)]">Conectado como</p>
                <p className="font-dm text-sm font-medium text-[var(--text-primary)]">{profile?.full_name || user?.email}</p>
              </div>
              <button onClick={forceLogout} className="font-dm text-sm text-[var(--orange-500)] hover:underline">
                Sair e usar outra conta
              </button>
            </div>
          </div>
        </div>
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
      <ShortcutsHelpModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <OnboardingModal />
    </div>
  );
}
