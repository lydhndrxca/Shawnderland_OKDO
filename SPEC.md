# SPEC — Shawnderland OKDO

## Overview

A Next.js hub application that unifies five AI creative tools under one
interface. The hub provides navigation, proxy routing to tool backends,
a shared design system, and a node-canvas home screen.

## Core Requirements

- Node-canvas home page showing all tools as interactive ReactFlow nodes
- Sidebar navigation with tool list
- Command palette (Ctrl+K) for quick navigation
- Workspace keep-alive: visited tools stay mounted, preserving state
- Proxy routing to tool backends via Next.js rewrites
- Shared design system (@shawnderland/ui)
- Consistent dark theme across all tool views

## Tool Integration

Each tool runs as its own service in its own repository.
The hub proxies API calls and hosts native React UI for each tool.
Walter Storyboarding is Electron-only (desktop launcher page in hub).

## Pending

- Full tool workspace UIs (currently placeholder landing pages)
- Sub-tool navigation for Sprite Lab, UI Lab, ConceptLab
- Cross-tool data flow wiring on the hub canvas
