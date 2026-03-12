"use client";

import dynamic from "next/dynamic";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { getTool } from "@/lib/registry";
import { ToolShell } from "./ToolShell";
import { SessionProvider } from "@/lib/ideation/context/SessionContext";
import { UILabProvider } from "@/lib/ui-lab/UILabContext";

const HomePage = dynamic(() => import("./HomePage"), { ssr: false });
const IdeationShell = dynamic(
  () => import("@/app/ideation/layout/Shell"),
  { ssr: false }
);

const UILabShell = dynamic(
  () => import("@/app/ui-lab/UILabShell"),
  { ssr: false }
);

const GeminiStudioShell = dynamic(
  () => import("@/app/gemini-studio/GeminiStudioShell"),
  { ssr: false }
);

const ConceptLabShell = dynamic(
  () => import("@/app/concept-lab/ConceptLabShell"),
  { ssr: false }
);

const WalterShell = dynamic(
  () => import("@/app/walter/WalterShell"),
  { ssr: false }
);

const GlobalSettingsPage = dynamic(
  () => import("./GlobalSettingsPage"),
  { ssr: false }
);

function HomeContent() {
  return <HomePage />;
}

function ToolLandingContent({ toolId }: { toolId: string }) {
  const tool = getTool(toolId);
  if (!tool) return <div className="p-8 text-muted-foreground">Tool not found</div>;

  return (
    <ToolShell
      toolId={toolId}
      title={tool.name}
      description={tool.description}
      breadcrumbs={[{ label: tool.name }]}
      accentColor={tool.accentColor}
    >
      <div className="max-w-2xl mx-auto space-y-6 p-6">
        <div className="grid grid-cols-2 gap-3">
          {tool.features.map((f) => (
            <div
              key={f}
              className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground"
            >
              {f}
            </div>
          ))}
        </div>

        {tool.mode === "electron-only" ? (
          <div className="rounded-lg border border-border bg-card/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Desktop only.</span>{" "}
              Launch with:{" "}
              <code className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-mono">
                {tool.startCommand}
              </code>
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Not running?</span>{" "}
              Start the service:{" "}
              <code className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px] font-mono">
                {tool.startCommand}
              </code>
            </p>
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function IdeationContent() {
  return (
    <SessionProvider>
      <IdeationShell />
    </SessionProvider>
  );
}

function UILabContent() {
  return (
    <UILabProvider>
      <UILabShell />
    </UILabProvider>
  );
}

function getToolPrefix(path: string): string {
  const seg = path.split("/").filter(Boolean)[0];
  return seg ? `/${seg}` : "/";
}

function resolveRoute(path: string): React.ReactNode {
  if (path === "/") return <HomeContent />;
  if (path === "/settings") return <GlobalSettingsPage />;
  if (path === "/ideation") return <IdeationContent />;
  if (path === "/sprite-lab") return <ToolLandingContent toolId="sprite-lab" />;
  if (path === "/ui-lab") return <UILabContent />;
  if (path === "/gemini-studio") return <GeminiStudioShell />;
  if (path === "/concept-lab") return <ConceptLabShell />;
  if (path === "/walter") return <WalterShell />;
  return <div className="p-8 text-muted-foreground">Page not found</div>;
}

export function WorkspaceRenderer() {
  const { activePath, visitedPaths, resetKeys } = useWorkspace();

  return (
    <div className="relative h-full w-full">
      {visitedPaths.map((path) => {
        const prefix = getToolPrefix(path);
        const key = `${path}__${resetKeys[prefix] || 0}`;
        const isActive = path === activePath;

        return (
          <div
            key={key}
            className="absolute inset-0"
            style={{
              display: isActive ? "block" : "none",
              overflowY: "auto",
            }}
          >
            {resolveRoute(path)}
          </div>
        );
      })}
    </div>
  );
}
