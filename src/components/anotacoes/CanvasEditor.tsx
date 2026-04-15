"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Save, Link2, ZoomIn, ZoomOut, Maximize,
  Upload, Download, FileText, ExternalLink, Type, FolderOpen,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { getPaciente } from "@/lib/data";

// ═══════════════════════════════════════════════════
// JSON Canvas spec (Obsidian .canvas files)
//
// Reference: https://jsoncanvas.org/
//
// O editor preserva o formato do Obsidian integralmente: nós do tipo
// `text`, `file`, `link` e `group`, edges com `fromSide`/`toSide`,
// `label`, `fromEnd`/`toEnd` (arrow direction) e cores hex ou índice
// "1".."6". Import/export produzem arquivos 100% compatíveis.
// ═══════════════════════════════════════════════════

type Side = "top" | "right" | "bottom" | "left";
type EdgeEnd = "none" | "arrow";
type CanvasColor = string; // "1".."6" ou "#rrggbb"

interface NodeBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: CanvasColor;
}

interface TextNode extends NodeBase { type: "text"; text: string; }
interface FileNode extends NodeBase { type: "file"; file: string; subpath?: string; }
interface LinkNode extends NodeBase { type: "link"; url: string; }
interface GroupNode extends NodeBase { type: "group"; label?: string; background?: string; backgroundStyle?: "cover" | "ratio" | "repeat"; }

type CanvasNode = TextNode | FileNode | LinkNode | GroupNode;

interface CanvasEdge {
  id: string;
  fromNode: string;
  fromSide?: Side;
  fromEnd?: EdgeEnd;
  toNode: string;
  toSide?: Side;
  toEnd?: EdgeEnd;
  color?: CanvasColor;
  label?: string;
}

interface CanvasViewport { x: number; y: number; zoom: number; }

// Formato JSON Canvas (o arquivo em si). Viewport NÃO é parte do spec,
// mas armazenamos à parte para restaurar zoom/pan do usuário.
interface ObsidianCanvasFile {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

interface CanvasDoc {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: CanvasViewport;
}

// ─── Cores ──────────────────────────────────────────
// JSON Canvas define cores por índice "1".."6" (Obsidian mapping).
// Para exibição nós temos que resolver para valores visuais.
// "1" = vermelho, "2" = laranja, "3" = amarelo, "4" = verde, "5" = ciano, "6" = roxo
// (conforme o Obsidian renderiza)

const OBSIDIAN_PALETTE: Record<string, { bg: string; darkBg: string; border: string; darkBorder: string; label: string }> = {
  "1": { bg: "#FEE2E2", darkBg: "#450A0A", border: "#FCA5A5", darkBorder: "#991B1B", label: "Vermelho" },
  "2": { bg: "#FFEDD5", darkBg: "#431407", border: "#FDBA74", darkBorder: "#9A3412", label: "Laranja" },
  "3": { bg: "#FEF9C3", darkBg: "#422006", border: "#FDE047", darkBorder: "#854D0E", label: "Amarelo" },
  "4": { bg: "#DCFCE7", darkBg: "#14532D", border: "#86EFAC", darkBorder: "#166534", label: "Verde" },
  "5": { bg: "#CFFAFE", darkBg: "#164E63", border: "#67E8F9", darkBorder: "#155E75", label: "Ciano" },
  "6": { bg: "#F3E8FF", darkBg: "#3B0764", border: "#D8B4FE", darkBorder: "#6B21A8", label: "Roxo" },
};
const DEFAULT_COLOR_VISUAL = { bg: "#FFFFFF", darkBg: "#1F2937", border: "#E5E7EB", darkBorder: "#374151", label: "Neutro" };

function resolveColor(color: CanvasColor | undefined, dark: boolean): { bg: string; border: string } {
  if (!color) return { bg: dark ? DEFAULT_COLOR_VISUAL.darkBg : DEFAULT_COLOR_VISUAL.bg, border: dark ? DEFAULT_COLOR_VISUAL.darkBorder : DEFAULT_COLOR_VISUAL.border };
  if (color.startsWith("#")) {
    // Custom hex — usa o hex puro e border com 60% de opacidade
    return { bg: dark ? darken(color, 0.6) : lighten(color, 0.88), border: color };
  }
  const p = OBSIDIAN_PALETTE[color];
  if (p) return { bg: dark ? p.darkBg : p.bg, border: dark ? p.darkBorder : p.border };
  return { bg: dark ? DEFAULT_COLOR_VISUAL.darkBg : DEFAULT_COLOR_VISUAL.bg, border: dark ? DEFAULT_COLOR_VISUAL.darkBorder : DEFAULT_COLOR_VISUAL.border };
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const nr = Math.round(r + (255 - r) * amount);
  const ng = Math.round(g + (255 - g) * amount);
  const nb = Math.round(b + (255 - b) * amount);
  return rgbToHex(nr, ng, nb);
}
function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(Math.round(r * (1 - amount)), Math.round(g * (1 - amount)), Math.round(b * (1 - amount)));
}
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace("#", "");
  const full = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}
