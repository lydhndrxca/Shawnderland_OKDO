"use client";

import {
  Palette,
  Brain,
  Layout,
  Lightbulb,
  Clapperboard,
  Wrench,
  Home,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { TOOLS } from "@/lib/registry";
import { useWorkspace, WorkspaceLink } from "@/lib/workspace/WorkspaceContext";

const ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  palette: Palette,
  brain: Brain,
  layout: Layout,
  lightbulb: Lightbulb,
  clapperboard: Clapperboard,
  wrench: Wrench,
};

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCommandPalette?: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { activePath } = useWorkspace();

  return (
    <aside
      className={cn(
        "relative flex shrink-0 border-r border-border bg-card/50 backdrop-blur-sm transition-[width] duration-200 ease-in-out overflow-hidden",
        collapsed ? "w-[72px]" : "w-[420px]",
      )}
    >
      {!collapsed && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex h-14 items-center shrink-0 px-5">
            <WorkspaceLink
              href="/"
              className="text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors"
            >
              Shawnderland
            </WorkspaceLink>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
            <WorkspaceLink
              href="/"
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-all",
                activePath === "/"
                  ? "bg-primary/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {activePath === "/" && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary" />
              )}
              <Home className="h-5 w-5 shrink-0" />
              Home
            </WorkspaceLink>

            <div className="my-3 h-px bg-border" />

            <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Applications
            </p>

            {TOOLS.map((tool) => {
              const Icon = ICON_MAP[tool.icon] || Layout;
              const active = activePath.startsWith(tool.href);

              return (
                <WorkspaceLink
                  key={tool.id}
                  href={tool.href}
                  className={cn(
                    "relative flex items-start gap-4 rounded-lg px-4 py-3 transition-all",
                    active
                      ? "bg-muted/60 text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full"
                      style={{ backgroundColor: tool.accentColor }}
                    />
                  )}
                  <Icon
                    className="h-5 w-5 shrink-0 mt-0.5"
                    style={active ? { color: tool.accentColor } : undefined}
                  />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[15px] font-semibold leading-tight">{tool.name}</span>
                    <span className="text-xs text-muted-foreground/70 leading-snug">{tool.tagline}</span>
                  </div>
                </WorkspaceLink>
              );
            })}
          </nav>

          <div className="border-t border-border px-5 py-3 flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground/50 font-mono">v0.1.0</p>
          </div>
        </div>
      )}

      {/* Full-height collapse/expand strip */}
      <button
        onClick={onToggleCollapse}
        className={cn(
          "absolute top-0 right-0 bottom-0 w-[72px] flex flex-col items-center justify-center border-l border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors cursor-pointer bg-transparent",
          collapsed ? "border-l-0" : "",
        )}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 mb-3 shrink-0" />
        ) : (
          <ChevronLeft className="h-4 w-4 mb-3 shrink-0" />
        )}
        <span
          className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground/80"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          Applications
        </span>
      </button>
    </aside>
  );
}
