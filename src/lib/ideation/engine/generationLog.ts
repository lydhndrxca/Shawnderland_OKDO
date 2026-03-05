const DB_NAME = 'shawndermind_generation_log';
const DB_VERSION = 2;
const STORE_NAME = 'entries';

/** Snapshot of what the pipeline looked like when this generation happened */
export interface LineageContext {
  seedText: string;
  seedContext?: string;
  projectName: string;
  branchId: string;
  /** Which pipeline stages had completed outputs at generation time */
  completedStages: string[];
  /** The full chain: stage -> its output summary, ordered seed->iterate */
  pipelineChain: Array<{ stage: string; outputPreview: string }>;
  /** Active influences/modifiers on the canvas */
  activeInfluences: Array<{ type: string; nodeId: string; value: string }>;
  /** Custom instructions the user had set on this node */
  customInstructions?: string;
  /** Connected upstream node IDs (what fed into this generation) */
  connectedInputs: Array<{ nodeId: string; nodeType: string }>;
  /** Flow graph edges snapshot at time of generation */
  graphEdges: Array<{ source: string; target: string }>;
  /** Settings active at time of generation */
  settings: { providerMode: string; crossCultural: boolean };
}

export interface GenerationLogEntry {
  id: string;
  timestamp: string;
  sessionId: string;
  category: 'pipeline' | 'image' | 'video' | 'text' | 'extract';
  source: string;
  model?: string;
  prompt?: string;
  inputSummary?: string;
  output: unknown;
  durationMs?: number;
  tokenUsage?: { input: number; output: number };
  costEstimate?: number;
  lineage?: LineageContext;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by_session', 'sessionId', { unique: false });
        store.createIndex('by_timestamp', 'timestamp', { unique: false });
        store.createIndex('by_category', 'category', { unique: false });
      }
      // v2 adds lineage field — no schema change needed for IndexedDB, just the version bump
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

const STAGE_ORDER = ['seed', 'normalize', 'diverge', 'critique-salvage', 'expand', 'converge', 'commit', 'iterate'];

const INFLUENCE_NODE_TYPES = new Set([
  'emotion', 'influence', 'textInfluence', 'documentInfluence',
  'imageInfluence', 'linkInfluence', 'videoInfluence', 'imageReference',
]);

function summarizeOutput(output: unknown): string {
  if (!output || typeof output !== 'object') return String(output ?? '');
  const o = output as Record<string, unknown>;
  if (typeof o.seedText === 'string') return o.seedText.slice(0, 120);
  if (typeof o.seedSummary === 'string') return o.seedSummary.slice(0, 120);
  if (Array.isArray(o.candidates)) return `${o.candidates.length} candidates`;
  if (Array.isArray(o.critiques)) return `${o.critiques.length} critiques, ${(o.mutations as unknown[])?.length ?? 0} mutations`;
  if (Array.isArray(o.expansions)) return `${o.expansions.length} expansions`;
  if (Array.isArray(o.scorecard)) return `${o.scorecard.length} scored, winner: ${o.winnerId ?? '?'}`;
  if (typeof o.title === 'string') return o.title.slice(0, 120);
  if (typeof o.nextPromptSuggestions === 'string') return o.nextPromptSuggestions.slice(0, 120);
  return JSON.stringify(output).slice(0, 100);
}

export interface SessionSnapshot {
  id: string;
  seedText: string;
  seedContext?: string;
  projectName: string;
  activeBranchId: string;
  settings: { providerMode: string; crossCulturalEnabled: boolean };
  stageState: Record<string, { output?: unknown; stale?: boolean }>;
  flowState?: {
    nodes?: Array<{ id: string; type?: string }>;
    edges?: Array<{ id?: string; source: string; target: string }>;
    nodeData?: Record<string, Record<string, unknown>>;
  };
}

