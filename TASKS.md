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
- [x] Integrate Meshy API: image-to-3D nodes, GLB proxy, 3D viewer
- [x] Integrate Hitem3D API: full parameter control, portrait models
- [x] Integrate ElevenLabs API: TTS, SFX, voice cloning nodes
- [x] Build Creative Director node: AI critiques with Apply Edit
- [x] Build Voice Designer + Dialogue Writer + Voice Script nodes
- [x] Implement Auto-Fidelity on MainStageViewer
- [x] Rewrite Quick Generate with comprehensive Gemini prompt
- [x] Implement three-layer session auto-persistence
- [x] Unify ShawnderMind and ConceptLab canvas (shared node set, ToolDock)
- [x] Add Seed node auto-infer context via Gemini
- [x] Remove saved-sessions/ from git tracking, add to .gitignore
- [x] Remove orphaned BaseNode.css/tsx, flowLayout.ts from packages/ui
- [x] Remove test artifact images from git tracking
- [x] Update ARCHITECTURE.md with all new subsystems and API integrations
- [x] Update SPEC.md with 3D, audio, Creative Director, session persistence
- [x] Update PROJECT.md with new features and integrations
- [x] Add ADRs 019–022 to DECISIONS.md
- [x] Create README.md

## Now

- [ ] Test ConceptLab end-to-end: Character generation + Turnaround views
- [ ] Test dual-backend: verify Vertex AI endpoint format with live credentials
- [ ] Test node compatibility: verify all error/warning scenarios fire correctly
- [x] Walter: convert from landing page to functional application shell

## Next

- [ ] Build Sprite Lab sub-tool navigation and workspace pages
- [ ] Build UI Lab remaining workspace panels
- [ ] Add cross-tool data flow wiring on the hub canvas

## Later

- [ ] Walter web integration (extract timeline/storyboard UI from Electron)
- [ ] Production build and deployment configuration
- [ ] Add test suite (currently 0 test files)
- [ ] Split large files (SessionContext.tsx ~1060 lines, orchestrator.ts ~1039 lines)
- [ ] Evaluate ContextMenu.css: merge shared styles into CanvasCommon.css
- [ ] Evaluate loadPack.ts exports (unused)
- [ ] Resolve Windows production build EPERM issue (webpack glob config)

## User Action Required

- [ ] **URGENT: Rotate Gemini API key** — was embedded in saved-sessions/test.json (now removed from git, but key may be in git history)

## Health Audit History

- [x] Report 20260306_080757
- [x] Report 20260306_161152
- [x] Report 20260311_001400
