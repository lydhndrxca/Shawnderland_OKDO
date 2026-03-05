"use client";

import { useCallback, useState } from "react";
import { useUILab, useUILabActions } from "@/lib/ui-lab/UILabContext";
import { removeUI } from "@/lib/ui-lab/api";
import { Button } from "@shawnderland/ui/Button";
import ImageSlot from "./ImageSlot";
import ImageViewer from "./ImageViewer";
import { Layers, ToggleLeft, ToggleRight } from "lucide-react";

export default function RemoveUIPanel() {
  const { state } = useUILab();
  const actions = useUILabActions();
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const handleRemove = useCallback(async () => {
    if (!sourceFile) return;
    actions.setExtracting(true);
    actions.setError(null);
    try {
      const result = await removeUI(sourceFile);
      actions.setRemovedUIImage(result.image);
      setShowOriginal(false);
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : "UI removal failed");
    } finally {
      actions.setExtracting(false);
    }
  }, [sourceFile, actions]);

  const displayImage = showOriginal ? sourceImage : state.removedUIImage;

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4" style={{ color: "var(--color-tool-ui)" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Remove UI Overlays
        </h2>
      </div>
      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Upload a game screenshot and Gemini will remove all HUD elements, health bars,
        minimaps, text overlays, and other UI — reconstructing the clean scene beneath.
      </p>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: upload + controls */}
        <div className="w-64 shrink-0 space-y-3">
          <ImageSlot
            label="Screenshot"
            image={sourceImage}
            onImageSet={(dataUrl, file) => {
              setSourceImage(dataUrl);
              setSourceFile(file);
              actions.setRemovedUIImage(null);
            }}
            onClear={() => {
              setSourceImage(null);
              setSourceFile(null);
              actions.setRemovedUIImage(null);
            }}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleRemove}
            loading={state.isExtracting}
            disabled={!sourceFile || !state.serviceOnline || state.isExtracting}
            className="w-full"
          >
            Remove UI
          </Button>

          {state.removedUIImage && sourceImage && (
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs transition-colors"
              style={{
                background: "var(--color-elevated)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
              }}
            >
              {showOriginal ? (
                <ToggleRight className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
              ) : (
                <ToggleLeft className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
              )}
              {showOriginal ? "Showing Original" : "Showing Cleaned"}
            </button>
          )}
        </div>

        {/* Right: result viewer */}
        <div className="flex-1 min-w-0">
          {state.error && state.activeTab === "remove-ui" && (
            <div
              className="px-3 py-2 rounded-md text-xs mb-2"
              style={{ background: "var(--color-destructive)", color: "white" }}
            >
              {state.error}
            </div>
          )}

          <ImageViewer
            src={displayImage}
            className="h-full w-full"
            downloadName="uilab_cleaned.png"
          />
        </div>
      </div>
    </div>
  );
}
