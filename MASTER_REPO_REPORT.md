# Master Repo Report

| Field | Value |
|-------|-------|
| Project root | `D:\dev\Shawnderland_OKDO` |
| Generated at | 2026-03-06 08:07:57 |
| Includes | Snapshot + Health Audit + Comprehensive Repo Report + TASKS |
| Health | **Yellow** (report_id: 20260306_080757) |

---

## Repo Snapshot

# Repo Snapshot — Shawnderland OKDO

| Field | Value |
|-------|-------|
| Generated at | 2026-03-06 08:07:57 |
| Report ID | 20260306_080757 |
| Repo root | `D:\dev\Shawnderland_OKDO` |
| Git branch | main |
| Last commit | `b2ad2d6` — feat: add ConceptLab, Gemini Studio, home page redesign, and node resize (2026-03-05) |
| Total commits | 4 |

---

## Folder Tree (depth 4)

```
/
├── .cursor/rules/
├── packages/
│   └── ui/
│       └── src/
│           └── canvas/
├── src/
│   ├── app/
│   │   ├── concept-lab/
│   │   │   └── nodes/
│   │   ├── gemini-studio/
│   │   │   └── nodes/
│   │   ├── ideation/
│   │   │   ├── canvas/ (nodes/, compat/, hooks/, edges/)
│   │   │   ├── layout/
│   │   │   ├── stages/
│   │   │   └── views/
│   │   ├── tool-editor/
│   │   │   └── nodes/
│   │   └── ui-lab/
│   │       └── components/
│   ├── components/
│   │   └── nodes/ui/
│   ├── hooks/
│   └── lib/
│       ├── ideation/
│       │   ├── context/
│       │   ├── engine/ (provider/, conceptlab/, prompts/, diverge/, expand/, critique/, converge/, commit/, culture/, lineage/, eval/, security/)
│       │   └── state/
│       ├── styles/
│       ├── ui-lab/
│       └── workspace/
```

---

## Document Status

| Document | Status |
|----------|--------|
| PROJECT.md | Present |
| SPEC.md | Present |
| ARCHITECTURE.md | Present |
| DECISIONS.md | Present |
| TASKS.md | Present |
| README.md | **Missing** |
| AGENT_RULES.md | Present |
| HEALTH_REPORT.md | Present (prior) |

---

## Dependency Manifests

| Manifest | Path | Notes |
|----------|------|-------|
| package.json | `/package.json` | Next.js 15, React 19, @xyflow/react 12, zod 4 |
| package.json | `/packages/ui/package.json` | @shawnderland/ui local package |
| package-lock.json | `/package-lock.json` | Present |
| tsconfig.json | `/tsconfig.json` | Present |
| postcss.config.mjs | `/postcss.config.mjs` | Tailwind v4 PostCSS |
| next.config.ts | `/next.config.ts` | Next.js config |

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | ^15 | Framework (App Router) |
| react / react-dom | ^19 | UI library |
| @xyflow/react | ^12.10.1 | Node-based canvas |
| dagre | ^0.8.5 | Graph auto-layout |
| zod | ^4.3.6 | Schema validation |
| lucide-react | ^0.468 | Icons |
| clsx | ^2 | Conditional class names |
| tailwind-merge | ^3 | Tailwind class conflict resolution |
| tailwindcss | ^4 | CSS framework (dev) |
| typescript | ^5 | Type system (dev) |

---

## Entry Points

| Entry | Path | Purpose |
|-------|------|---------|
| Run script | `run.bat` | Bootstrap: check Node, install deps, clear port, start dev |
| npm dev | `npm run dev` | Next.js dev server |
| npm build | `npm run build` | Production build |
| npm start | `npm start` | Production server |
| App entry | `src/app/page.tsx` | Root page |
| App layout | `src/app/layout.tsx` | Root layout |

---

## Lines of Code by Language

| Extension | Files | LOC | Bytes |
|-----------|-------|-----|-------|
| .tsx | 132 | 20,585 | 733,249 |
| .css | 64 | 11,965 | 234,215 |
| .ts | 74 | 10,002 | 356,851 |
| .json | 4 | 2,038 | 70,105 |
| .md | 17 | 1,327 | 56,511 |
| **Total** | **291** | **45,917** | **1,450,931** |

---

## Subsystem Hints

| Subsystem | Path | Role |
|-----------|------|------|
| Hub Shell | `src/components/` | App shell, sidebar, workspace renderer, command palette |
| ShawnderMind | `src/app/ideation/` | 8-stage AI ideation pipeline canvas |
| AI ConceptLab | `src/app/concept-lab/` | Character/weapon design + turnaround views |
| Gemini Studio | `src/app/gemini-studio/` | Image/video generation studio |
| Tool Editor | `src/app/tool-editor/` | Visual tool designer with JSON export |
| AI UI Lab | `src/app/ui-lab/` | Game UI generation workspace |
| Engine | `src/lib/ideation/engine/` | Orchestrator, providers, prompts, eval |
| Session | `src/lib/ideation/context/` | Session state provider |
| Design System | `packages/ui/` | @shawnderland/ui shared components |
| Shared Hooks | `src/hooks/` | useCanvasSession |
| Shared Canvas | `src/components/` | GlobalToolbar, CanvasContextMenu, CanvasCommon |

---

## Duplication Signals

| Signal | Files | Notes |
|--------|-------|-------|
| Duplicate flowLayout.ts | `packages/ui/src/canvas/flowLayout.ts`, `src/app/ideation/canvas/flowLayout.ts` | Known; tracked in TASKS.md |
| ContextMenu.css orphan | `src/app/ideation/canvas/ContextMenu.css` | ContextMenu.tsx deleted; CSS still present, imported by shared components |
| Parallel state patterns | SessionContext (createContext), useToolEditorStore (syncExternalStore), useCanvasSession (hook) | Intentional per DECISIONS.md #007 |

---

## Config Hints

| Type | File/Variable | Notes |
|------|---------------|-------|
| Env file | `.env.local` | Not tracked; contains NEXT_PUBLIC_GEMINI_API_KEY |
| Env template | `.env.example` | Documents all env vars |
| Env vars | `NEXT_PUBLIC_GEMINI_API_KEY` | AI Studio API key |
| Env vars | `NEXT_PUBLIC_VERTEX_PROJECT` | Vertex AI project (optional) |
| Env vars | `NEXT_PUBLIC_VERTEX_LOCATION` | Vertex AI region (optional) |
| Env vars | `NEXT_PUBLIC_VERTEX_API_KEY` | Vertex AI key (optional) |
| Next.js config | `next.config.ts` | Proxy rewrites, security headers |
| PostCSS | `postcss.config.mjs` | Tailwind v4 plugin |
| TypeScript | `tsconfig.json` | Strict mode, path aliases |

---

## Git Churn

| Metric | Value |
|--------|-------|
| Branch | main |
| Total commits | 4 |
| Last commit | 2026-03-05 16:26:59 -0600 |
| Last commit hash | b2ad2d6 |
| Last commit message | feat: add ConceptLab, Gemini Studio, home page redesign, and node resize |
| Uncommitted changes | 13 files modified (staged/unstaged) |

