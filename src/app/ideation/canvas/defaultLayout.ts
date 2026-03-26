import type { FlowState } from '@/lib/ideation/state/sessionTypes';

/**
 * Node IDs MUST match the stage names in STAGE_ORDER so the pipeline
 * sync logic (auto-spawn, result nodes, edge state) can find them.
 */
export const DEFAULT_SHAWNDERMIND_LAYOUT: FlowState = {
  nodes: [
    { id: 'seed',             position: { x: 200,  y: 160 }, type: 'seed' },
    { id: 'wr-persona',       position: { x: 480,  y: 160 }, type: 'wrPersona' },
    { id: 'agent-thinking',   position: { x: 440,  y: 420 }, type: 'agentThinking' },
    { id: 'normalize',        position: { x: 760,  y: 160 }, type: 'normalize' },
    { id: 'diverge',          position: { x: 1080, y: 160 }, type: 'diverge' },
    { id: 'critique-salvage', position: { x: 1400, y: 160 }, type: 'critique-salvage' },
    { id: 'expand',           position: { x: 1720, y: 160 }, type: 'expand' },
    { id: 'converge',         position: { x: 2040, y: 160 }, type: 'converge' },
    { id: 'commit',           position: { x: 2340, y: 160 }, type: 'commit' },
    { id: 'iterate',          position: { x: 2640, y: 160 }, type: 'iterate' },
    { id: 'report-default',   position: { x: 2940, y: 160 }, type: 'generateReport' },
  ],
  edges: [
    { id: 'e-seed-wrpersona',       source: 'seed',             target: 'wr-persona' },
    { id: 'e-wrpersona-thinking',   source: 'wr-persona',       target: 'agent-thinking' },
    { id: 'e-wrpersona-normalize',  source: 'wr-persona',       target: 'normalize' },
    { id: 'e-normalize-diverge',    source: 'normalize',        target: 'diverge' },
    { id: 'e-diverge-critique',     source: 'diverge',          target: 'critique-salvage' },
    { id: 'e-critique-expand',      source: 'critique-salvage', target: 'expand' },
    { id: 'e-expand-converge',      source: 'expand',           target: 'converge' },
    { id: 'e-converge-commit',      source: 'converge',         target: 'commit' },
    { id: 'e-commit-iterate',       source: 'commit',           target: 'iterate' },
    { id: 'e-iterate-report',       source: 'iterate',          target: 'report-default' },
  ],
  nodeData: {
    seed: { seedText: '', seedContext: '', seedMedia: [] },
    'wr-persona': { personaId: '', moodDirective: '', useCurrentEvents: false, currentEventsCache: null, enabledKnowledgeDocs: [] },
    'agent-thinking': { thoughts: [] },
  },
  viewport: { x: 364.69, y: 292.28, zoom: 0.379 },
};
