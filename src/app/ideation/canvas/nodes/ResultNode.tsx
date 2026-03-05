"use client";

import { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';
import { NODE_META } from './nodeRegistry';
import type { StageId } from '@/lib/ideation/engine/stages';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { deriveEffectiveNormalize } from '@/lib/ideation/engine/normalize';
import './ResultNode.css';

interface ResultEntry {
  tldr: string;
  fullText: string;
  detail: Record<string, unknown> | string;
  isQuestion?: boolean;
  questionIndex?: number;
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

function parseResultEntries(outputData: unknown, sourceStage?: StageId): ResultEntry[] {
  if (!outputData || typeof outputData !== 'object') return [];
  const data = outputData as Record<string, unknown>;

  if (sourceStage === 'normalize') {
    const summary = data.seedSummary as string || '';
    const assumptions = (data.assumptions as Array<{ key: string; value: string }>) || [];
    const questions = (data.clarifyingQuestions as string[]) || [];
    const entries: ResultEntry[] = [{
      tldr: truncateWords(summary, 10),
      fullText: summary,
      detail: data,
    }];
    for (const a of assumptions) {
      entries.push({
        tldr: truncateWords(`${a.key}: ${a.value}`, 10),
        fullText: `${a.key}: ${a.value}`,
        detail: a,
      });
    }
    for (let qi = 0; qi < questions.length; qi++) {
      entries.push({
        tldr: truncateWords(questions[qi], 10),
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
      tldr: truncateWords((c.hook as string) || 'Candidate', 10),
      fullText: (c.hook as string) || '',
      detail: c,
    }));
  }

  if (sourceStage === 'critique-salvage') {
    const critiques = (data.critiques as Array<Record<string, unknown>>) || [];
    const mutations = (data.mutations as Array<Record<string, unknown>>) || [];
    const entries: ResultEntry[] = [];
    for (const c of critiques) {
      entries.push({
        tldr: truncateWords(`${c.candidateId} \u2014 ${c.genericness}/10 generic`, 10),
        fullText: (c.explanation as string) || '',
        detail: c,
      });
    }
    for (const m of mutations) {
      const mc = m.mutatedCandidate as Record<string, unknown> | undefined;
      entries.push({
        tldr: truncateWords(`Mutation: ${m.operator} on ${m.candidateId}`, 10),
        fullText: (mc?.hook as string) || '',
        detail: m,
      });
    }
    return entries;
  }

  if (sourceStage === 'expand') {
    const expansions = (data.expansions as Array<Record<string, unknown>>) || [];
    return expansions.map((exp) => ({
      tldr: truncateWords((exp.concept as string) || 'Expansion', 10),
      fullText: (exp.concept as string) || '',
      detail: exp,
    }));
  }

  if (sourceStage === 'converge') {
    const scorecard = (data.scorecard as Array<Record<string, unknown>>) || [];
    const winnerId = data.winnerId as string;
    return scorecard.map((s) => {
      const total = (s.novelty as number || 0) + (s.usefulness as number || 0) +
        (s.feasibility as number || 0) + (s.differentiation as number || 0) + (s.energyGuess as number || 0);
      const isWinner = s.candidateId === winnerId;
      return {
        tldr: truncateWords(`${s.candidateId} \u2014 ${total}pts${isWinner ? ' \u2605' : ''}`, 10),
        fullText: (s.rationale as string) || `${s.candidateId}: ${total} points`,
        detail: s,
      };
    });
  }

  if (sourceStage === 'commit') {
    return [{
      tldr: truncateWords((data.title as string) || 'Artifact', 10),
      fullText: `${data.title || ''}\n${data.differentiator || ''}\n${data.next3Actions || ''}`,
      detail: data,
    }];
  }

  if (sourceStage === 'iterate') {
    const suggestions = ((data.nextPromptSuggestions as string) || '').split('\n').filter(Boolean);
    return suggestions.map((s) => ({
      tldr: truncateWords(s, 10),
      fullText: s,
      detail: { suggestion: s },
    }));
  }

  return [{ tldr: 'Result', fullText: JSON.stringify(data), detail: data }];
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

function renderDetail(detail: string | Record<string, unknown>): React.ReactNode {
  if (typeof detail === 'string') return <p className="result-val-text">{detail}</p>;
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

export default memo(function ResultNode({ data }: NodeProps) {
  const d = data as Record<string, unknown>;
  const sourceStage = d.sourceStage as StageId | undefined;
  const outputData = d.outputData as unknown;
  const meta = sourceStage ? NODE_META[sourceStage] : undefined;
  const { pipelineMode, awaitingInputNodeId, continueAutomatedRun } = useSession();
  const isAwaitingInput = pipelineMode === 'automated' && sourceStage === awaitingInputNodeId;

  const label = meta ? `${meta.label} Results` : 'Results';
  const color = meta?.color ?? '#80cbc4';

  const entries = parseResultEntries(outputData, sourceStage);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [highlighted, setHighlighted] = useState<Set<number>>(new Set());

  const visibleEntries = entries.map((e, i) => ({ ...e, originalIdx: i })).filter((_, i) => !hidden.has(i));

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

  return (
    <div className="result-node">
      <Handle
        type="target"
        position={Position.Top}
        className="base-handle target-handle"
        style={{ background: color }}
      />

      <div className="result-node-header" style={{ background: color }}>
        <span className="result-node-label">{label}</span>
        <span className="result-node-count">{visibleEntries.length}</span>
      </div>

      {visibleEntries.length === 0 ? (
        <div className="result-node-empty">No results yet</div>
      ) : (
        <div className="result-node-list nowheel">
          {visibleEntries.map((entry) => {
            const idx = entry.originalIdx;
            const isExpanded = expandedIdx === idx;
            const isHighlighted = highlighted.has(idx);
            return (
              <div
                key={idx}
                className={`result-entry ${isExpanded ? 'result-entry-open' : ''} ${isHighlighted ? 'result-entry-highlighted' : ''} ${entry.isQuestion ? 'result-entry-question' : ''}`}
              >
                <div
                  className="result-entry-row"
                  draggable
                  onDragStart={(e) => handleDragStart(e, entry)}
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                >
                  <span className="result-entry-chevron">{isExpanded ? '\u25BE' : '\u25B8'}</span>
                  {entry.isQuestion && (
                    <span className="result-entry-q-badge">Q</span>
                  )}
                  <span className="result-entry-tldr">{entry.tldr}</span>
                  <div className="result-entry-actions" onClick={(e) => e.stopPropagation()}>
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
                      renderDetail(entry.detail)
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="base-handle source-handle"
        style={{ background: color }}
      />

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
