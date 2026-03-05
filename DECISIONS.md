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
