# Master Repo Report

| Field | Value |
|-------|-------|
| Project root | `D:\dev\Shawnderland_OKDO` |
| Generated at | 2026-03-06 16:11:52 |
| Includes | Snapshot + Health Audit + Comprehensive Repo Report + TASKS |
| Health | **Yellow** (report_id: 20260306_161152) |

---

## Repo Snapshot

# Repo Snapshot — Shawnderland OKDO

| Field | Value |
|-------|-------|
| Generated | 2026-03-06 16:11:52 |
| Report ID | 20260306_161152 |
| Repo root | `D:\dev\Shawnderland_OKDO` |
| Branch | main |
| Last commit | `4ac2b70` (2026-03-06) |
| Uncommitted | 6 modified files |

## Folder Tree (depth 4)

```
/
├── .cursor/rules/                    (governance.mdc, ui-propagation.mdc, canvas-conventions.mdc)
├── packages/ui/src/
│   ├── canvas/                       (BaseNode, PipelineEdge, flowLayout, index)
│   ├── Input.tsx, Button.tsx, Select.tsx, Card.tsx, Textarea.tsx, PanelSection.tsx
│   ├── index.ts, tokens.css, base.css, animations.css
├── src/
│   ├── app/
│   │   ├── api/                      (character-save/, open-folder/, send-to-photoshop/)
│   │   ├── concept-lab/
│   │   │   ├── ConceptLabShell.tsx, ConceptLabDock.tsx
│   │   │   └── nodes/               (WeapBaseNode, WeapComponentsNode, ConceptLabNodes.css)
│   │   ├── gemini-studio/
│   │   │   ├── GeminiStudioShell.tsx, GeminiStudioDock.tsx
│   │   │   └── nodes/               (ImageGenNode, VideoGenNode, PromptNode, ImageRefNode, OutputViewerNode)
│   │   ├── ideation/
│   │   │   ├── canvas/
│   │   │   │   ├── FlowCanvas.tsx, ToolDock.tsx, useFlowSession.ts, GlossaryOverlay.tsx
│   │   │   │   ├── nodes/           (SeedNode, NormalizeNode, DivergeNode, CritiqueNode, ExpandNode, ConvergeNode, CommitNode, IterateNode, ResultNode, StartNode, GroupNode, PackedPipelineNode, CountNode, TextOutputNode, ImageOutputNode, VideoOutputNode, ExtractDataNode, EmotionNode, InfluenceNode, TextInfluenceNode, DocumentInfluenceNode, ImageInfluenceNode, LinkInfluenceNode, VideoInfluenceNode, PrepromptNode, PostPromptNode, ImageReferenceNode, CharacterNode, WeaponNode, TurnaroundNode, BaseNode, nodeRegistry)
│   │   │   │   ├── nodes/character/ (CharIdentityNode, CharDescriptionNode, CharAttributesNode, ExtractAttributesNode, EnhanceDescriptionNode, GenerateCharImageNode, GenerateViewsNode, ReferenceCalloutNode, MainStageViewerNode, EditCharacterNode, CharHistoryNode, ResetCharacterNode, SendToPhotoshopNode, ShowXMLNode, QuickGenerateNode, ProjectSettingsNode)
│   │   │   │   ├── edges/           (PipelineEdge)
│   │   │   │   └── compat/          (withCompatCheck, CompatProvider)
│   │   │   ├── layout/              (Shell, SettingsPanel, FooterNote, SaveDialog, OpenDialog, Modal, StageWorkspace)
│   │   │   ├── stages/              (NormalizeStage, DivergeStage, CritiqueStage, ExpandStage, ConvergeStage, CommitStage, IterateStage, stages.css)
│   │   │   └── views/               (EvaluationDashboardView, LineageGraphView)
│   │   ├── tool-editor/
│   │   │   ├── ToolEditorShell.tsx, ToolEditorCanvas.tsx, PropertyPanel.tsx, EditorToolDock.tsx
│   │   │   ├── SaveDialog.tsx, ExportDialog.tsx, ImportDialog.tsx
│   │   │   └── nodes/               (GenericNode, FrameNode, WindowNode, ImageNode, TextBoxNode, ButtonNode, DropdownNode)
│   │   ├── ui-lab/                   (UILabShell, components: DimensionPlanner, GeneratePanel, etc.)
│   │   ├── globals.css, layout.tsx, page.tsx
│   ├── components/                   (GlobalToolbar, Sidebar, HubCanvas, HomePage, Toast, CostWidget, CanvasContextMenu, ImageContextMenu)
│   ├── hooks/                        (useCanvasSession.ts)
│   └── lib/
│       ├── ideation/
│       │   ├── context/              (SessionContext.tsx)
│       │   ├── engine/               (orchestrator.ts, apiConfig.ts, generationLog.ts)
│       │   │   ├── provider/         (geminiProvider.ts, mockProvider.ts, costTracker.ts, types.ts)
│       │   │   ├── prompts/          (normalizePrompt, divergePrompt, critiquePrompt, expandPrompt, convergePrompt, commitPrompt, iteratePrompt, loadPack)
│       │   │   ├── diverge/          (portfolio.ts)
│       │   │   ├── critique/         (critiqueEngine.ts)
│       │   │   ├── converge/         (convergeEngine.ts)
│       │   │   ├── commit/           (commitEngine.ts)
│       │   │   ├── culture/          (cultureGuard.ts)
│       │   │   ├── eval/             (smoke.ts)
│       │   │   ├── security/         (inputSanitizer.ts)
│       │   │   ├── lineage/          (lineageGraph.ts)
│       │   │   └── conceptlab/       (imageGenApi.ts, characterPrompts.ts, weaponPrompts.ts)
│       │   └── state/                (sessionTypes.ts, sessionStore.ts, sessionSelectors.ts, presetStore.ts)
│       ├── layoutStore.ts, registry.ts, cn.ts, tool-client.ts, types.ts
│       ├── styles/                   (useStyleStore, styleStore)
│       ├── ui-lab/                   (UILabContext, api, types)
│       └── workspace/                (WorkspaceContext)
├── Governance: PROJECT.md, SPEC.md, ARCHITECTURE.md, DECISIONS.md, TASKS.md, AGENT_RULES.md
├── Reports: HEALTH_REPORT.md, MASTER_REPO_REPORT.md
├── Config: .env.example, .env.local, next.config.ts, tsconfig.json, postcss.config.mjs, run.bat, package.json
```

