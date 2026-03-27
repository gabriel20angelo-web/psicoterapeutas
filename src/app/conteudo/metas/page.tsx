"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Target, TrendingUp, Edit3, Trash2, X, Check, HelpCircle } from "lucide-react";
import Shell from "@/components/Shell";
import UsinaNav from "@/components/usina/UsinaNav";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { fadeUp, staggerChild } from "@/lib/animations";
import {
  getMetas, createMeta, updateMeta, deleteMeta, calcularMetaAtual,
  getRedesSociais,
  type Meta, type TipoMeta, type RedeSocial,
} from "@/lib/usina-data";

const TIPO_OPTIONS: { value: TipoMeta; label: string }[] = [
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "anual", label: "Anual" },
];

const TIPO_COLORS: Record<TipoMeta, string> = {
  semanal: "#3B82F6",
  mensal: "#8B5CF6",
  trimestral: "#F59E0B",
  anual: "#10B981",
};

// ─── HelpTip ───

function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button onClick={() => setOpen(!open)} className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors" title="Ajuda">
        <HelpCircle size={14} />
      </button>
      {open && (
        <div className="absolute left-full ml-2 top-0 z-50 w-64 p-3 rounded-xl card-base shadow-float text-left">
          <p className="font-dm text-xs text-[var(--text-secondary)] leading-relaxed">{text}</p>
          <button onClick={() => setOpen(false)} className="font-dm text-[10px] text-[var(--orange-500)] mt-2 hover:underline">Entendi</button>
        </div>
      )}
    </div>
  );
}

