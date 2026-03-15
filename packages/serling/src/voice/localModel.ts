const OLLAMA_URL = "/api/ai-local";

export interface VoiceRefinementOptions {
  model?: string;
  role?: "writer" | "director";
  enabled?: boolean;
}

export interface LocalGenerationOptions {
  model?: string;
  system: string;
  prompt: string;
  temperature?: number;
}

export interface LocalModelStatus {
  available: boolean;
  serlingMind: boolean;
  serlingVoice: boolean;
  fallbackModel: string | null;
}

const WRITER_SYSTEM = `You are a prose style filter trained on Rod Serling's writing voice.

Your task: take the provided text and rewrite it to match Serling's actual prose style while preserving ALL content, structure, meaning, and creative decisions exactly.

Serling voice characteristics:
- Measured, deliberate cadence with strategic pauses embedded in the prose rhythm
- Declarative sentences that land with quiet authority, rarely exclamatory
- Specificity over abstraction — names the street, the time, the exact shade of light
- Repetition as emphasis, not redundancy — key phrases return with shifted meaning
- Parenthetical asides that feel like the narrator confiding in you personally
- Understatement at emotional peaks — the bigger the moment, the quieter the language
- Oxford commas, em-dashes for interjection, ellipses only at endings never mid-sentence
- Words like: "submitted," "thereof," "the vicinity of," "a certain," "not unlike"
- Avoids: exclamation marks, slang, contractions in narration, purple prose, cliché metaphors

DO NOT change the story, structure, characters, or any creative decision.
ONLY adjust voice, cadence, word choice, and prose rhythm.`;

const DIRECTOR_SYSTEM = `You are a directorial voice filter trained on Rod Serling's approach to visual storytelling direction.

Your task: take the provided directorial notes/shot descriptions and rewrite them in Serling's directorial voice while preserving ALL staging, camera, and technical decisions exactly.

Serling directorial voice characteristics:
- Precise, almost clinical stage direction with emotional undercurrent
- Camera described as observing rather than capturing — "we find," "we hold on," "the camera discovers"
- Lighting described through emotional function, not just technical terms
- Space and silence given equal weight to action and dialogue
- Blocking described in terms of power dynamics and psychological distance
- Transitions treated as punctuation — each cut has intention

DO NOT change any staging, camera, lighting, or technical decision.
ONLY adjust the language and voice of the descriptions.`;

async function ollamaRequest(
  model: string,
  system: string,
  prompt: string,
  temperature = 0.7,
): Promise<string | null> {
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, system, prompt, temperature }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    return json.text || null;
  } catch {
    return null;
  }
}

async function listModels(): Promise<string[]> {
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "GET",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.models || [];
  } catch {
    return [];
  }
}

/* ─── Voice Refinement (existing pipeline) ─── */

export async function refineSerlingVoice(
  text: string,
  options: VoiceRefinementOptions = {},
): Promise<string> {
  const { model = "serling-voice", role = "writer", enabled = true } = options;

  if (!enabled) return text;

  const systemPrompt = role === "director" ? DIRECTOR_SYSTEM : WRITER_SYSTEM;
  const result = await ollamaRequest(
    model,
    systemPrompt,
    `Rewrite the following in Rod Serling's ${role === "director" ? "directorial" : "prose"} voice. Preserve all content and decisions exactly:\n\n${text}`,
    0.6,
  );

  return result || text;
}

/* ─── Full Local Generation (new: Serling thinks locally) ─── */

export async function generateLocal(
  options: LocalGenerationOptions,
): Promise<string | null> {
  const { model = "serling-mind", system, prompt, temperature = 0.8 } = options;
  return ollamaRequest(model, system, prompt, temperature);
}

/* ─── Model Availability Check ─── */

let _cachedStatus: LocalModelStatus | null = null;
let _statusAge = 0;
const STATUS_TTL = 60000; // 1 minute cache

export async function getLocalModelStatus(): Promise<LocalModelStatus> {
  const now = Date.now();
  if (_cachedStatus && now - _statusAge < STATUS_TTL) return _cachedStatus;

  const models = await listModels();

  const hasMind = models.some((m: string) => m.startsWith("serling-mind"));
  const hasVoice = models.some((m: string) => m.startsWith("serling-voice"));

  let fallback: string | null = null;
  if (!hasMind) {
    for (const candidate of ["mistral-nemo:12b", "mistral:7b", "llama3:8b"]) {
      if (models.some((m: string) => m.startsWith(candidate.split(":")[0]))) {
        fallback = candidate;
        break;
      }
    }
  }

  _cachedStatus = {
    available: hasMind || hasVoice || fallback !== null,
    serlingMind: hasMind,
    serlingVoice: hasVoice,
    fallbackModel: fallback,
  };
  _statusAge = now;

  return _cachedStatus;
}

export async function isLocalModelAvailable(): Promise<boolean> {
  const status = await getLocalModelStatus();
  return status.available;
}
