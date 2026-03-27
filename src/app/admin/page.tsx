"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Users, CheckCircle, XCircle, Shield, BookOpen, ChevronDown } from "lucide-react";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import { fadeUp, staggerChild } from "@/lib/animations";
import type { Profile, UserRole } from "@/types/database";
import { canRemoveUser } from "@/types/database";
import { getBlogPosts, approveBlogPost, rejectBlogPost } from "@/lib/blog-data";

const ROLE_LABELS: Record<UserRole, { label: string; color: string }> = {
  admin_master: { label: "Admin Master", color: "text-red-500 bg-red-500/10" },
  admin: { label: "Admin", color: "text-[var(--orange-500)] bg-[var(--orange-500)]/10" },
  terapeuta_senior: { label: "Terapeuta Senior", color: "text-blue-500 bg-blue-500/10" },
  terapeuta: { label: "Terapeuta", color: "text-[var(--text-tertiary)] bg-[var(--bg-input)]" },
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin_master", label: "Admin Master" },
  { value: "admin", label: "Admin" },
  { value: "terapeuta_senior", label: "Terapeuta Senior" },
  { value: "terapeuta", label: "Terapeuta" },
];

export default function AdminPage() {
  const { profile, isAdmin, isAdminMaster } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [tab, setTab] = useState<"usuarios" | "blog">("usuarios");
  const [, forceUpdate] = useState(0);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) { router.replace("/"); return; }
    fetchUsers();
  }, [isAdmin, router, fetchUsers]);

  // Helper: all admin operations go through server API (bypasses RLS)
  const adminAction = async (userId: string, action: string, extra?: Record<string, string>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/manage-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ userId, action, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error || "Erro desconhecido" };
    return { ok: true, message: data.message };
  };

  const toggleApproval = async (userId: string, approved: boolean) => {
    const result = await adminAction(userId, approved ? "approve" : "revoke");
    if (!result.ok) { toast(result.error!, { type: "error" }); return; }
    toast(approved ? "Usuario aprovado!" : "Acesso revogado", { type: "success" });
    fetchUsers();
  };

  const denyUser = async (userId: string) => {
    const result = await adminAction(userId, "deny");
    if (!result.ok) { toast(result.error!, { type: "error" }); return; }
    toast("Usuario negado e removido", { type: "warning" });
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const changeRole = async (userId: string, newRole: UserRole) => {
    const result = await adminAction(userId, "change-role", { role: newRole });
    if (!result.ok) { toast(result.error!, { type: "error" }); return; }
    toast(`Role alterada para ${ROLE_LABELS[newRole].label}`, { type: "success" });
    fetchUsers();
  };

  if (!isAdmin) return null;

  const pending = users.filter(u => !u.approved && u.role !== 'admin_master');
  const approved = users.filter(u => u.approved || u.role === 'admin_master');

  // Blog posts pending approval
  const pendingPosts = getBlogPosts({ status: 'pendente' });

  const handleApproveBlog = (id: string) => {
    approveBlogPost(id);
    forceUpdate(n => n + 1);
    toast("Post aprovado!", { type: "success" });
  };

  const handleRejectBlog = (id: string) => {
    rejectBlogPost(id);
    forceUpdate(n => n + 1);
    toast("Post rejeitado", { type: "warning" });
  };

  return (
    <Shell>
      <motion.div {...fadeUp()}>
        <h1 className="font-fraunces font-bold text-2xl md:text-3xl text-[var(--text-primary)] mb-1">Painel Administrativo</h1>
        <p className="font-dm text-sm text-[var(--text-tertiary)] mb-6">Gerencie usuários, permissões e conteúdo.</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-input)] mb-6 w-fit">
        <button
          onClick={() => setTab("usuarios")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-dm text-sm font-medium transition-all ${
            tab === "usuarios" ? "bg-[var(--orange-500)] text-white shadow-md" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Users size={16} /> Usuários {pending.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white">{pending.length}</span>}
        </button>
        <button
          onClick={() => setTab("blog")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-dm text-sm font-medium transition-all ${
            tab === "blog" ? "bg-[var(--orange-500)] text-white shadow-md" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <BookOpen size={16} /> Blog {pendingPosts.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white">{pendingPosts.length}</span>}
        </button>
      </div>

      {tab === "usuarios" && (
        <motion.div {...staggerChild(0)}>
          {/* Pending */}
          {pending.length > 0 && (
            <Card className="mb-5">
              <h3 className="font-dm text-xs font-semibold text-[var(--orange-500)] uppercase tracking-wide mb-3">
                Aguardando aprovacao ({pending.length})
              </h3>
              <div className="space-y-2">
                {pending.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--orange-500)]/20">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--orange-500)] flex items-center justify-center">
                          <span className="font-dm text-xs font-bold text-white">{u.full_name?.[0] || '?'}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-dm text-sm font-medium text-[var(--text-primary)]">{u.full_name || "Sem nome"}</p>
                        <p className="font-dm text-xs text-[var(--text-tertiary)]">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleApproval(u.id, true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors font-dm text-xs font-semibold">
                        <CheckCircle size={14} /> Aprovar
                      </button>
                      <button onClick={() => denyUser(u.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors font-dm text-xs font-semibold">
                        <XCircle size={14} /> Negar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* All users */}
          <Card>
            <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-3">
              Todos os usuarios ({approved.length})
            </h3>
            {loadingUsers ? (
              <p className="font-dm text-sm text-[var(--text-tertiary)]">Carregando...</p>
            ) : (
              <div className="space-y-2">
                {approved.map(u => {
                  const roleInfo = ROLE_LABELS[u.role] || ROLE_LABELS.terapeuta;
                  const canChange = canRemoveUser(profile?.role, u.role) && u.id !== profile?.id;
                  return (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-input)]">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[var(--orange-500)] flex items-center justify-center">
                            <span className="font-dm text-xs font-bold text-white">{u.full_name?.[0] || '?'}</span>
                          </div>
                        )}
                        <div>
                          <p className="font-dm text-sm font-medium text-[var(--text-primary)]">
                            {u.full_name || "Sem nome"}
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${roleInfo.color}`}>{roleInfo.label}</span>
                          </p>
                          <p className="font-dm text-xs text-[var(--text-tertiary)]">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canChange && (
                          <>
                            <select
                              value={u.role}
                              onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                              className="font-dm text-xs bg-[var(--bg-input)] border border-[var(--border-default)] rounded-lg px-2 py-1 text-[var(--text-primary)]"
                            >
                              {ROLE_OPTIONS.filter(r => {
                                if (!isAdminMaster && r.value === 'admin_master') return false;
                                return true;
                              }).map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                            <button onClick={() => toggleApproval(u.id, false)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors font-dm text-xs">
                              <XCircle size={12} /> Revogar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {tab === "blog" && (
        <motion.div {...staggerChild(0)}>
          <Card>
            <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-3">
              Posts aguardando aprovacao ({pendingPosts.length})
            </h3>
            {pendingPosts.length === 0 ? (
              <p className="font-dm text-sm text-[var(--text-tertiary)]">Nenhum post pendente.</p>
            ) : (
              <div className="space-y-3">
                {pendingPosts.map(post => (
                  <div key={post.id} className="p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)]">
                    <h4 className="font-dm text-sm font-semibold text-[var(--text-primary)] mb-1">{post.titulo}</h4>
                    <p className="font-dm text-xs text-[var(--text-tertiary)] mb-1">por {post.autor_nome}</p>
                    <p className="font-dm text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">{post.excerpt}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveBlog(post.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors font-dm text-xs font-semibold">
                        <CheckCircle size={14} /> Aprovar
                      </button>
                      <button onClick={() => handleRejectBlog(post.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors font-dm text-xs font-semibold">
                        <XCircle size={14} /> Rejeitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </Shell>
  );
}
