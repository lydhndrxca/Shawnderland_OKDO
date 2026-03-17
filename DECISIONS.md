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

## 005 — Walter as launcher-only *(SUPERSEDED by ADR 029)*

~~Walter Storyboarding is Electron-only with no HTTP API layer. The hub shows
a launcher/status page. Full web integration is deferred.~~

Walter is now an extracted workspace package (`@tools/walter`) in `tools/walter/`,
lazy-loaded by the hub via `next/dynamic`. See ADR 029.

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

## 019 — External API proxy pattern (Meshy, Hitem3D, ElevenLabs)

All third-party API calls route through Next.js API routes (`/api/meshy`,
`/api/hitem3d`, `/api/elevenlabs`). API keys are stored server-side only
in `process.env`. Rationale:
1. API keys are never exposed to the browser.
2. The proxy can handle CORS, signed URL expiration (GLB download proxy),
   and multipart form data (Hitem3D image uploads).
3. Each integration follows the same pattern: server-side proxy route +
   client-side library (`meshyApi.ts`, `hitem3dApi.ts`, `elevenlabsApi.ts`).
4. Async tasks (Meshy, Hitem3D) return a task ID; the client polls the
   proxy until completion.

## 020 — Three-layer session auto-persistence

Session state is persisted across three layers for reliability:
1. **localStorage** — debounced auto-save (~2s) of canvas layout
   (`useCanvasSession`) and session state (`SessionContext`). Fast and
   synchronous, limited to ~5MB.
2. **IndexedDB** — `layoutStore.ts`, `filesStore.ts`, `styleStore.ts`
   for named layouts, file references, and style presets.
3. **Filesystem** — `/api/session` route for named session save/load
   to `saved-sessions/`. Handles arbitrarily large payloads (100+ MB
   with embedded base64 images).

Rationale: localStorage alone cannot handle large sessions with embedded
images. IndexedDB handles medium-size data. The filesystem API handles
the largest payloads and enables explicit "Save As" / "Open" workflows.

On canvas load, the system first attempts to restore from the auto-save
key in localStorage, then falls back to named layouts.

## 021 — 3D generation: Meshy vs Hitem3D

Both providers are integrated because they serve different niches:
- **Meshy**: General-purpose image-to-3D. Simple API, fast turnaround.
- **Hitem3D**: Finer control (resolution, polygon count, output format),
  portrait-specialized models, and staged texturing (geometry first,
  then texture separately on v1.5).

Users choose the provider based on their needs. The 3D Model Viewer node
accepts results from either provider via a `UnifiedModelResult` type.

## 022 — ElevenLabs for audio generation

ElevenLabs was chosen for audio capabilities (TTS, SFX, voice cloning)
because it provides:
1. High-quality voice synthesis with multiple models (Eleven v3, Flash v2.5).
2. Sound effect generation from text prompts.
3. Instant voice cloning from short audio samples.

Two Gemini-powered companion nodes (Voice Designer, Dialogue Writer)
generate text content that feeds into the ElevenLabs TTS node, creating
a character-voice-prototyping pipeline: image → voice description →
dialogue lines → synthesized audio.

## 023 — Walter: Staged AI generation over single-prompt

Walter uses a three-stage pipeline (story overview → beat breakdown →
shot expansion) rather than a single large prompt. Rationale: staged
generation gives finer controllability, allows user review between stages,
and reduces risk of the model "forgetting" earlier context in long outputs.

## 024 — Walter: Story blocks map to beats

The timeline block library (Hook, Reveal, Dialogue Beat, etc.) uses the
same concept as beats — adding a block creates a beat. Rationale:
consistent naming avoids confusion between "block" and "beat" terminology;
the UI presents blocks as building blocks that become beats on the timeline.

## 025 — Walter: Canon memory in localStorage

Walter Brain (characters, locations, lore, archived episodes) is stored
in localStorage, consistent with existing project storage. Rationale:
no new persistence layer; same portability and offline behavior as
Walter projects; brain data is small enough for localStorage limits.

## 026 — Walter: Scoped AI rewrite preserves surrounding narrative

Double-clicking a beat band triggers AI rewrite of only that block.
Rationale: full regeneration is destructive — users lose manual edits
and surrounding context. Scoped rewrite lets users refine one beat
without risking the rest of the storyboard.

## 027 — Walter: Shoot sheet as plaintext format

The shoot sheet export uses a plaintext format (not JSON or PDF).
Rationale: portable, printable, no dependencies; filmmakers can paste
into any document or print for on-set use; avoids PDF generation libraries.

## 028 — Walter Brain seeded from real canon

Walter Brain is seeded from analysis of 28 real Walter Instagram episodes,
not synthetic data. Rationale: authentic canon produces more faithful
AI output; characters, locations, and tone reflect actual series content.

