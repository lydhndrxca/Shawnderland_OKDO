"use client";

import { useCallback, useState } from "react";
import { useUILab, useUILabActions } from "@/lib/ui-lab/UILabContext";
import { extractSpec } from "@/lib/ui-lab/api";
import { Button } from "@shawnderland/ui/Button";
import ImageSlot from "./ImageSlot";
import { Copy, ScanSearch } from "lucide-react";

export default function ExtractSpecPanel() {
  const { state } = useUILab();
  const actions = useUILabActions();
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  const handleExtract = useCallback(async () => {
    if (!sourceFile) return;
    actions.setExtracting(true);
    actions.setError(null);
    try {
      const result = await extractSpec(sourceFile);
      actions.setExtractedSpec(result);
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : "Spec extraction failed");
    } finally {
      actions.setExtracting(false);
    }
  }, [sourceFile, actions]);

  const copySpec = useCallback(async () => {
    if (state.extractedSpec) {
      await navigator.clipboard.writeText(JSON.stringify(state.extractedSpec, null, 2));
    }
  }, [state.extractedSpec]);

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <div className="flex items-center gap-2">
        <ScanSearch className="h-4 w-4" style={{ color: "var(--color-tool-ui)" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Extract Icon Spec
        </h2>
      </div>
      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Upload an icon or UI element image to extract a structured JSON specification —
        shape language, material, colors, outline style, shading, and rendering medium.
      </p>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-64 shrink-0 space-y-3">
          <ImageSlot
            label="Source Image"
            image={sourceImage}
            onImageSet={(dataUrl, file) => {
              setSourceImage(dataUrl);
              setSourceFile(file);
            }}
            onClear={() => {
              setSourceImage(null);
              setSourceFile(null);
              actions.setExtractedSpec(null);
            }}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleExtract}
            loading={state.isExtracting}
            disabled={!sourceFile || !state.serviceOnline || state.isExtracting}
            className="w-full"
          >
            Extract Spec
          </Button>
        </div>

        <div className="flex-1 flex flex-col gap-2">
          {state.error && state.activeTab === "extract-spec" && (
            <div
              className="px-3 py-2 rounded-md text-xs"
              style={{ background: "var(--color-destructive)", color: "white" }}
            >
              {state.error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Icon Specification (JSON)
            </span>
            <button
              onClick={copySpec}
              disabled={!state.extractedSpec}
              className="p-1 rounded hover:bg-[var(--color-hover)] transition-colors disabled:opacity-30"
              title="Copy JSON"
            >
              <Copy className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
            </button>
          </div>

          <textarea
            readOnly
            value={state.extractedSpec ? JSON.stringify(state.extractedSpec, null, 2) : ""}
            placeholder="Spec JSON will appear here..."
            className="flex-1 w-full p-3 rounded-md text-xs font-mono resize-none outline-none"
            style={{
              background: "var(--color-elevated)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
