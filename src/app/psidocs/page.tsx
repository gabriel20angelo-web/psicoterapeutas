"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, FileText, Info, ChevronRight, Download, RotateCcw, ClipboardCopy, Check } from "lucide-react";
import Shell from "@/components/Shell";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import { WIZARD, DOCS, CATS, type WizardStep, type DocDef } from "@/lib/psidocs-data";
import { staggerChild, EASE } from "@/lib/animations";
import { useToast } from "@/contexts/ToastContext";
import { getPacientes } from "@/lib/data";
import { loadGeneralNote, saveGeneralNote } from "@/lib/notes";
import { format } from "date-fns";

type Mode = "home" | "wizard" | "form" | "preview";

export default function PsiDocsPage() {
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("home");
  const [wizardHistory, setWizardHistory] = useState<string[]>([]);
  const [currentStepId, setCurrentStepId] = useState("start");
  const [selectedDoc, setSelectedDoc] = useState<DocDef | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [activeCat, setActiveCat] = useState("all");
  const [copied, setCopied] = useState(false);
  const [selectedPacienteId, setSelectedPacienteId] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);

  // ─── WIZARD ───
  const startWizard = () => {
    setMode("wizard");
    setCurrentStepId("start");
    setWizardHistory([]);
  };

  const currentStep: WizardStep | undefined = WIZARD.find(s => s.id === currentStepId);

  const handleWizardOption = (opt: WizardStep["opts"][0]) => {
    if (opt.result) {
      const doc = DOCS.find(d => d.id === opt.result);
      if (doc) openDocForm(doc);
    } else if (opt.next) {
      setWizardHistory(h => [...h, currentStepId]);
      setCurrentStepId(opt.next);
    }
  };

  const wizardBack = () => {
    if (wizardHistory.length === 0) {
      setMode("home");
    } else {
      const prev = wizardHistory[wizardHistory.length - 1];
      setWizardHistory(h => h.slice(0, -1));
      setCurrentStepId(prev);
    }
  };

  // ─── FORM ───
  const openDocForm = (doc: DocDef) => {
    setSelectedDoc(doc);
    setFormValues({});
    setMode("form");
  };

  const setField = (id: string, val: string) => {
    setFormValues(v => ({ ...v, [id]: val }));
  };

  const isFormValid = () => {
    if (!selectedDoc) return false;
    return selectedDoc.fields.some(f => (formValues[f.id] || "").trim() !== "");
  };

  const handlePreview = () => {
    setMode("preview");
  };

  // ─── PREVIEW ───
  const generateText = (): string => {
    if (!selectedDoc) return "";
    const lines: string[] = [];

    const timbre = formValues["timbre"];
    if (timbre) {
      lines.push(timbre.toUpperCase());
      lines.push("");
    }

    lines.push(selectedDoc.title.toUpperCase());
    const subtitulo = formValues["subtitulo"];
    if (subtitulo) lines.push(subtitulo);
    lines.push("");

    for (const field of selectedDoc.fields) {
      if (["timbre", "subtitulo"].includes(field.id)) continue;
      const val = (formValues[field.id] || "").trim();
      if (!val) continue;
      if (field.type === "textarea") {
        lines.push(`${field.label}:`);
        lines.push(val);
        lines.push("");
      } else {
        lines.push(`${field.label}: ${val}`);
      }
    }

    lines.push("");
    lines.push("___________________________________");
    const psiNome = formValues["psiNome"] || "";
    const psiCRP = formValues["psiCRP"] || "";
    if (psiNome || psiCRP) {
      lines.push(`${psiNome}${psiCRP ? ` — ${psiCRP}` : ""}`);
    }

    return lines.join("\n");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateText());
    setCopied(true);
    toast("Texto copiado!", { type: "success" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setMode("home");
    setSelectedDoc(null);
    setFormValues({});
    setWizardHistory([]);
    setCurrentStepId("start");
  };

  // ─── CATALOG TABS ───
  const catTabs = [
    { id: "all", label: "Todos" },
    ...CATS.map(c => ({ id: String(c.id), label: c.label.replace("Documentos ", "").replace("Registros ", "") })),
  ];

  const filteredDocs = activeCat === "all" ? DOCS : DOCS.filter(d => String(d.cat) === activeCat);

  return (
    <Shell>
      <AnimatePresence mode="wait">
        {/* ═══ HOME ═══ */}
        {mode === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {/* Header */}
            <motion.div {...staggerChild(0)} className="mb-6">
              <h1 className="font-fraunces font-bold text-2xl text-ink">PsiDocs</h1>
              <p className="font-dm text-sm text-ink-2 mt-1">
                Documentos psicologicos conforme Resolucoes do CFP
              </p>
            </motion.div>

            {/* Wizard CTA */}
            <motion.div {...staggerChild(1)}>
              <Card hover onClick={startWizard} className="mb-6 border-l-4 border-l-acc">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-acc/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={24} className="text-acc" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-fraunces font-bold text-ink">
                      Nao sabe qual documento usar?
                    </p>
                    <p className="font-dm text-sm text-ink-2">
                      O assistente guia voce ate o documento correto em poucos passos
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-ink-2 flex-shrink-0" />
                </div>
              </Card>
            </motion.div>

            {/* Catalog */}
            <motion.div {...staggerChild(2)} className="mb-4">
              <Tabs tabs={catTabs} active={activeCat} onChange={setActiveCat} layoutId="psidocs-cats" />
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredDocs.map((doc, i) => (
                <motion.div key={doc.id} {...staggerChild(3 + i)}>
                  <Card hover onClick={() => openDocForm(doc)} className="h-full">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{doc.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-fraunces font-bold text-ink">{doc.title}</p>
                        <p className="font-dm text-xs text-ink-2 mt-0.5 line-clamp-2">{doc.desc}</p>
                        <div className="mt-2">
                          <Badge
                            bg="bg-elevated"
                            text="text-ink-2"
                            label={CATS.find(c => c.id === doc.cat)?.label || ""}
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ WIZARD ═══ */}
        {mode === "wizard" && currentStep && (
          <motion.div
            key={`wizard-${currentStepId}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <button
              onClick={wizardBack}
              className="flex items-center gap-1.5 font-dm text-sm text-ink-2 hover:text-ink transition-colors mb-6"
            >
              <ArrowLeft size={16} /> Voltar
            </button>

            <div className="mb-2 flex gap-1.5">
              {Array.from({ length: wizardHistory.length + 1 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all ${
                    i <= wizardHistory.length ? "w-8 bg-acc" : "w-4 bg-elevated"
                  }`}
                />
              ))}
              {Array.from({ length: Math.max(0, 3 - wizardHistory.length - 1) }).map((_, i) => (
                <div key={`r-${i}`} className="h-1 w-4 rounded-full bg-elevated" />
              ))}
            </div>

            <h2 className="font-fraunces font-bold text-xl text-ink mt-4 mb-1">
              {currentStep.q}
            </h2>
            <p className="font-dm text-sm text-ink-2 mb-6">
              {currentStep.sub}
            </p>

            <div className="space-y-3">
              {currentStep.opts.map((opt, i) => (
                <motion.div
                  key={opt.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: EASE }}
                >
                  <Card hover onClick={() => handleWizardOption(opt)}>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl flex-shrink-0">{opt.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-dm font-medium text-ink">{opt.label}</p>
                        <p className="font-dm text-xs text-ink-2 mt-0.5">{opt.desc}</p>
                      </div>
                      <ChevronRight size={16} className="text-ink-2 flex-shrink-0" />
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ FORM ═══ */}
        {mode === "form" && selectedDoc && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 font-dm text-sm text-ink-2 hover:text-ink transition-colors mb-6"
            >
              <ArrowLeft size={16} /> Voltar ao catalogo
            </button>

            <div className="flex items-start gap-3 mb-2">
              <span className="text-3xl">{selectedDoc.icon}</span>
              <div>
                <h2 className="font-fraunces font-bold text-xl text-ink">
                  {selectedDoc.title}
                </h2>
                <p className="font-dm text-sm text-ink-2">{selectedDoc.desc}</p>
              </div>
            </div>

            {/* Legal note */}
            <Card className="mb-6 bg-acc/[.04] dark:bg-acc/[.06] border-acc/20">
              <div className="flex gap-3">
                <Info size={16} className="text-acc flex-shrink-0 mt-0.5" />
                <div className="font-dm text-xs text-ink-2 space-y-1">
                  <p><span className="font-semibold text-ink">Uso:</span> {selectedDoc.note.uso}</p>
                  <p><span className="font-semibold text-ink">Destinatario:</span> {selectedDoc.note.quem}</p>
                  <p><span className="font-semibold text-red-500">Vedacao:</span> {selectedDoc.note.veda}</p>
                  <p><span className="font-semibold text-acc">Base legal:</span> {selectedDoc.note.base}</p>
                </div>
              </div>
            </Card>

            {/* Fields */}
            <div className="space-y-4 mb-6">
              {selectedDoc.fields.map(field => {
                if (field.type === "textarea") {
                  return (
                    <Textarea
                      key={field.id}
                      id={field.id}
                      label={field.label}
                      value={formValues[field.id] || ""}
                      onChange={val => setField(field.id, val)}
                      placeholder={field.ph}
                      rows={4}
                    />
                  );
                }
                if (field.type === "select" && field.opts) {
                  return (
                    <Select
                      key={field.id}
                      id={field.id}
                      label={field.label}
                      value={formValues[field.id] || ""}
                      onChange={val => setField(field.id, val)}
                      options={[
                        { value: "", label: "Selecione..." },
                        ...field.opts.map(o => ({ value: o, label: o })),
                      ]}
                    />
                  );
                }
                return (
                  <Input
                    key={field.id}
                    id={field.id}
                    label={field.label}
                    value={formValues[field.id] || ""}
                    onChange={val => setField(field.id, val)}
                    placeholder={field.ph}
                  />
                );
              })}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={handleReset}>Cancelar</Button>
              <Button onClick={handlePreview} disabled={!isFormValid()}>
                Gerar documento
              </Button>
            </div>
          </motion.div>
        )}

        {/* ═══ PREVIEW ═══ */}
        {mode === "preview" && selectedDoc && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <button
              onClick={() => setMode("form")}
              className="flex items-center gap-1.5 font-dm text-sm text-ink-2 hover:text-ink transition-colors mb-6"
            >
              <ArrowLeft size={16} /> Editar campos
            </button>

            <h2 className="font-fraunces font-bold text-xl text-ink mb-4">
              Pre-visualizacao
            </h2>

            <Card className="mb-6">
              <div
                ref={previewRef}
                className="font-dm text-sm text-ink whitespace-pre-wrap leading-relaxed"
              >
                {generateText()}
              </div>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCopy} icon={copied ? <Check size={16} /> : <ClipboardCopy size={16} />}>
                {copied ? "Copiado!" : "Copiar texto"}
              </Button>
              <Button variant="secondary" onClick={() => setMode("form")} icon={<ArrowLeft size={16} />}>
                Editar
              </Button>
              <Button variant="ghost" onClick={handleReset} icon={<RotateCcw size={16} />}>
                Novo documento
              </Button>
            </div>

            {/* Vincular ao paciente (opcional) */}
            <Card className="mt-6">
              <p className="font-fraunces font-bold text-sm text-ink mb-3">Vincular ao paciente</p>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Select
                    id="vincular-paciente"
                    label=""
                    value={selectedPacienteId}
                    onChange={val => setSelectedPacienteId(val)}
                    options={[
                      { value: "", label: "Selecione um paciente..." },
                      ...getPacientes().map(p => ({ value: p.id, label: p.nome })),
                    ]}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!selectedPacienteId}
                  onClick={() => {
                    if (!selectedPacienteId || !selectedDoc) return;
                    const pacientes = getPacientes();
                    const pac = pacientes.find(p => p.id === selectedPacienteId);
                    const currentNote = loadGeneralNote(selectedPacienteId);
                    const docRef = `\n\n--- Documento gerado em ${format(new Date(), "dd/MM/yyyy")} ---\nTipo: ${selectedDoc.title}\n${generateText().slice(0, 200)}...`;
                    saveGeneralNote(selectedPacienteId, currentNote + docRef);
                    toast(`Documento vinculado ao prontuário de ${pac?.nome || "paciente"}`, { type: "success" });
                    setSelectedPacienteId("");
                  }}
                >
                  Vincular
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}
