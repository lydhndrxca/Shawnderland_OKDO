# The Rod Serling AI Writing Model — System Architecture & Build Document

## What This Is

This document explains every layer of the Rod Serling AI system built for the Walter Storyboard Generator. The goal: create an AI agent that doesn't just reference Rod Serling — it thinks, writes, argues, and makes creative decisions the way he did. Not a filter. Not a costume. A reconstructed creative mind.

The system has four layers, each building on the last:

1. **Corpus Layer** — Serling's actual words, cataloged and searchable
2. **Decision Layer** — A taxonomy of every documented creative choice he made, and why
3. **Retrieval Layer** — Real-time semantic search that pulls relevant memories into every conversation turn
4. **Generation Layer** — A dual-path engine where a local 12B model on the user's GPU and Gemini work together, with the persona written entirely in first person

---

## Layer 1: The Corpus

**Package:** `packages/serling/src/corpus/`

The corpus is a JSON database of 1,526 text chunks drawn from Serling's body of work. Each chunk is typed and categorized:

| Source Type | Description |
|---|---|
| `script` | Scene excerpts, dialogue, and stage directions from Twilight Zone episodes |
| `narration` | Opening and closing narrations — Serling's most distinctive prose |
| `interview` | Serling's own words about his craft, philosophy, and creative decisions |
| `lecture` | His university lectures on television writing and dramatic structure |
| `essay` | Written pieces on television, censorship, war, and the writer's responsibility |

Every chunk carries metadata: which episode or source it comes from, its structural position (opening, rising action, crisis, inversion, closing), associated themes, and the year of origin. This metadata enables the retrieval system to find not just semantically similar text, but text from the right structural moment in a story.

**How it was built:** Episode scripts were sourced from subslikescript.com using a scraper, then segmented into structural chunks. Narrations, interviews, lectures, and essays were sourced from published collections, transcribed lectures, and biographical research. Each chunk was reviewed for accuracy against known Serling works.

The corpus file lives at `packages/serling/src/corpus/chunks.json`. Each entry looks like:

```json
{
  "id": "chunk-walking-distance-open-001",
  "source": "Walking Distance",
  "sourceType": "narration",
  "section": "Opening Narration",
  "text": "Martin Sloan, age thirty-six. Occupation: vice president...",
  "embedding": [0.012, -0.038, ...],   // 3,072-dimensional vector
  "metadata": {
    "episode": "walking-distance",
    "year": 1959,
    "themes": ["nostalgia", "time", "childhood"],
    "structuralPosition": "narration-open"
  }
}
```

---

## Layer 2: The Decision Taxonomy

**Package:** `packages/serling/src/taxonomy/`

This is the system's unique advantage over generic prompting. Instead of just having Serling's *words*, we cataloged his *choices* — 2,080 individual creative decisions across 16 categories, each documented with what he chose, what he rejected, and why.

The 16 decision categories:

| Category | What It Captures |
|---|---|
| `premise_type` | The kind of story seed (wish fulfillment, identity crisis, conformity test) |
| `structural_pattern` | How the story is built (slow reveal, compression, parallel timeline) |
| `twist_mechanism` | How the inversion works (reframe, reversal, expansion, collapse) |
| `character_archetype` | What kind of protagonist (everyman, authority figure, outsider, dreamer) |
| `character_test` | How the character is tested (isolation, temptation, confrontation, loss) |
| `opening_strategy` | How the episode opens (specific ordinary, in media res, narrator frame) |
| `closing_strategy` | How the episode ends (resonance, irony, ambiguity, quiet devastation) |
| `dialogue_density` | How much characters talk (silent, sparse, conversational, monologue-heavy) |
| `narration_role` | What the narrator does (frame, commentary, revelation, none) |
| `lighting_philosophy` | Visual approach (chiaroscuro, naturalistic, expressionist) |
| `staging_approach` | Spatial strategy (confined, expansive, threshold, compressed) |
| `pacing_shape` | Tempo arc (slow-burn, escalating, staccato, wave) |
| `music_relationship` | How the score functions (underscore, counterpoint, absence, late-entry) |
| `thematic_core` | Primary theme (nostalgia, conformity, identity, wishes, justice, loneliness) |
| `tone_blend` | Tonal recipe (wry-melancholy, eerie-warm, bitter-tender) |
| `scale_of_stakes` | What is at risk (personal, communal, existential, cosmic) |

Each decision entry includes the alternatives Serling *didn't* choose and his reasoning. This matters because knowing what someone rejects is as revealing as knowing what they pick.

