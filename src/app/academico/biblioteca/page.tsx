"use client";
import { useState } from "react";
import Link from "next/link";
import { useRef } from "react";
import {
  ArrowLeft, BookMarked, Plus, Pencil, Trash2, Search,
  BookOpen, BarChart3, ImagePlus, X,
} from "lucide-react";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import EmptyState from "@/components/ui/EmptyState";
import RichEditor from "@/components/ui/RichEditor";
import { useToast } from "@/contexts/ToastContext";
import {
  getBiblioteca, createBibliotecaItem, updateBibliotecaItem, deleteBibliotecaItem,
  getProgressoLeitura, getConfigAcademica,
} from "@/lib/academico-data";
import type { BibliotecaItem, BibliotecaInput, StatusLeitura, FormatoLeitura } from "@/types/academico";
import { LABEL_STATUS_LEITURA, LABEL_FORMATO_LEITURA } from "@/types/academico";

const STATUS_COLORS: Record<StatusLeitura, { bg: string; text: string }> = {
  quero_ler:    { bg: "var(--bg-hover)", text: "var(--text-secondary)" },
  em_progresso: { bg: "rgba(59,130,246,.1)", text: "#3b82f6" },
  lido:         { bg: "rgba(16,185,129,.1)", text: "#10b981" },
  abandonado:   { bg: "var(--red-bg)", text: "var(--red-text)" },
};

