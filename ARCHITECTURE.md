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
  src/canvas/                   Shared BaseNode, PipelineEdge, flowLayout
  src/                          Button, Card, Input, Select, Textarea, tokens

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
      nodes/character/                  Shared character generator nodes (16)
        CharIdentityNode.tsx            Age, race, gender, build presets
        CharDescriptionNode.tsx         Freeform character description
        CharAttributesNode.tsx          14 attribute groups with dropdowns
        ExtractAttributesNode.tsx       AI extraction from reference images
        EnhanceDescriptionNode.tsx      AI-enhanced description (two-way modifier)
        GenerateCharImageNode.tsx       Main character image generation
        GenerateViewsNode.tsx           Front/back/side multi-view generation
        ReferenceCalloutNode.tsx        Reference image with annotation prompt
        MainStageViewerNode.tsx         Multi-tab image viewer with zoom
        EditCharacterNode.tsx           Text-based image modifications
        CharHistoryNode.tsx             Generation history with thumbnails
        ResetCharacterNode.tsx          Clear all character data
        SendToPhotoshopNode.tsx         Send images to Photoshop via API
        ShowXMLNode.tsx                 View character config as XML
        QuickGenerateNode.tsx           Auto-fill and generate a random character
        ProjectSettingsNode.tsx         Project name and output directory
        CharacterNodes.css              Shared character node styles
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
    character-save/route.ts     Save character images to local disk
    open-folder/route.ts        Open image output folder
    send-to-photoshop/route.ts  Send images to Adobe Photoshop

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
