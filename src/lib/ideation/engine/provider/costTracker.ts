const STORAGE_KEY = 'shawndermind_api_costs';

// Pricing per 1M tokens (Gemini 2.0 Flash / Flash-Exp)
const GEMINI_FLASH_INPUT_PER_M = 0.10;
const GEMINI_FLASH_OUTPUT_PER_M = 0.40;

// Imagen pricing per image generated
const IMAGEN_3_PER_IMAGE = 0.03;
const IMAGEN_4_PER_IMAGE = 0.04;

// Veo pricing per second of video
const VEO_2_PER_SEC = 0.35;
const VEO_3_PER_SEC = 0.35;

export interface ModelUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  imagesGenerated: number;
  videoSeconds: number;
  cost: number;
}

export interface AppUsage {
  calls: number;
  cost: number;
}

export interface CostSnapshot {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  apiCalls: number;
  estimatedCost: number;
  firstCallAt: string | null;
  lastCallAt: string | null;
  byModel: Record<string, ModelUsage>;
  byApp: Record<string, AppUsage>;
}

interface StoredData {
  inputTokens: number;
  outputTokens: number;
  apiCalls: number;
  firstCallAt: string | null;
  lastCallAt: string | null;
  byModel: Record<string, ModelUsage>;
  byApp: Record<string, AppUsage>;
  totalCost: number;
}

const emptyStored = (): StoredData => ({
  inputTokens: 0, outputTokens: 0, apiCalls: 0,
  firstCallAt: null, lastCallAt: null,
  byModel: {}, byApp: {}, totalCost: 0,
});

/** Set the active app key so all subsequent record calls are attributed to it. */
export function setActiveApp(appKey: string) {
  _activeApp = appKey;
}

export function getActiveApp(): string {
  return _activeApp;
}

let _activeApp = 'unknown';

function ensureApp(app: string): AppUsage {
  if (!data.byApp[app]) {
    data.byApp[app] = { calls: 0, cost: 0 };
  }
  return data.byApp[app];
}

let data: StoredData = emptyStored();
let listeners: Array<() => void> = [];
let hydrated = false;

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredData>;
      data = {
        inputTokens: parsed.inputTokens ?? 0,
        outputTokens: parsed.outputTokens ?? 0,
        apiCalls: parsed.apiCalls ?? 0,
        firstCallAt: parsed.firstCallAt ?? null,
        lastCallAt: parsed.lastCallAt ?? null,
        byModel: parsed.byModel ?? {},
        byApp: parsed.byApp ?? {},
        totalCost: parsed.totalCost ?? 0,
      };
      snapshotVersion++;
    }
  } catch { /* ignore corrupt storage */ }
}

function persist() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch { /* storage full or unavailable */ }
}

function ensureModel(model: string): ModelUsage {
  if (!data.byModel[model]) {
    data.byModel[model] = { calls: 0, inputTokens: 0, outputTokens: 0, imagesGenerated: 0, videoSeconds: 0, cost: 0 };
  }
  return data.byModel[model];
}

function computeTokenCost(model: string, input: number, output: number): number {
  // All current Gemini text/vision models use Flash pricing
  void model;
  return (input / 1_000_000) * GEMINI_FLASH_INPUT_PER_M
       + (output / 1_000_000) * GEMINI_FLASH_OUTPUT_PER_M;
}

/** Record token-based usage from a Gemini API response's usageMetadata */
export function recordUsage(
  usage: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number },
  model = 'gemini-2.0-flash',
) {
  hydrate();
  const now = new Date().toISOString();
  const input = usage.promptTokenCount ?? 0;
  const output = usage.candidatesTokenCount ?? 0;
  const callCost = computeTokenCost(model, input, output);

  data.inputTokens += input;
  data.outputTokens += output;
  data.apiCalls += 1;
  data.totalCost += callCost;
  if (!data.firstCallAt) data.firstCallAt = now;
  data.lastCallAt = now;

  const m = ensureModel(model);
  m.calls += 1;
  m.inputTokens += input;
  m.outputTokens += output;
  m.cost += callCost;

  const a = ensureApp(_activeApp);
  a.calls += 1;
  a.cost += callCost;

  persist();
  notifyListeners();
}

/** Record Imagen image generation (priced per image, not tokens) */
export function recordImagenUsage(model: string, imageCount: number) {
  hydrate();
  const now = new Date().toISOString();
  const perImage = model.startsWith('imagen-4') ? IMAGEN_4_PER_IMAGE : IMAGEN_3_PER_IMAGE;
  const callCost = perImage * imageCount;

  data.apiCalls += 1;
  data.totalCost += callCost;
  if (!data.firstCallAt) data.firstCallAt = now;
  data.lastCallAt = now;

  const m = ensureModel(model);
  m.calls += 1;
  m.imagesGenerated += imageCount;
  m.cost += callCost;

  const a = ensureApp(_activeApp);
  a.calls += 1;
  a.cost += callCost;

  persist();
  notifyListeners();
}

/** Record Veo video generation (priced per second of video) */
export function recordVeoUsage(model: string, durationSeconds: number) {
  hydrate();
  const now = new Date().toISOString();
  const perSec = model.startsWith('veo-3') ? VEO_3_PER_SEC : VEO_2_PER_SEC;
  const callCost = perSec * durationSeconds;

  data.apiCalls += 1;
  data.totalCost += callCost;
  if (!data.firstCallAt) data.firstCallAt = now;
  data.lastCallAt = now;

  const m = ensureModel(model);
  m.calls += 1;
  m.videoSeconds += durationSeconds;
  m.cost += callCost;

  const a = ensureApp(_activeApp);
  a.calls += 1;
  a.cost += callCost;

  persist();
  notifyListeners();
}

let cachedSnapshot: CostSnapshot | null = null;
let snapshotVersion = 0;
let cachedVersion = -1;

export function getSnapshot(): CostSnapshot {
  hydrate();
  if (cachedSnapshot && cachedVersion === snapshotVersion) return cachedSnapshot;
  const total = data.inputTokens + data.outputTokens;
  cachedSnapshot = {
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    totalTokens: total,
    apiCalls: data.apiCalls,
    estimatedCost: data.totalCost,
    firstCallAt: data.firstCallAt,
    lastCallAt: data.lastCallAt,
    byModel: { ...data.byModel },
    byApp: { ...data.byApp },
  };
  cachedVersion = snapshotVersion;
  return cachedSnapshot;
}

export function resetCosts() {
  data = emptyStored();
  persist();
  notifyListeners();
}

export function subscribeCosts(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notifyListeners() {
  snapshotVersion++;
  for (const l of listeners) l();
}