export default function BibliotecaPage() {
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterFormato, setFilterFormato] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BibliotecaItem | null>(null);
  const [showStats, setShowStats] = useState(false);

  // Form state
  const [form, setForm] = useState<Partial<BibliotecaInput>>({});

  const currentYear = new Date().getFullYear();
  const progresso = getProgressoLeitura(currentYear);
  const allBooks = getBiblioteca();

  let filtered = allBooks;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(b => b.titulo.toLowerCase().includes(q) || b.autores.toLowerCase().includes(q));
  }
  if (filterStatus) filtered = filtered.filter(b => b.status === filterStatus);
  if (filterFormato) filtered = filtered.filter(b => b.formato === filterFormato);

  const sorted = [...filtered].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const openForm = (item?: BibliotecaItem) => {
    if (item) {
      setEditing(item);
      setForm({ ...item });
    } else {
      setEditing(null);
      setForm({
        titulo: "", autores: "", genero: "", formato: "fisico", status: "quero_ler",
        data_inicio: "", data_fim: "", num_paginas: null, andamento: "",
        ano_leitura: null, projetos: [], avaliacao: "", editora: "",
        nacionalidade_autor: "", anotacoes_html: "", capa_base64: "",
      });
    }
    setShowForm(true);
  };

  const setF = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!form.titulo?.trim()) return;
    const data: BibliotecaInput = {
      titulo: form.titulo || "",
      autores: form.autores || "",
      genero: form.genero || "",
      formato: (form.formato as FormatoLeitura) || "fisico",
      status: (form.status as StatusLeitura) || "quero_ler",
      data_inicio: form.data_inicio || "",
      data_fim: form.data_fim || "",
      num_paginas: form.num_paginas || null,
      andamento: form.andamento || "",
      ano_leitura: form.data_fim ? new Date(form.data_fim).getFullYear() : form.ano_leitura || null,
      projetos: form.projetos || [],
      avaliacao: form.avaliacao || "",
      editora: form.editora || "",
      nacionalidade_autor: form.nacionalidade_autor || "",
      anotacoes_html: form.anotacoes_html || "",
      capa_base64: form.capa_base64 || "",
    };
    if (editing) {
      updateBibliotecaItem(editing.id, data);
      toast("Livro atualizado", { type: "success" });
    } else {
      createBibliotecaItem(data);
      toast("Livro adicionado", { type: "success" });
    }
    setShowForm(false);
    refresh();
  };

  // Stats
  const lidos = allBooks.filter(b => b.status === "lido");
  const lidosAno = lidos.filter(b => b.ano_leitura === currentYear);
  const generos = new Map<string, number>();
  lidosAno.forEach(b => { if (b.genero) generos.set(b.genero, (generos.get(b.genero) || 0) + 1); });

  return (
    <Shell>
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/academico" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors">
              <ArrowLeft size={18} className="text-[var(--text-tertiary)]" />
            </Link>
            <div>
              <h1 className="font-fraunces text-xl font-bold text-[var(--text-primary)]">Biblioteca de Leituras</h1>
              <p className="font-dm text-sm text-[var(--text-tertiary)]">{allBooks.length} livros &middot; {lidosAno.length}/{progresso.meta} lidos em {currentYear}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowStats(!showStats)}>
              <BarChart3 size={14} /> Stats
            </Button>
            <Button variant="primary" size="sm" onClick={() => openForm()}>
              <Plus size={14} /> Novo livro
            </Button>
          </div>
        </div>

        {/* Reading goal progress */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-dm text-xs text-[var(--text-tertiary)]">Meta {currentYear}: {progresso.lidos}/{progresso.meta} livros</span>
              <span className="font-mono text-xs font-bold text-[var(--orange-500)]">{progresso.percentual}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--orange-500)] transition-all" style={{ width: `${Math.min(progresso.percentual, 100)}%` }} />
            </div>
          </div>
        </Card>

        {/* Stats panel */}
        {showStats && (
          <Card>
            <div className="p-4">
              <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Estatísticas {currentYear}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">{lidosAno.length}</p>
                  <p className="font-dm text-xs text-[var(--text-tertiary)]">Lidos</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">{allBooks.filter(b => b.status === "em_progresso").length}</p>
                  <p className="font-dm text-xs text-[var(--text-tertiary)]">Em leitura</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">{allBooks.filter(b => b.status === "quero_ler").length}</p>
                  <p className="font-dm text-xs text-[var(--text-tertiary)]">Na fila</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">{lidos.length}</p>
                  <p className="font-dm text-xs text-[var(--text-tertiary)]">Total lidos</p>
                </div>
              </div>
              {generos.size > 0 && (
                <div className="mt-4">
                  <p className="font-dm text-xs text-[var(--text-tertiary)] mb-2">Por gênero ({currentYear}):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(generos.entries()).sort((a, b) => b[1] - a[1]).map(([g, n]) => (
                      <Badge key={g} bg="var(--bg-hover)" text="var(--text-secondary)" label={`${g}: ${n}`} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar livros..."
              className="input-hamilton w-full pl-8 text-sm py-2" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-hamilton text-sm py-2">
            <option value="">Todos status</option>
            <option value="quero_ler">Quero ler</option>
            <option value="em_progresso">Em progresso</option>
            <option value="lido">Lido</option>
            <option value="abandonado">Abandonado</option>
          </select>
          <select value={filterFormato} onChange={e => setFilterFormato(e.target.value)} className="input-hamilton text-sm py-2">
            <option value="">Todos formatos</option>
            <option value="fisico">Físico</option>
            <option value="digital">Digital</option>
            <option value="audiobook">Audiobook</option>
          </select>
        </div>

        {/* Book grid */}
        {sorted.length === 0 ? (
          <EmptyState icon={<BookMarked size={40} />} message="Nenhum livro. Comece adicionando suas leituras." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sorted.map(b => {
              const sc = STATUS_COLORS[b.status];
              return (
                <Card key={b.id} hover onClick={() => openForm(b)}>
                  <div className="p-4 flex gap-3">
                    {/* Capa do livro */}
                    {b.capa_base64 ? (
                      <div className="w-16 h-24 rounded-lg overflow-hidden shrink-0 border border-[var(--border-subtle)]">
                        <img src={b.capa_base64} alt={b.titulo} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-24 rounded-lg shrink-0 border border-[var(--border-subtle)] bg-[var(--bg-hover)] flex items-center justify-center">
                        <BookMarked size={20} className="text-[var(--text-tertiary)]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-dm text-sm font-semibold text-[var(--text-primary)] line-clamp-2">{b.titulo}</p>
                          <p className="font-dm text-xs text-[var(--text-tertiary)] mt-0.5">{b.autores || "Autor desconhecido"}</p>
                        </div>
                        <Badge bg={sc.bg} text={sc.text} label={LABEL_STATUS_LEITURA[b.status]} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {b.genero && <Badge bg="var(--bg-hover)" text="var(--text-tertiary)" label={b.genero} />}
                        <Badge bg="var(--bg-hover)" text="var(--text-tertiary)" label={LABEL_FORMATO_LEITURA[b.formato]} />
                        {b.andamento && <span className="font-dm text-[10px] text-[var(--orange-500)]">{b.andamento}</span>}
                      </div>
                      {b.projetos.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {b.projetos.map(p => (
                            <span key={p} className="px-1.5 py-0.5 rounded text-[10px] font-dm bg-[rgba(139,92,246,.1)] text-[#8b5cf6]">{p}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Book Form Modal */}
        <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? "Editar Livro" : "Novo Livro"} size="lg">
          <div className="space-y-4">
            {/* Upload de capa */}
            <div>
              <label className="block font-dm text-xs font-medium text-[var(--text-secondary)] mb-2">Capa do livro</label>
              <div className="flex items-center gap-4">
                {form.capa_base64 ? (
                  <div className="relative w-20 h-28 rounded-lg overflow-hidden border border-[var(--border-subtle)]">
                    <img src={form.capa_base64} alt="Capa" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setF("capa_base64", "")}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center hover:bg-[var(--red-bg)]">
                      <X size={10} className="text-[var(--text-tertiary)]" />
                    </button>
                  </div>
                ) : (
                  <label className="w-20 h-28 rounded-lg border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--orange-500)] flex flex-col items-center justify-center cursor-pointer transition-colors">
                    <ImagePlus size={18} className="text-[var(--text-tertiary)] mb-1" />
                    <span className="font-dm text-[10px] text-[var(--text-tertiary)]">Upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 500_000) { alert("Imagem muito grande (máx. 500KB)"); return; }
                      const reader = new FileReader();
                      reader.onload = (ev) => setF("capa_base64", ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }} />
                  </label>
                )}
                <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Formato vertical, máx. 500KB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Título *" value={form.titulo || ""} onChange={val => setF("titulo", val)} />
              <Input label="Autor(es)" value={form.autores || ""} onChange={val => setF("autores", val)} />
              <Input label="Gênero/Área" value={form.genero || ""} onChange={val => setF("genero", val)} placeholder="Ex: Psicanálise, TCC" />
              <Select label="Formato" value={form.formato || "fisico"} onChange={val => setF("formato", val)} options={[
                { value: "fisico", label: "Físico" },
                { value: "digital", label: "Digital" },
                { value: "audiobook", label: "Audiobook" },
              ]} />
              <Select label="Status" value={form.status || "quero_ler"} onChange={val => setF("status", val)} options={[
                { value: "quero_ler", label: "Quero ler" },
                { value: "em_progresso", label: "Em progresso" },
                { value: "lido", label: "Lido" },
                { value: "abandonado", label: "Abandonado" },
              ]} />
              <Input label="Páginas" type="number" value={String(form.num_paginas ?? "")} onChange={val => setF("num_paginas", val ? Number(val) : null)} />
              <Input label="Andamento" value={form.andamento || ""} onChange={val => setF("andamento", val)} placeholder="Ex: pág. 120 ou 45%" />
              <Input label="Editora" value={form.editora || ""} onChange={val => setF("editora", val)} />
              <Input label="Data início" type="date" value={form.data_inicio || ""} onChange={val => setF("data_inicio", val)} />
              <Input label="Data fim" type="date" value={form.data_fim || ""} onChange={val => setF("data_fim", val)} />
              <Input label="Nacionalidade do autor" value={form.nacionalidade_autor || ""} onChange={val => setF("nacionalidade_autor", val)} />
              <Input label="Projetos (separar por vírgula)" value={(form.projetos || []).join(", ")} onChange={val => setF("projetos", val.split(",").map(s => s.trim()).filter(Boolean))} placeholder="Ex: Graduação, TCC" />
            </div>
            <Textarea label="Avaliação pessoal" value={form.avaliacao || ""} onChange={val => setF("avaliacao", val)} />
            <div>
              <label className="block font-dm text-xs font-medium text-[var(--text-secondary)] mb-1">Anotações de leitura</label>
              <RichEditor content={form.anotacoes_html || ""} onChange={v => setF("anotacoes_html", v)} placeholder="Suas anotações..." minHeight="150px" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              {editing && (
                <Button variant="danger" onClick={() => { deleteBibliotecaItem(editing.id); setShowForm(false); refresh(); toast("Livro excluído", { type: "info" }); }}>
                  <Trash2 size={14} /> Excluir
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSave}>{editing ? "Salvar" : "Adicionar"}</Button>
            </div>
          </div>
        </Modal>
      </div>
    </Shell>
  );
}
