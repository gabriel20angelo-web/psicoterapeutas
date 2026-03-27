"use client";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import Shell from "@/components/Shell";
import SearchInput from "@/components/ui/SearchInput";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Tabs from "@/components/ui/Tabs";
import EmptyState from "@/components/ui/EmptyState";
import PatientCard from "@/components/pacientes/PatientCard";
import AddPatientModal from "@/components/pacientes/AddPatientModal";
import { getPacientes, getAtividadesByPaciente, getTemplates, updateAtividade, onDataChange } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { fillTemplate, buildWhatsAppUrl, buildMessageVars } from "@/lib/whatsapp";
import { fadeUp } from "@/lib/animations";
import type { StatusPaciente, Paciente, Atividade } from "@/types/database";

const STATUS_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
];

const SORT_OPTIONS = [
  { value: "nome_asc", label: "Nome A-Z" },
  { value: "nome_desc", label: "Nome Z-A" },
  { value: "recente", label: "Mais recente" },
];

export default function PacientesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);
  const [statusFilter, setStatusFilter] = useState<StatusPaciente | "todos">("todos");
  const [sort, setSort] = useState<"nome_asc" | "nome_desc" | "recente">("nome_asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    return onDataChange(() => setRefreshKey(k => k + 1));
  }, []);

  const { profile } = useAuth();
  const templates = getTemplates();

  const pacientes = useMemo(
    () => getPacientes({ search: debouncedSearch, status: statusFilter, sort }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedSearch, statusFilter, sort, refreshKey]
  );

  const patientData = useMemo(() => {
    const lastDates: Record<string, string> = {};
    const nextSessions: Record<string, Atividade> = {};
    const now = new Date();
    pacientes.forEach((p) => {
      const atividades = getAtividadesByPaciente(p.id);
      const realizadas = atividades.filter(a => a.status === "realizada");
      if (realizadas.length > 0) lastDates[p.id] = new Date(realizadas[0].data_inicio).toLocaleDateString("pt-BR");
      const futuras = atividades.filter(a => new Date(a.data_inicio) >= now && ['confirmada', 'pendente'].includes(a.status));
      if (futuras.length > 0) {
        futuras.sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());
        nextSessions[p.id] = futuras[0];
      }
    });
    return { lastDates, nextSessions };
  }, [pacientes]);

  const handleCreated = useCallback(() => setRefreshKey(k => k + 1), []);

  const handleConfirmSession = (paciente: Paciente, session: Atividade) => {
    if (!paciente.telefone) return;
    const tmpl = templates.find(t => t.tipo === 'confirmacao');
    if (!tmpl) return;
    const vars = buildMessageVars(profile!, paciente, session);
    const msg = fillTemplate(tmpl.conteudo, vars);
    const url = buildWhatsAppUrl(paciente.telefone, msg);
    window.open(url, "_blank");
  };

  return (
    <Shell>
      <motion.div {...fadeUp()} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-fraunces font-bold text-2xl md:text-3xl">Pacientes</h1>
          <p className="font-dm text-sm text-[var(--text-secondary)] mt-1">Cadastro e histórico dos seus pacientes.</p>
        </div>
        <Button onClick={() => setModalOpen(true)} icon={<Plus size={16} />}>Novo Paciente</Button>
      </motion.div>

      <motion.div {...fadeUp(0.1)} className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchInput value={search} onChange={handleSearch} placeholder="Buscar paciente..." className="flex-1" />
        <div className="flex gap-3 items-center">
          <div className="inline-flex rounded-xl border border-[var(--border-default)] overflow-hidden">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value as StatusPaciente | "todos")}
                className={`px-4 py-2 font-dm text-sm font-medium transition-all ${
                  statusFilter === f.value
                    ? "bg-[var(--bg-card)] dark:bg-[rgba(17,21,32,.8)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Select value={sort} onChange={v => setSort(v as "nome_asc" | "nome_desc" | "recente")} options={SORT_OPTIONS} className="w-40" />
        </div>
      </motion.div>

      {pacientes.length === 0 ? (
        <motion.div {...fadeUp(0.2)}>
          <EmptyState message={search || statusFilter !== "todos" ? "Nenhum paciente encontrado." : "Nenhum paciente cadastrado."} />
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pacientes.map((p, i) => (
            <PatientCard
              key={p.id}
              paciente={p}
              index={i}
              lastSessionDate={patientData.lastDates[p.id]}
              nextSession={patientData.nextSessions[p.id]}
              onConfirmSession={handleConfirmSession}
            />
          ))}
        </div>
      )}

      <AddPatientModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
    </Shell>
  );
}
