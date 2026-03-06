# Shawnderland OKDO

Unified hub for AI creative tools. One interface, integrated toolsets.

## Tools

| Tool | Purpose | Stack | Status |
|------|---------|-------|--------|
| AI Sprite Lab | Sprites, pixel art, animations, tilesets, SFX | Next.js, Gemini, FFmpeg | Landing page |
| ShawnderMind | 8-stage AI ideation pipeline with node canvas | React, @xyflow/react, Gemini | Functional |
| AI UI Lab | Game UI generation, layout planning | PySide6, FastAPI, Gemini | Workspace UI |
| AI ConceptLab | Character/weapon design, image gen, turnaround views | React, @xyflow/react, Imagen 4/Gemini | Functional |
| Gemini Studio | Consumer AI media generation (image + video) | React, @xyflow/react, Imagen 4/Gemini/Veo | Functional |
| Walter Storyboarding | Arc-guided video storyboarding | Electron, React, Zustand | Launcher only |
| Tool Editor | Visual tool designer with exportable AI-readable specs | React, @xyflow/react | Functional |

## ShawnderMind Features

- Full 8-stage pipeline: Seed, Normalize, Diverge, Critique/Salvage, Expand, Converge, Commit, Iterate
- Interactive mode (step-by-step) and Automated mode (auto-run full pipeline)
- PackedPipelineNode: collapsed single-node view of the entire pipeline
- Group/Pack nodes: select multiple nodes and collapse into a single pack node with dynamic output handles
- Thinking Tiers: Quick (flash-lite), Standard (flash), Deep (flash-thinking-exp) model selection
- Influence nodes: text, document, image, link, video, emotion, persona — merged into structured prompt blocks
- Prompt injection nodes: Preprompt (prepend context) and PostPrompt (append directives)
- Node compatibility validation: real-time error banners for incompatible connections
- Session save/load with named sessions
- Context menu and ToolDock aligned categories with search
- Lock/Unlock icon for ToolDock pinning

## AI ConceptLab Features

- Character Node: hybrid design node with collapsible attribute panel (identity, clothing, gear, style)
- Weapon Node: hybrid design node with component controls (receiver, barrel, stock, etc.)
- Turnaround Node: multi-view generation (front, back, side, 3/4) from Character or Weapon images
- Imagen 4 for primary image generation, Gemini image models for reference-based views
- Model selector: Gemini 3 Pro (high fidelity) or Gemini Flash Image (fast iteration)
- All ConceptLab nodes live on the same unified canvas as ShawnderMind nodes

## Gemini Studio Features

- Point-and-shoot image and video generation with multi-model support
- Imagen 4, Gemini 3 Pro, Gemini Flash Image for images; Veo for video
- Prompt node, image reference node, output viewer node
- Standalone canvas with useCanvasSession, GlobalToolbar, CanvasContextMenu

## Unified Canvas Features

All canvas-based tools share consistent interface components:

- GlobalToolbar: undo/redo, duplicate, zoom-to-fit, auto-layout, export selected, save/import layout, clear canvas
- CanvasContextMenu: copy, paste, delete, pin, group/ungroup, expand/collapse, edge-cutting (right-click drag)
- useCanvasSession: shared hook providing state management for all canvas features
- Keyboard shortcuts: Ctrl+Z/Y/D/C/V, Delete

## Tool Editor Features

- Five element types: Generic Node, Window Panel, Frame, Button, Text Box, Dropdown
- Drag-and-drop from template dock onto canvas
- Property panel: rename, describe, resize, recolor, add/remove inputs/outputs/dropdowns
- Edge-based resizing on all elements
- Configurable grid snapping (5px–100px)
- Export All / Export Selected as AI-readable JSON
- Save/import layouts (localStorage + file upload)
- Undo/Redo, duplicate, alignment tools

## Dual-Backend API

All Google AI calls support both AI Studio and Vertex AI backends:
- **AI Studio** (default): `NEXT_PUBLIC_GEMINI_API_KEY` in `.env.local`
- **Vertex AI** (optional): `NEXT_PUBLIC_VERTEX_PROJECT`, `NEXT_PUBLIC_VERTEX_LOCATION`, `NEXT_PUBLIC_VERTEX_API_KEY`

## Status

Hub scaffold running. ShawnderMind ideation canvas functional with full pipeline,
influence merging, thinking tiers, prompt injection nodes, and session persistence.
AI ConceptLab functional with character, weapon, and turnaround nodes. Gemini Studio
functional with multi-model image and video generation. Tool Editor functional with
save/import, undo/redo, and full element set. All canvas tools share unified toolbar,
context menu, and canvas session hook. Remaining tools at landing page or workspace
UI stage.
