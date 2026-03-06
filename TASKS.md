# TASKS — Shawnderland OKDO

## Completed

- [x] Install dependencies and verify the hub compiles and runs
- [x] Build out ShawnderMind ideation canvas with full node-based pipeline
- [x] Implement Interactive and Automated modes in StartNode
- [x] Create PackedPipelineNode for automated collapsed view
- [x] Upgrade GroupNode to functional pack node with dynamic outputs
- [x] Add Thinking Tiers (Quick/Standard/Deep) with model selection
- [x] Fix influence node merging — structured prompt blocks across all stages
- [x] Align context menu categories with ToolDock categories
- [x] Replace pin icon with lock/unlock in ToolDock
- [x] Build Tool Editor: canvas, node types, property panel, export
- [x] Register Tool Editor in hub registry and route
- [x] Tool Editor: edge-based resizing on all elements
- [x] Tool Editor: add Button, Text Box, Dropdown Menu elements
- [x] Tool Editor: save/import layouts (localStorage + file upload)
- [x] Tool Editor: undo/redo, duplicate, alignment tools
- [x] Restore RRGM governance — update all governance docs, add mode system
- [x] Build AI ConceptLab: Character, Weapon, Turnaround nodes
- [x] Integrate ConceptLab on unified canvas with ShawnderMind nodes
- [x] Add search filter to ToolDock across all categories
- [x] Implement dual-backend API (AI Studio + Vertex AI) for all endpoints
- [x] Add node compatibility validation with error banners
- [x] Add session save/load for ShawnderMind
- [x] Centralize API key access via apiConfig.ts
- [x] Create .env.example for onboarding
- [x] Health audit: fix all yellow triggers

## Now

- [ ] Test ConceptLab end-to-end: Character generation + Turnaround views
- [ ] Test dual-backend: verify Vertex AI endpoint format with live credentials
- [ ] Test node compatibility: verify all error/warning scenarios fire correctly

## Next

- [ ] Build Sprite Lab sub-tool navigation and workspace pages
- [ ] Build UI Lab remaining workspace panels
- [ ] Add cross-tool data flow wiring on the hub canvas
- [ ] Consolidate duplicate flowLayout.ts (use @shawnderland/ui copy)

## Later

- [ ] Walter web integration (extract timeline/storyboard UI from Electron)
- [ ] Production build and deployment configuration
- [ ] Add test suite (currently 0 test files)
- [ ] Split large files (SessionContext.tsx ~1060 lines, orchestrator.ts ~1039 lines)

## Health Audit Cleanup

- [x] Sync ARCHITECTURE.md: remove deleted ContextMenu.tsx reference, add useCanvasSession, GlobalToolbar, CanvasContextMenu, PrepromptNode, PostPromptNode, Gemini Studio, Concept Lab standalone structure
- [x] Sync SPEC.md: add Gemini Studio section, Preprompt/PostPrompt nodes, unified canvas features (useCanvasSession, GlobalToolbar, CanvasContextMenu)
- [x] Sync PROJECT.md: add Gemini Studio tool, Preprompt/PostPrompt features, unified canvas features
- [x] Sync DECISIONS.md: add ADR for useCanvasSession extraction and unified toolbar/context menu, ADR for Preprompt/PostPrompt prompt injection design
- [ ] Evaluate ContextMenu.css: merge shared styles into CanvasCommon.css or keep as shared stylesheet
- [ ] Consolidate duplicate flowLayout.ts (use @shawnderland/ui copy)
- [x] Fix broken preset node types in ConceptLabShell.tsx (multiViewer → charViewer, editImage → charEdit)
- [x] Remove dead code: StatusBar.tsx/css, NodeInspector.tsx/css (never imported)
- [x] Remove dead .cl-viewer-* CSS from ConceptLabNodes.css (~65 lines)
- [x] Wire GeminiStudioShell.tsx to named layout system (uses deprecated onSaveLayout)
- [x] Update ARCHITECTURE.md: remove deleted concept-lab/nodes/ entries, add ideation/canvas/nodes/character/ and shared components
- [ ] Evaluate loadPack.ts exports (unused)
- [x] Health audit report generated (report_id: 20260306_080757)
- [x] Health audit report generated (report_id: 20260306_161152)
