# Master Repo Report

| Field | Value |
|-------|-------|
| Project root | `C:\Dev\Shawnderland_OKDO` |
| Generated at | 2026-03-15 14:36:00 |
| Includes | Snapshot + Health Audit + Comprehensive Repo Report + TASKS |
| Health | **Yellow** (report_id: 20260315_143559) |

---

## Repo Snapshot
# Repo Snapshot â€” 2026-03-15

## Overview

**Report ID:** 20260315_143559
**Repo root:** C:\Dev\Shawnderland_OKDO
**Generated:** 2026-03-15 14:36:00

Monorepo with Next.js 15, React 19, TypeScript 5. Contains ShawnderMind (ideation canvas), Gemini Studio, ConceptLab, Tool Editor, UI Lab, and Walter Storyboard Builder. Three LoRA-trained AI writer packages (Serling, Fielder, Pera) with corpus/taxonomy data. Single design system (packages/ui), single router pattern (Next.js App Router).

---

## Governance Docs

| Document | Status |
|----------|--------|
| PROJECT.md | Exists |
| SPEC.md | Exists |
| ARCHITECTURE.md | Exists |
| DECISIONS.md | Exists |
| TASKS.md | Exists |
| README.md | Exists |
| AGENT_RULES.md | Exists |
| ROD_SERLING_AI_SYSTEM.md | Exists (new) |
| HEALTH_REPORT.md | Exists (generated) |

---

## Dependencies

| Manifest | Package |
|----------|---------|
| package.json (root) | npm workspaces, Next.js 15.5, React 19.2, TypeScript 5.9 |
| packages/ai/package.json | @shawnderland/ai â€” text generation utility |
| packages/fielder/package.json | @shawnderland/fielder â€” Todd Field writer agent |
| packages/pera/package.json | @shawnderland/pera â€” Joe Pera writer agent |
| packages/serling/package.json | @shawnderland/serling â€” Rod Serling writer agent |
| packages/ui/package.json | @shawnderland/ui â€” shared design system |
| tools/walter/package.json | @tools/walter â€” storyboard builder |
| packages/serling/training/requirements.txt | Python training deps (Unsloth, transformers, etc.) |

---

## Entry Points

- **run.bat** â€” checks Node.js, installs deps, starts dev server (`npm run dev`)
- **npm run dev** â€” `node scripts/kill-stale-dev.js && next dev`
- **npm run build** â€” `next build`

---

## LOC Summary

| Extension | Files | Lines | Size |
|-----------|-------|-------|------|
| .tsx | 190 | 37,273 | 1,555.5 KB |
| .ts | 156 | 20,480 | 876.7 KB |
| .css | 78 | 15,973 | 360.4 KB |
| .md | 51 | 8,087 | 1,179.6 KB |
| .json | 20 | 19,580 | ~271 MB* |
| .mjs | 20 | 4,664 | 233.9 KB |
| .py | 9 | 990 | 38.3 KB |
| .txt | 5 | 417 | 29.2 KB |
| .bat | 4 | 166 | 4.8 KB |
| .mdc | 3 | 425 | 21.1 KB |
| .js | 2 | 121 | 8.5 KB |
| **TOTAL** | **538** | **108,176** | **~275 MB** |

*JSON byte total dominated by corpus/taxonomy files in packages/serling, packages/fielder, packages/pera (largest: `serling/src/taxonomy/decisions.json` at 78.6 MB).

**Source code only (excluding corpus/training JSON):** ~518 files, ~88,596 LOC, ~4.3 MB

---

## Top 10 Files (by size)

| Size | Path |
|------|------|
| 78.6 MB | packages/serling/src/taxonomy/decisions.json |
| 61.1 MB | packages/serling/src/corpus/chunks.json |
| 40.4 MB | packages/fielder/src/corpus/chunks.json |
| 31.8 MB | packages/pera/src/taxonomy/decisions.json |
| 25.7 MB | packages/pera/src/corpus/chunks.json |
| 20.6 MB | packages/fielder/src/taxonomy/decisions.json |
| 6.2 MB | packages/serling/training/serling_pairs.json |
| 4.4 MB | packages/fielder/training/fielder_pairs.json |
| 1.9 MB | packages/pera/training/pera_pairs.json |
| 499.1 KB | tools/walter/src/lore/MASTER_ANALYSIS.md |

Top 10 source files (excluding corpus/training data):

| Size | Lines | Path |
|------|-------|------|
| 499.1 KB | 2,508 | tools/walter/src/lore/MASTER_ANALYSIS.md |
| 250.3 KB | 7,079 | package-lock.json |
| 116.5 KB | 61 | tools/walter/src/lore/episode-15.md |
| 95.4 KB | 62 | tools/walter/src/lore/episode-22.md |
| 77.5 KB | 1,562 | src/app/ideation/canvas/nodes/character/CharViewNode.tsx |
| 74.4 KB | 65 | tools/walter/src/lore/episode-12.md |
| 54 KB | 1,928 | tools/walter/src/Walter.css |
| 52.2 KB | 1,218 | src/app/ideation/canvas/FlowCanvas.tsx |
| 51.7 KB | 719 | src/lib/ideation/engine/conceptlab/characterPrompts.ts |
| 46.4 KB | 1,237 | src/lib/ideation/context/SessionContext.tsx |

---

## Folder Tree (depth 4)

```
.cursor/
  rules/
.repo_snapshot/
  health_reports/
packages/
  ai/
    src/
  fielder/
    scripts/
    src/
      corpus/
      retrieval/
      taxonomy/
      voice/
    training/
  pera/
    scripts/
    src/
      corpus/
      retrieval/
      taxonomy/
      voice/
    training/
  serling/
    scripts/
    src/
      corpus/
      retrieval/
      taxonomy/
      voice/
    training/
  training-env/          (Python venv â€” Unsloth, transformers, torch)
  ui/
    src/
      canvas/
REPORTS/
scripts/
src/
  app/
    api/
      ai-embed/
      ai-generate/
      ai-local/
      ai-status/
      character-save/
      elevenlabs/
      fielder-corpus/
      hitem3d/
      list-dirs/
      meshy/
      meshy-export/
      open-folder/
      pera-corpus/
      send-to-photoshop/
      serling-corpus/
      session/
      video-analyze/
      walter-lore/
    concept-lab/
      nodes/
    gemini-studio/
      nodes/
    ideation/
      canvas/
      layout/
      stages/
      views/
    tool-editor/
      nodes/
    ui-lab/
      components/
  components/
    nodes/
      ui/
  hooks/
  lib/
    ideation/
      context/
      engine/
      state/
    styles/
    ui-lab/
    workspace/
tools/
  walter/
    src/
      components/
      lore/
```

---

## Subsystems

- **Hub/Shell** â€” src/components/ (ClientShell, Sidebar, WorkspaceRenderer, CommandPalette, HubCanvas)
- **ShawnderMind** â€” src/app/ideation/ (8-stage AI ideation pipeline, ReactFlow canvas)
- **Gemini Studio** â€” src/app/gemini-studio/ (consumer AI media generation)
- **ConceptLab** â€” src/app/concept-lab/ (AI character/weapon design)
- **Tool Editor** â€” src/app/tool-editor/ (visual tool designer)
- **UI Lab** â€” src/app/ui-lab/ (AI UI generation)
- **Walter Storyboard Builder** â€” tools/walter/ (multi-agent AI episode planning, 3-screen workflow)
- **AI Writer Packages** â€” packages/serling/, packages/fielder/, packages/pera/ (LoRA-trained writer agents with corpus, taxonomy, retrieval, voice)
- **Shared AI** â€” packages/ai/ (generateText, embedText utilities)
- **Shared UI** â€” packages/ui/ (design tokens, base components)
- **API Routes** â€” src/app/api/ (18 routes: ai-embed, ai-generate, ai-local, ai-status, character-save, elevenlabs, fielder-corpus, hitem3d, list-dirs, meshy, meshy-export, open-folder, pera-corpus, send-to-photoshop, serling-corpus, session, video-analyze, walter-lore)

