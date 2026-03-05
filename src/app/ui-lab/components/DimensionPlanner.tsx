"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useUILab, useUILabActions } from "@/lib/ui-lab/UILabContext";
import { generateWithRefs } from "@/lib/ui-lab/api";
import { Button } from "@shawnderland/ui/Button";
import { Input } from "@shawnderland/ui/Input";
import { Select } from "@shawnderland/ui/Select";
import {
  Plus,
  Trash2,
  Copy,
  ClipboardPaste,
  Grid3X3,
  Eye,
  EyeOff,
  Download,
  Undo2,
  Redo2,
  Lock,
  Unlock,
  Sparkles,
  LayoutGrid,
} from "lucide-react";

/* ─── Types ─── */

interface DimBox {
  id: string;
  name: string;
  type: "background" | "button" | "icon" | "text" | "ui";
  description: string;
  prompt: string;
  displayText: string;
  x: number;
  y: number;
  w: number;
  h: number;
  pinned: boolean;
  image: string | null;
  variants: string[];
  variantIndex: number;
  styleSource: boolean;
}

interface DPState {
  canvasW: number;
  canvasH: number;
  boxes: DimBox[];
  selectedId: string | null;
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  snapSize: number;
  cleanView: boolean;
  bgImage: string | null;
  bgLocked: boolean;
}

type UndoEntry = { boxes: DimBox[]; bgImage: string | null };

const BOX_TYPES = [
  { value: "background", label: "Background" },
  { value: "button", label: "Button" },
  { value: "icon", label: "Icon" },
  { value: "text", label: "Text" },
  { value: "ui", label: "UI" },
];

const COLORS: Record<string, string> = {
  background: "#4a7a4a",
  button: "#5e9eff",
  icon: "#e8b84a",
  text: "#c88eff",
  ui: "#f06060",
};

let _nextId = 1;
function uid() {
  return `box_${_nextId++}_${Date.now()}`;
}

function snapVal(v: number, snap: number, enabled: boolean) {
  return enabled ? Math.round(v / snap) * snap : v;
}

/* ─── Component ─── */

