'use client';

import { useCallback } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { Node } from '@xyflow/react';
import type { TENodeData, TEPort, TEDropdown, TEGenericData } from './types';
import './PropertyPanel.css';

let _pid = 0;
function pid(prefix: string) {
  _pid += 1;
  return `${prefix}-${Date.now()}-${_pid}`;
}

interface Props {
  node: Node<TENodeData> | null;
  onUpdate: (id: string, patch: Partial<TENodeData>) => void;
}

export default function PropertyPanel({ node, onUpdate }: Props) {
  const d = node?.data;

  const patch = useCallback(
    (p: Partial<TENodeData>) => {
      if (node) onUpdate(node.id, p);
    },
    [node, onUpdate],
  );

  if (!d) {
    return (
      <aside className="te-prop-panel te-prop-empty">
        <p>Select a node to edit its properties</p>
      </aside>
    );
  }

  const hasIO = d.kind === 'generic' || d.kind === 'window';
  const hasDropdowns = d.kind === 'generic';

  /* ── port helpers ─── */
  const addPort = (type: 'inputs' | 'outputs') => {
    if (!hasIO) return;
    const current = (d as TEGenericData)[type] ?? [];
    patch({ [type]: [...current, { id: pid(type === 'inputs' ? 'in' : 'out'), label: type === 'inputs' ? 'Input' : 'Output', side: type === 'inputs' ? 'left' : 'right' }] } as unknown as Partial<TENodeData>);
  };

  const removePort = (type: 'inputs' | 'outputs', portId: string) => {
    if (!hasIO) return;
    const current = (d as TEGenericData)[type] ?? [];
    patch({ [type]: current.filter((p: TEPort) => p.id !== portId) } as unknown as Partial<TENodeData>);
  };

  const renamePort = (type: 'inputs' | 'outputs', portId: string, label: string) => {
    if (!hasIO) return;
    const current = (d as TEGenericData)[type] ?? [];
    patch({ [type]: current.map((p: TEPort) => (p.id === portId ? { ...p, label } : p)) } as unknown as Partial<TENodeData>);
  };

  const changePortSide = (type: 'inputs' | 'outputs', portId: string, side: TEPort['side']) => {
    if (!hasIO) return;
    const current = (d as TEGenericData)[type] ?? [];
    patch({ [type]: current.map((p: TEPort) => (p.id === portId ? { ...p, side } : p)) } as unknown as Partial<TENodeData>);
  };

  /* ── dropdown helpers ─── */
  const addDropdown = () => {
    if (!hasDropdowns) return;
    const dd = (d as TEGenericData).dropdowns ?? [];
    patch({ dropdowns: [...dd, { id: pid('dd'), label: 'Option', options: ['Choice A', 'Choice B'] }] } as unknown as Partial<TENodeData>);
  };

  const removeDropdown = (ddId: string) => {
    if (!hasDropdowns) return;
    const dd = (d as TEGenericData).dropdowns ?? [];
    patch({ dropdowns: dd.filter((x: TEDropdown) => x.id !== ddId) } as unknown as Partial<TENodeData>);
  };

  const renameDropdown = (ddId: string, label: string) => {
    if (!hasDropdowns) return;
    const dd = (d as TEGenericData).dropdowns ?? [];
    patch({ dropdowns: dd.map((x: TEDropdown) => (x.id === ddId ? { ...x, label } : x)) } as unknown as Partial<TENodeData>);
  };

  const setDropdownOptions = (ddId: string, raw: string) => {
    if (!hasDropdowns) return;
    const dd = (d as TEGenericData).dropdowns ?? [];
    const options = raw.split(',').map((s) => s.trim()).filter(Boolean);
    patch({ dropdowns: dd.map((x: TEDropdown) => (x.id === ddId ? { ...x, options } : x)) } as unknown as Partial<TENodeData>);
  };

  const addDropdownOption = (ddId: string) => {
    if (!hasDropdowns) return;
    const dd = (d as TEGenericData).dropdowns ?? [];
    patch({ dropdowns: dd.map((x: TEDropdown) => (x.id === ddId ? { ...x, options: [...x.options, `Choice ${x.options.length + 1}`] } : x)) } as unknown as Partial<TENodeData>);
  };

  return (
    <aside className="te-prop-panel">
      <h3 className="te-prop-title">Properties</h3>

      {/* label + description */}
      <div className="te-prop-group">
        <label className="te-prop-label">Label</label>
        <input
          className="te-prop-input"
          value={d.label}
          onChange={(e) => patch({ label: e.target.value })}
        />
      </div>

      <div className="te-prop-group">
        <label className="te-prop-label">Description</label>
        <textarea
          className="te-prop-textarea"
          rows={2}
          value={d.description}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder="What does this element do?"
        />
      </div>

      {/* dimensions */}
      <div className="te-prop-row">
        <div className="te-prop-group te-prop-half">
          <label className="te-prop-label">Width</label>
          <input
            type="number"
            className="te-prop-input"
            value={d.width}
            min={60}
            step={10}
            onChange={(e) => patch({ width: Math.max(60, Number(e.target.value)) })}
          />
        </div>
        <div className="te-prop-group te-prop-half">
          <label className="te-prop-label">Height</label>
          <input
            type="number"
            className="te-prop-input"
            value={d.height}
            min={40}
            step={10}
            onChange={(e) => patch({ height: Math.max(40, Number(e.target.value)) })}
          />
        </div>
      </div>

      {/* color */}
      <div className="te-prop-group">
        <label className="te-prop-label">Color</label>
        <div className="te-color-row">
          <input
            type="color"
            value={d.color}
            onChange={(e) => patch({ color: e.target.value })}
            className="te-color-swatch"
          />
          <input
            className="te-prop-input te-color-hex"
            value={d.color}
            onChange={(e) => patch({ color: e.target.value })}
          />
        </div>
      </div>

      {/* inputs */}
      {hasIO && (
        <div className="te-prop-group">
          <div className="te-prop-label-row">
            <label className="te-prop-label">Inputs</label>
            <button className="te-prop-add-btn" onClick={() => addPort('inputs')} title="Add input">
              <Plus size={12} />
            </button>
          </div>
          {(d as TEGenericData).inputs.map((p) => (
            <div key={p.id} className="te-port-row">
              <input
                className="te-prop-input te-port-name"
                value={p.label}
                onChange={(e) => renamePort('inputs', p.id, e.target.value)}
              />
              <select
                className="te-prop-input te-port-side"
                value={p.side}
                onChange={(e) => changePortSide('inputs', p.id, e.target.value as TEPort['side'])}
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </select>
              <button className="te-port-del" onClick={() => removePort('inputs', p.id)}>
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* outputs */}
      {hasIO && (
        <div className="te-prop-group">
          <div className="te-prop-label-row">
            <label className="te-prop-label">Outputs</label>
            <button className="te-prop-add-btn" onClick={() => addPort('outputs')} title="Add output">
              <Plus size={12} />
            </button>
          </div>
          {(d as TEGenericData).outputs.map((p) => (
            <div key={p.id} className="te-port-row">
              <input
                className="te-prop-input te-port-name"
                value={p.label}
                onChange={(e) => renamePort('outputs', p.id, e.target.value)}
              />
              <select
                className="te-prop-input te-port-side"
                value={p.side}
                onChange={(e) => changePortSide('outputs', p.id, e.target.value as TEPort['side'])}
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </select>
              <button className="te-port-del" onClick={() => removePort('outputs', p.id)}>
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* dropdowns */}
      {hasDropdowns && (
        <div className="te-prop-group">
          <div className="te-prop-label-row">
            <label className="te-prop-label">Dropdowns</label>
            <button className="te-prop-add-btn" onClick={addDropdown} title="Add dropdown">
              <Plus size={12} />
            </button>
          </div>
          {(d as TEGenericData).dropdowns.map((dd) => (
            <div key={dd.id} className="te-dd-block">
              <div className="te-dd-header">
                <input
                  className="te-prop-input te-dd-name"
                  value={dd.label}
                  onChange={(e) => renameDropdown(dd.id, e.target.value)}
                  placeholder="Dropdown label"
                />
                <button className="te-port-del" onClick={() => removeDropdown(dd.id)}>
                  <Trash2 size={11} />
                </button>
              </div>
              <div className="te-dd-options">
                {dd.options.map((opt, idx) => (
                  <div key={idx} className="te-dd-opt-row">
                    <input
                      className="te-prop-input te-dd-opt-input"
                      value={opt}
                      onChange={(e) => {
                        const updated = [...dd.options];
                        updated[idx] = e.target.value;
                        setDropdownOptions(dd.id, updated.join(','));
                      }}
                    />
                    <button
                      className="te-port-del"
                      onClick={() => {
                        const updated = dd.options.filter((_, i) => i !== idx);
                        setDropdownOptions(dd.id, updated.join(','));
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <button className="te-dd-add-opt" onClick={() => addDropdownOption(dd.id)}>
                  <Plus size={10} /> Add option
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
