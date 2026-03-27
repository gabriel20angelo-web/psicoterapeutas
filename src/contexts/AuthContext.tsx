"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";
import { isAdminRole, canCreateAviso, canCreateEncaminhamento, canCreateFormacaoCanonica, canApproveBlog, canManageUsers } from "@/types/database";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileReady: boolean;
  isAdmin: boolean;
  isAdminMaster: boolean;
  isApproved: boolean;
  canCreateAviso: boolean;
  canCreateEncaminhamento: boolean;
  canCreateFormacaoCanonica: boolean;
  canApproveBlog: boolean;
  canManageUsers: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null, profile: null, loading: true, profileReady: false,
  isAdmin: false, isAdminMaster: false, isApproved: false,
  canCreateAviso: false, canCreateEncaminhamento: false,
  canCreateFormacaoCanonica: false, canApproveBlog: false, canManageUsers: false,
  logout: () => {},
});

export function suggestUsername(fullName: string): string {
  return fullName.trim().split(/\s+/).slice(0, 2)
    .map(n => n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    .join(".");
}

export function forceLogout() {
  try { require('@/lib/data').resetData(); } catch {}
  try { supabase.auth.signOut(); } catch {}
  try { localStorage.clear(); } catch {}
  try {
    document.cookie.split(";").forEach(c => {
      document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
  } catch {}
  window.location.href = "/login";
}

function profileFromUser(user: User): Profile {
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email || '',
    full_name: meta.full_name || meta.name || user.email?.split('@')[0] || '',
    username: meta.username || '',
    is_admin: false,
    approved: false,
    role: 'terapeuta',
    avatar_url: meta.avatar_url || meta.picture || undefined,
    created_at: user.created_at || '',
    updated_at: '',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  const [dbCheckFailed, setDbCheckFailed] = useState(false);

  // Refs to prevent race conditions
  const currentUserIdRef = useRef<string | null>(null);
  const fetchInFlightRef = useRef<string | null>(null); // tracks which user ID is being fetched

  const fetchAndMergeProfile = useCallback(async (authUser: User, token?: string) => {
    // GUARD: If we're already fetching for this exact user, skip
    if (fetchInFlightRef.current === authUser.id) {
      return;
    }

    // GUARD: If profile is already loaded for this user, skip
    // Uses functional setState to read current value without stale closure
    let alreadyLoaded = false;
    setProfile(prev => {
      if (prev && prev.id === authUser.id && prev.role !== 'terapeuta') {
        alreadyLoaded = true;
      }
      return prev;
    });
    if (alreadyLoaded) return;

    fetchInFlightRef.current = authUser.id;

    // Only set base profile if we DON'T already have a profile for this user
    setProfile(prev => {
      if (prev && prev.id === authUser.id) return prev; // keep existing
      return profileFromUser(authUser);
    });
    setDbCheckFailed(false);

    try {
      // Get token if not provided
      if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token ?? undefined;
      }

      if (!token) {
        setDbCheckFailed(true);
        return;
      }

      const res = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // If this user is no longer the current user, discard result
      if (currentUserIdRef.current !== authUser.id) {
        return;
      }

      if (!res.ok) {
        setDbCheckFailed(true);
        return;
      }

      const { profile: data } = await res.json();

      if (data) {
        setProfile(prev => {
          const base = prev ?? profileFromUser(authUser);
          return {
            ...base,
            role: data.role || base.role,
            approved: data.approved ?? base.approved,
            is_admin: data.is_admin ?? base.is_admin,
            username: data.username || base.username,
            full_name: data.full_name || base.full_name,
            avatar_url: data.avatar_url || base.avatar_url,
          };
        });
      } else {
        setDbCheckFailed(true);
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') console.error("[Auth] Profile fetch failed:", e);
      setDbCheckFailed(true);
    } finally {
      fetchInFlightRef.current = null;
      setProfileReady(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let initialSessionHandled = false;
    const timeout = setTimeout(() => {
      if (active) { setLoading(false); setProfileReady(true); }
    }, 4000);

    // Use onAuthStateChange as the SINGLE source of truth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!active) return;


        if (event === 'SIGNED_OUT') {
          currentUserIdRef.current = null;
          fetchInFlightRef.current = null;
          setUser(null);
          setProfile(null);
          setProfileReady(false);
          setDbCheckFailed(false);
          setLoading(false);
          return;
        }

        const newUser = session?.user ?? null;
        const newUserId = newUser?.id ?? null;
        const token = session?.access_token ?? undefined;

        // INITIAL_SESSION or SIGNED_IN — handle initial load
        if (event === 'INITIAL_SESSION') {
          initialSessionHandled = true;
          currentUserIdRef.current = newUserId;
          setUser(newUser);
          if (newUser) {
            await fetchAndMergeProfile(newUser, token);
          }
          setLoading(false);
          return;
        }

        // TOKEN_REFRESHED — same user, don't refetch profile
        if (event === 'TOKEN_REFRESHED') {
          return;
        }

        // Same user — don't touch anything
        if (newUserId && newUserId === currentUserIdRef.current) {
          return;
        }

        // Different user (account switch)
        currentUserIdRef.current = newUserId;
        setUser(newUser);
        if (newUser) {
          await fetchAndMergeProfile(newUser, token);
        } else {
          setProfile(null);
          setProfileReady(false);
        }
      }
    );

    // Fallback: if onAuthStateChange didn't fire INITIAL_SESSION within 1s, use getSession
    const fallbackTimeout = setTimeout(async () => {
      if (!active || initialSessionHandled) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active || initialSessionHandled) return;
        const u = session?.user ?? null;
        currentUserIdRef.current = u?.id ?? null;
        setUser(u);
        if (u) await fetchAndMergeProfile(u, session?.access_token ?? undefined);
        setLoading(false);
      } catch {
        if (active) setLoading(false);
      }
    }, 1000);

    return () => {
      active = false;
      clearTimeout(timeout);
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, [fetchAndMergeProfile]);

  const role = profile?.role;

  const value = useMemo<AuthContextValue>(() => ({
    user, profile, loading, profileReady,
    isAdmin: isAdminRole(role),
    isAdminMaster: role === 'admin_master',
    isApproved: isAdminRole(role) || !!profile?.is_admin || (profile?.approved ?? false),
    canCreateAviso: canCreateAviso(role),
    canCreateEncaminhamento: canCreateEncaminhamento(role),
    canCreateFormacaoCanonica: canCreateFormacaoCanonica(role),
    canApproveBlog: canApproveBlog(role),
    canManageUsers: canManageUsers(role),
    logout: forceLogout,
  }), [user, profile, loading, profileReady, dbCheckFailed, role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
