# ARCHITECTURE — Shawnderland OKDO

## Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript 5
- **Styling:** Tailwind CSS v4 + CSS custom properties
- **Canvas UI:** @xyflow/react 12, dagre
- **Validation:** Zod
- **Icons:** lucide-react

## Run Entrypoint

```
run.bat
```

Checks for Node.js, installs dependencies if needed, clears port 3000,
starts `npm run dev`, waits for server, opens browser.

## Project Structure

```
packages/ui/           @shawnderland/ui design system
src/app/               Next.js App Router pages
src/components/        React components (Sidebar, HubCanvas, ToolNode, etc.)
src/lib/               Shared utilities, registry, workspace context
next.config.ts         Proxy rewrites to tool backends
```

## Proxy Routing

| Hub Path | Backend |
|----------|---------|
| /api/tools/sprite-lab/* | localhost:4001 |
| /api/tools/ideation/* | localhost:5173 |
| /api/tools/ui-lab/* | localhost:4003 |
| /api/tools/concept-lab/* | localhost:5174 |

Overridable via env vars: SPRITE_LAB_URL, SHAWNDERMIND_URL, UI_LAB_URL, CONCEPT_LAB_URL.

## Workspace Keep-Alive

The WorkspaceRenderer mounts a panel for each visited path. Only the active
panel is visible; inactive panels remain in the DOM to preserve React state,
scroll position, and in-flight requests.
