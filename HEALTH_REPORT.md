# Health Report — Shawnderland OKDO

| Field | Value |
|-------|-------|
| Report ID | `20260311_001400` |
| Date | 2026-03-11 00:14:00 |
| Overall Health | **🔴 Red** |
| Primary Issue Type | **Hygiene** |

---

## Scoring

### RED Triggers

| # | Trigger | Evidence |
|---|---------|----------|
| R1 | **Secrets found in tracked source** | `saved-sessions/test.json` contains patterns matching Google API key (`AIza…`) and AWS-style key (`AKIA…`). File is tracked via Git LFS. Serialized session data embeds the user's `NEXT_PUBLIC_GEMINI_API_KEY` value. |
| R2 | **Output-only directory tracked in git** | `saved-sessions/` contains user-generated session data (100+ MB) committed to the repo via LFS. Verified with `git ls-files -- saved-sessions/`. |

### YELLOW Triggers

| # | Trigger | Evidence |
|---|---------|----------|
| Y1 | **Parallel/duplicate systems** | 5 duplication signals: `flowLayout.ts`, `BaseNode.tsx`, `PipelineEdge.tsx`, `SaveDialog.tsx`, `styleStore.ts` — each exists in 2 locations |
| Y2 | **Doc drift** | Governance docs (ARCHITECTURE.md, SPEC.md, PROJECT.md) have not been updated for: Meshy/Hitem3D/ElevenLabs integrations, 3D gen nodes, audio nodes, Creative Director node, session auto-save, filesystem session API. README.md still missing. |
| Y3 | **Sustained growth >15%** | +36.3% LOC growth (42,339 → 57,712) since last audit on 2026-03-06 |
| Y4 | **Production build fails** | `next build` fails with `EPERM: scandir 'C:\Users\shawn\Application Data'` — Windows junction point issue with webpack globbing. Pre-existing, not code-related. |

---

## Top 3 Risks

1. **Leaked API key in saved-sessions/test.json** — The serialized session data embeds the Gemini API key. This file is committed (via LFS) and pushed to GitHub. The key should be rotated and the file cleaned from git history.

2. **Session data in git** — `saved-sessions/` contains 104 MB of user session data with embedded base64 images and API keys. This should be gitignored, not committed.

3. **Governance doc lag** — 3 major API integrations (Meshy, Hitem3D, ElevenLabs), ~20 new node types, session persistence overhaul, and canvas unification are undocumented in ARCHITECTURE.md, SPEC.md, and PROJECT.md.

---

## Top 3 Recommended Actions

1. **URGENT: Rotate the Gemini API key** and remove `saved-sessions/` from git tracking. Add `saved-sessions/` back to `.gitignore`. Use `git filter-branch` or BFG to clean history if the key is sensitive.

2. **Update governance docs** — Add sections for: Meshy/Hitem3D/ElevenLabs API integrations, 3D gen node subsystem, audio node subsystem, Creative Director, session auto-persistence, filesystem session API.

3. **Consolidate duplicates** — Merge `flowLayout.ts`, `BaseNode.tsx`, `PipelineEdge.tsx` to single locations. Remove orphaned `styleStore.ts` copy. Extract shared `SaveDialog` component.

---

## Findings

### Governance

| Document | Status |
|----------|--------|
| PROJECT.md | ⚠️ Outdated — missing 3D, audio, ElevenLabs, Meshy, Hitem3D, Creative Director |
| SPEC.md | ⚠️ Outdated — same gaps |
| ARCHITECTURE.md | ⚠️ Outdated — missing new subsystems and API routes |
| DECISIONS.md | ⚠️ Outdated — no ADRs for external API integrations or session persistence |
| TASKS.md | ✅ Active — has current/next/later items |
| README.md | ❌ Missing |
| AGENT_RULES.md | ✅ Present |

### Drift & Bloat

- **5 duplication signals** across packages/ui and src/app (flowLayout, BaseNode, PipelineEdge, SaveDialog, styleStore)
- **saved-sessions/** tracked in git with 104 MB of LFS data containing embedded secrets
- **packages/ui/** contains components (BaseNode, PipelineEdge, flowLayout) that appear superseded by src/app versions

### Doc Drift (6 items)

| # | Drift | Evidence |
|---|-------|----------|
| D1 | Meshy API integration undocumented | `src/app/api/meshy/`, `src/lib/ideation/engine/meshyApi.ts`, `src/app/ideation/canvas/nodes/threedgen/` — not in any governance doc |
| D2 | Hitem3D API integration undocumented | `src/app/api/hitem3d/`, `src/lib/ideation/engine/hitem3dApi.ts` — not in any governance doc |
| D3 | ElevenLabs API integration undocumented | `src/app/api/elevenlabs/`, `src/lib/ideation/engine/elevenlabsApi.ts`, `src/app/ideation/canvas/nodes/audio/` — not in any governance doc |
| D4 | Session auto-persistence undocumented | `SessionContext.tsx` auto-save/load, `useCanvasSession.ts` auto-save, `/api/session` route — not documented |
| D5 | Creative Director node undocumented | `CreativeDirectorNode.tsx` (603 LOC) — not in SPEC or ARCHITECTURE |
| D6 | Canvas unification undocumented | ShawnderMind/ConceptLab sharing ToolDock categories — not documented |

### Cleanup Candidates

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

### Growth & Trajectory

| Metric | 20260306 | 20260311 | Delta | % |
|--------|----------|----------|-------|---|
| Files | 303 | 366 | +63 | +20.8% |
| LOC | 42,339 | 57,712 | +15,373 | **+36.3%** |
| Bytes | 1,487,711 | 2,156,670 | +668,959 | +45.0% |
| Commits | 7 | 15 | +8 | +114% |
| Subsystems | 11 | 13 | +2 | +18.2% |
| API routes | 6 | 11 | +5 | +83% |

**Growth driver:** 3 major API integrations (Meshy, Hitem3D, ElevenLabs) added ~20 new node components, 3 API proxy routes, 3 client libraries, and associated CSS/types.

### Prompt & Template Surface

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

## Proposed Cleanup Plan

### Immediate (this session)
1. ~~Rotate Gemini API key~~ (user action required)
2. Remove `saved-sessions/` from git tracking, add to `.gitignore`
3. Strip embedded secrets from git LFS history

### Short-term (next 2 sessions)
4. Update ARCHITECTURE.md, SPEC.md, PROJECT.md with new integrations
5. Add ADRs to DECISIONS.md for external API strategy and session persistence
6. Create README.md

### Medium-term
7. Consolidate `flowLayout.ts`, `BaseNode.tsx`, `PipelineEdge.tsx` to single locations
8. Remove orphaned `styleStore.ts` duplicate
9. Extract shared `SaveDialog` component
10. Resolve Windows production build issue (webpack glob config)
