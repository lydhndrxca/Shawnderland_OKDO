"use client";

import { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import './DocumentInfluenceNode.css';

interface DocumentInfluenceNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function DocumentInfluenceNodeInner({ id, data, selected }: DocumentInfluenceNodeProps) {
  const [fileName, setFileName] = useState((data.fileName as string) ?? '');
  const [preview, setPreview] = useState((data.nodeText as string) ?? '');

  const handleOpen = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.pdf,.doc,.docx';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        setFileName(file.name);
        setPreview(content);
        if ((window as unknown as Record<string, unknown>).__updateNodeData) {
          ((window as unknown as Record<string, unknown>).__updateNodeData as (id: string, d: Record<string, unknown>) => void)(id, { nodeText: content, fileName: file.name });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [id]);

  return (
    <div
      className={`doc-influence-node ${selected ? 'selected' : ''}`}
      title="Upload a document (.txt, .md, .pdf) to use its content as an influence on the pipeline."
    >
      <div className="doc-influence-header">
        <span className="doc-influence-label">Document</span>
      </div>
      <div className="doc-influence-body">
        <button className="doc-influence-open nodrag" onClick={handleOpen}>
          {fileName || 'Upload Document...'}
        </button>
        {preview && (
          <div className="doc-influence-preview">{preview.slice(0, 200)}{preview.length > 200 ? '...' : ''}</div>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="base-handle target-handle" style={{ background: '#a1887f' }} />
      <Handle type="source" position={Position.Right} className="base-handle source-handle" style={{ background: '#a1887f' }} />
    </div>
  );
}

export default memo(DocumentInfluenceNodeInner);
