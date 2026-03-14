# Master Repo Report

| Field | Value |
|-------|-------|
| Project root | `c:\Dev\Shawnderland_OKDO` |
| Generated at | 2026-03-14 14:43:53 |
| Includes | Snapshot + Health Audit + Comprehensive Repo Report + TASKS |
| Health | **YELLOW** (report_id: 20260314_144353) |

---

## Repo Snapshot

# Repo Snapshot — 2026-03-14

## Overview

**Report ID:** 20260314_144353  
**Repo root:** c:\Dev\Shawnderland_OKDO  
**Generated:** 2026-03-14 14:43:53

Monorepo with Next.js 15, React 19, TypeScript 5. Contains ShawnderMind (ideation), Gemini Studio, ConceptLab, Tool Editor, UI Lab, and Walter Storyboarding. Single design system (packages/ui), single router pattern.

---

## Governance Docs

All exist: PROJECT.md, SPEC.md, ARCHITECTURE.md, DECISIONS.md, TASKS.md, README.md, AGENT_RULES.md, HEALTH_REPORT.md

---

## Dependencies

| Manifest | Package |
|----------|---------|
| package.json (root) | npm workspaces, Next.js 15, React 19, TypeScript 5 |
| packages/ui/package.json | @shawnderland/ui |
| packages/ai/package.json | @shawnderland/ai |
| tools/walter/package.json | @tools/walter |

---

## Entry Points

- **run.bat** — checks Node.js, installs deps, starts dev server

---

## LOC Summary

| Extension | Files | Lines | Size |
|-----------|-------|-------|------|
| .tsx | 205 | 39,078 | 1,629.9 KB |
| .css | 78 | 16,542 | 388.1 KB |
| .ts | 115 | 15,163 | 644.8 KB |
| .md | 49 | 7,507 | 1,146.8 KB |
| .mjs | 6 | 679 | 29.6 KB |
| .mdc | 3 | 425 | 21.1 KB |
| .json | 6 | 144 | 3.6 KB |
| .js | 1 | 60 | 2.4 KB |
| .bat | 1 | 46 | 1.4 KB |
| .txt | 1 | 9 | 0.9 KB |
| **TOTAL** | **465** | **79,653** | **3,868.6 KB** |

---

## Top 10 Files

| Size | Lines | Path |
|------|-------|------|
| 499.1 KB | 2,508 | tools/walter/src/lore/MASTER_ANALYSIS.md |
| 116.5 KB | 42 | tools/walter/src/lore/episode-15.md |
| 95.4 KB | 44 | tools/walter/src/lore/episode-22.md |
| 77.5 KB | 1,562 | src/app/ideation/canvas/nodes/character/CharViewNode.tsx |
| 74.4 KB | 47 | tools/walter/src/lore/episode-12.md |
| 54 KB | 1,699 | tools/walter/src/Walter.css |
| 52.2 KB | 1,128 | src/app/ideation/canvas/FlowCanvas.tsx |
| 51.7 KB | 626 | src/lib/ideation/engine/conceptlab/characterPrompts.ts |
| 46.4 KB | 1,122 | src/lib/ideation/context/SessionContext.tsx |
| 43.8 KB | 816 | src/app/ideation/canvas/nodes/LevelDesignDirectorNode.tsx |

---

## Folder Tree (depth 4)

```
.cursor/rules/
packages/ai/src/
packages/ui/src/canvas/
REPORTS/
scripts/
src/app/api/{ai-generate,ai-status,character-save,elevenlabs,hitem3d,list-dirs,meshy,meshy-export,open-folder,send-to-photoshop,session,video-analyze,walter-lore}/
src/app/concept-lab/nodes/
src/app/gemini-studio/nodes/
src/app/ideation/{canvas,layout,stages,views}/
src/app/tool-editor/nodes/
src/app/ui-lab/components/
src/components/nodes/ui/
src/hooks/
src/lib/ideation/{context,engine,state}/
src/lib/styles/
src/lib/ui-lab/
src/lib/workspace/
tools/walter/src/{components,lore}/
```

---

## Subsystems

