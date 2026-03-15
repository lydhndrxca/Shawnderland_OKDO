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
  peraMind: boolean;
  peraVoice: boolean;
  fallbackModel: string | null;
}

const WRITER_SYSTEM = `You are a prose style filter trained on Joe Pera's writing voice.

Your task: take the provided text and rewrite it to match Pera's actual writing style while preserving ALL content, structure, meaning, and creative decisions exactly.

Pera voice characteristics:
- Gentle, slow, grandfatherly delivery — the opposite of aggressive comedy
- Topics about mundane life rendered extraordinary: iron, beans, breakfast, chairs, grocery stores
- Upper Peninsula Michigan setting (Marquette) — earnest, soft-spoken, deeply empathetic
- Anti-cringe: warmth instead of discomfort, sincerity instead of irony
- Meditative pacing — holds on moments, lets silence breathe
- Emotional arcs hidden inside simple lessons (grief, love, anxiety)
- Choir teacher character — earnest, soft-spoken, deeply empathetic
- Avoids: punchlines, irony, cynicism, sarcasm, aggressive pacing

DO NOT change the story, structure, characters, or any creative decision.
ONLY adjust voice, cadence, word choice, and prose rhythm.`;

const DIRECTOR_SYSTEM = `You are a directorial voice filter trained on Joe Pera's approach to visual storytelling.

Your task: take the provided directorial notes/shot descriptions and rewrite them in Pera's directorial voice while preserving ALL staging, camera, and technical decisions exactly.

Pera directorial voice characteristics:
- Patient, observational filmmaking — "we hold," "we linger," "the camera waits"
- Patient wide shots — letting scenes breathe, no rush to cut
- Close-ups on objects — the mundane made sacred (iron, beans, breakfast, chairs)
- Landscape establishing — Upper Peninsula Michigan, Marquette, nature as character
- Handheld intimate — "homemade" quality, graceful, patient
- Visual style: patient, gracefully shot, "homemade" quality
- Silence described as meditative — "we sit with this for a moment," "the room holds"

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

export async function refinePeraVoice(
  text: string,
  options: VoiceRefinementOptions = {},
): Promise<string> {
  const { model = "pera-voice", role = "writer", enabled = true } = options;

  if (!enabled) return text;

  const systemPrompt = role === "director" ? DIRECTOR_SYSTEM : WRITER_SYSTEM;
  const result = await ollamaRequest(
    model,
    systemPrompt,
    `Rewrite the following in Joe Pera's ${role === "director" ? "directorial" : "writing"} voice. Preserve all content and decisions exactly:\n\n${text}`,
    0.6,
  );

  return result || text;
}

export async function generateLocal(
  options: LocalGenerationOptions,
): Promise<string | null> {
  const { model = "pera-mind", system, prompt, temperature = 0.75 } = options;
  return ollamaRequest(model, system, prompt, temperature);
}

let _cachedStatus: LocalModelStatus | null = null;
let _statusAge = 0;
const STATUS_TTL = 60000;

export async function getLocalModelStatus(): Promise<LocalModelStatus> {
  const now = Date.now();
  if (_cachedStatus && now - _statusAge < STATUS_TTL) return _cachedStatus;

  const models = await listModels();

  const hasMind = models.some((m: string) => m.startsWith("pera-mind"));
  const hasVoice = models.some((m: string) => m.startsWith("pera-voice"));

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
    peraMind: hasMind,
    peraVoice: hasVoice,
    fallbackModel: fallback,
  };
  _statusAge = now;

  return _cachedStatus;
}

export async function isLocalModelAvailable(): Promise<boolean> {
  const status = await getLocalModelStatus();
  return status.available;
}
