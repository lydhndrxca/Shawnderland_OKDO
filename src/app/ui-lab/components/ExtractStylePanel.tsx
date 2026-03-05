"use client";

import { useCallback, useRef, useState } from "react";
import { useUILab, useUILabActions } from "@/lib/ui-lab/UILabContext";
import { extractAttributes } from "@/lib/ui-lab/api";
import { Button } from "@shawnderland/ui/Button";
import ImageSlot from "./ImageSlot";
import { Copy, Palette, ArrowRight } from "lucide-react";

export default function ExtractStylePanel() {
  const { state } = useUILab();
  const actions = useUILabActions();
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleExtract = useCallback(async () => {
    if (!sourceFile) return;
    actions.setExtracting(true);
    actions.setError(null);
    try {
      const result = await extractAttributes(sourceFile);
      actions.setExtractedAttributes(result.attributes);
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      actions.setExtracting(false);
    }
  }, [sourceFile, actions]);

  const copyToClipboard = useCallback(async () => {
    if (state.extractedAttributes) {
      await navigator.clipboard.writeText(state.extractedAttributes);
    }
  }, [state.extractedAttributes]);

  const sendToPrompt = useCallback(() => {
    if (state.extractedAttributes) {
      actions.setPrompt(state.extractedAttributes);
      actions.setTab("generate");
    }
  }, [state.extractedAttributes, actions]);

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4" style={{ color: "var(--color-tool-ui)" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Extract Image Attributes
        </h2>
      </div>
      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Upload an image to extract a detailed description of its visual attributes —
        style, palette, shading, composition — that can be used as a generation prompt.
      </p>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: source image */}
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
              actions.setExtractedAttributes(null);
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
            Extract Attributes
          </Button>
        </div>

        {/* Right: results */}
        <div className="flex-1 flex flex-col gap-2">
          {state.error && state.activeTab === "extract-style" && (
            <div
              className="px-3 py-2 rounded-md text-xs"
              style={{ background: "var(--color-destructive)", color: "white" }}
            >
              {state.error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
              Extracted Attributes
            </span>
            <div className="flex gap-1">
              <button
                onClick={copyToClipboard}
                disabled={!state.extractedAttributes}
                className="p-1 rounded hover:bg-[var(--color-hover)] transition-colors disabled:opacity-30"
                title="Copy to clipboard"
              >
                <Copy className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
              </button>
              <button
                onClick={sendToPrompt}
                disabled={!state.extractedAttributes}
                className="p-1 rounded hover:bg-[var(--color-hover)] transition-colors disabled:opacity-30"
                title="Send to Generate prompt"
              >
                <ArrowRight className="h-3.5 w-3.5" style={{ color: "var(--color-text-muted)" }} />
              </button>
            </div>
          </div>

          <textarea
            ref={textRef}
            readOnly
            value={state.extractedAttributes || ""}
            placeholder="Attributes will appear here..."
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
