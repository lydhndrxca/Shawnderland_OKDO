"use client";

import { useCallback, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';
import type { NodeStatus } from './BaseNode';
import { useSession } from '@/lib/ideation/context/SessionContext';

export default function SeedNode({ data, selected }: NodeProps) {
  const { session, editSeed, editSeedContext, updateSettings, runStage, runningStageId } = useSession();
  const d = data as Record<string, unknown>;
  const prefill = (d.prefillSeed as string) ?? '';
  const nodeSubName = (d.subName as string) ?? '';
  const [localSeed, setLocalSeed] = useState(prefill || session.seedText);
  const [localContext, setLocalContext] = useState(session.seedContext ?? '');
  const strict = session.settings?.strictAdherence ?? false;

  const hasOutput = !!session.stageState['seed']?.output;
  const status: NodeStatus = runningStageId === 'seed' ? 'running' : hasOutput ? 'complete' : 'empty';

  const handleRun = useCallback(async () => {
    if (localSeed !== session.seedText) editSeed(localSeed);
    if (localContext !== (session.seedContext ?? '')) editSeedContext(localContext);
    try { await runStage('seed'); } catch { /* shown in StatusBar */ }
  }, [localSeed, localContext, session.seedText, session.seedContext, editSeed, editSeedContext, runStage]);

  const toggleStrict = useCallback(() => {
    updateSettings({ strictAdherence: !strict });
  }, [strict, updateSettings]);

  return (
    <BaseNode stageId="seed" status={status} selected={selected} onRun={localSeed.trim() ? handleRun : undefined} subName={nodeSubName}>
      <textarea
        className="seed-input nodrag nowheel"
        value={localSeed}
        onChange={(e) => { setLocalSeed(e.target.value); editSeed(e.target.value); }}
        placeholder="What's your idea?"
        spellCheck={false}
        rows={3}
      />
      <input
        className="seed-input nodrag nowheel"
        value={localContext}
        onChange={(e) => { setLocalContext(e.target.value); editSeedContext(e.target.value); }}
        placeholder="Context (optional) — e.g., &quot;video game console&quot;, &quot;things to do when bored&quot;"
        spellCheck={false}
        style={{ minHeight: 'auto', padding: '6px 10px', fontSize: '12px' }}
      />
      <button
        className={`seed-strict-toggle nodrag ${strict ? 'active' : ''}`}
        onClick={toggleStrict}
        title={strict
          ? 'Strict Adherence ON — the pipeline will only interpret what you explicitly stated, no assumptions about product type or domain.'
          : 'Strict Adherence OFF — the pipeline may infer product categories, use cases, or domains from your idea.'}
      >
        <span className="seed-strict-icon">{strict ? '🔒' : '🔓'}</span>
        <span className="seed-strict-label">Strict Adherence</span>
        <span className={`seed-strict-badge ${strict ? 'on' : 'off'}`}>{strict ? 'ON' : 'OFF'}</span>
      </button>
    </BaseNode>
  );
}
