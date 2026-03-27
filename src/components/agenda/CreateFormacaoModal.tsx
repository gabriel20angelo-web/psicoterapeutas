"use client";

import { useState, useEffect } from "react";
import { format, addMinutes, parse } from "date-fns";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import TimePicker from "@/components/ui/TimePicker";
import Textarea from "@/components/ui/Textarea";
import type { Recorrencia, CategoriaComunidade, TipoComunidade } from "@/types/database";
import { createAtividadeComunidade } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  prefillDate?: string;
  prefillTime?: string;
}

const RECORRENCIA_OPTIONS: { value: Recorrencia; label: string }[] = [
  { value: "nenhuma", label: "Nenhuma" },
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" },
];

const CATEGORIA_OPTIONS: { value: CategoriaComunidade; label: string }[] = [
  { value: "formacao_allos", label: "Formacao Allos" },
  { value: "grupo_estudos", label: "Grupo de Estudos" },
  { value: "intervisao", label: "Intervisao" },
  { value: "evento_externo", label: "Evento Externo" },
  { value: "outro", label: "Outro" },
];

export default function CreateFormacaoModal({ isOpen, onClose, onCreated, prefillDate, prefillTime }: Props) {
  const { profile, canCreateFormacaoCanonica } = useAuth();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<CategoriaComunidade>("grupo_estudos");
  const [tipo, setTipo] = useState<TipoComunidade>("comunidade");
  const [date, setDate] = useState(prefillDate || format(new Date(), "yyyy-MM-dd"));
  const [timeStart, setTimeStart] = useState(prefillTime || "14:00");
  const [timeEnd, setTimeEnd] = useState("15:00");
  const [allDay, setAllDay] = useState(false);
  const [recorrencia, setRecorrencia] = useState<Recorrencia>("nenhuma");
  const [localOuLink, setLocalOuLink] = useState("");
  const [maxParticipantes, setMaxParticipantes] = useState("");

  // Update prefill when props change
  useEffect(() => {
    if (prefillDate) setDate(prefillDate);
    if (prefillTime) {
      setTimeStart(prefillTime);
      const parsed = parse(prefillTime, "HH:mm", new Date());
      setTimeEnd(format(addMinutes(parsed, 60), "HH:mm"));
    }
  }, [prefillDate, prefillTime]);

  // Auto-adjust end time
  useEffect(() => {
    if (allDay) return;
    const parsed = parse(timeStart, "HH:mm", new Date());
    setTimeEnd(format(addMinutes(parsed, 60), "HH:mm"));
  }, [timeStart, allDay]);

  // When tipo is canonico, set categoria and recorrencia defaults
  useEffect(() => {
    if (tipo === "canonico") {
      setCategoria("formacao_allos");
      setRecorrencia("semanal");
    }
  }, [tipo]);

  function resetForm() {
    setTitulo("");
    setDescricao("");
    setCategoria("grupo_estudos");
    setTipo("comunidade");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setTimeStart("14:00");
    setTimeEnd("15:00");
    setAllDay(false);
    setRecorrencia("nenhuma");
    setLocalOuLink("");
    setMaxParticipantes("");
  }

  function handleSubmit() {
    if (!titulo.trim()) return;

    const startDateTime = allDay
      ? new Date(`${date}T00:00:00`)
      : new Date(`${date}T${timeStart}:00`);
    const endDateTime = allDay
      ? new Date(`${date}T23:59:59`)
      : new Date(`${date}T${timeEnd}:00`);

    createAtividadeComunidade({
      criador_id: profile?.id || '',
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      categoria,
      tipo,
      data_inicio: startDateTime.toISOString(),
      data_fim: endDateTime.toISOString(),
      local_ou_link: localOuLink.trim() || undefined,
      max_participantes: maxParticipantes ? parseInt(maxParticipantes) : undefined,
      recorrencia,
    });

    resetForm();
    onCreated();
    onClose();
  }

  const isCanonicoOption = canCreateFormacaoCanonica;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Evento de Formacao" size="lg">
      <div className="space-y-4">
        {/* Tipo: canonico ou comunidade */}
        {isCanonicoOption ? (
          <div>
            <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">Tipo de evento</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTipo("comunidade")}
                className={`flex-1 px-4 py-2.5 rounded-xl font-dm text-sm font-medium transition-all border ${
                  tipo === "comunidade"
                    ? "bg-[var(--orange-glow)] text-[var(--orange-500)] border-[var(--orange-500)]/30"
                    : "border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                Comunidade
              </button>
              <button
                onClick={() => setTipo("canonico")}
                className={`flex-1 px-4 py-2.5 rounded-xl font-dm text-sm font-medium transition-all border ${
                  tipo === "canonico"
                    ? "bg-[var(--orange-glow)] text-[var(--orange-500)] border-[var(--orange-500)]/30"
                    : "border-[var(--border-default)] text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                Allos (canonico)
              </button>
            </div>
            {tipo === "canonico" && (
              <p className="font-dm text-xs text-[var(--text-tertiary)] mt-1">
                Eventos canonicos sao oficiais da Allos e nao podem ser editados por usuarios comuns.
              </p>
            )}
          </div>
        ) : (
          <input type="hidden" value="comunidade" />
        )}

        {/* Titulo */}
        <Input
          label="Titulo"
          value={titulo}
          onChange={setTitulo}
          placeholder="Ex: Grupo de Estudos TCC, Formacao em EMDR..."
          required
        />

        {/* Descricao */}
        <Textarea
          label="Descrição (opcional)"
          value={descricao}
          onChange={setDescricao}
          placeholder="Detalhes sobre o evento..."
          rows={3}
        />

        {/* Categoria (only for comunidade) */}
        {tipo === "comunidade" && (
          <Select
            label="Categoria"
            value={categoria}
            onChange={(val) => setCategoria(val as CategoriaComunidade)}
            options={CATEGORIA_OPTIONS.filter(c => c.value !== "formacao_allos")}
          />
        )}

        {/* Data */}
        <Input label="Data" type="date" value={date} onChange={setDate} required />

        {/* Dia inteiro toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--orange-500)] focus:ring-[var(--orange-500)]"
          />
          <span className="font-dm text-sm text-[var(--text-secondary)]">Dia inteiro</span>
        </label>

        {/* Horarios */}
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <TimePicker label="Inicio" value={timeStart} onChange={setTimeStart} />
            <TimePicker label="Fim" value={timeEnd} onChange={setTimeEnd} />
          </div>
        )}

        {/* Recorrencia */}
        <Select
          label="Recorrencia"
          value={recorrencia}
          onChange={(val) => setRecorrencia(val as Recorrencia)}
          options={RECORRENCIA_OPTIONS}
        />

        {/* Local ou link */}
        <Input
          label="Local ou link (opcional)"
          value={localOuLink}
          onChange={setLocalOuLink}
          placeholder="Ex: Sede Allos, Google Meet..."
        />

        {/* Max participantes */}
        <Input
          label="Maximo de participantes (opcional)"
          type="number"
          value={maxParticipantes}
          onChange={setMaxParticipantes}
          placeholder="Deixe vazio para ilimitado"
        />

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!titulo.trim()}>Criar Evento</Button>
        </div>
      </div>
    </Modal>
  );
}
