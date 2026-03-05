"use client";

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  WEAPON_COMPONENT_FIELDS,
  MATERIAL_FINISH_OPTIONS,
  CONDITION_OPTIONS,
  type WeaponComponents,
} from '@/lib/ideation/engine/conceptlab/weaponPrompts';
import './ConceptLabNodes.css';

interface WeapComponentsNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function WeapComponentsNodeInner({ id, data, selected }: WeapComponentsNodeProps) {
  const { setNodes } = useReactFlow();

  const components = (data.components as WeaponComponents) ?? {};
  const finish = String(data.materialFinish ?? data.finish ?? '');
  const finishCustom = String(data.materialFinishCustom ?? '');
  const condition = String(data.condition ?? '');
  const conditionCustom = String(data.conditionCustom ?? '');

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...updates } } : n,
        ),
      );
    },
    [id, setNodes],
  );

  const setComp = useCallback(
    (field: string, val: string) => {
      const next = { ...components, [field]: val };
      persist({ components: next });
    },
    [components, persist],
  );

  const handleFinishChange = useCallback(
    (v: string) => persist({ materialFinish: v, materialFinishCustom: '' }),
    [persist],
  );

  const handleFinishCustomChange = useCallback(
    (v: string) => persist({ materialFinishCustom: v }),
    [persist],
  );

  const handleConditionChange = useCallback(
    (v: string) => persist({ condition: v, conditionCustom: '' }),
    [persist],
  );

  const handleConditionCustomChange = useCallback(
    (v: string) => persist({ conditionCustom: v }),
    [persist],
  );

  return (
    <div className={`cl-node ${selected ? 'selected' : ''}`}>
      <div
        className="cl-node-header"
        style={{ background: '#e65100' }}
      >
        Weapon Components
      </div>
      <div className="cl-node-body cl-scroll-area">
        {WEAPON_COMPONENT_FIELDS.map((f) => (
          <div key={f} className="cl-field">
            <label className="cl-field-label">{f}</label>
            <input
              className="cl-input nodrag"
              value={components[f] ?? ''}
              onChange={(e) => setComp(f, e.target.value)}
              placeholder={`${f} description...`}
            />
          </div>
        ))}
        <div className="cl-divider" />
        <div className="cl-field">
          <label className="cl-field-label wide">Material Finish</label>
          <select
            className="cl-select nodrag"
            value={finish}
            onChange={(e) => handleFinishChange(e.target.value)}
          >
            <option value="">—</option>
            {Object.keys(MATERIAL_FINISH_OPTIONS).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <div className="cl-field">
          <label className="cl-field-label wide">Custom Finish</label>
          <input
            className="cl-input nodrag"
            value={finishCustom}
            onChange={(e) => handleFinishCustomChange(e.target.value)}
            placeholder="Or type custom finish..."
          />
        </div>
        <div className="cl-field">
          <label className="cl-field-label wide">Condition</label>
          <select
            className="cl-select nodrag"
            value={condition}
            onChange={(e) => handleConditionChange(e.target.value)}
          >
            <option value="">—</option>
            {Object.keys(CONDITION_OPTIONS).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <div className="cl-field">
          <label className="cl-field-label wide">Custom Condition</label>
          <input
            className="cl-input nodrag"
            value={conditionCustom}
            onChange={(e) => handleConditionCustomChange(e.target.value)}
            placeholder="Or type custom condition..."
          />
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="comps-out"
        className="cl-handle"
      />
    </div>
  );
}

export default memo(WeapComponentsNodeInner);
