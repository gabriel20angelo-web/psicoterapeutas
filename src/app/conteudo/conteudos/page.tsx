"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutList, Columns3, Plus, Search, Filter,
  Calendar, ChevronDown, Megaphone, X,
  Lightbulb, ArrowRight, FileText, Clapperboard,
  Video, Scissors, CheckCircle, Send, Archive,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Shell from "@/components/Shell";
import UsinaNav from "@/components/usina/UsinaNav";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Tabs from "@/components/ui/Tabs";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/contexts/ToastContext";
import {
  getConteudos, createConteudo, updateConteudo,
  getRedesSociais, getEditorias, getConteudoRedes,
  getEditoria, getRedeSocial,
  STATUS_CONFIG, PIPELINE_ORDER, FUNIL_CONFIG,
  type Conteudo, type StatusConteudo, type Funil,
  type RedeSocial, type Editoria, type ConteudoRede,
} from "@/lib/usina-data";
import { fadeUp, staggerChild } from "@/lib/animations";

// ─── Icon map for statuses ───
const STATUS_ICONS: Record<string, LucideIcon> = {
  lightbulb: Lightbulb,
  "arrow-right": ArrowRight,
  "file-text": FileText,
  clapperboard: Clapperboard,
  video: Video,
  scissors: Scissors,
  "check-circle": CheckCircle,
  send: Send,
  archive: Archive,
};

// ─── View modes ───
type ViewMode = "lista" | "kanban";

const VIEW_TABS = [
  { id: "lista", label: "Lista" },
  { id: "kanban", label: "Kanban" },
];

// ─── Create modal form state ───
interface CreateForm {
  titulo: string;
  descricao: string;
  status: StatusConteudo;
  editoria_id: string;
  funil: Funil | "";
  data_planejada: string;
  emoji_marcador: string;
  is_publi: boolean;
  parceiro_publi: string;
}

