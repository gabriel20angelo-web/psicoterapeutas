"use client";
import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import RichEditor from "@/components/ui/RichEditor";
import { getDisciplinasCursando, getConfigAcademica } from "@/lib/academico-data";
import type { Conteudo, ConteudoInput } from "@/types/academico";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: ConteudoInput) => void;
  initial?: Conteudo;
  defaultDisciplinaId?: string;
}

export default function ConteudoForm({ open, onClose, onSave, initial, defaultDisciplinaId }: Props) {
  const disciplinas = getDisciplinasCursando();
  const config = getConfigAcademica();

  const [titulo, setTitulo] = useState(initial?.titulo || "");
  const [disciplinaId, setDisciplinaId] = useState(initial?.disciplina_id || defaultDisciplinaId || "");
  const [dataAula, setDataAula] = useState(initial?.data_aula || "");
  const [modulo, setModulo] = useState(initial?.modulo_tematico || "");
  const [statusEstudo, setStatusEstudo] = useState(initial?.status_estudo || config.status_estudo_sequence[0] || "");
  const [resumoHtml, setResumoHtml] = useState(initial?.resumo_html || "");
  const [linkExterno, setLinkExterno] = useState(initial?.link_resumo_externo || "");
  const [indicacaoLeitura, setIndicacaoLeitura] = useState(initial?.indicacao_leitura || "");
  const [bibliografia, setBibliografia] = useState(initial?.bibliografia || "");

  useEffect(() => {
    if (initial) {
      setTitulo(initial.titulo);
      setDisciplinaId(initial.disciplina_id);
      setDataAula(initial.data_aula);
      setModulo(initial.modulo_tematico);
      setStatusEstudo(initial.status_estudo);
      setResumoHtml(initial.resumo_html);
      setLinkExterno(initial.link_resumo_externo);
      setIndicacaoLeitura(initial.indicacao_leitura || "");
      setBibliografia(initial.bibliografia || "");
    }
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !disciplinaId) return;
    const disc = disciplinas.find(d => d.id === disciplinaId);
    onSave({
      disciplina_id: disciplinaId,
      titulo,
      data_aula: dataAula,
      professor: disc?.professor || "",
      modulo_tematico: modulo,
      status_estudo: statusEstudo,
      resumo_html: resumoHtml,
      link_resumo_externo: linkExterno,
      indicacao_leitura: indicacaoLeitura,
      bibliografia,
    });
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={initial ? "Editar Conteúdo" : "Novo Conteúdo"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Título *" value={titulo} onChange={setTitulo} required />
          <Select label="Disciplina *" value={disciplinaId} onChange={setDisciplinaId} options={[
            { value: "", label: "Selecione..." },
            ...disciplinas.map(d => ({ value: d.id, label: d.nome })),
          ]} />
          <Input label="Data da aula" type="date" value={dataAula} onChange={setDataAula} />
          <Input label="Módulo temático" value={modulo} onChange={setModulo} placeholder="Ex: Psicanálise" />
          <Select label="Status de estudo" value={statusEstudo} onChange={setStatusEstudo} options={config.status_estudo_sequence.map(s => ({ value: s, label: s }))} />
          <Input label="Link externo" value={linkExterno} onChange={setLinkExterno} placeholder="https://..." />
        </div>

        {/* Indicação de leitura e Bibliografia */}
        <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
          <p className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Leitura e Bibliografia</p>
          <Textarea label="Indicação de leitura da aula" value={indicacaoLeitura} onChange={setIndicacaoLeitura} rows={3} placeholder="Ex: Cap. 5 de Freud — O Ego e o Id; Artigo de Winnicott..." />
          <Textarea label="Bibliografia" value={bibliografia} onChange={setBibliografia} rows={3} placeholder="Referências bibliográficas da aula..." />
        </div>

        <div>
          <label className="block font-dm text-xs font-medium text-[var(--text-secondary)] mb-1">Resumo</label>
          <RichEditor content={resumoHtml} onChange={setResumoHtml} placeholder="Escreva seu resumo aqui..." minHeight="200px" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
          <Button variant="primary" type="submit">{initial ? "Salvar" : "Criar conteúdo"}</Button>
        </div>
      </form>
    </Modal>
  );
}