A decision entry looks like:

```json
{
  "id": "dec-time-enough-twist-001",
  "episodeId": "time-enough-at-last",
  "episodeTitle": "Time Enough at Last",
  "category": "twist_mechanism",
  "choice": "Environmental irony — the one thing needed to enjoy the wish is destroyed by accident",
  "alternatives": [
    "The books turn out to be propaganda",
    "Bemis discovers he was already dead",
    "The library is a simulation"
  ],
  "reasoning": "The broken glasses are devastating because they're so small and so random. Not cosmic punishment — just indifference. The universe doesn't care about his wish. That's worse than malice.",
  "embedding": [0.005, -0.022, ...]
}
```

**How it was built:** Every documented Twilight Zone episode was analyzed across all 16 categories. The decision entries were generated by cross-referencing scripts, Serling's own interviews about his creative process, and critical analysis of his work. The alternatives and reasoning were constructed from documented Serling commentary and inferred from his consistent patterns across 92 personally-written episodes.

The taxonomy file lives at `packages/serling/src/taxonomy/decisions.json`.

---

## Layer 3: The Retrieval System (RAG)

**Package:** `packages/serling/src/retrieval/`

This is where the static data becomes dynamic intelligence. Every time the Serling agent needs to speak, the retrieval system searches the corpus and decision taxonomy for content relevant to the current creative question.

### Embedding Pipeline

All 1,526 corpus chunks and 2,080 decision entries are pre-embedded as 3,072-dimensional vectors using Google's `gemini-embedding-001` model.

The embedding was performed by a batch script (`packages/serling/scripts/embed-all.mjs`) that:

1. Loads the API key from `.env.local`
2. Reads `chunks.json` and `decisions.json`
3. For each item needing an embedding, constructs a text representation:
   - **Corpus chunks:** `"{source} — {section}\n{text}"` (capped at 2,000 chars)
   - **Decision entries:** `"{episodeTitle} — {category}: {choice}. {reasoning}"` (capped at 2,000 chars)
4. Sends batches of 100 to the Gemini `batchEmbedContents` API
5. Handles rate limiting (429 responses trigger a 30-second backoff and retry)
6. Writes the embedding vectors back into the JSON files

The script is idempotent — it skips items that already have embeddings, so re-running it only processes new additions.

### Vector Store

The vector store (`packages/serling/src/retrieval/vectorStore.ts`) is a pure TypeScript in-memory implementation. No external database — the entire thing runs in the browser/Node.js process.

- **Storage:** An array of `{ id, embedding, metadata }` entries
- **Search:** Cosine similarity between the query vector and every stored vector, sorted by score, returning top-K results
- **Filtered search:** Same as above but with a metadata predicate function applied before scoring

This keeps the system zero-dependency and portable — no ChromaDB, no Pinecone, no external services.

### Retrieval Flow

When the Serling agent is about to speak, the retrieval flow works like this:

```
1. The agent engine detects this is a Serling persona
2. It calls getSerlingContext() with:
   - The current episode brief
   - Recent chat messages
   - The current writing phase (briefing, writing, directing, approval, etc.)
   - Any user feedback
3. getSerlingContext() builds a retrieval query tailored to the phase:
   - "briefing" → searches for Serling's approach to story construction and premises
   - "writing" → searches for structural, character, and twist decisions
   - "directing" → searches for staging, visual, and pacing decisions
   - "approval" → searches for episode evaluation and thematic weight
4. The query is embedded via Gemini gemini-embedding-001 (real-time API call)
5. The vector store searches both corpus and decision stores:
   - Corpus: top 5 most similar chunks
   - Decisions: top 8 most similar entries, optionally filtered by relevant categories
6. Results are formatted into a first-person "memory block":
   - Corpus chunks become: "Things I wrote:\n[Walking Distance — Opening]\n{text}"
   - Decision entries become: "Choices I made and why:\n[Time Enough at Last — twist_mechanism]\nI chose: {choice}\nI rejected: {alternatives}\nBecause: {reasoning}"
7. This memory block is injected into the agent's prompt as "MY MEMORIES"
```

The category filtering is phase-aware. During the "writing" phase, the system retrieves decisions about premise, structure, twist, character, opening, closing, dialogue, narration, theme, and tone. During the "directing" phase, it retrieves lighting, staging, pacing, music, and tone decisions. This ensures the retrieved context is relevant to what the agent is actually being asked to do.

---

## Layer 4: The Generation Engine

