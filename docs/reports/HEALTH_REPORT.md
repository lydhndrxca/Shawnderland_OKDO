# HEALTH REPORT

| Field | Value |
|-------|-------|
| Report ID | `20260315_143559` |
| Date | 2026-03-15 |
| Overall Health | **YELLOW** |
| Primary Issue Type | Doc Lag |

---

## TOP 3 RISKS

1. **Doc drift (ARCHITECTURE.md, SPEC.md)** — Neither document mentions the three LoRA-trained writer packages (Serling, Fielder, Pera), the Ollama integration, or 8 of the 18 current API routes (ai-embed, ai-local, ai-status, fielder-corpus, list-dirs, pera-corpus, serling-corpus, video-analyze).
2. **Massive data files without Git LFS** — Six corpus/taxonomy JSON files total ~271 MB (largest: `serling/src/taxonomy/decisions.json` at 78.6 MB). Tokenizer JSON files (~16 MB each) are duplicated across LoRA checkpoints. These will bloat git history.
3. **Unpushed changes** — `main` is 2 commits ahead of remote, plus significant uncommitted work (multi-agent writing room, LoRA pipeline, writer packages).

## TOP 3 RECOMMENDED ACTIONS

1. Update ARCHITECTURE.md and SPEC.md to document writer packages, LoRA pipeline, Ollama integration, and all 18 API routes.
2. Add corpus/taxonomy JSON files and training artifacts (tokenizer.json, checkpoint dirs) to `.gitignore` or migrate to Git LFS.
3. Push committed work to remote and commit the multi-agent writing room changes.

---

## RED TRIGGERS

| Check | Status |
|-------|--------|
| Secrets in source | **PASS** — no API keys, tokens, or credentials found in tracked source files; all keys via `process.env` |
| Run entrypoint | **PASS** — `run.bat` exists at repo root; README has Quick Start section with `npm install && npm run dev` |
| Parallel systems | **PASS** — single router (Next.js App Router), single design system (@shawnderland/ui), no duplicate state managers |
| Output dirs tracked in git | **PASS** — `git ls-files` returned nothing for `.repo_snapshot/`, `dist/`, `build/`, `output/`, `saved-sessions/`, `character-output/` |

## YELLOW TRIGGERS

| Check | Status | Details |
|-------|--------|---------|
| Doc drift | **FLAG** | ARCHITECTURE.md lists 10 API routes; actual count is 18. Missing: ai-embed, ai-local, ai-status, fielder-corpus, list-dirs, pera-corpus, serling-corpus, video-analyze. No mention of @shawnderland/serling, @shawnderland/fielder, @shawnderland/pera packages, LoRA training pipeline, or Ollama integration. SPEC.md similarly lacks writer package documentation. |
| README accuracy | **PASS** | README correctly lists Walter as "Functional", Quick Start is accurate, env vars table is correct. |
| DECISIONS coverage | **PASS** | ADR 005 properly marked SUPERSEDED. All major deps documented (ADRs 001–031). |
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
| SPEC.md | **Drifted** — missing writer packages, LoRA pipeline, Ollama, 5 new API routes |
| ARCHITECTURE.md | **Drifted** — missing writer packages, LoRA pipeline, 8 API routes not listed |
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
- `src/lib/styleStore.ts` — IndexedDB-backed
- `src/lib/styles/styleStore.ts` — localStorage-backed

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

1. **Fix doc drift** — Update ARCHITECTURE.md to list all 18 API routes and document writer packages. Update SPEC.md to describe LoRA training pipeline and writer agent system.
2. **Gitignore training artifacts** — Add patterns for `**/training/*-gguf/`, `**/training/*-lora-adapter/`, `**/training/*-merged-16bit/`, `**/training/checkpoint-*/` to prevent tokenizer.json and model files from entering git.
3. **Evaluate Git LFS** — For corpus/taxonomy JSON files that must be version-controlled, migrate to Git LFS. Consider if these belong in a separate data repository.
4. **Push to remote** — Commit current work and push to sync with origin.

---

> Health audit complete. Grade: **YELLOW**. Found 2 yellow triggers (doc drift, large files).