## 029 — Monorepo workspace extraction for tool isolation

Tools are extracted into `tools/` as npm workspace packages. Rationale:
keeps codebases separate, enables per-tool Cursor workspaces, shared UI
propagates via `@shawnderland/ui` tokens, tools lazy-load via
`next/dynamic`. Walter is the first extracted tool. Future tools
(ShawnderMind, Gemini Studio) follow the same pattern.

## 030 — Profile system for work/personal tool filtering

Each tool is tagged with profiles (work, personal, or both). Sidebar,
command palette, and home page filter by active profile. Stored in
localStorage. Rationale: user needs work tools hidden during personal
use and vice versa; no access control needed, just UI filtering.

## 031 — Walter rebuild as multi-agent 3-screen workflow

Replaced the tab-based storyboard editor with a 3-screen architecture:
Planning Page → Writing Room → Staging Room. Rationale: the user's
production outline requires collaborative AI episode development with
producer orchestration, multi-agent personas, and a timeline-based staging
room — fundamentally different from the previous wizard + grid + timeline
layout. The agent/persona system uses deep research-driven profiles
(not shallow role labels) for richer creative collaboration. Session-based
state (not project-based) keeps all screens persistent and revisitable.

## 032 — WIP status system for tools

Tools can be tagged `status: "wip"` in the registry. WIP tools render
with reduced opacity and a badge on the home page, and appear below a
divider in the sidebar. Rationale: Sprite Lab and UI Lab are incomplete
but should remain visible to indicate future capability.

## 033 — Default canvas layouts as hardcoded fallback

Default layouts for ConceptLab and ShawnderMind are stored in
`src/lib/defaultLayouts.ts`. When a user first visits with no saved
layout in localStorage, the default layout loads automatically.
Rationale: ensures new users see a populated canvas demonstrating the
tool's capabilities instead of an empty workspace.

## 034 — AI Writing Room as monorepo tool package

The AI Writing Room (`tools/writing-room/`) follows the same monorepo
extraction pattern as Walter (`tools/walter/`). Imported as
`@tools/writing-room`, uses `@shawnderland/ai` for Gemini calls
(not its own wrapper), CSS scoped to `.wr-root` (no global leaks),
lazy-loaded via `next/dynamic` in WorkspaceRenderer. Rationale: code
reuse, shared AI proxy, consistent architecture, single dev server.

## 035 — Writing Room: 2-screen workflow (no Staging Room)

The AI Writing Room uses a 2-screen workflow (Planning → Writing Room)
instead of Walter's 3-screen (Planning → Writing → Staging). Summary
and transcript export replace the Staging Room's one-sheet export.
Rationale: the Staging Room is Walter-specific (timeline, shot planning).
Generalized writing projects need output summary, not production plans.

## 036 — Writing Room: 10 preset personas with deep profiles

10 preset personas include 4 adapted from Walter (Producer, Serling,
Fielder, Pera — with generalized WHAT I BRING sections) and 6 new
(Gritty Script Writer, Unhinged, David Lynch, Award-Winning Game
Designer, Unhinged Game Designer, Korean Game Producer Executive).
Each uses the same deep first-person format (WHO I AM, HOW I WORK,
MY INSTINCTS, WHAT I BRING, WHAT I WOULD NEVER DO). Rationale:
diverse creative perspectives for game development and general writing
contexts.

## 037 — ConceptLab sub-tool navigation via expandable sidebar

ConceptLab uses an expandable dropdown in the sidebar (same pattern as
Files) to expose 4 sub-tools: Concept Lab, AI Upres, AI Restore, Style
Conversion. Each sub-tool routes to a unique path (`/concept-lab/*`) and
reuses `ConceptLabShell` with a distinct `appKey` prop. This gives each
sub-tool its own saved canvas layout without duplicating the shell.
Rationale: sub-tool workflows (bulk upscale, bulk restore, style
conversion) need dedicated default layouts but share the same canvas
infrastructure.

## 038 — Utility nodes as shared dock category

Five new utility nodes (BulkImageInput, UpresStandalone,
RestoreStandalone, StyleConversion, OutputGallery) are registered in a
new "Utilities" dock category in `sharedNodeTypes.ts`. These are
standalone pipeline nodes designed for the sub-tool workflows but
available on any canvas. They communicate via `_bulkImages` and
`_outputImages` data keys. Rationale: reusable building blocks that work
in both sub-tool default layouts and user-composed canvases.

## 039 — Two-phase Examine → Process workflow for Upres/Restore nodes

The standalone Upres and Restore nodes use a two-phase workflow:
Examine (count input images, show options) → Process (run the API).
This prevents accidental expensive API calls and gives users visibility
into what will be processed before committing. Rationale: batch image
operations can be costly; explicit confirmation prevents waste.
