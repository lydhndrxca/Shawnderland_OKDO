"use client";

import { memo } from 'react';
import type { TextModelId } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { TEXT_MODELS } from '@/lib/ideation/engine/conceptlab/imageGenApi';

interface Props {
  value: TextModelId;
  onChange: (model: TextModelId) => void;
  disabled?: boolean;
}

const MODELS: TextModelId[] = ['fast', 'thinking'];

function TextModelSelectorInner({ value, onChange, disabled }: Props) {
  return (
    <div className="text-model-selector nodrag" style={{ display: 'inline-flex', gap: 0, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.4)', height: 18, background: '#1a1a2e' }}>
      {MODELS.map((m) => {
        const active = value === m;
        const def = TEXT_MODELS[m];
        return (
          <button
            key={m}
            type="button"
            disabled={disabled}
            title={def.description}
            onClick={() => onChange(m)}
            style={{
              padding: '0 7px',
              fontSize: 8,
              fontWeight: active ? 700 : 500,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
              background: active
                ? (m === 'fast' ? '#0d3d4a' : '#3d2800')
                : '#1a1a2e',
              color: active
                ? (m === 'fast' ? '#4dd0e1' : '#ffb74d')
                : '#666',
              border: 'none',
              borderRight: m === 'fast' ? '1px solid rgba(0,0,0,0.3)' : 'none',
              cursor: disabled ? 'default' : 'pointer',
              transition: 'all 0.15s',
              lineHeight: '18px',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {m === 'fast' ? '⚡ Fast' : '🧠 Think'}
          </button>
        );
      })}
    </div>
  );
}

export default memo(TextModelSelectorInner);
