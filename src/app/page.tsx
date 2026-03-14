"use client";
import { motion } from "framer-motion";
import { CalendarDays, Users, FileText, TrendingUp } from "lucide-react";
import Shell from "@/components/Shell";

const EASE = [0.22, 1, 0.36, 1] as const;

const stats = [
  { label: "Sessões hoje", value: "—", icon: CalendarDays, color: "#2E9E8F" },
  { label: "Pacientes ativos", value: "—", icon: Users, color: "#C84B31" },
  { label: "Anotações recentes", value: "—", icon: FileText, color: "#2D6A4F" },
  { label: "Sessões no mês", value: "—", icon: TrendingUp, color: "#5C5C5C" },
];

export default function DashboardPage() {
  return (
    <Shell>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mb-10"
      >
        <h1 className="font-fraunces font-bold text-[#1A1A1A] mb-1" style={{ fontSize: "clamp(24px, 4vw, 36px)" }}>
          Bom dia
        </h1>
        <p className="font-dm text-[#5C5C5C] text-sm">
          Aqui está o resumo do seu dia.
        </p>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.6, ease: EASE }}
            className="rounded-2xl p-5 border border-[#E5DFD3] bg-white/60"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${s.color}12` }}
              >
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <p className="font-dm text-xs text-[#5C5C5C] font-medium">{s.label}</p>
            </div>
            <p className="font-fraunces font-bold text-2xl text-[#1A1A1A]">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
          className="rounded-2xl border border-[#E5DFD3] bg-white/60 p-6"
        >
          <h2 className="font-fraunces font-bold text-lg text-[#1A1A1A] mb-1">Próximas sessões</h2>
          <p className="font-dm text-sm text-[#5C5C5C] mb-6">Suas sessões agendadas para hoje.</p>
          <div className="flex items-center justify-center py-12 rounded-xl border border-dashed border-[#E5DFD3]">
            <p className="font-dm text-sm text-[#C4BAA8]">Nenhuma sessão agendada</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: EASE }}
          className="rounded-2xl border border-[#E5DFD3] bg-white/60 p-6"
        >
          <h2 className="font-fraunces font-bold text-lg text-[#1A1A1A] mb-1">Anotações recentes</h2>
          <p className="font-dm text-sm text-[#5C5C5C] mb-6">Últimas notas de sessão registradas.</p>
          <div className="flex items-center justify-center py-12 rounded-xl border border-dashed border-[#E5DFD3]">
            <p className="font-dm text-sm text-[#C4BAA8]">Nenhuma anotação recente</p>
          </div>
        </motion.div>
      </div>
    </Shell>
  );
}
