"use client";

import type { SeedOutput } from '@/lib/ideation/engine/schemas';

export default function SeedStage({ output }: { output: unknown }) {
  const data = output as SeedOutput;
  return (
    <div className="stage-card">
      <div className="field">
        <label className="field-label">Seed Text</label>
        <p className="field-value">{data.seedText}</p>
      </div>
    </div>
  );
}