export default function DimensionPlanner() {
  const { state: uiLabState } = useUILab();
  const uiLabActions = useUILabActions();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dp, setDp] = useState<DPState>({
    canvasW: 1280,
    canvasH: 720,
    boxes: [],
    selectedId: null,
    showGrid: false,
    gridSize: 32,
    snapToGrid: false,
    snapSize: 8,
    cleanView: false,
    bgImage: null,
    bgLocked: true,
  });

  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);
  const [editingW, setEditingW] = useState("");
  const [editingH, setEditingH] = useState("");
  const [drawMode, setDrawMode] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const dragRef = useRef<{
    type: "move" | "draw" | "resize" | "pan";
    boxId?: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW?: number;
    origH?: number;
    panStartX?: number;
    panStartY?: number;
    handle?: string;
  } | null>(null);

  /* ─── Helpers ─── */

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => {
      const entry = { boxes: dp.boxes.map((b) => ({ ...b, variants: [...b.variants] })), bgImage: dp.bgImage };
      const next = [...prev, entry];
      if (next.length > 50) next.shift();
      return next;
    });
    setRedoStack([]);
  }, [dp.boxes, dp.bgImage]);

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const stack = [...prev];
      const entry = stack.pop()!;
      setRedoStack((r) => [...r, { boxes: dp.boxes.map((b) => ({ ...b })), bgImage: dp.bgImage }]);
      setDp((s) => ({ ...s, boxes: entry.boxes, bgImage: entry.bgImage }));
      return stack;
    });
  }, [dp.boxes, dp.bgImage]);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const stack = [...prev];
      const entry = stack.pop()!;
      setUndoStack((u) => [...u, { boxes: dp.boxes.map((b) => ({ ...b })), bgImage: dp.bgImage }]);
      setDp((s) => ({ ...s, boxes: entry.boxes, bgImage: entry.bgImage }));
      return stack;
    });
  }, [dp.boxes, dp.bgImage]);

  const selectedBox = useMemo(
    () => dp.boxes.find((b) => b.id === dp.selectedId) ?? null,
    [dp.boxes, dp.selectedId],
  );

  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [zoom, pan],
  );

  /* ─── Canvas rendering ─── */

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Canvas background
    ctx.fillStyle = "#2a2a3a";
    ctx.fillRect(0, 0, dp.canvasW, dp.canvasH);

    // Grid
    if (dp.showGrid && !dp.cleanView) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= dp.canvasW; x += dp.gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, dp.canvasH);
        ctx.stroke();
      }
      for (let y = 0; y <= dp.canvasH; y += dp.gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(dp.canvasW, y);
        ctx.stroke();
      }
    }

    // Background image
    if (dp.bgImage) {
      const img = new Image();
      img.src = dp.bgImage;
      if (img.complete) {
        ctx.drawImage(img, 0, 0, dp.canvasW, dp.canvasH);
      }
    }

    // Boxes
    for (const box of dp.boxes) {
      const color = COLORS[box.type] || "#5e9eff";

      // Box image variant
      const displayImg = box.variants[box.variantIndex] ?? box.image;
      if (displayImg) {
        const img = new Image();
        img.src = displayImg.startsWith("data:") ? displayImg : `data:image/png;base64,${displayImg}`;
        if (img.complete) {
          ctx.drawImage(img, box.x, box.y, box.w, box.h);
        }
      }

      if (!dp.cleanView) {
        // Border
        ctx.strokeStyle = box.id === dp.selectedId ? "#ffffff" : color;
        ctx.lineWidth = box.id === dp.selectedId ? 2 : 1;
        ctx.setLineDash(box.pinned ? [4, 4] : []);
        ctx.strokeRect(box.x, box.y, box.w, box.h);
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = color;
        ctx.font = "bold 10px system-ui";
        const label = `${box.name} [${box.type}]`;
        ctx.fillText(label, box.x + 3, box.y - 4);

        // Dimensions
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "9px monospace";
        ctx.fillText(`${box.w}×${box.h}`, box.x + box.w - 50, box.y + box.h - 4);

        // Display text
        if (box.displayText) {
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.font = "11px system-ui";
          ctx.fillText(box.displayText, box.x + 4, box.y + 16);
        }

        // Style source indicator
        if (box.styleSource) {
          ctx.fillStyle = "#f06060";
          ctx.beginPath();
          ctx.arc(box.x + box.w - 6, box.y + 6, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Selection handles
        if (box.id === dp.selectedId) {
          const handles = [
            [box.x, box.y],
            [box.x + box.w, box.y],
            [box.x, box.y + box.h],
            [box.x + box.w, box.y + box.h],
          ];
          ctx.fillStyle = "#ffffff";
          for (const [hx, hy] of handles) {
            ctx.fillRect(hx - 3, hy - 3, 6, 6);
          }
        }
      }
    }

    ctx.restore();
  }, [dp, zoom, pan]);

  useEffect(() => {
    render();
  }, [render]);

  /* ─── Mouse handlers ─── */

  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      const pos = toCanvas(e.clientX, e.clientY);

      // Middle mouse: pan
      if (e.button === 1) {
        e.preventDefault();
        dragRef.current = {
          type: "pan",
          startX: e.clientX,
          startY: e.clientY,
          origX: pan.x,
          origY: pan.y,
        };
        return;
      }

      if (e.button !== 0) return;

      // Check if clicking resize handle on selected box
      if (selectedBox) {
        const handles = [
          { name: "tl", x: selectedBox.x, y: selectedBox.y },
          { name: "tr", x: selectedBox.x + selectedBox.w, y: selectedBox.y },
          { name: "bl", x: selectedBox.x, y: selectedBox.y + selectedBox.h },
          { name: "br", x: selectedBox.x + selectedBox.w, y: selectedBox.y + selectedBox.h },
        ];
        for (const h of handles) {
          if (Math.abs(pos.x - h.x) < 8 && Math.abs(pos.y - h.y) < 8) {
            pushUndo();
            dragRef.current = {
              type: "resize",
              boxId: selectedBox.id,
              startX: pos.x,
              startY: pos.y,
              origX: selectedBox.x,
              origY: selectedBox.y,
              origW: selectedBox.w,
              origH: selectedBox.h,
              handle: h.name,
            };
            return;
          }
        }
      }

      // Check if clicking a box (reverse order for z-stack)
      for (let i = dp.boxes.length - 1; i >= 0; i--) {
        const box = dp.boxes[i];
        if (
          pos.x >= box.x &&
          pos.x <= box.x + box.w &&
          pos.y >= box.y &&
          pos.y <= box.y + box.h
        ) {
          setDp((s) => ({ ...s, selectedId: box.id }));
          if (!box.pinned) {
            pushUndo();
            dragRef.current = {
              type: "move",
              boxId: box.id,
              startX: pos.x,
              startY: pos.y,
              origX: box.x,
              origY: box.y,
            };
          }
          return;
        }
      }

      // Drawing new box
      if (drawMode) {
        pushUndo();
        dragRef.current = {
          type: "draw",
          startX: pos.x,
          startY: pos.y,
          origX: pos.x,
          origY: pos.y,
        };
        return;
      }

      setDp((s) => ({ ...s, selectedId: null }));
    },
    [dp.boxes, selectedBox, drawMode, toCanvas, pan, pushUndo],
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent) => {
      if (!dragRef.current) return;
      const d = dragRef.current;

      if (d.type === "pan") {
        setPan({
          x: d.origX + (e.clientX - d.startX),
          y: d.origY + (e.clientY - d.startY),
        });
        return;
      }

      const pos = toCanvas(e.clientX, e.clientY);

      if (d.type === "move" && d.boxId) {
        const dx = pos.x - d.startX;
        const dy = pos.y - d.startY;
        setDp((s) => ({
          ...s,
          boxes: s.boxes.map((b) =>
            b.id === d.boxId
              ? {
                  ...b,
                  x: snapVal(d.origX + dx, s.snapSize, s.snapToGrid),
                  y: snapVal(d.origY + dy, s.snapSize, s.snapToGrid),
                }
              : b,
          ),
        }));
        return;
      }

      if (d.type === "resize" && d.boxId && d.origW !== undefined && d.origH !== undefined) {
        const dx = pos.x - d.startX;
        const dy = pos.y - d.startY;
        setDp((s) => ({
          ...s,
          boxes: s.boxes.map((b) => {
            if (b.id !== d.boxId) return b;
            let nx = d.origX;
            let ny = d.origY;
            let nw = d.origW!;
            let nh = d.origH!;
            if (d.handle?.includes("r")) nw = Math.max(16, nw + dx);
            if (d.handle?.includes("l")) {
              nw = Math.max(16, nw - dx);
              nx = d.origX + dx;
            }
            if (d.handle?.includes("b")) nh = Math.max(16, nh + dy);
            if (d.handle?.includes("t")) {
              nh = Math.max(16, nh - dy);
              ny = d.origY + dy;
            }
            return {
              ...b,
              x: snapVal(nx, s.snapSize, s.snapToGrid),
              y: snapVal(ny, s.snapSize, s.snapToGrid),
              w: snapVal(nw, s.snapSize, s.snapToGrid),
              h: snapVal(nh, s.snapSize, s.snapToGrid),
            };
          }),
        }));
        return;
      }

      if (d.type === "draw") {
        // Visual feedback could be done with a temp overlay
      }
    },
    [toCanvas],
  );

  const handleMouseUp = useCallback(
    (e: ReactMouseEvent) => {
      if (!dragRef.current) return;
      const d = dragRef.current;

      if (d.type === "draw") {
        const pos = toCanvas(e.clientX, e.clientY);
        const x = Math.min(d.startX, pos.x);
        const y = Math.min(d.startY, pos.y);
        const w = Math.abs(pos.x - d.startX);
        const h = Math.abs(pos.y - d.startY);
        if (w > 8 && h > 8) {
          const newBox: DimBox = {
            id: uid(),
            name: `Box ${dp.boxes.length + 1}`,
            type: "ui",
            description: "",
            prompt: "",
            displayText: "",
            x: snapVal(x, dp.snapSize, dp.snapToGrid),
            y: snapVal(y, dp.snapSize, dp.snapToGrid),
            w: snapVal(w, dp.snapSize, dp.snapToGrid),
            h: snapVal(h, dp.snapSize, dp.snapToGrid),
            pinned: false,
            image: null,
            variants: [],
            variantIndex: 0,
            styleSource: false,
          };
          setDp((s) => ({
            ...s,
            boxes: [...s.boxes, newBox],
            selectedId: newBox.id,
          }));
        }
      }
      dragRef.current = null;
    },
    [dp, toCanvas],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.max(0.1, Math.min(5, z - e.deltaY * 0.001)));
    },
    [],
  );

  /* ─── Box operations ─── */

  const deleteSelected = useCallback(() => {
    if (!dp.selectedId) return;
    pushUndo();
    setDp((s) => ({
      ...s,
      boxes: s.boxes.filter((b) => b.id !== s.selectedId),
      selectedId: null,
    }));
  }, [dp.selectedId, pushUndo]);

  const duplicateSelected = useCallback(() => {
    if (!selectedBox) return;
    pushUndo();
    const copy: DimBox = {
      ...selectedBox,
      id: uid(),
      name: `${selectedBox.name} Copy`,
      x: selectedBox.x + 20,
      y: selectedBox.y + 20,
      variants: [...selectedBox.variants],
    };
    setDp((s) => ({ ...s, boxes: [...s.boxes, copy], selectedId: copy.id }));
  }, [selectedBox, pushUndo]);

  const updateSelected = useCallback(
    (patch: Partial<DimBox>) => {
      if (!dp.selectedId) return;
      setDp((s) => ({
        ...s,
        boxes: s.boxes.map((b) => (b.id === s.selectedId ? { ...b, ...patch } : b)),
      }));
    },
    [dp.selectedId],
  );

  /* ─── Generate per box ─── */

  const generateForBox = useCallback(
    async (boxId: string) => {
      const box = dp.boxes.find((b) => b.id === boxId);
      if (!box || !box.prompt.trim()) return;
      setGenerating(boxId);
      try {
        const result = await generateWithRefs({
          prompt: box.prompt,
          dimensions: `${box.w}x${box.h}`,
          mode: uiLabState.mode,
          styleRef: uiLabState.styleSlot?.file,
          refA: uiLabState.refA?.file,
          refB: uiLabState.refB?.file,
          refC: uiLabState.refC?.file,
        });
        setDp((s) => ({
          ...s,
          boxes: s.boxes.map((b) =>
            b.id === boxId
              ? {
                  ...b,
                  variants: [...b.variants, result.image],
                  variantIndex: b.variants.length,
                  image: result.image,
                }
              : b,
          ),
        }));
      } catch (err) {
        uiLabActions.setError(err instanceof Error ? err.message : "Generation failed");
      } finally {
        setGenerating(null);
      }
    },
    [dp.boxes, uiLabState, uiLabActions],
  );

  /* ─── Export ─── */

  const exportLayout = useCallback(() => {
    const manifest = {
      canvas: { width: dp.canvasW, height: dp.canvasH },
      boxes: dp.boxes.map((b) => ({
        name: b.name,
        type: b.type,
        description: b.description,
        displayText: b.displayText,
        x: b.x,
        y: b.y,
        width: b.w,
        height: b.h,
      })),
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "layout_manifest.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }, [dp]);

  /* ─── Background ─── */

  const loadBackground = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setDp((s) => ({ ...s, bgImage: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  /* ─── Canvas dimensions ─── */

  const applyDimensions = useCallback(() => {
    const w = parseInt(editingW) || dp.canvasW;
    const h = parseInt(editingH) || dp.canvasH;
    setDp((s) => ({ ...s, canvasW: Math.max(64, w), canvasH: Math.max(64, h) }));
  }, [editingW, editingH, dp.canvasW, dp.canvasH]);

  /* ─── Keyboard shortcuts ─── */

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" && dp.selectedId) {
        e.preventDefault();
        deleteSelected();
      }
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        redo();
      }
      if (e.ctrlKey && e.key === "c" && selectedBox) {
        e.preventDefault();
        duplicateSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dp.selectedId, selectedBox, deleteSelected, undo, redo, duplicateSelected]);

  /* ─── Resize canvas element ─── */

  useEffect(() => {
    const resize = () => {
      const c = containerRef.current;
      const canvas = canvasRef.current;
      if (c && canvas) {
        canvas.width = c.clientWidth;
        canvas.height = c.clientHeight;
        render();
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [render]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2 border-b flex-wrap"
        style={{ borderColor: "var(--color-border)", background: "var(--color-panel)" }}
      >
        <div className="flex items-center gap-1">
          <LayoutGrid className="h-3.5 w-3.5" style={{ color: "var(--color-tool-ui)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Dimension Planner
          </span>
        </div>

        <div className="h-4 w-px bg-[var(--color-border)]" />

        <Input
          placeholder="W"
          className="!w-16 !py-1 !text-xs"
          value={editingW || String(dp.canvasW)}
          onChange={(e) => setEditingW(e.target.value)}
        />
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>×</span>
        <Input
          placeholder="H"
          className="!w-16 !py-1 !text-xs"
          value={editingH || String(dp.canvasH)}
          onChange={(e) => setEditingH(e.target.value)}
        />
        <Button variant="secondary" size="sm" onClick={applyDimensions}>Set</Button>

        <div className="h-4 w-px bg-[var(--color-border)]" />

        <Button
          variant={drawMode ? "primary" : "secondary"}
          size="sm"
          onClick={() => setDrawMode(!drawMode)}
          title="Draw box mode"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button variant="secondary" size="sm" onClick={deleteSelected} disabled={!dp.selectedId} title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="secondary" size="sm" onClick={duplicateSelected} disabled={!dp.selectedId} title="Duplicate">
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button variant="secondary" size="sm" onClick={undo} disabled={undoStack.length === 0} title="Undo">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="secondary" size="sm" onClick={redo} disabled={redoStack.length === 0} title="Redo">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>

        <div className="h-4 w-px bg-[var(--color-border)]" />

        <Button
          variant={dp.showGrid ? "primary" : "secondary"}
          size="sm"
          onClick={() => setDp((s) => ({ ...s, showGrid: !s.showGrid }))}
          title="Toggle grid"
        >
          <Grid3X3 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={dp.cleanView ? "primary" : "secondary"}
          size="sm"
          onClick={() => setDp((s) => ({ ...s, cleanView: !s.cleanView }))}
          title="Clean view"
        >
          {dp.cleanView ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="secondary" size="sm" onClick={loadBackground} title="Set background">
          BG
        </Button>
        <Button variant="secondary" size="sm" onClick={exportLayout} title="Export JSON">
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 min-w-0 relative overflow-hidden"
          style={{ cursor: drawMode ? "crosshair" : "default" }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>

        {/* Properties panel */}
        {selectedBox && !dp.cleanView && (
          <div
            className="w-56 shrink-0 border-l overflow-y-auto p-3 space-y-3"
            style={{ borderColor: "var(--color-border)", background: "var(--color-panel)" }}
          >
            <h4
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "var(--color-text-muted)" }}
            >
              Box Properties
            </h4>

            <Input
              label="Name"
              value={selectedBox.name}
              onChange={(e) => updateSelected({ name: e.target.value })}
            />
            <Select
              label="Type"
              options={BOX_TYPES}
              value={selectedBox.type}
              onChange={(e) =>
                updateSelected({ type: e.target.value as DimBox["type"] })
              }
            />
            <Input
              label="Description"
              value={selectedBox.description}
              onChange={(e) => updateSelected({ description: e.target.value })}
            />
            <Input
              label="Display Text"
              value={selectedBox.displayText}
              onChange={(e) => updateSelected({ displayText: e.target.value })}
            />

            <div className="flex gap-2">
              <Input
                label="X"
                type="number"
                value={selectedBox.x}
                onChange={(e) => updateSelected({ x: Number(e.target.value) })}
                className="!w-full"
              />
              <Input
                label="Y"
                type="number"
                value={selectedBox.y}
                onChange={(e) => updateSelected({ y: Number(e.target.value) })}
                className="!w-full"
              />
            </div>
            <div className="flex gap-2">
              <Input
                label="W"
                type="number"
                value={selectedBox.w}
                onChange={(e) => updateSelected({ w: Math.max(16, Number(e.target.value)) })}
                className="!w-full"
              />
              <Input
                label="H"
                type="number"
                value={selectedBox.h}
                onChange={(e) => updateSelected({ h: Math.max(16, Number(e.target.value)) })}
                className="!w-full"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => updateSelected({ pinned: !selectedBox.pinned })}
                title={selectedBox.pinned ? "Unpin" : "Pin"}
              >
                {selectedBox.pinned ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              </Button>
              <Button
                variant={selectedBox.styleSource ? "danger" : "secondary"}
                size="sm"
                onClick={() => updateSelected({ styleSource: !selectedBox.styleSource })}
                title="Toggle style source"
              >
                S
              </Button>
            </div>

            {/* Per-box generation */}
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
              <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--color-text-muted)" }}>
                Box Generation
              </span>
              <textarea
                placeholder="Prompt for this box..."
                value={selectedBox.prompt}
                onChange={(e) => updateSelected({ prompt: e.target.value })}
                className="w-full p-2 rounded text-xs resize-none outline-none"
                rows={3}
                style={{
                  background: "var(--color-elevated)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border)",
                }}
              />
              <Button
                variant="primary"
                size="sm"
                className="w-full !bg-[#2a5a2a] hover:!bg-[#3a7a3a]"
                onClick={() => generateForBox(selectedBox.id)}
                loading={generating === selectedBox.id}
                disabled={!uiLabState.serviceOnline || !selectedBox.prompt.trim() || generating !== null}
              >
                <Sparkles className="h-3 w-3" /> Generate
              </Button>

              {selectedBox.variants.length > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    disabled={selectedBox.variantIndex === 0}
                    onClick={() =>
                      updateSelected({ variantIndex: selectedBox.variantIndex - 1 })
                    }
                    className="px-2 py-0.5 rounded text-xs bg-[var(--color-elevated)] disabled:opacity-30"
                  >
                    ←
                  </button>
                  <span className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
                    {selectedBox.variantIndex + 1}/{selectedBox.variants.length}
                  </span>
                  <button
                    disabled={selectedBox.variantIndex >= selectedBox.variants.length - 1}
                    onClick={() =>
                      updateSelected({ variantIndex: selectedBox.variantIndex + 1 })
                    }
                    className="px-2 py-0.5 rounded text-xs bg-[var(--color-elevated)] disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
