"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { format, addMinutes, parse } from "date-fns";
import { AlertTriangle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import TimePicker from "@/components/ui/TimePicker";
import Textarea from "@/components/ui/Textarea";
import SearchInput from "@/components/ui/SearchInput";
import type { Atividade, TipoAtividade, Recorrencia, Paciente } from "@/types/database";
import { getPacientes, createAtividade, getAtividades } from "@/lib/data";
import { syncSave, syncLoad, initSync } from "@/lib/sync";
import { hasConflict } from "@/lib/calendar-utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  prefillDate?: string; // YYYY-MM-DD
  prefillTime?: string; // HH:mm
}

const BASE_TIPOS: { value: string; label: string }[] = [
  { value: "sessao", label: "Sessão" },
  { value: "supervisao", label: "Supervisão" },
  { value: "pessoal", label: "Pessoal" },
  { value: "outro", label: "Outro" },
];

const CUSTOM_TYPES_KEY = 'allos-custom-activity-types';
// Sincroniza os tipos customizados via kv_store do Supabase
if (typeof window !== 'undefined') {
  initSync([CUSTOM_TYPES_KEY]);
}

function loadCustomTypes(): string[] {
  return syncLoad<string[]>(CUSTOM_TYPES_KEY, []);
}

function saveCustomType(name: string) {
  const existing = loadCustomTypes();
  if (!existing.includes(name)) {
    const next = [...existing, name];
    syncSave(CUSTOM_TYPES_KEY, next);
  }
}

const RECORRENCIA_OPTIONS: { value: Recorrencia; label: string }[] = [
  { value: "nenhuma", label: "Nenhuma" },
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
];

