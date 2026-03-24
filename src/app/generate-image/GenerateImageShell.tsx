"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  IMAGE_GEN_MODELS,
  MULTIMODAL_MODELS,
  ASPECT_RATIOS,
  type ModelDef,
} from "@/app/ideation/canvas/nodes/character/modelData";
import {
  generateWithImagen4,
  generateWithNanoBanana,
  type GeneratedImage,
} from "@/lib/ideation/engine/conceptlab/imageGenApi";
import ImageViewer from "@/components/ImageViewer";

/* ── All models in one list ── */

const IMAGEN_API_IDS = new Set([
  "imagen-4.0-generate-001",
  "imagen-4.0-ultra-generate-001",
  "imagen-4.0-fast-generate-001",
]);

const ALL_MODELS: (ModelDef & { category: "imagen" | "gemini" })[] = [
  ...IMAGE_GEN_MODELS.map((m) => ({
    ...m,
    category: IMAGEN_API_IDS.has(m.apiId) ? ("imagen" as const) : ("gemini" as const),
  })),
  ...MULTIMODAL_MODELS.map((m) => ({ ...m, category: "gemini" as const })),
];

/* ── Dimension presets ── */

const DIMENSION_PRESETS = [
  { label: "Square (1:1)", value: "1:1" },
  { label: "Landscape (16:9)", value: "16:9" },
  { label: "Portrait (9:16)", value: "9:16" },
  { label: "Portrait (3:4)", value: "3:4" },
  { label: "Landscape (4:3)", value: "4:3" },
  { label: "Custom", value: "custom" },
];

/* ═══════════════════════════════════════════════════════════════ */

