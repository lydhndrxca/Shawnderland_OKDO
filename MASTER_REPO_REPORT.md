# Master Repo Report

| Field | Value |
|-------|-------|
| Project root | `D:\dev\Shawnderland_OKDO` |
| Generated at | 2026-03-11 00:14:00 |
| Includes | Snapshot + Health Audit + Comprehensive Repo Report + TASKS |
| Health | **Red** (report_id: `20260311_001400`) |

---

## Repo Snapshot

# Repo Snapshot — Shawnderland OKDO

| Field | Value |
|-------|-------|
| Generated | 2026-03-11 00:14:00 |
| Report ID | `20260311_001400` |
| Repo root | `D:\dev\Shawnderland_OKDO` |
| Git branch | `main` |
| Commits | 15 |
| Last commit | `c0cdab3` — chore: add saved sessions with Git LFS (2026-03-11) |

---

### Folder Tree (depth 4)

```
Shawnderland_OKDO/
├── packages/
│   └── ui/src/canvas/            # @shawnderland/ui shared components
├── saved-sessions/               # LFS-tracked session snapshots
├── scripts/                      # Dev/test scripts
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai-generate/      # Gemini proxy
│   │   │   ├── ai-status/        # API status check
│   │   │   ├── character-save/   # Save character images to disk
│   │   │   ├── elevenlabs/       # ElevenLabs proxy
│   │   │   ├── hitem3d/          # Hitem3D proxy
│   │   │   ├── list-dirs/        # Directory listing
│   │   │   ├── meshy/            # Meshy proxy
│   │   │   ├── meshy-export/     # Meshy model export
│   │   │   ├── open-folder/      # Open folder in explorer
│   │   │   ├── send-to-photoshop/# Photoshop bridge
│   │   │   └── session/          # Session save/load filesystem
│   │   ├── concept-lab/nodes/    # AI ConceptLab canvas
│   │   ├── gemini-studio/nodes/  # Gemini Studio canvas
│   │   ├── ideation/
│   │   │   ├── canvas/
│   │   │   │   ├── edges/
│   │   │   │   └── nodes/
│   │   │   │       ├── audio/    # ElevenLabs TTS/SFX/Voice nodes
│   │   │   │       ├── character/# Character pipeline nodes (28 files)
│   │   │   │       └── threedgen/# Meshy + Hitem3D 3D nodes
│   │   │   ├── layout/
│   │   │   ├── stages/
│   │   │   └── views/
│   │   ├── tool-editor/nodes/    # Tool Editor canvas
│   │   └── ui-lab/components/    # AI UI Lab
│   ├── components/
│   │   └── nodes/ui/             # Shared UI node components
│   ├── hooks/                    # useCanvasSession
│   └── lib/
│       ├── ideation/
│       │   ├── context/          # SessionContext provider
│       │   ├── engine/           # Orchestrator, providers, API libs
│       │   │   ├── conceptlab/   # imageGenApi, characterPrompts
│       │   │   └── provider/     # Gemini + mock providers
│       │   └── state/            # Session types, selectors, store
│       ├── styles/               # Style store
│       ├── ui-lab/               # UI Lab context/types
│       └── workspace/            # Workspace context
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

### Governance Documents

| Document | Exists |
|----------|--------|
| PROJECT.md | ✅ |
| SPEC.md | ✅ |
| ARCHITECTURE.md | ✅ |
| DECISIONS.md | ✅ |
| TASKS.md | ✅ |
| README.md | ❌ |
| AGENT_RULES.md | ✅ |
| HEALTH_REPORT.md | ✅ |

---

### Dependencies

**Manifests:** package.json, packages/ui/package.json, package-lock.json, tsconfig.json

#### Production
| Package | Version |
|---------|---------|
| next | ^15 |
| react / react-dom | ^19 |
| @xyflow/react | ^12.10.1 |
| @react-three/fiber | ^9.5.0 |
| @react-three/drei | ^10.7.7 |
| three | ^0.183.2 |
| dagre | ^0.8.5 |
| zod | ^4.3.6 |
| lucide-react | ^0.468 |
| clsx | ^2 |
| tailwind-merge | ^3 |

#### Dev
| Package | Version |
|---------|---------|
| typescript | ^5 |
| tailwindcss | ^4 |
| @types/node | ^22 |
| @types/react | ^19 |
| @types/three | ^0.183.1 |

---

### Entry Points

| Entry | Command/Path |
|-------|-------------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Run script | `run.bat` |
| App entry | `src/app/page.tsx` |
| App layout | `src/app/layout.tsx` |

---

### Lines of Code

| Extension | Files | LOC | Size |
|-----------|-------|-----|------|
| .tsx | 170 | 30,139 | 1,200 KB |
| .css | 71 | 13,294 | 291 KB |
| .ts | 102 | 12,130 | 489 KB |
| .md | 18 | 1,999 | 121 KB |
| .json | 3 | 81 | 2 KB |
| .js | 1 | 60 | 2 KB |
| .txt | 1 | 9 | 1 KB |
| **Total** | **366** | **57,712** | **2,106 KB** |

---

### Subsystems

| Subsystem | Path | Role |
|-----------|------|------|
| Hub Shell | `src/components/` | App shell, sidebar, workspace, command palette |
| ShawnderMind | `src/app/ideation/` | 8-stage AI ideation pipeline with character, 3D, audio nodes |
| AI ConceptLab | `src/app/concept-lab/` | Character/weapon design + concept generation |
| Gemini Studio | `src/app/gemini-studio/` | Image/video generation studio |
| Tool Editor | `src/app/tool-editor/` | Visual tool designer with JSON export |
| AI UI Lab | `src/app/ui-lab/` | Game UI generation workspace |
| Engine | `src/lib/ideation/engine/` | Orchestrator, providers, prompts, eval, API libs |
| Session | `src/lib/ideation/context/` | Session state provider with auto-save/load |
| API Routes | `src/app/api/` | 11 server proxy routes |
| 3D Gen Nodes | `src/app/ideation/canvas/nodes/threedgen/` | Meshy + Hitem3D |
| Audio Nodes | `src/app/ideation/canvas/nodes/audio/` | ElevenLabs TTS, SFX, voice clone |
| Design System | `packages/ui/` | @shawnderland/ui shared components |
| Shared Hooks | `src/hooks/` | useCanvasSession |

---

### Duplication Signals

| Signal | Files | Notes |
|--------|-------|-------|
| Duplicate flowLayout.ts | `packages/ui/` + `src/app/ideation/` | Known; consolidation pending |
| Duplicate BaseNode.tsx | `packages/ui/` + `src/app/ideation/` | packages/ui version appears unused |
| Duplicate PipelineEdge | `packages/ui/` + `src/app/ideation/` | packages/ui version appears unused |
| Duplicate SaveDialog.tsx | `src/app/ideation/` + `src/app/tool-editor/` | Similar save dialogs |
| Duplicate styleStore.ts | `src/lib/styles/` + `src/lib/` | One likely orphaned |

---

### Config & Environment

**Config files:** next.config.ts, postcss.config.mjs, tsconfig.json, .gitattributes

**Environment variables (19):** NEXT_PUBLIC_GEMINI_API_KEY, GEMINI_API_KEY, NEXT_PUBLIC_VERTEX_PROJECT, NEXT_PUBLIC_VERTEX_LOCATION, NEXT_PUBLIC_VERTEX_API_KEY, MESHY_API_KEY, HITEM3D_ACCESS_KEY, HITEM3D_SECRET_KEY, ELEVENLABS_API_KEY, SESSIONS_DIR, CHARACTER_OUTPUT_DIR, SPRITE_LAB_URL, SHAWNDERMIND_URL, UI_LAB_URL, CONCEPT_LAB_URL, NEXT_PUBLIC_SPRITE_LAB_URL, NEXT_PUBLIC_SHAWNDERMIND_URL, NEXT_PUBLIC_UI_LAB_URL, NEXT_PUBLIC_CONCEPT_LAB_URL

---

### Git Churn

| Metric | Value |
|--------|-------|
| Total commits | 15 |
| Branch | main |
| Latest | `c0cdab3` (2026-03-11) |
| Previous | `0de8c84` — feat: integrate Meshy, Hitem3D, ElevenLabs APIs |

---

## Health Report

# Health Report — Shawnderland OKDO

| Field | Value |
|-------|-------|
| Report ID | `20260311_001400` |
| Date | 2026-03-11 00:14:00 |
| Overall Health | **🔴 Red** |
| Primary Issue Type | **Hygiene** |

---

### Scoring

#### RED Triggers

| # | Trigger | Evidence |
|---|---------|----------|
| R1 | **Secrets found in tracked source** | `saved-sessions/test.json` contains patterns matching Google API key (`AIza…`) and AWS-style key (`AKIA…`). File is tracked via Git LFS. Serialized session data embeds the user's `NEXT_PUBLIC_GEMINI_API_KEY` value. |
| R2 | **Output-only directory tracked in git** | `saved-sessions/` contains user-generated session data (100+ MB) committed to the repo via LFS. Verified with `git ls-files -- saved-sessions/`. |

#### YELLOW Triggers

| # | Trigger | Evidence |
|---|---------|----------|
| Y1 | **Parallel/duplicate systems** | 5 duplication signals: `flowLayout.ts`, `BaseNode.tsx`, `PipelineEdge.tsx`, `SaveDialog.tsx`, `styleStore.ts` — each exists in 2 locations |
| Y2 | **Doc drift** | Governance docs (ARCHITECTURE.md, SPEC.md, PROJECT.md) have not been updated for: Meshy/Hitem3D/ElevenLabs integrations, 3D gen nodes, audio nodes, Creative Director node, session auto-save, filesystem session API. README.md still missing. |
| Y3 | **Sustained growth >15%** | +36.3% LOC growth (42,339 → 57,712) since last audit on 2026-03-06 |
| Y4 | **Production build fails** | `next build` fails with `EPERM: scandir 'C:\Users\shawn\Application Data'` — Windows junction point issue with webpack globbing. Pre-existing, not code-related. |

---

### Top 3 Risks

1. **Leaked API key in saved-sessions/test.json** — The serialized session data embeds the Gemini API key. This file is committed (via LFS) and pushed to GitHub. The key should be rotated and the file cleaned from git history.

2. **Session data in git** — `saved-sessions/` contains 104 MB of user session data with embedded base64 images and API keys. This should be gitignored, not committed.

3. **Governance doc lag** — 3 major API integrations (Meshy, Hitem3D, ElevenLabs), ~20 new node types, session persistence overhaul, and canvas unification are undocumented in ARCHITECTURE.md, SPEC.md, and PROJECT.md.

---

### Top 3 Recommended Actions

1. **URGENT: Rotate the Gemini API key** and remove `saved-sessions/` from git tracking. Add `saved-sessions/` back to `.gitignore`. Use `git filter-branch` or BFG to clean history if the key is sensitive.

2. **Update governance docs** — Add sections for: Meshy/Hitem3D/ElevenLabs API integrations, 3D gen node subsystem, audio node subsystem, Creative Director, session auto-persistence, filesystem session API.

3. **Consolidate duplicates** — Merge `flowLayout.ts`, `BaseNode.tsx`, `PipelineEdge.tsx` to single locations. Remove orphaned `styleStore.ts` copy. Extract shared `SaveDialog` component.

---

### Findings

#### Governance

| Document | Status |
|----------|--------|
| PROJECT.md | ⚠️ Outdated — missing 3D, audio, ElevenLabs, Meshy, Hitem3D, Creative Director |
| SPEC.md | ⚠️ Outdated — same gaps |
| ARCHITECTURE.md | ⚠️ Outdated — missing new subsystems and API routes |
| DECISIONS.md | ⚠️ Outdated — no ADRs for external API integrations or session persistence |
| TASKS.md | ✅ Active — has current/next/later items |
| README.md | ❌ Missing |
| AGENT_RULES.md | ✅ Present |

#### Drift & Bloat

- **5 duplication signals** across packages/ui and src/app (flowLayout, BaseNode, PipelineEdge, SaveDialog, styleStore)
- **saved-sessions/** tracked in git with 104 MB of LFS data containing embedded secrets
- **packages/ui/** contains components (BaseNode, PipelineEdge, flowLayout) that appear superseded by src/app versions

#### Doc Drift (6 items)

| # | Drift | Evidence |
|---|-------|----------|
| D1 | Meshy API integration undocumented | `src/app/api/meshy/`, `src/lib/ideation/engine/meshyApi.ts`, `src/app/ideation/canvas/nodes/threedgen/` — not in any governance doc |
| D2 | Hitem3D API integration undocumented | `src/app/api/hitem3d/`, `src/lib/ideation/engine/hitem3dApi.ts` — not in any governance doc |
| D3 | ElevenLabs API integration undocumented | `src/app/api/elevenlabs/`, `src/lib/ideation/engine/elevenlabsApi.ts`, `src/app/ideation/canvas/nodes/audio/` — not in any governance doc |
| D4 | Session auto-persistence undocumented | `SessionContext.tsx` auto-save/load, `useCanvasSession.ts` auto-save, `/api/session` route — not documented |
| D5 | Creative Director node undocumented | `CreativeDirectorNode.tsx` (603 LOC) — not in SPEC or ARCHITECTURE |
| D6 | Canvas unification undocumented | ShawnderMind/ConceptLab sharing ToolDock categories — not documented |

#### Cleanup Candidates

| # | Item | Action |
|---|------|--------|
| C1 | `saved-sessions/` in git | Remove from tracking, add to .gitignore, rotate API key |
| C2 | `packages/ui/src/canvas/BaseNode.tsx` | Remove (superseded by src/app version) |
| C3 | `packages/ui/src/canvas/PipelineEdge.tsx` | Remove (superseded by src/app version) |
| C4 | `packages/ui/src/canvas/flowLayout.ts` | Consolidate with src/app version |
| C5 | `src/lib/styles/styleStore.ts` OR `src/lib/styleStore.ts` | Remove duplicate |
| C6 | `scripts/test-large-output.jpg` (533 KB) | Evaluate if test artifacts should be tracked |
| C7 | `ContextMenu.css` | Evaluate merge into CanvasCommon.css |
| C8 | `loadPack.ts` exports | Evaluate if unused |

#### Growth & Trajectory

| Metric | 20260306 | 20260311 | Delta | % |
|--------|----------|----------|-------|---|
| Files | 303 | 366 | +63 | +20.8% |
| LOC | 42,339 | 57,712 | +15,373 | **+36.3%** |
| Bytes | 1,487,711 | 2,156,670 | +668,959 | +45.0% |
| Commits | 7 | 15 | +8 | +114% |
| Subsystems | 11 | 13 | +2 | +18.2% |
| API routes | 6 | 11 | +5 | +83% |

**Growth driver:** 3 major API integrations (Meshy, Hitem3D, ElevenLabs) added ~20 new node components, 3 API proxy routes, 3 client libraries, and associated CSS/types.

#### Prompt & Template Surface

**Top 5 largest template literals:**

| Chars | File |
|-------|------|
| 23,523 | `src/lib/ideation/engine/orchestrator.ts` |
| 9,214 | `src/lib/ideation/engine/provider/mockProvider.ts` |
| 9,074 | `src/app/ideation/canvas/ToolDock.tsx` |
| 8,567 | `src/app/concept-lab/nodes/WeapBaseNode.tsx` |
| 7,879 | `src/lib/ideation/context/SessionContext.tsx` |

The orchestrator contains the largest prompt templates (stage prompts for normalize, diverge, critique, expand, blueprint, extract). These are well-structured but should be monitored for drift.

---

### Proposed Cleanup Plan

#### Immediate (this session)
1. ~~Rotate Gemini API key~~ (user action required)
2. Remove `saved-sessions/` from git tracking, add to `.gitignore`
3. Strip embedded secrets from git LFS history

#### Short-term (next 2 sessions)
4. Update ARCHITECTURE.md, SPEC.md, PROJECT.md with new integrations
5. Add ADRs to DECISIONS.md for external API strategy and session persistence
6. Create README.md

#### Medium-term
7. Consolidate `flowLayout.ts`, `BaseNode.tsx`, `PipelineEdge.tsx` to single locations
8. Remove orphaned `styleStore.ts` duplicate
9. Extract shared `SaveDialog` component
10. Resolve Windows production build issue (webpack glob config)

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

## Now

- [ ] Test ConceptLab end-to-end: Character generation + Turnaround views
- [ ] Test dual-backend: verify Vertex AI endpoint format with live credentials
- [ ] Test node compatibility: verify all error/warning scenarios fire correctly

## Next

- [ ] Build Sprite Lab sub-tool navigation and workspace pages
- [ ] Build UI Lab remaining workspace panels
- [ ] Add cross-tool data flow wiring on the hub canvas
- [ ] Consolidate duplicate flowLayout.ts (use @shawnderland/ui copy)

## Later

- [ ] Walter web integration (extract timeline/storyboard UI from Electron)
- [ ] Production build and deployment configuration
- [ ] Add test suite (currently 0 test files)
- [ ] Split large files (SessionContext.tsx ~1060 lines, orchestrator.ts ~1039 lines)

## Health Audit Cleanup

- [x] Sync ARCHITECTURE.md: remove deleted ContextMenu.tsx reference, add useCanvasSession, GlobalToolbar, CanvasContextMenu, PrepromptNode, PostPromptNode, Gemini Studio, Concept Lab standalone structure
- [x] Sync SPEC.md: add Gemini Studio section, Preprompt/PostPrompt nodes, unified canvas features (useCanvasSession, GlobalToolbar, CanvasContextMenu)
- [x] Sync PROJECT.md: add Gemini Studio tool, Preprompt/PostPrompt features, unified canvas features
- [x] Sync DECISIONS.md: add ADR for useCanvasSession extraction and unified toolbar/context menu, ADR for Preprompt/PostPrompt prompt injection design
- [ ] Evaluate ContextMenu.css: merge shared styles into CanvasCommon.css or keep as shared stylesheet
- [ ] Consolidate duplicate flowLayout.ts (use @shawnderland/ui copy)
- [x] Fix broken preset node types in ConceptLabShell.tsx (multiViewer → charViewer, editImage → charEdit)
- [x] Remove dead code: StatusBar.tsx/css, NodeInspector.tsx/css (never imported)
- [x] Remove dead .cl-viewer-* CSS from ConceptLabNodes.css (~65 lines)
- [x] Wire GeminiStudioShell.tsx to named layout system (uses deprecated onSaveLayout)
- [x] Update ARCHITECTURE.md: remove deleted concept-lab/nodes/ entries, add ideation/canvas/nodes/character/ and shared components
- [ ] Evaluate loadPack.ts exports (unused)
- [ ] URGENT: Rotate Gemini API key — embedded in saved-sessions/test.json committed to git
- [ ] Remove saved-sessions/ from git tracking, add to .gitignore
- [ ] Update ARCHITECTURE.md with Meshy, Hitem3D, ElevenLabs, 3D gen, audio, Creative Director, session auto-persistence
- [ ] Update SPEC.md and PROJECT.md with new integrations and node types
- [ ] Create README.md
- [ ] Consolidate duplicate flowLayout.ts, BaseNode.tsx, PipelineEdge.tsx
- [ ] Remove orphaned styleStore.ts duplicate
- [ ] Resolve Windows production build EPERM issue (webpack glob config)
- [x] Health audit report generated (report_id: 20260306_080757)
- [x] Health audit report generated (report_id: 20260306_161152)
- [x] Health audit report generated (report_id: 20260311_001400)

---

## Comprehensive Repo Report

# Comprehensive Repo Report — Shawnderland OKDO

## 1. Metadata

| Field | Value |
|-------|-------|
| Timestamp | 2026-03-11 00:14:00 |
| Repo root | `D:\dev\Shawnderland_OKDO` |
| Git branch | `main` |
| Git commit | `c0cdab3` (2026-03-11) |
| Total commits | 15 |
| Scan scope | All text-like files excluding node_modules, .next, .git, saved-sessions |
| Files scanned | 366 |
| Total LOC | 57,712 |

---

### 2. Executive Summary

1. **Shawnderland OKDO is a Next.js 15 hub application** hosting 6 AI-powered creative tools for game development, totaling 57,712 LOC across 366 files. Evidence: `package.json` (Next.js ^15), `src/lib/registry.ts` (6 tool entries).

2. **The core tool (ShawnderMind)** is an 8-stage AI ideation pipeline implemented as a React Flow canvas with 60+ node types covering character design, 3D model generation, and audio synthesis. Evidence: `src/lib/sharedNodeTypes.ts` (ALL_RAW_NODE_TYPES with 60+ entries).

3. **Three external API integrations** were recently added: Meshy (3D), Hitem3D (3D), and ElevenLabs (audio), each with server-side proxy routes and client libraries. Evidence: `src/app/api/meshy/route.ts`, `src/app/api/hitem3d/route.ts`, `src/app/api/elevenlabs/route.ts`.

4. **All AI calls are proxied through Next.js API routes** — no external API calls from client code. Evidence: `meshyApi.ts`, `hitem3dApi.ts`, `elevenlabsApi.ts` all call `/api/*` local endpoints.

5. **Session persistence uses a three-layer strategy**: localStorage auto-save (debounced), IndexedDB for large snapshots, and filesystem (`saved-sessions/`) for browser-reset survival. Evidence: `SessionContext.tsx` lines 222-272, `useCanvasSession.ts` lines 967-1036, `src/app/api/session/route.ts`.

6. **The codebase grew 36% in LOC** since the last audit (5 days ago), driven by 3 API integrations adding ~20 new node components. Evidence: snapshot diff (42,339 → 57,712 LOC).

7. **A Gemini API key is embedded in committed session data** (`saved-sessions/test.json`), creating a security risk. Evidence: grep pattern match for `AIza[a-zA-Z0-9_-]{35}` in test.json.

8. **TypeScript compilation is clean** (zero errors), but production build fails due to a Windows permission issue unrelated to code. Evidence: `npx tsc --noEmit` exits 0; `npx next build` fails with `EPERM: scandir Application Data`.

9. **5 file duplication signals** exist between `packages/ui/` and `src/app/`, plus a duplicate `styleStore.ts`. Evidence: `flowLayout.ts`, `BaseNode.tsx`, `PipelineEdge.tsx` exist in both locations.

10. **Governance documentation is significantly outdated** — 6 doc drift items where major features are not reflected in ARCHITECTURE.md, SPEC.md, or PROJECT.md. No README.md exists.

---

### 3. What This Repo Is

| Attribute | Value | Evidence |
|-----------|-------|----------|
| Type | Monorepo web application | Single `package.json` + `packages/ui/` workspace |
| Primary language | TypeScript (72.8% of LOC) | 272 `.ts`/`.tsx` files, 42,269 LOC |
| Framework | Next.js 15 (App Router) | `next.config.ts`, `src/app/` directory |
| UI library | React 19 + React Flow 12 | `package.json` deps |
| 3D rendering | Three.js + React Three Fiber | `three`, `@react-three/fiber`, `@react-three/drei` |
| Styling | Tailwind CSS 4 + custom CSS | `postcss.config.mjs`, 71 CSS files |
| AI backend | Google Gemini (AI Studio + Vertex) | `src/app/api/ai-generate/route.ts` |
| 3D generation | Meshy API + Hitem3D API | `src/app/api/meshy/`, `src/app/api/hitem3d/` |
| Audio generation | ElevenLabs API | `src/app/api/elevenlabs/` |
| State management | React Context + React Flow store | `SessionContext.tsx`, `useCanvasSession.ts` |
| Runtime | Node.js (dev: `npm run dev`) | `package.json` scripts |

---

### 4. How to Run

**Prerequisites:** Node.js 18+, npm

```bash
# 1. Clone and install
git clone https://github.com/lydhndrxca/Shawnderland_OKDO.git
cd Shawnderland_OKDO
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — add at minimum NEXT_PUBLIC_GEMINI_API_KEY

# 3. Start dev server
npm run dev
# → http://localhost:3000
```

**Evidence:** `package.json` defines `"dev": "node scripts/kill-stale-dev.js && next dev"`. Dev server starts in 2.2s, compiles 3,413 modules. `run.bat` also exists as a Windows convenience script.

**OS assumption:** Windows (run.bat, Photoshop paths in send-to-photoshop route). Dev server works on any OS.

**Production build:** Currently fails on Windows due to webpack EPERM issue with `C:\Users\*\Application Data` junction. Not a code issue.

---

### 5. Feature Inventory

#### A. Ideation Pipeline (ShawnderMind)

| Feature | Node(s) | Files |
|---------|---------|-------|
| Seed input with auto-context | `SeedNode` | `src/app/ideation/canvas/nodes/SeedNode.tsx` |
| Normalize ideas | `NormalizeNode` | `src/app/ideation/canvas/nodes/NormalizeNode.tsx` |
| Diverge candidates | `DivergeNode` | `src/app/ideation/canvas/nodes/DivergeNode.tsx` |
| Critique & salvage | `CritiqueNode` | `src/app/ideation/canvas/nodes/CritiqueNode.tsx` |
| Expand concepts | `ExpandNode` | `src/app/ideation/canvas/nodes/ExpandNode.tsx` |
| Converge & rank | `ConvergeNode` | `src/app/ideation/canvas/nodes/ConvergeNode.tsx` |
| Commit blueprint | `CommitNode` | `src/app/ideation/canvas/nodes/CommitNode.tsx` |
| Iterate refinement | `IterateNode` | `src/app/ideation/canvas/nodes/IterateNode.tsx` |

#### B. Character Design Pipeline

| Feature | Node(s) | Files |
|---------|---------|-------|
| Quick character generation | `QuickGenerateNode` | `character/QuickGenerateNode.tsx` |
| Character identity | `CharIdentityNode` | `character/CharIdentityNode.tsx` |
| Character attributes | `CharAttributesNode` | `character/CharAttributesNode.tsx` |
| Character description | `CharDescriptionNode` | `character/CharDescriptionNode.tsx` |
| Image generation | `GenerateCharImageNode` | `character/GenerateCharImageNode.tsx` |
| Multi-view generation | `GenerateViewsNode`, `CharViewNode` | `character/GenerateViewsNode.tsx`, `character/CharViewNode.tsx` |
| Image editing | `EditCharacterNode`, `GeminiEditorNode` | `character/EditCharacterNode.tsx`, `character/GeminiEditorNode.tsx` |
| AI creative direction | `CreativeDirectorNode` | `character/CreativeDirectorNode.tsx` |
| Image restoration | `RestoreQualityNode`, `UpscaleNode` | `character/RestoreQualityNode.tsx`, `character/UpscaleNode.tsx` |
| Main stage viewer | `MainStageViewerNode` | `character/MainStageViewerNode.tsx` |
| Attribute extraction | `ExtractAttributesNode` | `character/ExtractAttributesNode.tsx` |
| Style control | `StyleNode` | `character/StyleNode.tsx` |
| Save/export | `SaveGroupNode`, `SendToPhotoshopNode` | `character/SaveGroupNode.tsx`, `character/SendToPhotoshopNode.tsx` |

#### C. 3D Model Generation

| Feature | Node(s) | Files |
|---------|---------|-------|
| Meshy image-to-3D | `MeshyImageTo3DNode` | `threedgen/MeshyImageTo3DNode.tsx` |
| Meshy 3D viewer | `MeshyModelViewerNode` | `threedgen/MeshyModelViewerNode.tsx` |
| Hitem3D image-to-3D | `Hitem3DImageTo3DNode` | `threedgen/Hitem3DImageTo3DNode.tsx` |

#### D. Audio Generation

| Feature | Node(s) | Files |
|---------|---------|-------|
| Text-to-speech | `ElevenLabsTTSNode` | `audio/ElevenLabsTTSNode.tsx` |
| Sound effects | `ElevenLabsSFXNode` | `audio/ElevenLabsSFXNode.tsx` |
| Voice cloning | `ElevenLabsVoiceCloneNode` | `audio/ElevenLabsVoiceCloneNode.tsx` |
| Voice design from image | `VoiceDesignerNode` | `audio/VoiceDesignerNode.tsx` |
| Dialogue writing | `DialogueWriterNode` | `audio/DialogueWriterNode.tsx` |
| Voice scripting | `VoiceScriptNode` | `audio/VoiceScriptNode.tsx` |

#### E. Other Tools

| Tool | Path | Status |
|------|------|--------|
| AI ConceptLab | `src/app/concept-lab/` | Active — shared canvas with ShawnderMind |
| Gemini Studio | `src/app/gemini-studio/` | Active — image/video generation |
| Tool Editor | `src/app/tool-editor/` | Active — visual UI tool designer |
| AI UI Lab | `src/app/ui-lab/` | Active — game UI generation |
| AI Sprite Lab | External (`/sprite-lab`) | Proxied via rewrite, separate app |
| Walter | Not implemented | Listed in registry |

---

### 6. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ HomePage  │ │ Sidebar  │ │ Toolbar  │ │ CmdPalette   │   │
│  └────┬─────┘ └──────────┘ └──────────┘ └──────────────┘   │
│       │                                                      │
│  ┌────▼──────────────────────────────────────────────────┐  │
│  │              WorkspaceRenderer                         │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌────────────────┐  │  │
│  │  │ SessionProv. │ │ UILabProv.  │ │ ToolEditorProv│  │  │
│  │  │  ┌─────────┐│ │  ┌────────┐│ │  ┌───────────┐│  │  │
│  │  │  │Ideation ││ │  │ UI Lab ││ │  │ToolEditor ││  │  │
│  │  │  │ Canvas  ││ │  │        ││ │  │ Canvas    ││  │  │
│  │  │  └─────────┘│ │  └────────┘│ │  └───────────┘│  │  │
│  │  └─────────────┘ └────────────┘ └────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────── API Routes ──────────────────────────┐ │
│  │ /api/ai-generate  │ /api/meshy     │ /api/elevenlabs   │ │
│  │ /api/ai-status    │ /api/meshy-exp │ /api/hitem3d      │ │
│  │ /api/session      │ /api/char-save │ /api/send-to-ps   │ │
│  │ /api/list-dirs    │ /api/open-fold │                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │                    │                   │
         ▼                    ▼                   ▼
  Google Gemini API    Meshy/Hitem3D API    ElevenLabs API
```

**Data flow:**
1. User interacts with React Flow canvas nodes
2. Nodes read/write to `SessionContext` (pipeline state) and `node.data` (local state)
3. `useCanvasSession` manages undo/redo, layout save/load, auto-persistence
4. API calls go through `/api/*` server routes → external APIs
5. Results flow back to node data → downstream nodes read via React Flow store

---

### 7–12. (See full comprehensive report)

Full module deep dives, dependency analysis, configuration surface, risk assessment, open questions, and evidence index are available in `.repo_snapshot/repo_comprehensive_report.md`.

---

## Master Index

* Snapshot: `.repo_snapshot/repo_snapshot.md`
* Snapshot JSON: `.repo_snapshot/repo_snapshot.json`
* Snapshot Diff: `.repo_snapshot/diff__20260306_to_20260311__latest.md`
* Health Report: `HEALTH_REPORT.md`
* Health Metrics: `.repo_snapshot/health_reports/health_metrics__20260311_001400.json`
* Health History: `.repo_snapshot/health_reports/health_history.csv`
* Tasks: `TASKS.md`
* Comprehensive Report: `.repo_snapshot/repo_comprehensive_report.md`
* Master Report: `MASTER_REPO_REPORT.md`
