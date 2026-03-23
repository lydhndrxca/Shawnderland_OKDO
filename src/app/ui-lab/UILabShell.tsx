"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useUILab, useUILabActions } from "@/lib/ui-lab/UILabContext";
import {
  checkHealth,
  extractAttributes,
  generateWithRefs,
  listStyles,
  removeUI,
} from "@/lib/ui-lab/api";
import CommandPalette from "./components/CommandPalette";
import FinalizeDialog from "./components/FinalizeDialog";
import { ToastProvider, useToast } from "./components/ToastManager";
import {
  ASPECT_RATIOS,
  GENERATION_MODES,
  IMAGE_TABS,
  SESSION_BLENDS,
} from "@/lib/ui-lab/types";
import type {
  AspectRatio,
  GenerationMode,
  ImageTabKey,
  SessionBlend,
  SlotImage,
} from "@/lib/ui-lab/types";
import ImageViewer from "./components/ImageViewer";
import {
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Copy,
  Crop,
  FolderOpen,
  Grid3x3,
  Pencil,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  Wifi,
  WifiOff,
} from "lucide-react";

const StyleGalleryWidget = dynamic(() => import("./components/StyleGalleryWidget"), { ssr: false });
const UIGenGalleryWidget = dynamic(() => import("./components/UIGenGalleryWidget"), { ssr: false });
const FontGenWidget = dynamic(() => import("./components/FontGenWidget"), { ssr: false });
const DimensionPlannerWidget = dynamic(() => import("./components/DimensionPlanner"), { ssr: false });

type SlotKey = "styleSlot" | "refA" | "refB" | "refC" | "extractSlot" | "extractBGSlot";

const TAB_TO_SLOT: Partial<Record<ImageTabKey, SlotKey>> = {
  RefA: "refA",
  RefB: "refB",
  RefC: "refC",
  Extract: "extractSlot",
  ExtractBG: "extractBGSlot",
};

const ALL_SLOT_TARGETS: { label: string; key: ImageTabKey; slotKey?: SlotKey }[] = [
  { label: "Mainstage", key: "Mainstage" },
  { label: "Ref A", key: "RefA", slotKey: "refA" },
  { label: "Ref B", key: "RefB", slotKey: "refB" },
  { label: "Ref C", key: "RefC", slotKey: "refC" },
  { label: "Extract Style", key: "Extract", slotKey: "extractSlot" },
  { label: "Extract BG", key: "ExtractBG", slotKey: "extractBGSlot" },
];

/* ═══════════════════════════════════════════════════════════════
   Main Shell
   ═══════════════════════════════════════════════════════════════ */

export default function UILabShell() {
  return (
    <ToastProvider>
      <UILabShellInner />
    </ToastProvider>
  );
}

