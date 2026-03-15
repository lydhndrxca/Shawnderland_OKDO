# SPEC — Shawnderland OKDO

## Overview

A Next.js hub application that unifies AI creative tools under one
interface. The hub provides navigation, proxy routing to tool backends,
a shared design system, a node-canvas home screen, and hub-native tools.

## Profile System

Three modes filter which tools appear in the UI:

- **Work** — tools tagged `profiles: ['work']`
- **Personal** — tools tagged `profiles: ['personal']`
- **All** — shows everything (default)

Each tool has a `profiles` array in its registry entry. Profile toggle
lives in the sidebar footer. Filters apply to: sidebar nav, command
palette (Ctrl+K), and home page tool grid. Stored in localStorage.
Default: "All" (shows everything).

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
Walter Storyboard Builder is an extracted workspace package (`@tools/walter`)
in `tools/walter/`, lazy-loaded by the hub via `next/dynamic`.
Hub-native tools (Tool Editor) live entirely inside this repo.

## Dual-Backend API

All Google AI calls route through a centralized `apiConfig.ts` module
that automatically selects AI Studio or Vertex AI based on environment
variables. This provides:

- Uniform URL building for generateContent, predict, predictLongRunning
- Operation polling URLs for long-running tasks (Veo)
- Security allowlist updates for both host patterns
- Backend indicator in the UI (TurnaroundNode shows "Studio" or "Vertex")

## Node Compatibility Validation

A real-time validation system checks all node connections and surfaces
error/warning banners directly below nodes:

- Validates source/target capability matching (image, text, multimodal)
- Flags Imagen models receiving image inputs (text-to-image only)
- Warns when text-only sources feed image-requiring nodes
- Suggests Extract Data node when image→text conversion is needed
- Uses a HOC wrapper so no individual node files need modification

## ShawnderMind — Ideation Canvas

### Pipeline

8-stage AI ideation pipeline: Seed, Normalize, Diverge, Critique/Salvage,
Expand, Converge, Commit, Iterate. Each stage is a node on the canvas with
its own prompt logic executed via the Gemini provider.

### Modes

- **Interactive** (default): user steps through stages one at a time.
- **Automated**: auto-runs the full pipeline from the idea seed, spawning
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

### Prompt Injection Nodes

Two nodes for injecting custom prompts into the data flow:

- **Preprompt Node** — text box whose content is prepended before
  incoming data. Use case: "Keep this in mind when reading what
  follows." The orchestrator reads preprompt text first via
  `resolvePromptInjections()` → `buildPrepromptBlock()`.
- **PostPrompt Node** — text box whose content is appended after
  incoming data. Use case: "Summarize into image." The orchestrator
  appends postprompt text last via `buildPostpromptBlock()`.

Both nodes have input and output handles and can be inserted anywhere
in a node chain.

### Session Persistence

Three-layer auto-persistence:

1. **localStorage** — debounced auto-save of canvas layout and session state
2. **IndexedDB** — named layouts, style presets, file references
3. **Filesystem** — `/api/session` route for named session save/load

Node components use a `_restoreTs` watcher to re-sync local state when
sessions are loaded (handles React `useState` reuse across restores).

### Canvas UI

- ToolDock (left panel) with 13 workflow-centric categories — shared with ConceptLab
- Lock/Unlock icon for dock pinning (defaults to locked)
- Context menu (right-click) with categories mirroring ToolDock
- Node inspector, status bar, guided-run overlay, demo overlay
- Custom edge styling (PipelineEdge)
- Undo/redo, cut edges, snap-to-connect
- Grid lines (`BackgroundVariant.Lines`) — identical in ShawnderMind and ConceptLab

### Creative Director Node

AI-driven design critique node that auto-generates suggestions when connected
to a MainStageViewer. Displays all results inline (no scrolling). Supports
multi-select critiques, "Apply Edit" per suggestion, "Bold Mode" for more
adventurous feedback, and refresh to regenerate critiques.

### Auto-Fidelity (MainStageViewer)

Toggle on the MainStageViewer that detects image artifacts using Gemini
analysis and triggers a describe-then-regenerate restoration pipeline
(Gemini Flash description → Imagen 4 with `REFERENCE_TYPE_SUBJECT`).

### Quick Generate

Generates fully creative random characters using a comprehensive Gemini
prompt (JSON output with name, description, identity, attributes). Uses
`cancelledRef`/`mountedRef` for robust async management.

## Unified Canvas Chrome

All canvas-based tools (ShawnderMind, ConceptLab, Gemini Studio, Tool
Editor) share a consistent interface layer:

- **GlobalToolbar**: standardized top bar with undo/redo, duplicate,
  zoom-to-fit, auto-layout, export selected (JSON), save layout,
  import layout, and clear canvas.
- **CanvasContextMenu**: standardized right-click menu with copy, paste,
  delete, pin/unpin (freeze position), group/ungroup, expand/collapse,
  duplicate, edge deletion (right-click on edge), and a slot for
  per-app custom actions.
- **useCanvasSession**: shared React hook providing the state management
  behind both components — undo/redo history, edge-cutting (right-click
  drag across connections to break them), node grouping, clipboard,
  pin/freeze, layout export/save/import, and keyboard shortcuts
  (Ctrl+Z/Y/D/C/V, Delete).

ShawnderMind uses its own `useFlowSession` (which implements the same
features plus session persistence and pipeline-specific logic). Tool
Editor uses its singleton Zustand-style store but shares GlobalToolbar
and CanvasContextMenu.

## AI ConceptLab — Character & Weapon Design

ConceptLab has its own standalone canvas powered by `useCanvasSession`.
ConceptLab-specific nodes (Character, Weapon, Turnaround) also appear
in the ShawnderMind ToolDock for cross-tool use on the ideation canvas.

### Character Node

Hybrid node with a main body (name, description, generate button) and a
collapsible side panel containing:

- Identity section: age, race, gender, build dropdowns
- 14 attribute categories (headwear, outerwear, top, legwear, footwear,
  gloves, facegear, utility rig, back carry, hand prop, accessories,
  color accents, detailing, pose) — each with common/rare options and
  custom text input
- Randomize All and Extract Attributes (from generated image) buttons

Uses Imagen 4 for primary generation, Gemini Flash for text extraction.

### Weapon Node

Hybrid node with main body and collapsible side panel containing:

- 8 component fields (receiver, barrel, handguard, stock, magazine,
  muzzle, optic, underbarrel)
- Material finish and condition dropdowns
- Extract from Image functionality

Uses Imagen 4 for primary generation, Gemini Flash for text tasks.

### Turnaround Node

Takes a reference image from a connected Character or Weapon node and
generates multi-view sheets (front, back, side, 3/4, top, bottom).

- Model selector: Gemini 3 Pro (higher fidelity) or Gemini Flash Image (faster)
- Backend indicator shows AI Studio or Vertex AI
- Dynamic view tabs based on source node type

## Tool Editor

### Purpose

A visual meta-tool for designing other tools. Users drag in elements,
customize their properties, connect them, and export an AI-readable
JSON spec that can be fed back to Cursor for implementation.

### Element Types

- **Generic Node** — customizable inputs, outputs, and dropdown selectors
- **Window Node** — panel/viewport representation with mock title bar
- **Frame Node** — dashed-border layout frame (no handles)
- **Button** — clickable button element
- **Text Box** — text input element
- **Dropdown Menu** — standalone dropdown selector

### Features

- Drag-and-drop from EditorToolDock onto canvas
- Edge-based resizing on all elements (grab edges to resize)
- Grid snapping with configurable grid size (5px–100px)
- Property panel for editing selected element
- Export dialog: Export All or Export Selected
- Save layouts to localStorage with named saves
- Import layouts via file upload or paste JSON
- Undo/Redo (Ctrl+Z/Y), Duplicate (Ctrl+D)
- Alignment tools (left/right/top/bottom/center, distribute H/V)
- Labels on connections (editable, included in export)
- Zoom-to-fit button
- Image placeholder node

## Gemini Studio — AI Media Generation

Consumer-friendly point-and-shoot AI media generation with every
available Google AI model. Has its own canvas powered by
`useCanvasSession`, `GlobalToolbar`, and `CanvasContextMenu`.

### Node Types

- **Prompt Node** — text prompt input
- **Image Reference Node** — image upload for reference-based generation
- **Image Gen Node** — multi-model image generation (Imagen 4, Gemini 3
  Pro, Gemini Flash Image) with model selector
- **Video Gen Node** — Veo-based video generation with operation polling
- **Output Viewer Node** — result display with export

### Features

- Model selector per generation node
- Reference-based editing (image + text prompt)
- Right-click export on generated images
- All models routed through dual-backend `apiConfig.ts`

## 3D Generation Nodes

Two providers for image-to-3D model generation:

### Meshy Image-to-3D

- Single or multi-image input (front/back/side views)
- Server-side proxy (`/api/meshy`) with GLB download proxy
- Async polling with progress indicator
- Export to local filesystem with configurable output directory

### Hitem3D Image-to-3D