function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// ─── Constants ──────────────────────────────────────

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const GRID_SIZE = 20;
const DEFAULT_TEXT_WIDTH = 260;
const DEFAULT_TEXT_HEIGHT = 120;
const DEFAULT_FILE_WIDTH = 400;
const DEFAULT_FILE_HEIGHT = 400;
const DEFAULT_LINK_WIDTH = 400;
const DEFAULT_LINK_HEIGHT = 260;
const DEFAULT_GROUP_WIDTH = 500;
const DEFAULT_GROUP_HEIGHT = 400;

const EMPTY_CANVAS: CanvasDoc = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };

const AVAILABLE_COLORS: CanvasColor[] = ["", "1", "2", "3", "4", "5", "6"];

// ─── Persistência ───────────────────────────────────

function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI;
}

function sanitizeName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

async function getCanvasPath(pacienteId: string, storageKey?: string): Promise<string | null> {
  if (!isElectron()) return null;
  const paciente = getPaciente(pacienteId);
  if (!paciente) return null;
  const vaultPath = await window.electronAPI!.vault.getPath();
  const fileName = storageKey ? `${storageKey}.canvas` : "Canvas.canvas";
  return `${vaultPath}/${sanitizeName(paciente.nome)}/${fileName}`;
}

function getLocalKey(pacienteId: string, storageKey?: string): string {
  return storageKey
    ? `allos-canvas-${pacienteId}-${storageKey}`
    : `allos-canvas-${pacienteId}`;
}

async function loadCanvasAsync(pacienteId: string, storageKey?: string): Promise<CanvasDoc> {
  // Tenta Electron primeiro (Obsidian vault)
  if (isElectron()) {
    const filePath = await getCanvasPath(pacienteId, storageKey);
    if (filePath) {
      try {
        const raw = await window.electronAPI!.fs.readFile(filePath);
        if (raw) {
          const parsed = JSON.parse(raw);
          return normalizeCanvasDoc(parsed);
        }
      } catch {}
    }
  }
  // Fallback: localStorage
  const key = getLocalKey(pacienteId, storageKey);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...EMPTY_CANVAS };
    const parsed = JSON.parse(raw);
    return normalizeCanvasDoc(parsed);
  } catch {
    return { ...EMPTY_CANVAS };
  }
}

/**
 * Normaliza um JSON recebido (de arquivo Obsidian ou localStorage legacy)
 * para o formato CanvasDoc interno. Aceita tanto o spec oficial quanto
 * formatos legados do app antigo.
 */
function normalizeCanvasDoc(parsed: any): CanvasDoc {
  if (!parsed || typeof parsed !== "object") return { ...EMPTY_CANVAS };

  const viewport: CanvasViewport =
    parsed.viewport && typeof parsed.viewport === "object"
      ? { x: parsed.viewport.x || 0, y: parsed.viewport.y || 0, zoom: parsed.viewport.zoom || 1 }
      : { x: 0, y: 0, zoom: 1 };

  // Legacy: formato antigo do app com { blocks, connections }
  if (Array.isArray(parsed.blocks)) {
    return {
      nodes: parsed.blocks.map((b: any): TextNode => ({
        id: String(b.id),
        type: "text",
        x: Number(b.x) || 0,
        y: Number(b.y) || 0,
        width: Number(b.width) || DEFAULT_TEXT_WIDTH,
        height: Number(b.height) || DEFAULT_TEXT_HEIGHT,
        text: String(b.content || ""),
        color: typeof b.color === "number" && b.color > 0 ? String(b.color) : undefined,
      })),
      edges: (parsed.connections || []).map((c: any): CanvasEdge => ({
        id: String(c.id),
        fromNode: String(c.from),
        toNode: String(c.to),
      })),
      viewport,
    };
  }

  // Legacy intermediário: nodes com type "text" e campo "content" (versão anterior do app)
  const rawNodes: any[] = Array.isArray(parsed.nodes) ? parsed.nodes : [];
  const nodes: CanvasNode[] = rawNodes.map((n): CanvasNode => {
    const base = {
      id: String(n.id),
      x: Number(n.x) || 0,
      y: Number(n.y) || 0,
      width: Number(n.width) || DEFAULT_TEXT_WIDTH,
      height: Number(n.height) || DEFAULT_TEXT_HEIGHT,
      color: typeof n.color === "string" ? n.color : typeof n.color === "number" && n.color > 0 ? String(n.color) : undefined,
    };
    const type = n.type;
    if (type === "file") {
      return { ...base, type: "file", file: String(n.file || ""), subpath: n.subpath ? String(n.subpath) : undefined };
    }
    if (type === "link") {
      return { ...base, type: "link", url: String(n.url || "") };
    }
    if (type === "group") {
      return {
        ...base,
        type: "group",
        label: n.label ? String(n.label) : undefined,
        background: n.background ? String(n.background) : undefined,
        backgroundStyle: n.backgroundStyle,
      };
    }
    // text node (ou content legacy)
    const text = typeof n.text === "string" ? n.text : typeof n.content === "string" ? n.content : "";
    return { ...base, type: "text", text };
  });

  const rawEdges: any[] = Array.isArray(parsed.edges) ? parsed.edges : [];
  const edges: CanvasEdge[] = rawEdges.map((e): CanvasEdge => ({
    id: String(e.id),
    fromNode: String(e.fromNode || e.from || ""),
    fromSide: normalizeSide(e.fromSide),
    fromEnd: e.fromEnd === "arrow" || e.fromEnd === "none" ? e.fromEnd : undefined,
    toNode: String(e.toNode || e.to || ""),
    toSide: normalizeSide(e.toSide),
    toEnd: e.toEnd === "arrow" || e.toEnd === "none" ? e.toEnd : undefined,
    color: typeof e.color === "string" ? e.color : undefined,
    label: e.label ? String(e.label) : undefined,
  }));

  return { nodes, edges, viewport };
}

