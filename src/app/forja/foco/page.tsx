"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Shell from "@/components/Shell";
import ForjaNav from "@/components/forja/ForjaNav";
import { useToast } from "@/contexts/ToastContext";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Timer,
  Flame,
  ChevronDown,
} from "lucide-react";
import {
  getTodasAtividades,
  getTodosProjetos,
  createSessao,
  getConfigTimer,
  formatTempo,
} from "@/lib/forja-data";
import type { Atividade, ConfigTimer } from "@/lib/forja-data";

// ─── Types ───

type Mode = "pomodoro" | "cronometro";
type TimerPhase = "work" | "short_break" | "long_break";

// ─── SVG Progress Ring ───

function ProgressRing({
  radius,
  stroke,
  progress,
  color,
  isPaused,
}: {
  radius: number;
  stroke: number;
  progress: number; // 0..1
  color: string;
  isPaused: boolean;
}) {
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <svg
      width={radius * 2}
      height={radius * 2}
      className="transform -rotate-90"
    >
      {/* Background track */}
      <circle
        cx={radius}
        cy={radius}
        r={normalizedRadius}
        fill="none"
        stroke="var(--border-default)"
        strokeWidth={stroke}
        opacity={0.3}
      />
      {/* Progress arc */}
      <circle
        cx={radius}
        cy={radius}
        r={normalizedRadius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        className={`transition-[stroke-dashoffset] duration-1000 linear ${
          isPaused ? "animate-pulse" : ""
        }`}
        style={isPaused ? { opacity: 0.5 } : {}}
      />
    </svg>
  );
}

// ─── Pomodoro Count Dots ───

