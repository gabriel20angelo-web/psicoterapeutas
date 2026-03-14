"use client";
import { motion } from "framer-motion";
import Shell from "@/components/Shell";

export default function PacientesPage() {
  return (
    <Shell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="font-fraunces font-bold text-[#1A1A1A] mb-1" style={{ fontSize: "clamp(24px, 4vw, 32px)" }}>
          Pacientes
        </h1>
        <p className="font-dm text-[#5C5C5C] text-sm mb-8">
          Cadastro e histórico dos seus pacientes.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-[#E5DFD3] bg-white/60 p-6"
      >
        <div className="flex items-center justify-center py-24 rounded-xl border border-dashed border-[#E5DFD3]">
          <p className="font-dm text-sm text-[#C4BAA8]">Lista de pacientes em construção</p>
        </div>
      </motion.div>
    </Shell>
  );
}