### Commit History

| Hash | Message |
|------|---------|
| b2ad2d6 | feat: add ConceptLab, Gemini Studio, home page redesign, and node resize |
| 2b3e5c4 | feat: add Tool Editor, overhaul Ideation Canvas, establish RRGM governance |
| 5da7b51 | feat: scaffold Shawnderland OKDO hub with five AI tool integrations |
| c3d8510 | Initial commit |

### Uncommitted Modified Files

- src/app/ideation/canvas/FlowCanvas.tsx
- src/app/ideation/canvas/ToolDock.css
- src/app/ideation/canvas/ToolDock.tsx
- src/app/ideation/canvas/nodes/BaseNode.css
- src/app/ideation/canvas/nodes/BaseNode.tsx
- src/app/ideation/canvas/nodes/ExtractDataNode.tsx
- src/app/ideation/canvas/nodes/ImageOutputNode.tsx
- src/app/ideation/canvas/nodes/NormalizeNode.tsx
- src/app/ideation/canvas/nodes/SeedNode.tsx
- src/app/ideation/canvas/nodes/VideoOutputNode.tsx
- src/app/ideation/canvas/useFlowSession.ts
- src/lib/ideation/engine/orchestrator.ts
- src/lib/ideation/engine/provider/geminiProvider.ts

---

## Health Report

# HEALTH REPORT — Shawnderland OKDO

| Field | Value |
|-------|-------|
| Report ID | 20260306_080757 |
| Date | 2026-03-06 |
| Overall Health | **YELLOW** |
| Primary Issue Type | Doc Lag |

---

## Top 3 Risks

1. **Doc drift**: ARCHITECTURE.md references deleted `ContextMenu.tsx`; new shared components (`useCanvasSession`, `GlobalToolbar`, `CanvasContextMenu`, `PrepromptNode`, `PostPromptNode`) are not documented in any governance doc.
2. **Large files**: 5 files exceed 800 LOC — `stages.css` (1,495), `SessionContext.tsx` (1,060), `orchestrator.ts` (1,039), `DimensionPlanner.tsx` (937), `useFlowSession.ts` (818). These are complexity hotspots.
3. **Duplicate flowLayout.ts**: Two identical copies exist (`packages/ui/src/canvas/flowLayout.ts` and `src/app/ideation/canvas/flowLayout.ts`). Only the ideation copy is imported at runtime.

## Top 3 Recommended Actions

1. **Sync governance docs**: Update ARCHITECTURE.md, SPEC.md, PROJECT.md, and DECISIONS.md to reflect all uncommitted changes (PrepromptNode, PostPromptNode, useCanvasSession, GlobalToolbar, CanvasContextMenu, Gemini Studio tool).
2. **Consolidate flowLayout.ts**: Delete `src/app/ideation/canvas/flowLayout.ts` and import from `@shawnderland/ui` (already tracked in TASKS.md).
3. **Split large files**: Break up SessionContext.tsx and orchestrator.ts (already tracked in TASKS.md Later).

---

## RED TRIGGERS

| Check | Status | Evidence |
|-------|--------|----------|
| Secrets in source | **PASS** | No hardcoded API keys, tokens, or credentials found in .ts/.tsx/.js/.jsx files. `.env.local` is gitignored and not tracked. |
| Run entrypoint | **PASS** | `run.bat` exists and is documented in ARCHITECTURE.md. `npm run dev`/`build`/`start` scripts present. |
| Parallel systems | **PASS** | State management uses three intentionally distinct patterns (Context, syncExternalStore, hook) per DECISIONS.md #007. No duplicate routers, persistence layers, or engines. |
| Output dirs tracked in git | **PASS** | `git ls-files` returns no entries under `.repo_snapshot/`, `output/`, `dist/`, `build/`, or `.next/`. |

---

## YELLOW TRIGGERS

| Check | Status | Evidence |
|-------|--------|----------|
| Doc drift | **TRIGGERED** | ARCHITECTURE.md references deleted `ContextMenu.tsx`. New components (`useCanvasSession`, `GlobalToolbar`, `CanvasContextMenu`, `PrepromptNode`, `PostPromptNode`, Gemini Studio) undocumented. See Doc Drift section. |
| README accuracy | **NOTE** | No README.md exists; PROJECT.md serves as the primary documentation. PROJECT.md omits Gemini Studio tool and recent unification features. |
| Large files (>100 KB) | **PASS** | No text-like files exceed 100 KB. Largest is `package-lock.json` at 68 KB. |
| Output dirs not in .gitignore | **PASS** | `.repo_snapshot/`, `dist/`, `.next/`, `node_modules/` all covered in `.gitignore`. |
| Portability | **PASS** | All dependencies declared in `package.json`. `run.bat` bootstraps install and dev server. `.env.example` documents required vars. |
| Sustained growth >15% | **N/A** | No prior snapshot JSON exists to compare against. |

---

## Governance

| Document | Status | Notes |
|----------|--------|-------|
| PROJECT.md | Present | Missing Gemini Studio tool, Preprompt/PostPrompt nodes, unified canvas features |
| SPEC.md | Present | Missing Gemini Studio section, Preprompt/PostPrompt, shared useCanvasSession/GlobalToolbar/CanvasContextMenu |
| ARCHITECTURE.md | Present | References deleted ContextMenu.tsx; missing useCanvasSession, GlobalToolbar, CanvasContextMenu, Preprompt/PostPromptNode |
| DECISIONS.md | Present | Missing ADRs for unified canvas session, Preprompt/PostPrompt design |
| TASKS.md | Present | Current |
| README.md | **Missing** | PROJECT.md used instead |
| AGENT_RULES.md | Present | Current |

---

## Doc Drift

| Doc | Issue | Evidence |
|-----|-------|----------|
| ARCHITECTURE.md | References deleted file | Line 59: `ContextMenu.tsx/.css Right-click add/group/expand menu` — file `src/app/ideation/canvas/ContextMenu.tsx` was deleted and replaced by `src/components/CanvasContextMenu.tsx` |
| ARCHITECTURE.md | Missing new shared components | `src/hooks/useCanvasSession.ts`, `src/components/GlobalToolbar.tsx`, `src/components/CanvasContextMenu.tsx`, `src/components/CanvasCommon.css` not listed in project structure |
| ARCHITECTURE.md | Missing new node types | `PrepromptNode.tsx`, `PostPromptNode.tsx` not listed in the ideation/canvas/nodes section |
| ARCHITECTURE.md | Missing Gemini Studio | No `gemini-studio/` section in project structure |
| ARCHITECTURE.md | Missing Concept Lab standalone | `concept-lab/` directory not listed in project structure |
| SPEC.md | Missing Gemini Studio | No Gemini Studio section at all |
| SPEC.md | Missing Preprompt/PostPrompt | Not documented in ShawnderMind influence/modifier nodes |
| SPEC.md | Missing unified canvas features | `useCanvasSession`, `GlobalToolbar`, `CanvasContextMenu` not mentioned |
| PROJECT.md | Missing Gemini Studio | Not listed in Tools table or features |
| PROJECT.md | Missing Preprompt/PostPrompt | Not mentioned in ShawnderMind Features |
| PROJECT.md | Missing unified canvas | No mention of shared toolbar, context menu, or canvas session hook |
| DECISIONS.md | Missing unification ADR | No decision recorded for extracting `useCanvasSession` or unifying toolbar/context menu |
| DECISIONS.md | Missing Preprompt/PostPrompt ADR | No decision for prompt injection node design |

