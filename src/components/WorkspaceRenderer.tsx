"use client";

import dynamic from "next/dynamic";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { SessionProvider } from "@/lib/ideation/context/SessionContext";

const HomePage = dynamic(() => import("./HomePage"), { ssr: false });
const IdeationShell = dynamic(
  () => import("@/app/ideation/layout/Shell"),
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
  () => import("@tools/walter").then((m) => ({ default: m.WalterShell })),
  { ssr: false }
);

const WritingRoomShell = dynamic(
  () => import("@tools/writing-room").then((m) => ({ default: m.WritingRoomShell })),
  { ssr: false }
);

const GlobalSettingsPage = dynamic(
  () => import("./GlobalSettingsPage"),
  { ssr: false }
);

const GenerateImageShell = dynamic(
  () => import("@/app/generate-image/GenerateImageShell"),
  { ssr: false }
);

function HomeContent() {
  return <HomePage />;
}

function IdeationContent() {
  return (
    <SessionProvider>
      <IdeationShell />
    </SessionProvider>
  );
}

function WipPlaceholder() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
      }}
    >
      <span
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: "var(--muted-foreground, #666)",
          letterSpacing: "0.04em",
          opacity: 0.5,
        }}
      >
        Work in Progress
      </span>
    </div>
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
  if (path === "/gemini-studio") return <GeminiStudioShell />;
  if (path === "/concept-lab") return <ConceptLabShell />;
  if (path === "/concept-lab/upres") return <ConceptLabShell appKey="concept-lab:upres" />;
  if (path === "/concept-lab/restore") return <ConceptLabShell appKey="concept-lab:restore" />;
  if (path === "/concept-lab/style-conversion") return <ConceptLabShell appKey="concept-lab:style-conversion" />;
  if (path === "/concept-lab/gemini-editor") return <WipPlaceholder />;
  if (path === "/concept-lab/proplab") return <ConceptLabShell appKey="concept-lab:proplab" />;
  if (path === "/concept-lab/generate-image") return <GenerateImageShell />;
  if (path === "/walter") return <WalterShell />;
  if (path === "/writing-room") return <WritingRoomShell />;
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
              visibility: isActive ? "visible" : "hidden",
              pointerEvents: isActive ? "auto" : "none",
              zIndex: isActive ? 1 : 0,
              overflowY: isActive ? "auto" : "hidden",
            }}
          >
            {resolveRoute(path)}
          </div>
        );
      })}
    </div>
  );
}
