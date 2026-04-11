"use client";
import { ChevronRight } from "lucide-react";
import Card from "@/components/ui/Card";

export interface KanbanItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  columnKey: string;
}

interface KanbanColumn {
  key: string;
  label: string;
  color?: string;
}

interface Props {
  columns: KanbanColumn[];
  items: KanbanItem[];
  onItemClick?: (id: string) => void;
  onAdvance?: (id: string) => void;
}

export default function KanbanBoard({ columns, items, onItemClick, onAdvance }: Props) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((col, colIdx) => {
        const colItems = items.filter(i => i.columnKey === col.key);
        const isLast = colIdx === columns.length - 1;
        return (
          <div key={col.key} className="min-w-[240px] flex-1">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color || "var(--text-tertiary)" }} />
              <span className="font-dm text-xs font-semibold text-[var(--text-secondary)]">{col.label}</span>
              <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{colItems.length}</span>
            </div>

            {/* Column items */}
            <div className="space-y-2">
              {colItems.map(item => (
                <Card key={item.id} hover>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => onItemClick?.(item.id)}
                        className="text-left flex-1 min-w-0"
                      >
                        <p className="font-dm text-sm font-medium text-[var(--text-primary)] line-clamp-2">{item.title}</p>
                        {item.subtitle && (
                          <p className="font-dm text-xs text-[var(--text-tertiary)] mt-0.5">{item.subtitle}</p>
                        )}
                        {item.badge && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-dm"
                            style={{ backgroundColor: `${item.badgeColor || "var(--text-tertiary)"}15`, color: item.badgeColor || "var(--text-tertiary)" }}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                      {!isLast && onAdvance && (
                        <button
                          onClick={() => onAdvance(item.id)}
                          className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--orange-500)] hover:bg-[var(--orange-glow)] transition-colors"
                          title="Avançar"
                        >
                          <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {colItems.length === 0 && (
                <div className="py-8 text-center">
                  <p className="font-dm text-xs text-[var(--text-tertiary)]">Vazio</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
