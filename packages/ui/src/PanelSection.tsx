"use client";

import React, { useState } from "react";

interface PanelSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function PanelSection({
  title,
  defaultOpen = true,
  children,
}: PanelSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider transition-colors"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {title}
        <span className="text-[10px]">{open ? "\u25BE" : "\u25B8"}</span>
      </button>
      {open && (
        <div
          className="px-3 py-2 space-y-2"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
