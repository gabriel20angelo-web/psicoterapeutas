"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, Link2, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import Button from "@/components/ui/Button";
import { getPaciente } from "@/lib/data";

// ─── Types (JSON Canvas / Obsidian compatible) ───

interface CanvasNode {
  id: string;
  type: "text";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: number;
}

interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
}

interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

interface CanvasFile {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: CanvasViewport;
}

// Obsidian .canvas format types
interface ObsidianNode {
  id: string;
  type: "text";
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

interface ObsidianEdge {
  id: string;
  fromNode: string;
  fromSide: "right" | "left" | "top" | "bottom";
  toNode: string;
  toSide: "right" | "left" | "top" | "bottom";
}

interface ObsidianCanvas {
  nodes: ObsidianNode[];
  edges: ObsidianEdge[];
}

// ─── Constants ───

const NODE_COLORS = [
  { bg: "#FFFFFF", dark: "#252525", border: "#E5DFD3", darkBorder: "#444", label: "Neutro" },
  { bg: "#F0FDFA", dark: "#0D3B36", border: "#99F6E4", darkBorder: "#115E59", label: "Teal" },
  { bg: "#FFFBEB", dark: "#3B2506", border: "#FDE68A", darkBorder: "#92400E", label: "Âmbar" },
  { bg: "#FAF5FF", dark: "#2E1065", border: "#E9D5FF", darkBorder: "#581C87", label: "Roxo" },
  { bg: "#FEF2F2", dark: "#450A0A", border: "#FECACA", darkBorder: "#991B1B", label: "Vermelho" },
  { bg: "#EFF6FF", dark: "#172554", border: "#BFDBFE", darkBorder: "#1E3A5F", label: "Azul" },
];

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const GRID_SIZE = 20;
const DEFAULT_WIDTH = 240;
const DEFAULT_HEIGHT = 120;

const EMPTY_CANVAS: CanvasFile = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };

// ─── Obsidian ↔ App format conversion ───

function obsidianToApp(obs: ObsidianCanvas): CanvasFile {
  return {
    nodes: obs.nodes.map(n => ({
      id: n.id, type: "text" as const,
      x: n.x, y: n.y, width: n.width, height: n.height,
      content: n.text || "",
      color: n.color ? parseInt(n.color, 10) || 0 : 0,
    })),
    edges: obs.edges.map(e => ({
      id: e.id, fromNode: e.fromNode, toNode: e.toNode,
    })),
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

function appToObsidian(app: CanvasFile): ObsidianCanvas {
  const nodesMap = new Map(app.nodes.map(n => [n.id, n]));
  return {
    nodes: app.nodes.map(n => ({
      id: n.id, type: "text" as const,
      text: n.content,
      x: n.x, y: n.y, width: n.width, height: n.height,
      ...(n.color > 0 ? { color: String(n.color) } : {}),
    })),
    edges: app.edges.map(e => {
      const from = nodesMap.get(e.fromNode);
      const to = nodesMap.get(e.toNode);
      const { fromSide, toSide } = computeSides(from, to);
      return { id: e.id, fromNode: e.fromNode, fromSide, toNode: e.toNode, toSide };
    }),
  };
}

function computeSides(from?: CanvasNode, to?: CanvasNode): { fromSide: "right" | "left" | "top" | "bottom"; toSide: "right" | "left" | "top" | "bottom" } {
  if (!from || !to) return { fromSide: "right", toSide: "left" };
  const dx = (to.x + to.width / 2) - (from.x + from.width / 2);
  const dy = (to.y + to.height / 2) - (from.y + from.height / 2);
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? { fromSide: "right", toSide: "left" } : { fromSide: "left", toSide: "right" };
  }
  return dy > 0 ? { fromSide: "bottom", toSide: "top" } : { fromSide: "top", toSide: "bottom" };
}

// ─── Storage: Obsidian-first, localStorage fallback ───

function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI;
}

function sanitizeName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

async function getCanvasPath(pacienteId: string): Promise<string | null> {
  if (!isElectron()) return null;
  const paciente = getPaciente(pacienteId);
  if (!paciente) return null;
  const vaultPath = await window.electronAPI!.vault.getPath();
  return `${vaultPath}/${sanitizeName(paciente.nome)}/Canvas.canvas`;
}

