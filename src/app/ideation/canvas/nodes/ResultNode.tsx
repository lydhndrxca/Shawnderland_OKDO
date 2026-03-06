"use client";

import { memo, useState, useCallback, useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Play, Sprout, Copy } from 'lucide-react';
import { NODE_META } from './nodeRegistry';
import type { StageId } from '@/lib/ideation/engine/stages';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { deriveEffectiveNormalize } from '@/lib/ideation/engine/normalize';
import { TOOLTIP_MAP } from '../GlossaryOverlay';
import './ResultNode.css';

interface ResultEntry {
  tldr: string;
  fullText: string;
  detail: Record<string, unknown> | string;
  isQuestion?: boolean;
  questionIndex?: number;
  category?: string;
  isMutation?: boolean;
  parentCandidateId?: string;
  scoreDisplay?: string;
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

function findTooltip(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [term, def] of Object.entries(TOOLTIP_MAP)) {
    if (lower.includes(term)) return `${term}: ${def}`;
  }
  return undefined;
}

function lensLabel(lens: string): string {
  if (lens === 'constraint_art') return 'Constraint';
  return lens.charAt(0).toUpperCase() + lens.slice(1);
}

function parseResultEntries(outputData: unknown, sourceStage?: StageId): ResultEntry[] {
  if (!outputData || typeof outputData !== 'object') return [];
  const data = outputData as Record<string, unknown>;

  if (sourceStage === 'normalize') {
    const summary = data.seedSummary as string || '';
    const assumptions = (data.assumptions as Array<{ key: string; value: string }>) || [];
    const questions = (data.clarifyingQuestions as string[]) || [];
    const entries: ResultEntry[] = [{
      tldr: truncateWords(summary, 6),
      fullText: summary,
      detail: data,
    }];
    for (const a of assumptions) {
      entries.push({
        tldr: truncateWords(`${a.key}: ${a.value}`, 6),
        fullText: `${a.key}: ${a.value}`,
        detail: a,
      });
    }
    for (let qi = 0; qi < questions.length; qi++) {
      entries.push({
        tldr: truncateWords(questions[qi], 6),
        fullText: questions[qi],
        detail: { question: questions[qi] },
        isQuestion: true,
        questionIndex: qi,
      });
    }
    return entries;
  }

  if (sourceStage === 'diverge') {
    const candidates = (data.candidates as Array<Record<string, unknown>>) || [];
    return candidates.map((c) => ({
      tldr: truncateWords((c.hook as string) || 'Candidate', 6),
      fullText: (c.hook as string) || '',
      detail: c,
      category: lensLabel((c.lens as string) || 'practical'),
    }));
  }

  if (sourceStage === 'critique-salvage') {
    const critiques = (data.critiques as Array<Record<string, unknown>>) || [];
    const mutations = (data.mutations as Array<Record<string, unknown>>) || [];
    const mutationsByCandidateId = new Map<string, Array<Record<string, unknown>>>();
    for (const m of mutations) {
      const cid = (m.candidateId as string) || '';
      if (!mutationsByCandidateId.has(cid)) mutationsByCandidateId.set(cid, []);
      mutationsByCandidateId.get(cid)!.push(m);
    }
    const entries: ResultEntry[] = [];
    for (const c of critiques) {
      const cid = (c.candidateId as string) || '';
      entries.push({
        tldr: truncateWords(`${cid} — ${c.genericness}/10 generic`, 6),
        fullText: (c.explanation as string) || '',
        detail: c,
      });
      const relatedMutations = mutationsByCandidateId.get(cid) || [];
      for (const m of relatedMutations) {
        const mc = m.mutatedCandidate as Record<string, unknown> | undefined;
        entries.push({
          tldr: truncateWords(`↳ ${m.operator}: ${(mc?.hook as string) || 'mutation'}`, 6),
          fullText: (mc?.hook as string) || '',
          detail: m,
          isMutation: true,
          parentCandidateId: cid,
        });
      }
    }
    return entries;
  }

  if (sourceStage === 'expand') {
    const expansions = (data.expansions as Array<Record<string, unknown>>) || [];
    return expansions.map((exp) => ({
      tldr: truncateWords((exp.concept as string) || 'Expansion', 6),
      fullText: (exp.concept as string) || '',
      detail: exp,
    }));
  }

  if (sourceStage === 'converge') {
    const scorecard = (data.scorecard as Array<Record<string, unknown>>) || [];
    const winnerId = data.winnerId as string;
    return scorecard.map((s) => {
      const n = (s.novelty as number) || 0;
      const u = (s.usefulness as number) || 0;
      const f = (s.feasibility as number) || 0;
      const d = (s.differentiation as number) || 0;
      const e = (s.energyGuess as number) || 0;
      const total = n + u + f + d + e;
      const maxScore = 50;
      const normalized = Math.round((total / maxScore) * 100);
      const isWinner = s.candidateId === winnerId;
      return {
        tldr: truncateWords(`${s.candidateId}${isWinner ? ' ★' : ''}`, 6),
        fullText: (s.rationale as string) || `${s.candidateId}: ${normalized}/100`,
        detail: s,
        scoreDisplay: `${normalized}/100`,
      };
    });
  }

  if (sourceStage === 'commit') {
    return [{
      tldr: truncateWords((data.title as string) || 'Artifact', 6),
      fullText: `${data.title || ''}\n${data.differentiator || ''}\n${data.next3Actions || ''}`,
      detail: data,
    }];
  }

  if (sourceStage === 'iterate') {
    const suggestions = ((data.nextPromptSuggestions as string) || '').split('\n').filter(Boolean);
    return suggestions.map((s) => ({
      tldr: truncateWords(s, 6),
      fullText: s,
      detail: { suggestion: s },
    }));
  }

  return [{ tldr: 'Result', fullText: JSON.stringify(data), detail: data }];
}