- Full parameter control: generation type, AI model, resolution, polygon count, output format
- Single/multi-image input with multi-view bitmap
- Portrait-specialized models (scene-portrait v1.5/v2.0/v2.1)
- Staged texturing (geometry first, then texture separately — v1.5 only)
- Credit cost display based on selected options

### 3D Model Viewer

- Three.js / React Three Fiber / Drei rendering
- GLB models fetched through server proxy → local `blob:` URLs
- Orbit controls, lighting, material toggles
- `ViewerErrorBoundary` for graceful error handling

## Audio Nodes

### ElevenLabs TTS

- Voice and model selection with settings (stability, similarity, style)
- Multiple output formats (MP3, PCM, Opus)
- Inline audio playback

### ElevenLabs SFX

- Text prompt → sound effect generation
- Duration and prompt influence controls

### ElevenLabs Voice Clone

- Upload audio samples to create cloned voices
- Voice name and description fields
- Lists existing voices for selection

### Voice Designer (Gemini)

- Analyzes character image to write a detailed voice casting description
- Feeds into ElevenLabs TTS for voice prototyping

### Dialogue Writer (Gemini)

- Generates spoken dialogue lines from a topic/scenario description
- Feeds into ElevenLabs TTS for character voice generation

### Voice Script (Gemini)

- Generates narration or dialogue text based on mode, tone, context

## Canvas Unification

ShawnderMind and ConceptLab share the same node set, ToolDock categories,
context menu, and canvas background. Both render all 13 workflow-centric
categories from `ALL_DOCK_CATEGORIES` in `sharedNodeTypes.ts`.

## External API Integrations

| Service | Route | Keys | Purpose |
|---------|-------|------|---------|
| Google AI | `/api/ai-generate` | `GEMINI_API_KEY` | Server-side image generation/editing |
| Google AI | `/api/ai-embed` | `GEMINI_API_KEY` | Text embedding (gemini-embedding-001) |
| Ollama | `/api/ai-local` | None (localhost) | Local LoRA model inference |
| Meshy AI | `/api/meshy` | `MESHY_API_KEY` | 3D model generation |
| Hitem3D | `/api/hitem3d` | `HITEM3D_ACCESS_KEY`, `HITEM3D_SECRET_KEY` | 3D generation with portrait models |
| ElevenLabs | `/api/elevenlabs` | `ELEVENLABS_API_KEY` | TTS, SFX, voice cloning |

All keys are server-side only — the client calls local proxy routes.
Ollama runs locally and requires no API key.

## Walter Storyboard Generator — Multi-Agent AI Episode Planning