---

## Config Surface

- **Env files:** .env.local, .env.example
- **Referenced vars:** GEMINI_API_KEY, NEXT_PUBLIC_GEMINI_API_KEY, NEXT_PUBLIC_VERTEX_PROJECT, NEXT_PUBLIC_VERTEX_LOCATION, NEXT_PUBLIC_VERTEX_API_KEY, MESHY_API_KEY, HITEM3D_ACCESS_KEY, HITEM3D_SECRET_KEY, ELEVENLABS_API_KEY, SESSIONS_DIR, CHARACTER_OUTPUT_DIR, SPRITE_LAB_URL, SHAWNDERMIND_URL, UI_LAB_URL, CONCEPT_LAB_URL, NEXT_PUBLIC_SPRITE_LAB_URL, NEXT_PUBLIC_SHAWNDERMIND_URL, NEXT_PUBLIC_UI_LAB_URL, NEXT_PUBLIC_CONCEPT_LAB_URL, NODE_ENV, OLLAMA_HOST

---

## Git Status

- **Branch:** main
- **Remote:** https://github.com/lydhndrxca/Shawnderland_OKDO.git
- **Last commit:** ca4fa7f â€” "docs: fix Walter doc drift -- update README, SPEC, DECISIONS to reflect functional workspace package" (2026-03-14 15:31:30)
- **Working tree:** 2 commits ahead of origin/main, 41 modified/deleted files, multiple new untracked directories (packages/fielder, packages/pera, corpus-raw, scripts, Walter agent system)
- **Uncommitted changes:** Multi-agent writing room implementation (Producer, Cinematographer, Writers), LoRA training pipeline files, corpus/taxonomy data for Fielder and Pera

---

## Duplication Assessment

**Parallel systems:** None detected. Single router (Next.js App Router), single design system (@shawnderland/ui), no duplicate state managers.

**Structural duplication (by design):** packages/fielder, packages/pera, packages/serling share identical module structure (corpus/, retrieval/, taxonomy/, voice/, scripts/) â€” this is intentional as each is a separate writer agent package with the same architecture.

**Potential concern:** Two `styleStore.ts` files â€” `src/lib/styleStore.ts` (IndexedDB-backed) and `src/lib/styles/styleStore.ts` (localStorage-backed). May serve different persistence tiers but worth reviewing.

**Secrets status:** No secrets found in source code; all API keys via process.env only.

---

## Health Report
# HEALTH REPORT

| Field | Value |
|-------|-------|
| Report ID | `20260315_143559` |
| Date | 2026-03-15 |
| Overall Health | **YELLOW** |
| Primary Issue Type | Doc Lag |

---

## TOP 3 RISKS

1. **Doc drift (ARCHITECTURE.md, SPEC.md)** â€” Neither document mentions the three LoRA-trained writer packages (Serling, Fielder, Pera), the Ollama integration, or 8 of the 18 current API routes (ai-embed, ai-local, ai-status, fielder-corpus, list-dirs, pera-corpus, serling-corpus, video-analyze).
2. **Massive data files without Git LFS** â€” Six corpus/taxonomy JSON files total ~271 MB (largest: `serling/src/taxonomy/decisions.json` at 78.6 MB). Tokenizer JSON files (~16 MB each) are duplicated across LoRA checkpoints. These will bloat git history.
3. **Unpushed changes** â€” `main` is 2 commits ahead of remote, plus significant uncommitted work (multi-agent writing room, LoRA pipeline, writer packages).

## TOP 3 RECOMMENDED ACTIONS

1. Update ARCHITECTURE.md and SPEC.md to document writer packages, LoRA pipeline, Ollama integration, and all 18 API routes.
2. Add corpus/taxonomy JSON files and training artifacts (tokenizer.json, checkpoint dirs) to `.gitignore` or migrate to Git LFS.
3. Push committed work to remote and commit the multi-agent writing room changes.

---

## RED TRIGGERS

| Check | Status |
|-------|--------|
| Secrets in source | **PASS** â€” no API keys, tokens, or credentials found in tracked source files; all keys via `process.env` |
| Run entrypoint | **PASS** â€” `run.bat` exists at repo root; README has Quick Start section with `npm install && npm run dev` |
| Parallel systems | **PASS** â€” single router (Next.js App Router), single design system (@shawnderland/ui), no duplicate state managers |
| Output dirs tracked in git | **PASS** â€” `git ls-files` returned nothing for `.repo_snapshot/`, `dist/`, `build/`, `output/`, `saved-sessions/`, `character-output/` |

## YELLOW TRIGGERS

| Check | Status | Details |
|-------|--------|---------|
| Doc drift | **FLAG** | ARCHITECTURE.md lists 10 API routes; actual count is 18. Missing: ai-embed, ai-local, ai-status, fielder-corpus, list-dirs, pera-corpus, serling-corpus, video-analyze. No mention of @shawnderland/serling, @shawnderland/fielder, @shawnderland/pera packages, LoRA training pipeline, or Ollama integration. SPEC.md similarly lacks writer package documentation. |
| README accuracy | **PASS** | README correctly lists Walter as "Functional", Quick Start is accurate, env vars table is correct. |
| DECISIONS coverage | **PASS** | ADR 005 properly marked SUPERSEDED. All major deps documented (ADRs 001â€“031). |
| Large files (>100 KB) | **FLAG** | 30 files exceed 100 KB. Corpus/taxonomy JSON: 6 files totaling ~271 MB. Tokenizer JSON: 18 checkpoint files at ~16 MB each. Lore markdown: MASTER_ANALYSIS.md (499 KB), episode-15.md (117 KB). package-lock.json (250 KB) is expected. |
| Gitignore completeness | **WARN** | `.repo_snapshot/`, `saved-sessions/`, `character-output/`, `node_modules/`, `.next/`, `.env`, `.env.local`, `HEALTH_REPORT.md`, `MASTER_REPO_REPORT.md` all covered. Missing: `build/`, `output/` (not currently used but worth adding). Training artifacts (tokenizer.json, checkpoint dirs, *-gguf/, *-merged-16bit/) not ignored. |
| Portability | **PASS** | `run.bat` bootstraps Node check + `npm install` + `npm run dev`. All deps in package.json. No hidden setup steps. Python training requires separate venv (packages/training-env) but this is optional for app runtime. |
| Sustained growth >15% | **NO FLAG** | Previous interval showed +22.3% LOC (inflated by encoding recount). Current interval source-only growth is +8.7% by bytes. No sustained concern. |

---

## METRICS

| Metric | Value |
|--------|-------|
| Total files (text-like) | 538 |
| Total LOC | 108,176 |
| Total bytes | ~288 MB (source-only: ~4.3 MB) |
| Source-only files | ~518 |
| Source-only LOC | ~88,596 |
| Largest file | `packages/serling/src/taxonomy/decisions.json` (78.6 MB) |
| Largest source file | `tools/walter/src/lore/MASTER_ANALYSIS.md` (499 KB, 2508 lines) |
| API routes | 18 |
| Workspace packages | 6 (@shawnderland/ai, @shawnderland/ui, @shawnderland/serling, @shawnderland/fielder, @shawnderland/pera, @tools/walter) |

## TOP 10 LARGEST SOURCE FILES

