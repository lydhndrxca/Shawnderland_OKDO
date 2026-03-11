import type { FlowState } from '@/lib/ideation/state/sessionTypes';

/**
 * Node IDs MUST match the stage names in STAGE_ORDER so the pipeline
 * sync logic (auto-spawn, result nodes, edge state) can find them.
 */
export const DEFAULT_SHAWNDERMIND_LAYOUT: FlowState = {
  nodes: [
    { id: 'seed',             position: { x: 200,  y: 160 }, type: 'seed' },
    { id: 'normalize',        position: { x: 560,  y: 160 }, type: 'normalize' },
    { id: 'diverge',          position: { x: 880,  y: 160 }, type: 'diverge' },
    { id: 'critique-salvage', position: { x: 1200, y: 160 }, type: 'critique-salvage' },
    { id: 'expand',           position: { x: 1520, y: 160 }, type: 'expand' },
    { id: 'converge',         position: { x: 1840, y: 160 }, type: 'converge' },
    { id: 'commit',           position: { x: 2140, y: 160 }, type: 'commit' },
    { id: 'iterate',          position: { x: 2440, y: 160 }, type: 'iterate' },
    { id: 'report-default',   position: { x: 2740, y: 160 }, type: 'generateReport' },
  ],
  edges: [
    { id: 'e-seed-normalize',        source: 'seed',             target: 'normalize' },
    { id: 'e-normalize-diverge',     source: 'normalize',        target: 'diverge' },
    { id: 'e-diverge-critique',      source: 'diverge',          target: 'critique-salvage' },
    { id: 'e-critique-expand',       source: 'critique-salvage', target: 'expand' },
    { id: 'e-expand-converge',       source: 'expand',           target: 'converge' },
    { id: 'e-converge-commit',       source: 'converge',         target: 'commit' },
    { id: 'e-commit-iterate',        source: 'commit',           target: 'iterate' },
    { id: 'e-iterate-report',        source: 'iterate',          target: 'report-default' },
  ],
  nodeData: {
    seed: { seedText: '', seedContext: '', seedMedia: [] },
  },
  viewport: { x: 364.69, y: 292.28, zoom: 0.379 },
};
