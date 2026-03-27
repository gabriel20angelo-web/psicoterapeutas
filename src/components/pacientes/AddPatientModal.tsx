"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { createPaciente, createAtividade, getCurrentUserId } from "@/lib/data";
import { useToast } from "@/contexts/ToastContext";
import { addWeeks, nextDay } from "date-fns";
import type { Modalidade } from "@/types/database";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const WEEKDAYS = [
  { value: "", label: "Selecione..." },
  { value: "segunda", label: "Segunda-feira" },
  { value: "terca", label: "Terça-feira" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "quinta", label: "Quinta-feira" },
  { value: "sexta", label: "Sexta-feira" },
  { value: "sabado", label: "Sábado" },
];

const MODALIDADES = [
  { value: "presencial", label: "Presencial" },
  { value: "online", label: "Online" },
  { value: "hibrido", label: "Híbrido" },
];

const WEEKDAY_MAP: Record<string, number> = {
  domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6,
};

export default function AddPatientModal({ isOpen, onClose, onCreated }: Props) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [contatoNome, setContatoNome] = useState("");
  const [contatoTelefone, setContatoTelefone] = useState("");
  const [contatoRelacao, setContatoRelacao] = useState("");
  const [diaFixo, setDiaFixo] = useState("");
  const [horarioFixo, setHorarioFixo] = useState("");
  const [modalidade, setModalidade] = useState<Modalidade>("presencial");
  const [observacoes, setObservacoes] = useState("");
  const [criarRecorrentes, setCriarRecorrentes] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!nome.trim()) errs.nome = "Nome é obrigatório";
    if (!telefone.trim()) errs.telefone = "Telefone é obrigatório";
    else if (telefone.replace(/\D/g, '').length < 10) errs.telefone = "Telefone inválido (mínimo 10 dígitos)";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const novoPaciente = createPaciente({
      terapeuta_id: getCurrentUserId(),
      nome: nome.trim(),
      telefone: telefone.trim(),
      email: email.trim() || undefined,
      data_nascimento: dataNascimento || undefined,
      status: "ativo",
      contato_emergencia_nome: contatoNome.trim(),
      contato_emergencia_telefone: contatoTelefone.trim(),
      contato_emergencia_relacao: contatoRelacao.trim(),
      dia_fixo: diaFixo || undefined,
      horario_fixo: horarioFixo || undefined,
      modalidade,
      observacoes: observacoes.trim() || undefined,
    });

    // Always create recurring sessions when day + time are set
    if (diaFixo && horarioFixo) {
      const dayIndex = WEEKDAY_MAP[diaFixo];
      if (dayIndex !== undefined) {
        const [hours, minutes] = horarioFixo.split(':').map(Number);
        const now = new Date();
        let firstDate: Date;
        if (now.getDay() === dayIndex) {
          firstDate = new Date(now);
          firstDate.setHours(hours, minutes, 0, 0);
          // If today's session time already passed, start next week
          if (firstDate <= now) {
            firstDate.setDate(firstDate.getDate() + 7);
          }
        } else {
          firstDate = nextDay(now, dayIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6);
          firstDate.setHours(hours, minutes, 0, 0);
        }

        const totalWeeks = criarRecorrentes ? 8 : 1;
        for (let i = 0; i < totalWeeks; i++) {
          const sessionDate = addWeeks(firstDate, i);
          const endDate = new Date(sessionDate);
          endDate.setMinutes(endDate.getMinutes() + 50);

          createAtividade({
            terapeuta_id: getCurrentUserId(),
            paciente_id: novoPaciente.id,
            tipo: 'sessao',
            titulo: `Sessão - ${nome.trim()}`,
            data_inicio: sessionDate.toISOString(),
            data_fim: endDate.toISOString(),
            status: 'pendente',
            recorrencia: 'semanal',
          });
        }
        toast(
          criarRecorrentes
            ? `Paciente criado e ${totalWeeks} sessões agendadas!`
            : "Paciente criado e primeira sessão agendada!",
          { type: "success" }
        );
      } else {
        toast("Paciente criado com sucesso!", { type: "success" });
      }
    } else {
      toast("Paciente criado com sucesso!", { type: "success" });
    }

    resetForm();
    onCreated();
    onClose();
  }

  function resetForm() {
    setNome("");
    setTelefone("");
    setEmail("");
    setDataNascimento("");
    setContatoNome("");
    setContatoTelefone("");
    setContatoRelacao("");
    setDiaFixo("");
    setHorarioFixo("");
    setModalidade("presencial");
    setObservacoes("");
    setCriarRecorrentes(true);
    setErrors({});
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Novo Paciente" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Dados pessoais */}
        <div>
          <p className="font-dm text-xs font-medium text-[#999] dark:text-[#666] uppercase tracking-wider mb-3">
            Dados Pessoais
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nome"
              value={nome}
              onChange={setNome}
              placeholder="Nome completo"
              required
              error={errors.nome}
            />
            <Input
              label="Telefone"
              value={telefone}
              onChange={setTelefone}
              placeholder="5531999999999"
              required
              error={errors.telefone}
            />
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="email@exemplo.com"
            />
            <Input
              label="Data de nascimento"
              type="date"
              value={dataNascimento}
              onChange={setDataNascimento}
            />
          </div>
        </div>

        {/* Contato de emergência */}
        <div>
          <p className="font-dm text-xs font-medium text-[#999] dark:text-[#666] uppercase tracking-wider mb-3">
            Contato de Emergência
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Nome"
              value={contatoNome}
              onChange={setContatoNome}
              placeholder="Nome do contato"
            />
            <Input
              label="Telefone"
              value={contatoTelefone}
              onChange={setContatoTelefone}
              placeholder="5531999999999"
            />
            <Input
              label="Relação"
              value={contatoRelacao}
              onChange={setContatoRelacao}
              placeholder="Ex: Mãe, Pai"
            />
          </div>
        </div>

        {/* Configuração de sessão */}
        <div>
          <p className="font-dm text-xs font-medium text-[#999] dark:text-[#666] uppercase tracking-wider mb-3">
            Configuração de Sessão
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Dia fixo"
              value={diaFixo}
              onChange={setDiaFixo}
              options={WEEKDAYS}
            />
            <Input
              label="Horário fixo"
              type="time"
              value={horarioFixo}
              onChange={setHorarioFixo}
            />
            <Select
              label="Modalidade"
              value={modalidade}
              onChange={(v) => setModalidade(v as Modalidade)}
              options={MODALIDADES}
            />
          </div>
        </div>

        {/* Sessões recorrentes */}
        {diaFixo && horarioFixo && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={criarRecorrentes}
              onChange={e => setCriarRecorrentes(e.target.checked)}
              className="w-4 h-4 rounded border-line text-acc focus:ring-acc cursor-pointer"
            />
            <span className="font-dm text-sm text-ink">Criar sessões recorrentes automaticamente</span>
            <span className="font-dm text-xs text-ink-2">(8 semanas)</span>
          </label>
        )}

        {/* Observações */}
        <Textarea
          label="Observações"
          value={observacoes}
          onChange={setObservacoes}
          placeholder="Anotações gerais sobre o paciente..."
          rows={3}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit">Cadastrar Paciente</Button>
        </div>
      </form>
    </Modal>
  );
}
