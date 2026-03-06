# DECISIONS — Shawnderland OKDO

## 001 — Next.js 15 over plain Vite

The hub needs SSR, API routes, and proxy rewrites. Next.js provides all three
out of the box. Vite would require custom middleware for proxy routing.

## 002 — @xyflow/react as shared canvas library

ShawnderMind and ConceptLab already use @xyflow/react. Using it for the hub's
home screen creates visual consistency and enables future cross-tool data flow
wiring.

## 003 — Native React pages over iframes

Tool workspaces render as native React components inside the hub. This gives
access to the shared design system, state management, and avoids iframe
security/performance overhead.

## 004 — Workspace keep-alive pattern

Visited tool panels stay mounted (visibility: hidden) instead of unmounting.
This preserves state, scroll position, and avoids re-initialization when
switching between tools.

## 005 — Walter as launcher-only

Walter Storyboarding is Electron-only with no HTTP API layer. The hub shows
a launcher/status page. Full web integration is deferred.

## 006 — Shared design system as local package

@shawnderland/ui lives in packages/ui/ and is resolved via tsconfig paths.
This avoids npm publishing while keeping a clean module boundary.

## 007 — Singleton external store for Tool Editor

The Tool Editor uses a module-level singleton store accessed via
`useSyncExternalStore`, rather than React Context. Rationale: the Tool Editor
has no provider hierarchy needs, the store is simple (nodes + edges + grid),
and a singleton avoids the provider wrapper boilerplate. This differs from
ShawnderMind (which uses SessionContext) because the Tool Editor has no
session persistence, no multi-session switching, and no backend integration.

## 008 — Thinking Tier model mapping

Three thinking tiers map to distinct Gemini models:
- Quick → gemini-2.0-flash-lite (fast, lower cost, concise prompts)
- Standard → gemini-2.0-flash (balanced, default)
- Deep → gemini-2.0-flash-thinking-exp (maximum creativity, longer processing)

Tier selection propagates to all pipeline stages via `appendTierDirective()`,
which injects tier-specific prompt instructions (conciseness for Quick,
depth/creativity for Deep). The provider reads the tier from
`session.settings.thinkingTier`.

## 009 — Influence merging via structured prompt blocks

Influence nodes (text, document, image, link, video, emotion, persona) are
resolved into a single `[INFLUENCE DIRECTIVES]` block that is appended to
every stage prompt. This "holistic merge" approach was chosen over
per-connection-per-stage injection because:
1. It ensures all stages see the same influence context consistently.
2. It avoids complex per-edge routing logic.
3. The AI prompt explicitly instructs holistic synthesis of all influences.

The `resolveInfluenceContext()` function in `orchestrator.ts` walks all
influence node types and extracts their data. `buildInfluenceBlock()` then
formats them into the structured prompt block.

## 010 — Tool Editor as hub-native tool

The Tool Editor lives inside the hub repo (`src/app/tool-editor/`) rather
than in a separate service repo. Rationale: it has no backend, no API,
no external dependencies — it's purely a client-side canvas with JSON export.
Making it hub-native avoids the overhead of a separate repo, service, and
proxy routing for what is essentially a static design tool.

## 011 — Utility dependencies

| Dependency | Purpose |
|---|---|
| dagre | Graph layout algorithm for auto-arranging nodes (pack/group expand) |
| clsx | Conditional CSS class string construction |
| tailwind-merge | Resolves Tailwind class conflicts when merging dynamic classes |
| zod | Runtime schema validation for pipeline stage outputs |

These are standard utility libraries, not architectural choices. They were
selected for broad ecosystem support and small footprint.

## 012 — Dual-backend API routing (AI Studio + Vertex AI)

All Google AI API calls route through `apiConfig.ts`, which detects the
active backend from environment variables and builds URLs accordingly.
Rationale:
1. Some models (e.g. gemini-3-pro-image-preview) may only be available
   on one backend. Supporting both gives maximum model access.
