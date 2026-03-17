"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { WorkspaceProvider } from "@/lib/workspace/WorkspaceContext";
import { WorkspaceRenderer } from "./WorkspaceRenderer";
import { cancelAll } from "@/lib/activeRequests";

export function ClientShell({ children }: { children: React.ReactNode }) {
  void children;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((p) => !p), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    }

    function handleBeforeUnload() {
      cancelAll();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <WorkspaceProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          onOpenCommandPalette={openPalette}
        />
        <main className="flex-1 overflow-hidden relative bg-background">
          <WorkspaceRenderer />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </WorkspaceProvider>
  );
}
