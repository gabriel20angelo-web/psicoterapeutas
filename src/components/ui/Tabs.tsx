"use client";
import { useId, useRef, KeyboardEvent } from "react";
import { motion } from "framer-motion";

interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  layoutId?: string;
}

export default function Tabs({ tabs, active, onChange, layoutId }: Props) {
  const autoId = useId();
  const resolvedLayoutId = layoutId ?? autoId;
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (nextIndex !== null) {
      e.preventDefault();
      onChange(tabs[nextIndex].id);
      tabsRef.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      className="inline-flex gap-1 p-1 rounded-xl bg-[var(--bg-card)]/40 dark:bg-[rgba(17,21,32,.4)] border border-[var(--border-subtle)]"
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(el) => { tabsRef.current[index] = el; }}
          role="tab"
          aria-selected={active === tab.id}
          tabIndex={active === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className={`relative px-4 py-2 rounded-lg font-dm text-sm font-medium transition-all ${active === tab.id ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        >
          {active === tab.id && (
            <motion.div
              layoutId={`tab-bg-${resolvedLayoutId}`}
              className="absolute inset-0 rounded-lg bg-[var(--bg-card)] dark:bg-[rgba(17,21,32,.8)] shadow-sm border border-[var(--border-default)]"
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
