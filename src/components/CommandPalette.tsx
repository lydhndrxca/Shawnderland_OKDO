"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { TOOLS } from "@/lib/registry";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { getVisibleTools } from "@/lib/profiles";

interface PaletteItem {
  id: string;
  label: string;
  section: string;
  href: string;
  accent?: string;
}

function buildItems(): PaletteItem[] {
  const items: PaletteItem[] = [
    { id: "home", label: "Home", section: "Navigation", href: "/" },
  ];

  for (const tool of getVisibleTools(TOOLS)) {
    items.push({
      id: tool.id,
      label: tool.name,
      section: "Tools",
      href: tool.href,
      accent: tool.accentColor,
    });
  }

  return items;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const workspace = useWorkspace();

  const allItems = buildItems();
  const filtered = query.trim()
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.section.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  const navigate = useCallback(
    (href: string) => {
      onClose();
      setQuery("");
      workspace.navigate(href);
    },
    [onClose, workspace]
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!open) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        navigate(filtered[selectedIndex].href);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, filtered, selectedIndex, navigate]);

  if (!open) return null;

  let lastSection = "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] animate-fade-in-fast"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/80" />

      <div
        className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl shadow-black/40 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            Esc
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No results found.
            </p>
          )}

          {filtered.map((item, i) => {
            const showSection = item.section !== lastSection;
            lastSection = item.section;

            return (
              <div key={item.id}>
                {showSection && (
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                    {item.section}
                  </p>
                )}
                <button
                  onClick={() => navigate(item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    i === selectedIndex
                      ? "bg-muted/80 text-foreground"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  {item.accent && (
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.accent }}
                    />
                  )}
                  <span className="flex-1 text-left">{item.label}</span>
                  {i === selectedIndex && (
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