- **Hub/Shell** — src/components/ (ClientShell, Sidebar, WorkspaceRenderer, CommandPalette, HubCanvas)
- **ShawnderMind** — src/app/ideation/ (8-stage AI ideation pipeline, ReactFlow canvas)
- **Gemini Studio** — src/app/gemini-studio/ (consumer AI media generation)
- **ConceptLab** — src/app/concept-lab/ (AI character/weapon design)
- **Tool Editor** — src/app/tool-editor/ (visual tool editor)
- **UI Lab** — src/app/ui-lab/ (AI UI generation)
- **Walter Storyboarding** — tools/walter/ (extracted workspace package — storyboard generator)
- **Shared UI** — packages/ui/ (design tokens, base components)
- **Shared AI** — packages/ai/ (generateText utility)
- **API Routes** — src/app/api/ (13 routes: ai-generate, ai-status, character-save, elevenlabs, hitem3d, list-dirs, meshy, meshy-export, open-folder, send-to-photoshop, session, video-analyze, walter-lore)

---

## Config Surface

- **Env files:** .env.local, .env.example
- **Referenced vars:** GEMINI_API_KEY, NEXT_PUBLIC_GEMINI_API_KEY, NEXT_PUBLIC_VERTEX_PROJECT, NEXT_PUBLIC_VERTEX_LOCATION, NEXT_PUBLIC_VERTEX_API_KEY, MESHY_API_KEY, HITEM3D_ACCESS_KEY, HITEM3D_SECRET_KEY, ELEVENLABS_API_KEY, SESSIONS_DIR, CHARACTER_OUTPUT_DIR, SPRITE_LAB_URL, SHAWNDERMIND_URL, UI_LAB_URL, CONCEPT_LAB_URL, NEXT_PUBLIC_SPRITE_LAB_URL, NEXT_PUBLIC_SHAWNDERMIND_URL, NEXT_PUBLIC_UI_LAB_URL, NEXT_PUBLIC_CONCEPT_LAB_URL, NODE_ENV

---

## Git Status

- **Branch:** main
- **Last commit:** 7202e2c — "feat: rebuild Walter as tabbed app matching original Electron experience" (2026-03-13 23:29:02)
- **Working tree:** modified (monorepo migration in progress — Walter extracted to tools/)

---

## Duplication Assessment

No parallel systems detected. Single router (WorkspaceContext), single state pattern per app, single design system (packages/ui). Secrets status: no secrets found in source code; keys via process.env only.

---

## Health Report

# Health Audit — Shawnderland OKDO