---

## Drift / Bloat

| Item | Type | Evidence |
|------|------|----------|
| Duplicate flowLayout.ts | Duplication | `packages/ui/src/canvas/flowLayout.ts` (canonical) and `src/app/ideation/canvas/flowLayout.ts` (duplicate). Tracked in TASKS.md Next. |
| Orphaned ContextMenu.css | Dead file | `src/app/ideation/canvas/ContextMenu.css` exists but `ContextMenu.tsx` was deleted. CSS is imported by `CanvasContextMenu.tsx` and `ImageContextMenu.tsx` for shared styles — may be intentional reuse. |

---

## Cleanup Candidates

| # | File / Item | Reason | Severity |
|---|-------------|--------|----------|
| 1 | `src/app/ideation/canvas/flowLayout.ts` | Duplicate of `packages/ui/src/canvas/flowLayout.ts` | Low |
| 2 | `src/app/ideation/canvas/ContextMenu.css` | Original component deleted; CSS may be shared — verify if styles should be merged into `CanvasCommon.css` or `CanvasContextMenu` styles | Low |
| 3 | 13 uncommitted modified files | Large batch of changes not yet committed | Medium |

---

## Growth & Trajectory

### Top 10 Biggest Files by LOC

| # | File | LOC | Bytes |
|---|------|-----|-------|
| 1 | package-lock.json | 1,961 | 68,142 |
| 2 | src/app/ideation/stages/stages.css | 1,495 | 27,041 |
| 3 | src/lib/ideation/context/SessionContext.tsx | 1,060 | 39,818 |
| 4 | src/lib/ideation/engine/orchestrator.ts | 1,039 | 34,977 |
| 5 | src/app/ui-lab/components/DimensionPlanner.tsx | 937 | 29,435 |
| 6 | src/app/ideation/canvas/useFlowSession.ts | 818 | 29,045 |
| 7 | src/app/ideation/canvas/FlowCanvas.tsx | 797 | 31,924 |
| 8 | src/app/ideation/canvas/ToolDock.tsx | 721 | 25,576 |
| 9 | src/hooks/useCanvasSession.ts | 605 | 23,478 |
| 10 | src/app/tool-editor/useToolEditorStore.ts | 580 | 18,173 |

### Prior Snapshot Comparison

No prior snapshot JSON exists. This is the baseline.

### Git Churn

4 total commits. 13 files currently modified (uncommitted). All modifications are in `src/app/ideation/` and `src/lib/ideation/engine/` — the ShawnderMind subsystem.

---

## Prompt & Template Surface

### Top 10 Largest Multi-line String Literals

| # | File | Length (chars) | Position |
|---|------|----------------|----------|
| 1 | src/app/ideation/canvas/FlowCanvas.tsx | 25,546 | 11 |
| 2 | src/lib/ideation/engine/orchestrator.ts | 24,648 | 9,208 |
| 3 | src/app/concept-lab/ConceptLabShell.tsx | 9,505 | 11 |
| 4 | src/lib/ideation/engine/provider/mockProvider.ts | 9,214 | 441 |
| 5 | src/app/concept-lab/nodes/WeapBaseNode.tsx | 9,210 | 11 |
| 6 | src/app/gemini-studio/GeminiStudioShell.tsx | 8,534 | 11 |
| 7 | src/app/concept-lab/nodes/CharIdentityNode.tsx | 8,374 | 11 |
| 8 | src/app/ideation/canvas/ToolDock.tsx | 7,819 | 11 |
| 9 | src/app/gemini-studio/nodes/ImageGenNode.tsx | 7,407 | 11 |
| 10 | src/lib/ideation/engine/generationLog.ts | 5,633 | 6,572 |

Note: Position 11 entries are typically JSX template literals (full component JSX). The orchestrator.ts entry at position 9,208 contains actual AI prompt template strings.

### Near-Duplicate Prompts

Not assessed — insufficient tooling for similarity comparison in this environment.

### Template Governance

No `src/templates.py` exists. Prompt templates are distributed across `src/lib/ideation/engine/` subdirectories.

---

## Health Scoring

| Category | Result |
|----------|--------|
| RED triggers | 0 fired |
| YELLOW triggers | 1 fired (Doc drift) |
| Overall | **YELLOW** |
| Primary issue type | **Doc Lag** |

---

## Proposed Cleanup Plan

1. **[Priority: High]** Sync all governance docs (PROJECT.md, SPEC.md, ARCHITECTURE.md, DECISIONS.md) with current implementation state — add Gemini Studio, PrepromptNode, PostPromptNode, useCanvasSession, GlobalToolbar, CanvasContextMenu; remove reference to deleted ContextMenu.tsx.
2. **[Priority: Medium]** Commit the 13 modified files with a descriptive commit message.
3. **[Priority: Low]** Consolidate duplicate `flowLayout.ts` — import from `@shawnderland/ui` everywhere.
4. **[Priority: Low]** Evaluate whether `ContextMenu.css` should be merged into `CanvasCommon.css` or left as a shared stylesheet.
5. **[Priority: Low]** Split `SessionContext.tsx` (1,060 LOC) and `orchestrator.ts` (1,039 LOC) into smaller modules.

---

## Metrics

| Metric | Value |
|--------|-------|
| Total files (text-like) | 291 |
| Total LOC | 45,917 |
| Total bytes | 1,450,931 |
| TypeScript files (.ts/.tsx) | 206 |
| CSS files | 64 |
| Test files | 0 |
| Build status | Clean (tsc --noEmit passes) |
| Lint status | Clean |
| TODO/FIXME/HACK comments | 0 |
| Secrets status | Clean |
| Portability status | Pass |
| Entrypoint status | Pass |

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

- [ ] Sync ARCHITECTURE.md: remove deleted ContextMenu.tsx reference, add useCanvasSession, GlobalToolbar, CanvasContextMenu, PrepromptNode, PostPromptNode, Gemini Studio, Concept Lab standalone structure
- [ ] Sync SPEC.md: add Gemini Studio section, Preprompt/PostPrompt nodes, unified canvas features (useCanvasSession, GlobalToolbar, CanvasContextMenu)
- [ ] Sync PROJECT.md: add Gemini Studio tool, Preprompt/PostPrompt features, unified canvas features
- [ ] Sync DECISIONS.md: add ADR for useCanvasSession extraction and unified toolbar/context menu, ADR for Preprompt/PostPrompt prompt injection design
- [ ] Evaluate ContextMenu.css: merge shared styles into CanvasCommon.css or keep as shared stylesheet
- [ ] Consolidate duplicate flowLayout.ts (use @shawnderland/ui copy)
- [x] Health audit report generated (report_id: 20260306_080757)

