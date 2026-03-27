"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Layers, Calendar, Sparkles, CheckSquare, Target, Palette, Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/conteudo", label: "Dashboard", icon: LayoutDashboard },
  { href: "/conteudo/conteudos", label: "Conteúdos", icon: Layers },
  { href: "/conteudo/calendario", label: "Calendário", icon: Calendar },
  { href: "/conteudo/ia", label: "IA", icon: Sparkles },
  { href: "/conteudo/tarefas", label: "Tarefas", icon: CheckSquare },
  { href: "/conteudo/metas", label: "Metas", icon: Target },
  { href: "/conteudo/editorias", label: "Editorias", icon: Palette },
  { href: "/conteudo/configuracoes", label: "Config", icon: Settings },
];

export default function UsinaNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/conteudo") return pathname === "/conteudo";
    return pathname.startsWith(href);
  };

  return (
    <nav className="mb-6 -mt-2 overflow-x-auto scrollbar-thin">
      <div className="inline-flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--bg-card)" }}>
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
