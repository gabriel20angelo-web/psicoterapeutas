"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Target, Plus, Pencil, Trash2, Check,
  ChevronLeft, ChevronRight, FileText, Sun,
} from "lucide-react";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Tabs from "@/components/ui/Tabs";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import EmptyState from "@/components/ui/EmptyState";
import RichEditor from "@/components/ui/RichEditor";
import { useToast } from "@/contexts/ToastContext";
import {
  getMetasAnuais, getMetasMensais, getMetasDiarias, createMeta, updateMeta, deleteMeta,
  getReflexoes, createReflexao, updateReflexao, deleteReflexao,
  getConfigAcademica, updateConfigAcademica,
} from "@/lib/academico-data";
import type { Meta, MetaInput, StatusMeta, TipoMeta, Reflexao, ReflexaoInput, TipoReflexao } from "@/types/academico";
import { LABEL_STATUS_META } from "@/types/academico";

const STATUS_COLORS: Record<StatusMeta, { bg: string; text: string }> = {
  nao_iniciada: { bg: "var(--bg-hover)", text: "var(--text-tertiary)" },
  em_andamento: { bg: "rgba(59,130,246,.1)", text: "#3b82f6" },
  concluida:    { bg: "rgba(16,185,129,.1)", text: "#10b981" },
  abandonada:   { bg: "var(--red-bg)", text: "var(--red-text)" },
};

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const FALLBACK_CATEGORIAS = ["Acadêmico", "Pessoal", "Saúde", "Financeiro", "Idiomas", "Profissional"];

