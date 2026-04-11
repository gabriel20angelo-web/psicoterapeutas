"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Plus, Trash2, AlertTriangle, CheckCircle, AlertCircle, Pencil } from "lucide-react";
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
  getDisciplinasCursando, calcularFrequencia, updateDisciplina,
  getFrequenciaByDisciplina, createFrequencia, deleteFrequencia,
} from "@/lib/academico-data";
import type { TipoPresenca } from "@/types/academico";
import { LABEL_TIPO_PRESENCA } from "@/types/academico";

const RISCO_CONFIG = {
  ok:      { icon: CheckCircle, color: "#10b981", bg: "rgba(16,185,129,.1)", label: "OK" },
  atencao: { icon: AlertCircle, color: "#f59e0b", bg: "rgba(245,158,11,.1)", label: "Atenção" },
  risco:   { icon: AlertTriangle, color: "var(--red-text)", bg: "var(--red-bg)", label: "Risco" },
};

const PRESENCA_COLORS: Record<string, { bg: string; text: string }> = {
  presente:    { bg: "rgba(16,185,129,.1)", text: "#10b981" },
  ausente:     { bg: "var(--red-bg)", text: "var(--red-text)" },
  justificada: { bg: "rgba(245,158,11,.1)", text: "#f59e0b" },
};

