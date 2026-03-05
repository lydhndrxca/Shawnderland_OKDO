# Shawnderland OKDO

Unified hub for AI creative tools. One interface, integrated toolsets.

## Tools

| Tool | Purpose | Stack | Status |
|------|---------|-------|--------|
| AI Sprite Lab | Sprites, pixel art, animations, tilesets, SFX | Next.js, Gemini, FFmpeg | Landing page |
| ShawnderMind | 8-stage AI ideation pipeline with node canvas | React, @xyflow/react, Gemini | Functional |
| AI UI Lab | Game UI generation, layout planning | PySide6, FastAPI, Gemini | Workspace UI |
| AI ConceptLab | Image gen, multiview, character/weapon design | React, @xyflow/react, Imagen/Gemini | Landing page |
| Walter Storyboarding | Arc-guided video storyboarding | Electron, React, Zustand | Launcher only |
| Tool Editor | Visual tool designer with exportable AI-readable specs | React, @xyflow/react | Functional |

## ShawnderMind Features

- Full 8-stage pipeline: Seed, Normalize, Diverge, Critique/Salvage, Expand, Converge, Commit, Iterate
- Interactive mode (step-by-step) and Hands-Free mode (auto-run full pipeline)
- PackedPipelineNode: collapsed single-node view of the entire pipeline for hands-free runs
- Group/Pack nodes: select multiple nodes and collapse into a single pack node with dynamic output handles
- Thinking Tiers: Quick (flash-lite), Standard (flash), Deep (flash-thinking-exp) model selection
- Influence nodes: text, document, image, link, video, emotion, persona — merged into structured prompt blocks
- Context menu and ToolDock aligned categories
- Lock/Unlock icon for ToolDock pinning

## Tool Editor Features

- Three element types: Generic Node, Window Panel, Frame
- Drag-and-drop from template dock onto canvas
- Property panel: rename, describe, resize, recolor, add/remove inputs/outputs/dropdowns
- Configurable grid snapping (5px–100px)
- Export All / Export Selected as AI-readable JSON (dimensions, connections, descriptions)

## Status

Hub scaffold running. ShawnderMind ideation canvas functional with full pipeline,
influence merging, and thinking tiers. Tool Editor functional with node/window/frame
templates and JSON export. Remaining tools at landing page or workspace UI stage.
