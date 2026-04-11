"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Plus, Trash2 } from "lucide-react";
import { getPeriodosEntities, getDisciplinas } from "@/lib/academico-data";
import type { Disciplina, DisciplinaInput, HorarioEstruturado, StatusDisciplina, TipoDisciplina } from "@/types/academico";

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: DisciplinaInput) => void;
  initial?: Disciplina;
  defaultPeriodoId?: string;
}

const emptyForm: DisciplinaInput = {
  nome: "",
  periodo_id: "",
  professor: "",
  email_professor: "",
  sala: "",
  horario: "",
  horario_estruturado: [],
  carga_horaria: 0,
  tipo: "obrigatoria",
  codigo: "",
  link_plataforma: "",
  status: "cursando",
  total_aulas_previstas: 0,
  nota_aprovacao: 7,
  nota_final: null,
  creditos: 0,
  prerequisitos_ids: [],
  monitoria_nome: "",
  monitoria_email: "",
  monitoria_horario: "",
  monitoria_sala: "",
};

export default function DisciplinaForm({ open, onClose, onSave, initial, defaultPeriodoId }: Props) {
  const [form, setForm] = useState<DisciplinaInput>(
    initial
      ? { ...initial }
      : { ...emptyForm, periodo_id: defaultPeriodoId || "" }
  );
  const [showMonitoria, setShowMonitoria] = useState(
    !!(initial?.monitoria_nome || initial?.monitoria_email)
  );

  const periodos = getPeriodosEntities().sort((a, b) => a.numero - b.numero);
  const hasPeriodoLocked = !!defaultPeriodoId;

  const set = <K extends keyof DisciplinaInput>(key: K, value: DisciplinaInput[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const addHorario = () => {
    set("horario_estruturado", [...form.horario_estruturado, { dia: 1, inicio: "08:00", fim: "10:00" }]);
  };

  const updateHorario = (idx: number, field: keyof HorarioEstruturado, value: string | number) => {
    const updated = [...form.horario_estruturado];
    updated[idx] = { ...updated[idx], [field]: value };
    set("horario_estruturado", updated);
  };

  const removeHorario = (idx: number) => {
    set("horario_estruturado", form.horario_estruturado.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.periodo_id) return;
    onSave(form);
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={initial ? "Editar Disciplina" : "Nova Disciplina"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Nome da disciplina *" value={form.nome} onChange={val => set("nome", val)} required />
          {hasPeriodoLocked ? (
            <div>
              <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Período</label>
              <p className="font-dm text-sm text-[var(--text-primary)] py-2">
                {periodos.find(p => p.id === form.periodo_id)?.nome || "—"}
              </p>
            </div>
          ) : (
            <Select
              label="Período"
              value={form.periodo_id}
              onChange={val => set("periodo_id", val)}
              options={periodos.map(p => ({ value: p.id, label: p.nome }))}
            />
          )}
          <Input label="Código" value={form.codigo} onChange={val => set("codigo", val)} />
          <Select label="Tipo" value={form.tipo} onChange={val => set("tipo", val as TipoDisciplina)} options={[
            { value: "obrigatoria", label: "Obrigatória" },
            { value: "optativa", label: "Optativa" },
            { value: "estagio", label: "Estágio" },
            { value: "eletiva", label: "Eletiva" },
          ]} />
          <Select label="Status" value={form.status} onChange={val => set("status", val as StatusDisciplina)} options={[
            { value: "cursando", label: "Cursando" },
            { value: "concluida", label: "Concluída" },
            { value: "trancada", label: "Trancada" },
            { value: "pendente", label: "Pendente" },
          ]} />
          <Input label="Carga horária (h)" type="number" value={String(form.carga_horaria || "")} onChange={val => set("carga_horaria", Number(val))} />
          <Input label="Total de aulas previstas" type="number" value={String(form.total_aulas_previstas || "")} onChange={val => set("total_aulas_previstas", Number(val))} />
          <Input label="Créditos" type="number" value={String(form.creditos || "")} onChange={val => set("creditos", Number(val))} placeholder="Ex: 4" />
          <Input label="Nota para aprovação" type="number" value={String(form.nota_aprovacao ?? 7)} onChange={val => set("nota_aprovacao", Number(val))} placeholder="7" />
          <Input label="Sala" value={form.sala} onChange={val => set("sala", val)} />
        </div>

        {/* Professor */}
        <div className="border-t border-[var(--border-subtle)] pt-4">
          <p className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Professor(a)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Nome" value={form.professor} onChange={val => set("professor", val)} />
            <Input label="E-mail" type="email" value={form.email_professor} onChange={val => set("email_professor", val)} />
          </div>
        </div>

        {/* Horário */}
        <div className="border-t border-[var(--border-subtle)] pt-4">
          <p className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Horário</p>
          <Input label="Horário (texto livre)" value={form.horario} onChange={val => set("horario", val)} placeholder="Ex: Seg e Qua, 8h-10h" />
          <div className="mt-3 space-y-2">
            {form.horario_estruturado.map((h, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select value={h.dia} onChange={e => updateHorario(idx, "dia", Number(e.target.value))}
                  className="input-hamilton text-sm py-1.5 px-2">
                  {DIAS_SEMANA.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <input type="time" value={h.inicio} onChange={e => updateHorario(idx, "inicio", e.target.value)}
                  className="input-hamilton text-sm py-1.5 px-2" />
                <span className="text-[var(--text-tertiary)]">—</span>
                <input type="time" value={h.fim} onChange={e => updateHorario(idx, "fim", e.target.value)}
                  className="input-hamilton text-sm py-1.5 px-2" />
                <button type="button" onClick={() => removeHorario(idx)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={addHorario}
              className="flex items-center gap-1 text-xs font-dm text-[var(--orange-500)] hover:underline">
              <Plus size={14} /> Adicionar horário
            </button>
          </div>
        </div>

        {/* Pré-requisitos */}
        <div className="border-t border-[var(--border-subtle)] pt-4">
          <p className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Pré-requisitos</p>
          <div className="space-y-1.5">
            {(form.prerequisitos_ids || []).map(preId => {
              const preDisc = getDisciplinas().find(d => d.id === preId);
              return (
                <div key={preId} className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                  <span className="font-dm text-sm text-[var(--text-primary)]">{preDisc?.nome || preId}</span>
                  <button type="button" onClick={() => set("prerequisitos_ids", (form.prerequisitos_ids || []).filter(id => id !== preId))}
                    className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]">
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
            <select
              value=""
              onChange={e => {
                if (e.target.value) {
                  set("prerequisitos_ids", [...(form.prerequisitos_ids || []), e.target.value]);
                  e.target.value = "";
                }
              }}
              className="input-hamilton text-sm py-1.5 w-full"
            >
              <option value="">Adicionar pré-requisito...</option>
              {getDisciplinas()
                .filter(d => d.id !== (initial?.id || "") && !(form.prerequisitos_ids || []).includes(d.id))
                .map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
        </div>

        {/* Link plataforma */}
        <Input label="Link da plataforma (Moodle, AVA)" value={form.link_plataforma} onChange={val => set("link_plataforma", val)} />

        {/* Monitoria (collapsible) */}
        <div className="border-t border-[var(--border-subtle)] pt-4">
          <button type="button" onClick={() => setShowMonitoria(!showMonitoria)}
            className="font-dm text-xs text-[var(--orange-500)] hover:underline">
            {showMonitoria ? "Ocultar monitoria" : "Adicionar informações de monitoria"}
          </button>
          {showMonitoria && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <Input label="Monitor(a)" value={form.monitoria_nome} onChange={val => set("monitoria_nome", val)} />
              <Input label="E-mail do monitor" value={form.monitoria_email} onChange={val => set("monitoria_email", val)} />
              <Input label="Horário da monitoria" value={form.monitoria_horario} onChange={val => set("monitoria_horario", val)} />
              <Input label="Sala da monitoria" value={form.monitoria_sala} onChange={val => set("monitoria_sala", val)} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
          <Button variant="primary" type="submit">{initial ? "Salvar" : "Criar disciplina"}</Button>
        </div>
      </form>
    </Modal>
  );
}
