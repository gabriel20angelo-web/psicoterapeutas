"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, Users, LayoutDashboard,
  FileText, Sparkles, Flame, BookOpen, GraduationCap, Settings2, MoreHorizontal, X,
} from "lucide-react";
import { getModulosAtivos } from "@/lib/modulos-config";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string }>;
}

const ALL_NAV: NavItem[] = [
  { label: "Painel", href: "/", icon: LayoutDashboard },
  { label: "Agenda", href: "/agenda", icon: CalendarDays },
  { label: "Pacientes", href: "/pacientes", icon: Users },
  { label: "PsiDocs", href: "/psidocs", icon: FileText },
  { label: "Usina", href: "/conteudo", icon: Sparkles },
  { label: "Forja", href: "/forja", icon: Flame },
  { label: "Blog", href: "/blog", icon: BookOpen },
  { label: "Acadêmico", href: "/academico", icon: GraduationCap },
  { label: "Config", href: "/configuracoes", icon: Settings2 },
];

function getFilteredNav(): NavItem[] {
  if (typeof window === "undefined") return ALL_NAV;
  const ativos = getModulosAtivos();
  const hrefsAtivos = new Set(ativos.map((m) => m.href));
  // Always include config
  return ALL_NAV.filter((item) => hrefsAtivos.has(item.href) || item.href === "/configuracoes");
}

export default function BottomNav() {
  const pathname = usePathname();
  const [nav] = useState(() => getFilteredNav());
  const [showMore, setShowMore] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Show max 4 items + "more" button if needed
  const MAX_VISIBLE = 4;
  const visibleItems = nav.slice(0, MAX_VISIBLE);
  const overflowItems = nav.slice(MAX_VISIBLE);
  const hasOverflow = overflowItems.length > 0;

  // Check if an overflow item is active
  const overflowActive = overflowItems.some((item) => isActive(item.href));

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the nav */}
      <div className="h-[72px] lg:hidden" />

      {/* More menu overlay */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              key="bottom-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMore(false)}
              className="fixed inset-0 z-[89] bg-black/40 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              key="bottom-menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-[76px] left-4 right-4 z-[90] lg:hidden rounded-2xl p-3 shadow-lg"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="font-dm text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
                  Mais módulos
                </span>
                <button onClick={() => setShowMore(false)} className="p-1 rounded-lg" style={{ color: "var(--text-tertiary)" }}>
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {overflowItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMore(false)}
                      className="flex flex-col items-center gap-1 py-3 px-1 rounded-xl transition-colors"
                      style={{
                        background: active ? "var(--orange-glow)" : "transparent",
                        color: active ? "var(--orange-500)" : "var(--text-secondary)",
                      }}
                    >
                      <item.icon size={22} strokeWidth={active ? 2 : 1.5} />
                      <span className="text-[10px] font-dm font-medium leading-tight text-center">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[80] lg:hidden"
        style={{
          background: "var(--bg-card)",
          borderTop: "1px solid var(--border-subtle)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-center justify-around h-[64px] px-2">
          {visibleItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all relative min-w-[56px]"
                style={{
                  color: active ? "var(--orange-500)" : "var(--text-tertiary)",
                }}
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute -top-1 w-8 h-0.5 rounded-full"
                    style={{ background: "var(--orange-500)" }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <item.icon size={22} strokeWidth={active ? 2.2 : 1.5} />
                <span
                  className="text-[10px] font-dm leading-tight"
                  style={{ fontWeight: active ? 600 : 400 }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {hasOverflow && (
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all min-w-[56px]"
              style={{
                color: overflowActive ? "var(--orange-500)" : "var(--text-tertiary)",
              }}
            >
              <MoreHorizontal size={22} strokeWidth={overflowActive ? 2.2 : 1.5} />
              <span
                className="text-[10px] font-dm leading-tight"
                style={{ fontWeight: overflowActive ? 600 : 400 }}
              >
                Mais
              </span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
