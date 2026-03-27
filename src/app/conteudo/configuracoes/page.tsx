"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus, Trash2, Edit3, Check, X, Download, AlertTriangle,
  Settings, Wifi,
} from "lucide-react";
import Shell from "@/components/Shell";
import UsinaNav from "@/components/usina/UsinaNav";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { fadeUp, staggerChild } from "@/lib/animations";
import {
  getRedesSociais, createRedeSocial, updateRedeSocial, deleteRedeSocial,
  exportAllData, clearAllData,
  type RedeSocial,
} from "@/lib/usina-data";

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const [redes, setRedes] = useState<RedeSocial[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", icone: "", cor: "" });
  const [newRede, setNewRede] = useState({ nome: "", icone: "", cor: "#3B82F6", ativa: true, ordem: 0 });
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const reload = useCallback(() => {
    setRedes(getRedesSociais());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleCreate = () => {
    if (!newRede.nome.trim()) return;
    createRedeSocial({
      nome: newRede.nome,
      icone: newRede.icone || "globe",
      cor: newRede.cor,
      ativa: true,
      ordem: redes.length,
    });
    setNewRede({ nome: "", icone: "", cor: "#3B82F6", ativa: true, ordem: 0 });
    setShowModal(false);
    reload();
    toast("Rede social criada", { type: "success" });
  };

  const startEdit = (r: RedeSocial) => {
    setEditingId(r.id);
    setEditForm({ nome: r.nome, icone: r.icone, cor: r.cor });
  };

  const saveEdit = (id: string) => {
    if (!editForm.nome.trim()) return;
    updateRedeSocial(id, { nome: editForm.nome, icone: editForm.icone, cor: editForm.cor });
    setEditingId(null);
    reload();
    toast("Salvo", { type: "success" });
  };

  const handleToggleAtiva = (r: RedeSocial) => {
    updateRedeSocial(r.id, { ativa: !r.ativa });
    reload();
  };

  const handleDeleteRede = (id: string) => {
    deleteRedeSocial(id);
    reload();
    toast("Rede social excluída", { type: "info" });
  };

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `usina-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Dados exportados", { type: "success" });
  };

  const handleClear = () => {
    clearAllData();
    setShowClearConfirm(false);
    reload();
    window.location.reload();
  };

  return (
    <Shell>
      <motion.div {...fadeUp()} className="space-y-8">
        <h1 className="font-fraunces text-2xl font-bold text-[var(--text-primary)]">Configurações</h1>

        <UsinaNav />

        {/* Redes Sociais */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-fraunces text-lg font-bold text-[var(--text-primary)]">Redes Sociais</h2>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>
              Adicionar
            </Button>
          </div>

          {redes.length === 0 ? (
            <EmptyState
              message="Nenhuma rede social cadastrada"
              icon={<Wifi size={32} />}
              action={<Button size="sm" onClick={() => setShowModal(true)}>Adicionar rede</Button>}
            />
          ) : (
            <Card className="p-0 divide-y divide-[var(--border-subtle)]">
              {redes.map((r, i) => {
                const isEditing = editingId === r.id;

                return (
                  <motion.div
                    key={r.id}
                    {...staggerChild(i)}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg-hover)] transition-colors group"
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="color"
                          value={editForm.cor}
                          onChange={(e) => setEditForm(prev => ({ ...prev, cor: e.target.value }))}
                          className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent shrink-0"
                        />
                        <input
                          type="text"
                          value={editForm.nome}
                          onChange={(e) => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
                          className="flex-1 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl px-3 py-1.5 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
                          placeholder="Nome"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editForm.icone}
                          onChange={(e) => setEditForm(prev => ({ ...prev, icone: e.target.value }))}
                          className="w-28 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl px-3 py-1.5 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
                          placeholder="Icone (lucide)"
                        />
                        <button onClick={() => saveEdit(r.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--green-text)] hover:bg-[var(--bg-hover)]">
                          <Check size={16} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]">
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="w-4 h-4 rounded-full shrink-0" style={{ background: r.cor }} />
                        <span className={`flex-1 font-dm text-sm font-medium ${r.ativa ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)] line-through"}`}>
                          {r.nome}
                        </span>
                        <span className="font-dm text-xs text-[var(--text-tertiary)]">{r.icone}</span>

                        {/* Ativa toggle */}
                        <button
                          onClick={() => handleToggleAtiva(r)}
                          className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${r.ativa ? "bg-[var(--orange-400)]" : "bg-[var(--bg-input)] border border-[var(--border-strong)]"}`}
                        >
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${r.ativa ? "translate-x-5" : "translate-x-1"}`} />
                        </button>

                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(r)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDeleteRede(r.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--red-text)] hover:bg-[var(--bg-hover)]">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </Card>
          )}
        </section>

        {/* Separator */}
        <div className="border-t border-[var(--border-subtle)]" />

        {/* Dados */}
        <section className="space-y-4">
          <h2 className="font-fraunces text-lg font-bold text-[var(--text-primary)]">Dados</h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="secondary" icon={<Download size={16} />} onClick={handleExport}>
              Exportar JSON
            </Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => setShowClearConfirm(true)}>
              Limpar Todos os Dados
            </Button>
          </div>
        </section>
      </motion.div>

      {/* Modal: New Rede */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Rede Social" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Nome *</label>
            <input
              type="text"
              value={newRede.nome}
              onChange={(e) => setNewRede(prev => ({ ...prev, nome: e.target.value }))}
              className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
              placeholder="Ex: Instagram, TikTok..."
              autoFocus
            />
          </div>

          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Icone (nome Lucide)</label>
            <input
              type="text"
              value={newRede.icone}
              onChange={(e) => setNewRede(prev => ({ ...prev, icone: e.target.value }))}
              className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
              placeholder="Ex: instagram, youtube, globe..."
            />
          </div>

          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Cor</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newRede.cor}
                onChange={(e) => setNewRede(prev => ({ ...prev, cor: e.target.value }))}
                className="w-10 h-10 rounded-xl border-0 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={newRede.cor}
                onChange={(e) => setNewRede(prev => ({ ...prev, cor: e.target.value }))}
                className="w-28 rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
                placeholder="#000000"
              />
            </div>
          </div>

          <Button onClick={handleCreate} disabled={!newRede.nome.trim()} className="w-full">
            Criar Rede Social
          </Button>
        </div>
      </Modal>

      {/* Modal: Clear Data Confirm */}
      <Modal isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="Limpar Dados" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(239,68,68,.08)] border border-[rgba(239,68,68,.2)]">
            <AlertTriangle size={18} className="text-[var(--red-text)] shrink-0 mt-0.5" />
            <p className="font-dm text-sm text-[var(--text-secondary)]">
              Isso vai <strong>apagar permanentemente</strong> todos os conteudos, tarefas, metas, editorias e redes sociais. Esta acao nao pode ser desfeita.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setShowClearConfirm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleClear} className="flex-1">
              Limpar Tudo
            </Button>
          </div>
        </div>
      </Modal>
    </Shell>
  );
}
