"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function ProjectSettingsNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [projectName, setProjectName] = useState((data?.projectName as string) ?? '');
  const [outputDir, setOutputDir] = useState((data?.outputDir as string) ?? '');

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const handleBrowse = useCallback(async () => {
    try {
      const res = await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'browse' }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.path) {
          setOutputDir(json.path);
          persist({ outputDir: json.path });
        }
      }
    } catch {
      // API may not be available in all environments
    }
  }, [persist]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#546e7a' }}>
        Project Settings
      </div>
      <div className="char-node-body">
        <div className="char-field">
          <span className="char-field-label">Name</span>
          <input
            className="char-input nodrag"
            value={projectName}
            onChange={(e) => {
              setProjectName(e.target.value);
              persist({ projectName: e.target.value });
            }}
            placeholder="Character project name..."
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="char-field-label wide">Output Directory</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              className="char-input nodrag"
              value={outputDir}
              onChange={(e) => {
                setOutputDir(e.target.value);
                persist({ outputDir: e.target.value });
              }}
              placeholder="e.g., C:\Characters"
              style={{ flex: 1 }}
            />
            <button className="char-btn nodrag" onClick={handleBrowse} style={{ flexShrink: 0 }}>
              Browse
            </button>
          </div>
          {outputDir && <div className="char-project-path">{outputDir}</div>}
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="settings-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(ProjectSettingsNodeInner);