Three-screen collaborative episode planning tool with multi-agent AI writing
room. Uses ShawnderMind visual theme (#09090b base, #6c63ff accent).

### Three-Screen Workflow

1. **Planning Page** — Gather creative constraints: episode length, mood/vibe,
   seasonal/date options, character focus, unique story elements, locations,
   time of day, final notes. "Send to Producer" or "Randomize & Send" actions.
2. **Writing Room** — Collaborative AI chat environment where agent personas
   (Producer, Writer, Director, Cinematographer) discuss and develop the episode.
   Phase-based progression: briefing → writing → directing → approval → pitch.
   User can interact, guide discussion, and approve the final pitch.
3. **Staging Room** — Timeline-based production breakdown with three levels:
   Story Arc phases, Story Elements, and individual Shots. All fields are
   directly editable. Feedback can be sent back to the writing room.

### Agent / Persona System

- 7 preset personas: Producer (IP guardian), Writer, Director, Cinematographer,
  Rod Serling (LoRA-trained), Nathan Fielder (LoRA-trained), Joe Pera (LoRA-trained)
- Each persona has deep research-driven creative profiles (not shallow prompts)
- LoRA-trained personas use corpus retrieval (RAG) and optional local Ollama
  voice refinement for stylistically accurate output
- Custom persona creation: pick a role, name a creative reference (e.g. "Wes
  Anderson"), AI researches and builds a full creative persona profile
- Personas stored in localStorage, survive sessions

### Creative Rounds

7 structured writing rounds drive the conversation:

1. **Premise** — Theme and human truth (writer + producer)
2. **Opening Frame** — First composed visual (writer + director + cinematographer)
3. **The Strange Thing** — Inciting anomaly (all agents)
4. **Walter's Response** — Character reaction (writer + director)
5. **The Turn** — Story pivot or escalation (all agents)
6. **Final Frame** — Closing visual moment (writer + director + cinematographer)
7. **Shot Planning** — Per-shot breakdown (director + cinematographer)

Each round has configurable turn limits, agent pools, and corpus hints for
RAG-augmented context. Locked decisions accumulate across rounds.

### Producer Orchestration

The Producer compiles standardized briefs from planning inputs, presents to
the creative team, monitors discussions, mediates disagreements, tracks
requirement compliance, and pitches the final episode to the user.

The Producer maintains an `episodeState` object tracking:
- Creator brief, premise, runtime target
- Opening hook, strange event, development, key visual moment, ending beat
- Theme/feeling, practical concerns, unresolved questions
- Checkpoint progression: none → premise-lock → visual-lock → ending-lock → production-sanity

### Physical Violation Detection

The agent engine enforces miniature figure constraints via regex patterns
applied to all agent responses. Violations (e.g., "holds an object",
"picks up", "sprints", "waves") are flagged and agents are instructed to
rephrase. Quoted text within agent responses is stripped before checking
to prevent false positives when agents discuss prohibited actions.

### Walter Brain (Canon Memory System)

Persistent localStorage database (`walterBrain.ts`) storing:

- **Canonical characters**: Walter, Rusty, Sam, The Dogs — with descriptions,
  behavior, voice traits, relationships, typical uses
- **Locations**: front yard, house exterior, trailer, truck, street, trees,
  christmas village — with common shot suggestions
- **Lore rules**: tone, metaphysical, theme, continuity constraints
- **28 archived episodes** from real Gemini video analysis

All AI generation injects full Walter Brain context for canon-aware output.

### Session Management

Full save/open/save-as: all project state (planning inputs, writing room
history, agent selections, story outputs, staging breakdowns, manual edits)
persists in localStorage. Multiple sessions supported.

### One-Sheet Export

Filmmaker-friendly plaintext production plan exported from the Staging Room:

- Episode info, mood, length
- Story arc and element breakdown
- Numbered shot list with framing, characters, location, dialogue, narration, audio
- Production summary: total shots, duration, locations, characters

### Data Model

- **WalterSession**: top-level project containing planning data, producer brief,
  room agents, chat history, room phase, episode state, story arc, story elements, shots
- **PlanningData**: episode constraints and creative direction
- **AgentPersona**: role, name, research data, avatar
- **ChatMessage**: timestamped messages with sender identity and approval flags
- **ProducerEpisodeState**: producer's running state (brief, premise, checkpoints)
- **StoryArcPhase / StoryElement / StagingShot**: three-level staging hierarchy
- **CreativeRound**: round definition with question, agent pool, turn limits, corpus hints

## LoRA-Trained Writer Agent Packages

Three writer packages (`@shawnderland/serling`, `@shawnderland/fielder`,
`@shawnderland/pera`) provide deep creative persona support for the Walter
Writing Room. Each package has an identical architecture:

### Corpus & Taxonomy

Each writer has a curated corpus of source material (essays, interviews,
scripts, lectures, narrations) chunked and indexed for retrieval-augmented
generation (RAG). A taxonomy of creative decisions maps patterns from the
writer's body of work (narrative choices, structural patterns, thematic
tendencies) organized by category and episode.

### Retrieval Pipeline

1. Agent engine determines the active persona and writing phase
2. `get*Context()` builds a retrieval query from the current conversation
3. Corpus chunks and taxonomy decisions are retrieved via cosine similarity
4. Retrieved context is injected into the agent's system prompt
5. Gemini generates the response with full contextual awareness

### Voice Refinement & Local Models

Each writer has a LoRA fine-tuned model (Mistral-Nemo-Base-2407-bnb-4bit)
trained on style-matched input/output pairs. The training pipeline:

1. **Corpus generation** — `.mjs` scripts scrape and chunk source material
2. **Taxonomy generation** — AI analyzes corpus to extract creative patterns
3. **Training pair generation** — Pairs of (prompt, stylistically-accurate response)
4. **LoRA training** — `train_*.py` using Unsloth for fast fine-tuning
5. **GGUF conversion** — `convert_to_gguf.py` converts adapter to GGUF format
6. **Ollama registration** — `export_to_ollama.py` registers models with Ollama

Registered models (`serling-mind`, `fielder-mind`, `pera-mind`) are available
via `/api/ai-local` for optional voice refinement post-processing.

### Embedding Support

`@shawnderland/ai` provides `embedText()` and `embedTexts()` which call
`/api/ai-embed` (Gemini `gemini-embedding-001`) for vector embeddings
used by the retrieval pipeline.

## Pending

- Sprite Lab sub-tool navigation and workspace pages
- Cross-tool data flow wiring on the hub canvas
- Production build and deployment configuration
