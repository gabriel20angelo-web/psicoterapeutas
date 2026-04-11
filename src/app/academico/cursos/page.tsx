"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, Search, Timer, ChevronDown, ChevronRight,
  X, ExternalLink, Play, CheckCircle2, Circle, BookOpen, Video, PenTool, Folder,
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
import { useToast } from "@/contexts/ToastContext";
import {
  getCursosAvulsos, createCursoAvulso, updateCursoAvulso, deleteCursoAvulso,
} from "@/lib/academico-data";
import type { CursoAvulso, CursoAvulsoInput, StatusCursoAvulso, EtapaCurso, TipoEtapa } from "@/types/academico";
import { LABEL_STATUS_CURSO_AVULSO, LABEL_TIPO_ETAPA } from "@/types/academico";

const STATUS_COLORS: Record<StatusCursoAvulso, { bg: string; text: string }> = {
  nao_iniciado: { bg: "var(--bg-hover)", text: "var(--text-secondary)" },
  em_andamento: { bg: "rgba(59,130,246,.1)", text: "#3b82f6" },
  concluido:    { bg: "rgba(16,185,129,.1)", text: "#10b981" },
  abandonado:   { bg: "rgba(239,68,68,.1)", text: "#ef4444" },
};

const ETAPA_ICONS: Record<TipoEtapa, React.ReactNode> = {
  aula: <Video size={14} />,
  leitura: <BookOpen size={14} />,
  exercicio: <PenTool size={14} />,
  projeto: <Folder size={14} />,
  outro: <Circle size={14} />,
};

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

type FormTab = "info" | "etapas" | "notas";

