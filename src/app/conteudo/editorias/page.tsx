"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus, Trash2, Edit3, Check, X, Palette, AlertTriangle, HelpCircle,
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
  getEditorias, createEditoria, updateEditoria, deleteEditoria,
  getConteudos,
  type Editoria,
} from "@/lib/usina-data";

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

export default function EditoriasPage() {
  const { toast } = useToast();
  const [editorias, setEditorias] = useState<Editoria[]>([]);
  const [conteudoCounts, setConteudoCounts] = useState<Record<string, number>>({});
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", cor: "" });
  const [newEditoria, setNewEditoria] = useState({ nome: "", cor: "#3B82F6" });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const reload = useCallback(() => {
    const eds = getEditorias();
    setEditorias(eds);
    const conteudos = getConteudos();
    const counts: Record<string, number> = {};
    eds.forEach(e => { counts[e.id] = 0; });
    conteudos.forEach(c => {
      if (c.editoria_id && counts[c.editoria_id] !== undefined) {
        counts[c.editoria_id]++;
      }
    });
    setConteudoCounts(counts);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleCreate = () => {
    if (!newEditoria.nome.trim()) return;
    createEditoria({
      nome: newEditoria.nome,
      cor: newEditoria.cor,
      ordem: editorias.length,
    });
    setNewEditoria({ nome: "", cor: "#3B82F6" });
    setShowModal(false);
    reload();
    toast("Editoria criada", { type: "success" });
  };

  const startEdit = (e: Editoria) => {
    setEditingId(e.id);
    setEditForm({ nome: e.nome, cor: e.cor });
  };

  const saveEdit = (id: string) => {
    if (!editForm.nome.trim()) return;
    updateEditoria(id, { nome: editForm.nome, cor: editForm.cor });
    setEditingId(null);
    reload();
    toast("Editoria atualizada", { type: "success" });
  };

  const handleDelete = (id: string) => {
    deleteEditoria(id);
    setDeleteConfirm(null);
    reload();
    toast("Editoria excluída", { type: "info" });
  };

  return (
    <Shell>
      <motion.div {...fadeUp()} className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <h1 className="font-fraunces text-2xl font-bold text-[var(--text-primary)]">Editorias</h1>
            <HelpTip text="Editorias são categorias temáticas para organizar seu conteúdo. Exemplos: Tutorial, Bastidores, Opinião, Lifestyle. Cada editoria tem uma cor para identificação visual rápida no calendário e no pipeline." />
          </div>
          <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>
            Nova Editoria
          </Button>
        </div>

        <UsinaNav />

        {editorias.length === 0 ? (
          <EmptyState
            message="Nenhuma editoria criada"
            icon={<Palette size={32} />}
            action={<Button size="sm" onClick={() => setShowModal(true)}>Criar primeira editoria</Button>}
          />
        ) : (
          <Card className="p-0 divide-y divide-[var(--border-subtle)]">
            {editorias.map((ed, i) => {
              const isEditing = editingId === ed.id;
              const count = conteudoCounts[ed.id] || 0;

              return (
                <motion.div
                  key={ed.id}
                  {...staggerChild(i)}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg-hover)] transition-colors group"
                >
                  {isEditing ? (
                    <>
                      <input
                        type="color"
                        value={editForm.cor}
                        onChange={(e) => setEditForm(prev => ({ ...prev, cor: e.target.value }))}
                        className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={editForm.nome}
                        onChange={(e) => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
                        className="flex-1 bg-[var(--bg-input)] border border-[var(--border-strong)] rounded-xl px-3 py-1.5 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(ed.id); if (e.key === "Escape") setEditingId(null); }}
                      />
                      <button onClick={() => saveEdit(ed.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--green-text)] hover:bg-[var(--bg-hover)]">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]">
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="w-4 h-4 rounded-full shrink-0" style={{ background: ed.cor }} />
                      <span className="flex-1 font-dm text-sm font-medium text-[var(--text-primary)]">{ed.nome}</span>
                      <span className="font-dm text-xs text-[var(--text-tertiary)] tabular-nums">
                        {count} conteudo{count !== 1 ? "s" : ""}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(ed)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => setDeleteConfirm(ed.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--red-text)] hover:bg-[var(--bg-hover)]">
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
      </motion.div>

      {/* Modal: New Editoria */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nova Editoria" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Nome *</label>
            <input
              type="text"
              value={newEditoria.nome}
              onChange={(e) => setNewEditoria(prev => ({ ...prev, nome: e.target.value }))}
              className="w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-strong)] px-3 py-2 font-dm text-sm text-[var(--text-primary)] outline-none focus:border-[var(--orange-400)]"
              placeholder="Ex: Tutorial, Bastidores..."
              autoFocus
            />
          </div>

          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Cor</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newEditoria.cor}
                onChange={(e) => setNewEditoria(prev => ({ ...prev, cor: e.target.value }))}
                className="w-10 h-10 rounded-xl border-0 cursor-pointer bg-transparent"
              />
              <span className="font-dm text-sm text-[var(--text-tertiary)]">{newEditoria.cor}</span>
            </div>
          </div>

          <Button onClick={handleCreate} disabled={!newEditoria.nome.trim()} className="w-full">
            Criar Editoria
          </Button>
        </div>
      </Modal>

      {/* Modal: Delete Confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Excluir Editoria" size="sm">
        {deleteConfirm && (() => {
          const ed = editorias.find(e => e.id === deleteConfirm);
          const count = conteudoCounts[deleteConfirm] || 0;
          return (
            <div className="space-y-4">
              {count > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(245,158,11,.08)] border border-[rgba(245,158,11,.2)]">
                  <AlertTriangle size={18} className="text-[#F59E0B] shrink-0 mt-0.5" />
                  <p className="font-dm text-sm text-[var(--text-secondary)]">
                    Esta editoria tem <strong>{count} conteúdo{count > 1 ? "s" : ""}</strong> vinculado{count > 1 ? "s" : ""}. Eles ficarão sem editoria.
                  </p>
                </div>
              )}
              <p className="font-dm text-sm text-[var(--text-secondary)]">
                Tem certeza que deseja excluir <strong>&quot;{ed?.nome}&quot;</strong>?
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setDeleteConfirm(null)} className="flex-1">
                  Cancelar
                </Button>
                <Button variant="danger" onClick={() => handleDelete(deleteConfirm)} className="flex-1">
                  Excluir
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </Shell>
  );
}