---

## Comprehensive Repo Report

# Comprehensive Repo Report — Shawnderland OKDO

---

## 1. Metadata

| Field | Value |
|-------|-------|
| Timestamp | 2026-03-06 08:07:57 |
| Repo root | `D:\dev\Shawnderland_OKDO` |
| Git branch | main |
| Last commit | `b2ad2d6` (2026-03-05) |
| Uncommitted changes | 13 files modified |
| Scan scope | All text-like files, excluding `node_modules/`, `.next/`, `.git/`, `dist/`, `build/` |
| Report ID | 20260306_080757 |

---

## 2. Executive Summary

1. **Shawnderland OKDO is a Next.js 15 hub application** that unifies six AI creative tools under a single interface with sidebar navigation, workspace keep-alive, and command palette. *(Evidence: `src/app/layout.tsx:6-8`, `src/components/ClientShell.tsx`, `src/lib/registry.ts`)*

2. **The codebase contains 45,917 lines of code** across 291 text-like files (132 .tsx, 74 .ts, 64 .css), with a total size of ~1.4 MB. *(Evidence: LOC scan)*

3. **ShawnderMind is the largest subsystem** (~15,000+ LOC across `src/app/ideation/` and `src/lib/ideation/`), implementing an 8-stage AI ideation pipeline with 56 node files, a full orchestrator, session persistence, and Gemini provider integration. *(Evidence: `src/app/ideation/canvas/nodes/` — 56 files)*

4. **Four canvas-based tools share `@xyflow/react`**: ShawnderMind, AI ConceptLab, Gemini Studio, and Tool Editor. A shared `useCanvasSession` hook and unified `GlobalToolbar`/`CanvasContextMenu` components provide consistent canvas behavior. *(Evidence: `src/hooks/useCanvasSession.ts`, `src/components/GlobalToolbar.tsx`, `src/components/CanvasContextMenu.tsx`)*

5. **All Google AI API calls route through a centralized dual-backend config** (`apiConfig.ts`) supporting AI Studio and Vertex AI, with automatic backend selection based on environment variables. *(Evidence: `src/lib/ideation/engine/apiConfig.ts:26-53`)*

6. **Governance is maintained via 6 markdown documents** (PROJECT, SPEC, ARCHITECTURE, DECISIONS, TASKS, AGENT_RULES) following a Repo-Resident Governance Model (RRGM). *(Evidence: `AGENT_RULES.md:10-11`)*

7. **Health status is YELLOW** due to documentation drift: ARCHITECTURE.md references a deleted file (`ContextMenu.tsx`), and several new components added during the latest development session are not yet reflected in governance docs. *(Evidence: HEALTH_REPORT.md)*

8. **Five files exceed 800 LOC**, presenting complexity hotspots: `stages.css` (1,495), `SessionContext.tsx` (1,060), `orchestrator.ts` (1,039), `DimensionPlanner.tsx` (937), `useFlowSession.ts` (818). *(Evidence: file size scan)*

9. **Zero test files exist**. Testing is currently manual only. *(Evidence: file scan — no `*.test.*`, `*.spec.*`, or `__tests__/` directories found)*

10. **The project has 4 total git commits** and 13 uncommitted modified files, indicating active development with infrequent commits. *(Evidence: `git log`, `git status`)*

11. **No hardcoded secrets** were found in source code. API keys are managed via `.env.local` (gitignored) with a documented `.env.example`. *(Evidence: secrets scan, `.gitignore`)*

---

## 3. What This Repo Is

| Attribute | Value | Evidence |
|-----------|-------|----------|
| Type | Monorepo hub application | `package.json`, `packages/ui/`, `src/app/` |
| Primary language | TypeScript (React) | 206 .ts/.tsx files |
| Framework | Next.js 15 (App Router) | `package.json:15`, `src/app/layout.tsx` |
| UI library | React 19 | `package.json:17` |
| Canvas library | @xyflow/react 12 | `package.json:12` |
| Styling | Tailwind CSS v4 + CSS custom properties | `postcss.config.mjs`, 64 CSS files |
| Validation | Zod 4 | `package.json:20` |
| Runtime | Node.js (dev server via `npm run dev`) | `run.bat`, `package.json:6` |
| OS target | Windows (run.bat), cross-platform (npm scripts) | `run.bat` |

---

## 4. How to Run

### Prerequisites

- Node.js 18+ installed and in PATH
- Git (for cloning)

### Quick Start (Windows)

```bat
git clone <repo-url>
cd Shawnderland_OKDO
copy .env.example .env.local
:: Edit .env.local — add NEXT_PUBLIC_GEMINI_API_KEY from https://aistudio.google.com/apikey
run.bat
```

*(Evidence: `run.bat:1-50` — checks Node.js, runs `npm install`, clears port 3000, starts dev server, opens browser)*

### Quick Start (Cross-platform)

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your API key
npm run dev
# Open http://localhost:3000
```

*(Evidence: `package.json:5-9` — scripts: dev, build, start, lint)*

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_GEMINI_API_KEY` | Yes (AI Studio) | Google AI Studio API key |
| `NEXT_PUBLIC_VERTEX_PROJECT` | No (Vertex AI) | GCP project ID |
| `NEXT_PUBLIC_VERTEX_LOCATION` | No (Vertex AI) | GCP region |
| `NEXT_PUBLIC_VERTEX_API_KEY` | No (Vertex AI) | Vertex AI API key |

*(Evidence: `.env.example`, `src/lib/ideation/engine/apiConfig.ts:5-12`)*

---

## 5. Feature Inventory

### Hub Features

| Feature | Module/Files | Evidence |
|---------|--------------|----------|
| Sidebar navigation | `src/components/Sidebar.tsx` | Tool list with icons, collapse toggle |
| Command palette (Ctrl+K) | `src/components/CommandPalette.tsx` | `ClientShell.tsx:18-28` |
| Workspace keep-alive | `src/components/WorkspaceRenderer.tsx`, `src/lib/workspace/WorkspaceContext.tsx` | Visited panels stay mounted (`display:none` when inactive) — `WorkspaceRenderer.tsx:133-134` |
| Home page | `src/components/HomePage.tsx`, `src/components/HubCanvas.tsx` | Node-canvas home screen |
| Tool registry | `src/lib/registry.ts` | 6 tools registered with metadata |
| Proxy routing | `next.config.ts:10-28` | Rewrites to tool backends |

### ShawnderMind Features

