"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, Plus, Pencil, Trash2, Search, ExternalLink } from "lucide-react";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import {
  getExtracurriculares, createExtracurricular, updateExtracurricular, deleteExtracurricular,
} from "@/lib/academico-data";
import type {
  Extracurricular, ExtracurricularInput,
  TipoExtracurricular, StatusExtracurricular, StatusInscricao, StatusCertificado,
} from "@/types/academico";
import { LABEL_TIPO_EXTRACURRICULAR, LABEL_STATUS_EXTRACURRICULAR } from "@/types/academico";

const STATUS_COLORS: Record<StatusExtracurricular, { bg: string; text: string }> = {
  nao_iniciado: { bg: "var(--bg-hover)", text: "var(--text-tertiary)" },
  em_andamento: { bg: "rgba(59,130,246,.1)", text: "#3b82f6" },
  concluido:    { bg: "rgba(16,185,129,.1)", text: "#10b981" },
};

const TIPO_COLORS: Record<TipoExtracurricular, string> = {
  monitoria: "#8b5cf6",
  extensao: "#3b82f6",
  congresso: "#f59e0b",
  liga: "#10b981",
  ic: "#ec4899",
  curso_livre: "#06b6d4",
  outro: "#64748b",
};

export default function ExtracurricularPage() {
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Extracurricular | null>(null);

  // Form state
  const [form, setForm] = useState<Partial<ExtracurricularInput>>({});

  const allItems = getExtracurriculares();

  let filtered = allItems;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(e => e.titulo.toLowerCase().includes(q));
  }
  if (filterTipo) filtered = filtered.filter(e => e.tipo === filterTipo);
  if (filterStatus) filtered = filtered.filter(e => e.status === filterStatus);

  const sorted = [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const openForm = (item?: Extracurricular) => {
    if (item) {
      setEditing(item);
      setForm({ ...item });
    } else {
      setEditing(null);
      setForm({
        tipo: "outro", titulo: "", data_inicio: "", data_fim: "",
        carga_horaria: null, status: "nao_iniciado",
        inscricao: "nao_inscrito", certificado: "nao", link: "",
      });
    }
    setShowForm(true);
  };

  const setF = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!form.titulo?.trim()) return;
    const data: ExtracurricularInput = {
      tipo: (form.tipo as TipoExtracurricular) || "outro",
      titulo: form.titulo || "",
      data_inicio: form.data_inicio || "",
      data_fim: form.data_fim || "",
      carga_horaria: form.carga_horaria || null,
      status: (form.status as StatusExtracurricular) || "nao_iniciado",
      inscricao: (form.inscricao as StatusInscricao) || "nao_inscrito",
      certificado: (form.certificado as StatusCertificado) || "nao",
      link: form.link || "",
    };
    if (editing) {
      updateExtracurricular(editing.id, data);
      toast("Atualizado", { type: "success" });
    } else {
      createExtracurricular(data);
      toast("Atividade criada", { type: "success" });
    }
    setShowForm(false);
    refresh();
  };

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/academico" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors">
              <ArrowLeft size={18} className="text-[var(--text-tertiary)]" />
            </Link>
            <div>
              <h1 className="font-fraunces text-xl font-bold text-[var(--text-primary)]">Trajetória Extracurricular</h1>
              <p className="font-dm text-sm text-[var(--text-tertiary)]">{allItems.length} atividades registradas</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => openForm()}>
            <Plus size={14} /> Nova atividade
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
              className="input-hamilton w-full pl-8 text-sm py-2" />
          </div>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="input-hamilton text-sm py-2">
            <option value="">Todos tipos</option>
            {Object.entries(LABEL_TIPO_EXTRACURRICULAR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-hamilton text-sm py-2">
            <option value="">Todos status</option>
            {Object.entries(LABEL_STATUS_EXTRACURRICULAR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* List */}
        {sorted.length === 0 ? (
          <EmptyState icon={<Award size={40} />} message="Nenhuma atividade. Registre monitorias, congressos, extensões e mais." />
        ) : (
          <div className="space-y-2">
            {sorted.map(item => {
              const sc = STATUS_COLORS[item.status];
              const tipoColor = TIPO_COLORS[item.tipo];
              return (
                <Card key={item.id} hover onClick={() => openForm(item)}>
                  <div className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-dm text-sm font-semibold text-[var(--text-primary)]">{item.titulo}</p>
                        <Badge bg={`${tipoColor}15`} text={tipoColor} label={LABEL_TIPO_EXTRACURRICULAR[item.tipo]} />
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {item.data_inicio && (
                          <span className="font-dm text-xs text-[var(--text-tertiary)]">
                            {item.data_inicio}{item.data_fim && ` — ${item.data_fim}`}
                          </span>
                        )}
                        {item.carga_horaria && (
                          <span className="font-dm text-xs text-[var(--text-tertiary)]">{item.carga_horaria}h</span>
                        )}
                        {item.inscricao === "inscrito" && (
                          <Badge bg="rgba(16,185,129,.1)" text="#10b981" label="Inscrito" />
                        )}
                        {item.certificado === "sim" && (
                          <Badge bg="rgba(245,158,11,.1)" text="#f59e0b" label="Certificado" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge bg={sc.bg} text={sc.text} label={LABEL_STATUS_EXTRACURRICULAR[item.status]} />
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--orange-500)]">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Form Modal */}
        <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? "Editar Atividade" : "Nova Atividade"} size="md">
          <div className="space-y-3">
            <Input label="Título *" value={form.titulo || ""} onChange={val => setF("titulo", val)} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Tipo" value={form.tipo || "outro"} onChange={val => setF("tipo", val)} options={Object.entries(LABEL_TIPO_EXTRACURRICULAR).map(([k, v]) => ({ value: k, label: v }))} />
              <Select label="Status" value={form.status || "nao_iniciado"} onChange={val => setF("status", val)} options={Object.entries(LABEL_STATUS_EXTRACURRICULAR).map(([k, v]) => ({ value: k, label: v }))} />
              <Input label="Data início" type="date" value={form.data_inicio || ""} onChange={val => setF("data_inicio", val)} />
              <Input label="Data fim" type="date" value={form.data_fim || ""} onChange={val => setF("data_fim", val)} />
              <Input label="Carga horária (h)" type="number" value={String(form.carga_horaria ?? "")} onChange={val => setF("carga_horaria", val ? Number(val) : null)} />
              <Select label="Inscrição" value={form.inscricao || "nao_inscrito"} onChange={val => setF("inscricao", val)} options={[
                { value: "nao_inscrito", label: "Não inscrito" },
                { value: "inscrito", label: "Inscrito" },
              ]} />
              <Select label="Certificado" value={form.certificado || "nao"} onChange={val => setF("certificado", val)} options={[
                { value: "nao", label: "Não" },
                { value: "sim", label: "Sim" },
              ]} />
            </div>
            <Input label="Link" value={form.link || ""} onChange={val => setF("link", val)} placeholder="https://..." />
            <div className="flex justify-end gap-2 pt-2">
              {editing && (
                <Button variant="danger" onClick={() => { deleteExtracurricular(editing.id); setShowForm(false); refresh(); }}>
                  <Trash2 size={14} /> Excluir
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSave}>{editing ? "Salvar" : "Criar"}</Button>
            </div>
          </div>
        </Modal>
      </div>
    </Shell>
  );
}