function UILabShellInner() {
  const { state, currentImage } = useUILab();
  const actions = useUILabActions();

  const [showGrid, setShowGrid] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [styleFolders, setStyleFolders] = useState<string[]>([]);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  // Health check polling with exponential backoff
  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;
    let offlineStreak = 0;
    const poll = async () => {
      const ok = await checkHealth();
      if (!mounted) return;
      actions.setServiceOnline(ok);
      offlineStreak = ok ? 0 : offlineStreak + 1;
      const delay = ok ? 15_000 : Math.min(60_000, 10_000 * Math.pow(1.5, offlineStreak));
      timer = setTimeout(poll, delay);
    };
    poll();
    return () => { mounted = false; clearTimeout(timer); };
  }, [actions]);

  // Fetch style library folders on mount + when service comes online
  useEffect(() => {
    if (!state.serviceOnline) return;
    listStyles()
      .then((r) => setStyleFolders(r.folders.map((f) => f.name)))
      .catch(() => {});
  }, [state.serviceOnline]);

  // Ctrl+K command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    setShowGrid(false);
    setDrawMode(false);
  }, [state.activeImageTab]);

  const isStandardMode =
    state.mode === "FREEFORM" || state.mode === "ROMZ" || state.mode === "MAP";
  const isDimPlanner = state.mode === "DIM_PLANNER";
  const isUIGen = state.mode === "UI_GEN";
  const isFontGen = state.mode === "FONT_GEN";
  const isMap = state.mode === "MAP";

  const dims = ASPECT_RATIOS.find((a) => a.value === state.aspectRatio);
  const effectiveW = isMap ? 48 : (dims?.w ?? state.customWidth);
  const effectiveH = isMap ? 48 : (dims?.h ?? state.customHeight);

  const mainstageTabLabel = isDimPlanner
    ? "Mainstage \u2014 Dimension Planner"
    : isUIGen
      ? "Mainstage \u2014 UI Generator"
      : isFontGen
        ? "Mainstage \u2014 Font Generator"
        : "Mainstage";

  // ─── Generate ───
  const handleGenerate = useCallback(async () => {
    if (!state.prompt.trim()) {
      actions.setError("Please enter a prompt");
      return;
    }
    actions.setGenerating(true);
    actions.setError(null);
    actions.setStatus("Generating...");
    try {
      const batchSize = state.batchCount;
      for (let i = 0; i < batchSize; i++) {
        actions.setStatus(`Generating ${i + 1} of ${batchSize}...`);
        const result = await generateWithRefs({
          prompt: state.prompt,
          style: state.styleText || undefined,
          dimensions: `${effectiveW}x${effectiveH}`,
          mode: state.mode,
          styleGuidance: state.styleGuidance || undefined,
          styleRef: state.styleSlot?.file,
          refA: state.refA?.file,
          refB: state.refB?.file,
          refC: state.refC?.file,
        });
        actions.addGeneratedImage(result.image);
      }
      actions.setStatus("Done");
      actions.setImageTab("Mainstage");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      actions.setError(msg);
      actions.setStatus(msg);
    } finally {
      actions.setGenerating(false);
    }
  }, [state, actions, effectiveW, effectiveH]);

  // ─── Extract Attributes ───
  const handleExtractAttributes = useCallback(async () => {
    if (!currentImage) { actions.setError("Generate an image first"); return; }
    actions.setExtracting(true);
    actions.setStatus("Extracting attributes...");
    try {
      const blob = await fetch(
        currentImage.startsWith("data:") ? currentImage : `data:image/png;base64,${currentImage}`,
      ).then((r) => r.blob());
      const file = new File([blob], "mainstage.png", { type: "image/png" });
      const result = await extractAttributes(file);
      actions.setExtractedAttributes(result.attributes);
      actions.setStatus("Attributes extracted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extraction failed";
      actions.setError(msg);
      actions.setStatus(msg);
    } finally {
      actions.setExtracting(false);
    }
  }, [currentImage, actions]);

  // ─── Remove UI (Extract BG) ───
  const handleRemoveUI = useCallback(async () => {
    const bgSlot = state.extractBGSlot;
    if (!bgSlot?.file) { actions.setError("Load an image in Extract BG first"); return; }
    actions.setExtracting(true);
    actions.setStatus("Removing UI...");
    try {
      const result = await removeUI(bgSlot.file);
      actions.setRemovedUIImage(result.image);
      actions.setStatus("UI removed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Remove UI failed";
      actions.setError(msg);
      actions.setStatus(msg);
    } finally {
      actions.setExtracting(false);
    }
  }, [state.extractBGSlot, actions]);

  // ─── Finalize (opens dialog) ───
  const handleFinalize = useCallback(() => {
    if (!currentImage) { actions.setError("No image to finalize"); return; }
    setFinalizeOpen(true);
  }, [currentImage, actions]);

  // ─── Current slot data ───
  const activeSlotKey = TAB_TO_SLOT[state.activeImageTab];
  const slotImage: SlotImage | null = activeSlotKey
    ? (state[activeSlotKey] as SlotImage | null)
    : null;
  const displaySrc =
    state.activeImageTab === "Mainstage" ? currentImage : (slotImage?.dataUrl ?? null);

  const gridSizeForViewer =
    showGrid && state.activeImageTab === "Mainstage" && isMap ? { w: 48, h: 48 } : null;

  const isSlotTab =
    state.activeImageTab !== "Mainstage" &&
    state.activeImageTab !== "StyleLibrary";

  const showImageViewer =
    state.activeImageTab !== "StyleLibrary" &&
    (state.activeImageTab !== "Mainstage" || isStandardMode);

  return (
    <div className="h-full flex bg-[var(--color-background)]">
      {/* ─────────── Left Controls Panel ─────────── */}
      <div
        className="w-80 shrink-0 flex flex-col border-r overflow-y-auto"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <div className="p-3 space-y-3 flex-1">
          {/* Service status */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              SpriteGen
            </span>
            {state.serviceOnline ? (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--color-success)" }}>
                <Wifi className="h-3 w-3" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                <WifiOff className="h-3 w-3" /> Offline
              </span>
            )}
          </div>

          {/* Reset Session */}
          <ControlButton onClick={actions.resetSession} label="Reset Session" />

          {/* Mode */}
          <LabeledSelect
            label="Mode"
            options={GENERATION_MODES.map((m) => ({ value: m.value, label: m.label }))}
            value={state.mode}
            onChange={(v) => actions.setMode(v as GenerationMode)}
          />

          {/* Style Library dropdown */}
          <LabeledSelect
            label="Style Library"
            options={[
              { value: "__FREEFORM__", label: "Freeform" },
              ...styleFolders.map((f) => ({ value: f, label: f })),
            ]}
            value={state.projectStyle ?? "__FREEFORM__"}
            onChange={(v) => actions.setProjectStyle(v === "__FREEFORM__" ? null : v)}
          />

          {/* Session Style */}
          <div className="flex items-center gap-2">
            <span className="text-xs shrink-0" style={{ color: "var(--color-text-secondary)" }}>
              Session Style
            </span>
            <span
              className="text-xs flex-1 truncate"
              style={{ color: "var(--color-text-muted)" }}
            >
              {state.sessionStyleName ?? "None"}
            </span>
            <select
              value={state.sessionStyleBlend}
              onChange={(e) => actions.setSessionBlend(Number(e.target.value) as SessionBlend)}
              disabled={!state.sessionStyleName}
              className="rounded-md text-xs px-1.5 py-1 focus:outline-none cursor-pointer disabled:opacity-40"
              style={{
                background: "var(--color-elevated)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
              }}
            >
              {SESSION_BLENDS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          {/* ───── Standard mode controls ───── */}
          {isStandardMode && (
            <>
              {/* Prompt */}
              <textarea
                placeholder="Use tokens like refA, refB, refC…"
                value={state.prompt}
                onChange={(e) => actions.setPrompt(e.target.value)}
                className="w-full rounded-md text-xs p-2 resize-none focus:outline-none focus:ring-1"
                style={{
                  height: 200,
                  background: "var(--color-elevated)",
                  color: "var(--color-text-primary)",
                  border: "1px solid var(--color-border)",
                  caretColor: "var(--color-tool-ui)",
                }}
              />

              {/* Aspect Ratio (hidden for MAP) */}
              {!isMap && (
                <LabeledSelect
                  label="Aspect Ratio"
                  options={ASPECT_RATIOS.map((a) => ({ value: a.value, label: a.label }))}
                  value={state.aspectRatio}
                  onChange={(v) => actions.setAspectRatio(v as AspectRatio)}
                />
              )}

              {/* Generate */}
              <button
                onClick={handleGenerate}
                disabled={!state.serviceOnline || state.isGenerating}
                className="w-full py-2.5 rounded-md text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                style={{
                  background: state.isGenerating ? "var(--color-elevated)" : "#2a5a2a",
                  color: "white",
                  border: "1px solid var(--color-border)",
                }}
              >
                <Sparkles className="h-4 w-4" />
                {state.isGenerating ? "Generating..." : "\u2728  Generate"}
              </button>

              {/* Batch Size */}
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  Batch Size:
                </span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={state.batchCount}
                  onChange={(e) =>
                    actions.setBatchCount(Math.max(1, Math.min(10, Number(e.target.value))))
                  }
                  className="w-16 rounded-md text-xs px-2 py-1 focus:outline-none"
                  style={{
                    background: "var(--color-elevated)",
                    color: "var(--color-text-primary)",
                    border: "1px solid var(--color-border)",
                  }}
                />
                <span className="text-[10px] font-mono ml-auto" style={{ color: "var(--color-text-muted)" }}>
                  {effectiveW}×{effectiveH}
                </span>
              </div>

              {/* Finalize */}
              <ControlButton
                onClick={handleFinalize}
                disabled={!currentImage}
                label="Finalize → Transparent PNG"
              />
            </>
          )}

          {/* ───── Dimension Planner controls ───── */}
          {isDimPlanner && (
            <DimensionPlannerControls />
          )}

          {/* ───── UI Generator controls ───── */}
          {isUIGen && (
            <UIGenControls />
          )}

          {/* ───── Font Generator controls ───── */}
          {isFontGen && (
            <FontGenControls />
          )}

          {/* Extract attributes (standard modes) */}
          {isStandardMode && (
            <ControlButton
              onClick={handleExtractAttributes}
              disabled={!currentImage || state.isExtracting || !state.serviceOnline}
              label={state.isExtracting ? "Extracting..." : "Extract Icon Attributes"}
            />
          )}

          {state.extractedAttributes && isStandardMode && (
            <div
              className="rounded-md p-2 text-[10px] font-mono max-h-20 overflow-y-auto"
              style={{
                background: "var(--color-elevated)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              {state.extractedAttributes.slice(0, 200)}
              {state.extractedAttributes.length > 200 && "\u2026"}
            </div>
          )}

          {/* Error */}
          {state.error && (
            <div
              className="px-3 py-2 rounded-md text-xs"
              style={{ background: "var(--color-destructive)", color: "white" }}
            >
              {state.error}
            </div>
          )}

          {/* Status */}
          <div className="text-xs py-1" style={{ color: "var(--color-text-muted)" }}>
            {state.statusMessage}
          </div>
        </div>
      </div>

      {/* ─────────── Center Panel ─────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Tab bar */}
        <div
          className="flex items-center gap-1 px-3 py-2 border-b shrink-0 overflow-x-auto"
          style={{ borderColor: "var(--color-border)" }}
        >
          {IMAGE_TABS.map((tab) => {
            const active = state.activeImageTab === tab.key;
            const label = tab.key === "Mainstage" ? mainstageTabLabel : tab.label;
            return (
              <button
                key={tab.key}
                onClick={() => actions.setImageTab(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-[var(--color-tool-ui)] text-white"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Slot toolbar (only for image slot tabs) */}
        {(showImageViewer || state.activeImageTab === "Mainstage") && isSlotTab && (
          <SlotToolbar
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid((v) => !v)}
            drawMode={drawMode}
            onToggleDraw={() => setDrawMode((v) => !v)}
            onRemoveUI={state.activeImageTab === "ExtractBG" ? handleRemoveUI : undefined}
          />
        )}

        {/* Mainstage toolbar (standard mode only) */}
        {state.activeImageTab === "Mainstage" && isStandardMode && (
          <SlotToolbar
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid((v) => !v)}
            drawMode={drawMode}
            onToggleDraw={() => setDrawMode((v) => !v)}
          />
        )}

        {/* Center content */}
        <div
          className="flex-1 min-h-0 relative"
          onContextMenu={(e) => {
            if (showImageViewer || (state.activeImageTab === "Mainstage" && isStandardMode)) {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY });
            }
          }}
          onClick={() => contextMenu && setContextMenu(null)}
        >
          {/* Mainstage: stacked content based on mode */}
          {state.activeImageTab === "Mainstage" && (
            <>
              {isStandardMode && (
                <ImageViewer
                  src={displaySrc}
                  className="h-full w-full"
                  downloadName={`uilab_mainstage_${Date.now()}.png`}
                  showGrid={showGrid}
                  gridSize={gridSizeForViewer}
                  drawMode={drawMode}
                />
              )}
              {isDimPlanner && <DimensionPlannerWidget />}
              {isUIGen && <UIGenGalleryWidget />}
              {isFontGen && <FontGenWidget />}
            </>
          )}

          {/* Style Library tab */}
          {state.activeImageTab === "StyleLibrary" && <StyleGalleryWidget />}

          {/* Slot image tabs */}
          {isSlotTab && (
            <ImageViewer
              src={displaySrc}
              className="h-full w-full"
              downloadName={`uilab_${state.activeImageTab}_${Date.now()}.png`}
              showGrid={showGrid}
              gridSize={null}
              drawMode={drawMode}
            />
          )}

          {/* Context Menu */}
          {contextMenu && (
            <ContextMenuOverlay
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
            />
          )}
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />

      {/* Finalize Dialog */}
      {currentImage && (
        <FinalizeDialog
          open={finalizeOpen}
          onClose={() => setFinalizeOpen(false)}
          sourceImage={currentImage}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Dimension Planner Controls (left panel group)
   ═══════════════════════════════════════════════════════════════ */

function DimensionPlannerControls() {
  return (
    <GroupBox title="Dimension Planner">
      <div className="space-y-2">
        <ControlButton label="Select Background\u2026" />
        <div className="flex gap-2">
          <ControlButton label="Unlock Background" />
          <ControlButton label="Outfill Background" />
        </div>
        <div className="flex gap-2">
          <ControlButton label="Import UI\u2026" />
          <ControlButton label="Export UI Changes\u2026" />
        </div>
        <ControlButton label="Extract Elements" />
        <div className="flex gap-2">
          <ControlButton label="1:1 Scale" />
          <ControlButton label="Clean View" />
        </div>
        <div className="flex gap-2">
          <ControlButton label="Save" />
          <ControlButton label="Save As\u2026" />
          <ControlButton label="Open\u2026" />
        </div>
        <HSep />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-primary)" }}>
            <input type="checkbox" className="accent-[var(--color-tool-ui)]" />
            Snap to Grid
          </label>
          <input
            type="number"
            defaultValue={16}
            min={1}
            max={512}
            className="w-16 rounded-md text-xs px-2 py-1 focus:outline-none"
            style={{ background: "var(--color-elevated)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
          />
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>px</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-primary)" }}>
            <input type="checkbox" className="accent-[var(--color-tool-ui)]" />
            Show Grid
          </label>
          <input
            type="number"
            defaultValue={64}
            min={4}
            max={1024}
            className="w-16 rounded-md text-xs px-2 py-1 focus:outline-none"
            style={{ background: "var(--color-elevated)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
          />
          <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>px</span>
        </div>
        <HSep />
        <SectionHeader>Selected Element</SectionHeader>
        <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          Draw a rectangle on the canvas to add an element. Right-click a box to copy its dimensions.
        </p>
        <LabeledInput label="Name" placeholder="Element name" />
        <LabeledSelect
          label="Type"
          options={[
            { value: "ui", label: "UI" },
            { value: "background", label: "Background" },
            { value: "button", label: "Button" },
            { value: "icon", label: "Icon" },
            { value: "text", label: "Text" },
          ]}
          value="ui"
          onChange={() => {}}
        />
        <HSep />
        <SectionHeader>Generation</SectionHeader>
        <textarea
          placeholder='Generation prompt \u2014 use "quotes" for display text on the element'
          className="w-full rounded-md text-xs p-2 resize-none focus:outline-none"
          style={{
            height: 80,
            background: "var(--color-elevated)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
          }}
        />
        <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-primary)" }}>
          <input type="checkbox" className="accent-[var(--color-tool-ui)]" />
          Add Text
        </label>
        <textarea
          placeholder="Style tuning (optional)"
          className="w-full rounded-md text-xs p-2 resize-none focus:outline-none"
          style={{
            height: 50,
            background: "var(--color-elevated)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
          }}
        />
        <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-primary)" }}>
          <input type="checkbox" className="accent-[var(--color-tool-ui)]" />
          Style Source Override
        </label>
        <LabeledSelect
          label="Trained Elements"
          options={[
            { value: "hybrid", label: "Use Both (Hybrid)" },
            { value: "trained_only", label: "Trained UI Elements Only" },
            { value: "project_only", label: "Style Library Only" },
          ]}
          value="hybrid"
          onChange={() => {}}
        />
        <LabeledSelect
          label="Reference Scope"
          options={[
            { value: "strict", label: "Tie to Element Type" },
            { value: "freeform", label: "Freeform (All References)" },
          ]}
          value="strict"
          onChange={() => {}}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Count</span>
          <input
            type="number"
            defaultValue={1}
            min={1}
            max={10}
            className="w-16 rounded-md text-xs px-2 py-1 focus:outline-none"
            style={{ background: "var(--color-elevated)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            className="flex-1 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1"
            style={{ background: "#2a5a2a", color: "white", border: "1px solid var(--color-border)" }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Generate
          </button>
          <button className="px-2 py-2 rounded-md text-xs" style={{ background: "var(--color-elevated)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}>◀</button>
          <span className="text-xs font-mono min-w-[2.5rem] text-center" style={{ color: "var(--color-text-primary)" }}>0/0</span>
          <button className="px-2 py-2 rounded-md text-xs" style={{ background: "var(--color-elevated)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}>▶</button>
        </div>
        {/* Variant strip placeholder */}
        <div
          className="h-16 rounded-md flex items-center justify-center text-[10px]"
          style={{ background: "var(--color-elevated)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
        >
          Variant thumbnails
        </div>
        <ControlButton label="Delete This Generation" />
        <ControlButton label="Clear All Variants" />
        <HSep />
        <div className="flex gap-2">
          <ControlButton label="Copy Dimensions" />
          <ControlButton label="Delete" />
        </div>
        <HSep />
        <div className="flex gap-2">
          <ControlButton label="Copy Full Layout" />
          <ControlButton label="Copy as JSON" />
        </div>
        <ControlButton label="Export All\u2026" />
        <div className="flex gap-2">
          <ControlButton label="Clear All" />
          <ControlButton label="Reset Planner" />
        </div>
      </div>
    </GroupBox>
  );
}

/* ═══════════════════════════════════════════════════════════════
   UI Generator Controls (left panel group)
   ═══════════════════════════════════════════════════════════════ */

function UIGenControls() {
  const [elementType, setElementType] = useState("button");

  return (
    <GroupBox title="UI Generator">
      <div className="space-y-2">
        <LabeledSelect
          label="Element Type"
          options={[
            { value: "button", label: "Button" },
            { value: "icon", label: "Icon" },
            { value: "scrollbar", label: "Scrollbar" },
            { value: "font", label: "Font Letter" },
            { value: "number", label: "Number" },
          ]}
          value={elementType}
          onChange={setElementType}
        />
        <textarea
          placeholder='Describe the element \u2014 use "quotes" for label text'
          className="w-full rounded-md text-xs p-2 resize-none focus:outline-none"
          style={{
            height: 80,
            background: "var(--color-elevated)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border)",
          }}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Generate:</span>
          <input
            type="number"
            defaultValue={10}
            min={1}
            max={20}
            className="w-16 rounded-md text-xs px-2 py-1 focus:outline-none"
            style={{ background: "var(--color-elevated)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
          />
        </div>
        <button
          className="w-full py-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-2"
          style={{ background: "#2a5a2a", color: "white", border: "1px solid var(--color-border)" }}
        >
          <Sparkles className="h-3.5 w-3.5" /> Generate Elements
        </button>
        <HSep />

        {/* Button Layout Blocking */}
        {elementType === "button" && (
          <GroupBox title="Button Layout Blocking">
            <div className="space-y-2">
              <LabeledSelect
                label="Shape"
                options={[
                  { value: "auto", label: "Auto" },
                  { value: "rectangle", label: "Rectangle" },
                  { value: "rounded_rectangle", label: "Rounded Rectangle" },
                  { value: "square", label: "Square" },
                  { value: "circle", label: "Circle / Oval" },
                  { value: "pill", label: "Pill / Capsule" },
                  { value: "diamond", label: "Diamond" },
                  { value: "hexagon", label: "Hexagon" },
                  { value: "triangle", label: "Triangle" },
                ]}
                value="auto"
                onChange={() => {}}
              />
              <LabeledSelect
                label="Border"
                options={[
                  { value: "auto", label: "Auto" },
                  { value: "thin", label: "Thin" },
                  { value: "medium", label: "Medium" },
                  { value: "thick", label: "Thick" },
                  { value: "none", label: "None" },
                ]}
                value="auto"
                onChange={() => {}}
              />
              <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-primary)" }}>
                <input type="checkbox" className="accent-[var(--color-tool-ui)]" />
                Add Icon
              </label>
              <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-primary)" }}>
                <input type="checkbox" className="accent-[var(--color-tool-ui)]" />
                Add Text
              </label>
              <LabeledSelect
                label="Text size hint"
                options={[
                  { value: "auto", label: "Auto" },
                  { value: "small", label: "Small" },
                  { value: "medium", label: "Medium" },
                  { value: "large", label: "Large" },
                ]}
                value="auto"
                onChange={() => {}}
              />
            </div>
          </GroupBox>
        )}

        {/* Scrollbar Components */}
        {elementType === "scrollbar" && (
          <GroupBox title="Scrollbar Components">
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-primary)" }}>
                <input type="checkbox" defaultChecked className="accent-[var(--color-tool-ui)]" />
                Track (background)
              </label>
              <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-primary)" }}>
                <input type="checkbox" defaultChecked className="accent-[var(--color-tool-ui)]" />
                Thumb (draggable handle)
              </label>
              <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-primary)" }}>
                <input type="checkbox" defaultChecked className="accent-[var(--color-tool-ui)]" />
                Up/Down arrow buttons
              </label>
              <LabeledSelect
                label="Orientation"
                options={[
                  { value: "vertical", label: "Vertical" },
                  { value: "horizontal", label: "Horizontal" },
                ]}
                value="vertical"
                onChange={() => {}}
              />
            </div>
          </GroupBox>
        )}

        {/* Character Generation */}
        {(elementType === "font" || elementType === "number") && (
          <GroupBox title="Character Generation">
            <div className="space-y-2">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Characters to generate:</span>
              <input
                type="text"
                placeholder="e.g. AEQ or leave default"
                className="w-full rounded-md text-xs px-2 py-1.5 focus:outline-none"
                style={{ background: "var(--color-elevated)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
              />
              <p className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>
                Each character generates as a separate square image
              </p>
            </div>
          </GroupBox>
        )}
      </div>
    </GroupBox>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Font Generator Controls (left panel group)
   ═══════════════════════════════════════════════════════════════ */

function FontGenControls() {
  return (
    <GroupBox title="Font Generator">
      <div className="space-y-2">
        <LabeledInput label="Font Name" placeholder="My Game Font" />
        <LabeledInput label="Characters" placeholder="Leave empty for all, or type specific (e.g. AEQ)" />
        <HSep />
        <button
          className="w-full py-2.5 rounded-md text-xs font-semibold flex items-center justify-center gap-2"
          style={{ background: "#2a5a2a", color: "white", border: "1px solid var(--color-border)" }}
        >
          <Sparkles className="h-3.5 w-3.5" /> Generate All Missing
        </button>
        <ControlButton label="Generate Selected" />
        <div className="flex items-center gap-2">
          <ControlButton label="Regenerate" />
          <input
            type="number"
            defaultValue={3}
            min={1}
            max={10}
            className="w-16 rounded-md text-xs px-2 py-1 focus:outline-none"
            style={{ background: "var(--color-elevated)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
          />
        </div>
        <HSep />
        <div className="flex gap-2">
          <ControlButton label="Save Session" />
          <ControlButton label="Open Session" />
        </div>
        <HSep />
        <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Export:</span>
        <ControlButton label="Export Letter Images" />
        <ControlButton label="Export Number Images" />
        <ControlButton label="Export Letters Font (TTF)" />
        <ControlButton label="Export Numbers Font (TTF)" />
        <ControlButton label="Export Full Font (TTF)" />
        <HSep />
        <ControlButton label="Open Test Window" />
      </div>
    </GroupBox>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SlotToolbar
   ═══════════════════════════════════════════════════════════════ */

function SlotToolbar({
  showGrid,
  onToggleGrid,
  drawMode,
  onToggleDraw,
  onRemoveUI,
}: {
  showGrid: boolean;
  onToggleGrid: () => void;
  drawMode: boolean;
  onToggleDraw: () => void;
  onRemoveUI?: () => void;
}) {
  const { state, currentImage } = useUILab();
  const actions = useUILabActions();
  const inputRef = useRef<HTMLInputElement>(null);

  const activeSlotKey = TAB_TO_SLOT[state.activeImageTab];
  const isMainstage = state.activeImageTab === "Mainstage";
  const isExtract = state.activeImageTab === "Extract";
  const isExtractBG = state.activeImageTab === "ExtractBG";

  const canPrev = state.currentVariantIndex > 0;
  const canNext = state.currentVariantIndex < state.generatedImages.length - 1;
  const variantLabel =
    state.generatedImages.length > 0
      ? `${state.currentVariantIndex + 1} / ${state.generatedImages.length}`
      : "0 / 0";

  const handleFile = useCallback(
    (file: File) => {
      if (!activeSlotKey) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          actions.setSlot(activeSlotKey, { dataUrl: reader.result, file, name: file.name });
        }
      };
      reader.readAsDataURL(file);
    },
    [actions, activeSlotKey],
  );

  const handlePaste = useCallback(async () => {
    if (isMainstage || !activeSlotKey) return;
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imgType = item.types.find((t) => t.startsWith("image/"));
        if (imgType) {
          const blob = await item.getType(imgType);
          handleFile(new File([blob], "pasted.png", { type: imgType }));
          return;
        }
      }
    } catch { /* clipboard denied */ }
  }, [isMainstage, activeSlotKey, handleFile]);

  const handleClear = useCallback(() => {
    if (isMainstage) actions.clearGeneratedImages();
    else if (activeSlotKey) actions.setSlot(activeSlotKey, null);
  }, [isMainstage, activeSlotKey, actions]);

  const handleCopy = useCallback(async () => {
    const src = isMainstage ? currentImage : (state[activeSlotKey!] as SlotImage | null)?.dataUrl;
    if (!src) return;
    try {
      const imgSrc = src.startsWith("data:") ? src : `data:image/png;base64,${src}`;
      const blob = await fetch(imgSrc).then((r) => r.blob());
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch { /* clipboard write failed */ }
  }, [isMainstage, currentImage, state, activeSlotKey]);

  const hasImage = isMainstage
    ? currentImage != null
    : activeSlotKey
      ? (state[activeSlotKey] as SlotImage | null) != null
      : false;

  return (
    <div
      className="flex items-center gap-1 px-2 py-1.5 border-b shrink-0 overflow-x-auto"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      {isMainstage && (
        <>
          <ToolbarButton icon={<ChevronLeft className="h-3.5 w-3.5" />} title="Previous variant" disabled={!canPrev} onClick={() => actions.setVariantIndex(state.currentVariantIndex - 1)} />
          <span className="text-xs font-mono min-w-[3.5rem] text-center" style={{ color: "var(--color-text-primary)" }}>{variantLabel}</span>
          <ToolbarButton icon={<ChevronRight className="h-3.5 w-3.5" />} title="Next variant" disabled={!canNext} onClick={() => actions.setVariantIndex(state.currentVariantIndex + 1)} />
          <ToolbarSep />
        </>
      )}

      {!isMainstage && (
        <>
          <ToolbarButton icon={<FolderOpen className="h-3.5 w-3.5" />} title="Open file" onClick={() => inputRef.current?.click()} />
          <ToolbarButton icon={<Clipboard className="h-3.5 w-3.5" />} title="Paste from clipboard" onClick={handlePaste} />
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          <ToolbarSep />
        </>
      )}

      <ToolbarButton icon={<Crop className="h-3.5 w-3.5" />} title="Crop Tool" disabled={!hasImage} />
      <ToolbarButton icon={<Undo2 className="h-3.5 w-3.5" />} title="Undo Crop" disabled={!hasImage} />
      <ToolbarSep />
      <ToolbarButton icon={<Grid3x3 className="h-3.5 w-3.5" />} title="Toggle Grid" active={showGrid} onClick={onToggleGrid} disabled={!hasImage} />
      <ToolbarButton icon={<Pencil className="h-3.5 w-3.5" />} title="Draw Mode" active={drawMode} onClick={onToggleDraw} disabled={!hasImage} />
      <ToolbarButton icon={<RotateCcw className="h-3.5 w-3.5" />} title="Reset Edits" disabled={!hasImage} />
      <ToolbarButton icon={<Save className="h-3.5 w-3.5" />} title="Save Edits" disabled={!hasImage} />

      {isExtract && (
        <>
          <ToolbarSep />
          <ToolbarButton icon={<Search className="h-3.5 w-3.5" />} label="Extract Attributes" title="Extract image attributes" disabled={!hasImage} />
        </>
      )}

      {isExtractBG && onRemoveUI && (
        <>
          <ToolbarSep />
          <ToolbarButton icon={<Search className="h-3.5 w-3.5" />} label="Remove UI" title="Remove UI elements from image" onClick={onRemoveUI} disabled={!hasImage} />
        </>
      )}

      <div className="flex-1" />
      <ToolbarButton icon={<Copy className="h-3.5 w-3.5" />} title="Copy image" onClick={handleCopy} disabled={!hasImage} />
      <ToolbarButton icon={<Trash2 className="h-3.5 w-3.5" />} title="Clear" onClick={handleClear} disabled={!hasImage} />
      <span className="ml-1 text-[10px] shrink-0" style={{ color: "var(--color-text-muted)" }}>
        {state.activeImageTab}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Context Menu
   ═══════════════════════════════════════════════════════════════ */

function ContextMenuOverlay({ x, y, onClose }: { x: number; y: number; onClose: () => void }) {
  const { state, currentImage } = useUILab();
  const actions = useUILabActions();
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMainstage = state.activeImageTab === "Mainstage";
  const activeSlotKey = TAB_TO_SLOT[state.activeImageTab];
  const hasImage = isMainstage
    ? currentImage != null
    : activeSlotKey
      ? (state[activeSlotKey] as SlotImage | null) != null
      : false;

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);

  const handleFile = useCallback(
    (file: File) => {
      if (!activeSlotKey) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          actions.setSlot(activeSlotKey, { dataUrl: reader.result, file, name: file.name });
        }
      };
      reader.readAsDataURL(file);
      onClose();
    },
    [actions, activeSlotKey, onClose],
  );

  const handleCopy = async () => {
    const src = isMainstage ? currentImage : (state[activeSlotKey!] as SlotImage | null)?.dataUrl;
    if (!src) return;
    try {
      const imgSrc = src.startsWith("data:") ? src : `data:image/png;base64,${src}`;
      const blob = await fetch(imgSrc).then((r) => r.blob());
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch { /* failed */ }
    onClose();
  };

  const handleClear = () => {
    if (isMainstage) actions.clearGeneratedImages();
    else if (activeSlotKey) actions.setSlot(activeSlotKey, null);
    onClose();
  };

  const handleSendToMainstage = () => {
    if (activeSlotKey) {
      const img = state[activeSlotKey] as SlotImage | null;
      if (img) {
        actions.addGeneratedImage(img.dataUrl);
        actions.setImageTab("Mainstage");
      }
    }
    onClose();
  };

  const handleDuplicate = (targetKey: SlotKey) => {
    const src = isMainstage ? currentImage : (state[activeSlotKey!] as SlotImage | null)?.dataUrl;
    if (src) actions.setSlot(targetKey, { dataUrl: src, name: "duplicated.png" });
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 9999,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 6,
        padding: "4px 0",
        minWidth: 180,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      }}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      {!isMainstage && <MenuItem label="Open" onClick={() => inputRef.current?.click()} />}
      {!isMainstage && (
        <MenuItem
          label="Paste"
          onClick={async () => {
            if (!activeSlotKey) return;
            try {
              const items = await navigator.clipboard.read();
              for (const item of items) {
                const imgType = item.types.find((t) => t.startsWith("image/"));
                if (imgType) {
                  const blob = await item.getType(imgType);
                  handleFile(new File([blob], "pasted.png", { type: imgType }));
                  return;
                }
              }
            } catch { /* denied */ }
            onClose();
          }}
        />
      )}
      <MenuItem label="Copy" onClick={handleCopy} disabled={!hasImage} />
      <MenuItem label="Clear" onClick={handleClear} disabled={!hasImage} />

      {!isMainstage && hasImage && (
        <>
          <MenuSep />
          <MenuItem label="Send to Mainstage" onClick={handleSendToMainstage} />
        </>
      )}

      {hasImage && (
        <>
          <MenuSep />
          <div className="px-3 py-1 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            Duplicate to\u2026
          </div>
          {ALL_SLOT_TARGETS.filter((t) => t.key !== state.activeImageTab && t.slotKey).map((t) => (
            <MenuItem key={t.key} label={`  ${t.label}`} onClick={() => handleDuplicate(t.slotKey!)} />
          ))}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Shared sub-components
   ═══════════════════════════════════════════════════════════════ */

function MenuItem({ label, onClick, disabled }: { label: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${disabled ? "opacity-30 cursor-default" : "hover:bg-[var(--color-hover)] cursor-pointer"}`}
      style={{ color: "var(--color-text-primary)" }}
    >
      {label}
    </button>
  );
}

function MenuSep() {
  return <div className="my-1 mx-2 h-px" style={{ background: "var(--color-border)" }} />;
}

function ToolbarButton({ icon, label, title, active, disabled, onClick }: {
  icon: React.ReactNode;
  label?: string;
  title?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      className={`flex items-center gap-1 px-1.5 py-1 rounded transition-colors text-xs ${
        disabled ? "opacity-30 cursor-default" : active ? "bg-[var(--color-tool-ui)] text-white" : "hover:bg-[var(--color-hover)]"
      }`}
      style={!active && !disabled ? { color: "var(--color-text-primary)" } : undefined}
    >
      {icon}
      {label && <span className="whitespace-nowrap">{label}</span>}
    </button>
  );
}

function ToolbarSep() {
  return <div className="h-4 w-px mx-0.5 shrink-0" style={{ background: "var(--color-border)" }} />;
}

function ControlButton({ onClick, disabled, label }: { onClick?: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="w-full py-2 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
      style={{ background: "var(--color-elevated)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
    >
      {label}
    </button>
  );
}

function LabeledSelect({ label, options, value, onChange }: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs shrink-0" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-md text-xs px-2 py-1.5 focus:outline-none cursor-pointer"
        style={{ background: "var(--color-elevated)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function LabeledInput({ label, placeholder }: { label: string; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs shrink-0" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <input
        type="text"
        placeholder={placeholder}
        className="flex-1 rounded-md text-xs px-2 py-1.5 focus:outline-none"
        style={{ background: "var(--color-elevated)", color: "var(--color-text-primary)", border: "1px solid var(--color-border)" }}
      />
    </div>
  );
}

function GroupBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-md p-3 space-y-2"
      style={{ background: "var(--color-elevated)", border: "1px solid var(--color-border)" }}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
        {title}
      </span>
      {children}
    </div>
  );
}

function HSep() {
  return <div className="h-px w-full" style={{ background: "var(--color-border)" }} />;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold block" style={{ color: "var(--color-text-primary)" }}>
      {children}
    </span>
  );
}
