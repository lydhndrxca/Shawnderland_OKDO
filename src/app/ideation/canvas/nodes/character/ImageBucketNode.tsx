"use client";

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function ImageBucketNodeInner({ id, data, selected }: Props) {
  const { getNode, getEdges } = useReactFlow();
  const [status, setStatus] = useState('');
  const statusTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(statusTimerRef.current), []);

  const resolvedPath = (() => {
    const edges = getEdges();
    const incoming = edges.filter((e) => e.target === id);
    let outputDir = '';
    let projectName = '';

    for (const e of incoming) {
      const src = getNode(e.source);
      if (!src?.data) continue;
      const d = src.data as Record<string, unknown>;
      if (src.type === 'charProject') {
        if (d.outputDir) outputDir = d.outputDir as string;
        if (d.projectName) projectName = d.projectName as string;
      }
      if (d.outputDir) outputDir = d.outputDir as string;
      if (d.projectName) projectName = d.projectName as string;
    }

    if (!outputDir) return null;
    const charFolder = projectName
      ? `${outputDir}\\${projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}`
      : outputDir;
    return charFolder;
  })();

  const handleOpenDir = useCallback(async () => {
    if (!resolvedPath) {
      setStatus('No output directory configured');
      return;
    }
    setStatus('Opening...');
    try {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open', path: resolvedPath }),
      });
      setStatus('Opened');
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = setTimeout(() => setStatus(''), 2000);
    } catch {
      setStatus('Could not open directory');
    }
  }, [resolvedPath]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charImageBucket}>
      <div className="char-node-header" style={{ background: '#43a047' }}>
        Generated Images
      </div>
      <div className="char-node-body">
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
          Browse the generated images directory. Connect to Project Settings to resolve paths.
        </p>
        {resolvedPath ? (
          <div className="char-project-path">{resolvedPath}</div>
        ) : (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            No output directory — connect Project Settings
          </div>
        )}
        <button
          className="char-btn primary nodrag"
          onClick={handleOpenDir}
          disabled={!resolvedPath}
        >
          Open Directory
        </button>
        {status && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{status}</div>}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(ImageBucketNodeInner);
