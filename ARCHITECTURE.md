# ARCHITECTURE — Shawnderland OKDO

## Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript 5
- **Styling:** Tailwind CSS v4 + CSS custom properties
- **Canvas UI:** @xyflow/react 12, dagre
- **Validation:** Zod
- **Icons:** lucide-react

## Run Entrypoint

```
run.bat
```

Checks for Node.js, installs dependencies if needed, clears port 3000,
starts `npm run dev`, waits for server, opens browser.

## Environment Variables

See `.env.example` for all required/optional variables.

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_GEMINI_API_KEY` | Yes (AI Studio) | Google AI Studio API key |
| `NEXT_PUBLIC_VERTEX_PROJECT` | No (Vertex AI) | GCP project ID |
| `NEXT_PUBLIC_VERTEX_LOCATION` | No (Vertex AI) | GCP region (e.g. us-central1) |
| `NEXT_PUBLIC_VERTEX_API_KEY` | No (Vertex AI) | Vertex AI API key |
| `GEMINI_API_KEY` | No | Server-side Gemini key (preferred over NEXT_PUBLIC) |
| `MESHY_API_KEY` | No | Meshy AI 3D model generation |
| `HITEM3D_ACCESS_KEY` | No | Hitem3D 3D generation access key |
| `HITEM3D_SECRET_KEY` | No | Hitem3D 3D generation secret key |
| `ELEVENLABS_API_KEY` | No | ElevenLabs TTS, SFX, voice cloning |
| `SESSIONS_DIR` | No | Filesystem session storage (default: `saved-sessions/`) |
| `CHARACTER_OUTPUT_DIR` | No | Character image output (default: `character-output/`) |

## Dual-Backend API Configuration

`src/lib/ideation/engine/apiConfig.ts` is the single source of truth for
all Google AI endpoint routing. It detects which backend to use based on
environment variables and builds URLs accordingly:

- **AI Studio:** `generativelanguage.googleapis.com/v1beta/models/{MODEL}:{METHOD}?key={KEY}`
- **Vertex AI:** `{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{LOCATION}/publishers/google/models/{MODEL}:{METHOD}?key={KEY}`

All consumers import `buildModelUrl()`, `buildOperationUrl()`, or `getApiKey()`
from this module. No other file should construct API URLs directly.

## Project Structure

```
packages/ui/                    @shawnderland/ui design system
  src/canvas/                   PipelineEdge (used by HubCanvas)
  src/                          Button, Input, Select, Textarea, tokens

src/app/
  page.tsx                      Root page (App Router)
  layout.tsx                    Root layout

  ideation/                     ShawnderMind ideation tool
    canvas/
      FlowCanvas.tsx            Main ReactFlow canvas
      useFlowSession.ts         Flow state management (nodes, edges, groups)
      ToolDock.tsx/.css          Left panel with categorized node templates + search
      GlossaryOverlay.tsx/.css   Movable terminology glossary
      GuidedRunOverlay.tsx/.css  Step-by-step guided run UI
      DemoOverlay.tsx/.css       Demo/onboarding overlay
      flowLayout.ts             Dagre auto-layout helper
      compat/
        CompatContext.tsx        React context providing error map to all nodes
        withCompatCheck.tsx      HOC wrapping every node type with error banners
        CompatBanner.css         Error/warning banner styles
      hooks/
        useNodeCompatibility.ts  Hook computing per-node compatibility errors
      edges/
        PipelineEdge.tsx/.css    Custom edge rendering
      nodes/
        nodeRegistry.ts         Node type definitions, metadata, validation
        modelCatalog.ts         Model catalog (Imagen, Gemini, Veo, ConceptLab)
        StartNode.tsx/.css       Start node with mode buttons + thinking tier
        PackedPipelineNode.tsx/.css  Collapsed full-pipeline node
        GroupNode.tsx/.css       Pack/group node with dynamic outputs
        SeedNode.tsx            Seed stage node
        NormalizeNode.tsx       Normalize stage node
        DivergeNode.tsx         Diverge stage node
        CritiqueNode.tsx        Critique stage node
        ExpandNode.tsx          Expand stage node
        ConvergeNode.tsx        Converge stage node
        CommitNode.tsx          Commit stage node
        IterateNode.tsx         Iterate stage node
        ResultNode.tsx/.css     Final result display node
        InfluenceNode.tsx/.css  Persona/style modifier
        EmotionNode.tsx/.css    Emotional tone modifier
        TextInfluenceNode.tsx/.css      Free-text influence
        DocumentInfluenceNode.tsx/.css  Document upload influence
        ImageInfluenceNode.tsx/.css     Image reference influence
        ImageReferenceNode.tsx/.css     Image reference input
        LinkInfluenceNode.tsx/.css      URL link influence
        VideoInfluenceNode.tsx/.css     Video influence
        PrepromptNode.tsx/.css          Preprompt injection node
        PostPromptNode.tsx/.css         PostPrompt injection node
        ExtractDataNode.tsx/.css        Data extraction utility
        CountNode.tsx/.css              Count utility
        TextOutputNode.tsx/.css         Text output node
        ImageOutputNode.tsx/.css        Image output node
        VideoOutputNode.tsx/.css        Video output node
        CharacterNode.tsx/.css          ConceptLab character designer
        WeaponNode.tsx/.css             ConceptLab weapon designer
        TurnaroundNode.tsx/.css         ConceptLab multi-view generator
        BaseNode.tsx/.css               Shared base node component
      nodes/character/                  Character generator nodes (~20)
        CharIdentityNode.tsx            Age, race, gender, build presets
        CharDescriptionNode.tsx         Freeform character description
        CharAttributesNode.tsx          14 attribute groups (text entry, click-to-highlight)
        ExtractAttributesNode.tsx       AI extraction from reference images
        EnhanceDescriptionNode.tsx      AI-enhanced description (two-way modifier)
        GenerateCharImageNode.tsx       Main character image generation (Imagen 4)
        GenerateViewsNode.tsx           Front/back/side multi-view generation
        ReferenceCalloutNode.tsx        Reference image with annotation prompt
        MainStageViewerNode.tsx         Multi-tab image viewer with Auto-Fidelity toggle
        EditCharacterNode.tsx           Text-based image modifications (auto-prompt from attributes)
        CreativeDirectorNode.tsx        AI design critique with Apply Edit
        CharHistoryNode.tsx             Generation history with thumbnails
        ResetCharacterNode.tsx          Clear all character data
        RestoreQualityNode.tsx          Describe-then-regenerate quality pipeline
        SendToPhotoshopNode.tsx         Send images to Photoshop via API
        ShowXMLNode.tsx                 View character config as XML
        QuickGenerateNode.tsx           Gemini-powered random character invention
        ProjectSettingsNode.tsx         Project name and output directory
        CharacterNodes.css              Shared character node styles
        index.ts                        Barrel export
      nodes/threedgen/                  3D generation nodes
        MeshyImageTo3DNode.tsx          Meshy image-to-3D (single/multi-image)
        MeshyModelViewerNode.tsx        3D viewer (Three.js/R3F) with proxy GLB loading
        Hitem3DImageTo3DNode.tsx        Hitem3D image-to-3D with full parameter control
        ThreeDNodes.css                 Shared 3D node styles
        index.ts                        Barrel export
      nodes/audio/                      Audio generation nodes
        ElevenLabsTTSNode.tsx           Text-to-Speech with voice/model selection
        ElevenLabsSFXNode.tsx           Sound effects from text prompts
        ElevenLabsVoiceCloneNode.tsx    Voice cloning from audio samples
        VoiceScriptNode.tsx             Gemini-powered speech text generation
        VoiceDesignerNode.tsx           Gemini-powered voice description from image
        DialogueWriterNode.tsx          Gemini-powered dialogue line generation
        AudioNodes.css                  Shared audio node styles
        index.ts                        Barrel export
    stages/                     Stage-specific UI components
    layout/                     Shell, settings panel, save/open dialogs
    views/                      Lineage graph, evaluation dashboard
    ipc.ts                      Inter-process communication

  concept-lab/                  AI ConceptLab (standalone canvas)
    ConceptLabShell.tsx/.css    Canvas shell with useCanvasSession
    ConceptLabDock.tsx          Node template dock (presets panel)
    nodes/
      WeapBaseNode.tsx          Weapon base design
      WeapComponentsNode.tsx    Weapon component fields
      ConceptLabNodes.css       Shared ConceptLab node styles

  walter/                       Walter Storyboarding (AI storyboard generator)
    WalterShell.tsx/.css        Main shell (topbar + 3-panel layout + timeline)
    store.ts                    External store (projects, beats, shots)
    types.ts                    Shot, Beat, WalterProject types
    arcTemplates.ts             Arc templates (3-Act, Hero's Journey, etc.)
    episodePresets.ts            Episode presets + WALTER_CONTEXT prompt
    aiWriter.ts                 AI pipeline (ideate, critique, breakdown, detail, refine)
    components/
      BeatSidebar.tsx           Left panel: beat list
      ShotGrid.tsx              Center: shot cards by beat
      ShotEditor.tsx            Right panel: shot property editor
      Timeline.tsx              Bottom: timeline segments
      AIWriterPanel.tsx         Multi-step AI storyboard generator
      SceneRefiner.tsx          Per-scene AI rework
      ExportDialog.tsx          CapCut-ready JSON export
      ConceptCard.tsx           AI concept card with scores

  gemini-studio/                Gemini Studio (consumer AI media generation)
    GeminiStudioShell.tsx/.css  Canvas shell with useCanvasSession
    GeminiStudioDock.tsx        Node template dock
    nodes/
      ImageGenNode.tsx          Multi-model image generation
      VideoGenNode.tsx          Veo-based video generation
      PromptNode.tsx            Text prompt input
      ImageRefNode.tsx          Image reference input
      OutputViewerNode.tsx      Result display

  tool-editor/                  Tool Editor (hub-native)
    ToolEditorShell.tsx/.css     Main shell (toolbar + 3-panel layout)
    ToolEditorCanvas.tsx/.css    ReactFlow canvas with grid snapping
    EditorToolDock.tsx/.css      Left panel with draggable templates
    PropertyPanel.tsx/.css       Right panel for editing node properties
    ExportDialog.tsx/.css        Export All / Export Selected dialog
    SaveDialog.tsx              Save layout dialog
    ImportDialog.tsx            Import layout dialog
    useToolEditorStore.ts       Singleton external store (nodes, edges, grid)
    types.ts                    Shared type definitions
    nodes/
      GenericNode.tsx           Customizable node with inputs/outputs/dropdowns
      WindowNode.tsx            Panel/viewport node
      FrameNode.tsx             Layout frame node
      EditorNodes.css           Shared node styles

  ui-lab/                       AI UI Lab workspace
    UILabShell.tsx              Lab shell with tool tabs
    components/                 Generate, extract, remove, plan panels

  api/                          Next.js API routes
    ai-generate/route.ts        Server-side proxy for Google AI Studio
    character-save/route.ts     Save character images to local disk
    elevenlabs/route.ts         Server-side proxy for ElevenLabs API
    hitem3d/route.ts            Server-side proxy for Hitem3D API
    meshy/route.ts              Server-side proxy for Meshy API (incl. GLB proxy)
    meshy-export/route.ts       Save 3D models to local filesystem
    open-folder/route.ts        Open image output folder
    send-to-photoshop/route.ts  Send images to Adobe Photoshop
    session/route.ts            Named session save/load (filesystem-backed)

src/components/                 Hub-level shared components
  ClientShell.tsx               App shell with sidebar + workspace
  WorkspaceRenderer.tsx         Route resolver with keep-alive
  Sidebar.tsx                   Navigation sidebar
  HubCanvas.tsx                 Home screen node canvas
  HomePage.tsx/.css             Hub landing page
  ToolNode.tsx                  Tool card node for hub canvas
  ToolShell.tsx                 Generic tool landing page wrapper
  CommandPalette.tsx            Ctrl+K command palette
  StatusBadge.tsx               Tool status indicator
  GlobalToolbar.tsx/.css        Unified top toolbar (Layout + Export dropdowns)
  CanvasContextMenu.tsx         Unified right-click context menu
  CanvasCommon.css              Shared canvas styles (cut-line overlay, etc.)
  ImageContextMenu.tsx/.css     Image-specific context menu
  CostWidget.tsx/.css           Global API cost tracker (per-app breakdown)
  Toast.tsx/.css                Global toast notification system
  nodes/ui/                     Shared UI element nodes (Button, TextBox, etc.)
  nodes/withNodeResize.tsx      HOC for NodeResizer support

src/hooks/
  useCanvasSession.ts           Shared canvas session hook (undo/redo, edge-cutting, grouping, clipboard, pin, export/save/import)

src/lib/
  registry.ts                   Tool registry (all tools + metadata)
  types.ts                      Shared hub types
  cn.ts                         Tailwind class merge utility
  tool-client.ts                HTTP client for tool backends
  layoutStore.ts                Named layout persistence (save, load, default per app)
  workspace/
    WorkspaceContext.tsx         Workspace routing + keep-alive context
  ideation/
    context/
      SessionContext.tsx         Session state provider + pipeline execution
    state/
      sessionTypes.ts           Session types (ThinkingTier, SessionSettings)
      sessionStore.ts           Persistent session storage
      sessionSelectors.ts       Session data selectors
    engine/
      apiConfig.ts              Dual-backend API config (AI Studio + Vertex AI)
      orchestrator.ts           Pipeline orchestration + prompt building
      stages.ts                 Stage ID definitions
      schemas.ts                Zod schemas for stage outputs
      generationLog.ts          Generation logging + research export
      nodeCompatibility.ts      Node connection validation rules
      provider/
        geminiProvider.ts       Gemini API client with tier-based model selection
        mockProvider.ts         Mock provider for testing
        costTracker.ts          Token/cost tracking
        types.ts                Provider interface types
      meshyApi.ts               Meshy API client (via /api/meshy proxy)
      hitem3dApi.ts             Hitem3D API client (via /api/hitem3d proxy)
      elevenlabsApi.ts          ElevenLabs API client (via /api/elevenlabs proxy)
      conceptlab/
        imageGenApi.ts          Imagen 4 + Gemini image generation helpers
        characterPrompts.ts     Character attribute definitions + prompt builders
        weaponPrompts.ts        Weapon component definitions + prompt builders
      prompts/                  Prompt templates and pack loading
      diverge/                  Diverge stage: lenses, portfolios, dedup, quotas
      expand/                   Expand stage: prompts, section regen, merge
      critique/                 Critique stage: rubric, salvage operators
      converge/                 Converge stage: scoring, stability
      commit/                   Commit stage: prompts, templates, export
      culture/                  Cross-cultural mode: prompts, packs, anti-exoticism
      lineage/                  Idea lineage graph types + materialization
      eval/                     Evaluation: metrics, regression, smoke tests
      security/                 Sanitization, allowlists, prompt guards
  ui-lab/
    api.ts                      UI Lab API client
    types.ts                    UI Lab types
    UILabContext.tsx             UI Lab state provider
```

## Proxy Routing

| Hub Path | Backend |
|----------|---------|
| /api/tools/sprite-lab/* | localhost:4001 |
| /api/tools/ideation/* | localhost:5173 |
| /api/tools/ui-lab/* | localhost:4003 |
| /api/tools/concept-lab/* | localhost:5174 |

Overridable via env vars: SPRITE_LAB_URL, SHAWNDERMIND_URL, UI_LAB_URL, CONCEPT_LAB_URL.

## Workspace Keep-Alive

The WorkspaceRenderer mounts a panel for each visited path. Only the active
panel is visible; inactive panels remain in the DOM to preserve React state,
scroll position, and in-flight requests.

## State Management Patterns

- **ShawnderMind**: React Context (SessionContext) for session state +
  useFlowSession hook for canvas flow state. Global window functions
  for cross-component communication (e.g., `__spawnPackedPipeline`,
  `__getFlowSnapshot`, `__triggerGroupExpand`).
- **Gemini Studio / ConceptLab**: useCanvasSession shared hook for
  canvas state (undo/redo, edge-cutting, grouping, clipboard, pin,
  export/save/import). No React Context needed.
- **Tool Editor**: Singleton external store (useToolEditorStore) with
  useSyncExternalStore. No React Context — the store is a module-level
  singleton accessed via hook. GlobalToolbar and CanvasContextMenu
  map to store actions.
- **Walter**: Singleton external store (`useWalterStore`) with
  `useSyncExternalStore`. Projects, beats, shots persisted to localStorage.
  AI Writer calls Gemini via `generateText()` from `imageGenApi.ts`.
- **UI Lab**: React Context (UILabContext).
- **Hub**: WorkspaceContext for navigation and keep-alive.

## Unified Canvas Chrome

All canvas-based tools share two UI components for consistent behavior:

- **GlobalToolbar** (`src/components/GlobalToolbar.tsx`): standardized
  top bar with undo/redo, duplicate, zoom-to-fit, auto-layout,
  export selected, save layout, import layout, and clear canvas.
- **CanvasContextMenu** (`src/components/CanvasContextMenu.tsx`):
  standardized right-click menu with copy, paste, delete, pin,
  group/ungroup, expand/collapse, duplicate, and custom per-app actions.
- **useCanvasSession** (`src/hooks/useCanvasSession.ts`): shared hook
  providing the underlying state management for these UI components,
  including edge-cutting (right-click drag to break connections) and
  keyboard shortcuts (Ctrl+Z/Y/D/C/V, Delete).

## Gemini Provider Configuration

The Gemini provider selects model and generation config based on thinking tier:

| Tier     | Model                         | Temperature | Max Tokens |
|----------|-------------------------------|-------------|------------|
| Quick    | gemini-2.0-flash-lite         | 0           | —          |
| Standard | gemini-2.0-flash              | 0           | —          |
| Deep     | gemini-2.0-flash-thinking-exp | 0.7         | 16384      |

## ConceptLab Image Generation

| Use Case | Model | Method |
|----------|-------|--------|
| Primary character/weapon generation | Imagen 4 (`imagen-4.0-generate-001`) | predict |
| Reference-based turnaround views | Gemini 3 Pro (`gemini-3-pro-image-preview`) | generateContent |
| Fast iteration views | Gemini Flash Image (`gemini-2.0-flash-preview-image-generation`) | generateContent |
| Attribute extraction / text tasks | Gemini Flash (`gemini-2.0-flash`) | generateContent |
| Quality restoration | Gemini Flash (describe) → Imagen 4 (`REFERENCE_TYPE_SUBJECT`) | two-step |

## External API Proxy Pattern

All third-party API calls are routed through Next.js API routes. Keys are
stored server-side only (`process.env`). The client calls the local proxy;
the proxy adds authentication and forwards to the external service.

| Service | Proxy Route | Client Library | Purpose |
|---------|-------------|----------------|---------|
| Meshy AI | `/api/meshy` | `meshyApi.ts` | Image-to-3D, multi-image-to-3D, GLB model proxy |
| Hitem3D | `/api/hitem3d` | `hitem3dApi.ts` | Image-to-3D with portrait models, fine-grained mesh control |
| ElevenLabs | `/api/elevenlabs` | `elevenlabsApi.ts` | TTS, sound effects, voice cloning, audio isolation |
| Google AI | `/api/ai-generate` | `imageGenApi.ts` | Server-side Gemini/Imagen calls (image editing, generation) |

### Async Polling

Meshy and Hitem3D tasks return a task ID on creation. The client polls the
proxy (which polls the upstream API) until the task reaches a terminal state
(`success` or `failed`). Download URLs expire (1h for Hitem3D; signed URLs
for Meshy), so the proxy includes a `proxy-model` action that downloads the
binary (GLB/OBJ) server-side and returns it to the client as a blob.

## 3D Generation Subsystem

Two providers: Meshy (general-purpose) and Hitem3D (portrait-specialized).

| Feature | Meshy | Hitem3D |
|---------|-------|---------|
| Single image input | Yes | Yes |
| Multi-image input | Yes (2–4 views) | Yes (2–4 views with bitmap) |
| Text-to-3D | No (image-only) | No |
| Staged texturing | No | Yes (v1.5 only) |
| Portrait models | No | Yes (scene-portrait v1.5/v2.0/v2.1) |
| Resolution control | No | 512 / 1024 / 1536 / 1536pro |
| Polygon control | No | 100k–2M slider |
| Output formats | GLB | OBJ, GLB, STL, FBX, USDZ |

The 3D viewer (`MeshyModelViewerNode`) uses Three.js / React Three Fiber /
Drei with a `ViewerErrorBoundary` for graceful error handling. GLB models are
fetched through the server proxy and rendered from local `blob:` URLs to
bypass CORS and signed URL expiration.

## Audio Generation Subsystem

ElevenLabs provides TTS, sound effects, and voice cloning. Two Gemini-powered
nodes (Voice Designer, Dialogue Writer) generate text content that feeds into
the ElevenLabs TTS node.

| Node | Purpose | API |
|------|---------|-----|
| ElevenLabs TTS | Text-to-speech with voice/model selection | ElevenLabs `/v1/text-to-speech` |
| ElevenLabs SFX | Sound effect generation from text prompt | ElevenLabs `/v1/sound-generation` |
| ElevenLabs Voice Clone | Clone voice from audio samples | ElevenLabs `/v1/voices/add` |
| Voice Designer | Describe a voice from a character image | Gemini (text generation) |
| Dialogue Writer | Write dialogue lines from a topic | Gemini (text generation) |
| Voice Script | Generate speech text (narration/dialogue) | Gemini (text generation) |

## Session Persistence

Three-layer strategy:

1. **localStorage** — debounced auto-save of canvas layout (`useCanvasSession`)
   and session state (`SessionContext`). Fast, synchronous, size-limited.
2. **IndexedDB** — `layoutStore.ts`, `filesStore.ts`, `styleStore.ts` for
   larger data (named layouts, file references, style presets).
3. **Filesystem** — `/api/session` route for named session save/load to
   `saved-sessions/` directory. Handles arbitrarily large payloads.

On canvas load, the system first attempts to restore from the auto-save key
in localStorage, then falls back to the default/latest named layout.

Node components that use `useState` for local editable fields implement a
`_restoreTs` watcher pattern: when a session is loaded, the canvas sets a
timestamp on node data, and the node's `useEffect` detects this change and
re-syncs local state from the restored data.

## Canvas Unification

ShawnderMind and ConceptLab share the same node set, ToolDock categories
(`ALL_DOCK_CATEGORIES` from `sharedNodeTypes.ts`), context menu, and canvas
background (`BackgroundVariant.Lines`). Both applications render all node
categories — the distinction is primarily in routing and session context.