function groupByCategory(entries: Array<ResultEntry & { originalIdx: number }>): Map<string, Array<ResultEntry & { originalIdx: number }>> {
  const groups = new Map<string, Array<ResultEntry & { originalIdx: number }>>();
  for (const entry of entries) {
    const cat = entry.category || '__ungrouped__';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(entry);
  }
  return groups;
}

function renderValue(val: unknown, depth = 0): React.ReactNode {
  if (val === null || val === undefined) return null;

  if (typeof val === 'string') {
    return <p className="result-val-text">{val}</p>;
  }

  if (typeof val === 'number' || typeof val === 'boolean') {
    return <span className="result-val-primitive">{String(val)}</span>;
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return null;
    if (val.every((v) => typeof v === 'string' || typeof v === 'number')) {
      return (
        <ul className="result-val-list">
          {val.map((item, i) => <li key={i}>{String(item)}</li>)}
        </ul>
      );
    }
    return (
      <div className="result-val-array">
        {val.map((item, i) => (
          <div key={i} className="result-val-array-item">
            {renderValue(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof val === 'object') {
    const entries = Object.entries(val as Record<string, unknown>);
    if (depth > 2) {
      return <span className="result-val-text">{entries.map(([k, v]) => `${k}: ${String(v)}`).join(', ')}</span>;
    }
    return (
      <div className="result-val-obj">
        {entries.map(([key, v]) => {
          if (v === null || v === undefined || v === '') return null;
          return (
            <div key={key} className="result-val-field">
              <span className="result-field-label">{formatLabel(key)}</span>
              <div className="result-field-value">{renderValue(v, depth + 1)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  return <span>{String(val)}</span>;
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function renderConvergeDetail(detail: Record<string, unknown>): React.ReactNode {
  const rationale = detail.rationale as string | undefined;
  const scores = ['novelty', 'usefulness', 'feasibility', 'differentiation', 'energyGuess'] as const;
  const scoreLabels: Record<string, string> = { novelty: 'N', usefulness: 'U', feasibility: 'F', differentiation: 'D', energyGuess: 'E' };
  return (
    <div className="result-val-obj">
      {rationale && <p className="result-val-text" style={{ marginBottom: 6 }}>{rationale}</p>}
      <div className="result-scores-compact">
        {scores.map((s) => {
          const v = (detail[s] as number) ?? 0;
          return <span key={s} className="result-score-chip">{scoreLabels[s]}:{v}</span>;
        })}
      </div>
      {Object.entries(detail).filter(([k]) => k !== 'rationale' && !scores.includes(k as typeof scores[number]) && detail[k] != null && detail[k] !== '').map(([k, v]) => (
        <div key={k} className="result-val-field">
          <span className="result-field-label">{formatLabel(k)}</span>
          <div className="result-field-value">{renderValue(v)}</div>
        </div>
      ))}
    </div>
  );
}

function renderCritiqueDetail(detail: Record<string, unknown>): React.ReactNode {
  const explanation = detail.explanation as string | undefined;
  const scores = ['genericness'] as const;
  return (
    <div className="result-val-obj">
      {explanation && <p className="result-val-text" style={{ marginBottom: 6 }}>{explanation}</p>}
      {Object.entries(detail).filter(([k]) => k !== 'explanation' && detail[k] != null && detail[k] !== '').map(([k, v]) => (
        <div key={k} className="result-val-field">
          <span className="result-field-label">{formatLabel(k)}</span>
          <div className="result-field-value">{renderValue(v)}</div>
        </div>
      ))}
    </div>
  );
}

function renderDetail(detail: string | Record<string, unknown>, sourceStage?: StageId): React.ReactNode {
  if (typeof detail === 'string') return <p className="result-val-text">{detail}</p>;
  if (sourceStage === 'converge') return renderConvergeDetail(detail);
  if (sourceStage === 'critique-salvage') return renderCritiqueDetail(detail);
  return renderValue(detail);
}

function QuestionAnswerInput({ questionIndex, questionText }: { questionIndex: number; questionText: string }) {
  const { session, answerNormalizeQuestion } = useSession();
  const effective = deriveEffectiveNormalize(session);
  const existing = effective?.questionAnswers?.[questionIndex]?.answer ?? '';

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(existing);

  const handleOpen = useCallback(() => {
    setDraft(existing);
    setIsEditing(true);
  }, [existing]);

  const handleSave = useCallback(() => {
    answerNormalizeQuestion(questionIndex, draft);
    setIsEditing(false);
  }, [answerNormalizeQuestion, questionIndex, draft]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDraft(existing);
  }, [existing]);

  const handleClear = useCallback(() => {
    answerNormalizeQuestion(questionIndex, '');
    setDraft('');
    setIsEditing(false);
  }, [answerNormalizeQuestion, questionIndex]);

  if (isEditing) {
    return (
      <div className="result-q-input-wrap nodrag nowheel">
        <div className="result-q-full-question">{questionText}</div>
        <textarea
          className="result-q-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type your answer..."
          rows={3}
          autoFocus
        />
        <div className="result-q-actions">
          <button className="result-q-save" onClick={handleSave} disabled={!draft.trim()}>Save</button>
          <button className="result-q-cancel" onClick={handleCancel}>Cancel</button>
          {existing && <button className="result-q-clear" onClick={handleClear}>Clear</button>}
        </div>
      </div>
    );
  }

  if (existing) {
    return (
      <div className="result-q-answered nodrag nowheel">
        <div className="result-q-full-question">{questionText}</div>
        <div className="result-q-answer-display">
          <span className="result-q-answer-badge">Your answer:</span>
          <span className="result-q-answer-text">{existing}</span>
        </div>
        <div className="result-q-actions">
          <button className="result-q-edit" onClick={handleOpen}>Edit</button>
          <button className="result-q-clear" onClick={handleClear}>Clear</button>
        </div>
      </div>
    );
  }

  return (
    <div className="result-q-unanswered nodrag nowheel">
      <div className="result-q-full-question">{questionText}</div>
      <button className="result-q-answer-btn" onClick={handleOpen}>Answer this question</button>
    </div>
  );
}

export default memo(function ResultNode({ data, id: nodeId }: NodeProps) {
  const d = data as Record<string, unknown>;
  const sourceStage = d.sourceStage as StageId | undefined;
  const outputData = d.outputData as unknown;
  const meta = sourceStage ? NODE_META[sourceStage] : undefined;
  const { pipelineMode, awaitingInputNodeId, continueAutomatedRun } = useSession();
  const isAwaitingInput = pipelineMode === 'automated' && sourceStage === awaitingInputNodeId;
  const { setNodes, getNode } = useReactFlow();
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const label = meta ? `${meta.label} Results` : 'Results';
  const color = meta?.color ?? '#80cbc4';

  const entries = parseResultEntries(outputData, sourceStage);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());

  const visibleEntries = entries.map((e, i) => ({ ...e, originalIdx: i })).filter((_, i) => !hidden.has(i));
  const hasCategories = visibleEntries.some((e) => e.category && e.category !== '__ungrouped__');
  const groups = hasCategories ? groupByCategory(visibleEntries) : null;

  const handleDelete = useCallback((idx: number) => {
    setHidden((prev) => new Set(prev).add(idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  }, [expandedIdx]);

  const handleHighlight = useCallback((idx: number) => {
    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, entry: { fullText: string; tldr: string }) => {
    e.dataTransfer.setData('application/reactflow-result', entry.fullText || entry.tldr);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleScrollWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    e.stopPropagation();
    el.scrollTop += e.deltaY * 0.4;
  }, []);

  const handleCreateSeed = useCallback((entry: ResultEntry) => {
    const thisNode = getNode(nodeId);
    const basePos = thisNode?.position ?? { x: 0, y: 0 };
    const seedId = `seed-from-result-${Date.now()}`;
    setNodes((prev) => [
      ...prev,
      {
        id: seedId,
        type: 'seed',
        position: { x: basePos.x + 300, y: basePos.y },
        data: { prefillSeed: entry.fullText || entry.tldr },
      },
    ]);
  }, [nodeId, getNode, setNodes]);

  const handleCopy = useCallback((entry: ResultEntry, idx: number) => {
    const text = typeof entry.detail === 'string'
      ? entry.detail
      : entry.fullText || JSON.stringify(entry.detail, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedIdx(null), 1500);
    });
  }, []);

  const renderEntry = (entry: ResultEntry & { originalIdx: number }) => {
    const idx = entry.originalIdx;
    const isExpanded = expandedIdx === idx;
    const isHighlighted = highlighted.has(idx);
    return (
      <div
        key={idx}
        className={`result-entry ${isExpanded ? 'result-entry-open' : ''} ${isHighlighted ? 'result-entry-highlighted' : ''} ${entry.isQuestion ? 'result-entry-question' : ''} ${entry.isMutation ? 'result-entry-mutation' : ''}`}
      >
        <div
          className="result-entry-row"
          draggable
          onDragStart={(e) => handleDragStart(e, entry)}
          onClick={() => {
            setExpandedIdx(isExpanded ? null : idx);
            const w = window as unknown as Record<string, unknown>;
            const trace = w.__lineageTrace as ((id: string | null) => void) | undefined;
            if (trace) {
              if (isExpanded) {
                trace(null);
              } else {
                const detail = entry.detail as Record<string, unknown>;
                const candId = (detail?.candidateId as string) || (detail?.id as string) || null;
                trace(candId);
              }
            }
          }}
        >
          <span className="result-entry-chevron">{isExpanded ? '\u25BE' : '\u25B8'}</span>
          {entry.isQuestion && (
            <span className="result-entry-q-badge">Q</span>
          )}
          <span className="result-entry-tldr" title={findTooltip(entry.tldr) || entry.fullText}>{entry.tldr}</span>
          {entry.scoreDisplay && (
            <span className="result-entry-score">{entry.scoreDisplay}</span>
          )}
          <div className="result-entry-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="result-seed-btn"
              onClick={() => handleCreateSeed(entry)}
              title="Create new Idea Seed from this result"
            >
              <Sprout size={11} />
            </button>
            <button
              className={`result-copy-btn ${copiedIdx === idx ? 'copied' : ''}`}
              onClick={() => handleCopy(entry, idx)}
              title={copiedIdx === idx ? 'Copied!' : 'Copy result text'}
            >
              <Copy size={11} />
            </button>
            <button
              className={`result-highlight-btn ${isHighlighted ? 'active' : ''}`}
              onClick={() => handleHighlight(idx)}
              title={isHighlighted ? 'Remove highlight' : 'Highlight for next step'}
            >
              ★
            </button>
            <button
              className="result-delete-btn"
              onClick={() => handleDelete(idx)}
              title="Remove this result"
            >
              ×
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="result-entry-detail">
            {entry.isQuestion && entry.questionIndex !== undefined ? (
              <QuestionAnswerInput
                questionIndex={entry.questionIndex}
                questionText={entry.fullText}
              />
            ) : (
              renderDetail(entry.detail, sourceStage)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="result-node">
      <Handle
        type="target"
        position={Position.Top}
        className="base-handle target-handle"
        style={{ background: color }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="base-handle source-handle"
        style={{ background: color }}
      />

      <div className="result-node-header" style={{ background: color }}>
        <span className="result-node-label">{label}</span>
        <span className="result-node-count">{visibleEntries.length}</span>
      </div>

      {visibleEntries.length === 0 ? (
        <div className="result-node-empty">No results yet</div>
      ) : (
        <div className="result-node-list" onWheel={handleScrollWheel}>
          {groups ? (
            Array.from(groups.entries()).map(([cat, catEntries]) => (
              <div key={cat} className="result-category-group">
                {cat !== '__ungrouped__' && (
                  <div className="result-category-header">{cat}</div>
                )}
                {catEntries.map(renderEntry)}
              </div>
            ))
          ) : (
            visibleEntries.map(renderEntry)
          )}
        </div>
      )}

      {isAwaitingInput && (
        <button
          className="result-node-continue nodrag"
          onClick={(e) => { e.stopPropagation(); continueAutomatedRun(); }}
          title="Continue automated pipeline"
        >
          <Play size={12} fill="currentColor" />
          <span>Continue</span>
        </button>
      )}
    </div>
  );
});
