"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Users,
  FileText,
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ExternalLink,
  Menu,
} from "lucide-react";

const NAV = [
  { label: "Painel", href: "/", icon: LayoutDashboard },
  { label: "Agenda", href: "/agenda", icon: CalendarDays },
  { label: "Pacientes", href: "/pacientes", icon: Users },
  { label: "Anotações", href: "/anotacoes", icon: FileText },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

const ALLOS_URL = process.env.NEXT_PUBLIC_ALLOS_URL || "https://allos.org.br";

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navContent = (
    <nav className="flex flex-col gap-1.5 flex-1">
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl font-dm text-sm font-medium transition-all duration-200 ${
              active
                ? "bg-[rgba(46,158,143,0.1)] text-[#2E9E8F]"
                : "text-[#5C5C5C] hover:text-[#1A1A1A] hover:bg-[rgba(0,0,0,0.03)]"
            }`}
          >
            <item.icon size={20} strokeWidth={active ? 2 : 1.5} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-md border border-[#E5DFD3]"
        aria-label="Abrir menu"
      >
        <Menu size={20} className="text-[#1A1A1A]" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-[60] bg-black/20 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            key="mobile-sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-y-0 left-0 z-[70] w-[260px] md:hidden flex flex-col bg-[#FDFBF7] border-r border-[#E5DFD3] p-5"
          >
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-8 h-8 rounded-lg bg-[#2E9E8F] flex items-center justify-center">
                <span className="font-fraunces font-bold text-white text-sm">A</span>
              </div>
              <div>
                <p className="font-fraunces font-bold text-[15px] text-[#1A1A1A]">Allos</p>
                <p className="font-dm text-[9px] tracking-[.28em] text-[#5C5C5C] uppercase -mt-0.5">
                  Terapeutas
                </p>
              </div>
            </div>
            {navContent}
            <a
              href={ALLOS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 font-dm text-xs text-[#5C5C5C] hover:text-[#2E9E8F] transition-colors"
            >
              <ExternalLink size={14} />
              Site Allos
            </a>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-40 bg-[#FDFBF7] border-r border-[#E5DFD3] p-5 transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-[240px]"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-[#2E9E8F] flex items-center justify-center flex-shrink-0">
            <span className="font-fraunces font-bold text-white text-sm">A</span>
          </div>
          {!collapsed && (
            <div>
              <p className="font-fraunces font-bold text-[15px] text-[#1A1A1A]">Allos</p>
              <p className="font-dm text-[9px] tracking-[.28em] text-[#5C5C5C] uppercase -mt-0.5">
                Terapeutas
              </p>
            </div>
          )}
        </div>

        {navContent}

        {/* Bottom links */}
        <div className="mt-auto pt-4 border-t border-[#E5DFD3] flex flex-col gap-2">
          {!collapsed && (
            <a
              href={ALLOS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 font-dm text-xs text-[#5C5C5C] hover:text-[#2E9E8F] transition-colors"
            >
              <ExternalLink size={14} />
              Site Allos
            </a>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2 px-3 py-2 font-dm text-xs text-[#5C5C5C] hover:text-[#1A1A1A] transition-colors"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            <ChevronLeft
              size={16}
              className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
            {!collapsed && <span>Recolher</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
