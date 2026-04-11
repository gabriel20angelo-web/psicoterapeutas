"use client";
import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { getDisciplinasCursando, getConteudosByDisciplina, getBiblioteca } from "@/lib/academico-data";
import type { Tarefa, TarefaInput, TipoTarefa, StatusTarefa } from "@/types/academico";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: TarefaInput) => void;
  initial?: Tarefa;
  defaultDisciplinaId?: string;
}

export default function TarefaForm({ open, onClose, onSave, initial, defaultDisciplinaId }: Props) {
  const disciplinas = getDisciplinasCursando();
  const livros = getBiblioteca();

  const [titulo, setTitulo] = useState(initial?.titulo || "");
  const [disciplinaId, setDisciplinaId] = useState(initial?.disciplina_id || defaultDisciplinaId || "");
  const [bibliotecaId, setBibliotecaId] = useState((initial as any)?.biblioteca_id || "");
  const [tipo, setTipo] = useState<TipoTarefa>(initial?.tipo || "trabalho");
  const [dataEntrega, setDataEntrega] = useState(initial?.data_entrega || "");
  const [status, setStatus] = useState<StatusTarefa>(initial?.status || "pendente");
  const [nota, setNota] = useState<string>(initial?.nota != null ? String(initial.nota) : "");
  const [observacoes, setObservacoes] = useState(initial?.observacoes || "");
  const [conteudosIds, setConteudosIds] = useState<string[]>(initial?.conteudos_ids || []);
  const [diaSemana, setDiaSemana] = useState<string>(initial?.dia_semana_estudo != null ? String(initial.dia_semana_estudo) : "");

  const conteudos = disciplinaId ? getConteudosByDisciplina(disciplinaId) : [];

  useEffect(() => {
    if (initial) {
      setTitulo(initial.titulo);
      setDisciplinaId(initial.disciplina_id);
      setBibliotecaId((initial as any).biblioteca_id || "");
      setTipo(initial.tipo);
      setDataEntrega(initial.data_entrega);
      setStatus(initial.status);
      setNota(initial.nota != null ? String(initial.nota) : "");
      setObservacoes(initial.observacoes);
      setConteudosIds(initial.conteudos_ids);
      setDiaSemana(initial.dia_semana_estudo != null ? String(initial.dia_semana_estudo) : "");
    }
  }, [initial]);

  const toggleConteudo = (id: string) => {
    setConteudosIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !disciplinaId) return;
    onSave({
      disciplina_id: disciplinaId,
      biblioteca_id: bibliotecaId,
      titulo,
      tipo,
      data_entrega: dataEntrega,
      status,
      conteudos_ids: tipo === "prova" ? conteudosIds : [],
      dia_semana_estudo: diaSemana ? Number(diaSemana) : null,
      nota: nota ? Number(nota) : null,
      observacoes,
    });
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={initial ? "Editar Tarefa" : "Nova Tarefa"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Título *" value={titulo} onChange={setTitulo} required />
          <Select label="Disciplina *" value={disciplinaId} onChange={val => { setDisciplinaId(val); setConteudosIds([]); }} options={[
            { value: "", label: "Selecione..." },
            ...disciplinas.map(d => ({ value: d.id, label: d.nome })),
          ]} />
          {livros.length > 0 && (
            <Select label="Livro/Artigo" value={bibliotecaId} onChange={setBibliotecaId} options={[
              { value: "", label: "Nenhum" },
              ...livros.map(b => ({ value: b.id, label: `${b.tipo_leitura === "artigo" ? "📄" : "📖"} ${b.titulo}` })),
            ]} />
          )}
          <Select label="Tipo" value={tipo} onChange={val => setTipo(val as TipoTarefa)} options={[
            { value: "prova", label: "Prova" },
            { value: "trabalho", label: "Trabalho" },
            { value: "licao", label: "Lição" },
            { value: "apresentacao", label: "Apresentação" },
            { value: "seminario", label: "Seminário" },
            { value: "outro", label: "Outro" },
          ]} />
          <Select label="Status" value={status} onChange={val => setStatus(val as StatusTarefa)} options={[
            { value: "pendente", label: "Pendente" },
            { value: "em_andamento", label: "Em andamento" },
            { value: "concluida", label: "Concluída" },
          ]} />
          <Input label="Data de entrega" type="date" value={dataEntrega} onChange={setDataEntrega} />
          <Input label="Nota" type="number" value={nota} onChange={setNota} placeholder="0-10" />
          <Select label="Dia para estudo" value={diaSemana} onChange={setDiaSemana} options={[
            { value: "", label: "Sem dia definido" },
            { value: "1", label: "Segunda" },
            { value: "2", label: "Terça" },
            { value: "3", label: "Quarta" },
            { value: "4", label: "Quinta" },
            { value: "5", label: "Sexta" },
            { value: "6", label: "Sábado" },
            { value: "0", label: "Domingo" },
          ]} />
        </div>

        <Textarea label="Observações" value={observacoes} onChange={setObservacoes} />

        {/* Conteúdos associados (only for prova) */}
        {tipo === "prova" && conteudos.length > 0 && (
          <div>
            <label className="block font-dm text-xs font-medium text-[var(--text-secondary)] mb-2">Conteúdos cobrados nesta prova</label>
            <div className="space-y-1 max-h-48 overflow-y-auto border border-[var(--border-subtle)] rounded-xl p-2">
              {conteudos.map(c => (
                <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-hover)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={conteudosIds.includes(c.id)}
                    onChange={() => toggleConteudo(c.id)}
                    className="rounded border-[var(--border-default)]"
                  />
                  <span className="font-dm text-sm text-[var(--text-primary)]">{c.titulo}</span>
                  <span className="font-dm text-xs text-[var(--text-tertiary)] ml-auto">{c.status_estudo}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
          <Button variant="primary" type="submit">{initial ? "Salvar" : "Criar tarefa"}</Button>
        </div>
      </form>
    </Modal>
  );
}