export default function CreateActivityModal({ isOpen, onClose, onCreated, prefillDate, prefillTime }: Props) {
  const { profile } = useAuth();
  const [tipo, setTipo] = useState<string>("sessao");
  const [customTipo, setCustomTipo] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTypes, setCustomTypes] = useState<string[]>(() => loadCustomTypes());
  const [titulo, setTitulo] = useState("");
  const { toast } = useToast();

  const tipoOptions = useMemo(() => {
    const custom = customTypes.map(t => ({ value: `custom:${t}`, label: t }));
    return [...BASE_TIPOS, ...custom, { value: "_new", label: "+ Criar novo tipo" }];
  }, [customTypes]);
  const [tituloManual, setTituloManual] = useState(false);
  const [pacienteId, setPacienteId] = useState("");
  const [pacienteSearch, setPacienteSearch] = useState("");
  const [showPacienteList, setShowPacienteList] = useState(false);
  const [date, setDate] = useState(prefillDate || format(new Date(), "yyyy-MM-dd"));
  const [timeStart, setTimeStart] = useState(prefillTime || "14:00");
  const [timeEnd, setTimeEnd] = useState("14:50");
  const [recorrencia, setRecorrencia] = useState<Recorrencia>("nenhuma");
  const [descricao, setDescricao] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [conflictAccepted, setConflictAccepted] = useState(false);

  const pacientes = useMemo(() => getPacientes({ status: "ativo" }), []);
  const filteredPacientes = useMemo(() => {
    if (!pacienteSearch) return pacientes;
    return pacientes.filter((p) => p.nome.toLowerCase().includes(pacienteSearch.toLowerCase()));
  }, [pacientes, pacienteSearch]);

  const selectedPaciente = pacientes.find((p) => p.id === pacienteId);
  const showPacienteField = tipo === "sessao" || tipo === "supervisao";
  const resolvedTipo: TipoAtividade = (["sessao", "supervisao", "pessoal", "outro"].includes(tipo) ? tipo : "outro") as TipoAtividade;
  const tipoLabel = tipo.startsWith("custom:") ? tipo.replace("custom:", "") : (tipoOptions.find(t => t.value === tipo)?.label || tipo);

  // Update prefill when props change
  useEffect(() => {
    if (prefillDate) setDate(prefillDate);
    if (prefillTime) {
      setTimeStart(prefillTime);
      // Default +50min for sessao
      const parsed = parse(prefillTime, "HH:mm", new Date());
      const endTime = addMinutes(parsed, 50);
      setTimeEnd(format(endTime, "HH:mm"));
    }
  }, [prefillDate, prefillTime]);

  // Auto-adjust end time ONLY when start time changes (not when user manually edits end time)
  const endTimeManual = useRef(false);
  useEffect(() => {
    if (endTimeManual.current) return;
    const parsed = parse(timeStart, "HH:mm", new Date());
    const duration = tipo === "sessao" ? 50 : tipo === "supervisao" ? 60 : 60;
    const endTime = addMinutes(parsed, duration);
    setTimeEnd(format(endTime, "HH:mm"));
  }, [timeStart, tipo]);

  // Check for conflicts (skip for all-day events)
  useEffect(() => {
    if (allDay) { setConflictWarning(null); return; }
    const startDateTime = new Date(`${date}T${timeStart}:00`);
    const endDateTime = new Date(`${date}T${timeEnd}:00`);
    const allActivities = getAtividades();
    const conflict = hasConflict(startDateTime, endDateTime, allActivities);
    if (conflict) {
      setConflictWarning(`Conflito com: ${conflict.titulo}`);
      setConflictAccepted(false);
    } else {
      setConflictWarning(null);
      setConflictAccepted(false);
    }
  }, [date, timeStart, timeEnd, allDay]);

  // Auto-update titulo when tipo/paciente changes, unless manually edited
  useEffect(() => {
    if (tituloManual) return;
    if (showPacienteField && selectedPaciente) {
      setTitulo(`${tipoLabel} \u2014 ${selectedPaciente.nome}`);
    } else {
      setTitulo(tipoLabel);
    }
  }, [tipo, selectedPaciente, showPacienteField, tituloManual, tipoLabel]);

  function handleSelectPaciente(p: Paciente) {
    setPacienteId(p.id);
    setPacienteSearch(p.nome);
    setShowPacienteList(false);
  }

  function handleSubmit() {
    const finalTitulo = titulo || "Atividade";
    const startDateTime = allDay ? new Date(`${date}T00:00:00`) : new Date(`${date}T${timeStart}:00`);
    const endDateTime = allDay ? new Date(`${date}T23:59:59`) : new Date(`${date}T${timeEnd}:00`);

    // Validate dates
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      toast("Data ou horário inválido", { type: "error" }); return;
    }
    if (!allDay && endDateTime <= startDateTime) {
      toast("Horário de fim deve ser depois do início", { type: "error" }); return;
    }

    createAtividade({
      terapeuta_id: profile?.id || '',
      paciente_id: showPacienteField && pacienteId ? pacienteId : undefined,
      tipo: resolvedTipo,
      titulo: finalTitulo,
      descricao: descricao || undefined,
      data_inicio: startDateTime.toISOString(),
      data_fim: endDateTime.toISOString(),
      status: "pendente",
      recorrencia,
      motivo_cancelamento: undefined,
      nota_pos_sessao: undefined,
    });

    // Reset form
    setTipo("sessao");
    setCustomTipo("");
    setShowCustomInput(false);
    setTitulo("");
    setTituloManual(false);
    setPacienteId("");
    setPacienteSearch("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setTimeStart("14:00");
    setTimeEnd("14:50");
    setRecorrencia("nenhuma");
    setDescricao("");
    setAllDay(false);
    endTimeManual.current = false;
    setConflictWarning(null);

    onCreated();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Atividade" size="lg">
      <div className="space-y-4">
        {/* Tipo */}
        <div>
          <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Tipo</label>
          <select
            value={showCustomInput ? "_new" : tipo}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "_new") {
                setShowCustomInput(true);
              } else {
                setShowCustomInput(false);
                setTipo(val);
                if (val !== "sessao" && val !== "supervisao") {
                  setPacienteId("");
                  setPacienteSearch("");
                }
              }
            }}
            className="w-full px-3.5 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors"
          >
            {tipoOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {showCustomInput && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={customTipo}
                onChange={e => setCustomTipo(e.target.value)}
                placeholder="Nome do novo tipo..."
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!customTipo.trim()) return;
                    const name = customTipo.trim();
                    saveCustomType(name);
                    setCustomTypes(loadCustomTypes());
                    setTipo(`custom:${name}`);
                    setShowCustomInput(false);
                    setCustomTipo("");
                  }
                }}
                className="flex-1 px-3.5 py-2 rounded-xl font-dm text-sm bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors placeholder:text-[var(--text-tertiary)]"
              />
              <button
                onClick={() => {
                  if (!customTipo.trim()) return;
                  const name = customTipo.trim();
                  saveCustomType(name);
                  setCustomTypes(loadCustomTypes());
                  setTipo(`custom:${name}`);
                  setShowCustomInput(false);
                  setCustomTipo("");
                }}
                className="px-4 py-2 rounded-xl bg-[var(--orange-500)] text-white font-dm text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Criar
              </button>
            </div>
          )}
          {customTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {customTypes.map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] font-dm text-xs text-[var(--text-secondary)]">
                  {t}
                  <button
                    onClick={() => {
                      const updated = customTypes.filter(x => x !== t);
                      syncSave(CUSTOM_TYPES_KEY, updated);
                      setCustomTypes(updated);
                      if (tipo === `custom:${t}`) setTipo("pessoal");
                    }}
                    className="ml-0.5 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
                    title={`Excluir tipo "${t}"`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Paciente (autocomplete) */}
        {showPacienteField && (
          <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setTimeout(() => setShowPacienteList(false), 150); }}>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Paciente <span className="text-[var(--text-tertiary)] text-xs">(opcional)</span>
            </label>
            <SearchInput
              value={pacienteSearch}
              onChange={(val) => {
                setPacienteSearch(val);
                setShowPacienteList(val.length > 0);
                if (!val) setPacienteId("");
              }}
              onFocus={() => { if (pacienteSearch.length > 0) setShowPacienteList(true); }}
              placeholder="Buscar paciente..."
              aria-expanded={showPacienteList && filteredPacientes.length > 0}
              aria-autocomplete="list"
            />
            {showPacienteList && filteredPacientes.length > 0 && (
              <div className="absolute z-[100] top-full mt-1 w-full bg-[var(--bg-card-elevated)] border border-[var(--border-default)] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {filteredPacientes.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPaciente(p)}
                    className={`w-full text-left px-3.5 py-2.5 font-dm text-sm hover:bg-[var(--bg-hover)] transition-colors ${
                      p.id === pacienteId ? "bg-[var(--bg-hover)]" : ""
                    } text-[var(--text-primary)]`}
                  >
                    <span className="font-medium">{p.nome}</span>
                    <span className="text-ink-2 dark:text-[#888] ml-2 text-xs">{p.modalidade}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Titulo editável */}
        <Input
          label="Título na agenda"
          value={titulo}
          onChange={(val) => { setTitulo(val); setTituloManual(true); }}
          placeholder="Ex: Reunião com equipe, Sessão extra..."
        />

        {/* Date */}
        <Input label="Data" type="date" value={date} onChange={setDate} required />

        {/* All day toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allDay}
            onChange={e => setAllDay(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--orange-500)] focus:ring-[var(--orange-500)] cursor-pointer"
          />
          <span className="font-dm text-sm text-[var(--text-primary)]">Dia todo</span>
        </label>

        {/* Time inputs (hidden when all day) */}
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Início" type="time" value={timeStart} onChange={setTimeStart} />
            <Input label="Fim" type="time" value={timeEnd} onChange={(v) => { endTimeManual.current = true; setTimeEnd(v); }} />
          </div>
        )}

        {/* Conflict warning (#15) */}
        {conflictWarning && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="font-dm text-sm font-medium text-amber-700 dark:text-amber-300">{conflictWarning}</p>
            </div>
            {!conflictAccepted && (
              <div className="flex items-center gap-2">
                <p className="font-dm text-xs text-amber-600 dark:text-amber-400 flex-1">Para criar mesmo assim, confirme abaixo:</p>
                <button
                  onClick={() => setConflictAccepted(true)}
                  className="px-3 py-1 rounded-lg bg-amber-500 text-white font-dm text-xs font-medium hover:bg-amber-600 transition-colors"
                >
                  Aceitar conflito
                </button>
              </div>
            )}
            {conflictAccepted && (
              <p className="font-dm text-xs text-amber-600 dark:text-amber-400">Conflito aceito — pode criar a atividade.</p>
            )}
          </div>
        )}

        {/* Recorrência */}
        <Select label="Recorrência" value={recorrencia} onChange={(val) => setRecorrencia(val as Recorrencia)} options={RECORRENCIA_OPTIONS} />

        {/* Descrição */}
        <Textarea
          label="Descrição (opcional)"
          value={descricao}
          onChange={setDescricao}
          placeholder="Observações sobre a atividade..."
          rows={3}
        />

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={conflictWarning && conflictAccepted ? "danger" : "primary"}
            onClick={handleSubmit}
            disabled={!!conflictWarning && !conflictAccepted}
          >
            {conflictWarning && conflictAccepted ? "Criar com conflito" : "Criar Atividade"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