export default function CursosAvulsosPage() {
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CursoAvulso | null>(null);
  const [activeTab, setActiveTab] = useState<FormTab>("info");

  const [form, setForm] = useState<Partial<CursoAvulsoInput>>({});
  const [etapas, setEtapas] = useState<EtapaCurso[]>([]);

  const cursos = getCursosAvulsos();

  let filtered = cursos;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(c => c.titulo.toLowerCase().includes(q) || c.plataforma.toLowerCase().includes(q));
  }
  if (filterStatus) filtered = filtered.filter(c => c.status === filterStatus);

  const sorted = [...filtered].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const setF = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

  const openForm = (curso?: CursoAvulso) => {
    if (curso) {
      setEditing(curso);
      setForm({ ...curso });
      setEtapas(curso.etapas || []);
    } else {
      setEditing(null);
      setForm({
        titulo: "", plataforma: "", link: "", descricao: "",
        status: "nao_iniciado", etapas: [], anotacoes_gerais: "",
        tags: [], pomodoros_realizados: 0, tempo_total_seg: 0,
      });
      setEtapas([]);
    }
    setActiveTab("info");
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.titulo?.trim()) return;
    const data: CursoAvulsoInput = {
      titulo: form.titulo || "",
      plataforma: form.plataforma || "",
      link: form.link || "",
      descricao: form.descricao || "",
      status: (form.status as StatusCursoAvulso) || "nao_iniciado",
      etapas,
      anotacoes_gerais: form.anotacoes_gerais || "",
      tags: form.tags || [],
      pomodoros_realizados: editing?.pomodoros_realizados || 0,
      tempo_total_seg: editing?.tempo_total_seg || 0,
    };
    if (editing) {
      updateCursoAvulso(editing.id, data);
      toast("Curso atualizado", { type: "success" });
    } else {
      createCursoAvulso(data);
      toast("Curso adicionado", { type: "success" });
    }
    setShowForm(false);
    refresh();
  };

  // Etapas helpers
  const addEtapa = (tipo: TipoEtapa = "aula") => {
    setEtapas(prev => [...prev, {
      id: `et-${uid()}`, titulo: "", tipo, concluida: false,
      duracao_min: null, anotacoes: "", ordem: prev.length,
    }]);
  };

  const updateEtapa = (id: string, data: Partial<EtapaCurso>) => {
    setEtapas(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const removeEtapa = (id: string) => {
    setEtapas(prev => prev.filter(e => e.id !== id).map((e, i) => ({ ...e, ordem: i })));
  };

  const moveEtapa = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= etapas.length) return;
    setEtapas(prev => {
      const arr = [...prev];
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr.map((e, i) => ({ ...e, ordem: i }));
    });
  };

  const getProgress = (c: CursoAvulso) => {
    const total = (c.etapas || []).length;
    if (total === 0) return null;
    const done = (c.etapas || []).filter(e => e.concluida).length;
    return { done, total, pct: Math.round((done / total) * 100) };
  };

  const etapasDone = etapas.filter(e => e.concluida).length;

  const emAndamento = cursos.filter(c => c.status === "em_andamento").length;
  const concluidos = cursos.filter(c => c.status === "concluido").length;

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
              <h1 className="font-fraunces text-xl font-bold text-[var(--text-primary)]">Cursos Avulsos</h1>
              <p className="font-dm text-sm text-[var(--text-tertiary)]">{cursos.length} cursos &middot; {emAndamento} em andamento &middot; {concluidos} concluídos</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => openForm()}>
            <Plus size={14} /> Novo curso
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cursos..."
              className="input-hamilton w-full pl-8 text-sm py-2" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-hamilton text-sm py-2">
            <option value="">Todos status</option>
            {Object.entries(LABEL_STATUS_CURSO_AVULSO).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Course list */}
        {sorted.length === 0 ? (
          <EmptyState icon={<Play size={40} />} message="Nenhum curso. Adicione cursos, playlists ou trilhas de aprendizado." />
        ) : (
          <div className="space-y-3">
            {sorted.map(c => {
              const sc = STATUS_COLORS[c.status];
              const prog = getProgress(c);
              return (
                <Card key={c.id} hover onClick={() => openForm(c)}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="font-dm text-sm font-semibold text-[var(--text-primary)]">{c.titulo}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {c.plataforma && <span className="font-dm text-xs text-[var(--text-tertiary)]">{c.plataforma}</span>}
                          {c.tags.map(t => (
                            <Badge key={t} bg="rgba(139,92,246,.1)" text="#8b5cf6" label={t} />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge bg={sc.bg} text={sc.text} label={LABEL_STATUS_CURSO_AVULSO[c.status]} />
                        {c.link && (
                          <a href={c.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--orange-500)]">
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>

                    {prog && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                          <div className="h-full rounded-full bg-[#10b981] transition-all" style={{ width: `${prog.pct}%` }} />
                        </div>
                        <span className="font-mono text-xs text-[var(--text-tertiary)]">{prog.done}/{prog.total}</span>
                        <span className="font-mono text-xs font-bold" style={{ color: sc.text }}>{prog.pct}%</span>
                      </div>
                    )}

                    {(c.tempo_total_seg > 0 || c.pomodoros_realizados > 0) && (
                      <div className="flex items-center gap-3 mt-2">
                        {c.tempo_total_seg > 0 && (
                          <span className="font-mono text-[10px] text-[#3b82f6] flex items-center gap-0.5">
                            <Timer size={10} /> {Math.floor(c.tempo_total_seg / 3600)}h{Math.floor((c.tempo_total_seg % 3600) / 60).toString().padStart(2, "0")}m
                          </span>
                        )}
                        {c.pomodoros_realizados > 0 && (
                          <span className="font-mono text-[10px] text-[var(--orange-500)]">{c.pomodoros_realizados} 🍅</span>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Form Modal */}
        <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? "Editar Curso" : "Novo Curso"} size="lg">
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 border-b border-[var(--border-subtle)] overflow-x-auto pb-px">
              {([
                { key: "info" as const, label: "Informações" },
                { key: "etapas" as const, label: `Etapas${etapas.length ? ` (${etapas.length})` : ""}` },
                { key: "notas" as const, label: "Notas gerais" },
              ]).map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`px-3 py-2 text-xs font-dm font-medium whitespace-nowrap transition-colors ${
                    activeTab === t.key
                      ? "text-[var(--orange-500)] border-b-2 border-[var(--orange-500)] -mb-px"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB: INFO */}
            {activeTab === "info" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input label="Nome do curso *" value={form.titulo || ""} onChange={val => setF("titulo", val)} />
                  <Input label="Plataforma" value={form.plataforma || ""} onChange={val => setF("plataforma", val)} placeholder="Ex: Udemy, YouTube, Coursera" />
                  <Input label="Link" value={form.link || ""} onChange={val => setF("link", val)} placeholder="https://..." />
                  <Select label="Status" value={form.status || "nao_iniciado"} onChange={val => setF("status", val)} options={
                    Object.entries(LABEL_STATUS_CURSO_AVULSO).map(([k, v]) => ({ value: k, label: v }))
                  } />
                </div>
                <Textarea label="Descrição" value={form.descricao || ""} onChange={val => setF("descricao", val)} />
                <Input label="Tags (separar por vírgula)" value={(form.tags || []).join(", ")} onChange={val => setF("tags", val.split(",").map(s => s.trim()).filter(Boolean))} placeholder="Ex: Psicologia, TCC" />
              </div>
            )}

            {/* TAB: ETAPAS */}
            {activeTab === "etapas" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-dm text-sm font-medium text-[var(--text-primary)]">
                      Etapas do curso
                    </p>
                    {etapas.length > 0 && (
                      <p className="font-dm text-xs text-[var(--text-tertiary)]">
                        {etapasDone}/{etapas.length} concluídas ({etapas.length > 0 ? Math.round((etapasDone / etapas.length) * 100) : 0}%)
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => addEtapa("aula")} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-dm font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-active)] transition-colors">
                      <Video size={10} /> Aula
                    </button>
                    <button onClick={() => addEtapa("leitura")} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-dm font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-active)] transition-colors">
                      <BookOpen size={10} /> Leitura
                    </button>
                    <button onClick={() => addEtapa("exercicio")} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-dm font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-active)] transition-colors">
                      <PenTool size={10} /> Exercício
                    </button>
                    <button onClick={() => addEtapa("outro")} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-dm font-medium bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-active)] transition-colors">
                      <Plus size={10} /> Outro
                    </button>
                  </div>
                </div>

                {etapas.length > 0 && (
                  <div className="w-full h-2 rounded-full bg-[var(--bg-hover)] overflow-hidden">
                    <div className="h-full rounded-full bg-[#10b981] transition-all" style={{ width: `${etapas.length > 0 ? (etapasDone / etapas.length) * 100 : 0}%` }} />
                  </div>
                )}

                {etapas.length === 0 ? (
                  <div className="py-8 text-center">
                    <Play size={32} className="mx-auto text-[var(--text-tertiary)] mb-2 opacity-50" />
                    <p className="font-dm text-sm text-[var(--text-tertiary)]">Nenhuma etapa</p>
                    <p className="font-dm text-xs text-[var(--text-tertiary)] mt-1">Adicione aulas, leituras e exercícios</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {etapas.map((etapa, idx) => (
                      <EtapaRow
                        key={etapa.id}
                        etapa={etapa}
                        index={idx}
                        total={etapas.length}
                        onToggle={() => updateEtapa(etapa.id, { concluida: !etapa.concluida })}
                        onUpdate={(data) => updateEtapa(etapa.id, data)}
                        onRemove={() => removeEtapa(etapa.id)}
                        onMove={(dir) => moveEtapa(idx, dir)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: NOTAS */}
            {activeTab === "notas" && (
              <div>
                <label className="block font-dm text-xs font-medium text-[var(--text-secondary)] mb-1">Notas gerais do curso</label>
                <textarea
                  value={form.anotacoes_gerais || ""}
                  onChange={e => setF("anotacoes_gerais", e.target.value)}
                  placeholder="Links úteis, credenciais, observações gerais..."
                  rows={12}
                  className="input-hamilton w-full text-sm resize-none"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              {editing && (
                <Button variant="danger" onClick={() => { deleteCursoAvulso(editing.id); setShowForm(false); refresh(); toast("Curso excluído", { type: "info" }); }}>
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

// ─── Etapa Row ───
function EtapaRow({ etapa, index, total, onToggle, onUpdate, onRemove, onMove }: {
  etapa: EtapaCurso; index: number; total: number;
  onToggle: () => void; onUpdate: (data: Partial<EtapaCurso>) => void;
  onRemove: () => void; onMove: (dir: -1 | 1) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden transition-colors"
      style={{ background: "var(--bg-input)", border: "1px solid var(--border-subtle)" }}>
      <div className="flex items-center gap-2 p-2.5">
        {/* Reorder */}
        <div className="flex flex-col shrink-0">
          <button onClick={() => onMove(-1)} disabled={index === 0}
            className="p-0.5 rounded hover:bg-[var(--bg-hover)] disabled:opacity-20 transition-all">
            <ChevronDown size={10} className="text-[var(--text-tertiary)] rotate-180" />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1}
            className="p-0.5 rounded hover:bg-[var(--bg-hover)] disabled:opacity-20 transition-all">
            <ChevronDown size={10} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Toggle done */}
        <button onClick={onToggle} className="shrink-0 hover:scale-110 transition-transform">
          {etapa.concluida
            ? <CheckCircle2 size={18} className="text-[#10b981]" />
            : <Circle size={18} className="text-[var(--text-tertiary)]" />
          }
        </button>

        {/* Type icon */}
        <span className="shrink-0 text-[var(--text-tertiary)]">{ETAPA_ICONS[etapa.tipo]}</span>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <input
            value={etapa.titulo}
            onChange={e => onUpdate({ titulo: e.target.value })}
            placeholder={`${LABEL_TIPO_ETAPA[etapa.tipo]} ${index + 1}`}
            className={`w-full bg-transparent text-sm font-dm outline-none ${
              etapa.concluida ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"
            }`}
          />
          {etapa.duracao_min != null && etapa.duracao_min > 0 && (
            <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
              {etapa.tipo === "leitura" ? `${etapa.duracao_min} pág.` : `${etapa.duracao_min} min`}
            </span>
          )}
        </div>

        {/* Actions */}
        <select value={etapa.tipo} onChange={e => onUpdate({ tipo: e.target.value as TipoEtapa })}
          className="shrink-0 bg-transparent text-[10px] font-dm text-[var(--text-tertiary)] outline-none border-0 cursor-pointer" style={{ maxWidth: 70 }}>
          {Object.entries(LABEL_TIPO_ETAPA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => setExpanded(!expanded)} className="shrink-0 p-1 rounded hover:bg-[var(--bg-hover)] transition-colors">
          {expanded ? <ChevronDown size={12} className="text-[var(--text-tertiary)]" /> : <ChevronRight size={12} className="text-[var(--text-tertiary)]" />}
        </button>
        <button onClick={onRemove} className="shrink-0 p-1 rounded hover:bg-[var(--bg-hover)] transition-colors">
          <X size={12} className="text-[var(--text-tertiary)]" />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-[var(--border-subtle)] pt-2 ml-14">
          <Input label={etapa.tipo === "leitura" ? "Páginas" : "Duração (min)"} type="number"
            value={String(etapa.duracao_min ?? "")}
            onChange={val => onUpdate({ duracao_min: val ? Number(val) : null })} />
          <div>
            <label className="font-dm text-[10px] text-[var(--text-tertiary)]">Anotações (links, observações)</label>
            <textarea
              value={etapa.anotacoes}
              onChange={e => onUpdate({ anotacoes: e.target.value })}
              placeholder="Links de material, observações, resumo..."
              rows={3}
              className="input-hamilton w-full text-xs py-1.5 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