```
=== HEALTH AUDIT ===
Date: 2026-03-14
Report ID: 20260314_144353
Grade: YELLOW
Primary Issue Type: Hygiene

RED TRIGGERS
  [PASS] Secrets in source — No API keys found in code. All via process.env.
  [PASS] Run entrypoint — run.bat exists and is functional
  [PASS] Parallel systems — Single router, single state management pattern per app, single design system
  [PASS] Output dirs tracked — No output dirs tracked in git (verified via git ls-files)

YELLOW TRIGGERS
  [FLAG] Large files — tools/walter/src/lore/MASTER_ANALYSIS.md (499.1 KB), tools/walter/src/lore/episode-15.md (116.5 KB), tools/walter/src/lore/episode-22.md (95.4 KB). Three text files exceed 100 KB threshold.
  [FLAG] Doc drift — ARCHITECTURE.md Project Structure section still references file paths from before monorepo migration was committed; workspace architecture section was just added but uncommitted changes exist. Walter section was updated but references both old and new paths in some places.
  [PASS] README accuracy — README.md matches project state
  [PASS] DECISIONS coverage — All major deps documented
  [PASS] Gitignore completeness — .gitignore covers all output dirs
  [PASS] Portability — run.bat bootstraps, deps in package.json, zip-and-run portable

METRICS
  Files: 465 | Lines: ~80k | Largest: tools/walter/src/lore/MASTER_ANALYSIS.md (2508 lines)

TOP 3 RISKS
  1. Uncommitted monorepo migration creates a large unstaged diff that could be lost
  2. Large lore markdown files inflate repo size and could hit git/platform limits
  3. CharViewNode.tsx (1562 lines), FlowCanvas.tsx (1128 lines), SessionContext.tsx (1122 lines) are complexity hotspots

TOP 3 RECOMMENDED ACTIONS
  1. Commit the monorepo migration (Walter extraction, profile system, workspace config)
  2. Consider Git LFS or compression for lore files >100 KB
  3. Split CharViewNode.tsx and SessionContext.tsx into smaller modules

GOVERNANCE DOCS
| Doc              | Status   |
|------------------|----------|
| AGENT_RULES.md   | Current  |
| PROJECT.md       | Current  |
| SPEC.md          | Current  |
| ARCHITECTURE.md  | Drifted  |
| DECISIONS.md     | Current  |
| TASKS.md         | Drifted  |

FINDINGS

## Drift/Bloat
- ARCHITECTURE.md: Uncommitted monorepo migration changes (workspace extraction, profile system added but not yet committed)
- TASKS.md: References tools being completed but git working tree shows uncommitted changes

## Doc Drift
1. ARCHITECTURE.md — Project Structure section still references file paths from before monorepo migration; workspace architecture section was just added but uncommitted changes exist; Walter section references both old and new paths in some places
2. TASKS.md — References tools being completed but git working tree shows uncommitted changes

## Cleanup Candidates
1. Large lore files (MASTER_ANALYSIS.md at 499 KB) — consider .gitattributes LFS or splitting
2. 3 pre-existing TypeScript errors in src/app/ideation/canvas/GeminiEditorOverlay.tsx
3. Uncommitted monorepo migration (large working tree diff)
4. REPORTS/ directory at root — appears unused/empty

## Growth
- No prior snapshot available for comparison
- Current baseline: 465 files, 79,653 lines, 3.8 MB

## Prompt Surface
- Large prompt strings found in:
  - tools/walter/src/episodePresets.ts (WALTER_CONTEXT ~1.5 KB)
  - tools/walter/src/walterBrain.ts (buildBrainContext generates ~5-10 KB context)
  - src/lib/ideation/engine/conceptlab/imageGenApi.ts (DESCRIBE_FOR_RESTORE_PROMPT ~2 KB)
  - src/lib/ideation/engine/conceptlab/characterPrompts.ts (multiple prompt builders)
- No near-duplicate prompts detected above similarity threshold

PROPOSED CLEANUP PLAN
  1. Commit the monorepo migration (Walter extraction, profile system, @shawnderland/ai)
  2. Consider Git LFS or splitting for lore files >100 KB (MASTER_ANALYSIS.md, episode-15.md, episode-22.md)
  3. Fix 3 pre-existing TypeScript errors in GeminiEditorOverlay.tsx
  4. Evaluate REPORTS/ directory — remove if unused or document purpose
  5. Update ARCHITECTURE.md to reflect committed monorepo structure
  6. Split CharViewNode.tsx and SessionContext.tsx into smaller modules (complexity hotspots)

=== END AUDIT ===
```

---

## Tasks

# TASKS — Shawnderland OKDO

## Completed

- [x] Install dependencies and verify the hub compiles and runs
- [x] Build out ShawnderMind ideation canvas with full node-based pipeline
- [x] Implement Interactive and Automated modes in StartNode
- [x] Create PackedPipelineNode for automated collapsed view
- [x] Upgrade GroupNode to functional pack node with dynamic outputs
- [x] Add Thinking Tiers (Quick/Standard/Deep) with model selection
- [x] Fix influence node merging — structured prompt blocks across all stages
- [x] Align context menu categories with ToolDock categories
- [x] Replace pin icon with lock/unlock in ToolDock
- [x] Build Tool Editor: canvas, node types, property panel, export
- [x] Register Tool Editor in hub registry and route
- [x] Tool Editor: edge-based resizing on all elements
- [x] Tool Editor: add Button, Text Box, Dropdown Menu elements
- [x] Tool Editor: save/import layouts (localStorage + file upload)
- [x] Tool Editor: undo/redo, duplicate, alignment tools
- [x] Restore RRGM governance — update all governance docs, add mode system
- [x] Build AI ConceptLab: Character, Weapon, Turnaround nodes
- [x] Integrate ConceptLab on unified canvas with ShawnderMind nodes
- [x] Add search filter to ToolDock across all categories
- [x] Implement dual-backend API (AI Studio + Vertex AI) for all endpoints
- [x] Add node compatibility validation with error banners
- [x] Add session save/load for ShawnderMind
- [x] Centralize API key access via apiConfig.ts
- [x] Create .env.example for onboarding
- [x] Health audit: fix all yellow triggers
- [x] Integrate Meshy API: image-to-3D nodes, GLB proxy, 3D viewer
- [x] Integrate Hitem3D API: full parameter control, portrait models
- [x] Integrate ElevenLabs API: TTS, SFX, voice cloning nodes
- [x] Build Creative Director node: AI critiques with Apply Edit
- [x] Build Voice Designer + Dialogue Writer + Voice Script nodes
- [x] Implement Auto-Fidelity on MainStageViewer
- [x] Rewrite Quick Generate with comprehensive Gemini prompt
- [x] Implement three-layer session auto-persistence
- [x] Unify ShawnderMind and ConceptLab canvas (shared node set, ToolDock)
- [x] Add Seed node auto-infer context via Gemini
- [x] Remove saved-sessions/ from git tracking, add to .gitignore
- [x] Remove orphaned BaseNode.css/tsx, flowLayout.ts from packages/ui
- [x] Remove test artifact images from git tracking
- [x] Update ARCHITECTURE.md with all new subsystems and API integrations
- [x] Update SPEC.md with 3D, audio, Creative Director, session persistence
- [x] Update PROJECT.md with new features and integrations
- [x] Add ADRs 019–022 to DECISIONS.md
- [x] Create README.md

