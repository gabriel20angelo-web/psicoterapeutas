"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Flame, FileText, BookOpen, Shield } from "lucide-react";
import {
  getModulosConfig, saveModulosConfig, isOnboardingDone, markOnboardingDone,
  type ModuloConfig,
} from "@/lib/modulos-config";

const ICONE_MAP: Record<string, React.ComponentType<any>> = {
  sparkles: Sparkles,
  flame: Flame,
  "file-text": FileText,
  "book-open": BookOpen,
  shield: Shield,
};

export default function OnboardingModal() {
  const [show, setShow] = useState(false);
  const [modulos, setModulos] = useState<ModuloConfig[]>([]);

  useEffect(() => {
    if (!isOnboardingDone()) {
      setModulos(getModulosConfig());
      // Small delay for smooth entrance
      setTimeout(() => setShow(true), 500);
    }
  }, []);

  const handleToggle = (id: string) => {
    setModulos(prev => prev.map(m =>
      m.id === id && !m.fixo ? { ...m, ativo: !m.ativo } : m
    ));
  };

  const handleFinish = () => {
    saveModulosConfig(modulos);
    markOnboardingDone();
    setShow(false);
    // Reload to apply sidebar changes
    window.location.reload();
  };

  if (!show) return null;

  const opcionais = modulos.filter(m => !m.fixo);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[95vw] sm:max-w-[520px] mx-4 rounded-2xl overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
            boxShadow: "0 24px 64px rgba(0,0,0,.4)",
          }}
        >
          {/* Header */}
          <div className="p-6 pb-4 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--orange-glow)" }}
            >
              <Sparkles size={28} style={{ color: "var(--orange-500)" }} />
            </div>
            <h2
              className="font-fraunces font-bold text-2xl mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Bem-vindo ao Allos
            </h2>
            <p
              className="font-dm text-sm leading-relaxed max-w-sm mx-auto"
              style={{ color: "var(--text-secondary)" }}
            >
              Escolha quais ferramentas você deseja utilizar. Você pode mudar isso a qualquer momento nas configurações.
            </p>
          </div>

          {/* Fixed modules info */}
          <div className="px-6 mb-3">
            <p
              className="font-dm text-[11px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              Sempre disponíveis
            </p>
            <div className="flex gap-2 flex-wrap">
              {modulos.filter(m => m.fixo).map(m => (
                <span
                  key={m.id}
                  className="px-3 py-1 rounded-full font-dm text-xs font-medium"
                  style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Optional modules */}
          <div className="px-6 pb-2">
            <p
              className="font-dm text-[11px] font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--text-tertiary)" }}
            >
              Ferramentas opcionais
            </p>
            <div className="space-y-2">
              {opcionais.map(m => {
                const Icon = ICONE_MAP[m.icone] || Sparkles;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleToggle(m.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{
                      background: m.ativo ? "var(--orange-glow)" : "var(--bg-input)",
                      border: `1.5px solid ${m.ativo ? "var(--orange-500)" : "var(--border-default)"}`,
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: m.ativo ? "var(--orange-500)" : "var(--bg-hover)",
                      }}
                    >
                      <Icon
                        size={18}
                        style={{ color: m.ativo ? "white" : "var(--text-tertiary)" }}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <p
                        className="font-dm text-sm font-semibold"
                        style={{ color: m.ativo ? "var(--orange-500)" : "var(--text-primary)" }}
                      >
                        {m.label}
                      </p>
                      <p
                        className="font-dm text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {m.descricao}
                      </p>
                    </div>
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{
                        background: m.ativo ? "var(--orange-500)" : "var(--border-default)",
                      }}
                    >
                      {m.ativo && <Check size={14} style={{ color: "white" }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 pt-4">
            <button
              onClick={handleFinish}
              className="w-full py-3 rounded-xl font-dm text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{ background: "var(--orange-500)" }}
            >
              Começar
            </button>
            <p
              className="font-dm text-[11px] text-center mt-3"
              style={{ color: "var(--text-tertiary)" }}
            >
              Você pode alterar estas escolhas em Configurações → Módulos
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