| Size (KB) | Lines | File |
|-----------|-------|------|
| 499.1 | 2,508 | `tools/walter/src/lore/MASTER_ANALYSIS.md` |
| 250.3 | 7,079 | `package-lock.json` |
| 116.5 | 61 | `tools/walter/src/lore/episode-15.md` |
| 95.4 | 62 | `tools/walter/src/lore/episode-22.md` |
| 77.5 | 1,562 | `src/app/ideation/canvas/nodes/character/CharViewNode.tsx` |
| 74.4 | 65 | `tools/walter/src/lore/episode-12.md` |
| 54 | 1,928 | `tools/walter/src/Walter.css` |
| 52.2 | 1,218 | `src/app/ideation/canvas/FlowCanvas.tsx` |
| 51.7 | 719 | `src/lib/ideation/engine/conceptlab/characterPrompts.ts` |
| 46.4 | 1,237 | `src/lib/ideation/context/SessionContext.tsx` |

---

## GOVERNANCE DOCS

| Document | Status |
|----------|--------|
| AGENT_RULES.md | Current |
| PROJECT.md | Current |
| SPEC.md | **Drifted** â€” missing writer packages, LoRA pipeline, Ollama, 5 new API routes |
| ARCHITECTURE.md | **Drifted** â€” missing writer packages, LoRA pipeline, 8 API routes not listed |
| DECISIONS.md | Current (ADR 005 marked superseded) |
| TASKS.md | Current |
| README.md | Current |
| ROD_SERLING_AI_SYSTEM.md | Current (new) |

---

## FINDINGS

### Doc Drift Details

1. **ARCHITECTURE.md**: Lists 10 API routes under `src/app/api/`; the actual directory contains 18 routes. Missing routes: `ai-embed/`, `ai-local/`, `ai-status/`, `fielder-corpus/`, `list-dirs/`, `pera-corpus/`, `serling-corpus/`, `video-analyze/`. Does not mention packages/serling, packages/fielder, packages/pera, or the LoRA training pipeline.
2. **SPEC.md**: No mention of the three writer agent packages, their corpus/taxonomy/retrieval systems, or the LoRA training and Ollama integration that powers the Writing Room personas.
3. **Both docs**: Do not document the `OLLAMA_HOST` env var or the `ai-local` API route that proxies to Ollama for local model inference.

### Duplication Assessment

**Structural (by design):** packages/fielder, packages/pera, packages/serling share identical module structure (corpus/, retrieval/, taxonomy/, voice/, scripts/). Each writer is a separate agent with the same architecture.

**Potential concern:** Two `styleStore.ts` files with different persistence backends:
- `src/lib/styleStore.ts` â€” IndexedDB-backed
- `src/lib/styles/styleStore.ts` â€” localStorage-backed

These may serve different persistence tiers per the three-layer persistence design (ADR 020), but the naming overlap warrants review.

### Growth & Trajectory

| Metric | Previous (20260314_151000) | Current | Delta |
|--------|---------------------------|---------|-------|
| Files | 465 | 538 | +73 (+15.7%) |
| Source bytes | 4,209,718 | 4,308,345 | +98,627 (+2.3%) |
| Total bytes | 4,209,718 | 288,591,600 | +284.4 MB |
| LOC | 97,386 | 108,176 | +10,790 (+11.1%) |

The massive byte increase is entirely from newly tracked corpus/taxonomy JSON files in the writer packages (~271 MB combined). Source code growth is modest at 2.3% by bytes. File count growth (+73) is from the writer package structures (scripts, corpus, taxonomy, voice, training directories for Fielder and Pera).

### Prompt & Template Surface

Top 5 files by template string density (backtick count):

| Count | File |
|------:|------|
| 160 | `src/app/ideation/canvas/nodes/character/CharViewNode.tsx` |
| 158 | `tools/walter/src/agentEngine.ts` |
| 124 | `src/app/ideation/canvas/nodes/character/GenerateCharImageNode.tsx` |
| 96 | `src/lib/ideation/engine/commit/commitPrompt.ts` |
| 90 | `src/app/ideation/canvas/nodes/character/ExtractAttributesNode.tsx` |

No near-duplicate prompts detected (each prompt serves a distinct AI generation context).

### Cleanup Candidates

- **Tokenizer JSON duplication**: Each writer package has 5-6 copies of a ~16 MB tokenizer.json across checkpoints, GGUF output, merged output, and adapter directories. These are training artifacts that should not be in the main source tree.
- **Training checkpoint dirs**: `*-lora-adapter/checkpoint-*/` directories contain intermediate training state. Consider gitignoring these.
- **corpus-raw/**: Untracked directory with raw corpus data. Ensure this stays untracked.

---

## PROPOSED CLEANUP PLAN

1. **Fix doc drift** â€” Update ARCHITECTURE.md to list all 18 API routes and document writer packages. Update SPEC.md to describe LoRA training pipeline and writer agent system.
2. **Gitignore training artifacts** â€” Add patterns for `**/training/*-gguf/`, `**/training/*-lora-adapter/`, `**/training/*-merged-16bit/`, `**/training/checkpoint-*/` to prevent tokenizer.json and model files from entering git.
3. **Evaluate Git LFS** â€” For corpus/taxonomy JSON files that must be version-controlled, migrate to Git LFS. Consider if these belong in a separate data repository.
4. **Push to remote** â€” Commit current work and push to sync with origin.

---

> Health audit complete. Grade: **YELLOW**. Found 2 yellow triggers (doc drift, large files).

---

## Tasks
# TASKS â€” Shawnderland OKDO

## Completed

- [x] Install dependencies and verify the hub compiles and runs
- [x] Build out ShawnderMind ideation canvas with full node-based pipeline
- [x] Implement Interactive and Automated modes in StartNode
- [x] Create PackedPipelineNode for automated collapsed view
- [x] Upgrade GroupNode to functional pack node with dynamic outputs
- [x] Add Thinking Tiers (Quick/Standard/Deep) with model selection
- [x] Fix influence node merging â€” structured prompt blocks across all stages
- [x] Align context menu categories with ToolDock categories
- [x] Replace pin icon with lock/unlock in ToolDock
- [x] Build Tool Editor: canvas, node types, property panel, export
- [x] Register Tool Editor in hub registry and route
- [x] Tool Editor: edge-based resizing on all elements
- [x] Tool Editor: add Button, Text Box, Dropdown Menu elements
- [x] Tool Editor: save/import layouts (localStorage + file upload)
- [x] Tool Editor: undo/redo, duplicate, alignment tools
- [x] Restore RRGM governance â€” update all governance docs, add mode system
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
- [x] Add ADRs 019â€“022 to DECISIONS.md
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
- [x] Walter: Walter Brain (canon memory) â€” characters, locations, lore, 28 episodes
- [x] Walter: Episode lore integration â€” 28 per-episode analysis files in lore/
- [x] Walter: Complete rebuild â€” 3-screen workflow (Planning â†’ Writing Room â†’ Staging Room)
- [x] Walter: Multi-agent persona system (Producer, Writer, Director, Cinematographer)
- [x] Walter: Agent conversation engine with phase-based progression
- [x] Walter: Session-based state management (save/open/rename/duplicate)
- [x] Walter: Planning Page (constraints, randomize, send to producer)
- [x] Walter: Writing Room (chat, auto-run, phase controls, persona builder)
- [x] Walter: Staging Room (3-level timeline, shot editor, feedback loop, one-sheet export)
- [x] Walter: Deleted 19 old components, replaced with 5 new screen components

### Health Audit Cleanup

- [x] Commit monorepo migration (Walter extraction, profile system, @shawnderland/ai)
- [ ] Consider Git LFS for lore files >100 KB
- [x] Fix 3 pre-existing TS errors in GeminiEditorOverlay.tsx
- [x] Fix doc drift: README.md, SPEC.md, DECISIONS.md still describe Walter as Electron-only/launcher-only
- [ ] Fix doc drift: ARCHITECTURE.md missing 8 API routes and writer packages (ai-embed, ai-local, ai-status, fielder-corpus, list-dirs, pera-corpus, serling-corpus, video-analyze)
- [ ] Fix doc drift: SPEC.md missing writer agent packages, LoRA training pipeline, Ollama integration
- [ ] Gitignore training artifacts (tokenizer.json, checkpoint dirs, *-gguf/, *-merged-16bit/)
- [ ] Evaluate Git LFS for corpus/taxonomy JSON (~271 MB combined)

## Next

- [ ] Extract ShawnderMind into tools/shawndermind/ package
- [ ] Extract Gemini Studio into tools/gemini-studio/ package
- [ ] Build Sprite Lab sub-tool navigation and workspace pages
- [ ] Build UI Lab remaining workspace panels
- [ ] Add cross-tool data flow wiring on the hub canvas

## Later

- [ ] Walter: ML integration â€” image generation from shot descriptions
- [ ] Walter: ML integration â€” AI storyboard-to-video preview
- [ ] Walter: ML integration â€” voice/narration generation from dialogue
- [ ] Walter web integration (extract timeline/storyboard UI from Electron)
- [ ] Production build and deployment configuration
- [ ] Add test suite (currently 0 test files)
- [ ] Split large files (SessionContext.tsx ~1060 lines, orchestrator.ts ~1039 lines)
- [ ] Evaluate ContextMenu.css: merge shared styles into CanvasCommon.css
- [ ] Evaluate loadPack.ts exports (unused)
- [ ] Resolve Windows production build EPERM issue (webpack glob config)

## User Action Required

- [ ] **URGENT: Rotate Gemini API key** â€” was embedded in saved-sessions/test.json (now removed from git, but key may be in git history)

## Health Audit History

- [x] Report 20260306_080757
- [x] Report 20260306_161152
- [x] Report 20260311_001400
- [x] Health audit report generated (report_id: 20260314_144353)
- [x] Health audit report generated (report_id: 20260314_151000)
- [x] Health audit report generated (report_id: 20260315_143559)

---

## Comprehensive Repo Report
# Comprehensive Repo Report â€” Shawnderland OKDO

---

## 1. Metadata

| Field | Value |
|-------|-------|
| Timestamp | 2026-03-15 14:36:00 |
| Report ID | 20260315_143559 |
| Repo root | `C:\Dev\Shawnderland_OKDO` |
| Git branch | `main` |
| Git status | 2 commits ahead of `origin/main`; 41 modified/deleted files, ~20 new untracked directories |
| Last commit | `ca4fa7f` â€” "docs: fix Walter doc drift" (2026-03-14 15:31:30) |
| Remote | `https://github.com/lydhndrxca/Shawnderland_OKDO.git` |
| Scan scope | All tracked + untracked source files, excluding `node_modules/`, `.git/`, `.next/`, `site-packages/`, training env venv |

