"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Settings2, Plus, Trash2, GripVertical } from "lucide-react";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import { getConfigAcademica, updateConfigAcademica } from "@/lib/academico-data";
import type { ConfigAcademica, LinkRapido } from "@/types/academico";

export default function ConfiguracoesAcademicoPage() {
  const { toast } = useToast();
  const config = getConfigAcademica();

  const [metaLeitura, setMetaLeitura] = useState(config.meta_leitura_anual);
  const [citacao, setCitacao] = useState(config.citacao_dashboard);
  const [statusSequence, setStatusSequence] = useState(config.status_estudo_sequence);
  const [links, setLinks] = useState<LinkRapido[]>(config.links_rapidos);
  const [newStatusLabel, setNewStatusLabel] = useState("");

  const handleSave = () => {
    updateConfigAcademica({
      meta_leitura_anual: metaLeitura,
      citacao_dashboard: citacao,
      status_estudo_sequence: statusSequence.filter(s => s.trim()),
      links_rapidos: links.filter(l => l.label.trim() && l.url.trim()),
    });
    toast("Configurações salvas!", { type: "success" });
  };

  const addStatus = () => {
    if (!newStatusLabel.trim()) return;
    setStatusSequence([...statusSequence, newStatusLabel.trim()]);
    setNewStatusLabel("");
  };

  const removeStatus = (idx: number) => {
    setStatusSequence(statusSequence.filter((_, i) => i !== idx));
  };

  const moveStatus = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= statusSequence.length) return;
    const arr = [...statusSequence];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setStatusSequence(arr);
  };

  const addLink = () => {
    setLinks([...links, { label: "", url: "" }]);
  };

  const updateLink = (idx: number, field: keyof LinkRapido, value: string) => {
    const updated = [...links];
    updated[idx] = { ...updated[idx], [field]: value };
    setLinks(updated);
  };

  const removeLink = (idx: number) => {
    setLinks(links.filter((_, i) => i !== idx));
  };

  return (
    <Shell>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/academico" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors">
            <ArrowLeft size={18} className="text-[var(--text-tertiary)]" />
          </Link>
          <div>
            <h1 className="font-fraunces text-xl font-bold text-[var(--text-primary)]">Configurações Acadêmicas</h1>
            <p className="font-dm text-sm text-[var(--text-tertiary)]">Personalize seu sistema</p>
          </div>
        </div>

        {/* Meta de leitura */}
        <Card>
          <div className="p-4 space-y-3">
            <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Meta de Leitura Anual</h3>
            <Input label="Número de livros" type="number" value={String(metaLeitura)} onChange={val => setMetaLeitura(Number(val))} />
          </div>
        </Card>

        {/* Citação */}
        <Card>
          <div className="p-4 space-y-3">
            <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Citação do Dashboard</h3>
            <Input label="Frase ou citação" value={citacao} onChange={setCitacao} placeholder="Uma frase motivacional..." />
          </div>
        </Card>

        {/* Status de estudo */}
        <Card>
          <div className="p-4 space-y-3">
            <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Sequência de Status de Estudo</h3>
            <p className="font-dm text-xs text-[var(--text-tertiary)]">
              Define as etapas pelas quais cada conteúdo passa. A ordem importa.
            </p>
            <div className="space-y-1.5">
              {statusSequence.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[var(--text-tertiary)] w-6 text-right">{idx + 1}.</span>
                  <input value={s} onChange={e => {
                    const arr = [...statusSequence];
                    arr[idx] = e.target.value;
                    setStatusSequence(arr);
                  }} className="input-hamilton flex-1 text-sm py-1.5" />
                  <button onClick={() => moveStatus(idx, -1)} disabled={idx === 0}
                    className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30">
                    <span className="text-xs">&#9650;</span>
                  </button>
                  <button onClick={() => moveStatus(idx, 1)} disabled={idx === statusSequence.length - 1}
                    className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30">
                    <span className="text-xs">&#9660;</span>
                  </button>
                  <button onClick={() => removeStatus(idx)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newStatusLabel} onChange={e => setNewStatusLabel(e.target.value)}
                placeholder="Novo status..."
                className="input-hamilton flex-1 text-sm py-1.5"
                onKeyDown={e => e.key === "Enter" && addStatus()} />
              <Button variant="secondary" size="sm" onClick={addStatus}>
                <Plus size={14} /> Adicionar
              </Button>
            </div>
          </div>
        </Card>

        {/* Links rápidos */}
        <Card>
          <div className="p-4 space-y-3">
            <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Links Rápidos</h3>
            <p className="font-dm text-xs text-[var(--text-tertiary)]">Atalhos exibidos no dashboard acadêmico.</p>
            <div className="space-y-2">
              {links.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input value={link.label} onChange={e => updateLink(idx, "label", e.target.value)}
                    placeholder="Nome" className="input-hamilton flex-1 text-sm py-1.5" />
                  <input value={link.url} onChange={e => updateLink(idx, "url", e.target.value)}
                    placeholder="https://..." className="input-hamilton flex-[2] text-sm py-1.5" />
                  <button onClick={() => removeLink(idx)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addLink} className="font-dm text-xs text-[var(--orange-500)] hover:underline flex items-center gap-1">
              <Plus size={14} /> Adicionar link
            </button>
          </div>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button variant="primary" onClick={handleSave}>Salvar configurações</Button>
        </div>
      </div>
    </Shell>
  );
}
