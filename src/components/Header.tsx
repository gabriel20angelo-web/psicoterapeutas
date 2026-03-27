"use client";
import { useState, useRef, useEffect } from "react";
import { Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth, forceLogout } from "@/contexts/AuthContext";
import { getGreeting } from "@/lib/calendar-utils";
import GlobalSearch from "./GlobalSearch";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const { user, profile, isAdmin } = useAuth();
  const hour = new Date().getHours();
  const displayName = profile?.full_name?.split(' ').slice(0, 2).join(' ') || user?.email?.split('@')[0] || '';
  const initials = profile?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || '?';
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[68px] z-30 header-bar">
      <div className="max-w-[1100px] mx-auto px-5 md:px-8 lg:px-10 h-14 flex items-center justify-between gap-4">
        <div className="hidden md:block">
          <p className="font-dm text-[13px] text-[var(--text-tertiary)]">
            {getGreeting(hour)}, <span className="font-medium text-[var(--text-primary)]">{displayName}</span>
          </p>
        </div>
        <div className="flex-1 flex justify-center">
          <GlobalSearch />
        </div>
        <div className="flex items-center gap-1.5">
          <NotificationBell />
          <ThemeToggle />
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 rounded-full bg-[var(--orange-500)] flex items-center justify-center hover:brightness-110 transition-all glow-accent-sm avatar-bounce overflow-hidden"
              title={profile?.full_name || user?.email || ''}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="font-dm text-xs font-bold text-white">{initials}</span>
              )}
            </button>
            {showMenu && (
              <div className="absolute right-0 top-12 w-[180px] sm:w-[200px] card-base overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                  <p className="font-dm text-sm font-semibold text-[var(--text-primary)] truncate">{profile?.full_name || user?.email}</p>
                  <p className="font-mono text-xs text-[var(--text-tertiary)]">{profile?.email || user?.email}</p>
                  {isAdmin && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-dm font-semibold bg-[var(--orange-500)]/10 text-[var(--orange-500)]">Admin</span>
                  )}
                </div>
                <Link href="/configuracoes" onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors font-dm text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  <Settings size={16} /> Configurações
                </Link>
                <button
                  onClick={forceLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors font-dm text-sm text-red-500 hover:text-red-400 border-t border-[var(--border-subtle)]"
                >
                  <LogOut size={16} /> Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="header-wave" />
    </header>
  );
}