export default function MetasPage() {
  const { toast } = useToast();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [redes, setRedes] = useState<RedeSocial[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ titulo: "", valor_alvo: 0, valor_atual: 0 });
  const [newMeta, setNewMeta] = useState({
    titulo: "", rede_social_id: "", tipo: "semanal" as TipoMeta, valor_alvo: 1, ativa: true,
  });

  const reload = useCallback(() => {
    setMetas(getMetas());
    setRedes(getRedesSociais());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleCreate = () => {
    if (!newMeta.titulo.trim()) return;
    createMeta({
      titulo: newMeta.titulo,
      rede_social_id: newMeta.rede_social_id || null,
      tipo: newMeta.tipo,
      valor_alvo: newMeta.valor_alvo,
      ativa: true,
    });
    setNewMeta({ titulo: "", rede_social_id: "", tipo: "semanal", valor_alvo: 1, ativa: true });
    setShowModal(false);
    reload();
    toast("Meta criada", { type: "success" });
  };

  const startEdit = (meta: Meta) => {
    setEditingId(meta.id);
    setEditForm({ titulo: meta.titulo, valor_alvo: meta.valor_alvo, valor_atual: meta.valor_atual });
  };

  const saveEdit = (id: string) => {
    updateMeta(id, { titulo: editForm.titulo, valor_alvo: editForm.valor_alvo, valor_atual: editForm.valor_atual });
    setEditingId(null);
    reload();
    toast("Meta atualizada", { type: "success" });
  };

  const handleDelete = (id: string) => {
    deleteMeta(id);
    reload();
    toast("Meta excluída", { type: "info" });
  };

  const activeMetas = metas.filter(m => m.ativa);
  const inactiveMetas = metas.filter(m => !m.ativa);

  return (
    <Shell>
      <motion.div {...fadeUp()} className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <h1 className="font-fraunces text-2xl font-bold text-[var(--text-primary)]">Metas</h1>
            <HelpTip text="Defina metas de publicação por período (semanal, mensal, etc.). Quando vinculada a uma rede social, o progresso é calculado automaticamente com base nos conteúdos postados." />
          </div>
          <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>
            Nova Meta
          </Button>
        </div>

        <UsinaNav />

        {activeMetas.length === 0 ? (
          <EmptyState
            message="Nenhuma meta ativa"
            icon={<Target size={32} />}
            action={<Button size="sm" onClick={() => setShowModal(true)}>Criar primeira meta</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMetas.map((meta, i) => {
              const atual = calcularMetaAtual(meta);
              const pct = meta.valor_alvo > 0 ? Math.min((atual / meta.valor_alvo) * 100, 100) : 0;
              const rede = meta.rede_social_id ? redes.find(r => r.id === meta.rede_social_id) : null;
              const isEditing = editingId === meta.id;

              return (
                <motion.div key={meta.id} {...staggerChild(i)}>
                  <Card className="space-y-4 relative group">
                    {/* Actions */}
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(meta.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--green-text)] hover:bg-[var(--bg-hover)]">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]">
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(meta)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDelete(meta.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--red-text)] hover:bg-[var(--bg-hover)]">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Header */}
                    <div className="flex items-start gap-3 pr-16">
                      {rede && (
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${rede.cor}20` }}>
                          <span className="w-3 h-3 rounded-full" style={{ background: rede.cor }} />
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.titulo}
                            onChange={(e) => setEditForm(prev => ({ ...prev, titulo: e.target.value }))}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg px-2 py-1 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
                            autoFocus
                          />
                        ) : (
                          <h3 className="font-dm text-sm font-semibold text-[var(--text-primary)] truncate">{meta.titulo}</h3>
                        )}
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md font-dm text-[10px] font-semibold mt-1"
                          style={{ background: `${TIPO_COLORS[meta.tipo]}15`, color: TIPO_COLORS[meta.tipo] }}
                        >
                          {meta.tipo.charAt(0).toUpperCase() + meta.tipo.slice(1)}
                        </span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex items-end justify-between mb-2">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editForm.valor_atual}
                              onChange={(e) => setEditForm(prev => ({ ...prev, valor_atual: Number(e.target.value) }))}
                              className="w-16 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg px-2 py-1 font-dm text-sm text-[var(--text-primary)] outline-none"
                              min={0}
                            />
                            <span className="font-dm text-xs text-[var(--text-tertiary)]">/</span>
                            <input
                              type="number"
                              value={editForm.valor_alvo}
                              onChange={(e) => setEditForm(prev => ({ ...prev, valor_alvo: Number(e.target.value) }))}
                              className="w-16 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-lg px-2 py-1 font-dm text-sm text-[var(--text-primary)] outline-none"
                              min={1}
                            />
                          </div>
                        ) : (
                          <span className="font-dm text-sm text-[var(--text-secondary)]">
                            <strong className="text-[var(--text-primary)]">{atual}</strong> / {meta.valor_alvo}
                          </span>
                        )}
                        <span className="font-dm text-xs font-semibold" style={{ color: pct >= 100 ? "var(--green-text)" : "var(--text-tertiary)" }}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--bg-input)] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: pct >= 100 ? "var(--green-text)" : "var(--orange-400)" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>

                    {/* Ativa toggle */}
                    <button
                      onClick={() => { updateMeta(meta.id, { ativa: false }); reload(); }}
                      className="font-dm text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      Desativar
                    </button>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {inactiveMetas.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Metas Inativas</h2>
            <div className="space-y-2">
              {inactiveMetas.map(meta => (
                <div key={meta.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                  <span className="font-dm text-sm text-[var(--text-tertiary)]">{meta.titulo}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { updateMeta(meta.id, { ativa: true }); reload(); }}
                      className="font-dm text-xs text-[var(--orange-400)] hover:text-[var(--orange-300)]"
                    >
                      Reativar
                    </button>
                    <button
                      onClick={() => handleDelete(meta.id)}
                      className="font-dm text-xs text-[var(--text-tertiary)] hover:text-[var(--red-text)]"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Modal: New Meta */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Meta">
        <div className="space-y-4">
          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Titulo *</label>
            <input
              type="text"
              value={newMeta.titulo}
              onChange={(e) => setNewMeta(prev => ({ ...prev, titulo: e.target.value }))}
              className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
              placeholder="Ex: 3 posts por semana no Instagram"
              autoFocus
            />
          </div>

          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Rede Social (opcional)</label>
            <select
              value={newMeta.rede_social_id}
              onChange={(e) => setNewMeta(prev => ({ ...prev, rede_social_id: e.target.value }))}
              className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
            >
              <option value="">Nenhuma (meta manual)</option>
              {redes.filter(r => r.ativa).map(r => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Tipo</label>
            <select
              value={newMeta.tipo}
              onChange={(e) => setNewMeta(prev => ({ ...prev, tipo: e.target.value as TipoMeta }))}
              className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
            >
              {TIPO_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Valor Alvo</label>
            <input
              type="number"
              value={newMeta.valor_alvo}
              onChange={(e) => setNewMeta(prev => ({ ...prev, valor_alvo: Number(e.target.value) }))}
              className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
              min={1}
            />
          </div>

          <Button onClick={handleCreate} disabled={!newMeta.titulo.trim()} className="w-full">
            Criar Meta
          </Button>
        </div>
      </Modal>
    </Shell>
  );
}