export default function GenerateImageShell() {
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState(ALL_MODELS[0].id);
  const [aspectPreset, setAspectPreset] = useState("1:1");
  const [customW, setCustomW] = useState(1024);
  const [customH, setCustomH] = useState(1024);
  const [batchCount, setBatchCount] = useState(1);

  const [results, setResults] = useState<string[]>([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [completedCount, setCompletedCount] = useState(0);
  const [genStartTime, setGenStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const selectedModel = ALL_MODELS.find((m) => m.id === modelId) ?? ALL_MODELS[0];
  const isCustomDim = aspectPreset === "custom";
  const effectiveAspect = isCustomDim ? `${customW}:${customH}` : aspectPreset;

  const resolvedRes = isCustomDim
    ? `${customW}\u00d7${customH}`
    : selectedModel.maxRes[aspectPreset] ?? "—";

  /* ── Elapsed timer ── */

  useEffect(() => {
    if (!genStartTime) return;
    const tick = setInterval(() => setElapsed(Date.now() - genStartTime), 250);
    return () => clearInterval(tick);
  }, [genStartTime]);

  /* ── Generate ── */

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError("Enter a prompt first");
      return;
    }
    setGenerating(true);
    setError(null);
    setCompletedCount(0);
    setGenStartTime(Date.now());
    setElapsed(0);
    setProgress(`Generating 0 of ${batchCount}...`);

    const newImages: string[] = [];
    let completed = 0;

    const tasks = Array.from({ length: batchCount }, (_, i) => async () => {
      try {
        let images: GeneratedImage[];
        if (selectedModel.category === "imagen") {
          images = await generateWithImagen4(
            prompt,
            effectiveAspect,
            1,
            selectedModel.apiId,
          );
        } else {
          images = await generateWithNanoBanana(
            prompt,
            effectiveAspect,
            1,
            selectedModel.apiId,
          );
        }
        for (const img of images) {
          newImages.push(img.base64);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : `Request ${i + 1} failed`;
        setError((prev) => (prev ? `${prev}\n${msg}` : msg));
      } finally {
        completed++;
        setCompletedCount(completed);
        setProgress(`Generating ${completed} of ${batchCount}...`);
      }
    });

    await Promise.allSettled(tasks.map((fn) => fn()));

    if (newImages.length > 0) {
      setResults((prev) => {
        const next = [...prev, ...newImages];
        setViewIndex(next.length - newImages.length);
        return next;
      });
    }

    setGenerating(false);
    setGenStartTime(null);
    setProgress(newImages.length > 0 ? `Done \u2014 ${newImages.length} image(s)` : "No images returned");
  }, [prompt, batchCount, selectedModel, effectiveAspect]);

  /* ── Navigation ── */

  const canPrev = viewIndex > 0;
  const canNext = viewIndex < results.length - 1;
  const variantLabel = results.length > 0 ? `${viewIndex + 1} / ${results.length}` : "0 / 0";
  const currentImage = results[viewIndex] ?? null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft" && canPrev) setViewIndex((i) => i - 1);
      if (e.key === "ArrowRight" && canNext) setViewIndex((i) => i + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canPrev, canNext]);

  /* ── Clipboard / Save ── */

  const handleCopy = useCallback(async () => {
    if (!currentImage) return;
    try {
      const blob = await fetch(`data:image/png;base64,${currentImage}`).then((r) => r.blob());
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch { /* clipboard denied */ }
    setContextMenu(null);
  }, [currentImage]);

  const handleSaveAs = useCallback(async () => {
    if (!currentImage) return;
    try {
      if ("showSaveFilePicker" in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `generated_${Date.now()}.png`,
          types: [{ description: "PNG Image", accept: { "image/png": [".png"] } }],
        });
        const writable = await handle.createWritable();
        const blob = await fetch(`data:image/png;base64,${currentImage}`).then((r) => r.blob());
        await writable.write(blob);
        await writable.close();
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
    setContextMenu(null);
  }, [currentImage]);

  const handleDownload = useCallback(() => {
    if (!currentImage) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${currentImage}`;
    link.download = `generated_${Date.now()}.png`;
    link.click();
    setContextMenu(null);
  }, [currentImage]);

  const handleClearAll = useCallback(() => {
    setResults([]);
    setViewIndex(0);
    setProgress("");
  }, []);

  /* ═══════════════════════════════════════════════════════════ */

  return (
    <div className="h-full flex bg-[var(--color-background)]">
      {/* ─── Left Panel ─── */}
      <div
        className="w-80 shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <div className="p-3 space-y-3 flex-1">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "var(--color-tool-concept)" }} />
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "var(--color-text-muted)" }}
            >
              AI Generate Image
            </span>
          </div>

          {/* Prompt */}
          <div className="space-y-1">
            <label className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              className="w-full rounded-md text-xs p-2 resize-none focus:outline-none focus:ring-1"
              style={{
                height: 200,
                background: "var(--color-elevated)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
                caretColor: "var(--color-tool-concept)",
              }}
            />
          </div>

          {/* Model */}
          <LabeledSelect
            label="Model"
            value={modelId}
            onChange={setModelId}
            options={ALL_MODELS.map((m) => ({
              value: m.id,
              label: `${m.label}  (${m.timeEstimate})`,
            }))}
          />

          {/* Model note */}
          <div
            className="text-[10px] px-2 py-1 rounded-md"
            style={{
              background: "var(--color-elevated)",
              color: "var(--color-text-muted)",
              border: "1px solid var(--color-border)",
            }}
          >
            {selectedModel.note}
          </div>

          {/* Dimensions */}
          <LabeledSelect
            label="Dimensions"
            value={aspectPreset}
            onChange={setAspectPreset}
            options={DIMENSION_PRESETS}
          />

          {/* Custom dimensions */}
          {isCustomDim && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={64}
                max={8192}
                value={customW}
                onChange={(e) => setCustomW(Math.max(64, Number(e.target.value)))}
                className="w-20 rounded-md text-xs px-2 py-1.5 focus:outline-none"
                style={{
                  background: "var(--color-elevated)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border)",
                }}
              />
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>\u00d7</span>
              <input
                type="number"
                min={64}
                max={8192}
                value={customH}
                onChange={(e) => setCustomH(Math.max(64, Number(e.target.value)))}
                className="w-20 rounded-md text-xs px-2 py-1.5 focus:outline-none"
                style={{
                  background: "var(--color-elevated)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border)",
                }}
              />
            </div>
          )}

          {/* Resolution info */}
          <div className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
            Max resolution: {resolvedRes}
          </div>

          {/* Batch count */}
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Count
            </span>
            <input
              type="number"
              min={1}
              max={20}
              value={batchCount}
              onChange={(e) => setBatchCount(Math.max(1, Math.min(20, Number(e.target.value))))}
              className="w-16 rounded-md text-xs px-2 py-1.5 focus:outline-none"
              style={{
                background: "var(--color-elevated)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
              }}
            />
            <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
              image{batchCount > 1 ? "s" : ""} per run
            </span>
          </div>

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full py-2.5 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              background: generating ? "var(--color-elevated)" : "#2a5a2a",
              color: "white",
              border: "1px solid var(--color-border)",
            }}
          >
            <Sparkles className="h-4 w-4" />
            {generating ? "Generating..." : "Generate"}
          </button>

          {/* Progress */}
          {progress && (
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {progress}
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="px-3 py-2 rounded-md text-xs whitespace-pre-wrap"
              style={{ background: "var(--color-destructive)", color: "white" }}
            >
              {error}
            </div>
          )}

          {/* Results info */}
          {results.length > 0 && (
            <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {results.length} image{results.length > 1 ? "s" : ""} generated
            </div>
          )}
        </div>
      </div>

      {/* ─── Center Panel ─── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Toolbar */}
        <div
          className="flex items-center gap-1 px-2 py-1.5 border-b shrink-0"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <ToolbarButton
            icon={<ChevronLeft className="h-3.5 w-3.5" />}
            title="Previous (Left Arrow)"
            disabled={!canPrev}
            onClick={() => setViewIndex((i) => i - 1)}
          />
          <span
            className="text-xs font-mono min-w-[3.5rem] text-center"
            style={{ color: "var(--color-text-primary)" }}
          >
            {variantLabel}
          </span>
          <ToolbarButton
            icon={<ChevronRight className="h-3.5 w-3.5" />}
            title="Next (Right Arrow)"
            disabled={!canNext}
            onClick={() => setViewIndex((i) => i + 1)}
          />
          <ToolbarSep />
          <ToolbarButton
            icon={<Copy className="h-3.5 w-3.5" />}
            title="Copy to clipboard"
            disabled={!currentImage}
            onClick={handleCopy}
          />
          <ToolbarButton
            icon={<Save className="h-3.5 w-3.5" />}
            title="Save As..."
            disabled={!currentImage}
            onClick={handleSaveAs}
          />
          <ToolbarButton
            icon={<Download className="h-3.5 w-3.5" />}
            title="Download"
            disabled={!currentImage}
            onClick={handleDownload}
          />
          <div className="flex-1" />
          <ToolbarButton
            icon={<Trash2 className="h-3.5 w-3.5" />}
            title="Clear all results"
            disabled={results.length === 0}
            onClick={handleClearAll}
          />
        </div>

        {/* Image viewer */}
        <div
          className="flex-1 min-h-0 relative"
          onContextMenu={(e) => {
            if (currentImage) {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY });
            }
          }}
          onClick={() => contextMenu && setContextMenu(null)}
        >
          <ImageViewer
            src={currentImage}
            className="h-full w-full"
            downloadName={`generated_${Date.now()}.png`}
          />

          {/* Context menu */}
          {contextMenu && currentImage && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
              onCopy={handleCopy}
              onSaveAs={handleSaveAs}
              onDownload={handleDownload}
            />
          )}
        </div>

        {/* Status bar */}
        {generating && (
          <StatusBar
            completedCount={completedCount}
            totalCount={batchCount}
            elapsed={elapsed}
            modelLabel={selectedModel.label}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════════ */

function ContextMenu({
  x,
  y,
  onClose,
  onCopy,
  onSaveAs,
  onDownload,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onCopy: () => void;
  onSaveAs: () => void;
  onDownload: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 9999,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 6,
        padding: "4px 0",
        minWidth: 160,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      <MenuItem icon={<Copy className="h-3.5 w-3.5" />} label="Copy" onClick={onCopy} />
      <MenuItem icon={<Save className="h-3.5 w-3.5" />} label="Save As\u2026" onClick={onSaveAs} />
      <MenuItem icon={<Download className="h-3.5 w-3.5" />} label="Download" onClick={onDownload} />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors hover:bg-[var(--color-hover)] cursor-pointer"
      style={{ color: "var(--color-text-primary)" }}
    >
      {icon}
      {label}
    </button>
  );
}

function ToolbarButton({
  icon,
  title,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      className={`flex items-center gap-1 px-1.5 py-1 rounded transition-colors text-xs ${
        disabled ? "opacity-30 cursor-default" : "hover:bg-[var(--color-hover)]"
      }`}
      style={!disabled ? { color: "var(--color-text-primary)" } : undefined}
    >
      {icon}
    </button>
  );
}

function ToolbarSep() {
  return (
    <div
      className="h-4 w-px mx-0.5 shrink-0"
      style={{ background: "var(--color-border)" }}
    />
  );
}

function StatusBar({
  completedCount,
  totalCount,
  elapsed,
  modelLabel,
}: {
  completedCount: number;
  totalCount: number;
  elapsed: number;
  modelLabel: string;
}) {
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const secs = Math.floor(elapsed / 1000);
  const mins = Math.floor(secs / 60);
  const timeStr = mins > 0 ? `${mins}m ${secs % 60}s` : `${secs}s`;

  return (
    <div
      className="shrink-0 border-t px-3 py-1.5 flex items-center gap-3"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      {/* Animated spinner */}
      <div className="relative h-3.5 w-3.5 shrink-0">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: "2px solid var(--color-border)",
            borderTopColor: "var(--color-tool-concept)",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>

      {/* Progress bar */}
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ background: "var(--color-elevated)" }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${pct}%`,
            background: "var(--color-tool-concept)",
            boxShadow: "0 0 6px var(--color-tool-concept)",
          }}
        />
      </div>

      {/* Stats */}
      <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--color-text-muted)" }}>
        {completedCount}/{totalCount}
      </span>
      <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--color-text-muted)" }}>
        {timeStr}
      </span>
      <span className="text-[10px] shrink-0 truncate max-w-[10rem]" style={{ color: "var(--color-text-muted)" }}>
        {modelLabel}
      </span>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs shrink-0" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-md text-xs px-2 py-1.5 focus:outline-none cursor-pointer"
        style={{
          background: "var(--color-elevated)",
          color: "var(--color-text-primary)",
          border: "1px solid var(--color-border)",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