## Now

- [x] Monorepo: extract Walter into tools/walter/ workspace package
- [x] Monorepo: create @shawnderland/ai shared package
- [x] Profile system: work/personal/all toggle in sidebar
- [ ] Test ConceptLab end-to-end: Character generation + Turnaround views
- [ ] Test dual-backend: verify Vertex AI endpoint format with live credentials
- [ ] Test node compatibility: verify all error/warning scenarios fire correctly
- [x] Walter: convert from landing page to functional application shell
- [x] Walter: ShawnderMind visual theme (#09090b, #6c63ff, system-ui)
- [x] Walter: Walter Brain (canon memory) — characters, locations, lore, 28 episodes
- [x] Walter: 6-step Episode Wizard (Setup → Tone → Structure → Direction → Premise → Review)
- [x] Walter: 5 runtime presets (Micro, Mini, Short, Standard, Full Episode)
- [x] Walter: Staged generation pipeline (overview → beats → shots)
- [x] Walter: Timeline block library (Hook, Reveal, Climax, etc.)
- [x] Walter: Scoped AI rewrite (double-click beat)
- [x] Walter: Shot split from timeline inspector
- [x] Walter: Shoot sheet plaintext export
- [x] Walter: Expanded data model (Shot purpose/characters/location, Beat storyGoal/tone)
- [x] Walter: Episode lore integration — 28 per-episode analysis files in lore/, typed index, brain seeded from real Gemini analysis, API route for on-demand loading

### Health Audit Cleanup

- [ ] Commit monorepo migration (Walter extraction, profile system, @shawnderland/ai)
- [ ] Consider Git LFS for lore files >100 KB
- [ ] Fix 3 pre-existing TS errors in GeminiEditorOverlay.tsx

## Next

- [ ] Extract ShawnderMind into tools/shawndermind/ package
- [ ] Extract Gemini Studio into tools/gemini-studio/ package
- [ ] Build Sprite Lab sub-tool navigation and workspace pages
- [ ] Build UI Lab remaining workspace panels
- [ ] Add cross-tool data flow wiring on the hub canvas

## Later

- [ ] Walter: ML integration — image generation from shot descriptions
- [ ] Walter: ML integration — AI storyboard-to-video preview
- [ ] Walter: ML integration — voice/narration generation from dialogue
- [ ] Walter web integration (extract timeline/storyboard UI from Electron)
- [ ] Production build and deployment configuration
- [ ] Add test suite (currently 0 test files)
- [ ] Split large files (SessionContext.tsx ~1060 lines, orchestrator.ts ~1039 lines)
- [ ] Evaluate ContextMenu.css: merge shared styles into CanvasCommon.css
- [ ] Evaluate loadPack.ts exports (unused)
- [ ] Resolve Windows production build EPERM issue (webpack glob config)

## User Action Required

- [ ] **URGENT: Rotate Gemini API key** — was embedded in saved-sessions/test.json (now removed from git, but key may be in git history)

## Health Audit History

- [x] Report 20260306_080757
- [x] Report 20260306_161152
- [x] Report 20260311_001400
- [x] Health audit report generated (report_id: 20260314_144353)

---

## Comprehensive Repo Report

# Shawnderland OKDO — Comprehensive Repo Report

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Report ID** | 20260314_144353 |
| **Repo root** | `c:\Dev\Shawnderland_OKDO` |
| **Date** | 2026-03-14 14:43:53 |
| **Git branch** | main |
| **Last commit** | 7202e2c |
| **Framework** | Next.js 15 (App Router), React 19, TypeScript 5 |
| **Styling** | Tailwind CSS v4 + CSS custom properties via `packages/ui/src/tokens.css` |
| **Canvas** | @xyflow/react 12, dagre |
| **3D** | @react-three/fiber, @react-three/drei, three.js |
| **Validation** | Zod |
| **Icons** | lucide-react |
| **Total files** | 465 |
| **Total lines** | 79,653 |
| **Total size** | 3,868 KB |

---

## 2. Executive Summary

- **Monorepo hub** — Next.js 15 app with npm workspaces (`packages/*`, `tools/*`) hosting multiple AI-powered creative tools.
- **Six applications** — ShawnderMind (ideation pipeline), Gemini Studio (media generation), ConceptLab (character/weapon design), Tool Editor (visual tool editor), UI Lab (AI UI generation), Walter Storyboarding (canon-aware storyboard generator).
- **Profile system** — Work/personal/all toggle (`src/lib/profiles.ts`) controls which tools appear in the sidebar.
- **Shared design system** — `@shawnderland/ui` provides tokens and components; `@shawnderland/ai` provides shared AI utilities.
- **Extracted workspace package** — Walter lives in `tools/walter/` as `@tools/walter` with its own build and 28-episode lore.
- **13 API routes** — AI generation, Meshy/Hitem3D 3D, ElevenLabs TTS, session, lore, folder/file ops.
- **Multiple state patterns** — React Context, useCanvasSession, singleton external stores, Walter Brain (localStorage).
- **External APIs** — Google AI (Gemini, Imagen), Meshy AI, Hitem3D, ElevenLabs.
- **Complexity hotspots** — CharViewNode (1562 lines), FlowCanvas (1128 lines), SessionContext (1122 lines).
- **Zip-and-run portable** — `run.bat` checks Node.js, installs deps, starts dev server, opens browser

---

## 3. What This Repo Is

Shawnderland OKDO is a creative AI toolkit monorepo. A central Next.js hub mounts multiple tool packages and applications. Users can switch between work, personal, and all profiles to control which tools are visible. The stack is modern (Next.js 15, React 19, TypeScript 5) with Tailwind v4 and a shared design system. Canvas-based tools use ReactFlow; 3D tools use Three.js via React Three Fiber. AI features rely on Google Gemini, Meshy, Hitem3D, and ElevenLabs. The repo is designed to be zip-and-run portable with a single `run.bat` entry point.

---

## 4. How to Run

**Entry point:** `run.bat` at repo root.

**Steps:**
1. Double-click `run.bat` (or run from terminal).
2. Script checks for Node.js; prompts to install if missing.
3. Runs `npm install` to bootstrap dependencies.
4. Starts the Next.js dev server.
5. Opens the default browser to the app.

**Manual alternative:**
```bash
npm install
npm run dev
```

---

## 5. Feature Inventory (Grouped by App)

### ShawnderMind (`src/app/ideation/`)
- 8-stage AI ideation pipeline
- ReactFlow canvas with ~40 node types
- SessionContext for state
- Character, level design, and concept nodes
- Integration with ConceptLab for character/weapon design

### Gemini Studio (`src/app/gemini-studio/`)
- Consumer AI media generation
- useCanvasSession shared hook
- Google Gemini 2.0 Flash, Imagen 4 via `/api/ai-generate`

### ConceptLab (`src/app/concept-lab/`)
- AI character and weapon design
- useCanvasSession shared hook
- Character save API (`/api/character-save`)

### Tool Editor (`src/app/tool-editor/`)
- Visual tool editor with ReactFlow
- Singleton external store (useSyncExternalStore)

### UI Lab (`src/app/ui-lab/`)
- AI UI generation
- UILabContext for state

### Walter Storyboarding (`tools/walter/`)
- Canon-aware storyboard generator
- 28-episode lore index (`tools/walter/src/lore/episodes.ts`)
- Walter Brain (canon memory) with localStorage
- Singleton external store
- `/api/walter-lore` for lore queries

---

## 6. Architecture Overview (Text Component Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Shawnderland OKDO Hub                              │
│                    (Next.js 15 App Router, React 19)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  WorkspaceContext (nav)  │  Sidebar (profile toggle)  │  WorkspaceRenderer   │
│  Profile: work/personal/all                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
         ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
         │   ShawnderMind    │ │   Gemini Studio  │ │   ConceptLab      │
         │   (ideation/)     │ │ (gemini-studio/) │ │ (concept-lab/)    │
         │   SessionContext  │ │ useCanvasSession │ │ useCanvasSession  │
         │   ~40 node types  │ │                  │ │                   │
         └──────────────────┘ └──────────────────┘ └──────────────────┘
                    │                   │                   │
         ┌──────────────────┐ ┌──────────────────┐         │
         │   Tool Editor     │ │     UI Lab        │         │
         │ (tool-editor/)    │ │   (ui-lab/)       │         │
         │ useSyncExternal   │ │ UILabContext      │         │
         └──────────────────┘ └──────────────────┘         │
                    │                                         │
                    ▼                                         ▼
         ┌──────────────────────────────────────────────────────────────┐
         │                    tools/walter (@tools/walter)               │
         │  Walter Brain (localStorage) │ 28-episode lore │ Singleton    │
         └──────────────────────────────────────────────────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         │                              ▼                              │
         │  packages/ui (@shawnderland/ui)  │  packages/ai (@shawnderland/ai) │
         │  tokens.css, design system       │  generateText, shared AI         │
         └──────────────────────────────────────────────────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         │                              ▼                              │
         │  API Routes (13): ai-generate, ai-status, character-save,   │
         │  elevenlabs, hitem3d, list-dirs, meshy, meshy-export,        │
         │  open-folder, send-to-photoshop, session, video-analyze,     │
         │  walter-lore                                                 │
         └──────────────────────────────────────────────────────────────┘
```

---

## 7. Module Deep Dive (Top Subsystems)

### Route Resolution & Dynamic Imports
`src/components/WorkspaceRenderer.tsx` — Resolves routes and dynamically imports tool components. Central to hub navigation.

### Tool Registry & Profiles
- `src/lib/registry.ts` — Tool registry with `AppProfile` (work/personal/all).
- `src/lib/profiles.ts` — Profile state management.
- `src/lib/types.ts` — `ToolRegistryEntry` with `AppProfile`.

### Walter Package
- `tools/walter/src/index.tsx` — Tool package entry point.
- `tools/walter/src/walterBrain.ts` — Canon memory with 28 episodes.
- `tools/walter/src/lore/episodes.ts` — Typed episode index.

### Shared AI
`packages/ai/src/generateText.ts` — Shared AI text generation utility.

### Design Tokens
`packages/ui/src/tokens.css` — CSS custom properties consumed by all apps.

### Build & Workspace Config
- `next.config.ts` — `transpilePackages`, rewrites.
- `package.json` — npm workspaces config.

---

## 8. External Dependencies & Integrations

| Service | Purpose | API Route |
|---------|---------|-----------|
| Google AI | Gemini 2.0 Flash, Imagen 4 | `/api/ai-generate` |
| Meshy AI | Image-to-3D | `/api/meshy`, `/api/meshy-export` |
| Hitem3D | Portrait 3D | `/api/hitem3d` |
| ElevenLabs | TTS, SFX, voice cloning | `/api/elevenlabs` |

---

## 9. Configuration Surface

### Environment Variables (19)

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Server-side Gemini |
| `NEXT_PUBLIC_GEMINI_API_KEY` | Client-side Gemini |
| `NEXT_PUBLIC_VERTEX_PROJECT` | Vertex AI project |
| `NEXT_PUBLIC_VERTEX_LOCATION` | Vertex AI location |
| `NEXT_PUBLIC_VERTEX_API_KEY` | Vertex AI key |
| `MESHY_API_KEY` | Meshy AI |
| `HITEM3D_ACCESS_KEY` | Hitem3D |
| `HITEM3D_SECRET_KEY` | Hitem3D |
| `ELEVENLABS_API_KEY` | ElevenLabs |
| `SESSIONS_DIR` | Session storage path |
| `CHARACTER_OUTPUT_DIR` | Character output path |
| `SPRITE_LAB_URL` | Sprite Lab URL |
| `SHAWNDERMIND_URL` | ShawnderMind URL |
| `UI_LAB_URL` | UI Lab URL |
| `CONCEPT_LAB_URL` | Concept Lab URL |
| `NEXT_PUBLIC_SPRITE_LAB_URL` | Client Sprite Lab |
| `NEXT_PUBLIC_SHAWNDERMIND_URL` | Client ShawnderMind |
| `NEXT_PUBLIC_UI_LAB_URL` | Client UI Lab |
| `NEXT_PUBLIC_CONCEPT_LAB_URL` | Client Concept Lab |

---

## 10. Risks / Complexity Hotspots

| Risk | Location | Notes |
|------|----------|-------|
| Large component | `CharViewNode.tsx` | 1562 lines — candidate for splitting |
| Large canvas | `FlowCanvas.tsx` | 1128 lines — central canvas logic |
| Large context | `SessionContext.tsx` | 1122 lines — session state |
| Pre-existing TS errors | `GeminiEditorOverlay.tsx` | 3 TypeScript errors |
| Large lore files | `tools/walter/src/lore/` | Some >100 KB (e.g. MASTER_ANALYSIS.md 499 KB) |
| Single-line markdown | Walter lore | Low LOC, high byte count — affects diff/merge |

---

## 11. Open Questions / Ambiguous Areas

- **Profile vs. tool visibility** — Exact mapping of which tools appear for work vs. personal profiles may need verification against `registry.ts` and `profiles.ts`.
- **Walter package coupling** — Degree of independence from hub (build, deploy, versioning) is not fully documented.
- **Session persistence** — How `SESSIONS_DIR` and session APIs interact with each app's state model.
- **Sprite Lab** — Referenced in env vars but not in the app inventory; may be external or deprecated.
- **Character output flow** — How `CHARACTER_OUTPUT_DIR` and `/api/character-save` connect to ConceptLab and ShawnderMind.

---

## 12. Appendix: Evidence Index

| File | Purpose |
|------|---------|
| `src/components/WorkspaceRenderer.tsx` | Route resolution, dynamic imports |
| `src/components/Sidebar.tsx` | Navigation, profile toggle |
| `src/lib/registry.ts` | Tool registry with profiles |
| `src/lib/profiles.ts` | Profile state management |
| `src/lib/types.ts` | `ToolRegistryEntry` with `AppProfile` |
| `tools/walter/src/index.tsx` | Walter tool package entry point |
| `tools/walter/src/walterBrain.ts` | Canon memory with 28 episodes |
| `tools/walter/src/lore/episodes.ts` | Typed episode index |
| `packages/ai/src/generateText.ts` | Shared AI utility |
| `packages/ui/src/tokens.css` | Design tokens |
| `next.config.ts` | `transpilePackages`, rewrites |
| `package.json` | Workspaces config |
| `run.bat` | Entry point |

### Top 10 Largest Files (by size)

| Size | Path |
|------|------|
| 499.1 KB | `tools/walter/src/lore/MASTER_ANALYSIS.md` |
| 77.5 KB | `src/app/ideation/canvas/nodes/character/CharViewNode.tsx` (1562 lines) |
| 54 KB | `tools/walter/src/Walter.css` (1699 lines) |
| 52.2 KB | `src/app/ideation/canvas/FlowCanvas.tsx` (1128 lines) |
| 51.7 KB | `src/lib/ideation/engine/conceptlab/characterPrompts.ts` (626 lines) |
| 46.4 KB | `src/lib/ideation/context/SessionContext.tsx` (1122 lines) |
| 43.8 KB | `src/app/ideation/canvas/nodes/LevelDesignDirectorNode.tsx` (816 lines) |

---

*Report generated 2026-03-14. Report ID: 20260314_144353.*

---

## Master Index

* Snapshot: `.repo_snapshot/repo_snapshot.md`
* Snapshot JSON: `.repo_snapshot/repo_snapshot.json`
* Health Report: `HEALTH_REPORT.md`
* Health Metrics: `.repo_snapshot/health_reports/health_metrics__20260314_144353.json`
* Tasks: `TASKS.md`
* Comprehensive Report: `.repo_snapshot/repo_comprehensive_report.md`
* Master Report: `MASTER_REPO_REPORT.md`
