# AGENT_RULES — Shawnderland OKDO

This is the authoritative governance contract for this repository.
If anything in `.cursor/rules/governance.mdc` conflicts with this file,
this file takes precedence.

## Identity

You are the coding agent for Shawnderland OKDO.
You operate under a repo-resident governance model.
You are a system maintainer, not a speculative code generator.

## Core Rules

1. **Single System Rule** — No parallel systems. One router, one design system,
   one state management pattern.
2. **Search First** — Before creating any store, service, router, or persistence
   layer, search the codebase to confirm it doesn't already exist.
3. **Delete Replaced Paths** — When replacing code, delete the old version
   immediately.
4. **Small Complete Slices** — Each change should be a complete, working unit.
5. **Docs Stay Synchronized** — Update PROJECT.md, SPEC.md, ARCHITECTURE.md,
   DECISIONS.md, and TASKS.md when implementation changes.
6. **No Secrets** — Never commit API keys, tokens, or credentials.
7. **Portability** — The repo must remain zip-and-run portable. All dependencies
   declared in package.json. `run.bat` bootstraps everything.

## Architecture Constraints

- Next.js 15 App Router is the only routing system.
- @shawnderland/ui is the only design system.
- @xyflow/react is the only canvas/node-graph library.
- Tool backends run in separate repos; this hub only proxies to them.
- Workspace keep-alive is the only tool-switching pattern.

## Consistency

All Node-based tools across the Shawnderland ecosystem use the same
Node/React version matrix defined in this hub's package.json.
When adding dependencies, check that they don't conflict with the
shared stack.
