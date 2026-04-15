"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Trash2, Save, Link2, ZoomIn, ZoomOut, Maximize,
  Upload, Download, FileText, ExternalLink, Type, FolderOpen, Eraser,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { getPaciente } from "@/lib/data";

// ═══════════════════════════════════════════════════
// JSON Canvas spec (Obsidian .canvas files)
// Reference: https://jsoncanvas.org/
//
// Suporta o formato integralmente: nós text/file/link/group, edges com
// sides, labels, fromEnd/toEnd, cores "1".."6" ou hex. Interação
// replicada do Obsidian: duplo-clique cria nó, hover revela âncoras
// para drag-to-connect, resize por drag nos cantos, markdown render
// nos text nodes, labels editáveis nas edges.
// ═══════════════════════════════════════════════════

type Side = "top" | "right" | "bottom" | "left";
type EdgeEnd = "none" | "arrow";
type CanvasColor = string;

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
    return { bg: dark ? darken(color, 0.6) : lighten(color, 0.88), border: color };
  }
  const p = OBSIDIAN_PALETTE[color];
  if (p) return { bg: dark ? p.darkBg : p.bg, border: dark ? p.darkBorder : p.border };
  return { bg: dark ? DEFAULT_COLOR_VISUAL.darkBg : DEFAULT_COLOR_VISUAL.bg, border: dark ? DEFAULT_COLOR_VISUAL.darkBorder : DEFAULT_COLOR_VISUAL.border };
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(Math.round(r + (255 - r) * amount), Math.round(g + (255 - g) * amount), Math.round(b + (255 - b) * amount));
}
function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(Math.round(r * (1 - amount)), Math.round(g * (1 - amount)), Math.round(b * (1 - amount)));
}
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace("#", "");
  const full = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}
function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function resolveEdgeStroke(color: CanvasColor | undefined, dark: boolean): string {
  if (!color) return dark ? "#94A3B8" : "#64748B";
  if (color.startsWith("#")) return color;
  const p = OBSIDIAN_PALETTE[color];
  if (p) return dark ? p.darkBorder : p.border;
  return dark ? "#94A3B8" : "#64748B";
}

// ─── Markdown renderer simples ─────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inlineMd(raw: string): string {
  let s = escapeHtml(raw);
  // Code inline: `code`
  s = s.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
  // Bold: **text** e __text__
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  // Italic: *text* e _text_
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");
  // Strikethrough: ~~text~~
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  // Link [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');
  // Wikilinks [[link]]
  s = s.replace(/\[\[([^\]]+)\]\]/g, '<span class="md-wikilink">$1</span>');
  return s;
}