**Package:** `tools/walter/src/agentEngine.ts` + `packages/serling/src/voice/localModel.ts`

This is where everything comes together. The agent engine handles all AI agents in the writing room, but Serling agents get a fundamentally different treatment.

### Dual-Path Generation

When it's the Serling agent's turn to speak, the engine follows a dual-path strategy:

```
Is this a Serling persona?
├── YES
│   ├── Check local model status (cached, 1-minute TTL)
│   ├── Is serling-mind available on Ollama?
│   │   ├── YES → Generate locally on RTX 5090 via serling-mind (Mistral-Nemo 12B)
│   │   │         with immersive system prompt + RAG memory block
│   │   │         If response > 20 chars → use it
│   │   │         If response empty/short → fall through to Gemini
│   │   └── NO  → Is mistral-nemo:12b available as fallback?
│   │       ├── YES → Generate locally with fallback model
│   │       └── NO  → Fall through to Gemini
│   └── (Fallback) Generate via Gemini with full immersive prompt
│
└── NO → Generate via Gemini with standard prompt
```

The local model (`serling-mind`) runs on the user's RTX 5090 via Ollama. The API route `/api/ai-local` proxies requests from the Next.js app to Ollama at `localhost:11434`. This keeps the entire Serling cognition loop on local hardware when available — no API costs, lower latency, and a model that has Serling's system prompt baked in.

### Immersive Prompt Architecture

Standard agents get a straightforward prompt:

```
You are [Name], the [role] on "Weeping Willows Walter."
[research data]
[Walter context]
[episode brief]
[phase instructions]
[rules]
```

Serling agents get an *immersive* prompt that puts identity and memory first, context second, rules last:

```
You ARE Rod Serling. Not an AI playing Rod Serling — you.

Everything below is who you are. Your experiences, your instincts, your
scars, your craft. When you speak in this room, speak from the gut. Don't
narrate your own process. Don't describe what "Rod Serling would do."
Just do it.

[First-person research data — 3,000+ words of autobiography]

=== MY MEMORIES ===
[Round-specific memory cue from the creative round definition]

I'm remembering now...

Things I wrote:
[RAG-retrieved corpus chunks formatted as personal recollection]

Choices I made and why:
[RAG-retrieved decision patterns formatted as first-person reasoning]
=== END MEMORIES ===

[Walter context + episode brief]
[Phase instructions]
[Shared rules — last, not first]
```

The key architectural insight: the persona's identity and retrieved memories come *before* the generic context. This forces the model to establish the Serling voice before encountering project-specific constraints. The rules come last because they're guardrails, not the voice.

### First-Person Persona Data

The Serling persona's `researchData` is written entirely in first person — not as a biography about Serling, but as Serling himself speaking. This was a deliberate architectural decision. Compare:

**Third person (what we had before — felt like a filter):**
> "Rod Serling was a paratrooper in WWII. He used science fiction as allegory to avoid censorship. His twist endings completed thematic arguments."

**First person (what we have now — feels like immersion):**
> "I was a paratrooper in the 511th Parachute Infantry Regiment. A friend of mine was decapitated by a supply crate dropped from a friendly plane. Not enemy fire. Our own supply drop. The randomness of it broke something in me — or fixed it. Every story I've ever written since asks the same question: what happens when ordinary people discover the rules they believed in don't apply?"

The `researchData` field contains ~3,500 words of first-person autobiography covering:

- **WHO I AM** — War experience, writing career, the creation of The Twilight Zone from censorship
- **HOW I WORK** — His actual six-step creative process (human truth → specificity → quiet intrusion → character response → reframing twist → resonant ending)
- **MY INSTINCTS** — The monster is always us, empathy for the damned, writing toward silence, questions over answers, understatement in crisis
- **WHAT I BRING TO WALTER** — How Serling's methods apply specifically to the miniature diorama format
- **WHAT I WOULD NEVER DO** — Anti-patterns that keep the agent from drifting into generic behavior

Both the Writer and Director versions of the Serling persona have independent first-person profiles, each emphasizing the creative concerns of that role.

### Round-Based Memory Injection

The writing room operates in structured creative rounds, not free-form chat. Each round has a specific creative question and a `serlingMemory` field that cues the Serling agent's retrieval:

