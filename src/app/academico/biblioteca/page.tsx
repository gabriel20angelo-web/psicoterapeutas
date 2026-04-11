"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, BookMarked, Plus, Trash2, Search,
  BarChart3, ImagePlus, X, ListChecks, CheckSquare, Square,
  ChevronDown, ChevronRight, GripVertical, Circle, CheckCircle2, Clock,
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
  getProgressoLeitura, getDisciplinas,
} from "@/lib/academico-data";
import type { BibliotecaItem, BibliotecaInput, FormatoLeitura, TipoLeitura, CapituloLivro, TarefaLivro, StatusTarefaLivro, StatusLeituraFull, GrupoStatusLeitura, SubtarefaLivro } from "@/types/academico";
import { LABEL_STATUS_LEITURA_FULL, STATUS_LEITURA_GRUPO, LABEL_GRUPO_STATUS, LABEL_FORMATO_LEITURA, LABEL_TIPO_LEITURA } from "@/types/academico";

const GRUPO_COLORS: Record<GrupoStatusLeitura, { bg: string; text: string }> = {
  fila:          { bg: "var(--bg-hover)", text: "var(--text-secondary)" },
  para_fazer:    { bg: "rgba(245,158,11,.1)", text: "#f59e0b" },
  em_progresso:  { bg: "rgba(59,130,246,.1)", text: "#3b82f6" },
  concluido:     { bg: "rgba(16,185,129,.1)", text: "#10b981" },
  abandonado:    { bg: "rgba(239,68,68,.1)", text: "#ef4444" },
};

const TASK_STATUS_ICONS: Record<StatusTarefaLivro, React.ReactNode> = {
  pendente: <Circle size={16} className="text-[var(--text-tertiary)]" />,
  em_andamento: <Clock size={16} className="text-[#3b82f6]" />,
  concluida: <CheckCircle2 size={16} className="text-[#10b981]" />,
};