## Governance Documents

| Document | Present |
|----------|---------|
| PROJECT.md | Yes |
| SPEC.md | Yes |
| ARCHITECTURE.md | Yes |
| DECISIONS.md | Yes |
| TASKS.md | Yes |
| README.md | No |
| AGENT_RULES.md | Yes |

## Dependencies

**Root package.json** — `shawnderland-okdo@0.1.0`

| Package | Version | Role |
|---------|---------|------|
| next | ^15 | Framework |
| react / react-dom | ^19 | UI library |
| @xyflow/react | ^12.10.1 | Node canvas |
| dagre | ^0.8.5 | Graph layout |
| zod | ^4.3.6 | Schema validation |
| lucide-react | ^0.468 | Icons |
| tailwindcss | ^4 | Styling |
| typescript | ^5 | Language |

## Entry Points

| Entry | Path | Status |
|-------|------|--------|
| Run script | `run.bat` | Present, functional |
| Dev server | `npm run dev` | Next.js dev |
| Build | `npm run build` | Next.js build |
| App entry | `src/app/page.tsx` | Hub home page |

## Lines of Code

| Extension | Files | LOC | Bytes |
|-----------|-------|-----|-------|
| .tsx | 147 | 21,175 | 837,179 |
| .css | 68 | 11,413 | 258,133 |
| .ts | 78 | 9,711 | 390,105 |
| .json | 1 | 20 | 537 |
| .md | 9 | 20 | 1,757 |
| **Total** | **303** | **42,339** | **1,487,711** |

## Subsystems

| System | Path | Role |
|--------|------|------|
| Hub Shell | src/components/ | App shell, sidebar, workspace |
| ShawnderMind | src/app/ideation/ | 8-stage AI ideation pipeline |
| AI ConceptLab | src/app/concept-lab/ | Character/weapon concept design |
| Gemini Studio | src/app/gemini-studio/ | Image/video generation |
| Tool Editor | src/app/tool-editor/ | Visual tool designer |
| AI UI Lab | src/app/ui-lab/ | Game UI generation |
| Engine | src/lib/ideation/engine/ | Orchestrator, providers, prompts |
| Session | src/lib/ideation/context/ | State management |
| Design System | packages/ui/ | Shared UI components |
| Shared Hooks | src/hooks/ | useCanvasSession |

## Duplication Signals

| Signal | Files |
|--------|-------|
| Duplicate flowLayout.ts | `packages/ui/src/canvas/flowLayout.ts` vs `src/app/ideation/canvas/flowLayout.ts` |
| Orphaned ContextMenu.css | `src/app/ideation/canvas/ContextMenu.css` (component deleted) |
| Dead viewer CSS | `src/app/concept-lab/nodes/ConceptLabNodes.css` .cl-viewer-* classes |

## Config

