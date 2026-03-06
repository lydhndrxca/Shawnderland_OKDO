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
