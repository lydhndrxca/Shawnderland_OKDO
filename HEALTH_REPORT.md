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
