"use client";

import { useSession } from '@/lib/ideation/context/SessionContext';
import { getStageOutput, isStageStale } from '@/lib/ideation/state/sessionSelectors';
import { NODE_META } from './nodes/nodeRegistry';
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
import './NodeInspector.css';

interface NodeInspectorProps {
  nodeId: string | null;
  onClose: () => void;
}

export default function NodeInspector({ nodeId, onClose }: NodeInspectorProps) {
  const { session, runStage, isRunning } = useSession();

  if (!nodeId) return null;

  const stageId = nodeId.split('-')[0] as StageId;
  const meta = NODE_META[stageId];
  if (!meta) return null;

  const output = getStageOutput(session, stageId);
  const stale = isStageStale(session, stageId);

  const handleRun = async () => {
    try { await runStage(stageId); } catch { /* shown elsewhere */ }
  };

  return (
    <div className="node-inspector">
      <div className="node-inspector-header" style={{ borderBottomColor: meta.color }}>
        <span className="node-inspector-dot" style={{ background: meta.color }} />
        <span className="node-inspector-title">{meta.label}</span>
        {stale && <span className="node-inspector-stale">Stale</span>}
        <button className="node-inspector-close" onClick={onClose}>&times;</button>
      </div>

      <div className="node-inspector-body">
        {!output && (
          <div className="node-inspector-empty">
            <p>{meta.tooltip}</p>
            <button
              className="node-inspector-run-btn"
              onClick={handleRun}
              disabled={isRunning}
              style={{ borderColor: meta.color, color: meta.color }}
            >
              {isRunning ? 'Running...' : meta.runLabel}
            </button>
          </div>
        )}

        {output != null && stageId === 'seed' ? <SeedInspector output={output as { seedText: string }} /> : null}
        {output != null && stageId === 'normalize' ? <NormalizeInspector output={output as NormalizeOutput} /> : null}
        {output != null && stageId === 'diverge' ? <DivergeInspector output={output as DivergeOutput} /> : null}
        {output != null && stageId === 'critique-salvage' ? <CritiqueInspector output={output as CritiqueSalvageOutput} /> : null}
        {output != null && stageId === 'expand' ? <ExpandInspector output={output as ExpandOutput} /> : null}
        {output != null && stageId === 'converge' ? <ConvergeInspector output={output as ConvergeOutput} /> : null}
        {output != null && stageId === 'commit' ? <CommitInspector output={output as CommitOutput} /> : null}
        {output != null && stageId === 'iterate' ? <IterateInspector output={output as IterateOutput} /> : null}

        {output != null && (
          <button
            className="node-inspector-run-btn rerun"
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

function SeedInspector({ output }: { output: { seedText: string } }) {
  return (
    <div className="inspector-section">
      <h4>Your Idea</h4>
      <p className="inspector-text">{output.seedText}</p>
    </div>
  );
}

function NormalizeInspector({ output }: { output: NormalizeOutput }) {
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

function DivergeInspector({ output }: { output: DivergeOutput }) {
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

function CritiqueInspector({ output }: { output: CritiqueSalvageOutput }) {
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
            <span className="inspector-card-id">{m.candidateId} → {m.mutatedCandidate.id}</span>
          </div>
          <p className="inspector-text">{m.description}</p>
        </div>
      ))}
    </div>
  );
}

function ExpandInspector({ output }: { output: ExpandOutput }) {
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

function ConvergeInspector({ output }: { output: ConvergeOutput }) {
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

function CommitInspector({ output }: { output: CommitOutput }) {
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

function IterateInspector({ output }: { output: IterateOutput }) {
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