| Feature | Module/Files | Evidence |
|---------|--------------|----------|
| 8-stage pipeline | `src/lib/ideation/engine/stages.ts:1-10` | Seed → Normalize → Diverge → Critique/Salvage → Expand → Converge → Commit → Iterate |
| Pipeline orchestrator | `src/lib/ideation/engine/orchestrator.ts` | 1,039 LOC — prompt assembly, stage sequencing, influence merging |
| Interactive + Automated modes | `src/app/ideation/canvas/nodes/StartNode.tsx` | Mode buttons on StartNode |
| PackedPipelineNode | `src/app/ideation/canvas/nodes/PackedPipelineNode.tsx` | Collapsed full-pipeline view |
| Group/Pack nodes | `src/app/ideation/canvas/nodes/GroupNode.tsx` | Dynamic output handles, expand/collapse |
| Thinking Tiers | `src/lib/ideation/engine/provider/geminiProvider.ts:12-26` | Quick (flash-lite), Standard (flash), Deep (flash-thinking-exp) |
| Influence nodes (7 types) | `src/app/ideation/canvas/nodes/{Text,Document,Image,Link,Video}InfluenceNode.tsx`, `EmotionNode.tsx`, `InfluenceNode.tsx` | Free-text, document, image, link, video, emotion, persona |
| Preprompt/PostPrompt nodes | `src/app/ideation/canvas/nodes/PrepromptNode.tsx`, `PostPromptNode.tsx` | Prompt injection before/after content |
| Node compatibility validation | `src/app/ideation/canvas/compat/withCompatCheck.tsx`, `src/lib/ideation/engine/nodeCompatibility.ts` | HOC-based error banners |
| Session persistence | `src/lib/ideation/state/sessionStore.ts`, `src/app/ideation/canvas/useFlowSession.ts` | Named sessions in localStorage |
| ToolDock with search | `src/app/ideation/canvas/ToolDock.tsx` | Categorized node templates with filter |
| Output nodes | `TextOutputNode.tsx`, `ImageOutputNode.tsx`, `VideoOutputNode.tsx` | Text, image, and video display |
| Extract Data node | `ExtractDataNode.tsx` | Data extraction utility |
| Result node | `ResultNode.tsx` | Final result display (14,640 bytes — largest node) |

### AI ConceptLab Features

| Feature | Module/Files | Evidence |
|---------|--------------|----------|
| Character design node | `src/app/concept-lab/nodes/CharIdentityNode.tsx`, `CharAttributesNode.tsx` | Identity + 14 attribute categories |
| Weapon design node | `src/app/concept-lab/nodes/WeapBaseNode.tsx`, `WeapComponentsNode.tsx` | 8 component fields |
| Multi-viewer node | `src/app/concept-lab/nodes/MultiViewerNode.tsx` | Multi-view turnaround sheets |
| Image editing node | `src/app/concept-lab/nodes/EditImageNode.tsx` | Image editing capabilities |
| ConceptLab shell | `src/app/concept-lab/ConceptLabShell.tsx` | Canvas wrapper with dock |
| Character prompts | `src/lib/ideation/engine/conceptlab/characterPrompts.ts` | Attribute definitions + prompt builders |
| Weapon prompts | `src/lib/ideation/engine/conceptlab/weaponPrompts.ts` | Component definitions + prompt builders |
| Image generation API | `src/lib/ideation/engine/conceptlab/imageGenApi.ts` | Imagen 4 + Gemini helpers |

### Gemini Studio Features

| Feature | Module/Files | Evidence |
|---------|--------------|----------|
| Image generation node | `src/app/gemini-studio/nodes/ImageGenNode.tsx` | Multi-model image generation |
| Video generation node | `src/app/gemini-studio/nodes/VideoGenNode.tsx` | Veo-based video generation |
| Prompt node | `src/app/gemini-studio/nodes/PromptNode.tsx` | Text prompt input |
| Image reference node | `src/app/gemini-studio/nodes/ImageRefNode.tsx` | Image reference input |
| Output viewer node | `src/app/gemini-studio/nodes/OutputViewerNode.tsx` | Result display |
| Studio shell | `src/app/gemini-studio/GeminiStudioShell.tsx` | Canvas with unified toolbar |
| Studio dock | `src/app/gemini-studio/GeminiStudioDock.tsx` | Node template panel |

### Tool Editor Features

| Feature | Module/Files | Evidence |
|---------|--------------|----------|
| 6 element types | `src/app/tool-editor/nodes/{GenericNode,WindowNode,FrameNode,ButtonNode,TextBoxNode,DropdownNode}.tsx` | Node components |
| Property panel | `src/app/tool-editor/PropertyPanel.tsx` | Edit selected element |
| Export dialog | `src/app/tool-editor/ExportDialog.tsx` | Export All / Export Selected |
| Save/Import | `src/app/tool-editor/SaveDialog.tsx`, `ImportDialog.tsx` | localStorage + file upload |
| Undo/Redo store | `src/app/tool-editor/useToolEditorStore.ts` | Singleton external store (580 LOC) |
| Grid snapping | `src/app/tool-editor/ToolEditorCanvas.tsx` | Configurable 5px–100px |

### AI UI Lab Features

| Feature | Module/Files | Evidence |
|---------|--------------|----------|
| Generate panel | `src/app/ui-lab/components/GeneratePanel.tsx` | UI asset generation |
| Extract spec/style | `src/app/ui-lab/components/ExtractSpecPanel.tsx`, `ExtractStylePanel.tsx` | Style extraction from images |
| Remove UI panel | `src/app/ui-lab/components/RemoveUIPanel.tsx` | Overlay removal |
| Dimension planner | `src/app/ui-lab/components/DimensionPlanner.tsx` | Layout planning (937 LOC) |

### Shared Canvas Features

| Feature | Module/Files | Evidence |
|---------|--------------|----------|
| Canvas session hook | `src/hooks/useCanvasSession.ts` | Undo/redo, edge-cutting, grouping, clipboard, pin, export/save/import |
| Global toolbar | `src/components/GlobalToolbar.tsx` | Unified top bar across all canvas apps |
| Canvas context menu | `src/components/CanvasContextMenu.tsx` | Unified right-click menu |
| Design system | `packages/ui/src/` | BaseNode, PipelineEdge, Button, Card, Input, Select, Textarea |

---

## 6. Architecture Overview

### Component Diagram