async function loadCanvasAsync(pacienteId: string): Promise<CanvasFile> {
  if (isElectron()) {
    const filePath = await getCanvasPath(pacienteId);
    if (filePath) {
      const raw = await window.electronAPI!.fs.readFile(filePath);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          // Obsidian format uses "text", app uses "content"
          if (parsed.nodes?.[0]?.text !== undefined || (parsed.nodes?.length === 0 && parsed.edges)) {
            return obsidianToApp(parsed);
          }
          // Already in app format (legacy localStorage export)
          if (parsed.viewport) return parsed;
          return obsidianToApp(parsed);
        } catch {}
      }
    }
  }
  // Fallback: localStorage
  const key = `allos-canvas-${pacienteId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return EMPTY_CANVAS;
    const parsed = JSON.parse(raw);
    if (parsed.blocks) {
      return {
        nodes: parsed.blocks.map((b: any) => ({
          id: b.id, type: "text" as const, x: b.x, y: b.y,
          width: b.width || DEFAULT_WIDTH, height: DEFAULT_HEIGHT,
          content: b.content || "", color: typeof b.color === "number" ? b.color : 0,
        })),
        edges: (parsed.connections || []).map((c: any) => ({ id: c.id, fromNode: c.from, toNode: c.to })),
        viewport: { x: 0, y: 0, zoom: 1 },
      };
    }
    return parsed;
  } catch { return EMPTY_CANVAS; }
}

async function saveCanvasAsync(pacienteId: string, data: CanvasFile): Promise<void> {
  if (isElectron()) {
    const filePath = await getCanvasPath(pacienteId);
    if (filePath) {
      const obsidian = appToObsidian(data);
      await window.electronAPI!.fs.writeFile(filePath, JSON.stringify(obsidian, null, 2));
      return;
    }
  }
  // Fallback
  localStorage.setItem(`allos-canvas-${pacienteId}`, JSON.stringify(data));
}

// ─── Bezier path between two node edges ───

function getEdgePath(from: CanvasNode, to: CanvasNode): string {
  const fromCx = from.x + from.width / 2;
  const fromCy = from.y + from.height / 2;
  const toCx = to.x + to.width / 2;
  const toCy = to.y + to.height / 2;

  // Determine which edge to exit/enter from
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;

  let fx: number, fy: number, tx: number, ty: number;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection
    if (dx > 0) {
      fx = from.x + from.width; fy = fromCy;
      tx = to.x; ty = toCy;
    } else {
      fx = from.x; fy = fromCy;
      tx = to.x + to.width; ty = toCy;
    }
    const cpOffset = Math.min(Math.abs(dx) * 0.5, 120);
    return `M ${fx} ${fy} C ${fx + (dx > 0 ? cpOffset : -cpOffset)} ${fy}, ${tx + (dx > 0 ? -cpOffset : cpOffset)} ${ty}, ${tx} ${ty}`;
  } else {
    // Vertical connection
    if (dy > 0) {
      fx = fromCx; fy = from.y + from.height;
      tx = toCx; ty = to.y;
    } else {
      fx = fromCx; fy = from.y;
      tx = toCx; ty = to.y + to.height;
    }
    const cpOffset = Math.min(Math.abs(dy) * 0.5, 120);
    return `M ${fx} ${fy} C ${fx} ${fy + (dy > 0 ? cpOffset : -cpOffset)}, ${tx} ${ty + (dy > 0 ? -cpOffset : cpOffset)}, ${tx} ${ty}`;
  }
}

// ─── Component ───

interface CanvasEditorProps {
  pacienteId: string;
  storageKey?: string;
}

export default function CanvasEditor({ pacienteId, storageKey }: CanvasEditorProps) {
  const [canvas, setCanvas] = useState<CanvasFile>(EMPTY_CANVAS);
  const [viewport, setViewport] = useState<CanvasViewport>({ x: 0, y: 0, zoom: 1 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 });
  const [connecting, setConnecting] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCanvasAsync(pacienteId).then(loaded => {
      if (!cancelled) {
        setCanvas(loaded);
        setViewport(loaded.viewport);
      }
    });
    return () => { cancelled = true; };
  }, [pacienteId]);

  useEffect(() => {
    const html = document.documentElement;
    const update = () => setIsDark(html.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Auto-save debounced (1.5s after last change)
  useEffect(() => {
    if (canvas.nodes.length === 0 && canvas.edges.length === 0) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      saveCanvasAsync(pacienteId, { ...canvas, viewport });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [canvas, viewport, pacienteId]);

  // ── Auto-save viewport into canvas state ──
  const canvasWithViewport = useCallback((): CanvasFile => ({
    ...canvas,
    viewport,
  }), [canvas, viewport]);

  const handleSave = () => {
    saveCanvasAsync(pacienteId, canvasWithViewport());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── Node CRUD ──

  const addNode = () => {
    // Place new node at center of current viewport
    const cx = (-viewport.x + 400) / viewport.zoom;
    const cy = (-viewport.y + 250) / viewport.zoom;
    const node: CanvasNode = {
      id: `n-${Date.now()}`,
      type: "text",
      x: cx - DEFAULT_WIDTH / 2,
      y: cy - DEFAULT_HEIGHT / 2,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      content: "",
      color: 0,
    };
    setCanvas(c => ({ ...c, nodes: [...c.nodes, node] }));
  };

  const updateNode = (id: string, updates: Partial<CanvasNode>) => {
    setCanvas(c => ({ ...c, nodes: c.nodes.map(n => n.id === id ? { ...n, ...updates } : n) }));
  };

  const deleteNode = (id: string) => {
    setCanvas(c => ({
      nodes: c.nodes.filter(n => n.id !== id),
      edges: c.edges.filter(e => e.fromNode !== id && e.toNode !== id),
      viewport: c.viewport,
    }));
  };

  const deleteEdge = (id: string) => {
    setCanvas(c => ({ ...c, edges: c.edges.filter(e => e.id !== id) }));
  };

  // ── Zoom ──

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return; // let regular scroll pass through
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setViewport(v => {
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

  // ── Pan (middle click or space+drag on background) ──

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Middle click or left click on background
    if (e.button === 1 || (e.button === 0 && e.target === e.currentTarget)) {
      e.preventDefault();
      setPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (panning) {
      setViewport(v => ({
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
      });
    }
  }, [panning, panStart, draggingNode, dragStart, viewport.zoom]);

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

  // ── Node drag ──

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if ((e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).tagName === "BUTTON") return;
    e.stopPropagation();
    const node = canvas.nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDraggingNode(nodeId);
    setDragStart({ x: e.clientX, y: e.clientY, nodeX: node.x, nodeY: node.y });
  };

  // ── Connection ──

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    if (!connecting) return;
    e.stopPropagation();
    if (connecting === "__start__") {
      setConnecting(nodeId);
    } else if (connecting !== nodeId) {
      setCanvas(c => ({
        ...c,
        edges: [...c.edges, { id: `e-${Date.now()}`, fromNode: connecting, toNode: nodeId }],
      }));
      setConnecting(null);
    }
  };

  // ── Zoom controls ──
  const zoomIn = () => setViewport(v => ({ ...v, zoom: Math.min(MAX_ZOOM, v.zoom + ZOOM_STEP) }));
  const zoomOut = () => setViewport(v => ({ ...v, zoom: Math.max(MIN_ZOOM, v.zoom - ZOOM_STEP) }));
  const resetView = () => setViewport({ x: 0, y: 0, zoom: 1 });

  const zoomPercent = Math.round(viewport.zoom * 100);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={addNode} icon={<Plus size={14} />}>Novo bloco</Button>
          <Button
            size="sm"
            variant={connecting ? "primary" : "secondary"}
            onClick={() => setConnecting(connecting ? null : "__start__")}
            icon={<Link2 size={14} />}
          >
            {connecting ? "Selecione os blocos..." : "Conectar"}
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={zoomOut} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-elevated text-ink-2"><ZoomOut size={15} /></button>
          <span className="font-dm text-[11px] text-ink-2 w-10 text-center">{zoomPercent}%</span>
          <button onClick={zoomIn} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-elevated text-ink-2"><ZoomIn size={15} /></button>
          <button onClick={resetView} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-elevated text-ink-2" title="Resetar zoom"><Maximize size={14} /></button>
          <div className="w-px h-5 bg-elevated mx-1" />
          {saved && <span className="font-dm text-xs text-emerald-500 mr-1">Salvo ✓</span>}
          <Button size="sm" variant="secondary" onClick={handleSave} icon={<Save size={14} />}>Salvar</Button>
        </div>
      </div>

      {/* Canvas viewport */}
      <div
        ref={containerRef}
        className={`relative rounded-2xl border border-line overflow-hidden min-h-[400px] h-[60vh] ${panning ? "cursor-grabbing" : connecting ? "cursor-crosshair" : "cursor-grab"}`}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleWheel}
      >
        {/* Background grid (fixed to viewport) */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: viewport.x % (GRID_SIZE * viewport.zoom),
            top: viewport.y % (GRID_SIZE * viewport.zoom),
            right: 0, bottom: 0,
            width: "200%", height: "200%",
            backgroundImage: isDark
              ? "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)"
              : "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
            backgroundSize: `${GRID_SIZE * viewport.zoom}px ${GRID_SIZE * viewport.zoom}px`,
          }}
        />

        {/* Transform layer */}
        <div
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
            left: 0, top: 0,
            width: 0, height: 0, // children use absolute positioning
          }}
        >
          {/* SVG edges layer */}
          <svg
            className="absolute overflow-visible pointer-events-none"
            style={{ left: 0, top: 0, width: 1, height: 1, zIndex: 1 }}
          >
            <defs>
              <marker id="canvas-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,3 L0,6" fill="#C84B31" />
              </marker>
            </defs>
            {canvas.edges.map(edge => {
              const fromNode = canvas.nodes.find(n => n.id === edge.fromNode);
              const toNode = canvas.nodes.find(n => n.id === edge.toNode);
              if (!fromNode || !toNode) return null;
              const path = getEdgePath(fromNode, toNode);
              return (
                <g key={edge.id}>
                  <path d={path} stroke="#C84B31" strokeWidth={2} fill="none" markerEnd="url(#canvas-arrow)" opacity={0.5} />
                  {/* Invisible hit area for click-to-delete */}
                  <path d={path} stroke="transparent" strokeWidth={14} fill="none" className="pointer-events-auto cursor-pointer" onClick={() => deleteEdge(edge.id)} />
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {canvas.nodes.map(node => {
            const c = NODE_COLORS[node.color] || NODE_COLORS[0];
            const isBeingDragged = draggingNode === node.id;
            return (
              <div
                key={node.id}
                className={`absolute rounded-xl border select-none transition-shadow ${isBeingDragged ? "shadow-xl" : "shadow-sm hover:shadow-md"}`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  minHeight: node.height,
                  backgroundColor: isDark ? c.dark : c.bg,
                  borderColor: isDark ? c.darkBorder : c.border,
                  zIndex: isBeingDragged ? 50 : 10,
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onClick={(e) => connecting && handleNodeClick(e, node.id)}
              >
                {/* Handle bar */}
                <div
                  className="flex items-center justify-between px-2.5 py-1.5 cursor-move"
                  style={{ borderBottom: `1px solid ${isDark ? c.darkBorder : c.border}` }}
                >
                  <div className="flex items-center gap-1.5">
                    {NODE_COLORS.map((nc, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); updateNode(node.id, { color: i }); }}
                        className="w-3.5 h-3.5 rounded-full border transition-transform hover:scale-125"
                        style={{
                          backgroundColor: isDark ? nc.dark : nc.bg,
                          borderColor: isDark ? nc.darkBorder : nc.border,
                          outline: node.color === i ? "2px solid #C84B31" : "none",
                          outlineOffset: "1px",
                        }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                    className="text-ink-4 hover:text-red-400 transition-colors p-0.5"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {/* Text content */}
                <textarea
                  value={node.content}
                  onChange={(e) => updateNode(node.id, { content: e.target.value })}
                  placeholder="Digite aqui..."
                  className="w-full px-3 py-2.5 bg-transparent font-dm text-[13px] leading-relaxed outline-none resize-y placeholder:opacity-30"
                  style={{
                    color: isDark ? "#E8E8E8" : "#1A1A1A",
                    minHeight: 60,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {canvas.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="font-dm text-sm text-ink-4 mb-1">Canvas vazio</p>
              <p className="font-dm text-xs text-ink-4">Adicione blocos e conecte-os para mapear o caso</p>
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

      {/* Help text */}
      <div className="flex items-center justify-between mt-2">
        <p className="font-dm text-xs text-ink-4">
          Scroll para zoom · Clique e arraste o fundo para navegar · Clique numa conexão para excluí-la
        </p>
      </div>
    </div>
  );
}