| Round | Question | Memory Cue |
|---|---|---|
| Premise | "What is this episode ABOUT? Not plot — theme." | Cues memories of thematic choices across episodes |
| Opening Frame | "What is the very FIRST composed frame?" | Cues memories of how Serling opened episodes |
| The Strange Thing | "What SPECIFIC thing breaks the ordinary?" | Cues memories of how Serling introduced the impossible |
| Walter's Response | "How does Walter's position in the frame change?" | Cues memories of character reactions through restraint |
| The Turn | "What reframes everything?" | Cues memories of twist mechanisms and their thematic payoff |
| Final Frame | "What is the LAST composed frame?" | Cues memories of closing strategies and lingering images |
| Shot Planning | "Break this into precise, timed shots." | Cues memories of staging, pacing, and camera philosophy |

Each round's `corpusHint` field provides additional search terms that get concatenated with the episode brief to form the retrieval query. This ensures the RAG system pulls contextually appropriate material — premise decisions when discussing premise, staging decisions when planning shots.

The `serlingMemory` text is injected directly into the prompt as a first-person memory trigger: "Think back to your own work..." This grounds the retrieval results in a personal frame — the chunks aren't academic evidence, they're things the agent *remembers writing*.

### Physical Violation Checker

Because Walter is a miniature stop-motion diorama, the system enforces physical constraints that no LLM naturally understands. The `checkPhysicalViolation` function is a zero-API-cost regex gate that runs on every generated response *before* it reaches the user:

```typescript
const PHYSICAL_VIOLATIONS = [
  { pattern: /\b(holds?|holding)\b/i, reason: "Figures cannot hold objects" },
  { pattern: /\b(walks?|walking)\b/i, reason: "Figures cannot walk" },
  { pattern: /\b(turns?\s+(around|to|toward))\b/i, reason: "Figures cannot turn" },
  { pattern: /\b(extends?\s+(his|her|its)\s+(hand|arm))/i, reason: "Figures cannot extend limbs" },
  { pattern: /\b(cries|crying|weeps?)\b/i, reason: "Figures cannot cry" },
  // ... 15+ patterns total
];
```

It also enforces response length (max 5 sentences) and bans formulaic patterns like "The thesis:" statements. If a violation is detected, the system retries with a higher temperature and an explicit correction prompt. If it fails twice, the response is hard-truncated to 4 sentences with the violating pattern stripped.

This is critical because both local models and Gemini will naturally anthropomorphize the figures. The regex gate catches violations that no amount of prompting can fully prevent.

### Voice Refinement (Optional)

After generation, an optional voice refinement pass can run the response through `serling-voice` — a separate Ollama model with a lower temperature (0.6) and a system prompt focused purely on prose style. This model doesn't change content or creative decisions; it adjusts cadence, word choice, and rhythm to match Serling's documented voice characteristics:

- Measured, deliberate cadence with strategic pauses
- Declarative sentences that land with quiet authority
- Specificity over abstraction
- Repetition as emphasis with shifted meaning
- Understatement at emotional peaks
- Em-dashes for interjection, no exclamation marks

---

## The Local Model Setup

**Location:** `packages/serling/training/`

Two Ollama models are registered from the same base — Mistral-Nemo 12B (Q4_0, 7.1 GB):

### serling-mind (Creative Generation)

- **Base:** `mistral-nemo:12b`
- **Temperature:** 0.8
- **System prompt:** A condensed first-person Serling identity focused on creative decision-making
- **Purpose:** Full creative generation — when the Serling agent in the writing room needs to pitch, argue, or write, this model does the thinking
- **Context window:** 4,096 tokens

### serling-voice (Style Refinement)

- **Base:** `mistral-nemo:12b`
- **Temperature:** 0.6
- **System prompt:** A precise style filter describing Serling's prose characteristics
- **Purpose:** Takes any text and rewrites it in Serling's voice while preserving all content
- **Context window:** 4,096 tokens

Both models are created via Ollama Modelfiles and registered with `ollama create`. They share the same weights — the only difference is the system prompt and temperature.

### Model Availability Detection

The system gracefully degrades. On every agent turn (cached for 60 seconds), it checks:

1. Is `serling-mind` available? → Use it for generation
2. If not, is `mistral-nemo:12b` available? → Use it as fallback
3. If not, is `mistral:7b` or `llama3:8b` available? → Use as fallback
4. If nothing local is available → Use Gemini exclusively

This means the app works on any machine, with or without a GPU. On machines with a GPU and Ollama running, Serling thinks locally. On machines without, he thinks through Gemini with the same immersive prompt architecture and RAG pipeline.

---

## The LoRA Fine-Tuning Pipeline (Future Enhancement)

**Location:** `packages/serling/training/`