export default function MetasPage() {
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const config = getConfigAcademica();
  const categorias_config = config.categorias_meta?.length ? config.categorias_meta : FALLBACK_CATEGORIAS;
  const [ano, setAno] = useState(config.ano_metas_atual);
  const [tab, setTab] = useState("anuais");
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
  const [diaSelecionado, setDiaSelecionado] = useState(new Date().toISOString().slice(0, 10));

  // Meta form
  const [showMetaForm, setShowMetaForm] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);
  const [metaDesc, setMetaDesc] = useState("");
  const [metaCat, setMetaCat] = useState("Acadêmico");
  const [metaTipo, setMetaTipo] = useState<TipoMeta>("anual");
  const [metaMes, setMetaMes] = useState(1);
  const [metaDia, setMetaDia] = useState(new Date().toISOString().slice(0, 10));

  // Category management
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCat, setNewCat] = useState("");

  // Reflexao form
  const [showReflexaoForm, setShowReflexaoForm] = useState(false);
  const [editingReflexao, setEditingReflexao] = useState<Reflexao | null>(null);
  const [reflexaoTipo, setReflexaoTipo] = useState<TipoReflexao>("semanal");
  const [reflexaoData, setReflexaoData] = useState(new Date().toISOString().slice(0, 10));
  const [reflexaoConteudo, setReflexaoConteudo] = useState("");

  // Intencoes form
  const [showIntencoesForm, setShowIntencoesForm] = useState(false);
  const [fazerMais, setFazerMais] = useState(config.fazer_mais.join("\n"));
  const [fazerMenos, setFazerMenos] = useState(config.fazer_menos.join("\n"));
  const [regrasAno, setRegrasAno] = useState(config.regras_do_ano.join("\n"));

  const metasAnuais = getMetasAnuais(ano);
  const metasMensais = getMetasMensais(ano, mesSelecionado);
  const metasDiarias = getMetasDiarias(diaSelecionado);
  const reflexoes = getReflexoes().filter(r => r.data.startsWith(String(ano))).sort((a, b) => b.data.localeCompare(a.data));

  // Group annual metas by category
  const categorias = new Map<string, Meta[]>();
  metasAnuais.forEach(m => {
    const cat = m.categoria || "Sem categoria";
    if (!categorias.has(cat)) categorias.set(cat, []);
    categorias.get(cat)!.push(m);
  });

  const openMetaForm = (tipo: TipoMeta, meta?: Meta) => {
    if (meta) {
      setEditingMeta(meta);
      setMetaDesc(meta.descricao);
      setMetaCat(meta.categoria);
      setMetaTipo(meta.tipo);
      setMetaMes(meta.mes || 1);
      setMetaDia(meta.dia || diaSelecionado);
    } else {
      setEditingMeta(null);
      setMetaDesc("");
      setMetaCat("Acadêmico");
      setMetaTipo(tipo);
      setMetaMes(mesSelecionado);
      setMetaDia(diaSelecionado);
    }
    setShowMetaForm(true);
  };

  const handleAddCategory = () => {
    const cat = newCat.trim();
    if (!cat || categorias_config.includes(cat)) return;
    updateConfigAcademica({ categorias_meta: [...categorias_config, cat] });
    setNewCat("");
    setShowCatForm(false);
    refresh();
  };

  const handleRemoveCategory = (cat: string) => {
    updateConfigAcademica({ categorias_meta: categorias_config.filter(c => c !== cat) });
    refresh();
  };

  const handleSaveMeta = () => {
    if (!metaDesc.trim()) return;
    const data: MetaInput = {
      ano,
      tipo: metaTipo,
      categoria: metaCat,
      descricao: metaDesc,
      status: editingMeta?.status || "nao_iniciada",
      mes: metaTipo === "mensal" ? metaMes : null,
      dia: metaTipo === "diaria" ? metaDia : null,
    };
    if (editingMeta) {
      updateMeta(editingMeta.id, data);
    } else {
      createMeta(data);
    }
    toast(editingMeta ? "Meta atualizada" : "Meta criada", { type: "success" });
    setShowMetaForm(false);
    refresh();
  };

  const cycleMetaStatus = (m: Meta) => {
    const order: StatusMeta[] = ["nao_iniciada", "em_andamento", "concluida"];
    const idx = order.indexOf(m.status);
    updateMeta(m.id, { status: order[(idx + 1) % order.length] });
    refresh();
  };

  const openReflexaoForm = (r?: Reflexao) => {
    if (r) {
      setEditingReflexao(r);
      setReflexaoTipo(r.tipo);
      setReflexaoData(r.data);
      setReflexaoConteudo(r.conteudo_html);
    } else {
      setEditingReflexao(null);
      setReflexaoTipo("semanal");
      setReflexaoData(new Date().toISOString().slice(0, 10));
      setReflexaoConteudo("");
    }
    setShowReflexaoForm(true);
  };

  const handleSaveReflexao = () => {
    const data: ReflexaoInput = { tipo: reflexaoTipo, data: reflexaoData, conteudo_html: reflexaoConteudo };
    if (editingReflexao) {
      updateReflexao(editingReflexao.id, data);
    } else {
      createReflexao(data);
    }
    toast(editingReflexao ? "Reflexão atualizada" : "Reflexão salva", { type: "success" });
    setShowReflexaoForm(false);
    refresh();
  };

  const handleSaveIntencoes = () => {
    updateConfigAcademica({
      fazer_mais: fazerMais.split("\n").map(s => s.trim()).filter(Boolean),
      fazer_menos: fazerMenos.split("\n").map(s => s.trim()).filter(Boolean),
      regras_do_ano: regrasAno.split("\n").map(s => s.trim()).filter(Boolean),
    });
    toast("Intenções salvas", { type: "success" });
    setShowIntencoesForm(false);
    refresh();
  };

  const tabs = [
    { id: "diarias", label: "Metas do Dia" },
    { id: "anuais", label: "Metas Anuais" },
    { id: "mensais", label: "Objetivos Mensais" },
    { id: "reflexoes", label: "Reflexões" },
  ];

  return (
    <Shell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/academico" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors">
              <ArrowLeft size={18} className="text-[var(--text-tertiary)]" />
            </Link>
            <div>
              <h1 className="font-fraunces text-xl font-bold text-[var(--text-primary)]">Metas e Reflexões</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <button onClick={() => setAno(a => a - 1)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><ChevronLeft size={14} /></button>
                <span className="font-mono text-sm font-semibold text-[var(--orange-500)]">{ano}</span>
                <button onClick={() => setAno(a => a + 1)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><ChevronRight size={14} /></button>
              </div>
            </div>
          </div>
        </div>

        <Tabs tabs={tabs} active={tab} onChange={setTab} />

        {/* ─── Metas Diárias ─── */}
        {tab === "diarias" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sun size={18} className="text-[var(--orange-500)]" />
                <input type="date" value={diaSelecionado} onChange={e => setDiaSelecionado(e.target.value)}
                  className="input-hamilton text-sm py-1.5 px-3 font-mono" />
              </div>
              <Button variant="primary" size="sm" onClick={() => openMetaForm("diaria")}>
                <Plus size={14} /> Nova meta do dia
              </Button>
            </div>

            {metasDiarias.length === 0 ? (
              <EmptyState icon={<Target size={32} />} message="Nenhuma meta para este dia." />
            ) : (
              <div className="space-y-1.5">
                {metasDiarias.map(m => {
                  const sc = STATUS_COLORS[m.status];
                  return (
                    <Card key={m.id}>
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button onClick={() => cycleMetaStatus(m)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              m.status === "concluida" ? "bg-[#10b981] border-[#10b981] text-white" : "border-[var(--border-default)]"
                            }`}>
                            {m.status === "concluida" && <Check size={12} />}
                          </button>
                          <p className={`font-dm text-sm ${m.status === "concluida" ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"}`}>
                            {m.descricao}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {m.categoria && <Badge bg="var(--bg-hover)" text="var(--text-tertiary)" label={m.categoria} />}
                          <button onClick={() => openMetaForm("diaria", m)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><Pencil size={13} /></button>
                          <button onClick={() => { deleteMeta(m.id); refresh(); }} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Metas Anuais ─── */}
        {tab === "anuais" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Button variant="secondary" size="sm" onClick={() => setShowIntencoesForm(true)}>Intenções do ano</Button>
              <Button variant="primary" size="sm" onClick={() => openMetaForm("anual")}>
                <Plus size={14} /> Nova meta
              </Button>
            </div>

            {/* Intenções summary */}
            {(config.fazer_mais.length > 0 || config.fazer_menos.length > 0 || config.regras_do_ano.length > 0) && (
              <div className="grid md:grid-cols-3 gap-3">
                {config.fazer_mais.length > 0 && (
                  <Card>
                    <div className="p-3">
                      <p className="font-dm text-xs font-semibold text-[#10b981] mb-2">Fazer mais de...</p>
                      {config.fazer_mais.map((item, i) => (
                        <p key={i} className="font-dm text-xs text-[var(--text-secondary)]">+ {item}</p>
                      ))}
                    </div>
                  </Card>
                )}
                {config.fazer_menos.length > 0 && (
                  <Card>
                    <div className="p-3">
                      <p className="font-dm text-xs font-semibold text-[var(--red-text)] mb-2">Fazer menos de...</p>
                      {config.fazer_menos.map((item, i) => (
                        <p key={i} className="font-dm text-xs text-[var(--text-secondary)]">- {item}</p>
                      ))}
                    </div>
                  </Card>
                )}
                {config.regras_do_ano.length > 0 && (
                  <Card>
                    <div className="p-3">
                      <p className="font-dm text-xs font-semibold text-[#8b5cf6] mb-2">Regras do ano</p>
                      {config.regras_do_ano.map((item, i) => (
                        <p key={i} className="font-dm text-xs text-[var(--text-secondary)]">&bull; {item}</p>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {categorias.size === 0 ? (
              <EmptyState icon={<Target size={32} />} message={`Nenhuma meta. Defina suas metas para ${ano}.`} />
            ) : (
              Array.from(categorias.entries()).map(([cat, metas]) => (
                <div key={cat}>
                  <h3 className="font-dm text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">{cat}</h3>
                  <div className="space-y-1.5">
                    {metas.map(m => {
                      const sc = STATUS_COLORS[m.status];
                      return (
                        <Card key={m.id}>
                          <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <button onClick={() => cycleMetaStatus(m)}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                  m.status === "concluida" ? "bg-[#10b981] border-[#10b981] text-white" : "border-[var(--border-default)]"
                                }`}>
                                {m.status === "concluida" && <Check size={12} />}
                              </button>
                              <p className={`font-dm text-sm ${m.status === "concluida" ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"}`}>
                                {m.descricao}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge bg={sc.bg} text={sc.text} label={LABEL_STATUS_META[m.status]} />
                              <button onClick={() => openMetaForm("anual", m)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><Pencil size={13} /></button>
                              <button onClick={() => { deleteMeta(m.id); refresh(); }} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── Metas Mensais ─── */}
        {tab === "mensais" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setMesSelecionado(m => Math.max(1, m - 1))} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><ChevronLeft size={16} /></button>
                <span className="font-fraunces text-base font-semibold text-[var(--text-primary)] min-w-[120px] text-center">{MESES[mesSelecionado - 1]}</span>
                <button onClick={() => setMesSelecionado(m => Math.min(12, m + 1))} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><ChevronRight size={16} /></button>
              </div>
              <Button variant="primary" size="sm" onClick={() => openMetaForm("mensal")}>
                <Plus size={14} /> Novo objetivo
              </Button>
            </div>

            {metasMensais.length === 0 ? (
              <EmptyState icon={<Target size={32} />} message={`Nenhum objetivo. Defina objetivos para ${MESES[mesSelecionado - 1]}.`} />
            ) : (
              <div className="space-y-1.5">
                {metasMensais.map(m => {
                  const sc = STATUS_COLORS[m.status];
                  return (
                    <Card key={m.id}>
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button onClick={() => cycleMetaStatus(m)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              m.status === "concluida" ? "bg-[#10b981] border-[#10b981] text-white" : "border-[var(--border-default)]"
                            }`}>
                            {m.status === "concluida" && <Check size={12} />}
                          </button>
                          <p className={`font-dm text-sm ${m.status === "concluida" ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"}`}>
                            {m.descricao}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {m.categoria && <Badge bg="var(--bg-hover)" text="var(--text-tertiary)" label={m.categoria} />}
                          <button onClick={() => openMetaForm("mensal", m)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><Pencil size={13} /></button>
                          <button onClick={() => { deleteMeta(m.id); refresh(); }} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Reflexões ─── */}
        {tab === "reflexoes" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => openReflexaoForm()}>
                <Plus size={14} /> Nova reflexão
              </Button>
            </div>

            {reflexoes.length === 0 ? (
              <EmptyState icon={<FileText size={32} />} message="Nenhuma reflexão. Registre suas reflexões semanais e mensais." />
            ) : (
              <div className="space-y-3">
                {reflexoes.map(r => (
                  <Card key={r.id}>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[var(--text-tertiary)]">{r.data}</span>
                          <Badge
                            bg={r.tipo === "semanal" ? "rgba(59,130,246,.1)" : "rgba(139,92,246,.1)"}
                            text={r.tipo === "semanal" ? "#3b82f6" : "#8b5cf6"}
                            label={r.tipo === "semanal" ? "Semanal" : "Mensal"}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openReflexaoForm(r)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><Pencil size={13} /></button>
                          <button onClick={() => { deleteReflexao(r.id); refresh(); }} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]"><Trash2 size={13} /></button>
                        </div>
                      </div>
                      <div className="font-dm text-sm text-[var(--text-secondary)] prose-editor" dangerouslySetInnerHTML={{ __html: r.conteudo_html }} />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Modals ─── */}

        {/* Meta Form */}
        <Modal isOpen={showMetaForm} onClose={() => setShowMetaForm(false)} title={editingMeta ? "Editar Meta" : "Nova Meta"} size="md">
          <div className="space-y-3">
            <Textarea label="Descrição *" value={metaDesc} onChange={setMetaDesc} />
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Select label="Categoria" value={metaCat} onChange={setMetaCat} options={categorias_config.map(c => ({ value: c, label: c }))} />
              </div>
              <button type="button" onClick={() => setShowCatForm(true)}
                className="px-2 py-2 rounded-lg text-xs font-dm text-[var(--orange-500)] hover:bg-[var(--bg-hover)] transition-colors whitespace-nowrap">
                + Nova
              </button>
            </div>
            {metaTipo === "mensal" && (
              <Select label="Mês" value={String(metaMes)} onChange={val => setMetaMes(Number(val))} options={MESES.map((m, i) => ({ value: String(i + 1), label: m }))} />
            )}
            {metaTipo === "diaria" && (
              <Input label="Data" type="date" value={metaDia} onChange={setMetaDia} />
            )}
            {editingMeta && (
              <Select label="Status" value={editingMeta.status} onChange={val => { setEditingMeta({ ...editingMeta, status: val as StatusMeta }); }} options={[
                { value: "nao_iniciada", label: "Não iniciada" },
                { value: "em_andamento", label: "Em andamento" },
                { value: "concluida", label: "Concluída" },
                { value: "abandonada", label: "Abandonada" },
              ]} />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowMetaForm(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSaveMeta}>{editingMeta ? "Salvar" : "Criar"}</Button>
            </div>
          </div>
        </Modal>

        {/* Category Management Modal */}
        <Modal isOpen={showCatForm} onClose={() => setShowCatForm(false)} title="Gerenciar Categorias" size="sm">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input label="Nova categoria" value={newCat} onChange={setNewCat} placeholder="Ex: Espiritualidade" />
              <div className="pt-6">
                <Button variant="primary" size="sm" onClick={handleAddCategory} disabled={!newCat.trim()}>Adicionar</Button>
              </div>
            </div>
            <div className="space-y-1">
              {categorias_config.map(cat => (
                <div key={cat} className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border-subtle)]">
                  <span className="font-dm text-sm text-[var(--text-primary)]">{cat}</span>
                  <button onClick={() => handleRemoveCategory(cat)} className="p-1 text-[var(--text-tertiary)] hover:text-[var(--red-text)]">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setShowCatForm(false)}>Fechar</Button>
            </div>
          </div>
        </Modal>

        {/* Reflexao Form */}
        <Modal isOpen={showReflexaoForm} onClose={() => setShowReflexaoForm(false)} title={editingReflexao ? "Editar Reflexão" : "Nova Reflexão"} size="lg">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Tipo" value={reflexaoTipo} onChange={val => setReflexaoTipo(val as TipoReflexao)} options={[
                { value: "semanal", label: "Semanal" },
                { value: "mensal", label: "Mensal" },
              ]} />
              <Input label="Data" type="date" value={reflexaoData} onChange={setReflexaoData} />
            </div>
            <div className="bg-[var(--bg-hover)] rounded-xl p-3 mb-2">
              <p className="font-dm text-xs text-[var(--text-tertiary)]">
                {reflexaoTipo === "semanal"
                  ? "Perguntas-guia: O que aprendi esta semana? O que faria diferente? O que quero focar na próxima semana?"
                  : "Perguntas-guia: Quais objetivos alcancei? O que ficou pendente? Como me senti neste mês? O que quero priorizar no próximo?"
                }
              </p>
            </div>
            <RichEditor content={reflexaoConteudo} onChange={setReflexaoConteudo} placeholder="Escreva sua reflexão..." minHeight="200px" />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowReflexaoForm(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSaveReflexao}>{editingReflexao ? "Salvar" : "Salvar reflexão"}</Button>
            </div>
          </div>
        </Modal>

        {/* Intencoes Form */}
        <Modal isOpen={showIntencoesForm} onClose={() => setShowIntencoesForm(false)} title={`Intenções de ${ano}`} size="md">
          <div className="space-y-3">
            <Textarea label="Fazer mais de... (uma por linha)" value={fazerMais} onChange={setFazerMais} rows={4} />
            <Textarea label="Fazer menos de... (uma por linha)" value={fazerMenos} onChange={setFazerMenos} rows={4} />
            <Textarea label="Regras do ano (uma por linha)" value={regrasAno} onChange={setRegrasAno} rows={4} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowIntencoesForm(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSaveIntencoes}>Salvar</Button>
            </div>
          </div>
        </Modal>
      </div>
    </Shell>
  );
}