function renderMarkdown(src: string): string {
  if (!src) return "";
  const lines = src.split("\n");
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let inCode = false;
  let codeBuf: string[] = [];

  function closeList() {
    if (listType) { out.push(`</${listType}>`); listType = null; }
  }
  function closeCode() {
    if (inCode) {
      out.push(`<pre class="md-pre"><code>${codeBuf.map(escapeHtml).join("\n")}</code></pre>`);
      codeBuf = [];
      inCode = false;
    }
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) closeCode();
      else { closeList(); inCode = true; }
      continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    // Heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      const level = h[1].length;
      out.push(`<h${level} class="md-h${level}">${inlineMd(h[2])}</h${level}>`);
      continue;
    }

    // HR
    if (/^---+$|^\*\*\*+$|^___+$/.test(line.trim())) {
      closeList();
      out.push('<hr class="md-hr" />');
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      closeList();
      out.push(`<blockquote class="md-quote">${inlineMd(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }

    // Unordered list
    const ul = /^[-*+]\s+(.*)$/.exec(line);
    if (ul) {
      if (listType !== "ul") { closeList(); out.push('<ul class="md-ul">'); listType = "ul"; }
      out.push(`<li>${inlineMd(ul[1])}</li>`);
      continue;
    }

    // Ordered list
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      if (listType !== "ol") { closeList(); out.push('<ol class="md-ol">'); listType = "ol"; }
      out.push(`<li>${inlineMd(ol[1])}</li>`);
      continue;
    }

    // Checkbox (- [ ] / - [x])
    const cb = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line);
    if (cb) {
      closeList();
      const checked = cb[1].trim().toLowerCase() === "x";
      out.push(`<div class="md-check"><input type="checkbox" ${checked ? "checked" : ""} disabled /> <span>${inlineMd(cb[2])}</span></div>`);
      continue;
    }

    // Empty
    if (line.trim() === "") {
      closeList();
      continue;
    }

    // Paragraph
    closeList();
    out.push(`<p class="md-p">${inlineMd(line)}</p>`);
  }
  closeCode();
  closeList();
  return out.join("\n");
}

// ─── Constants ──────────────────────────────────────

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const GRID_SIZE = 20;
const DEFAULT_TEXT_WIDTH = 260;
const DEFAULT_TEXT_HEIGHT = 140;
const DEFAULT_FILE_WIDTH = 400;
const DEFAULT_FILE_HEIGHT = 400;
const DEFAULT_LINK_WIDTH = 400;
const DEFAULT_LINK_HEIGHT = 260;
const DEFAULT_GROUP_WIDTH = 500;
const DEFAULT_GROUP_HEIGHT = 400;
const MIN_NODE_WIDTH = 100;
const MIN_NODE_HEIGHT = 60;

const EMPTY_CANVAS: CanvasDoc = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
const AVAILABLE_COLORS: CanvasColor[] = ["", "1", "2", "3", "4", "5", "6"];
const SIDES: Side[] = ["top", "right", "bottom", "left"];

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
  if (isElectron()) {
    const filePath = await getCanvasPath(pacienteId, storageKey);
    if (filePath) {
      try {
        const raw = await window.electronAPI!.fs.readFile(filePath);
        if (raw) return normalizeCanvasDoc(JSON.parse(raw));
      } catch {}
    }
  }
  const key = getLocalKey(pacienteId, storageKey);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...EMPTY_CANVAS };
    return normalizeCanvasDoc(JSON.parse(raw));
  } catch {
    return { ...EMPTY_CANVAS };
  }
}

function normalizeCanvasDoc(parsed: any): CanvasDoc {
  if (!parsed || typeof parsed !== "object") return { ...EMPTY_CANVAS };

  const viewport: CanvasViewport =
    parsed.viewport && typeof parsed.viewport === "object"
      ? { x: parsed.viewport.x || 0, y: parsed.viewport.y || 0, zoom: parsed.viewport.zoom || 1 }
      : { x: 0, y: 0, zoom: 1 };

  // Legacy com blocks/connections
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
    if (type === "file") return { ...base, type: "file", file: String(n.file || ""), subpath: n.subpath ? String(n.subpath) : undefined };
    if (type === "link") return { ...base, type: "link", url: String(n.url || "") };
    if (type === "group") return { ...base, type: "group", label: n.label ? String(n.label) : undefined, background: n.background ? String(n.background) : undefined, backgroundStyle: n.backgroundStyle };
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

/**
 * Serializa um CanvasDoc no formato estrito do JSON Canvas spec, tal como
 * o Obsidian espera: coordenadas inteiras, apenas os campos conhecidos do
 * spec, sem valores undefined ou vazios, sem viewport interno.
 */
function serializeForObsidian(doc: CanvasDoc): string {
  const nodes = doc.nodes.map((n) => {
    const out: Record<string, unknown> = {
      id: n.id,
      type: n.type,
      x: Math.round(n.x),
      y: Math.round(n.y),
      width: Math.max(1, Math.round(n.width)),
      height: Math.max(1, Math.round(n.height)),
    };
    if (n.color && n.color.length > 0) out.color = n.color;
    if (n.type === "text") {
      out.text = n.text || "";
    } else if (n.type === "file") {
      out.file = n.file;
      if (n.subpath) out.subpath = n.subpath;
    } else if (n.type === "link") {
      out.url = n.url;
    } else if (n.type === "group") {
      if (n.label) out.label = n.label;
      if (n.background) out.background = n.background;
      if (n.backgroundStyle) out.backgroundStyle = n.backgroundStyle;
    }
    return out;
  });

  const edges = doc.edges.map((e) => {
    const out: Record<string, unknown> = {
      id: e.id,
      fromNode: e.fromNode,
      toNode: e.toNode,
    };
    if (e.fromSide) out.fromSide = e.fromSide;
    if (e.fromEnd && e.fromEnd !== "none") out.fromEnd = e.fromEnd;
    if (e.toSide) out.toSide = e.toSide;
    // toEnd "arrow" é o default implícito, podemos emitir explicitamente
    // para clareza, mas omitir é aceito pelo spec
    if (e.toEnd && e.toEnd !== "arrow") out.toEnd = e.toEnd;
    if (e.color && e.color.length > 0) out.color = e.color;
    if (e.label) out.label = e.label;
    return out;
  });

  return JSON.stringify({ nodes, edges }, null, "\t");
}

async function saveCanvasAsync(pacienteId: string, data: CanvasDoc, storageKey?: string): Promise<void> {
  // Formato Obsidian (spec puro) para o arquivo .canvas
  const obsidianJson = serializeForObsidian(data);

  if (isElectron()) {
    const filePath = await getCanvasPath(pacienteId, storageKey);
    if (filePath) {
      try { await window.electronAPI!.fs.writeFile(filePath, obsidianJson); } catch {}
    }
  }

  // Local mantém viewport (para restaurar zoom/pan), mas os nodes/edges já
  // vão sanitizados para evitar divergência entre os dois formatos
  const key = getLocalKey(pacienteId, storageKey);
  try {
    const localPayload = {
      ...JSON.parse(obsidianJson),
      viewport: data.viewport,
    };
    localStorage.setItem(key, JSON.stringify(localPayload));
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
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "bottom" : "top";
}

function inferSideTowardsPoint(node: CanvasNode, px: number, py: number): Side {
  const dx = px - (node.x + node.width / 2);
  const dy = py - (node.y + node.height / 2);
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "bottom" : "top";
}

function oppositeSide(s: Side): Side {
  return s === "top" ? "bottom" : s === "bottom" ? "top" : s === "left" ? "right" : "left";
}

function getEdgePathBetweenNodes(from: CanvasNode, to: CanvasNode, fromSide: Side, toSide: Side): string {
  const fp = getSideCoord(from, fromSide);
  const tp = getSideCoord(to, toSide);
  return bezierPath(fp, fromSide, tp, toSide);
}

function bezierPath(
  fp: { x: number; y: number },
  fromSide: Side,
  tp: { x: number; y: number },
  toSide: Side
): string {
  const dist = Math.max(80, Math.hypot(tp.x - fp.x, tp.y - fp.y) * 0.5);
  const off = Math.min(dist, 250);
  const dirVec = (s: Side): { x: number; y: number } => {
    if (s === "right") return { x: 1, y: 0 };
    if (s === "left") return { x: -1, y: 0 };
    if (s === "top") return { x: 0, y: -1 };
    return { x: 0, y: 1 };
  };
  const fv = dirVec(fromSide);
  const tv = dirVec(toSide);
  const cp1 = { x: fp.x + fv.x * off, y: fp.y + fv.y * off };
  const cp2 = { x: tp.x + tv.x * off, y: tp.y + tv.y * off };
  return `M ${fp.x} ${fp.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${tp.x} ${tp.y}`;
}

function edgeMidpoint(from: CanvasNode, to: CanvasNode, fromSide: Side, toSide: Side): { x: number; y: number } {
  const fp = getSideCoord(from, fromSide);
  const tp = getSideCoord(to, toSide);
  return { x: (fp.x + tp.x) / 2, y: (fp.y + tp.y) / 2 };
}

// ─── File content loader ───────────────────────────

async function loadFileContent(filePath: string, subpath?: string): Promise<string | null> {
  if (!isElectron()) return null;
  try {
    const vaultPath = await window.electronAPI!.vault.getPath();
    const full = `${vaultPath}/${filePath}`;
    const raw = await window.electronAPI!.fs.readFile(full);
    if (!raw) return null;
    if (!subpath) return raw;
    const heading = subpath.startsWith("#") ? subpath.slice(1) : null;
    if (heading) {
      const lines = raw.split("\n");
      const startIdx = lines.findIndex((l) => /^#+\s/.test(l) && l.replace(/^#+\s/, "").trim() === heading.trim());
      if (startIdx === -1) return raw;
      const headingLevel = (lines[startIdx].match(/^#+/)?.[0].length) || 1;
      let endIdx = lines.length;
      for (let i = startIdx + 1; i < lines.length; i++) {
        const m = lines[i].match(/^(#+)\s/);
        if (m && m[1].length <= headingLevel) { endIdx = i; break; }
      }
      return lines.slice(startIdx, endIdx).join("\n");
    }
    return raw;
  } catch {
    return null;
  }
}

// ─── Helpers ────────────────────────────────────────

/**
 * Gera um ID hex de 16 caracteres, no mesmo formato que o Obsidian usa
 * para os IDs de nodes/edges no arquivo .canvas. Obsidian é tolerante a
 * strings arbitrárias, mas manter o formato evita qualquer risco.
 */
function uid(_prefix = ""): string {
  const ts = Date.now().toString(16).padStart(12, "0").slice(-12);
  const rnd = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
  return ts + rnd;
}

function snap(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE;
}

// ─── Component ──────────────────────────────────────

interface CanvasEditorProps {
  pacienteId: string;
  storageKey?: string;
}

interface EdgeDragState {
  fromNodeId: string;
  fromSide: Side;
  currentX: number;
  currentY: number;
  hoverNodeId: string | null;
}

interface ResizeState {
  nodeId: string;
  startMouseX: number;
  startMouseY: number;
  startW: number;
  startH: number;
  startX: number;
  startY: number;
  corner: "se" | "sw" | "ne" | "nw";
}

export default function CanvasEditor({ pacienteId, storageKey }: CanvasEditorProps) {
  const [doc, setDoc] = useState<CanvasDoc>(EMPTY_CANVAS);
  const [viewport, setViewport] = useState<CanvasViewport>({ x: 0, y: 0, zoom: 1 });
  const [isDark, setIsDark] = useState(false);

  // Interaction states
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 });
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [edgeDrag, setEdgeDrag] = useState<EdgeDragState | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load ──
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

  // ── Dark mode ──
  useEffect(() => {
    const html = document.documentElement;
    const update = () => setIsDark(html.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // ── File content lazy load ──
  useEffect(() => {
    if (!isElectron()) return;
    const fileNodes = doc.nodes.filter((n): n is FileNode => n.type === "file");
    fileNodes.forEach((n) => {
      const key = `${n.file}${n.subpath || ""}`;
      if (fileContents[key] !== undefined) return;
      loadFileContent(n.file, n.subpath).then((content) => {
        if (content !== null) setFileContents((prev) => ({ ...prev, [key]: content }));
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.nodes]);

  // ── Auto-save ──
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

  // ── Convert screen → world coords ──
  const screenToWorld = useCallback((sx: number, sy: number): { x: number; y: number } => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (sx - rect.left - viewport.x) / viewport.zoom,
      y: (sy - rect.top - viewport.y) / viewport.zoom,
    };
  }, [viewport]);

  // ── CRUD helpers ──
  const setNodes = useCallback((fn: (nodes: CanvasNode[]) => CanvasNode[]) => {
    setDoc((d) => ({ ...d, nodes: fn(d.nodes) }));
  }, []);
  const setEdges = useCallback((fn: (edges: CanvasEdge[]) => CanvasEdge[]) => {
    setDoc((d) => ({ ...d, edges: fn(d.edges) }));
  }, []);
  const updateNode = useCallback((id: string, updates: Partial<CanvasNode>) => {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, ...updates } as CanvasNode : n)));
  }, [setNodes]);
  const deleteNodes = useCallback((ids: string[]) => {
    const set = new Set(ids);
    setDoc((d) => ({
      ...d,
      nodes: d.nodes.filter((n) => !set.has(n.id)),
      edges: d.edges.filter((e) => !set.has(e.fromNode) && !set.has(e.toNode)),
    }));
    setSelectedNodeIds(new Set());
  }, []);
  const deleteEdges = useCallback((ids: string[]) => {
    const set = new Set(ids);
    setDoc((d) => ({ ...d, edges: d.edges.filter((e) => !set.has(e.id)) }));
    setSelectedEdgeIds(new Set());
  }, []);

  // ── Create nodes ──
  const createTextNodeAt = useCallback((worldX: number, worldY: number, beginEdit = true, width = DEFAULT_TEXT_WIDTH, height = DEFAULT_TEXT_HEIGHT): TextNode => {
    const node: TextNode = {
      id: uid("t"),
      type: "text",
      x: snap(worldX - width / 2),
      y: snap(worldY - height / 2),
      width,
      height,
      text: "",
    };
    setNodes((ns) => [...ns, node]);
    if (beginEdit) {
      setTimeout(() => {
        setEditingNodeId(node.id);
        setSelectedNodeIds(new Set([node.id]));
      }, 10);
    }
    return node;
  }, [setNodes]);

  const addGroupNode = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const center = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const node: GroupNode = {
      id: uid("g"),
      type: "group",
      x: snap(center.x - DEFAULT_GROUP_WIDTH / 2),
      y: snap(center.y - DEFAULT_GROUP_HEIGHT / 2),
      width: DEFAULT_GROUP_WIDTH,
      height: DEFAULT_GROUP_HEIGHT,
      label: "Grupo",
    };
    setNodes((ns) => [...ns, node]);
  };

  const addLinkNode = () => {
    const url = prompt("URL:");
    if (!url || !url.trim()) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const center = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const node: LinkNode = {
      id: uid("l"),
      type: "link",
      x: snap(center.x - DEFAULT_LINK_WIDTH / 2),
      y: snap(center.y - DEFAULT_LINK_HEIGHT / 2),
      width: DEFAULT_LINK_WIDTH,
      height: DEFAULT_LINK_HEIGHT,
      url: url.trim(),
    };
    setNodes((ns) => [...ns, node]);
  };

  // ── Import/Export/Clear ──
  const handleImportFile = () => fileInputRef.current?.click();
  const handleFileUpload = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result));
        const imported = normalizeCanvasDoc(parsed);
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
        setDoc((d) => ({ ...d, nodes: [...d.nodes, ...newNodes], edges: [...d.edges, ...newEdges] }));
        alert(`Importado: ${newNodes.length} nós e ${newEdges.length} conexões.`);
      } catch {
        alert("Arquivo inválido.");
      }
    };
    reader.readAsText(file);
    ev.target.value = "";
  };
  const handleExport = () => {
    // Usa a mesma função de serialização do auto-save — garante arquivo
    // idêntico ao que o Obsidian lê do vault, com todos os campos
    // sanitizados conforme o spec JSON Canvas.
    const json = serializeForObsidian(doc);
    // Força octet-stream pra evitar que o browser tente "interpretar"
    // como JSON ou mudar a extensão
    const blob = new Blob([json], { type: "application/octet-stream" });
    const a = document.createElement("a");
    const paciente = getPaciente(pacienteId);
    const safeName = paciente ? sanitizeName(paciente.nome) : "canvas";
    a.download = `${safeName}${storageKey ? "-" + storageKey : ""}.canvas`;
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const handleClear = () => {
    if (doc.nodes.length === 0 && doc.edges.length === 0) return;
    if (!confirm(`Limpar canvas? Isso vai apagar ${doc.nodes.length} nós e ${doc.edges.length} conexões.`)) return;
    setDoc((d) => ({ ...d, nodes: [], edges: [] }));
    setSelectedNodeIds(new Set());
    setSelectedEdgeIds(new Set());
    setEditingNodeId(null);
    setEditingEdgeId(null);
    saveCanvasAsync(pacienteId, { nodes: [], edges: [], viewport }, storageKey);
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

  // ── Background events ──
  const handleBgMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.button === 0 || e.button === 1) {
      e.preventDefault();
      setPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y });
      setSelectedNodeIds(new Set());
      setSelectedEdgeIds(new Set());
      setEditingEdgeId(null);
    }
  };

  const handleBgDoubleClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    const world = screenToWorld(e.clientX, e.clientY);
    createTextNodeAt(world.x, world.y, true);
  };

  // ── Node drag/click ──
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "TEXTAREA" || tag === "INPUT" || tag === "BUTTON" || tag === "A") return;
    // Don't start drag if clicking on anchor or resize handle (those have their own handlers)
    const cls = (e.target as HTMLElement).className;
    if (typeof cls === "string" && (cls.includes("canvas-anchor") || cls.includes("canvas-resize"))) return;

    e.stopPropagation();
    const node = doc.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Shift toggle selection
    if (e.shiftKey) {
      setSelectedNodeIds((s) => {
        const ns = new Set(s);
        if (ns.has(nodeId)) ns.delete(nodeId);
        else ns.add(nodeId);
        return ns;
      });
      return;
    }

    // If not already selected, select only this node
    if (!selectedNodeIds.has(nodeId)) {
      setSelectedNodeIds(new Set([nodeId]));
    }
    setSelectedEdgeIds(new Set());

    setDraggingNode(nodeId);
    setDragStart({ x: e.clientX, y: e.clientY, nodeX: node.x, nodeY: node.y });
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, nodeId: string) => {
    const node = doc.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    if (node.type === "text" || node.type === "group") {
      e.stopPropagation();
      setEditingNodeId(nodeId);
    }
  };

  // ── Edge drag (creating new edge) ──
  const handleAnchorMouseDown = (e: React.MouseEvent, nodeId: string, side: Side) => {
    e.stopPropagation();
    e.preventDefault();
    const world = screenToWorld(e.clientX, e.clientY);
    setEdgeDrag({
      fromNodeId: nodeId,
      fromSide: side,
      currentX: world.x,
      currentY: world.y,
      hoverNodeId: null,
    });
  };

  // ── Resize ──
  const handleResizeMouseDown = (e: React.MouseEvent, nodeId: string, corner: "se" | "sw" | "ne" | "nw") => {
    e.stopPropagation();
    e.preventDefault();
    const node = doc.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setResizeState({
      nodeId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startW: node.width,
      startH: node.height,
      startX: node.x,
      startY: node.y,
      corner,
    });
  };

  // ── Global mouse handlers ──
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (panning) {
      setViewport((v) => ({ ...v, x: panStart.vx + (e.clientX - panStart.x), y: panStart.vy + (e.clientY - panStart.y) }));
      return;
    }
    if (draggingNode) {
      const dx = (e.clientX - dragStart.x) / viewport.zoom;
      const dy = (e.clientY - dragStart.y) / viewport.zoom;
      // Se há seleção múltipla, move todos
      if (selectedNodeIds.size > 1 && selectedNodeIds.has(draggingNode)) {
        const origin = doc.nodes.find((n) => n.id === draggingNode);
        if (!origin) return;
        const newX = snap(dragStart.nodeX + dx);
        const newY = snap(dragStart.nodeY + dy);
        const deltaX = newX - origin.x;
        const deltaY = newY - origin.y;
        setNodes((ns) => ns.map((n) => selectedNodeIds.has(n.id) ? { ...n, x: n.x + deltaX, y: n.y + deltaY } as CanvasNode : n));
      } else {
        updateNode(draggingNode, { x: snap(dragStart.nodeX + dx), y: snap(dragStart.nodeY + dy) } as Partial<CanvasNode>);
      }
      return;
    }
    if (resizeState) {
      const dx = (e.clientX - resizeState.startMouseX) / viewport.zoom;
      const dy = (e.clientY - resizeState.startMouseY) / viewport.zoom;
      let newW = resizeState.startW;
      let newH = resizeState.startH;
      let newX = resizeState.startX;
      let newY = resizeState.startY;
      if (resizeState.corner === "se") { newW = Math.max(MIN_NODE_WIDTH, resizeState.startW + dx); newH = Math.max(MIN_NODE_HEIGHT, resizeState.startH + dy); }
      else if (resizeState.corner === "sw") { newW = Math.max(MIN_NODE_WIDTH, resizeState.startW - dx); newH = Math.max(MIN_NODE_HEIGHT, resizeState.startH + dy); newX = resizeState.startX + (resizeState.startW - newW); }
      else if (resizeState.corner === "ne") { newW = Math.max(MIN_NODE_WIDTH, resizeState.startW + dx); newH = Math.max(MIN_NODE_HEIGHT, resizeState.startH - dy); newY = resizeState.startY + (resizeState.startH - newH); }
      else { newW = Math.max(MIN_NODE_WIDTH, resizeState.startW - dx); newH = Math.max(MIN_NODE_HEIGHT, resizeState.startH - dy); newX = resizeState.startX + (resizeState.startW - newW); newY = resizeState.startY + (resizeState.startH - newH); }
      updateNode(resizeState.nodeId, { width: snap(newW), height: snap(newH), x: snap(newX), y: snap(newY) } as Partial<CanvasNode>);
      return;
    }
    if (edgeDrag) {
      const world = screenToWorld(e.clientX, e.clientY);
      // Detect hover over a target node
      const hover = doc.nodes.find((n) =>
        n.id !== edgeDrag.fromNodeId &&
        n.type !== "group" &&
        world.x >= n.x && world.x <= n.x + n.width &&
        world.y >= n.y && world.y <= n.y + n.height
      );
      setEdgeDrag({ ...edgeDrag, currentX: world.x, currentY: world.y, hoverNodeId: hover?.id || null });
      return;
    }
  }, [panning, panStart, draggingNode, dragStart, viewport.zoom, resizeState, edgeDrag, doc.nodes, selectedNodeIds, screenToWorld, setNodes, updateNode]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (edgeDrag) {
      const world = screenToWorld(e.clientX, e.clientY);
      const fromNode = doc.nodes.find((n) => n.id === edgeDrag.fromNodeId);
      if (fromNode) {
        let targetNode = doc.nodes.find((n) =>
          n.id !== edgeDrag.fromNodeId &&
          n.type !== "group" &&
          world.x >= n.x && world.x <= n.x + n.width &&
          world.y >= n.y && world.y <= n.y + n.height
        );
        let targetSide: Side;
        if (!targetNode) {
          // Create a new text node at drop position and connect to it
          const newNode = createTextNodeAt(world.x, world.y, false);
          targetNode = newNode;
          targetSide = inferSideTowardsPoint(newNode, fromNode.x + fromNode.width / 2, fromNode.y + fromNode.height / 2);
        } else {
          targetSide = inferSideTowardsPoint(targetNode, fromNode.x + fromNode.width / 2, fromNode.y + fromNode.height / 2);
        }
        const newEdge: CanvasEdge = {
          id: uid("e"),
          fromNode: edgeDrag.fromNodeId,
          fromSide: edgeDrag.fromSide,
          toNode: targetNode.id,
          toSide: targetSide,
          toEnd: "arrow",
        };
        setEdges((es) => [...es, newEdge]);
      }
      setEdgeDrag(null);
    }
    setPanning(false);
    setDraggingNode(null);
    setResizeState(null);
  }, [edgeDrag, doc.nodes, screenToWorld, createTextNodeAt, setEdges]);

  useEffect(() => {
    if (panning || draggingNode || resizeState || edgeDrag) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [panning, draggingNode, resizeState, edgeDrag, handleMouseMove, handleMouseUp]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if focus is in an input/textarea (user is typing)
      const target = e.target as HTMLElement;
      const inField = target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable;

      // Delete/Backspace
      if ((e.key === "Delete" || e.key === "Backspace") && !inField) {
        if (selectedNodeIds.size > 0) {
          e.preventDefault();
          deleteNodes(Array.from(selectedNodeIds));
        } else if (selectedEdgeIds.size > 0) {
          e.preventDefault();
          deleteEdges(Array.from(selectedEdgeIds));
        }
        return;
      }

      // Escape: cancel edit
      if (e.key === "Escape") {
        setEditingNodeId(null);
        setEditingEdgeId(null);
        setEdgeDrag(null);
      }

      // Ctrl+A: select all
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && !inField) {
        e.preventDefault();
        setSelectedNodeIds(new Set(doc.nodes.map((n) => n.id)));
      }

      // Ctrl+D: duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && !inField && selectedNodeIds.size > 0) {
        e.preventDefault();
        const duplicates: CanvasNode[] = [];
        Array.from(selectedNodeIds).forEach((id) => {
          const n = doc.nodes.find((nn) => nn.id === id);
          if (!n) return;
          duplicates.push({ ...n, id: uid(n.type.slice(0, 1)), x: n.x + 40, y: n.y + 40 } as CanvasNode);
        });
        setNodes((ns) => [...ns, ...duplicates]);
        setSelectedNodeIds(new Set(duplicates.map((d) => d.id)));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedNodeIds, selectedEdgeIds, doc.nodes, deleteNodes, deleteEdges, setNodes]);

  // ── Zoom controls ──
  const zoomIn = () => setViewport((v) => ({ ...v, zoom: Math.min(MAX_ZOOM, v.zoom + ZOOM_STEP) }));
  const zoomOut = () => setViewport((v) => ({ ...v, zoom: Math.max(MIN_ZOOM, v.zoom - ZOOM_STEP) }));
  const fitToView = () => {
    if (doc.nodes.length === 0) { setViewport({ x: 0, y: 0, zoom: 1 }); return; }
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
    setViewport({ zoom, x: rect.width / 2 - cx * zoom, y: rect.height / 2 - cy * zoom });
  };

  const handleSave = () => {
    saveCanvasAsync(pacienteId, { ...doc, viewport }, storageKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const zoomPercent = Math.round(viewport.zoom * 100);
  const firstSelectedNode = useMemo(() => {
    if (selectedNodeIds.size === 0) return null;
    const id = Array.from(selectedNodeIds)[0];
    return doc.nodes.find((n) => n.id === id) || null;
  }, [selectedNodeIds, doc.nodes]);

  // Render preview path for edge drag
  const edgeDragPath = useMemo(() => {
    if (!edgeDrag) return null;
    const from = doc.nodes.find((n) => n.id === edgeDrag.fromNodeId);
    if (!from) return null;
    const fp = getSideCoord(from, edgeDrag.fromSide);
    // Target side: if hovering a node, use inferred; else use direction toward mouse
    let toPoint = { x: edgeDrag.currentX, y: edgeDrag.currentY };
    let toSide: Side = inferSideTowardsPoint(from, edgeDrag.currentX, edgeDrag.currentY);
    toSide = oppositeSide(toSide);
    if (edgeDrag.hoverNodeId) {
      const hover = doc.nodes.find((n) => n.id === edgeDrag.hoverNodeId);
      if (hover) {
        const hs = inferSideTowardsPoint(hover, from.x + from.width / 2, from.y + from.height / 2);
        toPoint = getSideCoord(hover, hs);
        toSide = hs;
      }
    }
    return bezierPath(fp, edgeDrag.fromSide, toPoint, toSide);
  }, [edgeDrag, doc.nodes]);

  return (
    <div className="canvas-editor-root">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button size="sm" onClick={() => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const c = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
            createTextNodeAt(c.x, c.y, true);
          }} icon={<Type size={14} />}>Texto</Button>
          <Button size="sm" variant="secondary" onClick={addLinkNode} icon={<ExternalLink size={14} />}>Link</Button>
          <Button size="sm" variant="secondary" onClick={addGroupNode} icon={<FolderOpen size={14} />}>Grupo</Button>
          <div className="w-px h-5 bg-elevated mx-1" />
          <Button size="sm" variant="secondary" onClick={handleImportFile} icon={<Upload size={14} />}>Importar .canvas</Button>
          <Button size="sm" variant="secondary" onClick={handleExport} icon={<Download size={14} />}>Exportar</Button>
          {(doc.nodes.length > 0 || doc.edges.length > 0) && (
            <Button size="sm" variant="secondary" onClick={handleClear} icon={<Eraser size={14} />}>Limpar</Button>
          )}
          <input ref={fileInputRef} type="file" accept=".canvas,application/json" className="hidden" onChange={handleFileUpload} />
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={zoomOut} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-elevated text-ink-2"><ZoomOut size={15} /></button>
          <span className="font-dm text-[11px] text-ink-2 w-10 text-center">{zoomPercent}%</span>
          <button onClick={zoomIn} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-elevated text-ink-2"><ZoomIn size={15} /></button>
          <button onClick={fitToView} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-elevated text-ink-2" title="Fit"><Maximize size={14} /></button>
          <div className="w-px h-5 bg-elevated mx-1" />
          {saved && <span className="font-dm text-xs text-emerald-500 mr-1">Salvo ✓</span>}
          <Button size="sm" variant="secondary" onClick={handleSave} icon={<Save size={14} />}>Salvar</Button>
        </div>
      </div>

      {/* Canvas viewport */}
      <div
        ref={containerRef}
        className={`relative rounded-2xl border border-line overflow-hidden min-h-[500px] h-[72vh] ${panning ? "cursor-grabbing" : "cursor-grab"}`}
        onMouseDown={handleBgMouseDown}
        onDoubleClick={handleBgDoubleClick}
        onWheel={handleWheel}
        onMouseLeave={() => setHoveredNodeId(null)}
      >
        {/* Background grid */}
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
          {/* Groups primeiro */}
          {doc.nodes.filter((n): n is GroupNode => n.type === "group").map((node) => (
            <GroupNodeView
              key={node.id}
              node={node}
              isDark={isDark}
              selected={selectedNodeIds.has(node.id)}
              editing={editingNodeId === node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onUpdate={(u) => updateNode(node.id, u)}
              onEditDone={() => setEditingNodeId(null)}
              onDelete={() => deleteNodes([node.id])}
              onResizeStart={(e, corner) => handleResizeMouseDown(e, node.id, corner)}
            />
          ))}

          {/* Edges */}
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
              const path = getEdgePathBetweenNodes(fromNode, toNode, fromSide, toSide);
              const mid = edgeMidpoint(fromNode, toNode, fromSide, toSide);
              const stroke = resolveEdgeStroke(edge.color, isDark);
              const toEnd = edge.toEnd ?? "arrow";
              const fromEnd = edge.fromEnd ?? "none";
              const isSelected = selectedEdgeIds.has(edge.id);
              return (
                <g key={edge.id} style={{ color: stroke }}>
                  <path
                    d={path}
                    stroke={stroke}
                    strokeWidth={isSelected ? 3 : 2}
                    fill="none"
                    opacity={isSelected ? 1 : 0.75}
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
                      if (e.shiftKey) {
                        setSelectedEdgeIds((s) => {
                          const ns = new Set(s);
                          if (ns.has(edge.id)) ns.delete(edge.id);
                          else ns.add(edge.id);
                          return ns;
                        });
                      } else {
                        setSelectedEdgeIds(new Set([edge.id]));
                        setSelectedNodeIds(new Set());
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingEdgeId(edge.id);
                    }}
                  />
                  {edge.label && editingEdgeId !== edge.id && (
                    <g transform={`translate(${mid.x}, ${mid.y})`} className="pointer-events-none">
                      <rect x={-Math.max(30, edge.label.length * 4)} y={-11} width={Math.max(60, edge.label.length * 8)} height={22} rx={4} fill={isDark ? "#1F2937" : "#FFFFFF"} stroke={stroke} strokeWidth={1.2} opacity={0.95} />
                      <text x={0} y={5} textAnchor="middle" fontSize={12} fill={stroke} fontFamily="DM Sans, sans-serif">{edge.label}</text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Edge drag preview */}
            {edgeDrag && edgeDragPath && (
              <g style={{ color: resolveEdgeStroke(undefined, isDark) }}>
                <path
                  d={edgeDragPath}
                  stroke={resolveEdgeStroke(undefined, isDark)}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="none"
                  opacity={0.85}
                  markerEnd="url(#canvas-arrow)"
                />
              </g>
            )}
          </svg>

          {/* Edge label input overlay (foreign object positioning) */}
          {editingEdgeId && (() => {
            const edge = doc.edges.find((e) => e.id === editingEdgeId);
            if (!edge) return null;
            const from = doc.nodes.find((n) => n.id === edge.fromNode);
            const to = doc.nodes.find((n) => n.id === edge.toNode);
            if (!from || !to) return null;
            const fromSide = edge.fromSide || inferSide(from, to);
            const toSide = edge.toSide || oppositeSide(fromSide);
            const mid = edgeMidpoint(from, to, fromSide, toSide);
            return (
              <div
                style={{
                  position: "absolute",
                  left: mid.x - 80,
                  top: mid.y - 14,
                  width: 160,
                  zIndex: 100,
                }}
              >
                <input
                  type="text"
                  defaultValue={edge.label || ""}
                  autoFocus
                  onBlur={(e) => {
                    const val = e.currentTarget.value.trim();
                    setEdges((es) => es.map((x) => x.id === editingEdgeId ? { ...x, label: val || undefined } : x));
                    setEditingEdgeId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.currentTarget as HTMLInputElement).blur();
                    } else if (e.key === "Escape") {
                      setEditingEdgeId(null);
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Label..."
                  className="w-full text-center font-dm text-[12px] px-2 py-1 rounded border shadow-md outline-none"
                  style={{
                    background: isDark ? "#1F2937" : "#FFFFFF",
                    color: isDark ? "#E5E7EB" : "#1F2937",
                    borderColor: isDark ? "#374151" : "#D1D5DB",
                  }}
                />
              </div>
            );
          })()}

          {/* Non-group nodes */}
          {doc.nodes.filter((n) => n.type !== "group").map((node) => (
            <NodeView
              key={node.id}
              node={node as Exclude<CanvasNode, GroupNode>}
              isDark={isDark}
              selected={selectedNodeIds.has(node.id)}
              isBeingDragged={draggingNode === node.id}
              editing={editingNodeId === node.id}
              hovered={hoveredNodeId === node.id}
              fileContent={node.type === "file" ? fileContents[`${node.file}${node.subpath || ""}`] : undefined}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              onUpdate={(u) => updateNode(node.id, u)}
              onEditDone={() => setEditingNodeId(null)}
              onDelete={() => deleteNodes([node.id])}
              onAnchorMouseDown={(e, side) => handleAnchorMouseDown(e, node.id, side)}
              onResizeStart={(e, corner) => handleResizeMouseDown(e, node.id, corner)}
              isEdgeDropTarget={edgeDrag?.hoverNodeId === node.id}
            />
          ))}
        </div>

        {/* Empty state */}
        {doc.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center max-w-sm">
              <p className="font-fraunces text-base text-ink-3 mb-2">Canvas vazio</p>
              <p className="font-dm text-xs text-ink-4 mb-3">
                Duplo clique para criar um bloco · Importe um arquivo .canvas do Obsidian
              </p>
              <div className="flex items-center justify-center gap-2 pointer-events-auto">
                <Button size="sm" variant="secondary" onClick={handleImportFile} icon={<Upload size={14} />}>Importar</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected node actions */}
      {firstSelectedNode && (
        <div className="mt-2 flex items-center gap-2 p-2 rounded-xl bg-elevated border border-line flex-wrap">
          <span className="font-dm text-xs text-ink-3">Cor:</span>
          {AVAILABLE_COLORS.map((c) => {
            const visual = resolveColor(c || undefined, isDark);
            return (
              <button
                key={c || "none"}
                onClick={() => {
                  selectedNodeIds.forEach((id) => updateNode(id, { color: c || undefined } as Partial<CanvasNode>));
                }}
                className="w-5 h-5 rounded-full border transition-transform hover:scale-125"
                style={{
                  backgroundColor: visual.bg,
                  borderColor: visual.border,
                  outline: (firstSelectedNode.color || "") === c ? "2px solid var(--orange-500)" : "none",
                  outlineOffset: "1px",
                }}
                title={c || "Sem cor"}
              />
            );
          })}
          <div className="w-px h-4 bg-line mx-1" />
          <span className="font-dm text-xs text-ink-4 flex-1">
            {selectedNodeIds.size > 1 ? `${selectedNodeIds.size} nós selecionados` : (
              firstSelectedNode.type === "file" ? "📄 File node" :
              firstSelectedNode.type === "link" ? "🔗 Link node" :
              firstSelectedNode.type === "text" ? "📝 Text node" :
              "📁 Group"
            )}
          </span>
          <button
            onClick={() => deleteNodes(Array.from(selectedNodeIds))}
            className="px-2 py-1 rounded-md font-dm text-[11px] font-semibold text-red-500 hover:bg-red-500/10"
            title="Delete (Del)"
          >
            <Trash2 size={12} className="inline -mt-0.5 mr-1" /> Excluir
          </button>
        </div>
      )}

      {/* Help */}
      <div className="flex items-center justify-between mt-2">
        <p className="font-dm text-xs text-ink-4">
          Duplo clique: novo bloco · Hover em um bloco: arraste uma âncora para conectar · Duplo clique num bloco: editar · Duplo clique numa seta: label · Del: excluir · Ctrl+D: duplicar
        </p>
        {isElectron() && (
          <p className="font-dm text-[10px] text-ink-4 italic">Obsidian vault (.canvas)</p>
        )}
      </div>

      {/* Styles for markdown render */}
      <style jsx>{`
        .canvas-editor-root :global(.md-h1) { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 700; margin: 6px 0 4px; line-height: 1.2; }
        .canvas-editor-root :global(.md-h2) { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 700; margin: 6px 0 4px; line-height: 1.25; }
        .canvas-editor-root :global(.md-h3) { font-family: 'Fraunces', serif; font-size: 15px; font-weight: 700; margin: 5px 0 3px; line-height: 1.3; }
        .canvas-editor-root :global(.md-h4) { font-family: 'Fraunces', serif; font-size: 13px; font-weight: 700; margin: 4px 0 2px; text-transform: none; line-height: 1.3; }
        .canvas-editor-root :global(.md-h5) { font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700; margin: 4px 0 2px; text-transform: uppercase; letter-spacing: 0.04em; }
        .canvas-editor-root :global(.md-h6) { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700; margin: 3px 0 1px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.75; }
        .canvas-editor-root :global(.md-p) { font-size: 12.5px; line-height: 1.55; margin: 3px 0; }
        .canvas-editor-root :global(.md-ul), .canvas-editor-root :global(.md-ol) { margin: 3px 0 3px 18px; padding: 0; }
        .canvas-editor-root :global(.md-ul li) { list-style: disc; font-size: 12.5px; line-height: 1.5; margin: 1px 0; }
        .canvas-editor-root :global(.md-ol li) { list-style: decimal; font-size: 12.5px; line-height: 1.5; margin: 1px 0; }
        .canvas-editor-root :global(.md-quote) { border-left: 3px solid currentColor; padding-left: 10px; opacity: 0.75; font-style: italic; margin: 4px 0; font-size: 12.5px; }
        .canvas-editor-root :global(.md-hr) { border: none; border-top: 1px solid currentColor; opacity: 0.2; margin: 6px 0; }
        .canvas-editor-root :global(.md-code) { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11.5px; padding: 1px 4px; border-radius: 3px; background: rgba(127,127,127,0.15); }
        .canvas-editor-root :global(.md-pre) { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; padding: 8px; border-radius: 6px; background: rgba(127,127,127,0.12); overflow-x: auto; margin: 4px 0; }
        .canvas-editor-root :global(.md-pre code) { background: none; padding: 0; font-size: inherit; }
        .canvas-editor-root :global(.md-link) { color: var(--orange-500, #C84B31); text-decoration: underline; }
        .canvas-editor-root :global(.md-wikilink) { color: var(--orange-500, #C84B31); }
        .canvas-editor-root :global(.md-check) { display: flex; align-items: center; gap: 6px; font-size: 12.5px; margin: 2px 0; }
        .canvas-editor-root :global(.md-check input) { margin: 0; }
        .canvas-editor-root :global(.canvas-anchor) { position: absolute; width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--orange-500, #C84B31); background: white; cursor: crosshair; z-index: 40; transition: transform 0.1s ease; }
        .canvas-editor-root :global(.canvas-anchor:hover) { transform: scale(1.3); }
        .canvas-editor-root :global(.canvas-resize) { position: absolute; width: 14px; height: 14px; z-index: 40; cursor: nwse-resize; }
        .canvas-editor-root :global(.canvas-resize.ne), .canvas-editor-root :global(.canvas-resize.sw) { cursor: nesw-resize; }
      `}</style>
    </div>
  );
}

// ─── NodeView ───────────────────────────────────────

function NodeView({
  node, isDark, selected, isBeingDragged, editing, hovered, fileContent,
  onMouseDown, onDoubleClick, onMouseEnter, onMouseLeave,
  onUpdate, onEditDone, onDelete,
  onAnchorMouseDown, onResizeStart,
  isEdgeDropTarget,
}: {
  node: Exclude<CanvasNode, GroupNode>;
  isDark: boolean;
  selected: boolean;
  isBeingDragged: boolean;
  editing: boolean;
  hovered: boolean;
  fileContent?: string;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onUpdate: (u: Partial<CanvasNode>) => void;
  onEditDone: () => void;
  onDelete: () => void;
  onAnchorMouseDown: (e: React.MouseEvent, side: Side) => void;
  onResizeStart: (e: React.MouseEvent, corner: "se" | "sw" | "ne" | "nw") => void;
  isEdgeDropTarget: boolean;
}) {
  const colors = resolveColor(node.color, isDark);
  const showAnchors = hovered || selected || isEdgeDropTarget;

  return (
    <div
      className="absolute rounded-xl border select-none overflow-visible"
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        backgroundColor: colors.bg,
        borderColor: isEdgeDropTarget ? "var(--orange-500, #C84B31)" : selected ? "var(--orange-500, #C84B31)" : colors.border,
        borderWidth: selected || isEdgeDropTarget ? 2 : 1,
        boxShadow: isBeingDragged ? "0 10px 30px rgba(0,0,0,0.2)" : selected ? "0 4px 15px rgba(0,0,0,0.1)" : "0 1px 3px rgba(0,0,0,0.05)",
        zIndex: isBeingDragged ? 50 : selected ? 20 : 10,
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Inner content wrapper (rounded, overflow hidden for content) */}
      <div className="relative w-full h-full rounded-xl overflow-hidden">
        {/* Content by type */}
        {node.type === "text" && !editing && (
          <div
            className="px-4 py-3 w-full h-full overflow-auto"
            style={{ color: isDark ? "#E5E7EB" : "#1F2937" }}
          >
            {node.text.trim() ? (
              <div
                className="canvas-md-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(node.text) }}
              />
            ) : (
              <p className="font-dm text-[12.5px] opacity-40 italic">Duplo-clique para editar</p>
            )}
          </div>
        )}

        {node.type === "text" && editing && (
          <textarea
            autoFocus
            value={node.text}
            onChange={(e) => onUpdate({ text: e.target.value } as Partial<CanvasNode>)}
            onBlur={onEditDone}
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); onEditDone(); }
            }}
            placeholder="Markdown suportado: **bold**, # heading, - lista, [link](url)..."
            className="w-full h-full px-4 py-3 bg-transparent font-dm text-[13px] leading-relaxed outline-none resize-none placeholder:opacity-30"
            style={{ color: isDark ? "#E8E8E8" : "#1A1A1A" }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        )}

        {node.type === "file" && (
          <div className="flex flex-col w-full h-full">
            <div
              className="flex items-center gap-2 px-3 py-2 text-[10px] font-medium"
              style={{
                borderBottom: `1px solid ${colors.border}`,
                color: isDark ? "#9CA3AF" : "#6B7280",
                background: "rgba(0,0,0,0.02)",
              }}
            >
              <FileText size={12} />
              <span className="truncate">
                {node.file.split("/").pop()?.replace(/\.md$/, "")}
                {node.subpath && <span className="opacity-60"> {node.subpath}</span>}
              </span>
            </div>
            <div
              className="px-4 py-3 overflow-auto flex-1"
              style={{ color: isDark ? "#D1D5DB" : "#374151" }}
              onMouseDown={(e) => { if ((e.target as HTMLElement).tagName !== "A") e.stopPropagation(); }}
            >
              {fileContent ? (
                <div className="canvas-md-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(fileContent) }} />
              ) : (
                <p className="font-dm text-[12px] opacity-60 italic">
                  {node.file}
                </p>
              )}
            </div>
          </div>
        )}

        {node.type === "link" && (
          <div className="flex flex-col w-full h-full">
            <div
              className="flex items-center gap-2 px-3 py-2 text-[10px]"
              style={{
                borderBottom: `1px solid ${colors.border}`,
                color: isDark ? "#9CA3AF" : "#6B7280",
                background: "rgba(0,0,0,0.02)",
              }}
            >
              <ExternalLink size={12} />
              <a
                href={node.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate underline hover:text-orange-500"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {node.url}
              </a>
            </div>
            <iframe
              src={node.url}
              className="flex-1 border-0"
              sandbox="allow-same-origin allow-scripts"
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>

      {/* Delete button (top-right, visible on hover) */}
      {(hovered || selected) && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md z-30"
          style={{ background: "#EF4444", color: "white" }}
          title="Excluir (Del)"
        >
          <Trash2 size={10} />
        </button>
      )}

      {/* Anchor points (hover) */}
      {showAnchors && (
        <>
          <div
            className="canvas-anchor"
            style={{ left: "50%", top: -7, transform: "translateX(-50%)" }}
            onMouseDown={(e) => onAnchorMouseDown(e, "top")}
            title="Arraste para conectar"
          />
          <div
            className="canvas-anchor"
            style={{ right: -7, top: "50%", transform: "translateY(-50%)" }}
            onMouseDown={(e) => onAnchorMouseDown(e, "right")}
            title="Arraste para conectar"
          />
          <div
            className="canvas-anchor"
            style={{ left: "50%", bottom: -7, transform: "translateX(-50%)" }}
            onMouseDown={(e) => onAnchorMouseDown(e, "bottom")}
            title="Arraste para conectar"
          />
          <div
            className="canvas-anchor"
            style={{ left: -7, top: "50%", transform: "translateY(-50%)" }}
            onMouseDown={(e) => onAnchorMouseDown(e, "left")}
            title="Arraste para conectar"
          />
        </>
      )}

      {/* Resize handles (on hover/selected) */}
      {(hovered || selected) && (
        <>
          <div className="canvas-resize nw" style={{ left: -4, top: -4, cursor: "nwse-resize" }} onMouseDown={(e) => onResizeStart(e, "nw")} />
          <div className="canvas-resize ne" style={{ right: -4, top: -4, cursor: "nesw-resize" }} onMouseDown={(e) => onResizeStart(e, "ne")} />
          <div className="canvas-resize sw" style={{ left: -4, bottom: -4, cursor: "nesw-resize" }} onMouseDown={(e) => onResizeStart(e, "sw")} />
          <div className="canvas-resize se" style={{ right: -4, bottom: -4, cursor: "nwse-resize" }} onMouseDown={(e) => onResizeStart(e, "se")} />
        </>
      )}
    </div>
  );
}

// ─── GroupNodeView ──────────────────────────────────

function GroupNodeView({
  node, isDark, selected, editing,
  onMouseDown, onDoubleClick, onMouseEnter, onMouseLeave,
  onUpdate, onEditDone, onDelete, onResizeStart,
}: {
  node: GroupNode;
  isDark: boolean;
  selected: boolean;
  editing: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onUpdate: (u: Partial<CanvasNode>) => void;
  onEditDone: () => void;
  onDelete: () => void;
  onResizeStart: (e: React.MouseEvent, corner: "se" | "sw" | "ne" | "nw") => void;
}) {
  const colors = resolveColor(node.color, isDark);
  return (
    <div
      className="absolute rounded-2xl border-2 border-dashed select-none"
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        borderColor: selected ? "var(--orange-500, #C84B31)" : colors.border,
        backgroundColor: `${colors.bg}40`,
        zIndex: 1,
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-center justify-between px-3 py-2">
        {editing ? (
          <input
            autoFocus
            type="text"
            value={node.label || ""}
            onChange={(e) => onUpdate({ label: e.target.value } as Partial<CanvasNode>)}
            onBlur={onEditDone}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") onEditDone(); }}
            className="flex-1 bg-transparent font-fraunces text-[15px] font-bold outline-none"
            style={{ color: isDark ? "#E5E7EB" : "#1F2937" }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="font-fraunces text-[15px] font-bold" style={{ color: isDark ? "#E5E7EB" : "#1F2937" }}>
            {node.label || "Grupo"}
          </span>
        )}
        {selected && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-0.5"
            style={{ color: "#EF4444" }}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Resize handle SE */}
      {selected && (
        <div className="canvas-resize se" style={{ right: -4, bottom: -4, cursor: "nwse-resize" }} onMouseDown={(e) => onResizeStart(e, "se")} />
      )}
    </div>
  );
}
