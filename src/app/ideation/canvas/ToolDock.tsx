"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Lock, Unlock } from 'lucide-react';
import {
  STAGE_ORDER, NODE_META,
  OUTPUT_NODE_TYPES, INPUT_NODE_TYPES, INFLUENCE_NODE_TYPES, UTILITY_NODE_TYPES, CONTROL_NODE_TYPES,
  OUTPUT_NODE_META, INPUT_NODE_META, INFLUENCE_NODE_META, UTILITY_NODE_META, CONTROL_NODE_META,
  CONCEPTLAB_NODE_TYPES, CONCEPTLAB_NODE_META,
} from './nodes/nodeRegistry';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { getStageOutput, isStageStale } from '@/lib/ideation/state/sessionSelectors';
import type { StageId } from '@/lib/ideation/engine/stages';
import type {
  NormalizeOutput,
  DivergeOutput,
  CritiqueSalvageOutput,
  ExpandOutput,
  ConvergeOutput,
  CommitOutput,
  IterateOutput,
} from '@/lib/ideation/engine/schemas';
import './ToolDock.css';

interface ToolDockProps {
  inspectorNodeId: string | null;
  onCloseInspector: () => void;
}

interface CategoryDef {
  key: string;
  label: string;
  icon: string;
  items: Array<{ id: string; label: string; color: string; subtitle: string }>;
}

const STAGE_SUBTITLES: Record<string, string> = {
  seed: 'Your starting idea',
  normalize: 'Break down & clarify',
  diverge: 'Brainstorm variations',
  'critique-salvage': 'Rate & improve',
  expand: 'Deep dive into best',
  converge: 'Score & pick winner',
  commit: 'Create final artifact',
  iterate: 'Plan what\u2019s next',
};

const NODE_SUBTITLES: Record<string, string> = {
  textOutput: 'Generate text',
  imageOutput: 'Generate images',
  videoOutput: 'Generate video',
  extractData: 'Read image with AI',
  count: 'Set result quantity',
  emotion: 'Set emotional tone',
  influence: 'Apply creative persona',
  textInfluence: 'Paste text input',
  documentInfluence: 'Upload a document',
  imageInfluence: 'Add image input',
  linkInfluence: 'Add URL / link',
  videoInfluence: 'Add video file',
  imageReference: 'Add reference image',
  start: 'Run the pipeline',
  character: 'Design a character',
  weapon: 'Design a weapon',
  turnaround: 'Multi-view turnaround',
};