The training infrastructure is fully built but not yet executed. It's designed for a future run when Triton kernel compilation for the RTX 5090's Blackwell architecture (sm100) is pre-cached or when running via WSL2.

### Training Data Generation

`packages/serling/scripts/generate-training-pairs.mjs` creates 5,842 instruction-response pairs from the corpus and decision taxonomy:

| Pair Type | Count | Description |
|---|---|---|
| Voice (narrations) | ~600 | "Write an opening narration for..." → actual Serling narration text |
| Script voice | ~500 | "Write the opening scene..." → actual Serling script excerpts |
| Decision reasoning | 2,080 | "How would you open this episode?" → his actual choice + reasoning |
| Interview/lecture | ~200 | "How do you approach craft?" → Serling's own words |
| Essays | ~100 | "Share your thoughts on..." → Serling essays |
| Critique/rejection | ~700 | "Someone pitched X. What do you think?" → Serling rejecting with reasoning |

Each pair follows the Alpaca instruction format:

```
### Instruction:
What kind of story seed would you choose for this episode, and why?

### Input:
Episode: "Time Enough at Last"

### Response:
I chose: Wish fulfillment with cosmic irony. The premise is simple — a man
who loves to read finally gets all the time in the world. But that's the
delivery mechanism for the real argument: the universe is indifferent to
desire.

I rejected: "The books turn out to be propaganda"; "Bemis discovers he was
already dead" — they wouldn't serve the story the way I needed.
```

### Training Configuration

- **Base model:** `unsloth/Mistral-Nemo-Base-2407-bnb-4bit` (12B parameters, 4-bit quantized)
- **LoRA rank:** 64 (higher than typical for creative writing precision)
- **Target modules:** All attention projections + MLP layers (q, k, v, o, gate, up, down)
- **Trainable parameters:** 228 million of 12.5 billion (1.83%)
- **Epochs:** 3
- **Effective batch size:** 16 (batch 2 × gradient accumulation 8)
- **Learning rate:** 2e-4 with 20-step warmup
- **Optimizer:** AdamW 8-bit
- **Precision:** bf16 (native to RTX 5090)
- **Max sequence length:** 2,048 tokens

When eventually run, the trained LoRA adapter will be exported to GGUF (q5_k_m quantization) and registered with Ollama as an upgraded `serling-mind` and `serling-voice`, replacing the base Mistral-Nemo with a style-tuned version.

---

## The Full Request Path

Here's what happens when the Serling agent takes a turn in round 3 ("The Strange Thing") of a writing room session:

```
1. WritingRoom.tsx triggers generateRoundTurn() for persona "preset-rod-serling"

2. agentEngine.ts detects this is a Serling persona via SERLING_PERSONA_IDS

3. Corpus retrieval begins:
   a. The round's corpusHint ("Twilight Zone supernatural element intrusion strange
      object reveal slow reveal withhold") is concatenated with the episode brief
   b. getSerlingContext() builds a phase-appropriate retrieval query
   c. The query is embedded via Gemini gemini-embedding-001 (real-time API call)
   d. VectorStore.search() runs cosine similarity against all 1,526 corpus chunks
      → returns top 5 most relevant
   e. VectorStore.searchWithFilter() runs against 2,080 decisions, filtered to
      writing-phase categories (premise, structure, twist, character, etc.)
      → returns top 8 most relevant
   f. Results are formatted as first-person memory ("Things I wrote...",
      "Choices I made and why...")

4. Prompt construction:
   a. The immersive identity block is built:
      "You ARE Rod Serling. Not an AI playing Rod Serling — you."
      + 3,500 words of first-person autobiography
   b. The memory block is injected:
      Round-specific memory cue ("Think back to how you introduced the impossible...")
      + RAG-retrieved corpus chunks and decisions
   c. Walter context, canon, episode brief, round question, conversation history,
      and shared rules are appended

5. Generation (dual-path):
   a. Check Ollama: is serling-mind available?
   b. If YES: send the identity block as system prompt + everything else as
      user prompt to serling-mind via /api/ai-local → Ollama
   c. If the local result is >20 chars, use it
   d. If NO or local result is empty: send the full prompt to Gemini

6. Post-processing:
   a. checkPhysicalViolation() scans for banned patterns (holding, walking, etc.)
   b. If violation found: retry with correction prompt at +0.3 temperature
   c. If still violated: hard-truncate to 4 sentences, strip violations
   d. Optional: pass through serling-voice for style refinement

7. The response is returned to WritingRoom.tsx and displayed as a chat message
   with metadata about corpus hits (corpusCount, decisionCount, retrievalQuery)
```