export function buildLineageContext(
  session: SessionSnapshot,
  sourceNodeId?: string,
): LineageContext {
  const stageState = session.stageState as Record<string, { output?: unknown }>;
  const completedStages = STAGE_ORDER.filter((s) => stageState[s]?.output);
  const pipelineChain = completedStages.map((s) => ({
    stage: s,
    outputPreview: summarizeOutput(stageState[s]?.output),
  }));

  const flowNodes = session.flowState?.nodes ?? [];
  const flowEdges = session.flowState?.edges ?? [];
  const nodeData = session.flowState?.nodeData ?? {};

  const activeInfluences: LineageContext['activeInfluences'] = [];
  for (const n of flowNodes) {
    if (!n.type || !INFLUENCE_NODE_TYPES.has(n.type)) continue;
    const d = nodeData[n.id];
    const text = (d?.nodeText as string) ?? (d?.nodeNotes as string) ?? (d?.url as string) ?? '';
    if (text.trim()) {
      activeInfluences.push({ type: n.type, nodeId: n.id, value: text.trim().slice(0, 200) });
    }
  }

  const connectedInputs: LineageContext['connectedInputs'] = [];
  if (sourceNodeId) {
    for (const e of flowEdges) {
      if (e.target === sourceNodeId || (e.source === sourceNodeId)) {
        const otherId = e.target === sourceNodeId ? e.source : e.target;
        const otherNode = flowNodes.find((n) => n.id === otherId);
        connectedInputs.push({ nodeId: otherId, nodeType: otherNode?.type ?? 'unknown' });
      }
    }
  }

  const customInstructions = sourceNodeId ? (nodeData[sourceNodeId]?.customInstructions as string) ?? undefined : undefined;

  return {
    seedText: session.seedText,
    seedContext: session.seedContext,
    projectName: session.projectName,
    branchId: session.activeBranchId,
    completedStages,
    pipelineChain,
    activeInfluences,
    customInstructions,
    connectedInputs,
    graphEdges: flowEdges.map((e) => ({ source: e.source, target: e.target })),
    settings: {
      providerMode: session.settings.providerMode,
      crossCultural: session.settings.crossCulturalEnabled,
    },
  };
}

export async function logGeneration(entry: Omit<GenerationLogEntry, 'id' | 'timestamp'>): Promise<string> {
  const id = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const full: GenerationLogEntry = {
    ...entry,
    id,
    timestamp: new Date().toISOString(),
  };
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(full);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[GenerationLog] Failed to write entry:', err);
  }
  return id;
}

export async function getSessionHistory(sessionId: string): Promise<GenerationLogEntry[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index('by_session');
    const req = index.getAll(sessionId);
    return await new Promise<GenerationLogEntry[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function getAllHistory(limit = 500): Promise<GenerationLogEntry[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index('by_timestamp');
    const req = index.openCursor(null, 'prev');
    const results: GenerationLogEntry[] = [];
    return await new Promise<GenerationLogEntry[]>((resolve, reject) => {
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function clearSessionHistory(sessionId: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('by_session');
    const req = index.openCursor(sessionId);
    await new Promise<void>((resolve, reject) => {
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    // silent
  }
}

export async function clearAllHistory(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // silent
  }
}

export async function exportSessionHistory(sessionId: string): Promise<GenerationLogEntry[]> {
  return getSessionHistory(sessionId);
}

/** Group entries by seed idea for research analysis */
export interface ResearchExport {
  exportedAt: string;
  totalEntries: number;
  /** Entries grouped by session -> seed idea -> pipeline chain */
  sessions: Array<{
    sessionId: string;
    seedText: string;
    seedContext?: string;
    projectName: string;
    entries: GenerationLogEntry[];
    pipelineTrace: Array<{ stage: string; timestamp: string; outputPreview: string }>;
    outputTrace: Array<{ category: string; source: string; model?: string; prompt?: string; timestamp: string }>;
  }>;
}

export async function exportForResearch(): Promise<ResearchExport> {
  const all = await getAllHistory(10000);
  const bySession = new Map<string, GenerationLogEntry[]>();
  for (const e of all) {
    const arr = bySession.get(e.sessionId) ?? [];
    arr.push(e);
    bySession.set(e.sessionId, arr);
  }

  const sessions: ResearchExport['sessions'] = [];

  for (const [sessionId, entries] of bySession) {
    entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const seedEntry = entries.find((e) => e.source === 'seed');
    const lineage = seedEntry?.lineage ?? entries.find((e) => e.lineage)?.lineage;

    const pipelineEntries = entries.filter((e) => e.category === 'pipeline');
    const outputEntries = entries.filter((e) => e.category !== 'pipeline');

    sessions.push({
      sessionId,
      seedText: lineage?.seedText ?? seedEntry?.inputSummary ?? '(unknown)',
      seedContext: lineage?.seedContext,
      projectName: lineage?.projectName ?? '(untitled)',
      entries,
      pipelineTrace: pipelineEntries.map((e) => ({
        stage: e.source,
        timestamp: e.timestamp,
        outputPreview: typeof e.output === 'string' ? e.output.slice(0, 200) : JSON.stringify(e.output).slice(0, 200),
      })),
      outputTrace: outputEntries.map((e) => ({
        category: e.category,
        source: e.source,
        model: e.model,
        prompt: e.prompt ?? e.inputSummary,
        timestamp: e.timestamp,
      })),
    });
  }

  sessions.sort((a, b) => {
    const aT = a.entries[0]?.timestamp ?? '';
    const bT = b.entries[0]?.timestamp ?? '';
    return bT.localeCompare(aT);
  });

  return { exportedAt: new Date().toISOString(), totalEntries: all.length, sessions };
}

export function downloadResearchExport(data: ResearchExport): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shawndermind-research-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
