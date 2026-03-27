"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Shell from "@/components/Shell";
import Tabs from "@/components/ui/Tabs";
import AvisosSection from "@/components/comunicacao/AvisosSection";
import EncaminhamentosSection from "@/components/comunicacao/EncaminhamentosSection";
import { getComunicacaoBadges } from "@/lib/comunicacao-data";
import { fadeUp } from "@/lib/animations";

export default function EquipePage() {
  const [activeTab, setActiveTab] = useState("feed");
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate((n) => n + 1);

  const badges = getComunicacaoBadges();
  const avisoBadge = badges.avisos > 0 ? ` (${badges.avisos})` : '';

  const tabs = [
    { id: "feed", label: `Feed${avisoBadge}` },
    { id: "encaminhamentos", label: "Encaminhamentos" },
  ];

  return (
    <Shell>
      <motion.div {...fadeUp()}>
        <h1 className="font-fraunces font-bold text-2xl md:text-3xl mb-1">
          Equipe
        </h1>
        <p className="font-dm text-sm text-[var(--text-secondary)] mb-6">
          Avisos e encaminhamentos da equipe.
        </p>
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="mb-6">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </motion.div>

      <div>
        {activeTab === "feed" && <AvisosSection onRefresh={refresh} />}
        {activeTab === "encaminhamentos" && <EncaminhamentosSection onRefresh={refresh} />}
      </div>
    </Shell>
  );
}