function normalizeSide(s: any): Side | undefined {
  if (s === "top" || s === "right" || s === "bottom" || s === "left") return s;
  return undefined;
}

async function saveCanvasAsync(pacienteId: string, data: CanvasDoc, storageKey?: string): Promise<void> {
  // Gera o conteúdo JSON Canvas (spec puro, sem viewport interno)
  const obsidianData: ObsidianCanvasFile = {
    nodes: data.nodes,
    edges: data.edges,
  };

  if (isElectron()) {
    const filePath = await getCanvasPath(pacienteId, storageKey);
    if (filePath) {
      try {
        await window.electronAPI!.fs.writeFile(filePath, JSON.stringify(obsidianData, null, "\t"));
      } catch {}
    }
  }

  // Sempre salva também em localStorage com viewport (fallback + restaurar zoom)
  const key = getLocalKey(pacienteId, storageKey);
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

// ─── Edge geometry ──────────────────────────────────

function getSideCoord(node: CanvasNode, side: Side): { x: number; y: number } {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  switch (side) {
    case "top": return { x: cx, y: node.y };
    case "right": return { x: node.x + node.width, y: cy };
    case "bottom": return { x: cx, y: node.y + node.height };
    case "left": return { x: node.x, y: cy };
  }
}

function inferSide(from: CanvasNode, to: CanvasNode): Side {
  const dx = (to.x + to.width / 2) - (from.x + from.width / 2);
  const dy = (to.y + to.height / 2) - (from.y + from.height / 2);
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right" : "left";
  }
  return dy > 0 ? "bottom" : "top";
}

function oppositeSide(s: Side): Side {
  return s === "top" ? "bottom" : s === "bottom" ? "top" : s === "left" ? "right" : "left";
}

function getEdgePath(
  from: CanvasNode,
  to: CanvasNode,
  fromSide: Side,
  toSide: Side
): string {
  const fp = getSideCoord(from, fromSide);
  const tp = getSideCoord(to, toSide);
  const dx = tp.x - fp.x;
  const dy = tp.y - fp.y;

  // Control point offsets baseados no lado
  const fromOffset = (fromSide === "left" || fromSide === "right")
    ? { x: Math.abs(dx) * 0.5 * (fromSide === "right" ? 1 : -1), y: 0 }
    : { x: 0, y: Math.abs(dy) * 0.5 * (fromSide === "bottom" ? 1 : -1) };
  const toOffset = (toSide === "left" || toSide === "right")
    ? { x: Math.abs(dx) * 0.5 * (toSide === "right" ? 1 : -1), y: 0 }
    : { x: 0, y: Math.abs(dy) * 0.5 * (toSide === "bottom" ? 1 : -1) };

  const cp1 = { x: fp.x + Math.min(Math.abs(fromOffset.x), 200) * Math.sign(fromOffset.x || 1), y: fp.y + Math.min(Math.abs(fromOffset.y), 200) * Math.sign(fromOffset.y || 1) };
  const cp2 = { x: tp.x + Math.min(Math.abs(toOffset.x), 200) * Math.sign(toOffset.x || 1), y: tp.y + Math.min(Math.abs(toOffset.y), 200) * Math.sign(toOffset.y || 1) };

  return `M ${fp.x} ${fp.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${tp.x} ${tp.y}`;
}

function edgeMidpoint(
  from: CanvasNode,
  to: CanvasNode,
  fromSide: Side,
  toSide: Side
): { x: number; y: number } {
  const fp = getSideCoord(from, fromSide);
  const tp = getSideCoord(to, toSide);
  return { x: (fp.x + tp.x) / 2, y: (fp.y + tp.y) / 2 };
}

// ─── Markdown leitura para file nodes (Electron) ───

