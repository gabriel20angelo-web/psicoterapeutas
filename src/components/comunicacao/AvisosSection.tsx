"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pin, Eye, Pencil, Trash2, Check, X } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import RichEditor from "@/components/ui/RichEditor";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import ReacaoBar from "@/components/comunicacao/ReacaoBar";
import { getAvisos, createAviso, marcarAvisoLido, updateAviso, deleteAviso } from "@/lib/comunicacao-data";
import { staggerChild } from "@/lib/animations";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";
import type { CategoriaAviso } from "@/types/comunicacao";

const BASE_CATEGORIAS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  urgente: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500", label: "Urgente" },
  informativo: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500", label: "Informativo" },
  atualizacao: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", dot: "bg-purple-500", label: "Atualização" },
  lembrete: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", label: "Lembrete" },
};

const CUSTOM_CAT_KEY = 'allos-custom-aviso-categories';
const CUSTOM_CAT_COLORS = ["bg-emerald-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500", "bg-lime-500", "bg-orange-500", "bg-teal-500"];

function loadCustomCats(): { value: string; label: string }[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(CUSTOM_CAT_KEY) || '[]'); } catch { return []; }
}

function saveCustomCat(value: string, label: string) {
  const safeValue = value.replace(/[^\w-]/g, '_');
  const safeLabel = label.replace(/[\\"/]/g, '');
  const existing = loadCustomCats();
  if (!existing.find(c => c.value === safeValue)) {
    existing.push({ value: safeValue, label: safeLabel });
    localStorage.setItem(CUSTOM_CAT_KEY, JSON.stringify(existing));
  }
}

function deleteCustomCat(value: string) {
  const updated = loadCustomCats().filter(c => c.value !== value);
  localStorage.setItem(CUSTOM_CAT_KEY, JSON.stringify(updated));
}

function getCatColor(cat: string): { bg: string; text: string; dot: string; label: string } {
  if (BASE_CATEGORIAS[cat]) return BASE_CATEGORIAS[cat];
  const customs = loadCustomCats();
  const custom = customs.find(c => c.value === cat);
  const colorIdx = customs.indexOf(custom!) % CUSTOM_CAT_COLORS.length;
  const dot = CUSTOM_CAT_COLORS[colorIdx] || "bg-gray-500";
  return { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", dot, label: custom?.label || cat };
}

interface Props {
  onRefresh: () => void;
}

export default function AvisosSection({ onRefresh }: Props) {
  const { user, isAdmin } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);
  const [customCats, setCustomCats] = useState(loadCustomCats);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const { toast } = useToast();
  const refresh = () => { forceUpdate((n) => n + 1); onRefresh(); };

  const avisos = getAvisos();

  const allCatOptions = [
    { value: "urgente", label: "Urgente" },
    { value: "informativo", label: "Informativo" },
    { value: "atualizacao", label: "Atualização" },
    { value: "lembrete", label: "Lembrete" },
    ...customCats,
  ];

  const [form, setForm] = useState({
    titulo: "",
    corpo: "",
    categoria: "informativo" as CategoriaAviso,
    fixado: false,
    imagem_url: "",
  });

  const handleCreate = () => {
    if (!form.titulo || !form.corpo) return;
    createAviso({ titulo: form.titulo, corpo: form.corpo, categoria: form.categoria, fixado: form.fixado, imagem_url: form.imagem_url || undefined });
    setForm({ titulo: "", corpo: "", categoria: "informativo", fixado: false, imagem_url: "" });
    setShowCreate(false);
    refresh();
  };

  const handleMarcarLido = (id: string) => {
    marcarAvisoLido(id);
    refresh();
  };

  const handleEditStart = (aviso: { id: string; titulo: string; corpo: string }) => {
    setEditingId(aviso.id);
    setEditTitle(aviso.titulo);
    setEditBody(aviso.corpo);
  };

  const handleEditSave = (id: string) => {
    if (!editTitle.trim() || !editBody.trim()) return;
    updateAviso(id, { titulo: editTitle.trim(), corpo: editBody.trim() });
    setEditingId(null);
    toast("Aviso atualizado", { type: "success" });
    refresh();
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
  };

  const handleDeleteConfirm = (id: string) => {
    deleteAviso(id);
    setDeletingId(null);
    toast("Aviso excluído", { type: "success" });
    refresh();
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)} icon={<Plus size={16} />}>
            Novo Aviso
          </Button>
        )}
      </div>

      {avisos.length === 0 ? (
        <EmptyState message="Nenhum aviso publicado ainda." />
      ) : (
        <div className="space-y-4">
          {avisos.map((aviso, i) => {
            const cat = getCatColor(aviso.categoria);
            const isOwner = aviso.autor_id === user?.id;
            const isEditing = editingId === aviso.id;
            const isDeleting = deletingId === aviso.id;

            return (
              <motion.div key={aviso.id} {...staggerChild(i)}>
                <Card
                  className={`relative ${!aviso.lido ? "border-l-4 border-l-acc" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {aviso.fixado && (
                        <span className="text-amber-500" title="Fixado">
                          <Pin size={14} className="fill-current" />
                        </span>
                      )}
                      {isEditing ? (
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="font-fraunces font-bold text-base text-ink bg-white dark:bg-elevated border border-line rounded-lg px-2 py-1 outline-none focus:border-acc"
                        />
                      ) : (
                        <h3 className="font-fraunces font-bold text-base text-ink">
                          {aviso.titulo}
                        </h3>
                      )}
                      <Badge bg={cat.bg} text={cat.text} dot={cat.dot} label={cat.label} />
                    </div>
                    <div className="flex items-center gap-1">
                      {isOwner && !isEditing && !isDeleting && (
                        <>
                          <button
                            onClick={() => handleEditStart(aviso)}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-elevated dark:hover:bg-[#252525] transition-colors text-ink-4 hover:text-ink-2"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingId(aviso.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-ink-4 hover:text-red-500"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      {!aviso.lido && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarcarLido(aviso.id)}
                          icon={<Eye size={14} />}
                        >
                          Marcar como lido
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 mb-3">
                      <RichEditor
                        content={editBody}
                        onChange={setEditBody}
                        placeholder="Edite o conteúdo..."
                        minHeight="120px"
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleEditSave(aviso.id)} icon={<Check size={14} />}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleEditCancel} icon={<X size={14} />}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : isDeleting ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 mb-3">
                      <span className="font-dm text-sm text-red-700 dark:text-red-400">Excluir este aviso?</span>
                      <Button size="sm" onClick={() => handleDeleteConfirm(aviso.id)} icon={<Trash2 size={14} />}>
                        Excluir
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeletingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <>
                      {aviso.imagem_url && (
                        <div className="mb-3 rounded-xl overflow-hidden">
                          <img src={aviso.imagem_url} alt="" className="w-full max-h-64 object-cover rounded-xl" />
                        </div>
                      )}
                      <div className="prose-editor font-dm text-sm text-[var(--text-secondary)] mb-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: aviso.corpo }} />
                    </>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="font-dm text-xs text-ink-4">
                      {aviso.autor_nome} &middot;{" "}
                      {formatDistanceToNow(new Date(aviso.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                    <ReacaoBar
                      tipoEntidade="aviso"
                      entidadeId={aviso.id}
                      reacoes={aviso.reacoes}
                      onReact={refresh}
                    />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Novo Aviso">
        <div className="space-y-4">
          <Input
            label="Título"
            value={form.titulo}
            onChange={(val) => setForm({ ...form, titulo: val })}
            placeholder="Título do aviso"
            required
          />
          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Corpo <span className="text-red-400">*</span>
            </label>
            <RichEditor
              content={form.corpo}
              onChange={(html) => setForm({ ...form, corpo: html })}
              placeholder="Escreva o conteúdo do aviso..."
              minHeight="150px"
            />
          </div>
          <Input
            label="Imagem de capa (URL)"
            value={form.imagem_url}
            onChange={(val) => setForm({ ...form, imagem_url: val })}
            placeholder="https://exemplo.com/imagem.jpg"
          />
          {form.imagem_url && (
            <div className="rounded-xl overflow-hidden border border-[var(--border-default)]">
              <img src={form.imagem_url} alt="Preview" className="w-full max-h-40 object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </div>
          )}
          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Categoria</label>
            <select
              value={showNewCat ? "_new" : form.categoria}
              onChange={(e) => {
                if (e.target.value === "_new") { setShowNewCat(true); }
                else { setShowNewCat(false); setForm({ ...form, categoria: e.target.value as CategoriaAviso }); }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors"
            >
              {allCatOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              <option value="_new">+ Nova categoria</option>
            </select>
            {showNewCat && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Nome da categoria..."
                  autoFocus
                  className="flex-1 px-3 py-2 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] placeholder:text-[var(--text-tertiary)]"
                />
                <button onClick={() => {
                  if (!newCatName.trim()) return;
                  const val = newCatName.trim().toLowerCase().replace(/\s+/g, '_');
                  saveCustomCat(val, newCatName.trim());
                  setCustomCats(loadCustomCats());
                  setForm({ ...form, categoria: val as CategoriaAviso });
                  setShowNewCat(false);
                  setNewCatName("");
                }} className="px-4 py-2 rounded-xl bg-[var(--orange-500)] text-white font-dm text-sm font-medium hover:opacity-90">Criar</button>
              </div>
            )}
            {customCats.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {customCats.map(c => (
                  <span key={c.value} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] font-dm text-xs text-[var(--text-secondary)]">
                    {c.label}
                    <button onClick={() => { deleteCustomCat(c.value); setCustomCats(loadCustomCats()); if (form.categoria === c.value) setForm({ ...form, categoria: 'informativo' }); }} className="ml-0.5 text-[var(--text-tertiary)] hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 font-dm text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={form.fixado}
              onChange={(e) => setForm({ ...form, fixado: e.target.checked })}
              className="w-4 h-4 rounded border-line text-acc focus:ring-acc"
            />
            Fixar no topo
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!form.titulo || !form.corpo}>
              Publicar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
