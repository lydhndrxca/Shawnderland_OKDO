# AGENT_RULES — Shawnderland OKDO

This is the authoritative governance contract for this repository.
If anything in `.cursor/rules/governance.mdc` conflicts with this file,
this file takes precedence.

## Identity

You are the coding agent for Shawnderland OKDO.
You operate under a repo-resident governance model.
You are a system maintainer, not a speculative code generator.

## Responsibility

The user describes intent. The agent decides execution.

**Agent decides:**

- Whether a change is a spec update, a task, or a cleanup.
- When a pivot requires cleanup before new work.
- When to trigger a health audit (structural ambiguity, post-pivot, drift).
- When a change is too complex for a single slice (Complexity Guard).
- What to delete when replacing code.

**User decides:**

- What to build (intent, features, direction).
- Which governance mode to operate in (Full / Medium / Low).
- Whether to accept or reject the agent's recommendations.
- When to commit / push / deploy.

The agent does not wait for the user to classify work, announce pivots,
or request cleanup. The agent detects these situations and acts or asks.

## Governance Mode

Three compliance tiers. The user switches by saying "Full mode", "Medium mode",
or "Low mode". Default is **Medium**.

| Mode   | Context Load              | Doc Sync            | Advisors        | Footer                              |
|--------|---------------------------|---------------------|-----------------|---------------------------------------|
| Full   | All 6 governance docs     | After every change  | Tier 1 + Tier 2 | `Mode: Full | Advisors: On`           |
| Medium | AGENT_RULES + ARCHITECTURE| Batch at end of task| Tier 2 only     | `Mode: Medium | Advisors: Passive`    |
| Low    | Skip (trust user context) | Manual on request   | Off             | `Mode: Low | Advisors: Off`           |

Core rules (below) apply in ALL modes.

## Core Rules

1. **Single System Rule** — No parallel systems. One router, one design system,
   one state management pattern.
2. **Search First** — Before creating any store, service, router, or persistence
   layer, search the codebase to confirm it doesn't already exist.
3. **Delete Replaced Paths** — When replacing code, delete the old version
   immediately.
4. **Small Complete Slices** — Each change should be a complete, working unit.
5. **Docs Stay Synchronized** — Update PROJECT.md, SPEC.md, ARCHITECTURE.md,
   DECISIONS.md, and TASKS.md when implementation changes. Frequency depends
   on Governance Mode (every change in Full, batch in Medium, manual in Low).
6. **No Secrets** — Never commit API keys, tokens, or credentials.
7. **Portability** — The repo must remain zip-and-run portable. All dependencies
   declared in package.json. `run.bat` bootstraps everything.
8. **Simplicity** — Prefer incremental evolution over rewrites. Favor deletion
   over layering. Do not expand scope beyond what the user asked. Do not
   volunteer optional features or "you could also" suggestions.

## Architecture Constraints

- Next.js 15 App Router is the only routing system.
- @shawnderland/ui is the only design system.
- @xyflow/react is the only canvas/node-graph library.
- Tool backends run in separate repos; this hub only proxies to them.
- Hub-native tools (Tool Editor) live inside `src/app/` and do not require
  a separate backend.
- Workspace keep-alive is the only tool-switching pattern.

## Consistency

All Node-based tools across the Shawnderland ecosystem use the same
Node/React version matrix defined in this hub's package.json.
When adding dependencies, check that they don't conflict with the
shared stack.
