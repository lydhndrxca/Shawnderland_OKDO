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