type FormTab = "info" | "capitulos" | "tarefas" | "notas";

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

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
  const [activeTab, setActiveTab] = useState<FormTab>("info");

  // Form state
  const [form, setForm] = useState<Partial<BibliotecaInput>>({});
  const [capitulos, setCapitulos] = useState<CapituloLivro[]>([]);
  const [tarefas, setTarefas] = useState<TarefaLivro[]>([]);

  const currentYear = new Date().getFullYear();
  const progresso = getProgressoLeitura(currentYear);
  const allBooks = getBiblioteca();
  const disciplinas = getDisciplinas();
  const [filterDisciplina, setFilterDisciplina] = useState("");

  // Status groups used for progress calculation
  const concluidos = new Set<string>(["lido_rapido", "lido", "lido_resumido", "lido_resumido_mapa"]);

  let filtered = allBooks;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(b => b.titulo.toLowerCase().includes(q) || b.autores.toLowerCase().includes(q));
  }
  if (filterStatus) {
    // Filter can be a grupo or a specific status
    if (Object.keys(LABEL_GRUPO_STATUS).includes(filterStatus)) {
      filtered = filtered.filter(b => STATUS_LEITURA_GRUPO[b.status] === filterStatus);
    } else {
      filtered = filtered.filter(b => b.status === filterStatus);
    }
  }
  if (filterFormato) filtered = filtered.filter(b => b.formato === filterFormato);
  if (filterDisciplina) filtered = filtered.filter(b => b.disciplina_id === filterDisciplina);

  const sorted = [...filtered].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const openForm = (item?: BibliotecaItem) => {
    if (item) {
      setEditing(item);
      setForm({ ...item });
      setCapitulos(item.capitulos || []);
      setTarefas(item.tarefas_livro || []);
    } else {
      setEditing(null);
      setForm({
        titulo: "", autores: "", genero: "", tipo_leitura: "livro", formato: "fisico", status: "quero_ler",
        disciplina_id: "", data_inicio: "", data_fim: "", num_paginas: null, andamento: "",
        ano_leitura: null, projetos: [], avaliacao: "", editora: "",
        nacionalidade_autor: "", anotacoes_html: "", capa_base64: "",
        capitulos: [], tarefas_livro: [],
      });
      setCapitulos([]);
      setTarefas([]);
    }
    setActiveTab("info");
    setShowForm(true);
  };

  const setF = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!form.titulo?.trim()) return;
    const data: BibliotecaInput = {
      titulo: form.titulo || "",
      autores: form.autores || "",
      genero: form.genero || "",
      tipo_leitura: (form.tipo_leitura as TipoLeitura) || "livro",
      formato: (form.formato as FormatoLeitura) || "fisico",
      status: (form.status as StatusLeituraFull) || "quero_ler",
      disciplina_id: form.disciplina_id || "",
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
      capitulos,
      tarefas_livro: tarefas,
      pomodoros_realizados: editing?.pomodoros_realizados || 0,
      tempo_total_seg: editing?.tempo_total_seg || 0,
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

  // ─── Capítulos helpers ───
  const addCapitulo = () => {
    const bookStatus = (form.status as StatusLeituraFull) || "quero_ler";
    setCapitulos(prev => [...prev, {
      id: `cap-${uid()}`, titulo: "", pagina_inicio: null, pagina_fim: null,
      status_leitura: bookStatus, herda_status: true, anotacoes: "", ordem: prev.length,
      pomodoros_realizados: 0, tempo_total_seg: 0,
    }]);
  };

  const updateCapitulo = (id: string, data: Partial<CapituloLivro>) => {
    setCapitulos(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const removeCapitulo = (id: string) => {
    setCapitulos(prev => prev.filter(c => c.id !== id).map((c, i) => ({ ...c, ordem: i })));
  };

  const cycleCapituloStatus = (id: string) => {
    // Cycle through all statuses
    const allStatuses: StatusLeituraFull[] = [
      "quero_ler", "para_ler", "para_ler_resumir", "para_ler_resumir_mapa",
      "lendo_rapido", "lendo", "lendo_resumindo", "lendo_resumindo_mapa",
      "lido_rapido", "lido", "lido_resumido", "lido_resumido_mapa", "abandonado",
    ];
    setCapitulos(prev => prev.map(c => {
      if (c.id !== id) return c;
      const idx = allStatuses.indexOf(c.status_leitura || "para_ler");
      return { ...c, status_leitura: allStatuses[(idx + 1) % allStatuses.length], herda_status: false };
    }));
  };

  const moveCapitulo = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= capitulos.length) return;
    setCapitulos(prev => {
      const arr = [...prev];
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr.map((c, i) => ({ ...c, ordem: i }));
    });
  };

  // ─── Tarefas helpers ───
  const addTarefa = () => {
    setTarefas(prev => [...prev, {
      id: `tl-${uid()}`, titulo: "", status: "pendente" as StatusTarefaLivro,
      prazo: "", subtarefas: [], created_at: new Date().toISOString(),
    }]);
  };

  const updateTarefa = (id: string, data: Partial<TarefaLivro>) => {
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  };

  const removeTarefa = (id: string) => {
    setTarefas(prev => prev.filter(t => t.id !== id));
  };

  const cycleTaskStatus = (id: string) => {
    const order: StatusTarefaLivro[] = ["pendente", "em_andamento", "concluida"];
    setTarefas(prev => prev.map(t => {
      if (t.id !== id) return t;
      const idx = order.indexOf(t.status);
      return { ...t, status: order[(idx + 1) % order.length] };
    }));
  };

  const addSubtarefa = (tarefaId: string) => {
    setTarefas(prev => prev.map(t => {
      if (t.id !== tarefaId) return t;
      return { ...t, subtarefas: [...(t.subtarefas || []), { id: `st-${uid()}`, titulo: "", concluida: false }] };
    }));
  };

  const updateSubtarefa = (tarefaId: string, subId: string, data: Partial<SubtarefaLivro>) => {
    setTarefas(prev => prev.map(t => {
      if (t.id !== tarefaId) return t;
      return { ...t, subtarefas: (t.subtarefas || []).map(s => s.id === subId ? { ...s, ...data } : s) };
    }));
  };

  const removeSubtarefa = (tarefaId: string, subId: string) => {
    setTarefas(prev => prev.map(t => {
      if (t.id !== tarefaId) return t;
      return { ...t, subtarefas: (t.subtarefas || []).filter(s => s.id !== subId) };
    }));
  };

  // Stats
  const lidos = allBooks.filter(b => concluidos.has(b.status));
  const lidosAno = lidos.filter(b => b.ano_leitura === currentYear);
  const generos = new Map<string, number>();
  lidosAno.forEach(b => { if (b.genero) generos.set(b.genero, (generos.get(b.genero) || 0) + 1); });

  // Capítulos stats for card
  const getCapProgress = (b: BibliotecaItem) => {
    const caps = b.capitulos || [];
    if (caps.length === 0) return null;
    const done = caps.filter(c => concluidos.has(c.status_leitura)).length;
    return { done, total: caps.length };
  };

  const tabItems: { key: FormTab; label: string; icon: React.ReactNode }[] = [
    { key: "info", label: "Informações", icon: <BookMarked size={14} /> },
    { key: "capitulos", label: `Capítulos${capitulos.length ? ` (${capitulos.length})` : ""}`, icon: <ListChecks size={14} /> },
    { key: "tarefas", label: `Tarefas${tarefas.length ? ` (${tarefas.length})` : ""}`, icon: <CheckSquare size={14} /> },
    { key: "notas", label: "Notas", icon: <GripVertical size={14} /> },
  ];

  const capsDone = capitulos.filter(c => concluidos.has(c.status_leitura)).length;

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
                  <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">{allBooks.filter(b => STATUS_LEITURA_GRUPO[b.status] === "em_progresso").length}</p>
                  <p className="font-dm text-xs text-[var(--text-tertiary)]">Em leitura</p>
                </div>
                <div className="text-center">
                  <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">{allBooks.filter(b => STATUS_LEITURA_GRUPO[b.status] === "fila" || STATUS_LEITURA_GRUPO[b.status] === "para_fazer").length}</p>
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
            <optgroup label="Grupos">
              <option value="fila">Fila</option>
              <option value="para_fazer">Para fazer</option>
              <option value="em_progresso">Em progresso</option>
              <option value="concluido">Concluído</option>
              <option value="abandonado">Abandonado</option>
            </optgroup>
            <optgroup label="Específicos">
              {Object.entries(LABEL_STATUS_LEITURA_FULL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </optgroup>
          </select>
          <select value={filterFormato} onChange={e => setFilterFormato(e.target.value)} className="input-hamilton text-sm py-2">
            <option value="">Todos formatos</option>
            <option value="fisico">Físico</option>
            <option value="digital">Digital</option>
            <option value="audiobook">Audiobook</option>
          </select>
          {disciplinas.length > 0 && (
            <select value={filterDisciplina} onChange={e => setFilterDisciplina(e.target.value)} className="input-hamilton text-sm py-2">
              <option value="">Todas disciplinas</option>
              {disciplinas.map(d => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          )}
        </div>

        {/* Book grid */}
        {sorted.length === 0 ? (
          <EmptyState icon={<BookMarked size={40} />} message="Nenhum livro. Comece adicionando suas leituras." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sorted.map(b => {
              const grupo = STATUS_LEITURA_GRUPO[b.status] || "fila";
              const sc = GRUPO_COLORS[grupo];
              const capProg = getCapProgress(b);
              const pendingTasks = (b.tarefas_livro || []).filter(t => t.status !== "concluida").length;
              return (
                <Card key={b.id} hover onClick={() => openForm(b)}>
                  <div className="p-4 flex gap-3">
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
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="font-dm text-sm font-semibold text-[var(--text-primary)] line-clamp-2">{b.titulo}</p>
                          <p className="font-dm text-xs text-[var(--text-tertiary)] mt-0.5">{b.autores || "Autor desconhecido"}</p>
                        </div>
                        <Badge bg={sc.bg} text={sc.text} label={LABEL_STATUS_LEITURA_FULL[b.status] || b.status} />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {b.tipo_leitura === "artigo" && <Badge bg="rgba(139,92,246,.1)" text="#8b5cf6" label="Artigo" />}
                        {b.genero && <Badge bg="var(--bg-hover)" text="var(--text-tertiary)" label={b.genero} />}
                        <Badge bg="var(--bg-hover)" text="var(--text-tertiary)" label={LABEL_FORMATO_LEITURA[b.formato]} />
                        {b.andamento && <span className="font-dm text-[10px] text-[var(--orange-500)]">{b.andamento}</span>}
                      </div>
                      {/* Capítulos + Tarefas + Tempo indicators */}
                      {(capProg || pendingTasks > 0 || b.tempo_total_seg > 0) && (
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {capProg && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                                <div className="h-full rounded-full bg-[#10b981] transition-all" style={{ width: `${(capProg.done / capProg.total) * 100}%` }} />
                              </div>
                              <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{capProg.done}/{capProg.total}</span>
                            </div>
                          )}
                          {b.tempo_total_seg > 0 && (
                            <span className="font-mono text-[10px] text-[#3b82f6] flex items-center gap-0.5">
                              <Clock size={10} /> {Math.floor(b.tempo_total_seg / 3600)}h{Math.floor((b.tempo_total_seg % 3600) / 60).toString().padStart(2, "0")}m
                            </span>
                          )}
                          {b.pomodoros_realizados > 0 && (
                            <span className="font-mono text-[10px] text-[var(--orange-500)]">
                              {b.pomodoros_realizados} 🍅
                            </span>
                          )}
                          {pendingTasks > 0 && (
                            <span className="font-dm text-[10px] text-[var(--orange-500)] flex items-center gap-0.5">
                              <CheckSquare size={10} /> {pendingTasks} pendente{pendingTasks > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      )}
                      {b.projetos.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
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
            {/* Tabs */}
            <div className="flex gap-1 border-b border-[var(--border-subtle)] overflow-x-auto pb-px -mx-1 px-1">
              {tabItems.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-dm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                    activeTab === t.key
                      ? "text-[var(--orange-500)] border-b-2 border-[var(--orange-500)] -mb-px"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  }`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* ─── TAB: INFO ─── */}
            {activeTab === "info" && (
              <div className="space-y-4">
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
                  <Select label="Tipo" value={form.tipo_leitura || "livro"} onChange={val => setF("tipo_leitura", val)} options={[
                    { value: "livro", label: "Livro" },
                    { value: "artigo", label: "Artigo" },
                  ]} />
                  <Select label="Formato" value={form.formato || "fisico"} onChange={val => setF("formato", val)} options={[
                    { value: "fisico", label: "Físico" },
                    { value: "digital", label: "Digital" },
                    { value: "audiobook", label: "Audiobook" },
                  ]} />
                  <div>
                    <label className="block font-dm text-xs font-medium text-[var(--text-secondary)] mb-1">Status</label>
                    <select value={form.status || "quero_ler"} onChange={e => setF("status", e.target.value)} className="input-hamilton w-full text-sm py-2">
                      {Object.entries(LABEL_STATUS_LEITURA_FULL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <Input label="Páginas" type="number" value={String(form.num_paginas ?? "")} onChange={val => setF("num_paginas", val ? Number(val) : null)} />
                  <Input label="Andamento" value={form.andamento || ""} onChange={val => setF("andamento", val)} placeholder="Ex: pág. 120 ou 45%" />
                  <Input label="Editora" value={form.editora || ""} onChange={val => setF("editora", val)} />
                  {disciplinas.length > 0 && (
                    <div>
                      <label className="block font-dm text-xs font-medium text-[var(--text-secondary)] mb-1">Disciplina</label>
                      <select value={form.disciplina_id || ""} onChange={e => setF("disciplina_id", e.target.value)} className="input-hamilton w-full text-sm py-2">
                        <option value="">Nenhuma</option>
                        {disciplinas.map(d => (
                          <option key={d.id} value={d.id}>{d.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Input label="Data início" type="date" value={form.data_inicio || ""} onChange={val => setF("data_inicio", val)} />
                  <Input label="Data fim" type="date" value={form.data_fim || ""} onChange={val => setF("data_fim", val)} />
                  <Input label="Nacionalidade do autor" value={form.nacionalidade_autor || ""} onChange={val => setF("nacionalidade_autor", val)} />
                  <Input label="Projetos (separar por vírgula)" value={(form.projetos || []).join(", ")} onChange={val => setF("projetos", val.split(",").map(s => s.trim()).filter(Boolean))} placeholder="Ex: Graduação, TCC" />
                </div>
                <Textarea label="Avaliação pessoal" value={form.avaliacao || ""} onChange={val => setF("avaliacao", val)} />
              </div>
            )}

            {/* ─── TAB: CAPÍTULOS ─── */}
            {activeTab === "capitulos" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-dm text-sm font-medium text-[var(--text-primary)]">
                      Capítulos do livro
                    </p>
                    {capitulos.length > 0 && (
                      <p className="font-dm text-xs text-[var(--text-tertiary)]">
                        {capsDone}/{capitulos.length} lidos
                      </p>
                    )}
                  </div>
                  <Button variant="secondary" size="sm" onClick={addCapitulo}>
                    <Plus size={14} /> Capítulo
                  </Button>
                </div>

                {capitulos.length > 0 && (
                  <div className="w-full h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                    <div className="h-full rounded-full bg-[#10b981] transition-all" style={{ width: `${capitulos.length > 0 ? (capsDone / capitulos.length) * 100 : 0}%` }} />
                  </div>
                )}

                {capitulos.length === 0 ? (
                  <div className="py-8 text-center">
                    <ListChecks size={32} className="mx-auto text-[var(--text-tertiary)] mb-2 opacity-50" />
                    <p className="font-dm text-sm text-[var(--text-tertiary)]">Nenhum capítulo adicionado</p>
                    <p className="font-dm text-xs text-[var(--text-tertiary)] mt-1">Adicione capítulos para acompanhar seu progresso</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {capitulos.map((cap, idx) => (
                      <CapituloRow
                        key={cap.id}
                        cap={cap}
                        index={idx}
                        total={capitulos.length}
                        onCycleStatus={() => cycleCapituloStatus(cap.id)}
                        onUpdate={(data) => updateCapitulo(cap.id, data)}
                        onRemove={() => removeCapitulo(cap.id)}
                        onMove={(dir) => moveCapitulo(idx, dir)}
                      />
                    ))}
                  </div>
                )}

                {capitulos.length > 3 && (
                  <Button variant="secondary" size="sm" onClick={addCapitulo} className="w-full">
                    <Plus size={14} /> Adicionar capítulo
                  </Button>
                )}
              </div>
            )}

            {/* ─── TAB: TAREFAS ─── */}
            {activeTab === "tarefas" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-dm text-sm font-medium text-[var(--text-primary)]">
                      Tarefas do livro
                    </p>
                    {tarefas.length > 0 && (
                      <p className="font-dm text-xs text-[var(--text-tertiary)]">
                        {tarefas.filter(t => t.status === "concluida").length}/{tarefas.length} concluídas
                      </p>
                    )}
                  </div>
                  <Button variant="secondary" size="sm" onClick={addTarefa}>
                    <Plus size={14} /> Tarefa
                  </Button>
                </div>

                {tarefas.length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckSquare size={32} className="mx-auto text-[var(--text-tertiary)] mb-2 opacity-50" />
                    <p className="font-dm text-sm text-[var(--text-tertiary)]">Nenhuma tarefa criada</p>
                    <p className="font-dm text-xs text-[var(--text-tertiary)] mt-1">Crie tarefas como fichamentos, resumos ou apresentações</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tarefas.map(t => (
                      <div key={t.id}
                        className="rounded-xl overflow-hidden transition-colors"
                        style={{ background: "var(--bg-input)", border: "1px solid var(--border-subtle)" }}
                      >
                        <div className="flex items-center gap-3 p-3">
                          <button onClick={() => cycleTaskStatus(t.id)} className="shrink-0 hover:scale-110 transition-transform" title="Alterar status">
                            {TASK_STATUS_ICONS[t.status]}
                          </button>
                          <div className="flex-1 min-w-0">
                            <input
                              value={t.titulo}
                              onChange={e => updateTarefa(t.id, { titulo: e.target.value })}
                              placeholder="Descreva a tarefa..."
                              className={`w-full bg-transparent text-sm font-dm outline-none ${
                                t.status === "concluida" ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"
                              }`}
                            />
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="date"
                                value={t.prazo}
                                onChange={e => updateTarefa(t.id, { prazo: e.target.value })}
                                className="bg-transparent text-[10px] font-dm text-[var(--text-tertiary)] outline-none"
                              />
                              <span className={`text-[10px] font-dm font-medium ${
                                t.status === "concluida" ? "text-[#10b981]" :
                                t.status === "em_andamento" ? "text-[#3b82f6]" :
                                "text-[var(--text-tertiary)]"
                              }`}>
                                {t.status === "concluida" ? "Concluída" : t.status === "em_andamento" ? "Em andamento" : "Pendente"}
                              </span>
                              {(t.subtarefas || []).length > 0 && (
                                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                                  {(t.subtarefas || []).filter(s => s.concluida).length}/{(t.subtarefas || []).length}
                                </span>
                              )}
                            </div>
                          </div>
                          <button onClick={() => addSubtarefa(t.id)} className="shrink-0 p-1 rounded hover:bg-[var(--bg-hover)] transition-colors" title="Adicionar subtarefa">
                            <Plus size={14} className="text-[var(--text-tertiary)]" />
                          </button>
                          <button onClick={() => removeTarefa(t.id)} className="shrink-0 p-1 rounded hover:bg-[var(--bg-hover)] transition-colors">
                            <X size={14} className="text-[var(--text-tertiary)]" />
                          </button>
                        </div>
                        {/* Subtarefas */}
                        {(t.subtarefas || []).length > 0 && (
                          <div className="px-3 pb-3 pl-10 space-y-1">
                            {(t.subtarefas || []).map(sub => (
                              <div key={sub.id} className="flex items-center gap-2">
                                <button onClick={() => updateSubtarefa(t.id, sub.id, { concluida: !sub.concluida })} className="shrink-0">
                                  {sub.concluida
                                    ? <CheckSquare size={14} className="text-[#10b981]" />
                                    : <Square size={14} className="text-[var(--text-tertiary)]" />
                                  }
                                </button>
                                <input
                                  value={sub.titulo}
                                  onChange={e => updateSubtarefa(t.id, sub.id, { titulo: e.target.value })}
                                  placeholder="Subtarefa..."
                                  className={`flex-1 bg-transparent text-xs font-dm outline-none ${
                                    sub.concluida ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"
                                  }`}
                                />
                                <button onClick={() => removeSubtarefa(t.id, sub.id)} className="shrink-0 opacity-0 hover:opacity-100 transition-opacity">
                                  <X size={12} className="text-[var(--text-tertiary)]" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {tarefas.length > 3 && (
                  <Button variant="secondary" size="sm" onClick={addTarefa} className="w-full">
                    <Plus size={14} /> Adicionar tarefa
                  </Button>
                )}
              </div>
            )}

            {/* ─── TAB: NOTAS ─── */}
            {activeTab === "notas" && (
              <div>
                <label className="block font-dm text-xs font-medium text-[var(--text-secondary)] mb-1">Anotações de leitura</label>
                <RichEditor content={form.anotacoes_html || ""} onChange={v => setF("anotacoes_html", v)} placeholder="Suas anotações, citações, reflexões..." minHeight="250px" />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
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

// ─── Capítulo Row Component ───

function CapituloRow({ cap, index, total, onCycleStatus, onUpdate, onRemove, onMove }: {
  cap: CapituloLivro; index: number; total: number;
  onCycleStatus: () => void; onUpdate: (data: Partial<CapituloLivro>) => void;
  onRemove: () => void; onMove: (dir: -1 | 1) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = cap.status_leitura || "para_ler";
  const grupo = STATUS_LEITURA_GRUPO[status] || "fila";
  const gc = GRUPO_COLORS[grupo];
  const isDone = grupo === "concluido";

  return (
    <div
      className="rounded-xl transition-colors overflow-hidden"
      style={{ background: "var(--bg-input)", border: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-center gap-2 p-3">
        {/* Reorder buttons */}
        <div className="flex flex-col shrink-0">
          <button onClick={() => onMove(-1)} disabled={index === 0}
            className="p-0.5 rounded hover:bg-[var(--bg-hover)] disabled:opacity-20 transition-all">
            <ChevronDown size={12} className="text-[var(--text-tertiary)] rotate-180" />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1}
            className="p-0.5 rounded hover:bg-[var(--bg-hover)] disabled:opacity-20 transition-all">
            <ChevronDown size={12} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Status select */}
        <select
          value={status}
          onChange={e => onUpdate({ status_leitura: e.target.value as StatusLeituraFull, herda_status: false })}
          className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-dm font-medium appearance-none cursor-pointer border-0 outline-none"
          style={{ background: gc.bg, color: gc.text, maxWidth: 120 }}
        >
          <optgroup label="Fila">
            <option value="quero_ler">Quero ler</option>
          </optgroup>
          <optgroup label="Para fazer">
            <option value="para_ler">Para ler</option>
            <option value="para_ler_resumir">Para ler e resumir</option>
            <option value="para_ler_resumir_mapa">Ler + resumir + mapa</option>
          </optgroup>
          <optgroup label="Em progresso">
            <option value="lendo_rapido">Lendo rapidamente</option>
            <option value="lendo">Lendo</option>
            <option value="lendo_resumindo">Lendo e resumindo</option>
            <option value="lendo_resumindo_mapa">Lendo + resumindo + mapa</option>
          </optgroup>
          <optgroup label="Concluído">
            <option value="lido_rapido">Lido rapidamente</option>
            <option value="lido">Lido</option>
            <option value="lido_resumido">Lido e resumido</option>
            <option value="lido_resumido_mapa">Lido + resumido + mapa</option>
          </optgroup>
          <optgroup label="—">
            <option value="abandonado">Abandonado</option>
          </optgroup>
        </select>

        <div className="flex-1 min-w-0">
          <input
            value={cap.titulo}
            onChange={e => onUpdate({ titulo: e.target.value })}
            placeholder={`Capítulo ${index + 1}`}
            className={`w-full bg-transparent text-sm font-dm outline-none ${
              isDone ? "text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"
            }`}
          />
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-dm text-[10px] font-medium" style={{ color: gc.text }}>
              {LABEL_STATUS_LEITURA_FULL[status]}
            </span>
            {(cap.pagina_inicio || cap.pagina_fim) && (
              <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                pág. {cap.pagina_inicio || "?"} – {cap.pagina_fim || "?"}
              </span>
            )}
            {cap.anotacoes && (
              <span className="font-dm text-[10px] text-[var(--orange-500)]">com anotações</span>
            )}
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="shrink-0 p-1 rounded hover:bg-[var(--bg-hover)] transition-colors">
          {expanded ? <ChevronDown size={14} className="text-[var(--text-tertiary)]" /> : <ChevronRight size={14} className="text-[var(--text-tertiary)]" />}
        </button>
        <button onClick={onRemove} className="shrink-0 p-1 rounded hover:bg-[var(--bg-hover)] transition-colors">
          <X size={14} className="text-[var(--text-tertiary)]" />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-[var(--border-subtle)] pt-2 ml-11">
          <div>
            <label className="font-dm text-[10px] text-[var(--text-tertiary)]">Status do capítulo</label>
            <select value={status} onChange={e => onUpdate({ status_leitura: e.target.value as any, herda_status: false })}
              className="input-hamilton w-full text-xs py-1.5">
              {Object.entries(LABEL_STATUS_LEITURA_FULL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-dm text-[10px] text-[var(--text-tertiary)]">Pág. início</label>
              <input type="number" value={cap.pagina_inicio ?? ""} onChange={e => onUpdate({ pagina_inicio: e.target.value ? Number(e.target.value) : null })}
                className="input-hamilton w-full text-xs py-1.5" />
            </div>
            <div>
              <label className="font-dm text-[10px] text-[var(--text-tertiary)]">Pág. fim</label>
              <input type="number" value={cap.pagina_fim ?? ""} onChange={e => onUpdate({ pagina_fim: e.target.value ? Number(e.target.value) : null })}
                className="input-hamilton w-full text-xs py-1.5" />
            </div>
          </div>
          <div>
            <label className="font-dm text-[10px] text-[var(--text-tertiary)]">Anotações do capítulo</label>
            <textarea
              value={cap.anotacoes}
              onChange={e => onUpdate({ anotacoes: e.target.value })}
              placeholder="Pontos importantes, citações..."
              rows={3}
              className="input-hamilton w-full text-xs py-1.5 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
