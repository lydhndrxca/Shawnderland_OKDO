"use client";

import { useCallback } from "react";
import { useUILab, useUILabActions } from "@/lib/ui-lab/UILabContext";
import { generateWithRefs } from "@/lib/ui-lab/api";
import { ASPECT_RATIOS, GENERATION_MODES } from "@/lib/ui-lab/types";
import type { AspectRatio, GenerationMode } from "@/lib/ui-lab/types";
import { Button } from "@shawnderland/ui/Button";
import { Select } from "@shawnderland/ui/Select";
import { Textarea } from "@shawnderland/ui/Textarea";
import { Input } from "@shawnderland/ui/Input";
import ImageViewer from "./ImageViewer";
import { ChevronLeft, ChevronRight, Sparkles, Trash2 } from "lucide-react";

export default function GeneratePanel() {
  const { state, currentImage } = useUILab();
  const actions = useUILabActions();

  const dims = ASPECT_RATIOS.find((a) => a.value === state.aspectRatio);
  const effectiveW = state.mode === "MAP" ? 48 : (dims?.w ?? state.customWidth);
  const effectiveH = state.mode === "MAP" ? 48 : (dims?.h ?? state.customHeight);

  const handleGenerate = useCallback(async () => {
    if (!state.prompt.trim()) {
      actions.setError("Please enter a prompt");
      return;
    }
    actions.setGenerating(true);
    actions.setError(null);

    try {
      const batchSize = state.batchCount;
      for (let i = 0; i < batchSize; i++) {
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
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      actions.setGenerating(false);
    }
  }, [state, actions, effectiveW, effectiveH]);

  const canPrev = state.currentVariantIndex > 0;
  const canNext = state.currentVariantIndex < state.generatedImages.length - 1;
  const variantLabel =
    state.generatedImages.length > 0
      ? `${state.currentVariantIndex + 1} / ${state.generatedImages.length}`
      : "—";

  return (
    <div className="h-full flex flex-col">
      {/* Image viewer area */}
      <div className="flex-1 min-h-0 relative">
        <ImageViewer
          src={currentImage}
          className="h-full w-full"
          downloadName={`uilab_${Date.now()}.png`}
        />
        {state.generatedImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1">
            <button
              disabled={!canPrev}
              onClick={() => actions.setVariantIndex(state.currentVariantIndex - 1)}
              className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4 text-white" />
            </button>
            <span className="text-xs text-white font-mono min-w-[3.5rem] text-center">
              {variantLabel}
            </span>
            <button
              disabled={!canNext}
              onClick={() => actions.setVariantIndex(state.currentVariantIndex + 1)}
              className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        className="shrink-0 border-t p-3 space-y-3"
        style={{ borderColor: "var(--color-border)", background: "var(--color-panel)" }}
      >
        {state.error && (
          <div
            className="px-3 py-2 rounded-md text-xs"
            style={{ background: "var(--color-destructive)", color: "white" }}
          >
            {state.error}
          </div>
        )}

        {/* Prompt */}
        <Textarea
          placeholder="Describe what to generate..."
          value={state.prompt}
          onChange={(e) => actions.setPrompt(e.target.value)}
          className="!min-h-[60px] resize-none"
        />

        {/* Settings row */}
        <div className="flex gap-2 flex-wrap items-end">
          <div className="flex-1 min-w-[120px]">
            <Select
              label="Mode"
              options={GENERATION_MODES.map((m) => ({ value: m.value, label: m.label }))}
              value={state.mode}
              onChange={(e) => actions.setMode(e.target.value as GenerationMode)}
            />
          </div>

          {state.mode !== "MAP" && (
            <div className="flex-1 min-w-[100px]">
              <Select
                label="Aspect Ratio"
                options={ASPECT_RATIOS.map((a) => ({ value: a.value, label: `${a.label} (${a.w}×${a.h})` }))}
                value={state.aspectRatio}
                onChange={(e) => actions.setAspectRatio(e.target.value as AspectRatio)}
              />
            </div>
          )}

          <div className="w-16">
            <Input
              label="Batch"
              type="number"
              min={1}
              max={10}
              value={state.batchCount}
              onChange={(e) => actions.setBatchCount(Math.max(1, Math.min(10, Number(e.target.value))))}
            />
          </div>

          <div className="flex-1 min-w-[140px]">
            <Input
              label="Style Text"
              placeholder="Optional style override..."
              value={state.styleText}
              onChange={(e) => actions.setStyleText(e.target.value)}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 items-center">
          <Button
            variant="primary"
            onClick={handleGenerate}
            loading={state.isGenerating}
            disabled={!state.serviceOnline || state.isGenerating}
            className="!bg-[#2a5a2a] hover:!bg-[#3a7a3a] flex-1"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {state.isGenerating ? "Generating..." : "Generate"}
          </Button>

          {state.generatedImages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={actions.clearGeneratedImages}
              title="Clear all variants"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}

          <span className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
            {effectiveW}×{effectiveH}
          </span>
        </div>
      </div>
    </div>
  );
}