2. Vertex AI offers region-specific endpoints and enterprise features.
3. A centralized URL builder prevents scattered hardcoded endpoints.
4. The security allowlist (`allowlists.ts`) dynamically accepts the
   active backend's hostname.

## 013 — ConceptLab on the unified canvas

ConceptLab nodes (Character, Weapon, Turnaround) live on the same React Flow
canvas as ShawnderMind nodes, rather than in a separate tool view. Rationale:
1. Users can connect ideation pipeline outputs to character/weapon generation.
2. All nodes share the same connection validation, ToolDock search, and
   context menu system.
3. Avoids duplicating canvas infrastructure for a second tool.

The ToolDock was updated with a "Concept Lab" category and a search filter
so users can find nodes across all categories.

## 014 — Node compatibility validation via HOC

A `withCompatCheck` Higher-Order Component wraps every node type in the
`nodeTypes` map, adding error banners below nodes with connection issues.
Rationale:
1. Zero changes needed to individual node component files.
2. Validation rules live in a pure function (`nodeCompatibility.ts`)
   that is easy to test and extend.
3. Errors update reactively as edges change — no manual refresh needed.
4. Uses React Context (`CompatProvider`) to pass the error map from
   FlowCanvas down to every wrapped node.

## 015 — Imagen 4 for primary generation, Gemini for reference-based

CharacterNode and WeaponNode use Imagen 4 (`imagen-4.0-generate-001`) for
initial image generation because it produces the highest quality from
text-only prompts. TurnaroundNode uses Gemini image models for reference-based
generation because they accept multimodal input (image + text prompt).
The user can choose between Gemini 3 Pro (higher fidelity) and Gemini Flash
Image (faster iteration) for turnaround views.

## 016 — Unified canvas chrome via shared hook + components

All four canvas-based tools (ShawnderMind, ConceptLab, Gemini Studio, Tool
Editor) share a `GlobalToolbar` and `CanvasContextMenu` component for
consistent UX. A `useCanvasSession` hook centralizes undo/redo, edge-cutting,
node grouping, clipboard, pin/freeze, and layout persistence. Rationale:
1. Users expect the same toolbar buttons and right-click options everywhere.
2. Centralizing logic prevents each tool from reimplementing undo/redo,
   copy/paste, and edge-cutting independently.
3. ShawnderMind retains its own `useFlowSession` because it has extensive
   pipeline-specific state (sessions, stage execution, packed nodes) that
   would bloat the shared hook. It uses `GlobalToolbar` and
   `CanvasContextMenu` but delegates to its own state management.
4. Tool Editor retains its Zustand-style store (DECISIONS #007) but maps
   its actions to the shared UI components.

## 017 — Preprompt / PostPrompt prompt injection nodes

Two modifier nodes allow users to inject custom prompt text at specific
points in the data flow:
- **Preprompt**: text is prepended before incoming content, resolved via
  `buildPrepromptBlock()` in the orchestrator. Use case: "Keep this in
  mind when processing what follows."
- **PostPrompt**: text is appended after incoming content, resolved via
  `buildPostpromptBlock()`. Use case: "Now summarize the above into an
  image prompt."

Rationale: Influence nodes modify *how* the AI thinks (tone, persona,
constraints), while prompt injection nodes modify *what* the AI reads
by inserting literal text before or after content. This separation keeps
influence merging (holistic synthesis) distinct from explicit prompt
assembly (sequential reading order).

## 018 — Gemini Studio as hub-native tool

Gemini Studio lives inside the hub repo (`src/app/gemini-studio/`) as a
consumer-friendly AI media generation tool. It uses `useCanvasSession`
for canvas state and calls Google AI APIs directly via `apiConfig.ts`.
Rationale: like Tool Editor, it has no external backend — all API calls
go directly to Google AI endpoints from the client. Making it hub-native
avoids a separate repo and proxy overhead.
