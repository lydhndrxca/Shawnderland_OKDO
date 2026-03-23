"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUILabActions } from "@/lib/ui-lab/UILabContext";
import type { GenerationMode } from "@/lib/ui-lab/types";

interface Command {
  id: string;
  name: string;
  description: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  extraCommands?: Command[];
}

export default function CommandPalette({ open, onClose, extraCommands = [] }: CommandPaletteProps) {
  const actions = useUILabActions();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const builtinCommands: Command[] = useMemo(
    () => [
      {
        id: "reset",
        name: "Reset Session",
        description: "Clear all images, prompts, and settings",
        action: () => { actions.resetSession(); onClose(); },
      },
      {
        id: "mode-freeform",
        name: "Switch to Generate Image",
        description: "Freeform image generation mode",
        action: () => { actions.setMode("FREEFORM" as GenerationMode); onClose(); },
      },
      {
        id: "mode-uigen",
        name: "Switch to UI Generator",
        description: "Generate UI elements",
        action: () => { actions.setMode("UI_GEN" as GenerationMode); onClose(); },
      },
      {
        id: "mode-romz",
        name: "Switch to ROMs Sticker Art",
        description: "ROMZ sticker art generation",
        action: () => { actions.setMode("ROMZ" as GenerationMode); onClose(); },
      },
      {
        id: "mode-map",
        name: "Switch to Map Icons",
        description: "B&W minimalist map icons at 48×48",
        action: () => { actions.setMode("MAP" as GenerationMode); onClose(); },
      },
      {
        id: "mode-dp",
        name: "Switch to Dimension Planner",
        description: "Canvas-based layout editor",
        action: () => { actions.setMode("DIM_PLANNER" as GenerationMode); onClose(); },
      },
      {
        id: "mode-fontgen",
        name: "Switch to Font Generator",
        description: "Generate glyph images and export fonts",
        action: () => { actions.setMode("FONT_GEN" as GenerationMode); onClose(); },
      },
      {
        id: "tab-mainstage",
        name: "Go to Mainstage",
        description: "Switch to the Mainstage tab",
        action: () => { actions.setImageTab("Mainstage"); onClose(); },
      },
      {
        id: "tab-style",
        name: "Go to Style Library",
        description: "Switch to the Style Library tab",
        action: () => { actions.setImageTab("StyleLibrary"); onClose(); },
      },
      {
        id: "tab-refa",
        name: "Go to Ref A",
        description: "Switch to the Ref A tab",
        action: () => { actions.setImageTab("RefA"); onClose(); },
      },
      {
        id: "tab-refb",
        name: "Go to Ref B",
        description: "Switch to the Ref B tab",
        action: () => { actions.setImageTab("RefB"); onClose(); },
      },
      {
        id: "tab-refc",
        name: "Go to Ref C",
        description: "Switch to the Ref C tab",
        action: () => { actions.setImageTab("RefC"); onClose(); },
      },
      {
        id: "tab-extract",
        name: "Go to Extract Style",
        description: "Switch to the Extract Style tab",
        action: () => { actions.setImageTab("Extract"); onClose(); },
      },
      {
        id: "tab-extractbg",
        name: "Go to Extract Background",
        description: "Switch to the Extract BG tab",
        action: () => { actions.setImageTab("ExtractBG"); onClose(); },
      },
      ...extraCommands,
    ],
    [actions, onClose, extraCommands],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return builtinCommands;
    const tokens = query.toLowerCase().split(/\s+/);
    return builtinCommands.filter((cmd) => {
      const haystack = `${cmd.name} ${cmd.description}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }, [query, builtinCommands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const execute = useCallback(
    (idx: number) => {
      const cmd = filtered[idx];
      if (cmd) cmd.action();
    },
    [filtered],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        execute(selectedIndex);
        return;
      }
    },
    [onClose, filtered.length, selectedIndex, execute],
  );

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-cmd-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Palette */}
      <div
        className="relative w-[480px] max-h-[360px] rounded-lg overflow-hidden flex flex-col"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command\u2026"
          className="w-full px-4 py-3 text-sm focus:outline-none border-b"
          style={{
            background: "var(--color-surface)",
            color: "var(--color-text-primary)",
            borderColor: "var(--color-border)",
            caretColor: "var(--color-tool-ui)",
          }}
        />

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
              No matching commands
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                data-cmd-item
                onClick={() => execute(i)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                  i === selectedIndex ? "bg-[var(--color-tool-ui)]" : "hover:bg-[var(--color-hover)]"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-medium truncate"
                    style={{ color: i === selectedIndex ? "white" : "var(--color-text-primary)" }}
                  >
                    {cmd.name}
                  </div>
                  <div
                    className="text-[10px] truncate"
                    style={{ color: i === selectedIndex ? "rgba(255,255,255,0.7)" : "var(--color-text-muted)" }}
                  >
                    {cmd.description}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