export default function FrequenciaPage() {
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const [detailDiscId, setDetailDiscId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formDiscId, setFormDiscId] = useState("");
  const [formData, setFormData] = useState(new Date().toISOString().slice(0, 10));
  const [formPresenca, setFormPresenca] = useState<TipoPresenca>("presente");
  const [editingLimite, setEditingLimite] = useState<string | null>(null);
  const [limiteValue, setLimiteValue] = useState("");

  const disciplinas = getDisciplinasCursando();
  const discComResumo = disciplinas.map(d => ({
    disciplina: d,
    resumo: calcularFrequencia(d.id),
  }));

  const handleSaveFrequencia = () => {
    if (!formDiscId) return;
    createFrequencia({ disciplina_id: formDiscId, data: formData, presenca: formPresenca });
    toast("Presença registrada", { type: "success" });
    setShowForm(false);
    refresh();
  };

  const openFormForDisc = (discId: string) => {
    setFormDiscId(discId);
    setFormData(new Date().toISOString().slice(0, 10));
    setFormPresenca("presente");
    setShowForm(true);
  };

  const handleSaveLimite = (discId: string) => {
    const val = Number(limiteValue);
    if (val > 0) {
      updateDisciplina(discId, { total_aulas_previstas: val });
      toast("Limite de aulas atualizado", { type: "success" });
    }
    setEditingLimite(null);
    refresh();
  };

  const detailDisc = disciplinas.find(d => d.id === detailDiscId);
  const detailRegistros = detailDiscId ? getFrequenciaByDisciplina(detailDiscId).sort((a, b) => b.data.localeCompare(a.data)) : [];
  const detailResumo = detailDiscId ? calcularFrequencia(detailDiscId) : null;

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/academico" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors">
              <ArrowLeft size={18} className="text-[var(--text-tertiary)]" />
            </Link>
            <div>
              <h1 className="font-fraunces text-xl font-bold text-[var(--text-primary)]">Controle de Frequência</h1>
              <p className="font-dm text-sm text-[var(--text-tertiary)]">Presenças e faltas por disciplina</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => { setFormDiscId(disciplinas[0]?.id || ""); setShowForm(true); }}>
            <Plus size={14} /> Registrar
          </Button>
        </div>

        {disciplinas.length === 0 ? (
          <EmptyState icon={<Calendar size={40} />} message="Nenhuma disciplina. Cadastre disciplinas em Períodos." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {discComResumo.map(({ disciplina: d, resumo: r }) => {
              const cfg = RISCO_CONFIG[r.risco];
              const Icon = cfg.icon;
              return (
                <Card key={d.id} hover onClick={() => setDetailDiscId(d.id)}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-dm text-sm font-semibold text-[var(--text-primary)] line-clamp-1">{d.nome}</h3>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ backgroundColor: cfg.bg }}>
                        <Icon size={14} style={{ color: cfg.color }} />
                        <span className="font-dm text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full bg-[var(--bg-hover)] mb-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.min(r.percentual, 100)}%`,
                        backgroundColor: cfg.color,
                      }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-lg font-bold" style={{ color: cfg.color }}>{r.percentual}%</span>
                      <div className="font-dm text-[10px] text-[var(--text-tertiary)] text-right">
                        <p>{r.presentes}P / {r.ausentes}F / {r.justificadas}J</p>
                        <p>{r.total_registradas}/{r.total_previstas} aulas</p>
                      </div>
                    </div>

                    {/* Limite de faltas */}
                    {d.total_aulas_previstas > 0 && (
                      <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                        <div className="flex items-center justify-between">
                          <span className="font-dm text-[10px] text-[var(--text-tertiary)]">Faltas permitidas:</span>
                          <span className="font-mono text-xs font-semibold" style={{ color: r.ausentes >= Math.floor(d.total_aulas_previstas * 0.25) ? "var(--red-text)" : "var(--text-secondary)" }}>
                            {r.ausentes}/{Math.floor(d.total_aulas_previstas * 0.25)}
                          </span>
                        </div>
                        {r.ausentes < Math.floor(d.total_aulas_previstas * 0.25) && (
                          <p className="font-dm text-[10px] text-[var(--text-tertiary)] mt-0.5">
                            Restam {Math.floor(d.total_aulas_previstas * 0.25) - r.ausentes} faltas
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-2 flex justify-end">
                      <button onClick={(e) => { e.stopPropagation(); openFormForDisc(d.id); }}
                        className="font-dm text-[10px] text-[var(--orange-500)] hover:underline">
                        + Registrar
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detail Modal */}
        {detailDisc && detailResumo && (
          <Modal isOpen={!!detailDiscId} onClose={() => setDetailDiscId(null)} title={detailDisc.nome} size="md">
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-lg bg-[var(--bg-hover)]">
                  <p className="font-mono text-lg font-bold text-[var(--text-primary)]">{detailResumo.percentual}%</p>
                  <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Frequência</p>
                </div>
                <div className="p-2 rounded-lg" style={{ backgroundColor: PRESENCA_COLORS.presente.bg }}>
                  <p className="font-mono text-lg font-bold" style={{ color: PRESENCA_COLORS.presente.text }}>{detailResumo.presentes}</p>
                  <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Presenças</p>
                </div>
                <div className="p-2 rounded-lg" style={{ backgroundColor: PRESENCA_COLORS.ausente.bg }}>
                  <p className="font-mono text-lg font-bold" style={{ color: PRESENCA_COLORS.ausente.text }}>{detailResumo.ausentes}</p>
                  <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Faltas</p>
                </div>
                <div className="p-2 rounded-lg" style={{ backgroundColor: PRESENCA_COLORS.justificada.bg }}>
                  <p className="font-mono text-lg font-bold" style={{ color: PRESENCA_COLORS.justificada.text }}>{detailResumo.justificadas}</p>
                  <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Justif.</p>
                </div>
              </div>

              {/* Limite total de aulas */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-hover)]">
                <div>
                  <p className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Limite total de aulas</p>
                  {editingLimite === detailDisc.id ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="1"
                        value={limiteValue}
                        onChange={e => setLimiteValue(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleSaveLimite(detailDisc.id); if (e.key === "Escape") setEditingLimite(null); }}
                        className="input-hamilton text-sm py-1 px-2 w-20"
                        autoFocus
                      />
                      <Button variant="primary" size="sm" onClick={() => handleSaveLimite(detailDisc.id)}>Salvar</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingLimite(null)}>Cancelar</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-base font-bold text-[var(--text-primary)]">
                        {detailDisc.total_aulas_previstas || "Não definido"}
                      </span>
                      <button
                        onClick={() => { setEditingLimite(detailDisc.id); setLimiteValue(String(detailDisc.total_aulas_previstas || "")); }}
                        className="p-1 text-[var(--text-tertiary)] hover:text-[var(--orange-500)]"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}
                </div>
                {detailDisc.total_aulas_previstas > 0 && (
                  <div className="text-right font-dm text-xs text-[var(--text-tertiary)]">
                    <p>Máximo de faltas: {Math.floor(detailDisc.total_aulas_previstas * 0.25)}</p>
                    <p>Restam: {Math.max(0, Math.floor(detailDisc.total_aulas_previstas * 0.25) - detailResumo.ausentes)} faltas</p>
                  </div>
                )}
              </div>

              {/* Faltas manuais */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-hover)]">
                <div>
                  <p className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Faltas manuais</p>
                  <p className="font-dm text-[10px] text-[var(--text-tertiary)]">Faltas que você já sabe que tem mas não registrou dia a dia</p>
                </div>
                <input
                  type="number"
                  min="0"
                  value={(detailDisc as any).faltas_manuais || 0}
                  onChange={e => {
                    updateDisciplina(detailDisc.id, { faltas_manuais: Math.max(0, Number(e.target.value) || 0) } as any);
                    refresh();
                  }}
                  className="input-hamilton text-sm py-1 px-2 w-16 text-center"
                />
              </div>

              {/* Registros */}
              <div className="flex items-center justify-between">
                <p className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Registros</p>
                <Button variant="ghost" size="sm" onClick={() => openFormForDisc(detailDisc.id)}>
                  <Plus size={14} /> Adicionar
                </Button>
              </div>
              {detailRegistros.length === 0 ? (
                <p className="font-dm text-sm text-[var(--text-tertiary)] text-center py-4">Nenhum registro</p>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {detailRegistros.map(f => {
                    const pc = PRESENCA_COLORS[f.presenca];
                    return (
                      <div key={f.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border-subtle)]">
                        <span className="font-mono text-xs text-[var(--text-tertiary)]">{f.data}</span>
                        <div className="flex items-center gap-2">
                          <Badge bg={pc.bg} text={pc.text} label={LABEL_TIPO_PRESENCA[f.presenca]} />
                          <button onClick={() => { deleteFrequencia(f.id); refresh(); }}
                            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Frequencia Form */}
        <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Registrar Presença" size="sm">
          <div className="space-y-3">
            <Select label="Disciplina" value={formDiscId} onChange={setFormDiscId} options={disciplinas.map(d => ({ value: d.id, label: d.nome }))} />
            <Input label="Data" type="date" value={formData} onChange={setFormData} />
            <Select label="Presença" value={formPresenca} onChange={val => setFormPresenca(val as TipoPresenca)} options={[
              { value: "presente", label: "Presente" },
              { value: "ausente", label: "Ausente" },
              { value: "justificada", label: "Justificada" },
            ]} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSaveFrequencia}>Registrar</Button>
            </div>
          </div>
        </Modal>
      </div>
    </Shell>
  );
}
