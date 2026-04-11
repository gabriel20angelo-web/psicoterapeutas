"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Profile } from "@/types/database";

interface AuthContextValue {
  user: null;
  profile: Profile;
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

const FIXED_USER_ID = process.env.NEXT_PUBLIC_USER_ID || "00000000-0000-0000-0000-000000000001";

const FIXED_PROFILE: Profile = {
  id: FIXED_USER_ID,
  email: "eu@meu.app",
  full_name: "Gabriel",
  username: "gabriel",
  is_admin: true,
  approved: true,
  role: "admin_master",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const defaultValue: AuthContextValue = {
  user: null,
  profile: FIXED_PROFILE,
  loading: false,
  profileReady: true,
  isAdmin: true,
  isAdminMaster: true,
  isApproved: true,
  canCreateAviso: true,
  canCreateEncaminhamento: true,
  canCreateFormacaoCanonica: true,
  canApproveBlog: true,
  canManageUsers: true,
  logout: () => {},
};

const AuthContext = createContext<AuthContextValue>(defaultValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => defaultValue, []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
