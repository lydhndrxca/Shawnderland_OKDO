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

- [x] Monorepo: extract Walter into tools/walter/ workspace package
- [x] Monorepo: create @shawnderland/ai shared package
- [x] Profile system: work/personal/all toggle in sidebar
- [ ] Test ConceptLab end-to-end: Character generation + Turnaround views
- [ ] Test dual-backend: verify Vertex AI endpoint format with live credentials
- [ ] Test node compatibility: verify all error/warning scenarios fire correctly
- [x] Walter: convert from landing page to functional application shell
- [x] Walter: ShawnderMind visual theme (#09090b, #6c63ff, system-ui)
- [x] Walter: Walter Brain (canon memory) — characters, locations, lore, 28 episodes
- [x] Walter: Episode lore integration — 28 per-episode analysis files in lore/
- [x] Walter: Complete rebuild — 3-screen workflow (Planning → Writing Room → Staging Room)
- [x] Walter: Multi-agent persona system (Producer, Writer, Director, Cinematographer)
- [x] Walter: Agent conversation engine with phase-based progression
- [x] Walter: Session-based state management (save/open/rename/duplicate)
- [x] Walter: Planning Page (constraints, randomize, send to producer)
- [x] Walter: Writing Room (chat, auto-run, phase controls, persona builder)
- [x] Walter: Staging Room (3-level timeline, shot editor, feedback loop, one-sheet export)
- [x] Walter: Deleted 19 old components, replaced with 5 new screen components

### Work-Safe Conversion (Phase 1–3)

- [x] Reorder tools in registry (ConceptLab first, Sprite Lab / UI Lab last)
- [x] Update tool taglines & descriptions for professional presentation
- [x] Add WIP status to Sprite Lab & UI Lab with dimmed cards and badges
- [x] Add feedback/bug report mailto link in sidebar
- [x] Verify Walter hidden in Work mode; document toggle mechanism
- [x] Update homepage Getting Started section (HOWTO_STEPS)
- [x] Hardcode default canvas layouts for ConceptLab & ShawnderMind
- [x] AI Writing Room: create tools/writing-room/ as monorepo package following Walter pattern
- [x] AI Writing Room: generalized Planning Page (writing type, context, audience, tones, hard rules, reference material, scope, notes)
- [x] AI Writing Room: 10 preset personas (Producer, Serling, Fielder, Pera + 6 new: Gritty Script Writer, Unhinged, David Lynch, Game Designer, Unhinged Game Designer, Korean Game Producer Executive)
- [x] AI Writing Room: 7 generalized creative rounds (Core Concept → Final Review)
- [x] AI Writing Room: summary/export buttons replacing Staging Room (2-screen workflow)
- [x] AI Writing Room: wired into hub (WorkspaceRenderer, registry, tsconfig, next.config)
- [x] AI Writing Room: pen-tool icon in sidebar ICON_MAP
- [x] AI Writing Room: no Walter/Weeping Willows references; fully standalone
- [x] Update governance docs (TASKS.md, PROJECT.md, SPEC.md, DECISIONS.md)

### Health Audit Cleanup

- [x] Commit monorepo migration (Walter extraction, profile system, @shawnderland/ai)
- [ ] Consider Git LFS for lore files >100 KB
- [x] Fix 3 pre-existing TS errors in GeminiEditorOverlay.tsx
- [x] Fix doc drift: README.md, SPEC.md, DECISIONS.md still describe Walter as Electron-only/launcher-only
- [x] Fix doc drift: ARCHITECTURE.md missing 8 API routes and writer packages (ai-embed, ai-local, ai-status, fielder-corpus, list-dirs, pera-corpus, serling-corpus, video-analyze)
- [x] Fix doc drift: SPEC.md missing writer agent packages, LoRA training pipeline, Ollama integration
- [x] Gitignore training artifacts (tokenizer.json, checkpoint dirs, *-gguf/, *-merged-16bit/)
- [ ] Evaluate Git LFS for corpus/taxonomy JSON (~271 MB combined)

### ConceptLab Sub-tools (2026-03-17)

- [x] Task 1.1: Expandable sidebar for ConceptLab with 4 sub-tool items (Concept Lab, AI Upres, AI Restore, Style Conversion)
- [x] Task 1.2: Sub-route handling in WorkspaceRenderer + ConceptLabShell appKey prop
- [x] Task 1.3: Default layouts for 3 sub-tools (upres, restore, style-conversion)
- [x] Task 2.1: BulkImageInputNode — drag/drop, paste, browse, thumbnails, clear/remove
- [x] Task 2.2: UpresStandaloneNode — Examine → Process two-phase workflow, batch support
- [x] Task 2.3: RestoreStandaloneNode — Examine → Process, describe-then-regenerate pipeline
- [x] Task 2.4: StyleConversionNode — Re-render/Isolate modes, presets, custom dimensions
- [x] Task 2.5: OutputGalleryNode — gallery grid, expand overlay, context menu, export/copy
- [x] Phase 3: UtilityNodes.css, barrel export, "Utilities" dock category, NODE_DEFAULTS
- [x] Phase 4: Verified clear/reset buttons on BulkImageInput and OutputGallery

## Next

- [ ] Extract ShawnderMind into tools/shawndermind/ package
- [ ] Extract Gemini Studio into tools/gemini-studio/ package
- [ ] Build Sprite Lab sub-tool navigation and workspace pages
- [ ] Build UI Lab remaining workspace panels
- [ ] Add cross-tool data flow wiring on the hub canvas

## Later

- [ ] Walter: ML integration — image generation from shot descriptions
- [ ] Walter: ML integration — AI storyboard-to-video preview
- [ ] Walter: ML integration — voice/narration generation from dialogue
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
- [x] Health audit report generated (report_id: 20260314_144353)
- [x] Health audit report generated (report_id: 20260314_151000)
- [x] Health audit report generated (report_id: 20260315_143559)
