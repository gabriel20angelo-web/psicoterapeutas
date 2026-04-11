"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, format, isSameMonth, isSameDay, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CalendarItem {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  color?: string;
  sublabel?: string;
}

interface Props {
  items: CalendarItem[];
  onDayClick?: (date: string) => void;
  onItemClick?: (id: string) => void;
}

export default function SimpleCalendar({ items, onDayClick, onItemClick }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const itemsByDate = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = item.date;
    if (!itemsByDate.has(key)) itemsByDate.set(key, []);
    itemsByDate.get(key)!.push(item);
  }

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors">
          <ChevronLeft size={18} className="text-[var(--text-tertiary)]" />
        </button>
        <h3 className="font-fraunces text-sm font-semibold text-[var(--text-primary)] capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors">
          <ChevronRight size={18} className="text-[var(--text-tertiary)]" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-[var(--border-subtle)]">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(day => (
          <div key={day} className="text-center py-2 font-dm text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-[var(--border-subtle)] last:border-b-0">
            {week.map((day, di) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayItems = itemsByDate.get(dateStr) || [];
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              return (
                <div
                  key={di}
                  onClick={() => onDayClick?.(dateStr)}
                  className={`min-h-[80px] p-1 border-r border-[var(--border-subtle)] last:border-r-0 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors ${
                    !inMonth ? "opacity-30" : ""
                  }`}
                >
                  <div className={`text-right font-dm text-xs mb-1 ${
                    today ? "w-6 h-6 rounded-full bg-[var(--orange-500)] text-white flex items-center justify-center ml-auto" : "text-[var(--text-tertiary)]"
                  }`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map(item => (
                      <button
                        key={item.id}
                        onClick={(e) => { e.stopPropagation(); onItemClick?.(item.id); }}
                        className="block w-full text-left px-1 py-0.5 rounded text-[10px] font-dm truncate transition-colors hover:brightness-110"
                        style={{ backgroundColor: `${item.color || "var(--orange-500)"}20`, color: item.color || "var(--orange-500)" }}
                      >
                        {item.label}
                      </button>
                    ))}
                    {dayItems.length > 3 && (
                      <p className="text-[10px] font-dm text-[var(--text-tertiary)] px-1">+{dayItems.length - 3}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
