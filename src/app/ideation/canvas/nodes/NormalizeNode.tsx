"use client";

import { useCallback, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import type { NodeStatus } from './BaseNode';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { getStageOutput, isStageStale } from '@/lib/ideation/state/sessionSelectors';
import { deriveEffectiveNormalize } from '@/lib/ideation/engine/normalize';
import type { NormalizeOutput } from '@/lib/ideation/engine/schemas';

export default function NormalizeNode({ data, selected, id: nodeId }: NodeProps) {
  const nodeSubName = ((data as Record<string, unknown>).subName as string) ?? '';
  const nodeData = data as Record<string, unknown>;
  const questionCount = typeof nodeData.questionCount === 'number' ? nodeData.questionCount : 4;
  const { setNodes } = useReactFlow();
  const { session, runStage, runningStageId, answerNormalizeQuestion } = useSession();

  const updateCount = useCallback((field: string, value: number) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n));
  }, [nodeId, setNodes]);
  const output = getStageOutput(session, 'normalize') as NormalizeOutput | null;
  const stale = isStageStale(session, 'normalize');
  const effective = deriveEffectiveNormalize(session);

  const status: NodeStatus = runningStageId === 'normalize' ? 'running' : output ? (stale ? 'stale' : 'complete') : 'empty';

  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [draftAnswer, setDraftAnswer] = useState('');

  const handleRun = useCallback(async () => {
    try { await runStage('normalize'); } catch (e) { console.error('[NormalizeNode] runStage error:', e); }
  }, [runStage]);

  const handleClickQuestion = useCallback((idx: number) => {
    if (expandedQ === idx) {
      setExpandedQ(null);
      setDraftAnswer('');
      return;
    }
    setExpandedQ(idx);
    const existing = effective?.questionAnswers?.[idx]?.answer ?? '';
    setDraftAnswer(existing);
  }, [expandedQ, effective]);

  const handleSubmitAnswer = useCallback((idx: number) => {
    answerNormalizeQuestion(idx, draftAnswer);
    setExpandedQ(null);
    setDraftAnswer('');
  }, [answerNormalizeQuestion, draftAnswer]);

  const handleClearAnswer = useCallback((idx: number) => {
    answerNormalizeQuestion(idx, '');
  }, [answerNormalizeQuestion]);

  return (
    <BaseNode stageId="normalize" status={status} selected={selected} onRun={handleRun} subName={nodeSubName}>
      {output ? (
        <>
          <div className="base-node-summary" title={output.seedSummary}>
            {output.seedSummary.slice(0, 80)}{output.seedSummary.length > 80 ? '...' : ''}
          </div>
          <div className="base-node-stat">
            <span className="base-node-stat-label">Assumptions</span>
            <span className="base-node-stat-value">{output.assumptions.length}</span>
          </div>
          <div className="base-node-stat">
            <span className="base-node-stat-label">Questions</span>
            <span className="base-node-stat-value">
              {output.clarifyingQuestions.length}
              {effective && effective.questionAnswers.some((qa) => qa.answer?.trim()) && (
                <span style={{ color: '#69f0ae', marginLeft: 4, fontSize: 10 }}>
                  ({effective.questionAnswers.filter((qa) => qa.answer?.trim()).length} answered)
                </span>
              )}
            </span>
          </div>

          {output.clarifyingQuestions.length > 0 && (
            <div className="normalize-questions-list nodrag nowheel">
              {output.clarifyingQuestions.map((q, i) => {
                const answered = effective?.questionAnswers?.[i]?.answer?.trim();
                const isExpanded = expandedQ === i;
                return (
                  <div key={i} className={`normalize-question ${answered ? 'answered' : ''} ${isExpanded ? 'expanded' : ''}`}>
                    <button
                      className="normalize-question-btn"
                      onClick={() => handleClickQuestion(i)}
                      title={answered ? `Answered: ${answered}` : 'Click to answer'}
                    >
                      <span className="normalize-q-icon">{answered ? '✓' : '?'}</span>
                      <span className="normalize-q-text">{q}</span>
                    </button>
                    {answered && !isExpanded && (
                      <div className="normalize-q-answer-preview">
                        {answered.slice(0, 60)}{answered.length > 60 ? '...' : ''}
                        <button className="normalize-q-clear" onClick={() => handleClearAnswer(i)} title="Clear answer">&times;</button>
                      </div>
                    )}
                    {isExpanded && (
                      <div className="normalize-q-input-wrap">
                        <textarea
                          className="normalize-q-input"
                          value={draftAnswer}
                          onChange={(e) => setDraftAnswer(e.target.value)}
                          placeholder="Type your answer..."
                          rows={2}
                          autoFocus
                        />
                        <div className="normalize-q-actions">
                          <button
                            className="normalize-q-save"
                            onClick={() => handleSubmitAnswer(i)}
                            disabled={!draftAnswer.trim()}
                          >
                            Save
                          </button>
                          <button
                            className="normalize-q-cancel"
                            onClick={() => { setExpandedQ(null); setDraftAnswer(''); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="base-node-summary">Awaiting seed input...</div>
      )}

      <div className="inline-count-controls nodrag">
        <div className="inline-count-row">
          <span className="inline-count-label">Questions</span>
          <button className="inline-count-btn" onClick={() => updateCount('questionCount', Math.max(1, questionCount - 1))} disabled={questionCount <= 1}>-</button>
          <span className="inline-count-value">{questionCount}</span>
          <button className="inline-count-btn" onClick={() => updateCount('questionCount', Math.min(10, questionCount + 1))} disabled={questionCount >= 10}>+</button>
        </div>
      </div>

    </BaseNode>
  );
}
