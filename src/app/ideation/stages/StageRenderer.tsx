"use client";

import type { StageId } from '@/lib/ideation/engine/stages';
import SeedStage from './SeedStage';
import NormalizeStage from './NormalizeStage';
import DivergeStage from './DivergeStage';
import CritiqueSalvageStage from './CritiqueSalvageStage';
import ExpandStage from './ExpandStage';
import ConvergeStage from './ConvergeStage';
import CommitStage from './CommitStage';
import IterateStage from './IterateStage';
import './stages.css';

interface Props {
  stageId: StageId;
  output: unknown;
  stale: boolean;
}

const STAGE_COMPONENTS: Record<StageId, React.ComponentType<{ output: unknown }>> = {
  seed: SeedStage,
  normalize: NormalizeStage,
  diverge: DivergeStage,
  'critique-salvage': CritiqueSalvageStage,
  expand: ExpandStage,
  converge: ConvergeStage,
  commit: CommitStage,
  iterate: IterateStage,
};

const ALWAYS_RENDER: Set<StageId> = new Set(['commit', 'iterate']);

export default function StageRenderer({ stageId, output, stale }: Props) {
  if (!output && !ALWAYS_RENDER.has(stageId)) {
    return (
      <div className="stage-empty">
        <p>No output yet.</p>
        <p className="stage-empty-hint">Click <strong>Run</strong> to execute this stage.</p>
      </div>
    );
  }

  const Component = STAGE_COMPONENTS[stageId];

  return (
    <div className={`stage-output ${stale ? 'stage-output-stale' : ''}`}>
      <Component output={output} />
    </div>
  );
}