---

## 2. Executive Summary

- **Monorepo hub application** built on Next.js 15 / React 19 / TypeScript 5 that unifies 7 AI creative tools under a single dark-themed interface with sidebar navigation, command palette, and workspace keep-alive.
- **ShawnderMind** is the flagship subsystem: an 8-stage AI ideation pipeline on a ReactFlow canvas with character design, 3D generation (Meshy, Hitem3D), audio (ElevenLabs TTS/SFX/voice clone), Creative Director AI critique, and three-layer session persistence.
- **Walter Storyboard Builder** (`tools/walter/`) is a fully extracted workspace package implementing a multi-agent AI writing room with Producer, Cinematographer, and three LoRA-trained writer personas (Rod Serling, Nathan Fielder, Joe Pera) for collaborative episode planning.
- **Three LoRA-trained AI writer packages** (`packages/serling/`, `packages/fielder/`, `packages/pera/`) each provide corpus retrieval, taxonomy/decision data, voice refinement, and local Ollama model integration, powering canon-aware creative writing.
- **Dual-backend API** routing (`apiConfig.ts`) supports both Google AI Studio and Vertex AI, with automatic detection based on env vars and unified URL construction.
- **18 API routes** in `src/app/api/` serve as server-side proxies for external services (Google AI, Meshy, Hitem3D, ElevenLabs, Ollama) and internal data (corpus, sessions, lore).
- **Unified canvas chrome** (`useCanvasSession`, `GlobalToolbar`, `CanvasContextMenu`) shares undo/redo, edge-cutting, grouping, clipboard, and keyboard shortcuts across ShawnderMind, ConceptLab, Gemini Studio, and Tool Editor.
- **6 workspace packages**: `@shawnderland/ai`, `@shawnderland/ui`, `@shawnderland/serling`, `@shawnderland/fielder`, `@shawnderland/pera`, `@tools/walter` â€” managed via npm workspaces.
- **Profile system** (Work/Personal/All) filters tool visibility across sidebar, command palette, and home page.
- **Python LoRA training pipeline** exists for each writer (train_*.py, convert_to_gguf.py, export_to_ollama.py) using Unsloth + Mistral-Nemo-Base-2407-bnb-4bit, producing GGUF models registered with Ollama.
- **Large data footprint**: ~271 MB in corpus/taxonomy JSON files across the three writer packages, plus ~16 MB tokenizer files per checkpoint â€” these are not in Git LFS.
- **Doc drift**: ARCHITECTURE.md and SPEC.md do not yet document the writer packages, LoRA pipeline, Ollama integration, or 8 of the 18 API routes.

---

## 3. What This Repo Is

| Aspect | Value | Evidence |
|--------|-------|----------|
| Type | Monorepo with npm workspaces | `package.json` L5-8: `"workspaces": ["packages/*", "tools/*"]` |
| Primary language | TypeScript | 346 .ts/.tsx files, 57,753 LOC |
| Framework | Next.js 15 (App Router) | `package.json`: `"next": "^15.5.0"`, `src/app/layout.tsx` |
| UI framework | React 19 | `package.json`: `"react": "^19.2.0"` |
| Styling | Tailwind CSS v4 + CSS custom properties | `package.json`: `"tailwindcss": "^4.2.0"`, 78 CSS files |
| Canvas | @xyflow/react 12 + dagre | `package.json`: `"@xyflow/react": "^12.10.1"`, `"dagre": "^0.8.5"` |
| 3D rendering | Three.js / React Three Fiber / Drei | `package.json`: `"three": "^0.183.2"`, `"@react-three/fiber": "^9.5.0"` |
| Runtime | Node.js 18+ | `run.bat` L9-17: checks for Node.js |
| AI models | Gemini (Flash, Pro, Flash Image, Embedding), Imagen 4, Veo, Ollama (local LoRA) | `apiConfig.ts`, `ai-local/route.ts`, `agentEngine.ts` |
| Training | Python (Unsloth, transformers, PEFT) | `train_serling.py`, `train_fielder.py`, `train_pera.py` |

---

## 4. How to Run

