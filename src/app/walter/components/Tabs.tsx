"use client";

import type { TabId } from "../types";

const TABS: { id: TabId; label: string }[] = [
  { id: "episode", label: "Episode Builder" },
  { id: "storyboard", label: "Storyboard" },
  { id: "timeline", label: "Timeline" },
  { id: "ideation", label: "Ideation" },
  { id: "export", label: "Export" },
];

interface TabsProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function Tabs({ active, onChange }: TabsProps) {
  return (
    <nav className="tabs-bar">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`tab-btn ${active === t.id ? "active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
