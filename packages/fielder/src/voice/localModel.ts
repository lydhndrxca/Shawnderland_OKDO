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
  fielderMind: boolean;
  fielderVoice: boolean;
  fallbackModel: string | null;
}

const WRITER_SYSTEM = `You are a prose style filter trained on Nathan Fielder's writing voice.

Your task: take the provided text and rewrite it to match Fielder's actual writing style while preserving ALL content, structure, meaning, and creative decisions exactly.

Fielder voice characteristics:
- Deadpan delivery — statements of absurdity presented as completely reasonable
- Business-school precision applied to ridiculous premises
- Short, declarative sentences with clinical detachment
- Silences and pauses implied through sentence structure — trailing thoughts, incomplete ideas
- Uses "I thought" and "I figured" as introductions to increasingly elaborate plans
- Presents emotional observations as factual statements without sentiment
- Specific details that are both mundane and deeply odd — exact times, exact costs, exact legal citations
- Avoids: exclamation marks, emotional language, obvious jokes, ironic signaling, winking at the audience

DO NOT change the story, structure, characters, or any creative decision.
ONLY adjust voice, cadence, word choice, and prose rhythm.`;

const DIRECTOR_SYSTEM = `You are a directorial voice filter trained on Nathan Fielder's approach to visual storytelling.

Your task: take the provided directorial notes/shot descriptions and rewrite them in Fielder's directorial voice while preserving ALL staging, camera, and technical decisions exactly.

Fielder directorial voice characteristics:
- Documentary observation stance — "we see," "we find," "the camera holds"
- Patient, unhurried descriptions that emphasize duration and stillness
- Environmental sound prioritized over score — "the hum of fluorescent lights," "ambient parking lot noise"
- Reaction shots described with specificity — what the face is doing, not what the emotion is
- Silence described as an active element — "three seconds of nothing" is a directorial choice
- Lighting described through source, not mood — "the overhead fluorescent" not "eerie lighting"
- Framing described functionally — what's in frame and what's not, not aesthetic judgments

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

export async function refineFielderVoice(
  text: string,
  options: VoiceRefinementOptions = {},
): Promise<string> {
  const { model = "fielder-voice", role = "writer", enabled = true } = options;

  if (!enabled) return text;

  const systemPrompt = role === "director" ? DIRECTOR_SYSTEM : WRITER_SYSTEM;
  const result = await ollamaRequest(
    model,
    systemPrompt,
    `Rewrite the following in Nathan Fielder's ${role === "director" ? "directorial" : "writing"} voice. Preserve all content and decisions exactly:\n\n${text}`,
    0.6,
  );

  return result || text;
}

export async function generateLocal(
  options: LocalGenerationOptions,
): Promise<string | null> {
  const { model = "fielder-mind", system, prompt, temperature = 0.75 } = options;
  return ollamaRequest(model, system, prompt, temperature);
}

let _cachedStatus: LocalModelStatus | null = null;
let _statusAge = 0;
const STATUS_TTL = 60000;

export async function getLocalModelStatus(): Promise<LocalModelStatus> {
  const now = Date.now();
  if (_cachedStatus && now - _statusAge < STATUS_TTL) return _cachedStatus;

  const models = await listModels();

  const hasMind = models.some((m: string) => m.startsWith("fielder-mind"));
  const hasVoice = models.some((m: string) => m.startsWith("fielder-voice"));

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
    fielderMind: hasMind,
    fielderVoice: hasVoice,
    fallbackModel: fallback,
  };
  _statusAge = now;

  return _cachedStatus;
}

export async function isLocalModelAvailable(): Promise<boolean> {
  const status = await getLocalModelStatus();
  return status.available;
}
