"use client";

import { useEffect } from "react";
import { useUILab, useUILabActions } from "@/lib/ui-lab/UILabContext";
import { checkHealth } from "@/lib/ui-lab/api";
import type { UILabTab } from "@/lib/ui-lab/types";
import {
  Paintbrush,
  Palette,
  ScanSearch,
  Layers,
  LayoutGrid,
  Wifi,
  WifiOff,
} from "lucide-react";
import GeneratePanel from "./components/GeneratePanel";
import ExtractStylePanel from "./components/ExtractStylePanel";
import ExtractSpecPanel from "./components/ExtractSpecPanel";
import RemoveUIPanel from "./components/RemoveUIPanel";
import DimensionPlanner from "./components/DimensionPlanner";
import RefSlotsPanel from "./components/RefSlotsPanel";

const TABS: { id: UILabTab; label: string; icon: typeof Paintbrush }[] = [
  { id: "generate", label: "Generate", icon: Paintbrush },
  { id: "extract-style", label: "Extract Style", icon: Palette },
  { id: "extract-spec", label: "Extract Spec", icon: ScanSearch },
  { id: "remove-ui", label: "Remove UI", icon: Layers },
  { id: "dimension-planner", label: "Dim Planner", icon: LayoutGrid },
];

export default function UILabShell() {
  const { state } = useUILab();
  const { setServiceOnline } = useUILabActions();

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      const ok = await checkHealth();
      if (mounted) setServiceOnline(ok);
    };
    poll();
    const interval = setInterval(poll, 10_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [setServiceOnline]);

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-base)]">
      <TabBar />
      <div className="flex-1 min-h-0 flex">
        {state.activeTab === "generate" && (
          <>
            <RefSlotsPanel />
            <div className="flex-1 min-w-0">
              <GeneratePanel />
            </div>
          </>
        )}
        {state.activeTab === "extract-style" && (
          <div className="flex-1 min-w-0">
            <ExtractStylePanel />
          </div>
        )}
        {state.activeTab === "extract-spec" && (
          <div className="flex-1 min-w-0">
            <ExtractSpecPanel />
          </div>
        )}
        {state.activeTab === "remove-ui" && (
          <div className="flex-1 min-w-0">
            <RemoveUIPanel />
          </div>
        )}
        {state.activeTab === "dimension-planner" && (
          <>
            <RefSlotsPanel />
            <div className="flex-1 min-w-0">
              <DimensionPlanner />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TabBar() {
  const { state } = useUILab();
  const { setTab } = useUILabActions();

  return (
    <div
      className="flex items-center gap-1 px-3 py-2 border-b shrink-0"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = state.activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                active
                  ? "bg-[var(--color-tool-ui)] text-white"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 text-xs shrink-0 ml-2">
        {state.serviceOnline ? (
          <span className="flex items-center gap-1 text-[var(--color-success)]">
            <Wifi className="h-3 w-3" /> Service Online
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
            <WifiOff className="h-3 w-3" /> Service Offline
          </span>
        )}
      </div>
    </div>
  );
}
