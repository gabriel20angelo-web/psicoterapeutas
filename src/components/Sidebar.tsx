"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Users, LayoutDashboard,
  Menu, FileText, X, BookOpen, Sparkles, Flame, Settings2, GraduationCap,
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
  { label: "Blog", href: "/blog", icon: BookOpen },
  { label: "Acadêmico", href: "/academico", icon: GraduationCap },
];

function getFilteredNav(): NavItem[] {
  if (typeof window === "undefined") return ALL_NAV;
  const ativos = getModulosAtivos();
  const hrefsAtivos = new Set(ativos.map(m => m.href));
  return ALL_NAV.filter(item => hrefsAtivos.has(item.href));
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [NAV] = useState(() => getFilteredNav());

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-card)] shadow-[var(--shadow-card)] border border-[var(--border-default)]"
        aria-label="Abrir menu"
      >
        <Menu size={20} className="text-[var(--text-primary)]" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)} className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden" />
        )}
      </AnimatePresence>

      {/* Mobile drawer (260px) */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 left-0 z-[70] w-[260px] lg:hidden flex flex-col bg-[var(--bg-card)] border-r border-[var(--border-default)]"
          >
            <div className="flex items-center justify-between p-5 pb-2">
              <div className="flex items-center gap-2.5">
                <Image src="/icon-allos.png" alt="App" width={36} height={36} className="rounded-lg" />
                <div>
                  <p className="font-fraunces font-bold text-[15px] text-[var(--text-primary)]">Meu</p>
                  <p className="font-dm text-[10px] tracking-[.28em] text-[var(--text-tertiary)] uppercase -mt-0.5">Consultório</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors">
                <X size={18} className="text-[var(--text-tertiary)]" />
              </button>
            </div>

            <nav className="flex flex-col gap-0.5 flex-1 px-3 py-4">
              {NAV.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    {...(active ? { "aria-current": "page" as const } : {})}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-dm text-sm font-medium transition-all duration-200 ${
                      active
                        ? "text-[var(--orange-500)] bg-[var(--orange-glow)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    <item.icon size={22} strokeWidth={active ? 2 : 1.5} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-[var(--border-subtle)]">
              <Link href="/configuracoes" onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-dm text-sm font-medium transition-all duration-200 ${
                  isActive("/configuracoes")
                    ? "text-[var(--orange-500)] bg-[var(--orange-glow)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                }`}>
                <Settings2 size={22} /> Configurações
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar — 68px icon bar */}
      <aside
        className="hidden lg:flex flex-col fixed top-[56px] bottom-0 left-0 z-[40] w-[68px] glass border-r border-[var(--border-subtle)]"
        style={{ background: "var(--bg-deepest)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center py-4">
          <Link href="/" className="relative group">
            <Image
              src="/icon-allos.png"
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