```
┌────────────────────────────────────────────────────────────┐
│                    Next.js App Router                       │
│  ┌──────────┐  ┌────────────────┐  ┌───────────────────┐  │
│  │ layout   │  │  ClientShell   │  │  WorkspaceRenderer │  │
│  │ (root)   │──│  (sidebar,     │──│  (keep-alive       │  │
│  │          │  │   palette)     │  │   route resolver)  │  │
│  └──────────┘  └────────────────┘  └─────────┬─────────┘  │
│                                               │            │
│  ┌────────────────────────────────────────────┼─────────┐  │
│  │                 Tool Shells                │         │  │
│  │  ┌──────────┐ ┌────────────┐ ┌───────────┐│         │  │
│  │  │Shawnder- │ │ Concept    │ │ Gemini    ││ ...     │  │
│  │  │Mind      │ │ Lab        │ │ Studio    ││         │  │
│  │  │(Session- │ │(useCanvas- │ │(useCanvas-││         │  │
│  │  │ Provider)│ │ Session)   │ │ Session)  ││         │  │
│  │  └────┬─────┘ └─────┬──────┘ └─────┬─────┘│         │  │
│  │       │              │              │      │         │  │
│  │  ┌────┴──────────────┴──────────────┴──────┤         │  │
│  │  │          @xyflow/react Canvas            │         │  │
│  │  │  ┌──────────────────────────────────┐   │         │  │
│  │  │  │  GlobalToolbar + CanvasContextMenu│   │         │  │
│  │  │  └──────────────────────────────────┘   │         │  │
│  │  └─────────────────────────────────────────┘         │  │
│  │                                                      │  │
│  │  ┌────────────┐  ┌─────────────┐                     │  │
│  │  │ Tool Editor│  │  AI UI Lab  │                     │  │
│  │  │ (Zustand   │  │  (UILab-    │                     │  │
│  │  │  Store)    │  │   Provider) │                     │  │
│  │  └────────────┘  └─────────────┘                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Engine Layer                        │  │
│  │  apiConfig.ts ─── geminiProvider.ts ─── orchestrator │  │
│  │                                          .ts         │  │
│  │  stages.ts, schemas.ts, prompts/, diverge/, expand/, │  │
│  │  critique/, converge/, commit/, culture/, security/  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌────────────────────────┐  ┌─────────────────────────┐  │
│  │  @shawnderland/ui      │  │  next.config.ts         │  │
│  │  (BaseNode, Pipeline-  │  │  (proxy rewrites to     │  │
│  │   Edge, tokens, etc.)  │  │   tool backends)        │  │
│  └────────────────────────┘  └─────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User navigates** via sidebar or command palette → `WorkspaceContext` updates `activePath`
2. **WorkspaceRenderer** resolves route, lazily mounts tool shell, keeps inactive panels alive
3. **Canvas tools** use `@xyflow/react` with `useCanvasSession` (or `useFlowSession` / Zustand store) for state
4. **AI interactions** flow through: Node UI → Session/Context → Orchestrator → Gemini Provider → `apiConfig.ts` → Google AI API
5. **Results** flow back through provider → orchestrator → session state → node UI re-render

### Key Abstractions

| Abstraction | Purpose | Location |
|-------------|---------|----------|
| `ToolRegistryEntry` | Tool metadata (name, icon, routes, features) | `src/lib/registry.ts` |
| `useCanvasSession` | Shared canvas state management | `src/hooks/useCanvasSession.ts` |
| `useFlowSession` | ShawnderMind-specific canvas state | `src/app/ideation/canvas/useFlowSession.ts` |
| `SessionContext` | ShawnderMind session + pipeline execution | `src/lib/ideation/context/SessionContext.tsx` |
| `Provider` interface | Abstraction over AI model backends | `src/lib/ideation/engine/provider/types.ts` |
| `withCompatCheck` | HOC for node connection validation | `src/app/ideation/canvas/compat/withCompatCheck.tsx` |
| `GlobalToolbar` | Shared top toolbar component | `src/components/GlobalToolbar.tsx` |
| `CanvasContextMenu` | Shared right-click context menu | `src/components/CanvasContextMenu.tsx` |

---

## 7. Module Deep Dive

### 7.1 Hub Shell (`src/components/`)

**Purpose**: Application chrome — sidebar, workspace renderer, command palette, home page.

**Key Files**:
- `ClientShell.tsx` (45 LOC) — Root client component wrapping WorkspaceProvider, Sidebar, CommandPalette
- `WorkspaceRenderer.tsx` (143 LOC) — Route resolver with keep-alive pattern
- `Sidebar.tsx` — Navigation with tool list and collapse
- `CommandPalette.tsx` — Ctrl+K fuzzy search across tools
- `HubCanvas.tsx` / `ToolNode.tsx` — Home screen ReactFlow canvas
- `GlobalToolbar.tsx` (114 LOC) — Shared toolbar for all canvas apps
- `CanvasContextMenu.tsx` (283 LOC) — Shared context menu for all canvas apps

**Interactions**: ClientShell wraps all content. WorkspaceRenderer lazily imports tool shells via `next/dynamic`. All tools render inside the workspace panel system.

### 7.2 ShawnderMind — Ideation Canvas (`src/app/ideation/`)

**Purpose**: 8-stage AI ideation pipeline with interactive node-based canvas.

**Key Files**:
- `canvas/FlowCanvas.tsx` (797 LOC) — Main ReactFlow canvas with 28 node types registered
- `canvas/useFlowSession.ts` (818 LOC) — Flow state: nodes, edges, groups, undo/redo, sessions
- `canvas/ToolDock.tsx` (721 LOC) — Left panel with categorized node templates and search
- `canvas/nodes/nodeRegistry.ts` (16,988 bytes) — Node type definitions, metadata, validation rules
- `canvas/nodes/` — 56 node component files
- `layout/Shell.tsx` — Ideation shell layout wrapper
- `stages/` — Stage-specific UI components

**Interactions**: SessionProvider wraps IdeationShell. FlowCanvas uses useFlowSession for state and renders all node types. Orchestrator processes pipeline stages via the Gemini provider.

### 7.3 AI Engine (`src/lib/ideation/engine/`)

**Purpose**: Pipeline orchestration, AI provider abstraction, prompt engineering, evaluation.

**Key Files**:
- `orchestrator.ts` (1,039 LOC) — Stage sequencing, prompt assembly, influence merging, preprompt/postprompt injection
- `apiConfig.ts` (113 LOC) — Dual-backend URL builder (AI Studio / Vertex AI)
- `provider/geminiProvider.ts` (~170 LOC) — Gemini API client with tier-based model selection
- `provider/mockProvider.ts` (494 LOC) — Mock provider for testing
- `stages.ts` (43 LOC) — Stage ID definitions and ordering
- `schemas.ts` — Zod schemas for structured LLM outputs
- `conceptlab/` — Character/weapon prompt builders and image generation API
- `prompts/`, `diverge/`, `expand/`, `critique/`, `converge/`, `commit/` — Stage-specific prompt logic
- `culture/` — Cross-cultural prompt instructions
- `security/` — Input sanitization and prompt guards
- `eval/` — Smoke tests and evaluation metrics

**Interactions**: Orchestrator consumes Provider interface and Stage definitions. SessionContext calls orchestrator for pipeline execution. apiConfig.ts is imported by all AI-calling code.

### 7.4 Session Management (`src/lib/ideation/context/`, `src/lib/ideation/state/`)

**Purpose**: Session state provider for ShawnderMind — settings, pipeline state, execution coordination.

**Key Files**:
- `context/SessionContext.tsx` (1,060 LOC) — React Context with full pipeline execution logic
- `state/sessionTypes.ts` — Session, ThinkingTier, SessionSettings types
- `state/sessionStore.ts` — localStorage persistence
- `state/sessionSelectors.ts` — Data selectors

**Interactions**: SessionProvider wraps IdeationShell. Consumed by FlowCanvas, StartNode, and other pipeline nodes. Calls orchestrator for stage execution.

### 7.5 AI ConceptLab (`src/app/concept-lab/`)

**Purpose**: Character and weapon design with AI image generation.

**Key Files**:
- `ConceptLabShell.tsx` (495 LOC) — Canvas shell with useCanvasSession integration
- `ConceptLabDock.tsx` — Node template dock
- `nodes/CharIdentityNode.tsx` (8,374 bytes) — Character identity fields
- `nodes/CharAttributesNode.tsx` — Character attribute panel
- `nodes/WeapBaseNode.tsx` (9,210 bytes) — Weapon base design
- `nodes/WeapComponentsNode.tsx` — Weapon component fields
- `nodes/MultiViewerNode.tsx` — Multi-view turnaround
- `nodes/EditImageNode.tsx` — Image editing

**Interactions**: Uses useCanvasSession for canvas state. Calls imageGenApi.ts for Imagen 4 / Gemini generation. Character/weapon prompts built via characterPrompts.ts and weaponPrompts.ts.

### 7.6 Gemini Studio (`src/app/gemini-studio/`)

**Purpose**: Consumer-friendly AI media generation with multiple Google AI models.

**Key Files**:
- `GeminiStudioShell.tsx` (479 LOC) — Canvas shell with useCanvasSession
- `GeminiStudioDock.tsx` — Node template dock
- `nodes/ImageGenNode.tsx` (7,407 bytes) — Multi-model image generation
- `nodes/VideoGenNode.tsx` — Veo-based video generation
- `nodes/PromptNode.tsx` — Text prompt input
- `nodes/ImageRefNode.tsx` — Image reference input
- `nodes/OutputViewerNode.tsx` — Result display

**Interactions**: Uses useCanvasSession. Calls apiConfig.ts for model URLs. Supports Imagen 4, Gemini 3 Pro, Gemini Flash Image, and Veo models.

### 7.7 Tool Editor (`src/app/tool-editor/`)

**Purpose**: Visual meta-tool for designing other tools with exportable AI-readable specs.

**Key Files**:
- `ToolEditorShell.tsx` — Shell with GlobalToolbar
- `ToolEditorCanvas.tsx` — ReactFlow canvas with grid snapping and edge-cutting
- `useToolEditorStore.ts` (580 LOC) — Singleton Zustand-style store
- `EditorToolDock.tsx` — Draggable element templates
- `PropertyPanel.tsx` — Element property editor
- `ExportDialog.tsx`, `SaveDialog.tsx`, `ImportDialog.tsx` — Dialogs
- `nodes/` — 7 element type components

**Interactions**: Uses its own singleton store (not useCanvasSession) per DECISIONS.md #007. GlobalToolbar maps to store actions. CanvasContextMenu integrated for right-click.

### 7.8 AI UI Lab (`src/app/ui-lab/`)

**Purpose**: Game UI generation, style extraction, layout planning.

**Key Files**:
- `UILabShell.tsx` — Shell with tabbed panels
- `components/GeneratePanel.tsx` — UI asset generation
- `components/DimensionPlanner.tsx` (937 LOC) — Layout planning tool
- `components/ExtractSpecPanel.tsx`, `ExtractStylePanel.tsx` — Style extraction
- `components/RemoveUIPanel.tsx` — UI overlay removal

**Interactions**: Wrapped in UILabProvider (React Context). Uses lib/ui-lab/api.ts for backend calls.

### 7.9 Design System (`packages/ui/`)

**Purpose**: Shared UI components under `@shawnderland/ui` namespace.

**Key Files**:
- `src/Button.tsx`, `Card.tsx`, `Input.tsx`, `Select.tsx`, `Textarea.tsx`, `PanelSection.tsx` — UI primitives
- `src/canvas/BaseNode.tsx` — Shared base node component
- `src/canvas/PipelineEdge.tsx` — Custom edge rendering
- `src/canvas/flowLayout.ts` — Dagre auto-layout helper
- `src/tokens.css`, `base.css`, `animations.css` — Design tokens and base styles

**Interactions**: Consumed by all app modules via tsconfig path alias `@shawnderland/ui`. Transpiled by Next.js via `transpilePackages` in `next.config.ts`.

### 7.10 Shared Hooks (`src/hooks/`)

**Purpose**: Cross-cutting React hooks shared by multiple canvas applications.

**Key Files**:
- `useCanvasSession.ts` (605 LOC) — Provides undo/redo, edge-cutting, node grouping, clipboard, pin/freeze, export/save/import, keyboard shortcuts

**Interactions**: Consumed by Gemini Studio and Concept Lab shells. ShawnderMind uses its own useFlowSession (which implements similar features). Tool Editor uses its Zustand store.

---

## 8. External Dependencies & Integrations

### Runtime Dependencies

| Package | Version | Purpose | Evidence |
|---------|---------|---------|----------|
| next | ^15 | App Router framework | `package.json:15` |
| react / react-dom | ^19 | UI library | `package.json:17-18` |
| @xyflow/react | ^12.10.1 | Node-based canvas library | `package.json:12` |
| dagre | ^0.8.5 | Graph auto-layout | `package.json:14` |
| lucide-react | ^0.468 | Icon library | `package.json:15` |
| zod | ^4.3.6 | Runtime schema validation | `package.json:20` |
| clsx | ^2 | Conditional CSS class names | `package.json:13` |
| tailwind-merge | ^3 | Tailwind class conflict resolution | `package.json:19` |

### Dev Dependencies

| Package | Version | Purpose | Evidence |
|---------|---------|---------|----------|
| tailwindcss | ^4 | CSS framework | `package.json:29` |
| @tailwindcss/postcss | ^4 | PostCSS plugin | `package.json:23` |
| postcss | ^8 | CSS processing | `package.json:28` |
| typescript | ^5 | Type system | `package.json:30` |
| @types/dagre | ^0.7.54 | Dagre type definitions | `package.json:24` |
| @types/node | ^22 | Node.js type definitions | `package.json:25` |
| @types/react | ^19 | React type definitions | `package.json:26` |
| @types/react-dom | ^19 | React DOM type definitions | `package.json:27` |

### External API Integrations

| Service | Models | Purpose | Evidence |
|---------|--------|---------|----------|
| Google AI Studio | Gemini 2.0 Flash, Flash Lite, Flash Thinking Exp | Text generation, ideation pipeline | `geminiProvider.ts:12-26` |
| Google AI Studio | Imagen 4 (imagen-4.0-generate-001) | Image generation | `imageGenApi.ts` |
| Google AI Studio | Gemini 3 Pro Image Preview | High-fidelity reference-based images | `modelCatalog.ts` |
| Google AI Studio | Gemini 2.0 Flash Preview Image | Fast iteration images | `modelCatalog.ts` |
| Google Vertex AI | Same models via regional endpoints | Enterprise/regional deployments | `apiConfig.ts:77-81` |

---

## 9. Configuration Surface

### File Types

| Type | File | Purpose |
|------|------|---------|
| Next.js config | `next.config.ts` | Proxy rewrites, transpile packages |
| TypeScript | `tsconfig.json` | Strict mode, path aliases (@/, @shawnderland/ui) |
| PostCSS | `postcss.config.mjs` | Tailwind v4 plugin |
| Environment | `.env.local` | Runtime secrets (gitignored) |
| Environment template | `.env.example` | Variable documentation |
| Git | `.gitignore`, `.gitattributes` | Ignore patterns, line ending rules |

### Environment Variable Names

| Variable | Required | Scope |
|----------|----------|-------|
| `NEXT_PUBLIC_GEMINI_API_KEY` | Yes (AI Studio) | Client-side, all AI calls |
| `NEXT_PUBLIC_VERTEX_PROJECT` | No (Vertex AI) | Client-side, Vertex endpoints |
| `NEXT_PUBLIC_VERTEX_LOCATION` | No (Vertex AI) | Client-side, Vertex endpoints |
| `NEXT_PUBLIC_VERTEX_API_KEY` | No (Vertex AI) | Client-side, Vertex endpoints |
| `SPRITE_LAB_URL` | No | Server-side, proxy rewrite override |
| `SHAWNDERMIND_URL` | No | Server-side, proxy rewrite override |
| `UI_LAB_URL` | No | Server-side, proxy rewrite override |
| `CONCEPT_LAB_URL` | No | Server-side, proxy rewrite override |

---

## 10. Risks / Complexity Hotspots

### Large Modules

| File | LOC | Risk |
|------|-----|------|
| `stages.css` | 1,495 | CSS maintenance burden — single file for all stage styling |
| `SessionContext.tsx` | 1,060 | God-context pattern — session state + pipeline execution + UI coordination |
| `orchestrator.ts` | 1,039 | Complex prompt assembly — many code paths for different stage types |
| `DimensionPlanner.tsx` | 937 | Large single component — layout planning logic |
| `useFlowSession.ts` | 818 | Complex state management — overlaps with useCanvasSession |

### Duplication

| Signal | Files | Impact |
|--------|-------|--------|
| `flowLayout.ts` duplicate | `packages/ui/src/canvas/flowLayout.ts` ↔ `src/app/ideation/canvas/flowLayout.ts` | Maintenance risk — changes must be made in both |
| `useFlowSession` vs `useCanvasSession` | `src/app/ideation/canvas/useFlowSession.ts` ↔ `src/hooks/useCanvasSession.ts` | Functional overlap for common canvas features; ShawnderMind has not migrated to shared hook |

### Tight Coupling

| Area | Evidence | Impact |
|------|----------|--------|
| Client-side API keys | `NEXT_PUBLIC_*` prefix exposes keys to browser | Security concern — keys visible in client bundle |
| Window globals | `__spawnPackedPipeline`, `__getFlowSnapshot`, `__triggerGroupExpand` in ShawnderMind | Cross-component communication via window — fragile, untypeable |
| No tests | 0 test files | Any refactoring carries regression risk |

### Documentation Debt

13 doc drift items identified — governance docs do not reflect the current state of the codebase for recent additions (Gemini Studio, PrepromptNode, PostPromptNode, unified canvas features).

---

## 11. Open Questions / Ambiguous Areas

1. **Should ShawnderMind migrate to `useCanvasSession`?** Currently it uses its own `useFlowSession` with similar but extended functionality. The shared hook exists but ShawnderMind hasn't adopted it, creating functional overlap.

2. **What is the status of `ContextMenu.css`?** The original component (`ContextMenu.tsx`) was deleted and replaced by `CanvasContextMenu.tsx`, but the CSS file remains and is imported by the new component. Should these styles be merged into `CanvasCommon.css`?

3. **Are proxy rewrites actually used?** `next.config.ts` defines rewrites to localhost backends, but all AI calls appear to go directly to Google APIs via `apiConfig.ts` from the client. The proxy routes may be vestigial for future backend tools.

4. **Why are API keys `NEXT_PUBLIC_`?** This exposes keys in the client bundle. For production, these should be server-side API routes that proxy AI calls.

5. **What is the relationship between ideation canvas nodes and ConceptLab nodes?** SPEC.md says they share the same canvas, but ConceptLabShell has its own separate canvas instance using `useCanvasSession`.

6. **Is `src/app/page.tsx` intentionally empty?** It returns `null` — all content is rendered via `ClientShell` and `WorkspaceRenderer`.

---

## 12. Appendix: Evidence Index

| ID | File | Lines | Description |
|----|------|-------|-------------|
| E1 | `package.json` | 1-32 | Dependency manifest |
| E2 | `src/app/layout.tsx` | 1-22 | Root layout with metadata |
| E3 | `src/components/ClientShell.tsx` | 1-45 | App shell architecture |
| E4 | `src/components/WorkspaceRenderer.tsx` | 1-143 | Keep-alive routing |
| E5 | `src/lib/registry.ts` | 1-131 | Tool registry (6 tools) |
| E6 | `next.config.ts` | 1-32 | Proxy rewrites |
| E7 | `src/lib/ideation/engine/apiConfig.ts` | 1-112 | Dual-backend config |
| E8 | `src/lib/ideation/engine/stages.ts` | 1-42 | Pipeline stage definitions |
| E9 | `src/lib/ideation/engine/provider/geminiProvider.ts` | 1-50 | Tier configs and model mapping |
| E10 | `src/hooks/useCanvasSession.ts` | 1-40 | Shared canvas session hook |
| E11 | `src/components/GlobalToolbar.tsx` | 1-30 | Unified toolbar interface |
| E12 | `src/components/CanvasContextMenu.tsx` | 1-30 | Unified context menu interface |
| E13 | `src/app/ideation/canvas/FlowCanvas.tsx` | 1-50 | ShawnderMind canvas with 28 node types |
| E14 | `run.bat` | 1-49 | Bootstrap launcher |
| E15 | `.env.example` | all | Environment variable documentation |
| E16 | `.gitignore` | all | Ignore patterns |
| E17 | `AGENT_RULES.md` | all | Governance contract |
| E18 | `PROJECT.md` | all | Project overview |
| E19 | `SPEC.md` | all | Technical specification |
| E20 | `ARCHITECTURE.md` | all | Architecture documentation |
| E21 | `DECISIONS.md` | all | Architectural decision records |
| E22 | `TASKS.md` | all | Task tracking |

---

## Master Index

* Snapshot: `.repo_snapshot/repo_snapshot.md`
* Snapshot JSON: `.repo_snapshot/repo_snapshot.json`
* Health Report: `HEALTH_REPORT.md`
* Health Metrics: `.repo_snapshot/health_reports/health_metrics__20260306_080757.json`
* Tasks: `TASKS.md`
* Comprehensive Report: `.repo_snapshot/repo_comprehensive_report.md`
* Master Report: `MASTER_REPO_REPORT.md`
