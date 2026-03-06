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