function buildCategories(): CategoryDef[] {
  const referenceInfluences = ['textInfluence', 'documentInfluence', 'imageInfluence', 'linkInfluence', 'videoInfluence', 'imageReference'] as const;
  const modifierInfluences = ['emotion', 'influence'] as const;

  return [
    {
      key: 'pipeline',
      label: 'Pipeline',
      icon: '\u26D3',
      items: STAGE_ORDER.map((s) => ({
        id: s,
        label: NODE_META[s].label,
        color: NODE_META[s].color,
        subtitle: STAGE_SUBTITLES[s] ?? '',
      })),
    },
    {
      key: 'inputs',
      label: 'Inputs & References',
      icon: '\u{1F4CE}',
      items: referenceInfluences.map((t) => {
        const infMeta = (INFLUENCE_NODE_META as Record<string, { label: string; color: string }>)[t];
        const utMeta = (UTILITY_NODE_META as Record<string, { label: string; color: string }>)[t];
        const meta = infMeta ?? utMeta;
        return {
          id: t,
          label: meta.label,
          color: meta.color,
          subtitle: NODE_SUBTITLES[t] ?? '',
        };
      }),
    },
    {
      key: 'modifiers',
      label: 'Modifiers',
      icon: '\u2699',
      items: [
        ...INPUT_NODE_TYPES.map((t) => ({
          id: t,
          label: INPUT_NODE_META[t].label,
          color: INPUT_NODE_META[t].color,
          subtitle: NODE_SUBTITLES[t] ?? '',
        })),
        ...modifierInfluences.map((t) => {
          const meta = INFLUENCE_NODE_META[t];
          return {
            id: t,
            label: meta.label,
            color: meta.color,
            subtitle: NODE_SUBTITLES[t] ?? '',
          };
        }),
      ],
    },
    {
      key: 'outputs',
      label: 'Outputs',
      icon: '\u25C8',
      items: [
        ...OUTPUT_NODE_TYPES.map((t) => ({
          id: t,
          label: OUTPUT_NODE_META[t].label,
          color: OUTPUT_NODE_META[t].color,
          subtitle: NODE_SUBTITLES[t] ?? '',
        })),
        ...UTILITY_NODE_TYPES.filter((t) => t === 'extractData').map((t) => ({
          id: t,
          label: UTILITY_NODE_META[t].label,
          color: UTILITY_NODE_META[t].color,
          subtitle: NODE_SUBTITLES[t] ?? '',
        })),
      ],
    },
    {
      key: 'control',
      label: 'Control',
      icon: '\u25B6',
      items: CONTROL_NODE_TYPES.map((t) => ({
        id: t,
        label: CONTROL_NODE_META[t].label,
        color: CONTROL_NODE_META[t].color,
        subtitle: NODE_SUBTITLES[t] ?? '',
      })),
    },
    {
      key: 'conceptlab',
      label: 'Concept Lab',
      icon: '\u{1F3A8}',
      items: CONCEPTLAB_NODE_TYPES.map((t) => ({
        id: t,
        label: CONCEPTLAB_NODE_META[t].label,
        color: CONCEPTLAB_NODE_META[t].color,
        subtitle: NODE_SUBTITLES[t] ?? '',
      })),
    },
    {
      key: 'uiElements',
      label: 'UI Elements',
      icon: '\u{1F532}',
      items: [
        { id: 'uiButton', label: 'Button', color: '#5c6bc0', subtitle: 'Resizable button placeholder' },
        { id: 'uiTextBox', label: 'Text Box', color: '#66bb6a', subtitle: 'Resizable text input placeholder' },
        { id: 'uiDropdown', label: 'Dropdown', color: '#ffa726', subtitle: 'Dropdown menu placeholder' },
        { id: 'uiImage', label: 'Image', color: '#ab47bc', subtitle: 'Image placeholder' },
        { id: 'uiGeneric', label: 'Node', color: '#607d8b', subtitle: 'Generic node with header' },
      ],
    },
    {
      key: 'uiContainers',
      label: 'Containers',
      icon: '\u{1F4E6}',
      items: [
        { id: 'uiWindow', label: 'Window', color: '#26a69a', subtitle: 'Window panel with title bar' },
        { id: 'uiFrame', label: 'Frame', color: '#78909c', subtitle: 'Layout frame / grouping' },
      ],
    },
  ];
}