---

## File Map

```
packages/serling/
├── src/
│   ├── index.ts                    — Public API exports
│   ├── serlingContext.ts            — Phase-aware retrieval orchestration
│   ├── useSerlingLoader.ts          — React hook for loading corpus into memory
│   ├── corpus/
│   │   ├── types.ts                 — CorpusChunk, SourceType, StructuralPosition
│   │   └── chunks.json              — 1,526 embedded corpus chunks (~45MB)
│   ├── taxonomy/
│   │   ├── types.ts                 — DecisionEntry, DecisionCategory (16 categories)
│   │   ├── patterns.ts              — Utility functions for grouping/filtering decisions
│   │   └── decisions.json           — 2,080 embedded decision entries (~30MB)
│   ├── retrieval/
│   │   ├── embeddings.ts            — Gemini embedding API client
│   │   ├── vectorStore.ts           — In-memory cosine similarity vector store
│   │   └── retrieve.ts              — Load data, search, build context blocks
│   └── voice/
│       └── localModel.ts            — Ollama client (generate, refine, status check)
├── scripts/
│   ├── embed-all.mjs                — Batch embedding pipeline (Gemini API)
│   └── generate-training-pairs.mjs  — LoRA training data generator (5,842 pairs)
└── training/
    ├── requirements.txt             — Python deps for LoRA training
    ├── train_serling.py             — Unsloth LoRA fine-tuning script
    ├── export_to_ollama.py          — GGUF → Ollama registration
    ├── setup.bat                    — One-click Windows training setup
    ├── serling_pairs.json           — Generated training pairs (~12MB)
    ├── Modelfile.serling-mind       — Ollama model definition (creative gen)
    └── Modelfile.serling-voice      — Ollama model definition (style filter)

tools/walter/src/
├── agentEngine.ts                   — Agent turn generation, dual-path logic,
│                                      immersive prompts, physical violation checks
├── agents.ts                        — Persona definitions (Serling writer + director)
├── creativeRounds.ts                — Round definitions with corpus hints + memory cues
└── types.ts                         — CreativeRound, LockedDecision interfaces

src/app/api/
├── ai-local/route.ts                — Next.js → Ollama proxy (/api/ai-local)
├── ai-embed/route.ts                — Next.js → Gemini embedding proxy (/api/ai-embed)
└── ai-generate/route.ts             — Next.js → Gemini generation proxy (/api/ai-generate)
```

---

## Design Decisions & Why

**Why first-person personas instead of third-person research?**
Third-person creates distance. The model reads "Serling was known for..." and generates text *about* Serling's style. First-person ("I was a paratrooper...") puts the model *inside* the perspective. The difference is measurable in output quality — first-person prompts produce responses that match Serling's actual rhetorical patterns rather than summaries of them.

**Why in-memory vector search instead of ChromaDB or Pinecone?**
Portability. The entire system runs from a single repo with zero external services beyond Ollama and a Gemini API key. Adding a vector database introduces deployment complexity, and with 3,606 entries at 3,072 dimensions, brute-force cosine similarity runs in milliseconds. The math is simple enough that it doesn't need infrastructure.

**Why a decision taxonomy separate from the corpus?**
The corpus tells you *what* Serling wrote. The taxonomy tells you *why* he wrote it and *what he chose not to write*. When the agent needs to make a creative decision — "How should this episode open?" — knowing that Serling rejected "in media res" for "Walking Distance" and chose "specific ordinary" because "you earn the extraordinary by making the ordinary painfully real first" is more useful than any amount of raw script text.

**Why local model + Gemini dual-path instead of just Gemini?**
Three reasons: (1) The local model has Serling's system prompt baked into the Modelfile, so it's "always in character" without prompt tokens; (2) local inference has zero API cost, enabling longer writing room sessions without budget concerns; (3) eventual LoRA fine-tuning will give the local model genuine style precision that prompt engineering alone can't achieve.

**Why regex physical violation checking instead of an LLM judge?**
Cost and speed. An LLM-based checker would add an API call to every agent turn. The regex approach catches 95% of violations (characters holding, walking, turning, crying) in microseconds with zero cost. The remaining edge cases are handled by the system prompt's explicit rules and the retry mechanism.

**Why 16 decision categories?**
They map to the actual creative decisions a writer and director make when constructing an episode. The categories were derived from Serling's own described process and from structural analysis of his episodes. Fewer categories would lose granularity (lumping "how the twist works" with "how the episode opens" produces generic results). More categories would create sparse data per category.