async function loadFileContent(filePath: string, subpath?: string): Promise<string | null> {
  if (!isElectron()) return null;
  try {
    const vaultPath = await window.electronAPI!.vault.getPath();
    const full = `${vaultPath}/${filePath}`;
    const raw = await window.electronAPI!.fs.readFile(full);
    if (!raw) return null;

    if (!subpath) return raw;

    // Extract a section/heading (#Heading) ou bloco (^block-id)
    const heading = subpath.startsWith("#") ? subpath.slice(1) : null;
    if (heading) {
      const lines = raw.split("\n");
      const startIdx = lines.findIndex((l) => /^#+\s/.test(l) && l.replace(/^#+\s/, "").trim() === heading.trim());
      if (startIdx === -1) return raw;
      const headingLevel = (lines[startIdx].match(/^#+/)?.[0].length) || 1;
      let endIdx = lines.length;
      for (let i = startIdx + 1; i < lines.length; i++) {
        const m = lines[i].match(/^(#+)\s/);
        if (m && m[1].length <= headingLevel) {
          endIdx = i;
          break;
        }
      }
      return lines.slice(startIdx, endIdx).join("\n");
    }
    return raw;
  } catch {
    return null;
  }
}

// ─── Component ──────────────────────────────────────

interface CanvasEditorProps {
  pacienteId: string;
  storageKey?: string;
}

export default function CanvasEditor({ pacienteId, storageKey }: CanvasEditorProps) {
  const [doc, setDoc] = useState<CanvasDoc>(EMPTY_CANVAS);
  const [viewport, setViewport] = useState<CanvasViewport>({ x: 0, y: 0, zoom: 1 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 });
  const [connecting, setConnecting] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load canvas doc
  useEffect(() => {
    let cancelled = false;
    loadCanvasAsync(pacienteId, storageKey).then((loaded) => {
      if (!cancelled) {
        setDoc(loaded);
        setViewport(loaded.viewport);
      }
    });
    return () => { cancelled = true; };
  }, [pacienteId, storageKey]);

  // Dark mode observer
  useEffect(() => {
    const html = document.documentElement;
    const update = () => setIsDark(html.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Lazy-load conteúdo dos file nodes (Electron only)
  useEffect(() => {
    if (!isElectron()) return;
    const fileNodes = doc.nodes.filter((n): n is FileNode => n.type === "file");
    fileNodes.forEach((n) => {
      const key = `${n.file}${n.subpath || ""}`;
      if (fileContents[key] !== undefined) return;
      loadFileContent(n.file, n.subpath).then((content) => {
        if (content !== null) {
          setFileContents((prev) => ({ ...prev, [key]: content }));
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.nodes]);

  // Auto-save (debounce 1.5s)
  useEffect(() => {
    if (doc.nodes.length === 0 && doc.edges.length === 0) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveCanvasAsync(pacienteId, { ...doc, viewport }, storageKey);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [doc, viewport, pacienteId, storageKey]);

  const handleSave = () => {
    saveCanvasAsync(pacienteId, { ...doc, viewport }, storageKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── Node CRUD ──

  const viewportCenter = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect?.width || 800;
    const h = rect?.height || 500;
    return {
      x: (-viewport.x + w / 2) / viewport.zoom,
      y: (-viewport.y + h / 2) / viewport.zoom,
    };
  }, [viewport]);

  const addTextNode = () => {
    const center = viewportCenter();
    const node: TextNode = {
      id: `t-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      type: "text",
      x: Math.round((center.x - DEFAULT_TEXT_WIDTH / 2) / GRID_SIZE) * GRID_SIZE,
      y: Math.round((center.y - DEFAULT_TEXT_HEIGHT / 2) / GRID_SIZE) * GRID_SIZE,
      width: DEFAULT_TEXT_WIDTH,
      height: DEFAULT_TEXT_HEIGHT,
      text: "",
    };
    setDoc((d) => ({ ...d, nodes: [...d.nodes, node] }));
  };

  const addGroupNode = () => {
    const center = viewportCenter();
    const node: GroupNode = {
      id: `g-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      type: "group",
      x: Math.round((center.x - DEFAULT_GROUP_WIDTH / 2) / GRID_SIZE) * GRID_SIZE,
      y: Math.round((center.y - DEFAULT_GROUP_HEIGHT / 2) / GRID_SIZE) * GRID_SIZE,
      width: DEFAULT_GROUP_WIDTH,
      height: DEFAULT_GROUP_HEIGHT,
      label: "Grupo",
    };
    setDoc((d) => ({ ...d, nodes: [...d.nodes, node] }));
  };

  const addLinkNode = () => {
    const url = prompt("URL:");
    if (!url || !url.trim()) return;
    const center = viewportCenter();
    const node: LinkNode = {
      id: `l-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      type: "link",
      x: Math.round((center.x - DEFAULT_LINK_WIDTH / 2) / GRID_SIZE) * GRID_SIZE,
      y: Math.round((center.y - DEFAULT_LINK_HEIGHT / 2) / GRID_SIZE) * GRID_SIZE,
      width: DEFAULT_LINK_WIDTH,
      height: DEFAULT_LINK_HEIGHT,
      url: url.trim(),
    };
    setDoc((d) => ({ ...d, nodes: [...d.nodes, node] }));
  };

  const updateNode = (id: string, updates: Partial<CanvasNode>) => {
    setDoc((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === id ? { ...n, ...updates } as CanvasNode : n)),
    }));
  };

  const deleteNode = (id: string) => {
    setDoc((d) => ({
      ...d,
      nodes: d.nodes.filter((n) => n.id !== id),
      edges: d.edges.filter((e) => e.fromNode !== id && e.toNode !== id),
    }));
    setSelectedNodeId(null);
  };

  const deleteEdge = (id: string) => {
    setDoc((d) => ({ ...d, edges: d.edges.filter((e) => e.id !== id) }));
  };

  // ── Import/Export ──

  const handleImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result));
        const imported = normalizeCanvasDoc(parsed);
        // Mescla com o canvas existente: IDs são preservados se únicos,
        // senão recebem um sufixo para evitar colisão.
        const existingIds = new Set(doc.nodes.map((n) => n.id));
        const existingEdgeIds = new Set(doc.edges.map((e) => e.id));
        const idMap: Record<string, string> = {};
        const newNodes = imported.nodes.map((n) => {
          if (existingIds.has(n.id)) {
            const fresh = `${n.id}-imp${Date.now().toString(36)}`;
            idMap[n.id] = fresh;
            return { ...n, id: fresh } as CanvasNode;
          }
          return n;
        });
        const newEdges = imported.edges.map((e) => {
          const fromN = idMap[e.fromNode] || e.fromNode;
          const toN = idMap[e.toNode] || e.toNode;
          const id = existingEdgeIds.has(e.id) ? `${e.id}-imp${Date.now().toString(36)}` : e.id;
          return { ...e, id, fromNode: fromN, toNode: toN };
        });
        setDoc((d) => ({
          ...d,
          nodes: [...d.nodes, ...newNodes],
          edges: [...d.edges, ...newEdges],
        }));
        alert(`Importado: ${newNodes.length} nós e ${newEdges.length} conexões.`);
      } catch (err) {
        alert("Arquivo inválido. Certifique-se de que é um arquivo .canvas válido do Obsidian.");
      }
    };
    reader.readAsText(file);
    ev.target.value = "";
  };

  const handleExport = () => {
    const data: ObsidianCanvasFile = { nodes: doc.nodes, edges: doc.edges };
    const blob = new Blob([JSON.stringify(data, null, "\t")], { type: "application/json" });
    const a = document.createElement("a");
    const paciente = getPaciente(pacienteId);
    const safeName = paciente ? sanitizeName(paciente.nome) : "canvas";
    a.download = `${safeName}${storageKey ? "-" + storageKey : ""}.canvas`;
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── Zoom ──

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setViewport((v) => {
      const direction = e.deltaY > 0 ? -1 : 1;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom + direction * ZOOM_STEP));
      const ratio = newZoom / v.zoom;
      return {
        zoom: newZoom,
        x: mouseX - ratio * (mouseX - v.x),
        y: mouseY - ratio * (mouseY - v.y),
      };
    });
  }, []);

  // ── Pan ──

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.target === e.currentTarget)) {
      e.preventDefault();
      setPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y });
      setSelectedNodeId(null);
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (panning) {
        setViewport((v) => ({
          ...v,
          x: panStart.vx + (e.clientX - panStart.x),
          y: panStart.vy + (e.clientY - panStart.y),
        }));
        return;
      }
      if (draggingNode) {
        const dx = (e.clientX - dragStart.x) / viewport.zoom;
        const dy = (e.clientY - dragStart.y) / viewport.zoom;
        updateNode(draggingNode, {
          x: Math.round((dragStart.nodeX + dx) / GRID_SIZE) * GRID_SIZE,
          y: Math.round((dragStart.nodeY + dy) / GRID_SIZE) * GRID_SIZE,
        } as Partial<CanvasNode>);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [panning, panStart, draggingNode, dragStart, viewport.zoom]
  );

  const handleMouseUp = useCallback(() => {
    setPanning(false);
    setDraggingNode(null);
  }, []);

  useEffect(() => {
    if (panning || draggingNode) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [panning, draggingNode, handleMouseMove, handleMouseUp]);

  // ── Node drag start ──

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if ((e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).tagName === "BUTTON" || (e.target as HTMLElement).tagName === "A") return;
    e.stopPropagation();
    const node = doc.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setDraggingNode(nodeId);
    setSelectedNodeId(nodeId);
    setDragStart({ x: e.clientX, y: e.clientY, nodeX: node.x, nodeY: node.y });
  };

  // ── Connection ──

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    if (!connecting) {
      setSelectedNodeId(nodeId);
      return;
    }
    e.stopPropagation();
    if (connecting === "__start__") {
      setConnecting(nodeId);
    } else if (connecting !== nodeId) {
      const fromNode = doc.nodes.find((n) => n.id === connecting);
      const toNode = doc.nodes.find((n) => n.id === nodeId);
      if (fromNode && toNode) {
        const fromSide = inferSide(fromNode, toNode);
        const toSide = oppositeSide(fromSide);
        const newEdge: CanvasEdge = {
          id: `e-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
          fromNode: connecting,
          fromSide,
          toNode: nodeId,
          toSide,
          toEnd: "arrow",
        };
        setDoc((d) => ({ ...d, edges: [...d.edges, newEdge] }));
      }
      setConnecting(null);
    }
  };

  // ── Zoom controls ──
  const zoomIn = () => setViewport((v) => ({ ...v, zoom: Math.min(MAX_ZOOM, v.zoom + ZOOM_STEP) }));
  const zoomOut = () => setViewport((v) => ({ ...v, zoom: Math.max(MIN_ZOOM, v.zoom - ZOOM_STEP) }));
  const resetView = () => {
    // Fit all nodes no viewport
    if (doc.nodes.length === 0) {
      setViewport({ x: 0, y: 0, zoom: 1 });
      return;
    }
    const minX = Math.min(...doc.nodes.map((n) => n.x));
    const maxX = Math.max(...doc.nodes.map((n) => n.x + n.width));
    const minY = Math.min(...doc.nodes.map((n) => n.y));
    const maxY = Math.max(...doc.nodes.map((n) => n.y + n.height));
    const w = maxX - minX;
    const h = maxY - minY;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) { setViewport({ x: 0, y: 0, zoom: 1 }); return; }
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min((rect.width - 80) / w, (rect.height - 80) / h)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setViewport({
      zoom,
      x: rect.width / 2 - cx * zoom,
      y: rect.height / 2 - cy * zoom,
    });
  };

  const zoomPercent = Math.round(viewport.zoom * 100);
  const selectedNode = selectedNodeId ? doc.nodes.find((n) => n.id === selectedNodeId) : null;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button size="sm" onClick={addTextNode} icon={<Type size={14} />}>Texto</Button>
          <Button size="sm" variant="secondary" onClick={addLinkNode} icon={<ExternalLink size={14} />}>Link</Button>
          <Button size="sm" variant="secondary" onClick={addGroupNode} icon={<FolderOpen size={14} />}>Grupo</Button>
          <Button
            size="sm"
            variant={connecting ? "primary" : "secondary"}
            onClick={() => setConnecting(connecting ? null : "__start__")}
            icon={<Link2 size={14} />}
          >
            {connecting ? "Selecione os blocos..." : "Conectar"}
          </Button>
          <div className="w-px h-5 bg-elevated mx-1" />
          <Button size="sm" variant="secondary" onClick={handleImportFile} icon={<Upload size={14} />}>Importar .canvas</Button>
          <Button size="sm" variant="secondary" onClick={handleExport} icon={<Download size={14} />}>Exportar</Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".canvas,application/json"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={zoomOut} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-elevated text-ink-2"><ZoomOut size={15} /></button>
          <span className="font-dm text-[11px] text-ink-2 w-10 text-center">{zoomPercent}%</span>
          <button onClick={zoomIn} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-elevated text-ink-2"><ZoomIn size={15} /></button>
          <button onClick={resetView} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-elevated text-ink-2" title="Fit"><Maximize size={14} /></button>
          <div className="w-px h-5 bg-elevated mx-1" />
          {saved && <span className="font-dm text-xs text-emerald-500 mr-1">Salvo ✓</span>}
          <Button size="sm" variant="secondary" onClick={handleSave} icon={<Save size={14} />}>Salvar</Button>
        </div>
      </div>

      {/* Canvas viewport */}
      <div
        ref={containerRef}
        className={`relative rounded-2xl border border-line overflow-hidden min-h-[500px] h-[70vh] ${panning ? "cursor-grabbing" : connecting ? "cursor-crosshair" : "cursor-grab"}`}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
      >
        {/* Background grid (fixed to viewport) */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: 0, top: 0, right: 0, bottom: 0,
            backgroundImage: isDark
              ? "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)"
              : "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: `${GRID_SIZE * viewport.zoom}px ${GRID_SIZE * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          }}
        />

        {/* Transform layer */}
        <div
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
            left: 0, top: 0,
            width: 0, height: 0,
          }}
        >
          {/* Groups primeiro (ficam atrás) */}
          {doc.nodes.filter((n): n is GroupNode => n.type === "group").map((node) => (
            <GroupNodeView
              key={node.id}
              node={node}
              isDark={isDark}
              selected={selectedNodeId === node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onClick={(e) => handleNodeClick(e, node.id)}
              onUpdate={(u) => updateNode(node.id, u)}
              onDelete={() => deleteNode(node.id)}
            />
          ))}

          {/* Edges layer */}
          <svg
            className="absolute overflow-visible pointer-events-none"
            style={{ left: 0, top: 0, width: 1, height: 1, zIndex: 2 }}
          >
            <defs>
              <marker id="canvas-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L10,3.5 L0,7 Z" fill="currentColor" />
              </marker>
              <marker id="canvas-arrow-start" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto-start-reverse" markerUnits="strokeWidth">
                <path d="M0,0 L10,3.5 L0,7 Z" fill="currentColor" />
              </marker>
            </defs>
            {doc.edges.map((edge) => {
              const fromNode = doc.nodes.find((n) => n.id === edge.fromNode);
              const toNode = doc.nodes.find((n) => n.id === edge.toNode);
              if (!fromNode || !toNode) return null;
              const fromSide = edge.fromSide || inferSide(fromNode, toNode);
              const toSide = edge.toSide || oppositeSide(fromSide);
              const path = getEdgePath(fromNode, toNode, fromSide, toSide);
              const mid = edgeMidpoint(fromNode, toNode, fromSide, toSide);
              const stroke = resolveEdgeStroke(edge.color, isDark);
              // toEnd: default arrow; fromEnd: default none
              const toEnd = edge.toEnd ?? "arrow";
              const fromEnd = edge.fromEnd ?? "none";
              return (
                <g key={edge.id} style={{ color: stroke }}>
                  <path
                    d={path}
                    stroke={stroke}
                    strokeWidth={2}
                    fill="none"
                    opacity={0.7}
                    markerEnd={toEnd === "arrow" ? "url(#canvas-arrow)" : undefined}
                    markerStart={fromEnd === "arrow" ? "url(#canvas-arrow-start)" : undefined}
                  />
                  <path
                    d={path}
                    stroke="transparent"
                    strokeWidth={16}
                    fill="none"
                    className="pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.shiftKey) deleteEdge(edge.id);
                    }}
                  >
                    <title>Shift+clique para excluir</title>
                  </path>
                  {edge.label && (
                    <g transform={`translate(${mid.x}, ${mid.y})`} className="pointer-events-none">
                      <rect x={-30} y={-10} width={60} height={20} rx={4} fill={isDark ? "#1F2937" : "#FFFFFF"} stroke={stroke} strokeWidth={1} opacity={0.9} />
                      <text x={0} y={4} textAnchor="middle" fontSize={11} fill={stroke}>{edge.label}</text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Nodes não-group */}
          {doc.nodes.filter((n) => n.type !== "group").map((node) => (
            <NodeView
              key={node.id}
              node={node}
              isDark={isDark}
              selected={selectedNodeId === node.id}
              isBeingDragged={draggingNode === node.id}
              fileContent={node.type === "file" ? fileContents[`${node.file}${node.subpath || ""}`] : undefined}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onClick={(e) => handleNodeClick(e, node.id)}
              onUpdate={(u) => updateNode(node.id, u)}
              onDelete={() => deleteNode(node.id)}
            />
          ))}
        </div>

        {/* Empty state */}
        {doc.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center max-w-sm">
              <p className="font-fraunces text-base text-ink-3 mb-2">Canvas vazio</p>
              <p className="font-dm text-xs text-ink-4 mb-3">
                Adicione um bloco de texto, link ou grupo — ou importe um arquivo .canvas do Obsidian.
              </p>
              <div className="flex items-center justify-center gap-2 pointer-events-auto">
                <Button size="sm" onClick={addTextNode} icon={<Type size={14} />}>Novo texto</Button>
                <Button size="sm" variant="secondary" onClick={handleImportFile} icon={<Upload size={14} />}>Importar</Button>
              </div>
            </div>
          </div>
        )}

        {/* Connecting indicator */}
        {connecting && connecting !== "__start__" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-acc text-white font-dm text-xs shadow-lg z-50">
            Agora clique no bloco de destino
          </div>
        )}
      </div>

      {/* Sidebar selecionado (cores etc) */}
      {selectedNode && (
        <div className="mt-2 flex items-center gap-2 p-2 rounded-xl bg-elevated border border-line flex-wrap">
          <span className="font-dm text-xs text-ink-3">Cor:</span>
          {AVAILABLE_COLORS.map((c) => {
            const visual = resolveColor(c || undefined, isDark);
            return (
              <button
                key={c || "none"}
                onClick={() => updateNode(selectedNode.id, { color: c || undefined } as Partial<CanvasNode>)}
                className="w-5 h-5 rounded-full border transition-transform hover:scale-125"
                style={{
                  backgroundColor: visual.bg,
                  borderColor: visual.border,
                  outline: (selectedNode.color || "") === c ? "2px solid var(--orange-500)" : "none",
                  outlineOffset: "1px",
                }}
                title={c || "Sem cor"}
              />
            );
          })}
          <div className="w-px h-4 bg-line mx-1" />
          <span className="font-dm text-xs text-ink-4">
            {selectedNode.type === "file" && "📄 File node — conteúdo vindo do vault"}
            {selectedNode.type === "link" && "🔗 Link node"}
            {selectedNode.type === "text" && "📝 Text node"}
            {selectedNode.type === "group" && "📁 Group"}
          </span>
        </div>
      )}

      {/* Help text */}
      <div className="flex items-center justify-between mt-2">
        <p className="font-dm text-xs text-ink-4">
          Ctrl+Scroll para zoom · Clique no fundo e arraste para navegar · Shift+clique na conexão para excluir
        </p>
        {isElectron() && (
          <p className="font-dm text-[10px] text-ink-4 italic">
            Arquivo salvo no Obsidian vault (.canvas)
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Color resolution for edges ─────────────────────

function resolveEdgeStroke(color: CanvasColor | undefined, dark: boolean): string {
  if (!color) return dark ? "#94A3B8" : "#64748B";
  if (color.startsWith("#")) return color;
  const p = OBSIDIAN_PALETTE[color];
  if (p) return dark ? p.darkBorder : p.border;
  return dark ? "#94A3B8" : "#64748B";
}

// ─── NodeView components ─────────────────────────────

function NodeView({
  node, isDark, selected, isBeingDragged, fileContent, onMouseDown, onClick, onUpdate, onDelete,
}: {
  node: Exclude<CanvasNode, GroupNode>;
  isDark: boolean;
  selected: boolean;
  isBeingDragged: boolean;
  fileContent?: string;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onUpdate: (u: Partial<CanvasNode>) => void;
  onDelete: () => void;
}) {
  const colors = resolveColor(node.color, isDark);

  return (
    <div
      className={`absolute rounded-xl border select-none overflow-hidden transition-shadow ${isBeingDragged ? "shadow-xl" : selected ? "shadow-lg" : "shadow-sm hover:shadow-md"}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        backgroundColor: colors.bg,
        borderColor: selected ? "var(--orange-500)" : colors.border,
        borderWidth: selected ? 2 : 1,
        zIndex: isBeingDragged ? 50 : 10,
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {/* Handle bar */}
      <div
        className="flex items-center justify-between px-2 py-1 cursor-move text-[10px]"
        style={{ borderBottom: `1px solid ${colors.border}`, background: "rgba(0,0,0,0.02)" }}
      >
        <span className="font-dm font-medium" style={{ color: isDark ? "#9CA3AF" : "#6B7280" }}>
          {node.type === "text" && "📝"}
          {node.type === "file" && "📄"}
          {node.type === "link" && "🔗"}
          {" "}
          {node.type === "text" && "Texto"}
          {node.type === "file" && (node.file.split("/").pop()?.replace(/\.md$/, "") || "Arquivo")}
          {node.type === "link" && "Link"}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-ink-4 hover:text-red-400 p-0.5"
          style={{ color: isDark ? "#6B7280" : "#9CA3AF" }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Content */}
      {node.type === "text" && (
        <textarea
          value={node.text}
          onChange={(e) => onUpdate({ text: e.target.value } as Partial<CanvasNode>)}
          placeholder="Digite aqui..."
          className="w-full h-full px-3 py-2 bg-transparent font-dm text-[13px] leading-relaxed outline-none resize-none placeholder:opacity-30"
          style={{ color: isDark ? "#E8E8E8" : "#1A1A1A", height: `calc(100% - 24px)` }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      )}

      {node.type === "file" && (
        <div
          className="px-3 py-2 overflow-auto font-dm text-[12px] leading-relaxed"
          style={{ color: isDark ? "#D1D5DB" : "#374151", height: `calc(100% - 24px)` }}
          onMouseDown={(e) => { if ((e.target as HTMLElement).tagName !== "A") e.stopPropagation(); }}
        >
          {node.subpath && (
            <div className="font-dm text-[10px] mb-1 opacity-60">
              → {node.subpath}
            </div>
          )}
          {fileContent ? (
            <pre className="whitespace-pre-wrap font-dm text-[11px]">{truncate(fileContent, 1000)}</pre>
          ) : (
            <div className="flex items-center gap-2 opacity-60">
              <FileText size={14} />
              <span>{node.file}</span>
            </div>
          )}
        </div>
      )}

      {node.type === "link" && (
        <div
          className="px-3 py-2 h-full flex flex-col gap-2"
          style={{ color: isDark ? "#D1D5DB" : "#374151" }}
          onMouseDown={(e) => { if ((e.target as HTMLElement).tagName !== "A") e.stopPropagation(); }}
        >
          <div className="flex items-center gap-2 opacity-60">
            <ExternalLink size={14} />
            <a
              href={node.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-dm text-[12px] underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {node.url}
            </a>
          </div>
          <iframe
            src={node.url}
            className="flex-1 rounded border border-line"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      )}
    </div>
  );
}

function GroupNodeView({
  node, isDark, selected, onMouseDown, onClick, onUpdate, onDelete,
}: {
  node: GroupNode;
  isDark: boolean;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onUpdate: (u: Partial<CanvasNode>) => void;
  onDelete: () => void;
}) {
  const colors = resolveColor(node.color, isDark);
  return (
    <div
      className="absolute rounded-2xl border-2 border-dashed cursor-move select-none"
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        borderColor: selected ? "var(--orange-500)" : colors.border,
        backgroundColor: `${colors.bg}40`,
        zIndex: 1,
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <div className="flex items-center justify-between px-3 py-1.5">
        <input
          type="text"
          value={node.label || ""}
          onChange={(e) => onUpdate({ label: e.target.value } as Partial<CanvasNode>)}
          placeholder="Grupo..."
          className="flex-1 bg-transparent font-fraunces text-[14px] font-medium outline-none"
          style={{ color: isDark ? "#E5E7EB" : "#1F2937" }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-ink-4 hover:text-red-400 p-0.5"
          style={{ color: isDark ? "#6B7280" : "#9CA3AF" }}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + "\n\n...[conteúdo truncado]";
}
