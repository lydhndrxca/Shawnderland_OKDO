"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useHandleConnections, useNodesData } from '@xyflow/react';
import './TextOutputNode.css';

interface TextOutputNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function TextOutputNodeInner({ selected }: TextOutputNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const connections = useHandleConnections({ type: 'target' });
  const sourceNodeId = connections?.[0]?.source;
  const sourceNodeData = useNodesData(sourceNodeId ?? '');

  const ideaText = extractIdeaText(sourceNodeData?.data);

  const handleCopy = useCallback(() => {
    if (!ideaText) return;
    navigator.clipboard.writeText(ideaText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [ideaText]);

  return (
    <div
      className={`text-output-node ${selected ? 'selected' : ''} ${expanded ? 'expanded' : ''}`}
      title="Displays the idea state as formatted text"
    >
      <div className="text-output-header">
        <span className="text-output-label">Text Output</span>
        {ideaText && (
          <button className="text-output-copy nodrag" onClick={(e) => { e.stopPropagation(); handleCopy(); }}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
      <div className="text-output-body" onClick={() => ideaText && setExpanded(!expanded)}>
        {ideaText ? (
          <div className="text-output-content">
            {expanded ? ideaText : ideaText.slice(0, 120) + (ideaText.length > 120 ? '...' : '')}
          </div>
        ) : (
          <div className="text-output-empty">Connect a pipeline node to see output</div>
        )}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id="idea"
        className="text-output-handle"
        style={{ background: '#e0e0e0' }}
      />
    </div>
  );
}

function extractIdeaText(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  const stageId = data.stageId as string | undefined;
  if (!stageId) return null;
  return `[${stageId}] Output connected. Click to expand and view full content.`;
}

export default memo(TextOutputNodeInner);
