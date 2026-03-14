"use client";

import type { TabId } from "../types";
import { Layers, LayoutGrid, Clock, Lightbulb, Download } from "lucide-react";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "episode", label: "Builder", icon: <Layers size={13} /> },
  { id: "storyboard", label: "Storyboard", icon: <LayoutGrid size={13} /> },
  { id: "timeline", label: "Timeline", icon: <Clock size={13} /> },
  { id: "ideation", label: "Ideation", icon: <Lightbulb size={13} /> },
  { id: "export", label: "Export", icon: <Download size={13} /> },
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
          {t.icon}
          {t.label}
        </button>
      ))}
    </nav>
  );
}
