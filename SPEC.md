# SPEC — Shawnderland OKDO

## Overview

A Next.js hub application that unifies AI creative tools under one
interface. The hub provides navigation, proxy routing to tool backends,
a shared design system, a node-canvas home screen, and hub-native tools.

## Core Requirements

- Node-canvas home page showing all tools as interactive ReactFlow nodes
- Sidebar navigation with tool list
- Command palette (Ctrl+K) for quick navigation
- Workspace keep-alive: visited tools stay mounted, preserving state
- Proxy routing to tool backends via Next.js rewrites
- Shared design system (@shawnderland/ui)
- Consistent dark theme across all tool views

## Tool Integration

Each external tool runs as its own service in its own repository.
The hub proxies API calls and hosts native React UI for each tool.
Walter Storyboarding is Electron-only (desktop launcher page in hub).
Hub-native tools (Tool Editor) live entirely inside this repo.

## ShawnderMind — Ideation Canvas

### Pipeline

8-stage AI ideation pipeline: Seed, Normalize, Diverge, Critique/Salvage,
Expand, Converge, Commit, Iterate. Each stage is a node on the canvas with
its own prompt logic executed via the Gemini provider.

### Modes

- **Interactive** (default): user steps through stages one at a time.
- **Hands-Free**: auto-runs the full pipeline from the idea seed, spawning
  a PackedPipelineNode that displays progress as a single collapsed node.

### PackedPipelineNode

A compact representation of the entire pipeline. Shows stage completion
indicators and progress text. Single input handle (from Start) and single
output handle (to downstream nodes). Right-click to expand into individual
stage nodes with auto-layout.

### Group / Pack Nodes

Users can select multiple nodes and group them. When collapsed, child nodes
are hidden and the pack node displays dynamic output handles reflecting
external connections from child nodes (labeled with source node name and
color). Double-click or right-click "Expand" to reveal children with
Dagre auto-layout. "Collapse" re-hides them.

### Thinking Tiers

Selector on the StartNode with three levels:

| Tier     | Gemini Model              | Behavior |
|----------|---------------------------|----------|
| Quick    | gemini-2.0-flash-lite     | Fast, concise results |
| Standard | gemini-2.0-flash          | Balanced (default) |
| Deep     | gemini-2.0-flash-thinking-exp | Maximum creativity, longer processing |

Tier selection propagates to all pipeline stages and influences prompt
directives (conciseness instructions for Quick, depth instructions for Deep).

### Influence Nodes

Modifier nodes that inject context into AI prompts:

- **Text Influence** — free-text injection
- **Document Influence** — uploaded document content
- **Image Influence** — image descriptions
- **Link Influence** — URL-sourced content
- **Video Influence** — video descriptions
- **Emotion Node** — emotional tone modifier
- **Influence Node** — persona/style modifier

All influence inputs are resolved and merged into a structured
`[INFLUENCE DIRECTIVES]` block that is appended to every stage prompt,
instructing the AI to synthesize them holistically.

### Canvas UI

- ToolDock (left panel) with categorized node templates: Pipeline, Inputs,
  Modifiers, Outputs, Control
- Lock/Unlock icon for dock pinning (defaults to locked)
- Context menu (right-click) with categories mirroring ToolDock
- Node inspector, status bar, guided-run overlay, demo overlay
- Custom edge styling (PipelineEdge)

## Tool Editor

### Purpose

A visual meta-tool for designing other tools. Users drag in nodes, windows,
and frames, customize their properties, connect them, and export an
AI-readable JSON spec that can be fed back to Cursor for implementation.

### Element Types

- **Generic Node** — customizable inputs, outputs, and dropdown selectors.
  Configurable label, description, dimensions, color, port sides.
- **Window Node** — panel/viewport representation (3D viewer, display).
  Has a mock title bar and checkerboard viewport. Inputs and outputs.
- **Frame Node** — dashed-border layout frame for arranging UI sections.
  No handles, purely structural.

### Features

- Drag-and-drop from EditorToolDock onto canvas
- Grid snapping with configurable grid size (5px–100px)
- Property panel for editing selected node: label, description, width,
  height, color, inputs (add/remove/rename/side), outputs, dropdowns
  (add/remove options)
- Export dialog: Export All or Export Selected
- JSON export includes: version, grid size, node positions, dimensions,
  colors, labels, descriptions, ports with side info, dropdown options,
  edge connections
- Copy to clipboard or download as file

### Export Format

```json
{
  "version": 1,
  "exportedAt": "ISO timestamp",
  "gridSize": 20,
  "nodes": [
    {
      "id": "...",
      "kind": "generic | window | frame",
      "label": "...",
      "description": "...",
      "position": { "x": 0, "y": 0 },
      "dimensions": { "width": 200, "height": 120 },
      "color": "#607d8b",
      "inputs": [{ "id": "...", "label": "...", "side": "left" }],
      "outputs": [{ "id": "...", "label": "...", "side": "right" }],
      "dropdowns": [{ "id": "...", "label": "...", "options": ["A", "B"] }]
    }
  ],
  "edges": [
    { "id": "...", "source": "...", "sourceHandle": "...", "target": "...", "targetHandle": "..." }
  ]
}
```

## Pending

- Sprite Lab sub-tool navigation and workspace pages
- ConceptLab workspace with workspace selector and generation UI
- Walter web integration (extract timeline/storyboard from Electron)
- Cross-tool data flow wiring on the hub canvas
- Shared Gemini API key management across tools
- Production build and deployment configuration
- Tool Editor: import/load previously exported specs, undo/redo