| Type | File | Notes |
|------|------|-------|
| Env vars | `.env.example` | NEXT_PUBLIC_GEMINI_API_KEY, NEXT_PUBLIC_VERTEX_* |
| Next config | `next.config.ts` | Rewrites for sub-tools |
| TypeScript | `tsconfig.json` | Strict, @/* aliases |
| PostCSS | `postcss.config.mjs` | Tailwind v4 |

## Git Churn

| Hash | Date | Message |
|------|------|---------|
| 4ac2b70 | 2026-03-06 | feat: add named layout system, global cost widget, character generator nodes, and UX overhaul |
| a8cf08c | 2026-03-06 | docs: sync governance docs with current implementation, add full scan report |
| 4bd18a3 | 2026-03-06 | pre clean |
| b2ad2d6 | 2026-03-05 | feat: add ConceptLab, Gemini Studio, home page redesign, and node resize |
| 2b3e5c4 | 2026-03-05 | feat: add Tool Editor, overhaul Ideation Canvas, establish RRGM governance |

---

## Health Report

# Health Report — Shawnderland OKDO

| Field | Value |
|-------|-------|
| Report ID | 20260306_161152 |
| Date | 2026-03-06 16:11:52 |
| Overall Health | **YELLOW** |
| Primary Issue Type | Doc Lag |

## Scoring

### Red Triggers
None.

### Yellow Triggers
1. **Doc drift**: ARCHITECTURE.md references deleted Concept Lab nodes (`CharIdentityNode.tsx`, `CharAttributesNode.tsx`, `MultiViewerNode.tsx`, `EditImageNode.tsx` under `concept-lab/nodes/`). 16 new character nodes under `ideation/canvas/nodes/character/` are undocumented. New shared components (`CostWidget`, `Toast`, `layoutStore`) not listed.
2. **Broken preset node types**: `ConceptLabShell.tsx` character/weapon presets reference non-existent node types `multiViewer` and `editImage` (should be `charViewer` and `charEdit`).
3. **Dead CSS**: ~65 lines of `.cl-viewer-*` styles in `ConceptLabNodes.css` from removed `MultiViewerNode`.
4. **GeminiStudioShell missing named layout integration**: Still uses deprecated `onSaveLayout` prop; not wired to new named layout system.
5. **6 uncommitted files**: Export dropdown and toolbar changes not yet committed.

### Green Conditions Met
- No secrets in source code
- Entrypoint (`run.bat`, `npm run dev`) functional
- No output-only dirs tracked in git
- No text files over 100KB
- Portability: Pass (deps declared, run command bootstraps)
- No parallel systems detected (duplicates are tracked and documented)

---

## Top 3 Risks

1. **Broken ConceptLab presets**: Character and Weapon preset buttons silently fail because they reference old node types (`multiViewer`/`editImage`). Users clicking these presets will see blank fallback nodes.
2. **ARCHITECTURE.md structural inaccuracy**: Documentation claims character nodes live in `concept-lab/nodes/` but they were moved to `ideation/canvas/nodes/character/`. New developers following the architecture doc will be misled.
3. **Uncommitted feature work**: 6 files with the Export dropdown overhaul are modified but not committed, risking accidental loss.

## Top 3 Recommended Actions

1. **Fix preset node types** in `ConceptLabShell.tsx`: change `multiViewer` → `charViewer`, `editImage` → `charEdit`.
2. **Update ARCHITECTURE.md**: Remove deleted `concept-lab/nodes/` entries, add `ideation/canvas/nodes/character/` section, add shared components section (CostWidget, Toast, layoutStore).
3. **Commit outstanding changes**: Stage and commit the 6 modified files for the Export dropdown feature.

---

## Findings

### 1. Governance

| Document | Status | Notes |
|----------|--------|-------|
| PROJECT.md | Present | Accurate high-level description |
| SPEC.md | Present | "Node inspector" and "status bar" listed but not wired |
| ARCHITECTURE.md | Present | **Drift** — deleted nodes listed, new nodes missing |
| DECISIONS.md | Present | Up to date |
| TASKS.md | Present | Active items present |
| README.md | **Missing** | No README.md exists |
| AGENT_RULES.md | Present | Authoritative governance contract |

### 2. Drift & Bloat

**Doc Drift Items:**

| # | Document | Issue | Evidence |
|---|----------|-------|----------|
| 1 | ARCHITECTURE.md | Lists `concept-lab/nodes/CharIdentityNode.tsx` | File deleted; lives at `ideation/canvas/nodes/character/` |
| 2 | ARCHITECTURE.md | Lists `concept-lab/nodes/CharAttributesNode.tsx` | File deleted; lives at `ideation/canvas/nodes/character/` |
| 3 | ARCHITECTURE.md | Lists `concept-lab/nodes/MultiViewerNode.tsx` | File deleted; replaced by `MainStageViewerNode` |
| 4 | ARCHITECTURE.md | Lists `concept-lab/nodes/EditImageNode.tsx` | File deleted; replaced by `EditCharacterNode` |
| 5 | ARCHITECTURE.md | Missing `ideation/canvas/nodes/character/` | 16 new character generator nodes not documented |
| 6 | ARCHITECTURE.md | Missing shared components | `CostWidget`, `Toast`, `layoutStore` not listed |
| 7 | SPEC.md | Lists "Node inspector" as canvas UI | `NodeInspector.tsx` exists but is never imported |
| 8 | SPEC.md | Lists "status bar" as canvas UI | `StatusBar.tsx` exists but is never imported |

**Code Bloat:**

| Item | Path | Size |
|------|------|------|
| stages.css | `src/app/ideation/stages/stages.css` | 1,495 LOC |
| orchestrator.ts | `src/lib/ideation/engine/orchestrator.ts` | 1,106 LOC |
| useFlowSession.ts | `src/app/ideation/canvas/useFlowSession.ts` | 1,094 LOC |
| SessionContext.tsx | `src/lib/ideation/context/SessionContext.tsx` | 1,083 LOC |
| FlowCanvas.tsx | `src/app/ideation/canvas/FlowCanvas.tsx` | 1,029 LOC |

### 3. Cleanup Candidates

| # | Item | Action |
|---|------|--------|
| 1 | `src/app/ideation/canvas/StatusBar.tsx` + `.css` | Remove (never imported) |
| 2 | `src/app/ideation/canvas/NodeInspector.tsx` + `.css` | Remove (never imported) |
| 3 | Dead `.cl-viewer-*` CSS in `ConceptLabNodes.css` | Remove ~65 lines |
| 4 | `src/lib/ideation/engine/prompts/loadPack.ts` | Evaluate — exports unused |
| 5 | Orphaned `ContextMenu.css` | Evaluate — merge or remove |
| 6 | Broken preset types in `ConceptLabShell.tsx` | Fix `multiViewer` → `charViewer`, `editImage` → `charEdit` |
| 7 | `GeminiStudioShell.tsx` deprecated props | Wire to named layout system |

### 4. Growth & Trajectory

**Since last audit (20260306_080757):**

| Metric | Previous | Current | Delta | % Change |
|--------|----------|---------|-------|----------|
| Files | 291 | 303 | +12 | +4.1% |
| LOC (src+packages) | 45,917 | 42,339 | -3,578* | -7.8% |
| Bytes | 1,450,931 | 1,487,711 | +36,780 | +2.5% |
| Commits | 4 | 7 | +3 | — |

*LOC decrease due to revised counting scope (excludes root-level governance docs and package-lock.json from src/packages count).

**Top files by growth (estimated from commit messages):**
- `useFlowSession.ts`: +276 LOC (named layouts, export variants, UX overhaul)
- `FlowCanvas.tsx`: +232 LOC (lineage tracking, glossary, auto-connect)
- `orchestrator.ts`: +67 LOC (count controls, multimodal, data chains)
- `GlobalToolbar.tsx`: Layout/Export dropdowns added
- 16 new character node files added

**Growth rate**: +2.5% bytes in ~8 hours. Not sustained enough to trigger yellow growth warning.

### 5. Prompt & Template Surface

Top template literals by size:

| # | File | Description |
|---|------|-------------|
| 1 | `characterPrompts.ts:128` | Image format spec for character generation (~600 chars) |
| 2 | `characterPrompts.ts:252` | Data extraction prompt for character attributes (~500 chars) |
| 3 | `characterPrompts.ts:155` | Identity lock instructions for consistency (~400 chars) |
| 4 | `loadPack.ts:5` | Normalize stage system prompt (~300 chars) |
| 5 | `loadPack.ts:13` | Diverge stage system prompt (~350 chars) |
| 6 | `loadPack.ts:23` | Critique stage system prompt (~250 chars) |
| 7 | `loadPack.ts:28` | Mutation engine system prompt (~300 chars) |
| 8 | `loadPack.ts:35` | Expand stage system prompt (~300 chars) |
| 9 | `weaponPrompts.ts:129` | Weapon image analysis prompt (~400 chars) |
| 10 | `orchestrator.ts:53` | Seed summary JSON schema prompt (~200 chars) |

No near-duplicate prompts detected (all serve distinct pipeline stages).

### 6. Secrets Scan

**Status: Clean**

All API_KEY/TOKEN references are environment variable name references, not hardcoded values. `.env` and `.env.local` are properly gitignored.

### 7. Portability

**Status: Pass**

- `package.json` declares all runtime and dev dependencies
- `run.bat` checks for Node.js, runs `npm install`, starts dev server
- `.env.example` documents required environment variables
- No manual steps required beyond copying `.env.example` → `.env.local`

---

## Proposed Cleanup Plan

### Priority 1 — Functional Fixes
1. Fix broken preset node types in `ConceptLabShell.tsx`
2. Wire `GeminiStudioShell.tsx` to named layout system
3. Commit 6 uncommitted files

### Priority 2 — Dead Code Removal
4. Delete `StatusBar.tsx` + `StatusBar.css` (dead code)
5. Delete `NodeInspector.tsx` + `NodeInspector.css` (dead code)
6. Remove `.cl-viewer-*` CSS from `ConceptLabNodes.css`
7. Evaluate `loadPack.ts` for removal

### Priority 3 — Documentation
8. Update ARCHITECTURE.md with current file structure
9. Remove "Node inspector" and "status bar" claims from SPEC.md or wire them up
10. Create README.md

### Priority 4 — Technical Debt
11. Consolidate duplicate `flowLayout.ts`
12. Split files over 1000 LOC (SessionContext, orchestrator, useFlowSession, FlowCanvas)
13. Evaluate orphaned `ContextMenu.css`

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
- [ ] Fix broken preset node types in ConceptLabShell.tsx (multiViewer → charViewer, editImage → charEdit)
- [ ] Remove dead code: StatusBar.tsx/css, NodeInspector.tsx/css (never imported)
- [ ] Remove dead .cl-viewer-* CSS from ConceptLabNodes.css (~65 lines)
- [ ] Wire GeminiStudioShell.tsx to named layout system (uses deprecated onSaveLayout)
- [ ] Update ARCHITECTURE.md: remove deleted concept-lab/nodes/ entries, add ideation/canvas/nodes/character/ and shared components
- [ ] Evaluate loadPack.ts exports (unused)
- [x] Health audit report generated (report_id: 20260306_080757)
- [x] Health audit report generated (report_id: 20260306_161152)

---

## Comprehensive Repo Report

# Comprehensive Repo Report — Shawnderland OKDO

## 1. Metadata

| Field | Value |
|-------|-------|
| Timestamp | 2026-03-06 16:11:52 |
| Report ID | 20260306_161152 |
| Repo root | `D:\dev\Shawnderland_OKDO` |
| Git branch | main |
| Last commit | `4ac2b70` — 2026-03-06 |
| Uncommitted changes | 6 modified files |
| Scan scope | Full repository (src/, packages/, root config) |

## 2. Executive Summary

- **Shawnderland OKDO** is a Next.js 15 hub application that unifies six AI-powered creative tools under a single interface with shared navigation, theming, and canvas infrastructure.
- The codebase is ~42,300 LOC across 303 files (TypeScript/TSX dominant), with a monorepo-lite structure (`packages/ui/` for shared components).
- All tools share a React Flow-based canvas with unified toolbar, context menu, layout persistence, and API cost tracking.
- The largest subsystem is **ShawnderMind**, an 8-stage AI ideation pipeline (~5,000 LOC across canvas, stages, engine, and session).
- A **character generator** node system (16 nodes) was recently added, available across ShawnderMind and ConceptLab canvases.
- The project uses Google's Gemini API exclusively (AI Studio or Vertex AI), supporting text, image generation (Imagen 4), video generation (Veo 2), and multimodal inputs.
- Health status is **YELLOW** due to documentation drift (ARCHITECTURE.md references deleted files) and broken ConceptLab presets.
- No hardcoded secrets found; environment variables are properly managed via `.env.local` (gitignored) with `.env.example` template.
- The project has no test suite and several files exceeding 1,000 LOC that are candidates for splitting.
- Active development is rapid — 7 commits over 2 days, with 3 major feature additions in the latest commit.
- A `run.bat` launcher makes the project runnable with a single click on Windows, checking Node.js, installing deps, and opening the browser.

## 3. What This Repo Is

| Aspect | Details | Evidence |
|--------|---------|----------|
| **Type** | Web application (monorepo-lite) | `package.json` at root + `packages/ui/package.json` |
| **Languages** | TypeScript 5, CSS (Tailwind v4), JSON | `tsconfig.json`: `"strict": true`; 147 .tsx + 78 .ts + 68 .css files |
| **Framework** | Next.js 15 (App Router), React 19 | `package.json`: `"next": "^15"`, `"react": "^19"` |
| **Runtime** | Node.js (browser-first SPA with API routes) | `run.bat` checks Node; `src/app/api/` routes |
| **Canvas Library** | @xyflow/react 12 (React Flow) | `package.json`: `"@xyflow/react": "^12.10.1"` |
| **AI Backend** | Google Gemini (AI Studio + Vertex AI) | `src/lib/ideation/engine/apiConfig.ts`, `.env.example` |
| **Styling** | Tailwind CSS v4 + custom CSS modules | `postcss.config.mjs`, `src/app/globals.css` |
| **Graph Layout** | Dagre | `package.json`: `"dagre": "^0.8.5"` |
| **Schema Validation** | Zod 4 | `package.json`: `"zod": "^4.3.6"` |

## 4. How to Run

### Prerequisites
- **Node.js** must be installed and available in PATH
- **OS**: Windows (run.bat provided); macOS/Linux can use `npm run dev` directly

### Quick Start (Windows)
```bat
run.bat
```
This script:
1. Verifies Node.js is installed
2. Runs `npm install` if `node_modules/` is missing
3. Kills any process on port 3000
4. Starts `npm run dev` (Next.js dev server)
5. Polls until `http://localhost:3000` responds
6. Opens the browser

Evidence: `run.bat` lines 1-51

### Quick Start (Any OS)
```bash
cp .env.example .env.local
# Edit .env.local to add NEXT_PUBLIC_GEMINI_API_KEY
npm install
npm run dev
# Open http://localhost:3000
```

Evidence: `.env.example`, `package.json` scripts section

### Environment Variables
| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `NEXT_PUBLIC_VERTEX_PROJECT` | No | GCP project ID for Vertex AI |
| `NEXT_PUBLIC_VERTEX_LOCATION` | No | Vertex AI region |
| `NEXT_PUBLIC_VERTEX_API_KEY` | No | Vertex AI credentials |

Evidence: `.env.example` lines 1-16

## 5. Feature Inventory

### A. Hub & Navigation

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| Tool registry | `src/lib/registry.ts` | 6 tools defined: ShawnderMind, ConceptLab, Gemini Studio, UI Lab, Sprite Lab, Walter |
| Sidebar navigation | `src/components/Sidebar.tsx` | Renders `TOOLS` from registry with icons |
| Client shell | `src/components/ClientShell.tsx` | Wraps app with Sidebar + content area |
| Hub canvas | `src/components/HubCanvas.tsx` | Overview canvas for tool connections |
| Home page | `src/components/HomePage.tsx` | Landing page component |
| Workspace context | `src/lib/workspace/WorkspaceContext.tsx` | Shared workspace state provider |

### B. ShawnderMind (Ideation Pipeline)

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| 8-stage pipeline | `src/lib/ideation/engine/orchestrator.ts` | Seed → Normalize → Diverge → Critique → Expand → Converge → Commit → Iterate |
| Flow canvas | `src/app/ideation/canvas/FlowCanvas.tsx` | React Flow canvas with drag-drop nodes |
| Session persistence | `src/lib/ideation/context/SessionContext.tsx` | Context provider with localStorage persistence |
| Tool dock | `src/app/ideation/canvas/ToolDock.tsx` | Node palette with categories and search |
| Node types (26+) | `src/app/ideation/canvas/nodes/nodeRegistry.ts` | Pipeline, output, input, influence, utility nodes |
| Result display | `src/app/ideation/canvas/nodes/ResultNode.tsx` | Categorized results with TLDR, lineage, critique inline |
| Lineage tracking | `src/lib/ideation/engine/lineage/lineageGraph.ts` | Event-sourced graph for idea ancestry |
| Glossary overlay | `src/app/ideation/canvas/GlossaryOverlay.tsx` | Movable terminology reference |
| Multimodal seed | `src/app/ideation/canvas/nodes/SeedNode.tsx` | Image/video/document input alongside text |
| Count controls | `src/app/ideation/canvas/nodes/CountNode.tsx` | Inline result count settings per stage |
| Named layouts | `src/lib/layoutStore.ts` | Save, load, set default layouts |
| Evaluation dashboard | `src/app/ideation/views/EvaluationDashboardView.tsx` | Scoring and ranking visualization |

### C. AI ConceptLab

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| Canvas shell | `src/app/concept-lab/ConceptLabShell.tsx` | React Flow canvas with character/weapon nodes |
| Weapon nodes | `src/app/concept-lab/nodes/WeapBaseNode.tsx`, `WeapComponentsNode.tsx` | Weapon design pipeline |
| Character generator (16 nodes) | `src/app/ideation/canvas/nodes/character/` | Full character creation pipeline |
| Turnaround views | `src/app/ideation/canvas/nodes/TurnaroundNode.tsx` | Multi-view character rendering |

### D. Character Generator (shared)

| Feature | Node | Evidence |
|---------|------|----------|
| Identity setup | `CharIdentityNode.tsx` | Age, race, gender, build presets |
| Description | `CharDescriptionNode.tsx` | Freeform text description |
| Attributes | `CharAttributesNode.tsx` | Structured character attributes |
| Image extraction | `ExtractAttributesNode.tsx` | AI extracts attributes from reference images |
| Description enhancement | `EnhanceDescriptionNode.tsx` | AI enhances connected description node |
| Image generation | `GenerateCharImageNode.tsx` | Generates character image from collected data |
| Multi-view generation | `GenerateViewsNode.tsx` | Front/back/side views |
| Reference callout | `ReferenceCalloutNode.tsx` | Reference image with annotation prompt |
| Main stage viewer | `MainStageViewerNode.tsx` | Large image viewer with zoom |
| Edit character | `EditCharacterNode.tsx` | Text-based image modifications |
| History | `CharHistoryNode.tsx` | Version history of edits |
| Reset | `ResetCharacterNode.tsx` | Resets all character data |
| Send to Photoshop | `SendToPhotoshopNode.tsx` | API route integration |
| Show XML | `ShowXMLNode.tsx` | Full character data display |
| Quick generate | `QuickGenerateNode.tsx` | AI auto-fills and generates |
| Project settings | `ProjectSettingsNode.tsx` | Save folder configuration |

### E. Gemini Studio

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| Canvas shell | `src/app/gemini-studio/GeminiStudioShell.tsx` | React Flow canvas |
| Prompt node | `src/app/gemini-studio/nodes/PromptNode.tsx` | Text prompt input |
| Image generation | `src/app/gemini-studio/nodes/ImageGenNode.tsx` | Imagen 4 integration |
| Video generation | `src/app/gemini-studio/nodes/VideoGenNode.tsx` | Veo 2 integration |
| Image reference | `src/app/gemini-studio/nodes/ImageRefNode.tsx` | Reference image for generation |
| Output viewer | `src/app/gemini-studio/nodes/OutputViewerNode.tsx` | Result display |

### F. Tool Editor

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| Canvas shell | `src/app/tool-editor/ToolEditorShell.tsx` | Visual tool designer |
| Generic/Frame/Window nodes | `src/app/tool-editor/nodes/` | UI element primitives |
| Property panel | `src/app/tool-editor/PropertyPanel.tsx` | Node property editor |
| Save/Export/Import | `src/app/tool-editor/SaveDialog.tsx`, `ExportDialog.tsx`, `ImportDialog.tsx` | File management |

### G. AI UI Lab

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| Shell | `src/app/ui-lab/UILabShell.tsx` | Game UI generation workspace |
| Dimension planner | `src/app/ui-lab/components/DimensionPlanner.tsx` | Layout dimension planning |
| Generate panel | `src/app/ui-lab/components/GeneratePanel.tsx` | AI generation controls |
| Style extraction | `src/app/ui-lab/components/ExtractStylePanel.tsx` | Extract styles from images |

### H. Shared Infrastructure

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| Global toolbar | `src/components/GlobalToolbar.tsx` | Unified toolbar with Layout + Export dropdowns |
| Canvas context menu | `src/components/CanvasContextMenu.tsx` | Right-click menu with copy/paste/delete/pin |
| Cost widget | `src/components/CostWidget.tsx` | Cumulative API cost tracker (all apps) |
| Toast notifications | `src/components/Toast.tsx` | Global notification system |
| Layout store | `src/lib/layoutStore.ts` | Named layout persistence |
| Cost tracker | `src/lib/ideation/engine/provider/costTracker.ts` | Per-app API cost tracking |
| Canvas session hook | `src/hooks/useCanvasSession.ts` | Shared canvas state management |

## 6. Architecture Overview

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Shell                     │
│  layout.tsx → ClientShell → Sidebar + Content           │
├──────┬──────┬──────┬──────┬──────┬──────────────────────┤
│ Shaw-│ Con- │ Gem- │ Tool │ UI   │ API Routes           │
│ nder │ cept │ ini  │ Edit │ Lab  │ (character-save,     │
│ Mind │ Lab  │ Stud │ or   │      │  open-folder,        │
│      │      │ io   │      │      │  send-to-photoshop)  │
├──────┴──────┴──────┴──────┴──────┴──────────────────────┤
│              Shared Components Layer                     │
│  GlobalToolbar │ CanvasContextMenu │ CostWidget │ Toast  │
├─────────────────────────────────────────────────────────┤
│              Shared Hooks Layer                          │
│  useCanvasSession │ layoutStore │ costTracker            │
├─────────────────────────────────────────────────────────┤
│              Engine Layer (ShawnderMind)                  │
│  Orchestrator │ Gemini Provider │ Prompts │ Lineage      │
├─────────────────────────────────────────────────────────┤
│              UI Package (@shawnderland/ui)               │
│  BaseNode │ PipelineEdge │ Dagre Layout │ Design Tokens  │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction** → React Flow canvas captures node/edge changes
2. **Node Execution** → Node-specific handlers call orchestrator or direct API
3. **Orchestrator** → Assembles prompts from node data, influence nodes, preprompt/postprompt
4. **Gemini Provider** → Sends to Google AI Studio or Vertex AI
5. **Cost Tracker** → Records token usage and cost per application
6. **Results** → Flow back to session state → render in ResultNode or output nodes
7. **Persistence** → Session state saved to localStorage, layouts saved via layoutStore

### Key Abstractions

- **Session Context** (`SessionContext.tsx`): Provides pipeline state, node data, and event dispatch for ShawnderMind
- **Canvas Session** (`useCanvasSession.ts`): Provides node/edge state, undo/redo, export, and layout management for non-ShawnderMind tools
- **Node Registry** (`nodeRegistry.ts`): Central catalog of all node types with metadata, connection rules, and default styles
- **Provider Pattern** (`geminiProvider.ts`, `mockProvider.ts`): Abstracted LLM interface supporting multimodal inputs
- **Layout Store** (`layoutStore.ts`): Named layout persistence with default layout support per application

## 7. Module Deep Dive

### 7.1 ShawnderMind Canvas (`src/app/ideation/canvas/`)

**Purpose**: Interactive node-based canvas for the 8-stage ideation pipeline.

**Key Files**:
- `FlowCanvas.tsx` (1,029 LOC) — Main canvas component, handles node/edge rendering, auto-connect, lineage highlighting, glossary overlay
- `useFlowSession.ts` (1,094 LOC) — Session management hook: stage execution, node creation, result display, layout persistence, export
- `ToolDock.tsx` (744 LOC) — Categorized node palette with search, details, presets
- `nodes/nodeRegistry.ts` (357 LOC) — Node type catalog with metadata and connection validation

**Interactions**: FlowCanvas uses useFlowSession for state, which calls the orchestrator for pipeline execution. Results are rendered as ResultNode children positioned beneath their parent.

### 7.2 Ideation Engine (`src/lib/ideation/engine/`)

**Purpose**: Core AI pipeline logic — prompt assembly, LLM calls, result processing.

**Key Files**:
- `orchestrator.ts` (1,106 LOC) — Pipeline stage orchestration, prompt assembly from node chains, multimodal input handling
- `provider/geminiProvider.ts` — Gemini API integration with multimodal support (text, image, video)
- `provider/costTracker.ts` — Token/cost tracking with per-application breakdown
- `prompts/` — Stage-specific prompt builders (normalize, diverge, critique, expand, converge, commit, iterate)
- `conceptlab/characterPrompts.ts` — Character generation prompt templates
- `lineage/lineageGraph.ts` — Event-sourced idea ancestry tracking

**Interactions**: Orchestrator receives stage execution requests from useFlowSession, assembles prompts from connected node data (including influence, preprompt, postprompt), calls geminiProvider, processes Zod-validated results, and returns structured output.

### 7.3 Session Management (`src/lib/ideation/context/`)

**Purpose**: Centralized state management for the ShawnderMind pipeline.

**Key Files**:
- `SessionContext.tsx` (1,083 LOC) — React context provider with session creation, event dispatch, flow state management, localStorage persistence

**Interactions**: Provides session state to FlowCanvas and pipeline stages. Manages flow state (nodes/edges) independently from stage outputs. Supports save/load of full sessions.

### 7.4 AI ConceptLab (`src/app/concept-lab/`)

**Purpose**: Character and weapon concept design canvas.

**Key Files**:
- `ConceptLabShell.tsx` (556 LOC) — Canvas shell registering character generator + weapon + UI node types
- `nodes/WeapBaseNode.tsx`, `WeapComponentsNode.tsx` — Weapon design nodes
- `ConceptLabDock.tsx` — Node palette

**Interactions**: Uses useCanvasSession for state management. Registers character nodes from `ideation/canvas/nodes/character/` (shared with ShawnderMind). Uses GlobalToolbar for Layout/Export dropdowns.

### 7.5 Character Generator (`src/app/ideation/canvas/nodes/character/`)

**Purpose**: Full character creation pipeline — identity, description, attributes, generation, multi-view, editing, history.

**Key Files**: 16 node components + `index.ts` barrel export + `CharacterNodes.css`

**Interactions**: Available in both ShawnderMind and ConceptLab. Uses Gemini API for image generation (Imagen 4) and text analysis. API routes (`character-save`, `open-folder`, `send-to-photoshop`) handle filesystem operations.

### 7.6 Gemini Studio (`src/app/gemini-studio/`)

**Purpose**: Direct image and video generation with prompt/reference inputs.

**Key Files**:
- `GeminiStudioShell.tsx` — Canvas shell with Gemini-specific nodes
- `nodes/ImageGenNode.tsx`, `VideoGenNode.tsx` — Generation nodes using Imagen 4 / Veo 2
- `nodes/PromptNode.tsx`, `ImageRefNode.tsx` — Input nodes
- `nodes/OutputViewerNode.tsx` — Result display

**Interactions**: Uses useCanvasSession. Partially wired to GlobalToolbar (missing named layout integration).

### 7.7 Tool Editor (`src/app/tool-editor/`)

**Purpose**: Visual UI tool designer with element primitives and JSON export.

**Key Files**:
- `ToolEditorShell.tsx`, `ToolEditorCanvas.tsx` — Canvas with custom drag/resize
- `PropertyPanel.tsx` — Property editor for selected elements
- `nodes/` — GenericNode, FrameNode, WindowNode, ImageNode, ButtonNode, TextBoxNode, DropdownNode
- `useToolEditorStore.ts` (580 LOC) — Zustand-like state management

**Interactions**: Self-contained; uses its own state management and export dialogs rather than shared hooks.

### 7.8 AI UI Lab (`src/app/ui-lab/`)

**Purpose**: Game UI generation workspace with dimension planning and style extraction.

**Key Files**:
- `UILabShell.tsx` — Main shell
- `components/DimensionPlanner.tsx` (937 LOC) — Largest component; layout dimension planning
- `components/GeneratePanel.tsx`, `ExtractStylePanel.tsx`, `RefSlotsPanel.tsx`, `RemoveUIPanel.tsx`

**Interactions**: Uses UILabContext from `src/lib/ui-lab/`.

### 7.9 Shared Components (`src/components/`)

**Purpose**: Cross-application UI components.

**Key Files**:
- `GlobalToolbar.tsx` — Layout dropdown (save/load/default/delete) + Export dropdown (4 variants)
- `CanvasContextMenu.tsx` — Right-click menu with copy/paste/delete/pin/edge-cutting
- `CostWidget.tsx` — Bottom-right API cost display with per-app breakdown
- `Toast.tsx` — Global toast notification system
- `Sidebar.tsx` — Navigation sidebar driven by tool registry

### 7.10 Design System (`packages/ui/`)

**Purpose**: Shared UI primitives and canvas components.

**Key Files**:
- `src/index.ts` — Exports: Button, Input, Textarea, Select, Card, PanelSection, BaseNode, PipelineEdge, applyDagreLayout
- `src/canvas/BaseNode.tsx` — Base node component with handles and status
- `src/canvas/flowLayout.ts` — Dagre-based auto-layout (NOTE: duplicated in `src/app/ideation/canvas/`)
- `src/tokens.css`, `base.css`, `animations.css` — Design tokens

## 8. External Dependencies & Integrations

### Runtime Dependencies

| Package | Version | Purpose | Evidence |
|---------|---------|---------|----------|
| next | ^15 | Framework | `package.json` |
| react / react-dom | ^19 | UI library | `package.json` |
| @xyflow/react | ^12.10.1 | Node canvas | `package.json` |
| dagre | ^0.8.5 | Graph auto-layout | `package.json` |
| zod | ^4.3.6 | Schema validation for LLM output | `package.json` |
| lucide-react | ^0.468 | Icon library | `package.json` |
| clsx | ^2 | CSS class merging | `package.json` |
| tailwind-merge | ^3 | Tailwind class deduplication | `package.json` |

### Dev Dependencies

| Package | Version | Purpose | Evidence |
|---------|---------|---------|----------|
| tailwindcss | ^4 | CSS framework | `package.json` devDeps |
| typescript | ^5 | Type checking | `package.json` devDeps |
| @tailwindcss/postcss | ^4 | PostCSS plugin | `package.json` devDeps |
| @types/* | Various | Type definitions | `package.json` devDeps |

### External Services

| Service | Usage | Evidence |
|---------|-------|----------|
| Google AI Studio | Text generation, multimodal analysis | `apiConfig.ts`, `.env.example` |
| Google Imagen 4 | Image generation | `geminiProvider.ts`, `imageGenApi.ts` |
| Google Veo 2 | Video generation | `geminiProvider.ts` |
| Google Vertex AI | Alternative backend (optional) | `apiConfig.ts`, `.env.example` |
| Adobe Photoshop | Send images via localhost API | `src/app/api/send-to-photoshop/route.ts` |

## 9. Configuration Surface

### File Types

| Type | Files |
|------|-------|
| Environment | `.env.local` (gitignored), `.env.example` (template) |
| Next.js | `next.config.ts` |
| TypeScript | `tsconfig.json` |
| PostCSS | `postcss.config.mjs` |
| Package | `package.json`, `packages/ui/package.json` |

### Environment Variable Names

| Variable | Required | Client-Side |
|----------|----------|-------------|
| `NEXT_PUBLIC_GEMINI_API_KEY` | Yes | Yes |
| `NEXT_PUBLIC_VERTEX_PROJECT` | No | Yes |
| `NEXT_PUBLIC_VERTEX_LOCATION` | No | Yes |
| `NEXT_PUBLIC_VERTEX_API_KEY` | No | Yes |

### Next.js Config Rewrites

| Source Pattern | Destination |
|----------------|-------------|
| `/api/tools/sprite-lab/:path*` | `${SPRITE_LAB_URL}/api/:path*` |
| `/api/tools/ideation/:path*` | `${SHAWNDERMIND_URL}/api/:path*` |
| `/api/tools/ui-lab/:path*` | `${UI_LAB_URL}/api/:path*` |
| `/api/tools/concept-lab/:path*` | `${CONCEPT_LAB_URL}/api/:path*` |

## 10. Risks / Complexity Hotspots

### Large Modules (>1000 LOC)

| File | LOC | Risk |
|------|-----|------|
| `stages.css` | 1,495 | Large CSS file; may have unused rules |
| `orchestrator.ts` | 1,106 | Core pipeline logic; complex branching |
| `useFlowSession.ts` | 1,094 | Session hook with many responsibilities |
| `SessionContext.tsx` | 1,083 | Monolithic context provider |
| `FlowCanvas.tsx` | 1,029 | Large component with many features |

### Duplication

| Signal | Files | Risk |
|--------|-------|------|
| flowLayout.ts | `packages/ui/src/canvas/` vs `src/app/ideation/canvas/` | Divergence over time |
| ContextMenu.css | Orphaned from deleted component | Maintenance confusion |

### Tight Coupling

- **ShawnderMind orchestrator ↔ SessionContext**: The orchestrator receives session state directly and modifies it through callbacks, creating bidirectional coupling.
- **Character nodes ↔ window bridge**: Character generator nodes use `window` properties for inter-component communication (e.g., `window.__updateNodeData`), bypassing React's data flow.
- **NEXT_PUBLIC_* API keys**: API keys are exposed client-side. While necessary for client-side AI calls, this means keys are visible in browser dev tools.

### Broken Features

- **ConceptLab presets**: Character/Weapon preset buttons reference non-existent node types (`multiViewer`, `editImage`). Evidence: `ConceptLabShell.tsx` preset definitions.
- **GeminiStudioShell layout system**: Not wired to named layout management. Evidence: Still uses deprecated `onSaveLayout` prop.

## 11. Open Questions / Ambiguous Areas

1. **Home page renders null**: `src/app/page.tsx` returns `null`. The actual content comes from `ClientShell` which renders the Sidebar + workspace. Is this intentional? The route `/` appears to show the Home component through workspace routing.

2. **StatusBar and NodeInspector**: These components exist in `src/app/ideation/canvas/` but are never imported. SPEC.md lists them as features. Are they planned for future use or abandoned?

3. **loadPack.ts prompts**: The prompt pack system (`src/lib/ideation/engine/prompts/loadPack.ts`) exports templates that are never imported. Individual stage prompt files are used instead. Is this a deprecated approach?

4. **Sprite Lab and Walter**: Both are registered in the tool registry but have no implementation in `src/app/`. Sprite Lab has proxy rewrites configured, suggesting external deployment. Walter is marked `electron-only`.

5. **Client-side API keys**: All API keys are `NEXT_PUBLIC_*`, making them visible in the browser. For a development/personal tool this may be acceptable, but for production deployment, a server-side proxy would be needed.

6. **Test coverage**: Zero test files exist. For a project with complex pipeline logic and AI integration, testing the orchestrator and data flow would reduce regression risk.

## 12. Appendix: Evidence Index

| Evidence ID | File | Lines | Description |
|-------------|------|-------|-------------|
| E1 | `package.json` | 1-30 | Dependencies and scripts |
| E2 | `src/lib/registry.ts` | 1-131 | Tool registry (6 tools) |
| E3 | `next.config.ts` | 1-30 | Rewrites for sub-tools |
| E4 | `src/app/layout.tsx` | 1-24 | Root layout with ClientShell |
| E5 | `src/app/page.tsx` | 1-4 | Home page (returns null) |
| E6 | `run.bat` | 1-51 | Windows launcher script |
| E7 | `.env.example` | 1-16 | Environment variable template |
| E8 | `packages/ui/src/index.ts` | 1-17 | UI package exports |
| E9 | `src/components/Sidebar.tsx` | 1-50 | Navigation sidebar |
| E10 | `src/lib/ideation/engine/orchestrator.ts` | 1-60 | Pipeline orchestrator imports |
| E11 | `src/app/ideation/canvas/nodes/nodeRegistry.ts` | 1-357 | Node type catalog |
| E12 | `src/app/concept-lab/ConceptLabShell.tsx` | 1-95 | ConceptLab node registration |
| E13 | `src/app/gemini-studio/GeminiStudioShell.tsx` | 1-75 | Gemini Studio node registration |
| E14 | `src/lib/layoutStore.ts` | Full | Named layout persistence |
| E15 | `src/components/GlobalToolbar.tsx` | Full | Unified toolbar with dropdowns |
| E16 | `src/components/CostWidget.tsx` | Full | API cost tracking widget |
| E17 | `src/lib/ideation/engine/provider/costTracker.ts` | Full | Cost tracking singleton |
| E18 | `src/app/ideation/canvas/nodes/character/index.ts` | Full | Character node barrel export |
| E19 | `src/app/api/character-save/route.ts` | Full | Character image save API |
| E20 | `src/app/api/open-folder/route.ts` | Full | Folder open API |
| E21 | `src/app/api/send-to-photoshop/route.ts` | Full | Photoshop integration API |

---

## Master Index

* Snapshot: `.repo_snapshot/repo_snapshot.md`
* Snapshot JSON: `.repo_snapshot/repo_snapshot.json`
* Health Report: `HEALTH_REPORT.md`
* Health Metrics: `.repo_snapshot/health_reports/health_metrics__20260306_161152.json`
* Tasks: `TASKS.md`
* Comprehensive Report: `.repo_snapshot/repo_comprehensive_report.md`
* Master Report: `MASTER_REPO_REPORT.md`
