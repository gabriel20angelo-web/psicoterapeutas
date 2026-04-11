"use client";
import { Table, Columns3, Calendar } from "lucide-react";

export type ViewMode = "tabela" | "kanban" | "calendario";

interface Props {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  options?: ViewMode[];
}

const ICONS: Record<ViewMode, typeof Table> = {
  tabela: Table,
  kanban: Columns3,
  calendario: Calendar,
};

const LABELS: Record<ViewMode, string> = {
  tabela: "Tabela",
  kanban: "Kanban",
  calendario: "Calendário",
};

export default function ViewToggle({ value, onChange, options = ["tabela", "kanban", "calendario"] }: Props) {
  return (
    <div className="flex rounded-lg border border-[var(--border-subtle)] overflow-hidden">
      {options.map(opt => {
        const Icon = ICONS[opt];
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-dm font-medium transition-colors ${
              active
                ? "bg-[var(--orange-glow)] text-[var(--orange-500)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{LABELS[opt]}</span>
          </button>
        );
      })}
    </div>
  );
}