export default function ToolDock({ inspectorNodeId, onCloseInspector }: ToolDockProps) {
  const [activeTab, setActiveTab] = useState<'nodes' | 'details'>('nodes');
  const [collapsed, setCollapsed] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const allCategories = buildCategories();
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categories = search.trim()
    ? allCategories
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (item) =>
              item.label.toLowerCase().includes(search.toLowerCase()) ||
              item.subtitle.toLowerCase().includes(search.toLowerCase()),
          ),
        }))
        .filter((cat) => cat.items.length > 0)
    : allCategories;

  useEffect(() => {
    if (inspectorNodeId) setActiveTab('details');
  }, [inspectorNodeId]);

  const cancelHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    cancelHideTimer();
    if (!pinned && collapsed) {
      setCollapsed(false);
    }
  }, [pinned, collapsed, cancelHideTimer]);

  const handleMouseLeave = useCallback(() => {
    if (!pinned && !collapsed) {
      setCollapsed(true);
    }
  }, [pinned, collapsed]);

  useEffect(() => {
    return () => cancelHideTimer();
  }, [cancelHideTimer]);

  if (collapsed) {
    return (
      <div
        className="tool-dock-collapsed-strip"
        onMouseEnter={handleMouseEnter}
      >
        <button
          className="tool-dock-strip-expand"
          onClick={() => setCollapsed(false)}
          title="Expand panel"
        >
          <span className="strip-chevron">&#x25B6;</span>
          <span className="strip-vertical-label">Nodes / Details</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="tool-dock-panel"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="tool-dock-tabs">
        <button
          className={`tool-dock-tab ${activeTab === 'nodes' ? 'active' : ''}`}
          onClick={() => setActiveTab('nodes')}
        >
          Nodes
        </button>
        <button
          className={`tool-dock-tab ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          className={`tool-dock-pin-btn ${pinned ? 'pinned' : ''}`}
          onClick={() => setPinned((p) => !p)}
          title={pinned ? 'Unlock — panel will auto-hide' : 'Lock — panel stays open'}
        >
          {pinned ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
      </div>

      <div className="tool-dock-content">
        {activeTab === 'nodes' ? (
          <div className="tool-dock-nodes-list">
            <div className="tool-dock-search">
              <input
                className="tool-dock-search-input"
                placeholder="Search nodes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {categories.map((cat) => (
              <div key={cat.key} className="tool-dock-category">
                <button
                  className={`tool-dock-cat-header ${openCat === cat.key || search.trim() ? 'open' : ''}`}
                  onClick={() => setOpenCat(openCat === cat.key ? null : cat.key)}
                >
                  <span className="tool-dock-cat-icon">{cat.icon}</span>
                  <span className="tool-dock-cat-label">{cat.label}</span>
                  <span className="tool-dock-cat-count">{cat.items.length}</span>
                  <span className="tool-dock-cat-chevron">{openCat === cat.key ? '\u25BE' : '\u25B8'}</span>
                </button>

                {(openCat === cat.key || search.trim()) && (
                  <div className="tool-dock-cat-items">
                    {cat.items.map((item) => (
                      <div
                        key={item.id}
                        className="tool-dock-item"
                        draggable
                        onDragStart={(e) => {
                          const dataKey = STAGE_ORDER.includes(item.id as typeof STAGE_ORDER[number])
                            ? 'application/reactflow-stage'
                            : 'application/reactflow-nodetype';
                          e.dataTransfer.setData(dataKey, item.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                      >
                        <div className="tool-dock-item-text">
                          <span className="tool-dock-item-label">{item.label}</span>
                          <span className="tool-dock-item-subtitle">{item.subtitle}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <DetailsTab nodeId={inspectorNodeId} onClose={onCloseInspector} />
        )}
      </div>

      {/* Full-height collapse strip on right edge */}
      <button
        className="tool-dock-edge-strip"
        onClick={() => setCollapsed(true)}
        title="Collapse panel"
      >
        <span className="strip-chevron">&#x25C0;</span>
        <span className="strip-vertical-label">Nodes / Details</span>
      </button>
    </div>
  );
}

/* ─────────── Details tab ─────────── */

function DetailsTab({ nodeId, onClose }: { nodeId: string | null; onClose: () => void }) {
  const { session, runStage, isRunning } = useSession();
  const [customInstructions, setCustomInstructions] = useState('');
  const [subName, setSubName] = useState('');
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const stageId = nodeId ? nodeId.split('-')[0] as StageId : null;
  const meta = stageId ? NODE_META[stageId] : null;
  const output = stageId ? getStageOutput(session, stageId) : null;
  const stale = stageId ? isStageStale(session, stageId) : false;

  const updateNodeData = useCallback((data: Record<string, unknown>) => {
    if (!nodeId) return;
    const w = window as unknown as { __updateNodeData?: (id: string, data: Record<string, unknown>) => void };
    w.__updateNodeData?.(nodeId, data);
  }, [nodeId]);

  useEffect(() => {
    if (!nodeId) return;
    const w = window as unknown as { __getNodeData?: (id: string) => Record<string, unknown> | undefined };
    const data = w.__getNodeData?.(nodeId);
    setCustomInstructions((data?.customInstructions as string) ?? '');
    setSubName((data?.subName as string) ?? '');
  }, [nodeId]);

  const handleSaveCustom = useCallback(() => {
    updateNodeData({ customInstructions, subName });
  }, [updateNodeData, customInstructions, subName]);

  const handleRestoreDefaults = useCallback(() => {
    setCustomInstructions('');
    setSubName('');
    updateNodeData({ customInstructions: '', subName: '' });
  }, [updateNodeData]);

  if (!nodeId) {
    return (
      <div className="tool-dock-details-empty">
        <span className="details-empty-icon">&#x25CE;</span>
        <p>Select a node to view details</p>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="tool-dock-details-empty">
        <p>No details available for this node</p>
        <button className="details-close-btn" onClick={onClose}>&times;</button>
      </div>
    );
  }

  const handleRun = async () => {
    if (!stageId) return;
    try { await runStage(stageId); } catch { /* shown elsewhere */ }
  };

  return (
    <div className="tool-dock-details">
      <div className="details-header" style={{ borderBottomColor: meta.color }}>
        <span className="details-dot" style={{ background: meta.color }} />
        <span className="details-title">{meta.label}</span>
        {stale && <span className="details-stale">Stale</span>}
        <button className="details-close-btn" onClick={onClose}>&times;</button>
      </div>

      <div className="details-body">
        {/* Node configuration section */}
        <div className="node-config-section">
          <h4 className="node-config-heading">Node Configuration</h4>

          <div className="node-config-field">
            <label className="node-config-label">Sub-name</label>
            <input
              type="text"
              className="node-config-input"
              placeholder="Optional label..."
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              onBlur={handleSaveCustom}
            />
          </div>

          <div className="node-config-field">
            <label className="node-config-label">Custom Instructions</label>
            <textarea
              className="node-config-textarea"
              placeholder="Add custom instructions that will be injected into the prompt sent to the AI..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              onBlur={handleSaveCustom}
              rows={5}
            />
            <p className="node-config-hint">
              This text is appended to the stage prompt before the AI call.
            </p>
          </div>

          <div className="node-config-actions">
            <button
              className="node-config-btn save"
              onClick={handleSaveCustom}
            >
              Save
            </button>
            <button
              className="node-config-btn restore"
              onClick={handleRestoreDefaults}
            >
              Restore Defaults
            </button>
          </div>

          <button
            className="node-config-toggle"
            onClick={() => setShowPromptPreview(!showPromptPreview)}
          >
            {showPromptPreview ? '\u25BE Hide' : '\u25B8 Show'} Prompt Preview
          </button>

          {showPromptPreview && (
            <div className="node-config-preview">
              <p className="node-config-preview-hint">
                The raw prompt text that would be sent to Gemini for this stage.
                Custom instructions are appended at the end.
              </p>
              <pre className="node-config-preview-text">
                {meta.tooltip}
                {customInstructions ? `\n\n[CUSTOM INSTRUCTIONS]\n${customInstructions}` : ''}
              </pre>
            </div>
          )}
        </div>

        {/* Existing stage output */}
        {!output && (
          <div className="details-empty-state">
            <p>{meta.tooltip}</p>
            <button
              className="details-run-btn"
              onClick={handleRun}
              disabled={isRunning}
              style={{ borderColor: meta.color, color: meta.color }}
            >
              {isRunning ? 'Running...' : meta.runLabel}
            </button>
          </div>
        )}

        {output != null && stageId === 'seed' ? <SeedDetails output={output as { seedText: string }} /> : null}
        {output != null && stageId === 'normalize' ? <NormalizeDetails output={output as NormalizeOutput} /> : null}
        {output != null && stageId === 'diverge' ? <DivergeDetails output={output as DivergeOutput} /> : null}
        {output != null && stageId === 'critique-salvage' ? <CritiqueDetails output={output as CritiqueSalvageOutput} /> : null}
        {output != null && stageId === 'expand' ? <ExpandDetails output={output as ExpandOutput} /> : null}
        {output != null && stageId === 'converge' ? <ConvergeDetails output={output as ConvergeOutput} /> : null}
        {output != null && stageId === 'commit' ? <CommitDetails output={output as CommitOutput} /> : null}
        {output != null && stageId === 'iterate' ? <IterateDetails output={output as IterateOutput} /> : null}

        {output != null && (
          <button
            className="details-run-btn rerun"
            onClick={handleRun}
            disabled={isRunning}
            style={{ borderColor: meta.color, color: meta.color }}
          >
            {isRunning ? 'Running...' : `Re-run ${meta.label}`}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────── Stage detail components ─────────── */

function SeedDetails({ output }: { output: { seedText: string } }) {
  return (
    <div className="inspector-section">
      <h4>Your Idea</h4>
      <p className="inspector-text">{output.seedText}</p>
    </div>
  );
}

function NormalizeDetails({ output }: { output: NormalizeOutput }) {
  return (
    <div className="inspector-section">
      <h4>Summary</h4>
      <p className="inspector-text">{output.seedSummary}</p>
      <h4>Assumptions ({output.assumptions.length})</h4>
      {output.assumptions.map((a, i) => (
        <div key={i} className="inspector-kv">
          <span className="inspector-key">{a.key}</span>
          <span className="inspector-value">{a.value}</span>
        </div>
      ))}
      <h4>Clarifying Questions ({output.clarifyingQuestions.length})</h4>
      <ul className="inspector-list">
        {output.clarifyingQuestions.map((q, i) => <li key={i}>{q}</li>)}
      </ul>
    </div>
  );
}

function DivergeDetails({ output }: { output: DivergeOutput }) {
  return (
    <div className="inspector-section">
      <h4>Candidates ({output.candidates.length})</h4>
      {output.candidates.map((c) => (
        <div key={c.id} className="inspector-card">
          <div className="inspector-card-header">
            <span className="inspector-card-lens">{c.lens}</span>
            <span className="inspector-card-id">{c.id}</span>
          </div>
          <p className="inspector-text">{c.hook}</p>
          <div className="inspector-kv">
            <span className="inspector-key">Anti-generic</span>
            <span className="inspector-value">{c.antiGenericClaim}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CritiqueDetails({ output }: { output: CritiqueSalvageOutput }) {
  return (
    <div className="inspector-section">
      <h4>Critiques ({output.critiques.length})</h4>
      {output.critiques.map((c, i) => (
        <div key={i} className="inspector-card">
          <div className="inspector-card-header">
            <span className="inspector-card-id">{c.candidateId}</span>
            <span className={`inspector-score ${c.genericness >= 7 ? 'high' : ''}`}>
              Genericness: {c.genericness}/10
            </span>
          </div>
          <p className="inspector-text">{c.explanation}</p>
        </div>
      ))}
      <h4>Mutations ({output.mutations.length})</h4>
      {output.mutations.map((m, i) => (
        <div key={i} className="inspector-card">
          <div className="inspector-card-header">
            <span className="inspector-card-lens">{m.operator}</span>
            <span className="inspector-card-id">{m.candidateId} &rarr; {m.mutatedCandidate.id}</span>
          </div>
          <p className="inspector-text">{m.description}</p>
        </div>
      ))}
    </div>
  );
}

function ExpandDetails({ output }: { output: ExpandOutput }) {
  return (
    <div className="inspector-section">
      <h4>Expansions ({output.expansions.length})</h4>
      {output.expansions.map((e) => (
        <div key={e.candidateId} className="inspector-card">
          <div className="inspector-card-header">
            <span className="inspector-card-id">{e.candidateId}</span>
          </div>
          <div className="inspector-kv">
            <span className="inspector-key">Concept</span>
            <span className="inspector-value">{e.concept}</span>
          </div>
          <div className="inspector-kv">
            <span className="inspector-key">Differentiator</span>
            <span className="inspector-value">{e.differentiator}</span>
          </div>
          <div className="inspector-kv">
            <span className="inspector-key">Day 1 Plan</span>
            <span className="inspector-value">{e.planDay1}</span>
          </div>
          <h5>Risks</h5>
          {e.risks.map((r, i) => (
            <div key={i} className="inspector-kv">
              <span className="inspector-key">{r.risk}</span>
              <span className="inspector-value">{r.mitigation}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ConvergeDetails({ output }: { output: ConvergeOutput }) {
  return (
    <div className="inspector-section">
      <h4>Scorecard</h4>
      {output.scorecard.map((s) => (
        <div key={s.candidateId} className="inspector-card">
          <div className="inspector-card-header">
            <span className="inspector-card-id">{s.candidateId}</span>
            <span className="inspector-score">
              {s.novelty + s.usefulness + s.feasibility + s.differentiation + s.energyGuess}pts
            </span>
          </div>
          <div className="inspector-scores-grid">
            <span>Novelty: {s.novelty}</span>
            <span>Useful: {s.usefulness}</span>
            <span>Feasible: {s.feasibility}</span>
            <span>Diff: {s.differentiation}</span>
            <span>Energy: {s.energyGuess}</span>
          </div>
          <p className="inspector-text">{s.rationale}</p>
        </div>
      ))}
      {output.winnerId && (
        <div className="inspector-highlight">Winner: {output.winnerId}</div>
      )}
    </div>
  );
}

function CommitDetails({ output }: { output: CommitOutput }) {
  return (
    <div className="inspector-section">
      <h4>{output.title}</h4>
      <div className="inspector-kv">
        <span className="inspector-key">Type</span>
        <span className="inspector-value">{output.artifactType}</span>
      </div>
      <div className="inspector-kv">
        <span className="inspector-key">Differentiator</span>
        <span className="inspector-value">{output.differentiator}</span>
      </div>
      <div className="inspector-kv">
        <span className="inspector-key">Constraints</span>
        <span className="inspector-value">{output.constraints}</span>
      </div>
      <div className="inspector-kv">
        <span className="inspector-key">First 60 min</span>
        <span className="inspector-value">{output.first60Minutes}</span>
      </div>
      <div className="inspector-kv">
        <span className="inspector-key">Next 3 actions</span>
        <span className="inspector-value">{output.next3Actions}</span>
      </div>
      <div className="inspector-kv">
        <span className="inspector-key">Risks</span>
        <span className="inspector-value">{output.riskNotes}</span>
      </div>
    </div>
  );
}

function IterateDetails({ output }: { output: IterateOutput }) {
  const suggestions = output.nextPromptSuggestions.split('\n').filter(Boolean);
  return (
    <div className="inspector-section">
      <h4>Next Steps ({suggestions.length})</h4>
      <ul className="inspector-list">
        {suggestions.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  );
}
