"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays, Users, LayoutDashboard,
  FileText, BookOpen, Sparkles, Flame, Settings2, GraduationCap, Wallet,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string }>;
}

import { getModulosAtivos } from "@/lib/modulos-config";

const ALL_NAV: NavItem[] = [
  { label: "Painel", href: "/", icon: LayoutDashboard },
  { label: "Agenda", href: "/agenda", icon: CalendarDays },
  { label: "Pacientes", href: "/pacientes", icon: Users },
  { label: "PsiDocs", href: "/psidocs", icon: FileText },
  { label: "Usina", href: "/conteudo", icon: Sparkles },
  { label: "Forja", href: "/forja", icon: Flame },
  { label: "Acadêmico", href: "/academico", icon: GraduationCap },
  { label: "Finanças", href: "/financas", icon: Wallet },
];

function getFilteredNav(): NavItem[] {
  if (typeof window === "undefined") return ALL_NAV;
  const ativos = getModulosAtivos();
  const hrefsAtivos = new Set(ativos.map(m => m.href));
  return ALL_NAV.filter(item => hrefsAtivos.has(item.href));
}

export default function Sidebar() {
  const pathname = usePathname();
  const [NAV] = useState(() => getFilteredNav());

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Desktop sidebar — 68px icon bar */}
      <aside
        className="hidden lg:flex flex-col fixed top-[56px] bottom-0 left-0 z-[40] w-[68px] glass border-r border-[var(--border-subtle)]"
        style={{ background: "var(--bg-deepest)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center py-4">
          <Link href="/" className="relative group">
            <Image
              src="/psicoterapeutas/icon-allos.png"
              alt="App"
              width={40}
              height={40}
              className="rounded-xl hover:scale-[1.08] hover:rotate-[-3deg] hover:brightness-110 transition-all duration-200 cursor-pointer"
              style={{ filter: "drop-shadow(0 0 8px rgba(43,158,139,.3))" }}
            />
            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-[var(--bg-card-elevated)] text-[var(--text-primary)] text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-[0_4px_12px_rgba(0,0,0,.15)] border border-[var(--border-default)] translate-x-1 group-hover:translate-x-0">
              Painel
            </span>
          </Link>
        </div>

        {/* Nav icons */}
        <nav className="flex flex-col items-center gap-1 flex-1 py-2 px-[10px]">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                {...(active ? { "aria-current": "page" as const } : {})}
                className={`group relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  active
                    ? "text-[#2B9E8B] bg-[rgba(43,158,139,.1)] sidebar-link-active"
                    : "text-[var(--text-tertiary)] hover:text-[#2B9E8B] hover:bg-[rgba(43,158,139,.06)]"
                }`}
                title={item.label}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-[rgba(43,158,139,.08)] border border-[rgba(43,158,139,.2)]"
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <span className="relative z-10">
                  <item.icon size={24} strokeWidth={active ? 2 : 1.5} />
                </span>
                <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-[var(--bg-card-elevated)] text-[var(--text-primary)] text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-[0_4px_12px_rgba(0,0,0,.15)] border border-[var(--border-default)] translate-x-1 group-hover:translate-x-0">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="flex flex-col items-center gap-2 py-4 border-t border-[var(--border-subtle)]">
          <Link
            href="/configuracoes"
            {...(isActive("/configuracoes") ? { "aria-current": "page" as const } : {})}
            className={`group relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
              isActive("/configuracoes")
                ? "text-[var(--orange-500)] bg-[var(--orange-glow)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--orange-500)] hover:bg-[rgba(200,75,49,.06)]"
            }`}
            title="Configurações"
          >
            <Settings2 size={22} strokeWidth={isActive("/configuracoes") ? 2 : 1.5} />
            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-[var(--bg-card-elevated)] text-[var(--text-primary)] text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-[0_4px_12px_rgba(0,0,0,.15)] border border-[var(--border-default)] translate-x-1 group-hover:translate-x-0">
              Configurações
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}
