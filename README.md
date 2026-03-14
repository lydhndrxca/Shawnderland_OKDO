# Shawnderland OKDO

Unified hub for AI creative tools — character design, 3D model generation,
audio production, and ideation pipelines on a shared node canvas.

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url>
cd Shawnderland_OKDO

# 2. Copy environment variables
cp .env.example .env.local
# Fill in at least NEXT_PUBLIC_GEMINI_API_KEY

# 3. Install and run
npm install
npm run dev
# or on Windows: run.bat
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `MESHY_API_KEY` | No | Meshy AI — 3D model generation |
| `HITEM3D_ACCESS_KEY` | No | Hitem3D — 3D generation (access key) |
| `HITEM3D_SECRET_KEY` | No | Hitem3D — 3D generation (secret key) |
| `ELEVENLABS_API_KEY` | No | ElevenLabs — TTS, SFX, voice cloning |
| `GEMINI_API_KEY` | No | Server-side Gemini (preferred over NEXT_PUBLIC) |

See `.env.example` for all options including Vertex AI and directory overrides.

## Tools

| Tool | Purpose | Status |
|------|---------|--------|
| **ShawnderMind** | 8-stage AI ideation pipeline + character/3D/audio nodes | Functional |
| **AI ConceptLab** | Unified canvas (same node set as ShawnderMind) | Functional |
| **Gemini Studio** | Point-and-shoot image/video generation | Functional |
| **Tool Editor** | Visual tool designer with JSON export | Functional |
| **AI Sprite Lab** | Sprites, pixel art, animations | Landing page |
| **AI UI Lab** | Game UI generation | Workspace UI |
| **Walter Storyboard Builder** | Canon-aware AI storyboarding + shoot sheet export | Functional |

## Architecture

- **Framework:** Next.js 15 (App Router), React 19, TypeScript 5
- **Canvas:** @xyflow/react 12 with dagre auto-layout
- **Styling:** Tailwind CSS v4 + CSS custom properties
- **3D:** Three.js / React Three Fiber / Drei
- **APIs:** All external calls routed through server-side proxy routes

See [ARCHITECTURE.md](ARCHITECTURE.md) for full details.

## Node Categories

ShawnderMind and ConceptLab share 13 workflow-centric categories:

- **Ideation Pipeline** — Seed, Normalize, Diverge, Critique, Expand, Converge, Commit, Iterate
- **Character Design** — Identity, Attributes, Description, Generate, Views, Edit, Quick Generate
- **Creative Tools** — Creative Director (AI critique), Enhance, Reference Callout
- **3D Generation** — Meshy Image-to-3D, Hitem3D Image-to-3D, 3D Model Viewer
- **Audio** — ElevenLabs TTS, SFX, Voice Clone, Voice Designer, Dialogue Writer
- **Inputs / Modifiers / Outputs / Control** — Influence nodes, prompt injection, viewers

## External API Integrations

| Service | Proxy Route | Capabilities |
|---------|-------------|--------------|
| Meshy AI | `/api/meshy` | Image-to-3D, multi-view, GLB proxy |
| Hitem3D | `/api/hitem3d` | Image-to-3D with portrait models, resolution/polygon control |
| ElevenLabs | `/api/elevenlabs` | TTS, sound effects, voice cloning |
| Google AI | `/api/ai-generate` | Server-side Gemini/Imagen generation |

## Governance

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Technical architecture, project structure, subsystems |
| [SPEC.md](SPEC.md) | Feature specifications |
| [PROJECT.md](PROJECT.md) | Project overview and status |
| [DECISIONS.md](DECISIONS.md) | Architecture Decision Records (ADRs) |
| [TASKS.md](TASKS.md) | Task tracking |

## License

Private — not licensed for redistribution.