function PomodoroDots({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2 mt-4">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
            i < completed
              ? "border-[var(--orange-500)] bg-[var(--orange-500)]"
              : "border-[var(--text-tertiary)] bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main Page ───

export default function FocoPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // ─── Config ───
  const [config, setConfig] = useState<ConfigTimer | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [atividadeProjetos, setAtividadeProjetos] = useState<
    Record<string, { nome: string; cor: string }>
  >({});

  // ─── Timer state ───
  const [mode, setMode] = useState<Mode>("pomodoro");
  const [phase, setPhase] = useState<TimerPhase>("work");
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // for pomodoro (seconds)
  const [timeElapsed, setTimeElapsed] = useState(0); // for cronometro (seconds)
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [selectedAtividadeId, setSelectedAtividadeId] = useState<string | null>(null);
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);

  // ─── Refs ───
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const actualSecondsRef = useRef(0);

  // ─── Load config & tasks ───
  useEffect(() => {
    const cfg = getConfigTimer();
    setConfig(cfg);
    setTimeLeft(cfg.duracao_pomodoro);

    const allAtividades = getTodasAtividades();
    const pendentes = allAtividades.filter((t) => t.status === "pendente");
    setAtividades(pendentes);

    // Load project info for each activity
    const projMap: Record<string, { nome: string; cor: string }> = {};
    for (const t of pendentes) {
      if (t.projeto_id) {
        const proj = getTodosProjetos().find(p => p.id === t.projeto_id);
        if (proj) {
          projMap[t.projeto_id] = { nome: proj.nome, cor: proj.cor };
        }
      }
    }
    setAtividadeProjetos(projMap);

    // Pre-select activity from URL parameter
    const atividadeParam = searchParams.get("atividade");
    if (atividadeParam) {
      const found = pendentes.find((a) => a.id === atividadeParam);
      if (found) {
        setSelectedAtividadeId(found.id);
      }
    }
  }, [searchParams]);

  // ─── Derived values ───
  const configDuration = config?.duracao_pomodoro ?? 25 * 60;
  const shortBreakDuration = config?.duracao_pausa ?? 5 * 60;
  const longBreakDuration = config?.duracao_pausa_longa ?? 15 * 60;
  const pomodorosUntilLong = config?.pomodoros_ate_pausa_longa ?? 4;

  // ─── Get current phase duration ───
  const getPhaseDuration = useCallback(
    (p: TimerPhase): number => {
      switch (p) {
        case "work":
          return configDuration;
        case "short_break":
          return shortBreakDuration;
        case "long_break":
          return longBreakDuration;
      }
    },
    [configDuration, shortBreakDuration, longBreakDuration]
  );

  // ─── Clear interval helper ───
  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ─── Record session ───
  const recordSession = useCallback(
    (didComplete: boolean) => {
      if (!startTimeRef.current) return;

      const now = new Date();
      const durationConfig =
        mode === "pomodoro" ? getPhaseDuration(phase) : actualSecondsRef.current;

      createSessao({
        atividade_id: selectedAtividadeId || null,
        tipo: mode,
        duracao_config_seg: durationConfig,
        duracao_real_seg: actualSecondsRef.current,
        completa: didComplete,
        iniciada_em: startTimeRef.current.toISOString(),
        finalizada_em: now.toISOString(),
      });

      toast(
        didComplete
          ? "Sessão completa! Bom trabalho!"
          : "Sessão registrada.",
        { type: didComplete ? "success" : "info" }
      );
    },
    [mode, phase, selectedAtividadeId, getPhaseDuration, toast]
  );

  // ─── Pomodoro: handle phase completion ───
  const handlePhaseComplete = useCallback(() => {
    clearTimer();

    if (phase === "work") {
      // Work phase completed
      recordSession(true);
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);

      // Decide break type
      const nextPhase: TimerPhase =
        newCount % pomodorosUntilLong === 0 ? "long_break" : "short_break";
      setPhase(nextPhase);
      setTimeLeft(getPhaseDuration(nextPhase));
      setIsRunning(false);
      setIsPaused(false);
      actualSecondsRef.current = 0;
      startTimeRef.current = null;

      toast(
        nextPhase === "long_break"
          ? "Hora da pausa longa! Você merece."
          : "Pausa curta — respire um pouco.",
        { type: "info" }
      );
    } else {
      // Break completed
      setPhase("work");
      setTimeLeft(configDuration);
      setIsRunning(false);
      setIsPaused(false);
      actualSecondsRef.current = 0;
      startTimeRef.current = null;

      toast("Pausa finalizada! Pronto para mais um pomodoro?", {
        type: "info",
      });
    }
  }, [
    clearTimer,
    phase,
    pomodoroCount,
    pomodorosUntilLong,
    getPhaseDuration,
    configDuration,
    recordSession,
    toast,
  ]);

  // ─── Tick logic ───
  const tick = useCallback(() => {
    if (mode === "pomodoro") {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Will complete on next render cycle
          setTimeout(() => handlePhaseComplete(), 0);
          return 0;
        }
        return prev - 1;
      });
      actualSecondsRef.current += 1;
    } else {
      // Cronômetro — count up
      setTimeElapsed((prev) => prev + 1);
      actualSecondsRef.current += 1;
    }
  }, [mode, handlePhaseComplete]);

  // ─── Controls ───
  const handlePlay = useCallback(() => {
    if (isRunning && !isPaused) return;

    if (!startTimeRef.current) {
      startTimeRef.current = new Date();
      actualSecondsRef.current = 0;
    }

    setIsRunning(true);
    setIsPaused(false);

    clearTimer();
    intervalRef.current = setInterval(tick, 1000);
  }, [isRunning, isPaused, clearTimer, tick]);

  const handlePause = useCallback(() => {
    if (!isRunning || isPaused) return;
    clearTimer();
    setIsPaused(true);
  }, [isRunning, isPaused, clearTimer]);

  const handleStop = useCallback(() => {
    clearTimer();

    if (isRunning && actualSecondsRef.current > 0) {
      // Record incomplete session (only for work phases)
      if (mode === "cronometro" || phase === "work") {
        recordSession(false);
      }
    }

    // Reset
    setIsRunning(false);
    setIsPaused(false);
    if (mode === "pomodoro") {
      setTimeLeft(getPhaseDuration(phase));
    } else {
      setTimeElapsed(0);
    }
    actualSecondsRef.current = 0;
    startTimeRef.current = null;
  }, [clearTimer, isRunning, mode, phase, getPhaseDuration, recordSession]);

  const handleReset = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
    setPomodoroCount(0);
    setPhase("work");
    if (mode === "pomodoro") {
      setTimeLeft(configDuration);
    } else {
      setTimeElapsed(0);
    }
    actualSecondsRef.current = 0;
    startTimeRef.current = null;
  }, [clearTimer, mode, configDuration]);

  // ─── Mode switch ───
  const switchMode = useCallback(
    (newMode: Mode) => {
      if (isRunning) {
        handleStop();
      }
      setMode(newMode);
      setPhase("work");
      setPomodoroCount(0);
      if (newMode === "pomodoro") {
        setTimeLeft(configDuration);
        setTimeElapsed(0);
      } else {
        setTimeElapsed(0);
        setTimeLeft(0);
      }
      actualSecondsRef.current = 0;
      startTimeRef.current = null;
    },
    [isRunning, handleStop, configDuration]
  );

  // ─── Cleanup on unmount ───
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // ─── Format time as MM:SS ───
  const displayTime =
    mode === "pomodoro"
      ? `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(
          timeLeft % 60
        ).padStart(2, "0")}`
      : `${String(Math.floor(timeElapsed / 60)).padStart(2, "0")}:${String(
          timeElapsed % 60
        ).padStart(2, "0")}`;

  // ─── Progress calculation ───
  const progress = (() => {
    if (mode === "pomodoro") {
      const total = getPhaseDuration(phase);
      if (total === 0) return 0;
      return 1 - timeLeft / total;
    }
    // Cronômetro: fill one ring per pomodoro duration
    if (configDuration === 0) return 0;
    return (timeElapsed % configDuration) / configDuration;
  })();

  // ─── Ring color ───
  const ringColor = (() => {
    if (!isRunning && !isPaused) return "var(--text-tertiary)";
    if (isPaused) return "var(--text-tertiary)";
    if (phase === "short_break" || phase === "long_break") return "#10B981";
    return "var(--orange-500)";
  })();

  // ─── Phase label ───
  const phaseLabel = (() => {
    if (mode === "cronometro") return "Cronômetro";
    switch (phase) {
      case "work":
        return "Pomodoro";
      case "short_break":
        return "Pausa curta";
      case "long_break":
        return "Pausa longa";
    }
  })();

  // ─── Selected activity info ───
  const selectedAtividade = atividades.find((t) => t.id === selectedAtividadeId);
  const selectedProjeto = selectedAtividade?.projeto_id
    ? atividadeProjetos[selectedAtividade.projeto_id]
    : null;

  // ─── Ring dimensions ───
  const RING_RADIUS = 120;
  const RING_STROKE = 8;

  return (
    <Shell>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
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
      </div>

      <ForjaNav />

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        {/* ─── Mode Toggle ─── */}
        <div
          className="inline-flex items-center gap-1 p-1 rounded-xl mb-10"
          style={{ background: "var(--bg-card)" }}
        >
          <button
            onClick={() => switchMode("pomodoro")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-dm text-sm font-medium transition-all duration-150"
            style={{
              background:
                mode === "pomodoro" ? "var(--orange-glow)" : "transparent",
              color:
                mode === "pomodoro"
                  ? "var(--orange-500)"
                  : "var(--text-tertiary)",
            }}
          >
            <Flame size={14} />
            Pomodoro
          </button>
          <button
            onClick={() => switchMode("cronometro")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-dm text-sm font-medium transition-all duration-150"
            style={{
              background:
                mode === "cronometro" ? "var(--orange-glow)" : "transparent",
              color:
                mode === "cronometro"
                  ? "var(--orange-500)"
                  : "var(--text-tertiary)",
            }}
          >
            <Timer size={14} />
            Cronômetro
          </button>
        </div>

        {/* ─── Timer Circle ─── */}
        <div className="relative flex items-center justify-center mb-6">
          <ProgressRing
            radius={RING_RADIUS}
            stroke={RING_STROKE}
            progress={progress}
            color={ringColor}
            isPaused={isPaused}
          />

          {/* Time in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-mono text-6xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {displayTime}
            </span>
            <span
              className="font-dm text-sm font-medium mt-1"
              style={{
                color:
                  phase === "short_break" || phase === "long_break"
                    ? "#10B981"
                    : "var(--text-tertiary)",
              }}
            >
              {phaseLabel}
            </span>
          </div>
        </div>

        {/* ─── Task Selection ─── */}
        <div className="relative mb-8">
          <button
            onClick={() => setShowTaskDropdown(!showTaskDropdown)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-dm text-sm transition-all duration-150"
            style={{
              background: "var(--bg-card)",
              color: selectedAtividade
                ? "var(--text-primary)"
                : "var(--text-tertiary)",
              border: "1px solid var(--border-default)",
            }}
          >
            {selectedProjeto && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedProjeto.cor }}
              />
            )}
            <span className="max-w-[200px] truncate">
              {selectedAtividade ? selectedAtividade.titulo : "Sem atividade"}
            </span>
            <ChevronDown size={14} />
          </button>

          {showTaskDropdown && (
            <div
              className="absolute top-full mt-1 left-1/2 -translate-x-1/2 w-72 max-h-60 overflow-y-auto rounded-xl shadow-lg z-50 py-1"
              style={{
                background: "var(--bg-card-elevated)",
                border: "1px solid var(--border-default)",
              }}
            >
              {/* No activity option */}
              <button
                onClick={() => {
                  setSelectedAtividadeId(null);
                  setShowTaskDropdown(false);
                }}
                className="w-full text-left px-4 py-2.5 font-dm text-sm hover:bg-[var(--bg-hover)] transition-colors"
                style={{
                  color:
                    selectedAtividadeId === null
                      ? "var(--orange-500)"
                      : "var(--text-secondary)",
                }}
              >
                Sem atividade
              </button>

              {atividades.map((t) => {
                const proj = t.projeto_id
                  ? atividadeProjetos[t.projeto_id]
                  : null;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedAtividadeId(t.id);
                      setShowTaskDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2.5 font-dm text-sm hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2"
                    style={{
                      color:
                        selectedAtividadeId === t.id
                          ? "var(--orange-500)"
                          : "var(--text-primary)",
                    }}
                  >
                    {proj && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: proj.cor }}
                      />
                    )}
                    <span className="truncate">{t.titulo}</span>
                  </button>
                );
              })}

              {atividades.length === 0 && (
                <div className="px-4 py-3 font-dm text-xs text-[var(--text-tertiary)]">
                  Nenhuma atividade pendente
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Controls ─── */}
        <div className="flex items-center gap-4 mb-6">
          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-3 rounded-xl transition-all duration-150 hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-tertiary)" }}
            title="Reiniciar tudo"
          >
            <RotateCcw size={20} />
          </button>

          {/* Play / Pause */}
          {!isRunning || isPaused ? (
            <button
              onClick={handlePlay}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: "var(--orange-500)",
                color: "white",
                boxShadow: "0 4px 24px rgba(200, 75, 49, 0.4)",
              }}
              title={isPaused ? "Continuar" : "Iniciar"}
            >
              <Play size={28} className="ml-1" />
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: "var(--orange-500)",
                color: "white",
                boxShadow: "0 4px 24px rgba(200, 75, 49, 0.4)",
              }}
              title="Pausar"
            >
              <Pause size={28} />
            </button>
          )}

          {/* Stop */}
          <button
            onClick={handleStop}
            disabled={!isRunning && !isPaused}
            className="p-3 rounded-xl transition-all duration-150 hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: "var(--text-tertiary)" }}
            title="Parar e registrar"
          >
            <Square size={20} />
          </button>
        </div>

        {/* ─── Pomodoro Count Dots ─── */}
        {mode === "pomodoro" && (
          <PomodoroDots completed={pomodoroCount} total={pomodorosUntilLong} />
        )}

        {/* ─── Cronômetro: pomodoro equivalents ─── */}
        {mode === "cronometro" && timeElapsed > 0 && (
          <div className="mt-4 font-dm text-xs text-[var(--text-tertiary)]">
            {Math.floor(timeElapsed / configDuration)} pomodoro
            {Math.floor(timeElapsed / configDuration) !== 1 ? "s" : ""}{" "}
            equivalente{Math.floor(timeElapsed / configDuration) !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Close dropdown on outside click */}
      {showTaskDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowTaskDropdown(false)}
        />
      )}
    </Shell>
  );
}