### Prerequisites
- Node.js 18+ (or portable Node at `%LOCALAPPDATA%\node-portable\`)
- npm (bundled with Node)

### Quick Start

```bash
git clone https://github.com/lydhndrxca/Shawnderland_OKDO.git
cd Shawnderland_OKDO
cp .env.example .env.local
# Fill in at least NEXT_PUBLIC_GEMINI_API_KEY
npm install
npm run dev
```

**Evidence:** `README.md` L7-21 (Quick Start section), `run.bat` L1-55 (Windows launcher).

### Windows Launcher

```bash
run.bat
```

Checks Node.js, installs dependencies, clears port 3000, starts dev server, opens `http://localhost:3000`.

**Evidence:** `run.bat` L9-17 (Node check), L23-27 (npm install), L29-32 (port clear), L34 (`npm run dev`).

### Available npm Scripts

| Script | Command | Evidence |
|--------|---------|----------|
| `dev` | `node scripts/kill-stale-dev.js && next dev` | `package.json` L8 |
| `build` | `next build` | `package.json` L9 |
| `start` | `next start` | `package.json` L10 |
| `lint` | `npx eslint .` | `package.json` L11 |
| `typecheck` | `tsc --noEmit` | `package.json` L12 |

### LoRA Training (Optional, requires GPU)

```bash
cd packages/training-env/Scripts
activate.bat
cd ../../serling/training
python train_serling.py
```

**Evidence:** `packages/serling/training/setup.bat`, `train_serling.py`, `requirements.txt`.

### OS Assumptions
- Primary: Windows 10/11 (run.bat, portable Node paths, ollama.exe)
- Compatible: macOS/Linux for npm-based workflow (no run.bat equivalent)

---

## 5. Feature Inventory

### Hub / Shell

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| Dark-themed shell with sidebar | `src/components/ClientShell.tsx` | L9-45: `WorkspaceProvider`, `Sidebar`, `WorkspaceRenderer` |
| Command palette (Ctrl+K) | `src/components/CommandPalette.tsx` | `ClientShell.tsx` L21-28: keyboard handler |
| Profile-based tool filtering | `src/lib/registry.ts` | L3-138: `TOOLS` array with `profiles` field |
| Workspace keep-alive | `src/components/WorkspaceRenderer.tsx` | Referenced in `ClientShell.tsx` L41 |
| Hub canvas home page | `src/components/HubCanvas.tsx` | Referenced in ARCHITECTURE.md |

### ShawnderMind (Ideation Canvas)

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| 8-stage AI pipeline | `src/lib/ideation/engine/orchestrator.ts` | Referenced in `SessionContext.tsx` L20-23 |
| ReactFlow canvas | `src/app/ideation/canvas/FlowCanvas.tsx` | L1-60: imports ReactFlow, ToolDock, nodes |
| 13 ToolDock categories | `src/lib/sharedNodeTypes.ts` | Referenced in `FlowCanvas.tsx` L32 |
| Character design nodes | `src/app/ideation/canvas/nodes/character/` | CharViewNode.tsx (1,562 lines) |
| Creative Director | `src/app/ideation/canvas/nodes/` | Referenced in SPEC.md |
| Thinking tiers | `src/app/ideation/` | Quick/Standard/Deep model selection |
| Three-layer persistence | `SessionContext.tsx`, `layoutStore.ts`, `/api/session` | `SessionContext.tsx` L11-14 |
| Unified canvas chrome | `src/hooks/useCanvasSession.ts` | L1-60: shared undo/redo/grouping/clipboard |

### Walter Storyboard Builder

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| 3-screen workflow | `tools/walter/src/WalterShell.tsx` | Planning â†’ Writing Room â†’ Staging Room |
| Planning Page | `tools/walter/src/components/PlanningPage.tsx` | L22-60: constraints, mood, locations |
| Multi-agent writing room | `tools/walter/src/components/WritingRoom.tsx` | L29-80: phase labels, runTurn |
| 7 creative rounds | `tools/walter/src/creativeRounds.ts` | L3-80: premise, opening-frame, the-strange, etc. |
| Agent engine | `tools/walter/src/agentEngine.ts` | L1-150: generateAgentTurn, compileBrief |
| 7 preset personas | `tools/walter/src/agents.ts` | Producer, Writer, Director, Cinematographer, Serling, Fielder, Pera |
| Physical violation detection | `tools/walter/src/agentEngine.ts` | PHYSICAL_VIOLATIONS regex array |
| Producer episode state | `tools/walter/src/types.ts` | L183-210: ProducerEpisodeState interface |
| Staging room + shot editor | `tools/walter/src/components/StagingRoom.tsx` | L8-60: 3-level timeline, feedback loop |
| One-sheet export | `StagingRoom.tsx` | handleExportOneSheet function |
| Canon memory (Walter Brain) | `tools/walter/src/walterBrain.ts` | Characters, locations, lore, 28 episodes |
| Session management | `tools/walter/src/store.ts` | L1-100: localStorage persistence, useSyncExternalStore |

### AI Writer Packages (Serling, Fielder, Pera)

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| Corpus retrieval | `packages/*/src/retrieval/retrieve.ts` | `retrieveSerlingContext`, etc. |
| Vector store | `packages/*/src/retrieval/vectorStore.ts` | `VectorStore` class |
| Taxonomy/decision data | `packages/*/src/taxonomy/` | types.ts, patterns.ts |
| Voice refinement | `packages/*/src/voice/localModel.ts` | `refineSerlingVoice`, `generateLocal` |
| Embedding support | `packages/*/src/retrieval/embeddings.ts` | `embedText`, `embedTexts` |
| LoRA training | `packages/*/training/train_*.py` | Python training scripts |
| Context builders | `packages/*/src/*Context.ts` | `getSerlingContext`, `getFielderContext`, `getPeraContext` |

### Gemini Studio

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| Multi-model image gen | `src/app/gemini-studio/nodes/` | Imagen 4, Gemini 3 Pro, Gemini Flash Image |
| Video generation (Veo) | `src/app/gemini-studio/` | Operation polling for long-running tasks |

### ConceptLab

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| Unified canvas with ShawnderMind | `src/app/concept-lab/` | Same node set via `sharedNodeTypes.ts` |
| Character/Weapon/Turnaround nodes | `src/app/ideation/canvas/nodes/character/` | CharViewNode, WeaponNode, Turnaround |

### Tool Editor

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| Visual tool designer | `src/app/tool-editor/` | Canvas with Generic/Window/Frame/Button nodes |
| JSON export | `src/app/tool-editor/` | Export All or Export Selected |

### 3D Generation

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| Meshy Image-to-3D | `src/app/api/meshy/route.ts` | Server-side proxy with GLB download |
| Hitem3D Image-to-3D | `src/app/api/hitem3d/route.ts` | Full parameter control, portrait models |
| 3D Model Viewer | Three.js / R3F | `package.json`: three, @react-three/fiber |

### Audio

| Feature | Module/File | Evidence |
|---------|-------------|----------|
| ElevenLabs TTS | `src/app/api/elevenlabs/route.ts` | Voice/model selection, inline playback |
| Sound effects | `src/app/api/elevenlabs/route.ts` | Text-to-SFX generation |
| Voice cloning | `src/app/api/elevenlabs/route.ts` | Upload audio samples |

---

## 6. Architecture Overview

### Component Diagram (Text)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                       Next.js 15 App                         â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚  Root Layout (layout.tsx) â†’ ClientShell                 â”‚ â”‚
â”‚  â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                   â”‚ â”‚
â”‚  â”‚  â”‚ Sidebar  â”‚  â”‚ WorkspaceRenderer â”‚â†â”€ keep-alive      â”‚ â”‚
â”‚  â”‚  â”‚ (nav)    â”‚  â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚                   â”‚ â”‚
â”‚  â”‚  â”‚          â”‚  â”‚  â”‚ Tool Views   â”‚ â”‚                   â”‚ â”‚
â”‚  â”‚  â”‚ Profile  â”‚  â”‚  â”‚ (mounted)    â”‚ â”‚                   â”‚ â”‚
â”‚  â”‚  â”‚ filter   â”‚  â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚                   â”‚ â”‚
â”‚  â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                   â”‚ â”‚
â”‚  â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                                   â”‚ â”‚
â”‚  â”‚  â”‚ CommandPalette   â”‚ (Ctrl+K)                         â”‚ â”‚
â”‚  â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                   â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                                                              â”‚
â”‚  â”Œâ”€â”€â”€ Canvas Tools â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚ ShawnderMind â†â†’ ConceptLab (shared nodes/ToolDock)      â”‚ â”‚
â”‚  â”‚ Gemini Studio                                           â”‚ â”‚
â”‚  â”‚ Tool Editor                                             â”‚ â”‚
â”‚  â”‚ All use: useCanvasSession + GlobalToolbar + CtxMenu     â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                                                              â”‚
â”‚  â”Œâ”€â”€â”€ Walter (tools/walter/) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚ PlanningPage â†’ WritingRoom â†’ StagingRoom                â”‚ â”‚
â”‚  â”‚   â†“ compileBrief     â†“ agentEngine     â†“ shot editor   â”‚ â”‚
â”‚  â”‚                      â†•                                  â”‚ â”‚
â”‚  â”‚              Agent Personas â†â”€â”€ Walter Brain (canon)    â”‚ â”‚
â”‚  â”‚              â†•                                          â”‚ â”‚
â”‚  â”‚    â”Œâ”€â”€ Writer Packages â”€â”€â”                              â”‚ â”‚
â”‚  â”‚    â”‚ @shawnderland/serling â”‚                             â”‚ â”‚
â”‚  â”‚    â”‚ @shawnderland/fielder â”‚                             â”‚ â”‚
â”‚  â”‚    â”‚ @shawnderland/pera    â”‚                             â”‚ â”‚
â”‚  â”‚    â””â”€â”€ corpus + taxonomy + voice â”€â”€â”˜                    â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                                                              â”‚
â”‚  â”Œâ”€â”€â”€ API Routes (src/app/api/) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚ ai-generate  ai-embed  ai-local  ai-status              â”‚ â”‚
â”‚  â”‚ serling-corpus  fielder-corpus  pera-corpus              â”‚ â”‚
â”‚  â”‚ meshy  meshy-export  hitem3d  elevenlabs                 â”‚ â”‚
â”‚  â”‚ session  character-save  walter-lore  video-analyze      â”‚ â”‚
â”‚  â”‚ list-dirs  open-folder  send-to-photoshop                â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”‚                                                              â”‚
â”‚  â”Œâ”€â”€â”€ Packages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚ @shawnderland/ai  â†’ generateText(), embedText()         â”‚ â”‚
â”‚  â”‚ @shawnderland/ui  â†’ Button, Input, Select, tokens       â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
          â”‚                    â”‚                    â”‚
          â–¼                    â–¼                    â–¼
   Google AI APIs       External APIs         Ollama (local)
   (Gemini, Imagen,     (Meshy, Hitem3D,     (LoRA models:
    Veo, Embedding)      ElevenLabs)          serling-mind,
                                              fielder-mind,
                                              pera-mind)
```

### Data Flow

1. **User interaction** â†’ React components â†’ tool-specific state (Zustand/useSyncExternalStore/context)
2. **AI calls** â†’ `@shawnderland/ai` `generateText()` â†’ `/api/ai-generate` â†’ Google AI Studio/Vertex
3. **Corpus retrieval** â†’ Writer package `retrieve*Context()` â†’ `/api/*-corpus` â†’ filesystem JSON
4. **Local model inference** â†’ `generateLocal()` â†’ `/api/ai-local` â†’ Ollama HTTP API
5. **3D/Audio** â†’ node components â†’ `/api/meshy` or `/api/hitem3d` or `/api/elevenlabs` â†’ external APIs
6. **Session persistence** â†’ localStorage (auto-save) + IndexedDB (named layouts) + `/api/session` (filesystem)

### Key Abstractions

- **Registry pattern** (`src/lib/registry.ts`): Tool definitions with id, name, routes, profiles
- **Workspace keep-alive** (`WorkspaceRenderer`): Mounted tools stay alive when switching
- **useCanvasSession hook**: Shared canvas behavior across 4 canvas-based tools
- **Agent persona system** (`agents.ts`): Preset + custom personas with research-driven profiles
- **Writer package architecture**: Identical module structure across serling/fielder/pera (corpus, taxonomy, retrieval, voice)
- **Dual-backend API config**: Single module routes all Google AI calls to the right backend

---

## 7. Module Deep Dive

### 7.1 Hub Shell (`src/components/`)

**Purpose:** Application frame with navigation, routing, and workspace management.

**Key files:**
- `ClientShell.tsx` â€” Root layout with Sidebar, WorkspaceRenderer, CommandPalette
- `Sidebar.tsx` â€” Tool navigation with profile filtering
- `WorkspaceRenderer.tsx` â€” Mounts and keeps alive visited tool views
- `CommandPalette.tsx` â€” Ctrl+K quick navigation
- `HubCanvas.tsx` â€” Home page with tool nodes

**Interactions:** Registry provides tool list â†’ Sidebar renders â†’ WorkspaceRenderer mounts tool components â†’ Profile filter gates visibility.

### 7.2 ShawnderMind (`src/app/ideation/`)

**Purpose:** 8-stage AI ideation pipeline on a ReactFlow canvas with character design, 3D, and audio nodes.

**Key files:**
- `canvas/FlowCanvas.tsx` (1,218 lines) â€” Main canvas with ReactFlow, ToolDock, context menu
- `canvas/nodes/` â€” 30+ node types (pipeline stages, character, weapon, 3D, audio, etc.)
- `layout/` â€” HistoryPanel, StatusBar, ToolDock
- `stages/` â€” Pipeline stage components

**Interactions:** `SessionContext` manages pipeline state â†’ `orchestrator.ts` runs AI stages â†’ `apiConfig.ts` routes to Gemini â†’ nodes display results. `useCanvasSession` provides undo/redo/grouping.

### 7.3 Walter Storyboard Builder (`tools/walter/`)

**Purpose:** Multi-agent AI episode planning tool with 3-screen workflow for "Weeping Willows Walter" animated series.

**Key files:**
- `WalterShell.tsx` â€” Screen router (Planning â†’ Writing Room â†’ Staging Room)
- `types.ts` (278 lines) â€” All type definitions including WalterSession, ProducerEpisodeState
- `store.ts` (~680 lines) â€” External store with useSyncExternalStore, localStorage persistence
- `agents.ts` â€” 7 preset personas with deep research-driven profiles
- `agentEngine.ts` â€” Turn generation, brief compilation, physical violation detection, episode state management
- `creativeRounds.ts` â€” 7 creative rounds with questions, agent pools, turn limits
- `walterBrain.ts` â€” Canon memory: characters, locations, lore, 28 episodes
- `components/PlanningPage.tsx` â€” Constraint gathering
- `components/WritingRoom.tsx` â€” Multi-agent chat with phase controls
- `components/StagingRoom.tsx` â€” 3-level timeline, shot editor, one-sheet export

**Interactions:** PlanningPage compiles brief â†’ WritingRoom drives agent turns via agentEngine â†’ agents use writer packages for context â†’ StagingRoom receives parsed structure for production planning.

### 7.4 AI Writer Packages (`packages/serling/`, `packages/fielder/`, `packages/pera/`)

**Purpose:** LoRA-trained writer agents with corpus retrieval, taxonomy, and voice refinement.

**Key files (each package, identical structure):**
- `src/index.ts` â€” Barrel exports
- `src/corpus/types.ts` â€” CorpusChunk, ChunkMetadata types
- `src/corpus/chunks.json` â€” Chunked corpus data (26-64 MB)
- `src/taxonomy/types.ts` â€” DecisionCategory, DecisionEntry types
- `src/taxonomy/decisions.json` â€” Decision taxonomy data (21-80 MB)
- `src/retrieval/retrieve.ts` â€” Context retrieval (`retrieveSerlingContext`, etc.)
- `src/retrieval/vectorStore.ts` â€” In-memory vector store for similarity search
- `src/retrieval/embeddings.ts` â€” Embedding via `/api/ai-embed`
- `src/voice/localModel.ts` â€” Voice refinement and local Ollama generation
- `src/*Context.ts` â€” High-level context builders (`getSerlingContext`, etc.)

**Interactions:** agentEngine detects persona â†’ calls `get*Context()` â†’ retrieves relevant corpus chunks and taxonomy decisions â†’ builds augmented prompt â†’ optionally calls `generateLocal()` for Ollama inference â†’ returns voice-refined text.

### 7.5 Shared AI Package (`packages/ai/`)

**Purpose:** Shared Gemini text generation and embedding utilities.

**Key files:**
- `src/generateText.ts` â€” `generateText(prompt, opts?)` â†’ POST to `/api/ai-generate`
- `src/embedText.ts` â€” `embedText(text)` / `embedTexts(texts)` â†’ POST to `/api/ai-embed`
- `src/index.ts` â€” Barrel exports

**Interactions:** All workspace packages import `generateText` from `@shawnderland/ai`. Walter's agent engine uses it for non-LoRA personas. Writer packages use it for corpus generation scripts.

### 7.6 Shared UI Package (`packages/ui/`)

**Purpose:** Design system with tokens, base components, and canvas primitives.

**Key files:**
- `src/` â€” Button, Input, Select, Textarea components
- `src/canvas/` â€” PipelineEdge (used by HubCanvas)
- Tokens for colors, spacing, typography

**Interactions:** All tools import UI components. PipelineEdge renders hub canvas connections.

### 7.7 API Routes (`src/app/api/`)

**Purpose:** Server-side proxies keeping API keys secure, plus internal data endpoints.

| Route | Purpose | Evidence |
|-------|---------|----------|
| `ai-generate/` | Gemini text/image generation proxy | Uses `GEMINI_API_KEY` |
| `ai-embed/` | Gemini embedding proxy | Uses `gemini-embedding-001` model |
| `ai-local/` | Ollama local model proxy | GET lists models, POST generates text |
| `ai-status/` | API key availability check | Returns boolean hasKey |
| `character-save/` | Save character images to disk | Uses `CHARACTER_OUTPUT_DIR` |
| `elevenlabs/` | ElevenLabs TTS/SFX/voice clone proxy | Uses `ELEVENLABS_API_KEY` |
| `fielder-corpus/` | Fielder corpus/taxonomy/stats | Reads from `packages/fielder/src/` |
| `hitem3d/` | Hitem3D 3D generation proxy | Uses `HITEM3D_ACCESS_KEY` + `SECRET_KEY` |
| `list-dirs/` | List directory contents | Filesystem utility |
| `meshy/` | Meshy 3D generation proxy + GLB download | Uses `MESHY_API_KEY` |
| `meshy-export/` | Save 3D models to disk | Filesystem export |
| `open-folder/` | Open folder in OS file explorer | System command |
| `pera-corpus/` | Pera corpus/taxonomy/stats | Reads from `packages/pera/src/` |
| `send-to-photoshop/` | Send images to Photoshop | Inter-app communication |
| `serling-corpus/` | Serling corpus/taxonomy/stats | Reads from `packages/serling/src/` |
| `session/` | Named session save/load | Filesystem-backed |
| `video-analyze/` | Video analysis via Gemini | Uses Gemini API |
| `walter-lore/` | Serve episode lore on demand | Reads from `tools/walter/src/lore/` |

### 7.8 Ideation Engine (`src/lib/ideation/engine/`)

**Purpose:** Core AI pipeline logic for ShawnderMind.

**Key files:**
- `apiConfig.ts` â€” Dual-backend API configuration (AI Studio / Vertex AI)
- `orchestrator.ts` â€” Pipeline stage execution
- `provider/geminiProvider.ts` â€” Gemini API provider
- `conceptlab/characterPrompts.ts` â€” Character generation prompts
- `commit/commitPrompt.ts` â€” Commit stage prompts

**Interactions:** SessionContext calls orchestrator â†’ orchestrator uses geminiProvider â†’ geminiProvider calls buildModelUrl from apiConfig â†’ constructs correct URL for AI Studio or Vertex.

### 7.9 Canvas Infrastructure (`src/hooks/`, `src/components/`)

**Purpose:** Shared canvas behavior and UI components.

**Key files:**
- `src/hooks/useCanvasSession.ts` â€” Shared canvas hook (undo/redo, clipboard, grouping, layouts)
- `src/components/GlobalToolbar.tsx` â€” Standardized top bar
- `src/components/CanvasContextMenu.tsx` â€” Right-click menu
- `src/components/nodes/` â€” Shared node components with resize, compatibility

**Interactions:** Each canvas tool (ShawnderMind, ConceptLab, Gemini Studio, Tool Editor) instantiates `useCanvasSession` with its own `appKey`.

---

## 8. External Dependencies & Integrations

### Runtime Dependencies

| Package | Version | Purpose | Evidence |
|---------|---------|---------|----------|
| next | ^15.5.0 | App framework | `package.json` L17 |
| react / react-dom | ^19.2.0 | UI library | `package.json` L18-19 |
| @xyflow/react | ^12.10.1 | Node-based canvas | `package.json` L13 |
| three | ^0.183.2 | 3D rendering | `package.json` L21 |
| @react-three/fiber | ^9.5.0 | React Three.js bindings | `package.json` L14 |
| @react-three/drei | ^10.7.7 | Three.js helpers | `package.json` L13 |
| dagre | ^0.8.5 | Graph auto-layout | `package.json` L16 |
| zod | ^4.3.6 | Schema validation | `package.json` L22 |
| lucide-react | ^0.468 | Icons | `package.json` L17 |
| clsx | ^2.1.1 | Class names | `package.json` L15 |
| tailwind-merge | ^3.5.0 | Tailwind class merging | `package.json` L20 |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.9.0 | Type checking |
| tailwindcss | ^4.2.0 | CSS framework |
| eslint | ^9.39.4 | Linting |
| postcss | ^8 | CSS processing |

### External API Integrations

| Service | Proxy Route | API Keys | Purpose |
|---------|-------------|----------|---------|
| Google AI (Gemini/Imagen/Veo) | `/api/ai-generate` | `GEMINI_API_KEY` | Text/image/video generation |
| Google AI (Embedding) | `/api/ai-embed` | `GEMINI_API_KEY` | Text embedding |
| Ollama (local) | `/api/ai-local` | None (localhost) | Local LoRA model inference |
| Meshy AI | `/api/meshy` | `MESHY_API_KEY` | Image-to-3D generation |
| Hitem3D | `/api/hitem3d` | `HITEM3D_ACCESS_KEY` + `SECRET_KEY` | 3D generation with portrait models |
| ElevenLabs | `/api/elevenlabs` | `ELEVENLABS_API_KEY` | TTS, SFX, voice cloning |

### Python Dependencies (Training Only)

| Package | Purpose | Evidence |
|---------|---------|----------|
| unsloth | Fast LoRA training | `requirements.txt` |
| transformers | Model loading | `requirements.txt` |
| peft | LoRA adapter | `requirements.txt` |
| torch | PyTorch backend | `requirements.txt` |

---

## 9. Configuration Surface

### Configuration Files

| File | Purpose |
|------|---------|
| `.env.local` | Runtime environment variables (not committed) |
| `.env.example` | Template with all env var names |
| `next.config.ts` | Next.js config (rewrites, transpile packages) |
| `tsconfig.json` | TypeScript config (paths, compiler options) |
| `eslint.config.mjs` | ESLint configuration |
| `postcss.config.mjs` | PostCSS configuration |
| `.gitignore` | Git ignore patterns |

### Environment Variables (Names Only)

| Variable | Required | Context |
|----------|----------|---------|
| `NEXT_PUBLIC_GEMINI_API_KEY` | Yes | Client-side Gemini API key |
| `GEMINI_API_KEY` | No | Server-side Gemini key (preferred) |
| `NEXT_PUBLIC_VERTEX_PROJECT` | No | Vertex AI GCP project |
| `NEXT_PUBLIC_VERTEX_LOCATION` | No | Vertex AI region |
| `NEXT_PUBLIC_VERTEX_API_KEY` | No | Vertex AI API key |
| `MESHY_API_KEY` | No | Meshy 3D generation |
| `HITEM3D_ACCESS_KEY` | No | Hitem3D access key |
| `HITEM3D_SECRET_KEY` | No | Hitem3D secret key |
| `ELEVENLABS_API_KEY` | No | ElevenLabs API |
| `OLLAMA_HOST` | No | Ollama server URL (default: localhost:11434) |
| `SESSIONS_DIR` | No | Filesystem session storage path |
| `CHARACTER_OUTPUT_DIR` | No | Character image output path |
| `SPRITE_LAB_URL` | No | External Sprite Lab URL |
| `SHAWNDERMIND_URL` | No | External ShawnderMind URL |
| `UI_LAB_URL` | No | External UI Lab URL |
| `CONCEPT_LAB_URL` | No | External ConceptLab URL |
| `NODE_ENV` | Auto | Runtime environment |

---

## 10. Risks / Complexity Hotspots

### Large Modules

| File | Lines | Concern |
|------|-------|---------|
| `tools/walter/src/lore/MASTER_ANALYSIS.md` | 2,508 | 499 KB â€” consider splitting or Git LFS |
| `tools/walter/src/Walter.css` | 1,928 | Large CSS file â€” could benefit from CSS modules |
| `src/app/ideation/canvas/nodes/character/CharViewNode.tsx` | 1,562 | Complex node with collapsible panel |
| `src/lib/ideation/context/SessionContext.tsx` | 1,237 | Large context provider â€” consider splitting |
| `src/app/ideation/canvas/FlowCanvas.tsx` | 1,218 | Main canvas with many imports |
| `tools/walter/src/store.ts` | ~680 | External store with many actions |
| `tools/walter/src/agentEngine.ts` | ~600+ | Complex agent logic with physical violation detection |

### Data Size Risk

The three writer packages contain ~271 MB of corpus/taxonomy JSON that is NOT in Git LFS. Each git commit touching these files will duplicate the full content in git history. Additionally, ~18 copies of `tokenizer.json` (~16 MB each) exist across training checkpoint directories.

### Tight Coupling

- `agentEngine.ts` directly imports from all three writer packages (serling, fielder, pera). Adding a new writer requires modifying this file.
- `FlowCanvas.tsx` imports from many separate node files, compat system, session context, layout store, and shared node types.

### Duplication

- Writer packages share identical module structure. Code in `corpus/types.ts`, `taxonomy/types.ts`, `retrieval/vectorStore.ts`, `retrieval/embeddings.ts` is likely near-identical across all three. A shared base package could reduce maintenance.
- Two `styleStore.ts` files with different backends (IndexedDB vs localStorage).

### Missing Test Coverage

Zero test files in the entire repository. No unit tests, integration tests, or E2E tests. This is acknowledged in `TASKS.md` L92.

---

## 11. Open Questions / Ambiguous Areas

1. **Writer package deduplication**: Should the shared structure (corpus types, vector store, embeddings) be extracted into a base package?
2. **Git LFS migration**: When will the ~271 MB corpus/taxonomy JSON files be migrated to Git LFS?
3. **Walter ML integration**: TASKS.md lists "ML integration â€” image generation from shot descriptions" as Later. How will this integrate with the current staging room?
4. **Sprite Lab / UI Lab**: Both are listed as non-functional (Landing page / Workspace UI). Are they still planned?
5. **Windows production build**: TASKS.md L96 mentions a Windows EPERM issue with webpack glob config. Is this blocking production deployment?
6. **External tool rewrites**: `next.config.ts` has rewrites for Sprite Lab, ShawnderMind, UI Lab, ConceptLab as external services, but these appear to be hub-native now. Are the rewrites dead code?
7. **Ollama model loading**: The LoRA models (serling-mind, fielder-mind, pera-mind) are ~24 GB in VRAM. Can they coexist in memory?

---

## 12. Appendix: Evidence Index

| Evidence ID | File | Lines | Description |
|-------------|------|-------|-------------|
| E001 | `package.json` | 1-40 | Root package: workspaces, scripts, dependencies |
| E002 | `next.config.ts` | 1-35 | Next.js config with rewrites and transpile packages |
| E003 | `tsconfig.json` | 1-30 | TypeScript config with workspace path aliases |
| E004 | `run.bat` | 1-55 | Windows launcher: Node check, install, dev server |
| E005 | `src/app/layout.tsx` | 1-23 | Root layout with dark theme and ClientShell |
| E006 | `src/components/ClientShell.tsx` | 1-45 | App shell: Sidebar + WorkspaceRenderer + CommandPalette |
| E007 | `src/lib/registry.ts` | 1-138 | Tool registry with 6 tools and profile filtering |
| E008 | `src/lib/ideation/engine/apiConfig.ts` | 1-112 | Dual-backend API configuration |
| E009 | `src/hooks/useCanvasSession.ts` | 1-60 | Shared canvas session hook |
| E010 | `src/app/ideation/canvas/FlowCanvas.tsx` | 1-60 | ShawnderMind canvas setup |
| E011 | `tools/walter/src/index.tsx` | 1-22 | Walter package entry: WalterShell + WALTER_REGISTRY |
| E012 | `tools/walter/src/types.ts` | 1-278 | All Walter type definitions |
| E013 | `tools/walter/src/store.ts` | 1-100 | Walter external store with session management |
| E014 | `tools/walter/src/agents.ts` | 1-100 | Preset persona definitions (7 agents) |
| E015 | `tools/walter/src/agentEngine.ts` | 1-150 | Agent turn generation and brief compilation |
| E016 | `tools/walter/src/creativeRounds.ts` | 1-80 | 7 creative rounds definition |
| E017 | `tools/walter/src/components/PlanningPage.tsx` | 1-60 | Planning screen |
| E018 | `tools/walter/src/components/WritingRoom.tsx` | 1-80 | Writing room with phase controls |
| E019 | `tools/walter/src/components/StagingRoom.tsx` | 1-60 | Staging room with shot editor |
| E020 | `packages/ai/src/generateText.ts` | 1-107 | Shared Gemini text generation |
| E021 | `packages/ai/src/embedText.ts` | 1-29 | Shared embedding utility |
| E022 | `packages/serling/src/index.ts` | 1-30 | Serling package barrel exports |
| E023 | `packages/fielder/src/index.ts` | 1-32 | Fielder package barrel exports |
| E024 | `packages/pera/src/index.ts` | 1-32 | Pera package barrel exports |
| E025 | `src/app/api/ai-local/route.ts` | 1-95 | Ollama proxy: GET models, POST generate |
| E026 | `src/app/api/ai-embed/route.ts` | 1-117 | Gemini embedding proxy |
| E027 | `src/app/api/serling-corpus/route.ts` | 1-59 | Serling corpus data endpoint |
| E028 | `README.md` | 1-93 | Project overview and quick start |
| E029 | `ARCHITECTURE.md` | 1-100 | Technical architecture documentation |
| E030 | `PROJECT.md` | 1-60 | Project overview and feature list |
| E031 | `SPEC.md` | Full | Feature specifications |
| E032 | `DECISIONS.md` | Full | 31 Architecture Decision Records |
| E033 | `TASKS.md` | Full | Task tracking with health audit cleanup items |
| E034 | `.gitignore` | Full | Ignore patterns including .repo_snapshot/, HEALTH_REPORT.md |

---

*Report generated 2026-03-15 14:36:00 â€” report_id: 20260315_143559*

---

## Master Index

* Snapshot: `.repo_snapshot/repo_snapshot.md`
* Snapshot JSON: `.repo_snapshot/repo_snapshot.json`
* Health Report: `HEALTH_REPORT.md`
* Health Metrics: `.repo_snapshot/health_reports/health_metrics__20260315_143559.json`
* Tasks: `TASKS.md`
* Comprehensive Report: `.repo_snapshot/repo_comprehensive_report.md`
* Master Report: `MASTER_REPO_REPORT.md`