const INITIAL_FORM: CreateForm = {
  titulo: "",
  descricao: "",
  status: "caixa_de_ideias",
  editoria_id: "",
  funil: "",
  data_planejada: "",
  emoji_marcador: "",
  is_publi: false,
  parceiro_publi: "",
};

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function ConteudosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // ─── Data ───
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [redes, setRedes] = useState<RedeSocial[]>([]);
  const [editorias, setEditorias] = useState<Editoria[]>([]);
  const [conteudoRedes, setConteudoRedes] = useState<ConteudoRede[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // ─── Filters ───
  const [view, setView] = useState<ViewMode>("lista");
  const [filterRede, setFilterRede] = useState<string>("todas");
  const [filterEditoria, setFilterEditoria] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterFunil, setFilterFunil] = useState<string>("");
  const [filterPubli, setFilterPubli] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ─── Modal ───
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(INITIAL_FORM);

  // ─── Read URL params ───
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam && Object.keys(STATUS_CONFIG).includes(statusParam)) {
      setFilterStatus(statusParam);
    }
  }, [searchParams]);

  // ─── Load data ───
  useEffect(() => {
    setRedes(getRedesSociais());
    setEditorias(getEditorias());
    setConteudoRedes(getConteudoRedes());
  }, [refreshKey]);

  // ─── Filtered conteudos ───
  const filteredConteudos = useMemo(() => {
    const filters: Parameters<typeof getConteudos>[0] = {};
    if (filterStatus) filters.status = filterStatus as StatusConteudo;
    if (filterEditoria) filters.editoria_id = filterEditoria;
    if (filterFunil) filters.funil = filterFunil as Funil;
    if (filterPubli) filters.is_publi = true;
    if (filterRede !== "todas") filters.rede_social_id = filterRede;
    if (searchQuery) filters.search = searchQuery;
    return getConteudos(filters);
  }, [filterStatus, filterEditoria, filterFunil, filterPubli, filterRede, searchQuery, refreshKey]);

  // ─── Helpers ───
  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const getRedesForConteudo = useCallback(
    (conteudoId: string) => {
      return conteudoRedes
        .filter((cr) => cr.conteudo_id === conteudoId)
        .map((cr) => {
          const rede = redes.find((r) => r.id === cr.rede_social_id);
          return rede ? { ...cr, rede } : null;
        })
        .filter(Boolean) as (ConteudoRede & { rede: RedeSocial })[];
    },
    [conteudoRedes, redes]
  );

  const handleCreate = () => {
    if (!form.titulo.trim()) return;
    createConteudo({
      titulo: form.titulo,
      descricao: form.descricao,
      status: form.status,
      editoria_id: form.editoria_id || null,
      funil: (form.funil as Funil) || null,
      data_planejada: form.data_planejada || null,
      emoji_marcador: form.emoji_marcador || null,
      is_publi: form.is_publi,
      parceiro_publi: form.is_publi ? form.parceiro_publi || null : null,
    });
    setForm(INITIAL_FORM);
    setCreateOpen(false);
    refresh();
    toast("Conteúdo criado", { type: "success" });
  };

  const handleStatusChange = (id: string, newStatus: StatusConteudo) => {
    updateConteudo(id, { status: newStatus });
    refresh();
    toast("Status atualizado", { type: "success" });
  };

  const clearFilters = () => {
    setFilterRede("todas");
    setFilterEditoria("");
    setFilterStatus("");
    setFilterFunil("");
    setFilterPubli(false);
    setSearchQuery("");
  };

  const hasActiveFilters =
    filterRede !== "todas" || filterEditoria || filterStatus || filterFunil || filterPubli || searchQuery;

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <Shell>
      {/* ─── Header ─── */}
      <motion.div {...fadeUp()} className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--orange-glow)] flex items-center justify-center border border-[var(--border-subtle)]">
              <LayoutList size={20} className="text-[var(--orange-500)]" />
            </div>
            <div>
              <h1 className="font-fraunces font-bold text-2xl md:text-3xl">Conteudos</h1>
              <p className="font-dm text-sm text-[var(--text-secondary)] mt-0.5">
                Central de conteudo da Usina. Visualize, filtre e gerencie.
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} icon={<Plus size={16} />}>
            Novo Conteudo
          </Button>
        </div>
      </motion.div>

      <UsinaNav />

      {/* ─── Top Bar: View Tabs + Search + Filter Toggle ─── */}
      <motion.div {...fadeUp(0.05)} className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          tabs={VIEW_TABS}
          active={view}
          onChange={(id) => setView(id as ViewMode)}
          layoutId="conteudos-view"
        />
        <div className="flex-1 min-w-[200px] max-w-sm relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
          />
          <input
            type="text"
            placeholder="Buscar conteúdo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl font-dm text-sm bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-dm text-sm font-medium border transition-all ${
            showFilters || hasActiveFilters
              ? "bg-[var(--orange-glow)] border-[var(--orange-500)]/30 text-[var(--orange-500)]"
              : "bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Filter size={14} />
          Filtros
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-[var(--orange-500)]" />
          )}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg font-dm text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={12} />
            Limpar
          </button>
        )}
      </motion.div>

      {/* ─── Social Network Sub-tabs (in filters) ─── */}
      {showFilters && redes.filter(r => r.ativa).length > 0 && (
      <motion.div {...fadeUp(0.08)} className="mb-4 flex flex-wrap gap-2">
        {redes
          .filter((r) => r.ativa)
          .map((rede) => (
            <button
              key={rede.id}
              onClick={() => setFilterRede(rede.id === filterRede ? "todas" : rede.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-dm text-xs font-semibold border transition-all ${
                filterRede === rede.id
                  ? "border-transparent text-white"
                  : "bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
              }`}
              style={
                filterRede === rede.id
                  ? { backgroundColor: rede.cor }
                  : undefined
              }
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: rede.cor }}
              />
              {rede.nome}
            </button>
          ))}
      </motion.div>
      )}

      {/* ─── Expanded Filters ─── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <Select
                label="Status"
                value={filterStatus}
                onChange={setFilterStatus}
                options={[
                  { value: "", label: "Todos" },
                  ...PIPELINE_ORDER.map((s) => ({
                    value: s,
                    label: STATUS_CONFIG[s].label,
                  })),
                  { value: "arquivado", label: "Arquivado" },
                ]}
                className="min-w-[160px]"
              />
              <Select
                label="Editoria"
                value={filterEditoria}
                onChange={setFilterEditoria}
                options={[
                  { value: "", label: "Todas" },
                  ...editorias.map((e) => ({ value: e.id, label: e.nome })),
                ]}
                className="min-w-[140px]"
              />
              <Select
                label="Funil"
                value={filterFunil}
                onChange={setFilterFunil}
                options={[
                  { value: "", label: "Todos" },
                  { value: "topo", label: "Topo" },
                  { value: "meio", label: "Meio" },
                  { value: "fundo", label: "Fundo" },
                ]}
                className="min-w-[120px]"
              />
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 cursor-pointer py-2.5">
                  <input
                    type="checkbox"
                    checked={filterPubli}
                    onChange={(e) => setFilterPubli(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-strong)] accent-[var(--orange-500)]"
                  />
                  <span className="font-dm text-sm text-[var(--text-secondary)]">
                    Apenas publis
                  </span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Content Area ─── */}
      {filteredConteudos.length === 0 ? (
        <motion.div {...fadeUp(0.1)}>
          <EmptyState
            icon={<LayoutList size={32} />}
            message={
              hasActiveFilters
                ? "Nenhum conteúdo encontrado com esses filtros."
                : "Nenhum conteúdo ainda. Crie o primeiro!"
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : (
                <Button size="sm" onClick={() => setCreateOpen(true)} icon={<Plus size={14} />}>
                  Novo Conteudo
                </Button>
              )
            }
          />
        </motion.div>
      ) : view === "lista" ? (
        <ListView
          conteudos={filteredConteudos}
          editorias={editorias}
          getRedesForConteudo={getRedesForConteudo}
          onNavigate={(id) => router.push(`/conteudo/conteudos/${id}`)}
        />
      ) : (
        <KanbanView
          conteudos={filteredConteudos}
          editorias={editorias}
          getRedesForConteudo={getRedesForConteudo}
          onStatusChange={handleStatusChange}
          onNavigate={(id) => router.push(`/conteudo/conteudos/${id}`)}
        />
      )}

      {/* ─── Create Modal ─── */}
      <CreateModal
        isOpen={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setForm(INITIAL_FORM);
        }}
        form={form}
        setForm={setForm}
        editorias={editorias}
        onCreate={handleCreate}
      />
    </Shell>
  );
}

// ═══════════════════════════════════════════════════
// LIST VIEW
// ═══════════════════════════════════════════════════
function ListView({
  conteudos,
  editorias,
  getRedesForConteudo,
  onNavigate,
}: {
  conteudos: Conteudo[];
  editorias: Editoria[];
  getRedesForConteudo: (id: string) => (ConteudoRede & { rede: RedeSocial })[];
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {conteudos.map((conteudo, i) => {
        const statusCfg = STATUS_CONFIG[conteudo.status];
        const editoria = conteudo.editoria_id
          ? editorias.find((e) => e.id === conteudo.editoria_id)
          : null;
        const redesList = getRedesForConteudo(conteudo.id);
        const funilCfg = conteudo.funil ? FUNIL_CONFIG[conteudo.funil] : null;
        const IconComp = STATUS_ICONS[statusCfg.icon];

        return (
          <motion.div key={conteudo.id} {...staggerChild(i, 0.05)}>
            <Card hover onClick={() => onNavigate(conteudo.id)} className="!p-4">
              <div className="flex items-start gap-3">
                {/* Emoji marker */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-lg"
                  style={{ background: statusCfg.bg }}
                >
                  {conteudo.emoji_marcador || (IconComp ? <IconComp size={16} style={{ color: statusCfg.cor }} /> : null)}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-fraunces font-semibold text-sm text-[var(--text-primary)] truncate">
                      {conteudo.titulo}
                    </h3>
                    {conteudo.is_publi && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-dm font-bold uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/20">
                        <Megaphone size={10} />
                        Publi
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status badge */}
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-dm text-[11px] font-semibold"
                      style={{ background: statusCfg.bg, color: statusCfg.cor }}
                    >
                      {IconComp && <IconComp size={11} />}
                      {statusCfg.label}
                    </span>

                    {/* Editoria */}
                    {editoria && (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-dm text-[11px] font-semibold"
                        style={{
                          background: `${editoria.cor}18`,
                          color: editoria.cor,
                        }}
                      >
                        {editoria.nome}
                      </span>
                    )}

                    {/* Funil */}
                    {funilCfg && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full font-dm text-[11px] font-semibold"
                        style={{
                          background: `${funilCfg.cor}18`,
                          color: funilCfg.cor,
                        }}
                      >
                        {funilCfg.label}
                      </span>
                    )}

                    {/* Social network chips */}
                    {redesList.length > 0 && (
                      <div className="flex items-center gap-1">
                        {redesList.map((cr) => (
                          <span
                            key={cr.id}
                            title={cr.rede.nome}
                            className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: cr.rede.cor }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Date */}
                    {conteudo.data_planejada && (
                      <span className="inline-flex items-center gap-1 font-dm text-[11px] text-[var(--text-tertiary)]">
                        <Calendar size={11} />
                        {formatDate(conteudo.data_planejada)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// KANBAN VIEW
// ═══════════════════════════════════════════════════
function KanbanView({
  conteudos,
  editorias,
  getRedesForConteudo,
  onStatusChange,
  onNavigate,
}: {
  conteudos: Conteudo[];
  editorias: Editoria[];
  getRedesForConteudo: (id: string) => (ConteudoRede & { rede: RedeSocial })[];
  onStatusChange: (id: string, status: StatusConteudo) => void;
  onNavigate: (id: string) => void;
}) {
  const columns = PIPELINE_ORDER.map((status) => ({
    status,
    config: STATUS_CONFIG[status],
    items: conteudos.filter((c) => c.status === status),
  }));

  return (
    <motion.div {...fadeUp(0.1)} className="overflow-x-auto pb-4 -mx-2">
      <div className="flex gap-3 min-w-max px-2">
        {columns.map((col) => {
          const IconComp = STATUS_ICONS[col.config.icon];
          return (
            <div
              key={col.status}
              className="w-[260px] shrink-0 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] flex flex-col"
            >
              {/* Column header */}
              <div className="px-3 py-2.5 border-b border-[var(--border-subtle)] flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: col.config.bg }}
                >
                  {IconComp && <IconComp size={13} style={{ color: col.config.cor }} />}
                </span>
                <span className="font-dm text-xs font-semibold text-[var(--text-primary)]">
                  {col.config.label}
                </span>
                <span className="ml-auto font-dm text-[11px] text-[var(--text-tertiary)] tabular-nums">
                  {col.items.length}
                </span>
              </div>

              {/* Column cards */}
              <div className="p-2 flex flex-col gap-2 flex-1 min-h-[80px]">
                {col.items.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="font-dm text-[11px] text-[var(--text-tertiary)]">
                      Vazio
                    </p>
                  </div>
                ) : (
                  col.items.map((conteudo) => {
                    const redesList = getRedesForConteudo(conteudo.id);
                    return (
                      <KanbanCard
                        key={conteudo.id}
                        conteudo={conteudo}
                        redesList={redesList}
                        onStatusChange={onStatusChange}
                        onNavigate={onNavigate}
                      />
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Kanban Card ───
function KanbanCard({
  conteudo,
  redesList,
  onStatusChange,
  onNavigate,
}: {
  conteudo: Conteudo;
  redesList: (ConteudoRede & { rede: RedeSocial })[];
  onStatusChange: (id: string, status: StatusConteudo) => void;
  onNavigate: (id: string) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div
      className="relative rounded-lg bg-[var(--bg-card-elevated)] border border-[var(--border-subtle)] p-2.5 cursor-pointer hover:border-[var(--border-strong)] transition-colors group"
      onClick={() => onNavigate(conteudo.id)}
    >
      {/* Title */}
      <div className="flex items-start gap-2 mb-2">
        {conteudo.emoji_marcador && (
          <span className="text-sm leading-none mt-0.5">{conteudo.emoji_marcador}</span>
        )}
        <h4 className="font-fraunces text-xs font-semibold text-[var(--text-primary)] leading-tight line-clamp-2 flex-1">
          {conteudo.titulo}
        </h4>
      </div>

      {/* Bottom row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Social dots */}
        {redesList.map((cr) => (
          <span
            key={cr.id}
            title={cr.rede.nome}
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: cr.rede.cor }}
          />
        ))}

        {conteudo.data_planejada && (
          <span className="font-dm text-[10px] text-[var(--text-tertiary)] ml-auto">
            {formatDate(conteudo.data_planejada)}
          </span>
        )}

        {conteudo.is_publi && (
          <Megaphone size={10} className="text-amber-500 shrink-0" />
        )}
      </div>

      {/* Status dropdown trigger */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDropdownOpen(!dropdownOpen);
        }}
        className="absolute top-1.5 right-1.5 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-hover)] transition-all"
        aria-label="Mudar status"
      >
        <ChevronDown size={12} className="text-[var(--text-tertiary)]" />
      </button>

      {/* Status dropdown */}
      <AnimatePresence>
        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-7 right-0 z-40 w-48 py-1 rounded-xl bg-[var(--bg-card-elevated)] border border-[var(--border-default)] shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {PIPELINE_ORDER.map((s) => {
                const cfg = STATUS_CONFIG[s];
                const Icon = STATUS_ICONS[cfg.icon];
                const isActive = conteudo.status === s;
                return (
                  <button
                    key={s}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(conteudo.id, s);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 font-dm text-xs text-left transition-colors ${
                      isActive
                        ? "bg-[var(--bg-hover)] text-[var(--text-primary)] font-semibold"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {Icon && <Icon size={12} style={{ color: cfg.cor }} />}
                    {cfg.label}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// CREATE MODAL
// ═══════════════════════════════════════════════════
function CreateModal({
  isOpen,
  onClose,
  form,
  setForm,
  editorias,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  form: CreateForm;
  setForm: React.Dispatch<React.SetStateAction<CreateForm>>;
  editorias: Editoria[];
  onCreate: () => void;
}) {
  const update = <K extends keyof CreateForm>(key: K, val: CreateForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Conteúdo" size="lg">
      <div className="flex flex-col gap-4">
        <Input
          label="Titulo"
          value={form.titulo}
          onChange={(val) => update("titulo", val)}
          placeholder="Nome do conteúdo"
          required
        />

        <div>
          <label className="block font-dm text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Descrição
          </label>
          <textarea
            value={form.descricao}
            onChange={(e) => update("descricao", e.target.value)}
            placeholder="Breve descrição do conteúdo..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl font-dm text-sm bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] outline-none focus:border-[var(--orange-500)] transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Status"
            value={form.status}
            onChange={(val) => update("status", val as StatusConteudo)}
            options={PIPELINE_ORDER.map((s) => ({
              value: s,
              label: STATUS_CONFIG[s].label,
            }))}
          />

          <Select
            label="Editoria"
            value={form.editoria_id}
            onChange={(val) => update("editoria_id", val)}
            options={[
              { value: "", label: "Nenhuma" },
              ...editorias.map((e) => ({ value: e.id, label: e.nome })),
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Funil"
            value={form.funil}
            onChange={(val) => update("funil", val as Funil | "")}
            options={[
              { value: "", label: "Nenhum" },
              { value: "topo", label: "Topo" },
              { value: "meio", label: "Meio" },
              { value: "fundo", label: "Fundo" },
            ]}
          />

          <Input
            label="Data planejada"
            type="date"
            value={form.data_planejada}
            onChange={(val) => update("data_planejada", val)}
          />
        </div>

        <Input
          label="Emoji marcador"
          value={form.emoji_marcador}
          onChange={(val) => update("emoji_marcador", val)}
          placeholder="Ex: 🔥"
        />

        {/* Publi toggle */}
        <div className="flex flex-col gap-2">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_publi}
              onChange={(e) => update("is_publi", e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border-strong)] accent-[var(--orange-500)]"
            />
            <span className="font-dm text-sm text-[var(--text-secondary)]">
              Conteudo publicitario (publi)
            </span>
          </label>

          <AnimatePresence>
            {form.is_publi && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <Input
                  label="Parceiro / marca"
                  value={form.parceiro_publi}
                  onChange={(val) => update("parceiro_publi", val)}
                  placeholder="Nome do parceiro"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onCreate} disabled={!form.titulo.trim()} icon={<Plus size={14} />}>
            Criar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Utility ───
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}
