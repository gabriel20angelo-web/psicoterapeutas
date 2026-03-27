"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Flame, Timer, Target } from "lucide-react";
import Shell from "@/components/Shell";
import ForjaNav from "@/components/forja/ForjaNav";
import { useToast } from "@/contexts/ToastContext";
import { fadeUp, staggerChild } from "@/lib/animations";
import {
  getConfigTimer,
  updateConfigTimer,
  getMetaDiaria,
  setMetaDiaria,
  type ConfigTimer,
} from "@/lib/forja-data";

/* ── Number Input ─────────────────────────────── */
function NumberField({
  label,
  value,
  onChange,
  min = 1,
  max = 120,
  suffix = "min",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span
        className="font-dm text-sm"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          className="w-16 px-2 py-1.5 rounded-lg font-dm text-sm text-center border outline-none transition-colors"
          style={{
            background: "var(--bg-input)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
        <span
          className="font-dm text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          {suffix}
        </span>
      </div>
    </div>
  );
}

/* ── Toggle ───────────────────────────────────── */
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span
        className="font-dm text-sm"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </span>
      <button
        onClick={() => onChange(!checked)}
        className="relative w-10 h-5 rounded-full transition-colors"
        style={{
          background: checked ? "var(--orange-500)" : "var(--border-default)",
        }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{
            left: 2,
            transform: checked ? "translateX(20px)" : "translateX(0)",
          }}
        />
      </button>
    </div>
  );
}

/* ── Main Page ────────────────────────────────── */
export default function ForjaConfigPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<ConfigTimer | null>(null);
  const [metaHoras, setMetaHoras] = useState(0);
  const [metaMinutos, setMetaMinutos] = useState(0);

  const reload = useCallback(() => {
    const c = getConfigTimer();
    setConfig(c);
    const metaSeg = getMetaDiaria();
    setMetaHoras(Math.floor(metaSeg / 3600));
    setMetaMinutos(Math.floor((metaSeg % 3600) / 60));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleTimerChange = (field: keyof ConfigTimer, value: number | boolean) => {
    if (!config) return;
    // Duration fields are stored in seconds but displayed in minutes
    const isMinuteField =
      field === "duracao_pomodoro" ||
      field === "duracao_pausa" ||
      field === "duracao_pausa_longa";
    const storedValue = isMinuteField && typeof value === "number" ? value * 60 : value;
    const updated = { ...config, [field]: storedValue };
    updateConfigTimer(updated);
    setConfig(updated);
    toast("Configuração salva", { type: "success" });
  };

  const handleMetaChange = (horas: number, minutos: number) => {
    setMetaHoras(horas);
    setMetaMinutos(minutos);
    const totalSeg = horas * 3600 + minutos * 60;
    setMetaDiaria(totalSeg);
    toast("Meta atualizada", { type: "success" });
  };

  if (!config) return null;

  return (
    <Shell>
      {/* Header */}
      <motion.div {...fadeUp()} className="flex items-center gap-3 mb-6">
        <Flame size={28} style={{ color: "var(--orange-500)" }} />
        <div>
          <h1
            className="font-fraunces font-bold text-2xl"
            style={{ color: "var(--text-primary)" }}
          >
            Forja
          </h1>
          <p
            className="font-dm text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Foco e produtividade
          </p>
        </div>
      </motion.div>

      <ForjaNav />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Timer section */}
        <motion.div
          {...staggerChild(0)}
          className="rounded-2xl p-6"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Timer size={18} style={{ color: "var(--orange-500)" }} />
            <h2
              className="font-fraunces font-semibold text-base"
              style={{ color: "var(--text-primary)" }}
            >
              Timer
            </h2>
          </div>

          <div
            className="divide-y"
            style={{ borderColor: "var(--border-default)" }}
          >
            <NumberField
              label="Duração do Pomodoro"
              value={Math.floor(config.duracao_pomodoro / 60)}
              onChange={(v) => handleTimerChange("duracao_pomodoro", v)}
            />
            <NumberField
              label="Pausa curta"
              value={Math.floor(config.duracao_pausa / 60)}
              onChange={(v) => handleTimerChange("duracao_pausa", v)}
            />
            <NumberField
              label="Pausa longa"
              value={Math.floor(config.duracao_pausa_longa / 60)}
              onChange={(v) => handleTimerChange("duracao_pausa_longa", v)}
            />
            <NumberField
              label="Pomodoros até pausa longa"
              value={config.pomodoros_ate_pausa_longa}
              onChange={(v) => handleTimerChange("pomodoros_ate_pausa_longa", v)}
              suffix=""
              max={10}
            />
            <Toggle
              label="Auto-iniciar pomodoro"
              checked={config.auto_iniciar_pomodoro ?? false}
              onChange={(v) => handleTimerChange("auto_iniciar_pomodoro", v)}
            />
            <Toggle
              label="Auto-iniciar pausa"
              checked={config.auto_iniciar_pausa ?? false}
              onChange={(v) => handleTimerChange("auto_iniciar_pausa", v)}
            />
          </div>
        </motion.div>

        {/* Meta section */}
        <motion.div
          {...staggerChild(1)}
          className="rounded-2xl p-6 self-start"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} style={{ color: "var(--orange-500)" }} />
            <h2
              className="font-fraunces font-semibold text-base"
              style={{ color: "var(--text-primary)" }}
            >
              Meta Diária de Foco
            </h2>
          </div>

          <div
            className="divide-y"
            style={{ borderColor: "var(--border-default)" }}
          >
            <NumberField
              label="Horas"
              value={metaHoras}
              onChange={(v) => handleMetaChange(v, metaMinutos)}
              min={0}
              max={24}
              suffix="h"
            />
            <NumberField
              label="Minutos"
              value={metaMinutos}
              onChange={(v) => handleMetaChange(metaHoras, v)}
              min={0}
              max={59}
              suffix="min"
            />
          </div>

          <div
            className="mt-4 p-3 rounded-lg"
            style={{ background: "var(--bg-input)" }}
          >
            <p
              className="font-dm text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Meta atual:{" "}
              <span style={{ color: "var(--orange-500)", fontWeight: 600 }}>
                {metaHoras}h {metaMinutos}min
              </span>{" "}
              de foco por dia
            </p>
          </div>
        </motion.div>
      </div>
    </Shell>
  );
}
