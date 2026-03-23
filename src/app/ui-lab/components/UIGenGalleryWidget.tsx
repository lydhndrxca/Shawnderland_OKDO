"use client";

import { useCallback, useState } from "react";
import { Download, RotateCcw, Save, Trash2 } from "lucide-react";

interface UIGenResult {
  id: string;
  image: string;
  prompt: string;
  elementType: string;
}

export default function UIGenGalleryWidget() {
  const [results, setResults] = useState<UIGenResult[]>([]);

  const handleDelete = useCallback((id: string) => {
    setResults((prev) => prev.filter((r) => r.id !== id));
  }, []);

  if (results.length === 0) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: "var(--color-background)" }}>
        <div className="text-center space-y-2">
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            No generated elements yet
          </p>
          <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            Configure the UI Generator controls and click Generate Elements
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3" style={{ background: "var(--color-background)" }}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {results.map((result) => (
          <UIGenCard
            key={result.id}
            result={result}
            onDelete={() => handleDelete(result.id)}
          />
        ))}
      </div>
    </div>
  );
}

function UIGenCard({
  result,
  onDelete,
}: {
  result: UIGenResult;
  onDelete: () => void;
}) {
  return (
    <div
      className="rounded-lg overflow-hidden flex flex-col"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      {/* Image */}
      <div className="relative aspect-square" style={{ background: "var(--color-elevated)" }}>
        <img
          src={
            result.image.startsWith("data:")
              ? result.image
              : `data:image/png;base64,${result.image}`
          }
          alt={result.prompt}
          className="w-full h-full object-contain"
          draggable={false}
          style={{
            imageRendering: "pixelated",
            background:
              "repeating-conic-gradient(var(--color-elevated) 0% 25%, var(--color-background) 0% 50%) 50% / 16px 16px",
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-t" style={{ borderColor: "var(--color-border)" }}>
        <button
          title="Save to library"
          className="p-1 rounded hover:bg-[var(--color-hover)] transition-colors"
          style={{ color: "var(--color-text-primary)" }}
        >
          <Save className="h-3.5 w-3.5" />
        </button>
        <button
          title="Download"
          className="p-1 rounded hover:bg-[var(--color-hover)] transition-colors"
          style={{ color: "var(--color-text-primary)" }}
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          title="Rerun"
          className="p-1 rounded hover:bg-[var(--color-hover)] transition-colors"
          style={{ color: "var(--color-text-primary)" }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1" />
        <button
          title="Delete"
          onClick={onDelete}
          className="p-1 rounded hover:bg-[var(--color-hover)] transition-colors"
          style={{ color: "var(--color-destructive)" }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Label */}
      <div className="px-2 py-1 text-[10px] truncate" style={{ color: "var(--color-text-muted)" }}>
        {result.elementType}: {result.prompt || "(no prompt)"}
      </div>
    </div>
  );
}
