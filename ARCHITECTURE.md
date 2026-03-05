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
      ToolDock.tsx/.css          Left panel with categorized node templates
      ContextMenu.tsx/.css       Right-click add/group/expand menu
      StatusBar.tsx/.css         Canvas status indicators
      NodeInspector.tsx/.css     Node detail inspector
      GuidedRunOverlay.tsx/.css  Step-by-step guided run UI
      DemoOverlay.tsx/.css       Demo/onboarding overlay
      flowLayout.ts             Dagre auto-layout helper
      edges/
        PipelineEdge.tsx/.css    Custom edge rendering
      nodes/
        nodeRegistry.ts         Node type definitions, metadata, validation
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
        ExtractDataNode.tsx/.css        Data extraction utility
        CountNode.tsx/.css              Count utility
        TextOutputNode.tsx/.css         Text output node
        ImageOutputNode.tsx/.css        Image output node
        VideoOutputNode.tsx/.css        Video output node
        BaseNode.tsx/.css               Shared base node component
        modelCatalog.ts                 Gemini model catalog
    stages/                     Stage-specific UI components
    layout/                     Shell, settings panel, save/open dialogs
    views/                      Lineage graph, evaluation dashboard
    ipc.ts                      Inter-process communication

  tool-editor/                  Tool Editor (hub-native)
    ToolEditorShell.tsx/.css     Main shell (toolbar + 3-panel layout)
    ToolEditorCanvas.tsx/.css    ReactFlow canvas with grid snapping
    EditorToolDock.tsx/.css      Left panel with draggable templates
    PropertyPanel.tsx/.css       Right panel for editing node properties
    ExportDialog.tsx/.css        Export All / Export Selected dialog
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

src/components/                 Hub-level components
  ClientShell.tsx               App shell with sidebar + workspace
  WorkspaceRenderer.tsx         Route resolver with keep-alive
  Sidebar.tsx                   Navigation sidebar
  HubCanvas.tsx                 Home screen node canvas
  ToolNode.tsx                  Tool card node for hub canvas
  ToolShell.tsx                 Generic tool landing page wrapper
  CommandPalette.tsx            Ctrl+K command palette
  StatusBadge.tsx               Tool status indicator

src/lib/
  registry.ts                   Tool registry (all tools + metadata)
  types.ts                      Shared hub types
  cn.ts                         Tailwind class merge utility
  tool-client.ts                HTTP client for tool backends
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
      orchestrator.ts           Pipeline orchestration + prompt building
      stages.ts                 Stage ID definitions
      schemas.ts                Zod schemas for stage outputs
      generationLog.ts          Generation logging + research export
      provider/
        geminiProvider.ts       Gemini API client with tier-based model selection
        mockProvider.ts         Mock provider for testing
        costTracker.ts          Token/cost tracking
        types.ts                Provider interface types
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
- **Tool Editor**: Singleton external store (useToolEditorStore) with
  useSyncExternalStore. No React Context — the store is a module-level
  singleton accessed via hook.
- **UI Lab**: React Context (UILabContext).
- **Hub**: WorkspaceContext for navigation and keep-alive.

## Gemini Provider Configuration

The Gemini provider selects model and generation config based on thinking tier:

| Tier     | Model                         | Temperature | Max Tokens |
|----------|-------------------------------|-------------|------------|
| Quick    | gemini-2.0-flash-lite         | 0.7         | 2048       |
| Standard | gemini-2.0-flash              | 0.8         | 4096       |
| Deep     | gemini-2.0-flash-thinking-exp | 0.9         | 8192       |
