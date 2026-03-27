"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Timer, BarChart3, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/forja", label: "Hoje", icon: CalendarDays },
  { href: "/forja/foco", label: "Timer", icon: Timer },
  { href: "/forja/stats", label: "Estatísticas", icon: BarChart3 },
  { href: "/forja/config", label: "Configurações", icon: Settings },
];

export default function ForjaNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/forja") return pathname === "/forja";
    // Strip hash for comparison
    const basePath = href.split("#")[0];
    return pathname.startsWith(basePath);
  };

  return (
    <nav className="mb-6 -mt-2 overflow-x-auto scrollbar-thin">
      <div
        className="inline-flex items-center gap-1 p-1 rounded-xl"
        style={{ background: "var(--bg-card)" }}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-dm text-sm font-medium transition-all duration-150 whitespace-nowrap"
              style={{
                background: active ? "var(--orange-glow)" : "transparent",
                color: active ? "var(--orange-500)" : "var(--text-tertiary)",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.color = "var(--text-tertiary)";
              }}
            >
              <Icon size={14} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
