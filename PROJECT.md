# Shawnderland OKDO

Unified hub for AI creative tools. One interface, integrated toolsets.

## Tools

| Tool | Purpose | Stack | Status |
|------|---------|-------|--------|
| AI Sprite Lab | Sprites, pixel art, animations, tilesets, SFX | Next.js, Gemini, FFmpeg | Landing page |
| ShawnderMind | 8-stage AI ideation + character/3D/audio pipeline | React, @xyflow/react, Gemini, Meshy, Hitem3D, ElevenLabs | Functional |
| AI UI Lab | Game UI generation, layout planning | PySide6, FastAPI, Gemini | Workspace UI |
| AI ConceptLab | Unified canvas (same node set as ShawnderMind) | React, @xyflow/react, Imagen 4/Gemini | Functional |
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
- Creative Director: AI design critique with multi-select Apply Edit and Bold Mode
- Auto-Fidelity: artifact detection + describe-then-regenerate quality restoration
- Quick Generate: Gemini-powered random character invention (full JSON output)
- Three-layer session persistence: localStorage auto-save, IndexedDB, filesystem API
- Context menu and ToolDock with 13 workflow-centric categories (shared with ConceptLab)
- Lock/Unlock icon for ToolDock pinning
- Seed node auto-infers context via Gemini if user doesn't type it

## AI ConceptLab Features

- Unified with ShawnderMind: same node set, ToolDock, context menu, and canvas
- Character Node: hybrid design node with collapsible attribute panel (identity, clothing, gear, style)
- Weapon Node: hybrid design node with component controls (receiver, barrel, stock, etc.)
- Turnaround Node: multi-view generation (front, back, side, 3/4) from Character or Weapon images
- Imagen 4 for primary image generation, Gemini image models for reference-based views
- Model selector: Gemini 3 Pro (high fidelity) or Gemini Flash Image (fast iteration)

## 3D Generation Features

- Meshy Image-to-3D: single/multi-image input, async polling, GLB proxy, filesystem export
- Hitem3D Image-to-3D: full parameter control (model, resolution, polygon count, output format, portrait models)
- 3D Model Viewer: Three.js/R3F rendering with orbit controls, lighting, material toggles
- Export configurable via project settings (output directory)

## Audio Features

- ElevenLabs TTS: text-to-speech with voice/model selection, inline playback
- ElevenLabs SFX: sound effect generation from text prompts
- ElevenLabs Voice Clone: clone voices from audio samples
- Voice Designer: Gemini-powered voice description from character images
- Dialogue Writer: Gemini-powered dialogue line generation from topics
- Voice Script: Gemini-powered narration/dialogue text generation

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

## External API Integrations

| Service | Purpose | Proxy Route |
|---------|---------|-------------|
| Meshy AI | 3D model generation | `/api/meshy` |
| Hitem3D | 3D generation with portrait models | `/api/hitem3d` |
| ElevenLabs | TTS, SFX, voice cloning | `/api/elevenlabs` |
| Google AI | Server-side Gemini/Imagen | `/api/ai-generate` |

All API keys are server-side only — the client calls local proxy routes.

## Status

Hub scaffold running. ShawnderMind and ConceptLab share a unified canvas with
all node categories (ideation pipeline, character, 3D generation, audio, utilities).
Three external API integrations (Meshy, Hitem3D, ElevenLabs) provide 3D model
generation and audio capabilities. Session persistence uses a three-layer strategy
(localStorage, IndexedDB, filesystem). Gemini Studio functional with multi-model
image and video generation. Tool Editor functional with save/import, undo/redo,
and full element set. Remaining tools at landing page or workspace UI stage.
