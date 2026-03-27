"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Users, User, ChevronDown, ChevronUp,
  Trophy, RotateCcw, Diamond, Grid3X3, Sun,
  Landmark, Compass, Swords,
} from "lucide-react";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import {
  CASAS, QUIZ, ARENA_MENSAL, ARENA_ACUMULADO,
  calcularResultadoQuiz,
  type Casa,
} from "@/lib/casas-data";
import { staggerChild, EASE } from "@/lib/animations";

type Section = "casas" | "quiz" | "arena";

const SECTION_TAB_ICONS: Record<string, React.ComponentType<any>> = {
  casas: Landmark,
  quiz: Compass,
  arena: Swords,
};

const SECTION_TABS = [
  { id: "casas", label: "As Casas" },
  { id: "quiz", label: "Descubra sua Casa" },
  { id: "arena", label: "Arena" },
];

const CASA_IDS: Casa["id"][] = ["prisma", "macondo", "marmoris"];

// Ícones representativos para cada casa
const CASA_ICONS: Record<Casa["id"], React.ComponentType<any>> = {
  prisma: Diamond,
  macondo: Grid3X3,
  marmoris: Sun,
};

export default function CasasPage() {
  const [section, setSection] = useState<Section>("casas");
  const [expandedCasa, setExpandedCasa] = useState<Casa["id"] | null>(null);

  // Quiz state
  const [quizStep, setQuizStep] = useState(0);
  const [quizRespostas, setQuizRespostas] = useState<Record<number, number>>({});

  // Arena state
  const [arenaPeriodo, setArenaPeriodo] = useState<"mensal" | "acumulado">("mensal");

  // Quiz helpers
  const startQuiz = () => {
    setQuizStep(1);
    setQuizRespostas({});
  };

  const answerQuiz = (questionId: number, optIndex: number) => {
    setQuizRespostas(prev => ({ ...prev, [questionId]: optIndex }));
    if (quizStep < QUIZ.length) {
      setTimeout(() => setQuizStep(s => s + 1), 300);
    } else {
      setTimeout(() => setQuizStep(QUIZ.length + 1), 300);
    }
  };

  const quizResult = calcularResultadoQuiz(quizRespostas);
  const quizWinner = CASA_IDS.reduce((best, id) =>
    quizResult[id] > quizResult[best] ? id : best, CASA_IDS[0]);

  // Arena helpers
  const arenaData = arenaPeriodo === "mensal" ? ARENA_MENSAL : ARENA_ACUMULADO;

  const getMetricMax = (valores: { prisma: number; macondo: number; marmoris: number }) =>
    Math.max(valores.prisma, valores.macondo, valores.marmoris);

  const getMetricLeader = (valores: { prisma: number; macondo: number; marmoris: number }): Casa["id"] => {
    if (valores.prisma >= valores.macondo && valores.prisma >= valores.marmoris) return "prisma";
    if (valores.macondo >= valores.prisma && valores.macondo >= valores.marmoris) return "macondo";
    return "marmoris";
  };

  const casaColor = (id: Casa["id"]) => CASAS.find(c => c.id === id)!.cor;

  return (
    <Shell>
      {/* Header */}
      <motion.div {...staggerChild(0)} className="mb-2 text-center">
        <h1 className="font-fraunces font-bold text-3xl md:text-4xl">
          As{" "}
          <span className="font-fraunces italic bg-gradient-to-r from-[#2B7A9E] via-[#6C4F9E] to-[#D4A574] bg-clip-text text-transparent [-webkit-text-fill-color:transparent]">
            Casas
          </span>
        </h1>
        <p className="font-dm text-sm text-[var(--text-secondary)] mt-2 max-w-lg mx-auto">
          Tres caminhos, uma mesma missao. Cada Casa carrega uma visao de mundo,
          um jeito de fazer clinica, uma forma de estar junto.
        </p>
      </motion.div>

      {/* Tabs — estilo pill com bordas */}
      <motion.div {...staggerChild(1)} className="mb-8 flex justify-center">
        <div className="inline-flex gap-2 p-1.5 rounded-2xl bg-[var(--bg-card)]/40 dark:bg-[rgba(17,21,32,.4)] border border-[var(--border-subtle)]">
          {SECTION_TABS.map((tab) => {
            const TabIcon = SECTION_TAB_ICONS[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setSection(tab.id as Section)}
                className={`relative px-4 py-2 rounded-xl font-dm text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  section === tab.id
                    ? "text-[var(--text-primary)] bg-[var(--bg-card)] dark:bg-[rgba(17,21,32,.8)] shadow-sm border border-[var(--border-default)] dark:border-[rgba(140,160,200,.12)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <TabIcon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ═══ AS CASAS — Grid de cards estilo cosmic ═══ */}
        {section === "casas" && (
          <motion.div
            key="casas"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {CASAS.map((casa, i) => {
                const expanded = expandedCasa === casa.id;
                const CasaIcon = CASA_ICONS[casa.id];
                return (
                  <motion.div
                    key={casa.id}
                    {...staggerChild(i + 2)}
                    className="group"
                  >
                    <div
                      className="casa-card rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] dark:bg-[rgba(17,21,32,.6)] overflow-hidden transition-all duration-300 hover:shadow-lg dark:hover:shadow-[0_8px_32px_rgba(0,0,0,.4)] hover:-translate-y-1"
                      style={{
                        "--casa-color": casa.cor,
                        "--casa-color-rgb": casa.id === "prisma" ? "43,122,158" : casa.id === "macondo" ? "108,79,158" : "212,165,116",
                      } as React.CSSProperties}
                    >
                      {/* Top glow line */}
                      <div
                        className="h-[2px] opacity-40"
                        style={{ background: `linear-gradient(90deg, transparent, ${casa.cor}, transparent)` }}
                      />

                      <button
                        onClick={() => setExpandedCasa(expanded ? null : casa.id)}
                        className="w-full text-left p-6 pb-4"
                      >
                        {/* Icon */}
                        <div className="flex justify-center mb-5">
                          <div
                            className="relative w-16 h-16 rounded-2xl flex items-center justify-center casa-icon-glow"
                            style={{
                              backgroundColor: `${casa.cor}15`,
                              "--casa-color": `${casa.cor}30`,
                            } as React.CSSProperties}
                          >
                            <CasaIcon size={28} className="relative z-10" style={{ color: casa.cor }} />
                          </div>
                        </div>

                        {/* Name — serif italic gradient */}
                        <h3
                          className="font-fraunces font-bold text-2xl text-center italic"
                          style={{ color: casa.cor }}
                        >
                          {casa.nome}
                        </h3>

                        {/* Sensibilidade */}
                        <p className="font-dm text-[10px] font-semibold tracking-[.2em] uppercase text-center text-[var(--text-tertiary)] mt-1">
                          {casa.sensibilidade}
                        </p>

                        {/* Lema */}
                        <p className="font-dm text-sm italic text-center text-[var(--text-secondary)] mt-3 opacity-70">
                          &ldquo;{casa.lema}&rdquo;
                        </p>

                        {/* Chevron */}
                        <div className="flex justify-center mt-4">
                          <ChevronDown
                            size={16}
                            className={`text-[var(--text-tertiary)] transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                            style={{ color: casa.cor }}
                          />
                        </div>
                      </button>

                      {/* Expanded content */}
                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: EASE }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6 pt-0 border-t border-[var(--border-subtle)]">
                              {/* Stats */}
                              <div className="flex items-center justify-center gap-4 mt-4 mb-4">
                                <span className="font-dm text-xs text-[var(--text-secondary)] flex items-center gap-1">
                                  <User size={12} style={{ color: casa.cor }} /> {casa.lider}
                                </span>
                                <span className="font-dm text-xs text-[var(--text-secondary)] flex items-center gap-1">
                                  <Users size={12} style={{ color: casa.cor }} /> {casa.terapeutas}T · {casa.pacientes}P
                                </span>
                              </div>

                              <p className="font-dm text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                                {casa.descricao}
                              </p>
                              <div className="flex flex-wrap gap-2 justify-center">
                                {casa.valores.map(v => (
                                  <span
                                    key={v}
                                    className="px-3 py-1 rounded-full font-dm text-xs font-medium border"
                                    style={{
                                      backgroundColor: casa.corBg,
                                      color: casa.cor,
                                      borderColor: `${casa.cor}25`,
                                    }}
                                  >
                                    {v}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ═══ QUIZ ═══ */}
        {section === "quiz" && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {/* Intro */}
            {quizStep === 0 && (
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-2xl bg-[var(--orange-glow)] dark:bg-[rgba(200,75,49,.08)] flex items-center justify-center mx-auto mb-4 border border-[var(--border-subtle)]">
                  <Compass size={36} className="text-[var(--orange-500)]" />
                </div>
                <h2 className="font-fraunces font-bold text-xl text-[var(--text-primary)] mb-2">
                  Descubra sua Casa
                </h2>
                <p className="font-dm text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                  Responda 5 perguntas e descubra qual sensibilidade terapeutica mais combina com voce
                </p>
                <Button onClick={startQuiz} icon={<ArrowRight size={16} />}>Comecar</Button>
              </div>
            )}

            {/* Questions */}
            {quizStep >= 1 && quizStep <= QUIZ.length && (() => {
              const question = QUIZ[quizStep - 1];
              return (
                <motion.div
                  key={`q-${question.id}`}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  {/* Progress */}
                  <div className="flex gap-1.5 mb-6">
                    {QUIZ.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full flex-1 transition-all ${
                          i < quizStep
                            ? "bg-[var(--orange-500)]"
                            : "bg-[var(--bg-hover)] dark:bg-[rgba(140,160,200,.08)]"
                        }`}
                      />
                    ))}
                  </div>

                  <p className="font-dm text-xs text-[var(--text-tertiary)] mb-1 uppercase tracking-wider font-semibold">
                    Pergunta {quizStep} de {QUIZ.length}
                  </p>
                  <h2 className="font-fraunces font-bold text-lg text-[var(--text-primary)] mb-6">
                    {question.pergunta}
                  </h2>

                  <div className="space-y-3">
                    {question.opcoes.map((opt, oi) => {
                      const selected = quizRespostas[question.id] === oi;
                      return (
                        <motion.div
                          key={oi}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + oi * 0.06, duration: 0.4, ease: EASE }}
                        >
                          <button
                            onClick={() => answerQuiz(question.id, oi)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all ${
                              selected
                                ? "border-[var(--orange-500)] bg-[var(--orange-glow)] dark:bg-[rgba(200,75,49,.08)]"
                                : "border-[var(--border-default)] bg-[var(--bg-card)] dark:bg-[rgba(17,21,32,.5)] hover:border-[var(--orange-400)]/50"
                            }`}
                          >
                            <p className="font-dm text-sm text-[var(--text-primary)]">{opt.texto}</p>
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>

                  {quizStep > 1 && (
                    <button
                      onClick={() => setQuizStep(s => s - 1)}
                      className="flex items-center gap-1.5 font-dm text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mt-4"
                    >
                      <ArrowLeft size={14} /> Anterior
                    </button>
                  )}
                </motion.div>
              );
            })()}

            {/* Result */}
            {quizStep > QUIZ.length && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <div className="text-center mb-6">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 font-fraunces font-bold text-3xl text-white"
                    style={{
                      backgroundColor: casaColor(quizWinner),
                      boxShadow: `0 0 30px ${casaColor(quizWinner)}30`,
                    }}
                  >
                    {CASAS.find(c => c.id === quizWinner)!.nome[0]}
                  </div>
                  <h2 className="font-fraunces font-bold text-xl text-[var(--text-primary)] mb-1">
                    Sua casa e <span style={{ color: casaColor(quizWinner) }}>{CASAS.find(c => c.id === quizWinner)!.nome}</span>!
                  </h2>
                  <p className="font-dm text-sm italic text-[var(--text-secondary)]">
                    &ldquo;{CASAS.find(c => c.id === quizWinner)!.lema}&rdquo;
                  </p>
                </div>

                {/* Bars */}
                <Card className="mb-6">
                  <div className="space-y-4">
                    {CASA_IDS.map(id => {
                      const casa = CASAS.find(c => c.id === id)!;
                      const pct = quizResult[id];
                      return (
                        <div key={id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-dm text-sm font-medium" style={{ color: casa.cor }}>{casa.nome}</span>
                            <span className="font-dm text-sm font-bold" style={{ color: casa.cor }}>{pct}%</span>
                          </div>
                          <div className="h-3 rounded-full bg-[var(--bg-hover)] dark:bg-[rgba(140,160,200,.06)] overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: 0.3, duration: 0.8, ease: EASE }}
                              className="h-full rounded-full"
                              style={{
                                backgroundColor: casa.cor,
                                boxShadow: `0 0 10px ${casa.cor}40`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <div className="flex justify-center">
                  <Button variant="secondary" onClick={() => { setQuizStep(0); setQuizRespostas({}); }} icon={<RotateCcw size={14} />}>
                    Refazer quiz
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ═══ ARENA ═══ */}
        {section === "arena" && (
          <motion.div
            key="arena"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {/* Period toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setArenaPeriodo("mensal")}
                className={`px-4 py-2 rounded-xl font-dm text-sm font-medium transition-all ${
                  arenaPeriodo === "mensal"
                    ? "bg-[var(--orange-500)] text-white shadow-[0_0_16px_rgba(200,75,49,.2)]"
                    : "bg-[var(--bg-card)] dark:bg-[rgba(17,21,32,.5)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-primary)]"
                }`}
              >
                Mes atual
              </button>
              <button
                onClick={() => setArenaPeriodo("acumulado")}
                className={`px-4 py-2 rounded-xl font-dm text-sm font-medium transition-all ${
                  arenaPeriodo === "acumulado"
                    ? "bg-[var(--orange-500)] text-white shadow-[0_0_16px_rgba(200,75,49,.2)]"
                    : "bg-[var(--bg-card)] dark:bg-[rgba(17,21,32,.5)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-primary)]"
                }`}
              >
                Acumulado (3 meses)
              </button>
            </div>

            {/* House summary row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {CASAS.map((casa, i) => {
                const CasaIcon = CASA_ICONS[casa.id];
                return (
                  <motion.div key={casa.id} {...staggerChild(i)}>
                    <Card>
                      <div className="text-center">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2"
                          style={{ backgroundColor: `${casa.cor}15` }}
                        >
                          <CasaIcon size={22} style={{ color: casa.cor }} />
                        </div>
                        <p className="font-fraunces font-bold text-sm italic" style={{ color: casa.cor }}>{casa.nome}</p>
                        <p className="font-dm text-[10px] text-[var(--text-tertiary)]">{casa.terapeutas}T · {casa.pacientes}P</p>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {/* Metrics */}
            <div className="space-y-4">
              {arenaData.map((metric, mi) => {
                const maxVal = getMetricMax(metric.valores);
                const leader = getMetricLeader(metric.valores);
                return (
                  <motion.div key={metric.id} {...staggerChild(3 + mi)}>
                    <Card>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-dm text-sm font-semibold text-[var(--text-primary)]">{metric.label}</h3>
                        <div className="flex items-center gap-1">
                          <Trophy size={12} style={{ color: casaColor(leader) }} />
                          <span className="font-dm text-xs font-medium" style={{ color: casaColor(leader) }}>
                            {CASAS.find(c => c.id === leader)!.nome}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        {CASA_IDS.map(id => {
                          const casa = CASAS.find(c => c.id === id)!;
                          const val = metric.valores[id];
                          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                          const isLeader = id === leader;
                          return (
                            <div key={id} className="flex items-center gap-3">
                              <span className="font-dm text-xs w-[70px] text-right flex-shrink-0" style={{ color: casa.cor }}>
                                {casa.nome}
                              </span>
                              <div className="flex-1 h-2.5 rounded-full bg-[var(--bg-hover)] dark:bg-[rgba(140,160,200,.06)] overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ delay: 0.2 + mi * 0.08, duration: 0.6, ease: EASE }}
                                  className="h-full rounded-full"
                                  style={{
                                    backgroundColor: casa.cor,
                                    opacity: isLeader ? 1 : 0.6,
                                    boxShadow: isLeader ? `0 0 8px ${casa.cor}40` : "none",
                                  }}
                                />
                              </div>
                              <span className="font-dm text-xs font-bold w-[52px] flex-shrink-0" style={{ color: casa.cor }}>
                                {val}{metric.unidade}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </Shell>
  );
}
