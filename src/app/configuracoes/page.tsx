"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { User, Palette, MessageSquare, Clock, LayoutGrid, Shield, CheckCircle, XCircle } from "lucide-react";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { getTemplates, updateTemplate, getSettings, updateSettings } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";
import { getModulosConfig, toggleModulo, resetOnboarding, type ModuloConfig } from "@/lib/modulos-config";
import { fadeUp, staggerChild } from "@/lib/animations";
import type { TemplateMensagem } from "@/types/database";

const VARS = ['{nome_paciente}', '{data_sessao}', '{horario_sessao}', '{nome_terapeuta}'];

function AdminApprovalSection() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data || []);
    setLoadingUsers(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleApproval = async (userId: string, approved: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ approved })
      .eq("id", userId);
    if (error) {
      toast("Erro ao atualizar usuario", { type: "error" });
    } else {
      toast(approved ? "Usuario aprovado!" : "Acesso revogado", { type: "success" });
      fetchUsers();
    }
  };

  const pending = users.filter(u => !u.approved && u.role !== "admin");
  const approved = users.filter(u => u.approved || u.role === "admin");

  return (
    <motion.div {...staggerChild(5)}>
      <Card className="mb-5">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={18} className="text-acc" />
          <h2 className="font-fraunces font-bold text-lg text-ink">Gerenciar usuários</h2>
        </div>

        {loadingUsers ? (
          <p className="font-dm text-sm text-ink-2">Carregando...</p>
        ) : (
          <>
            {/* Pendentes */}
            {pending.length > 0 && (
              <div className="mb-6">
                <h3 className="font-dm text-xs font-semibold text-[var(--orange-500)] uppercase tracking-wide mb-3">
                  Aguardando aprovacao ({pending.length})
                </h3>
                <div className="space-y-2">
                  {pending.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--orange-500)]/20">
                      <div>
                        <p className="font-dm text-sm font-medium text-[var(--text-primary)]">{u.full_name || "Sem nome"}</p>
                        <p className="font-dm text-xs text-[var(--text-tertiary)]">{u.email}</p>
                      </div>
                      <button
                        onClick={() => toggleApproval(u.id, true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors font-dm text-xs font-semibold"
                      >
                        <CheckCircle size={14} /> Aprovar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aprovados */}
            <div>
              <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mb-3">
                Usuarios aprovados ({approved.length})
              </h3>
              <div className="space-y-2">
                {approved.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-input)]">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-dm text-sm font-medium text-[var(--text-primary)]">
                          {u.full_name || "Sem nome"}
                          {u.role === "admin" && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--orange-500)]/10 text-[var(--orange-500)]">Admin</span>
                          )}
                        </p>
                        <p className="font-dm text-xs text-[var(--text-tertiary)]">{u.email}</p>
                      </div>
                    </div>
                    {u.role !== "admin" && (
                      <button
                        onClick={() => toggleApproval(u.id, false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors font-dm text-xs font-semibold"
                      >
                        <XCircle size={14} /> Revogar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {pending.length === 0 && approved.length === 0 && (
              <p className="font-dm text-sm text-ink-2">Nenhum usuario cadastrado.</p>
            )}
          </>
        )}
      </Card>
    </motion.div>
  );
}

export default function ConfiguracoesPage() {
  const { profile, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateMensagem[]>(getTemplates());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Work hours (#14)
  const [settings, setSettings] = useState(getSettings());
  const handleWorkHoursChange = (field: 'workHourStart' | 'workHourEnd', value: number) => {
    const updated = updateSettings({ [field]: value });
    setSettings(updated);
    toast('Horário de trabalho atualizado', { type: 'success' });
  };

  const insertVariable = (variable: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setEditContent(c => c + variable);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = editContent.slice(0, start);
    const after = editContent.slice(end);
    const newContent = before + variable + after;
    setEditContent(newContent);
    // Restore cursor position after the inserted variable
    requestAnimationFrame(() => {
      ta.focus();
      const cursorPos = start + variable.length;
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const startEdit = (t: TemplateMensagem) => { setEditingId(t.id); setEditContent(t.conteudo); };
  const saveEdit = () => {
    if (!editingId) return;
    updateTemplate(editingId, editContent);
    setTemplates(getTemplates());
    setEditingId(null);
  };

  return (
    <Shell>
      <motion.div {...fadeUp()}>
        <h1 className="font-fraunces font-bold text-ink mb-1" style={{ fontSize: "clamp(24px, 4vw, 32px)" }}>
          Configurações
        </h1>
        <p className="font-dm text-sm text-ink-2 mb-8">Preferências da conta e templates.</p>
      </motion.div>

      {/* Perfil */}
      <motion.div {...staggerChild(0)}>
        <Card className="mb-5">
          <div className="flex items-center gap-3 mb-4">
            <User size={18} className="text-acc" />
            <h2 className="font-fraunces font-bold text-lg text-ink">Perfil</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="font-dm text-xs text-ink-2">Nome</p>
              <p className="font-dm text-sm font-medium text-ink">{profile?.full_name}</p>
            </div>
            <div>
              <p className="font-dm text-xs text-ink-2">E-mail</p>
              <p className="font-dm text-sm font-medium text-ink">{profile?.email}</p>
            </div>
            <div>
              <p className="font-dm text-xs text-ink-2">CRP</p>
              <p className="font-dm text-sm font-medium text-ink">{profile?.username}</p>
            </div>
            <div>
              <p className="font-dm text-xs text-ink-2">Especialidades</p>
              <p className="font-dm text-sm font-medium text-ink">{profile?.is_admin ? 'Administrador' : 'Terapeuta'}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Aparência */}
      <motion.div {...staggerChild(1)}>
        <Card className="mb-5">
          <div className="flex items-center gap-3 mb-4">
            <Palette size={18} className="text-acc" />
            <h2 className="font-fraunces font-bold text-lg text-ink">Aparência</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p id="theme-label" className="font-dm text-sm text-ink">Tema</p>
              <p className="font-dm text-xs text-ink-2">{theme === 'light' ? 'Modo claro' : 'Modo escuro'}</p>
            </div>
            <button
              onClick={toggleTheme}
              role="switch"
              aria-checked={theme === 'dark'}
              aria-labelledby="theme-label"
              className={`relative w-12 h-7 rounded-full transition-colors ${theme === 'dark' ? 'bg-acc' : 'bg-line'}`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </Card>
      </motion.div>

      {/* Horário de trabalho (#14) */}
      <motion.div {...staggerChild(2)}>
        <Card className="mb-5">
          <div className="flex items-center gap-3 mb-4">
            <Clock size={18} className="text-acc" />
            <h2 className="font-fraunces font-bold text-lg text-ink">Horário de trabalho</h2>
          </div>
          <p className="font-dm text-xs text-ink-2 mb-4">Define o intervalo visível no calendário. Horas fora do expediente ficam escurecidas.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-dm text-sm font-medium text-ink mb-1.5">Início</label>
              <select
                value={settings.workHourStart}
                onChange={e => handleWorkHoursChange('workHourStart', Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl font-dm text-sm bg-white dark:bg-elevated border border-line text-ink outline-none focus:border-acc transition-colors"
              >
                {Array.from({ length: 18 }, (_, i) => i + 5).map(h => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-dm text-sm font-medium text-ink mb-1.5">Fim</label>
              <select
                value={settings.workHourEnd}
                onChange={e => handleWorkHoursChange('workHourEnd', Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl font-dm text-sm bg-white dark:bg-elevated border border-line text-ink outline-none focus:border-acc transition-colors"
              >
                {Array.from({ length: 18 }, (_, i) => i + 7).map(h => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Templates */}
      <motion.div {...staggerChild(3)}>
        <Card className="mb-5">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare size={18} className="text-acc" />
            <h2 className="font-fraunces font-bold text-lg text-ink">Templates de Mensagem</h2>
          </div>
          <p className="font-dm text-xs text-ink-2 mb-4">Edite os templates usados nas mensagens de WhatsApp.</p>
          <div className="space-y-4">
            {templates.map(t => (
              <div key={t.id} className="p-4 rounded-xl border border-line">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-dm text-sm font-semibold text-ink">{t.nome}</p>
                  {editingId === t.id ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancelar</Button>
                      <Button size="sm" onClick={saveEdit}>Salvar</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => startEdit(t)}>Editar</Button>
                  )}
                </div>
                {editingId === t.id ? (
                  <>
                    <textarea
                      ref={textareaRef}
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl font-dm text-sm bg-white dark:bg-elevated border border-line text-ink outline-none focus:border-acc resize-none"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {VARS.map(v => (
                        <button key={v} onClick={() => insertVariable(v)}
                          className="font-dm text-[10px] px-2 py-0.5 rounded-md bg-elevated dark:bg-[#333] text-ink-2 hover:bg-acc hover:text-white transition-colors">
                          {v}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="font-dm text-sm text-ink-2 whitespace-pre-wrap">{t.conteudo}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Módulos visíveis */}
      <ModulosSection />

      {/* Admin: Gerenciar usuários */}
      {isAdmin && <AdminApprovalSection />}
    </Shell>
  );
}

// ─── Módulos Section ───
function ModulosSection() {
  const { toast } = useToast();
  const [modulos, setModulos] = useState<ModuloConfig[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setModulos(getModulosConfig());
    setMounted(true);
  }, []);

  const handleToggle = (id: string) => {
    const updated = toggleModulo(id);
    setModulos(updated);
    const mod = updated.find(m => m.id === id);
    toast(mod?.ativo ? `${mod.label} ativado` : `${mod?.label} ocultado`, { type: "success" });
    // Reload sidebar after short delay
    setTimeout(() => window.location.reload(), 600);
  };

  const handleResetOnboarding = () => {
    resetOnboarding();
    toast("Assistente de configuração será exibido no próximo acesso", { type: "info" });
  };

  if (!mounted) return null;

  const fixos = modulos.filter(m => m.fixo);
  const opcionais = modulos.filter(m => !m.fixo);

  return (
    <motion.div {...staggerChild(4)}>
      <Card>
        <div className="flex items-center gap-3 mb-1">
          <LayoutGrid size={18} style={{ color: "var(--orange-500)" }} />
          <h2 className="font-fraunces font-bold text-lg" style={{ color: "var(--text-primary)" }}>Módulos visíveis</h2>
        </div>
        <p className="font-dm text-xs mb-5" style={{ color: "var(--text-secondary)" }}>
          Escolha quais ferramentas ficam visíveis na barra lateral. Módulos ocultos continuam existindo e podem ser reativados a qualquer momento.
        </p>

        {/* Fixed modules */}
        <p className="font-dm text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>Sempre visíveis</p>
        <div className="flex gap-2 flex-wrap mb-5">
          {fixos.map(m => (
            <span key={m.id} className="px-3 py-1 rounded-full font-dm text-xs font-medium" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>
              {m.label}
            </span>
          ))}
        </div>

        {/* Optional modules */}
        <p className="font-dm text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>Ferramentas opcionais</p>
        <div className="space-y-2">
          {opcionais.map(m => (
            <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: "var(--bg-input)" }}>
              <div>
                <p className="font-dm text-sm font-medium" style={{ color: m.ativo ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                  {m.label}
                </p>
                <p className="font-dm text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  {m.descricao}
                </p>
              </div>
              <button
                onClick={() => handleToggle(m.id)}
                className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3"
                style={{ background: m.ativo ? "var(--orange-500)" : "var(--border-strong)" }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all"
                  style={{ left: m.ativo ? "22px" : "2px" }}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Reset onboarding */}
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <button
            onClick={handleResetOnboarding}
            className="font-dm text-xs hover:underline"
            style={{ color: "var(--text-tertiary)" }}
          >
            Reexibir assistente de configuração inicial
          </button>
        </div>
      </Card>
    </motion.div>
  );
}
