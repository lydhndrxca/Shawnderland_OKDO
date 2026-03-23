"use client";

import { useCallback, useState } from "react";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = "0123456789".split("");
const SYMBOLS = "!@#$%&*()-+=<>?/".split("");

interface GlyphCell {
  char: string;
  image: string | null;
  selected: boolean;
}

export default function FontGenWidget() {
  const [activeTab, setActiveTab] = useState<"letters" | "numbers">("letters");
  const [glyphs, setGlyphs] = useState<Map<string, string | null>>(() => {
    const map = new Map<string, string | null>();
    [...LETTERS, ...NUMBERS, ...SYMBOLS].forEach((c) => map.set(c, null));
    return map;
  });
  const [selectedGlyphs, setSelectedGlyphs] = useState<Set<string>>(new Set());

  const chars = activeTab === "letters" ? LETTERS : [...NUMBERS, ...SYMBOLS];

  const toggleSelect = useCallback((char: string) => {
    setSelectedGlyphs((prev) => {
      const next = new Set(prev);
      if (next.has(char)) next.delete(char);
      else next.add(char);
      return next;
    });
  }, []);

  const completedCount = chars.filter((c) => glyphs.get(c) != null).length;
  const totalCount = chars.length;

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--color-background)" }}>
      {/* Toggle bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
        <button
          onClick={() => setActiveTab("letters")}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === "letters"
              ? "bg-[var(--color-tool-ui)] text-white"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)]"
          }`}
        >
          Letters
        </button>
        <button
          onClick={() => setActiveTab("numbers")}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === "numbers"
              ? "bg-[var(--color-tool-ui)] text-white"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)]"
          }`}
        >
          Numbers
        </button>
        <div className="flex-1" />
        <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          {completedCount} / {totalCount} generated
        </span>
      </div>

      {/* Glyph grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
          {chars.map((char) => {
            const image = glyphs.get(char);
            const isSelected = selectedGlyphs.has(char);
            return (
              <button
                key={char}
                onClick={() => toggleSelect(char)}
                className={`relative aspect-square rounded-md flex items-center justify-center transition-all ${
                  isSelected ? "ring-2 ring-[var(--color-tool-ui)]" : ""
                }`}
                style={{
                  background: image
                    ? "repeating-conic-gradient(var(--color-elevated) 0% 25%, var(--color-background) 0% 50%) 50% / 12px 12px"
                    : "var(--color-elevated)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {image ? (
                  <img
                    src={image.startsWith("data:") ? image : `data:image/png;base64,${image}`}
                    alt={char}
                    className="w-full h-full object-contain"
                    style={{ imageRendering: "pixelated" }}
                    draggable={false}
                  />
                ) : (
                  <span
                    className="text-lg font-bold"
                    style={{ color: "var(--color-text-muted)", opacity: 0.4 }}
                  >
                    {char}
                  </span>
                )}
                {isSelected && (
                  <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-[var(--color-tool-ui)] flex items-center justify-center">
                    <span className="text-white text-[7px]">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status row */}
      <div className="px-3 py-2 border-t shrink-0 flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
        <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
          {selectedGlyphs.size > 0
            ? `${selectedGlyphs.size} selected`
            : "Click glyphs to select"}
        </span>
        {selectedGlyphs.size > 0 && (
          <button
            onClick={() => setSelectedGlyphs(new Set())}
            className="text-[10px] px-2 py-0.5 rounded hover:bg-[var(--color-hover)] transition-colors"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Clear selection
          </button>
        )}
      </div>
    </div>
  );
}
