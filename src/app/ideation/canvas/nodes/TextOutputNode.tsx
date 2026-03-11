"use client";

import { memo, useCallback, useState, useRef, useEffect } from 'react';
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
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  const connections = useHandleConnections({ type: 'target' });
  const sourceNodeId = connections?.[0]?.source;
  const sourceNodeData = useNodesData(sourceNodeId ?? '');

  const ideaText = extractIdeaText(sourceNodeData?.data);

  const handleCopy = useCallback(() => {
    if (!ideaText) return;
    navigator.clipboard.writeText(ideaText);
    setCopied(true);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [ideaText]);

  return (
    <div
      className={`text-output-node ${selected ? 'selected' : ''} ${expanded ? 'expanded' : ''}`}
      title="Displays text from any connected node"
    >
      <div className="text-output-header">
        <span className="text-output-label">Text Output</span>
        {ideaText && (
          <button className="text-output-copy nodrag" onClick={(e) => { e.stopPropagation(); handleCopy(); }}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
      <div className="text-output-body nowheel nodrag" onClick={() => ideaText && setExpanded(!expanded)}>
        {ideaText ? (
          <div className="text-output-content">
            {expanded ? ideaText : ideaText.slice(0, 200) + (ideaText.length > 200 ? '...' : '')}
          </div>
        ) : (
          <div className="text-output-empty">Connect any node to see its text output here</div>
        )}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id="idea"
        className="text-output-handle"
        style={{ background: '#e0e0e0' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="text-output-handle"
        style={{ background: '#e0e0e0' }}
      />
    </div>
  );
}

function extractIdeaText(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  const parts: string[] = [];

  if (data.extractedText && typeof data.extractedText === 'string') {
    parts.push(data.extractedText);
  }

  if (data.text && typeof data.text === 'string' && !parts.length) {
    parts.push(data.text);
  }

  if (data.seedText && typeof data.seedText === 'string') {
    parts.push(data.seedText);
  }

  if (data.prefillSeed && typeof data.prefillSeed === 'string' && !parts.length) {
    parts.push(data.prefillSeed);
  }

  if (data.characterDescription && typeof data.characterDescription === 'string') {
    parts.push(`Character: ${data.characterDescription}`);
  }
  if (data.weaponDescription && typeof data.weaponDescription === 'string') {
    parts.push(`Weapon: ${data.weaponDescription}`);
  }

  if (data.nodeText && typeof data.nodeText === 'string') {
    parts.push(data.nodeText);
  }
  if (data.nodeNotes && typeof data.nodeNotes === 'string') {
    parts.push(data.nodeNotes);
  }

  if (data.documentContent && typeof data.documentContent === 'string') {
    parts.push(data.documentContent);
  }

  if (data.outputData && typeof data.outputData === 'object') {
    const od = data.outputData as Record<string, unknown>;
    if (od.title) parts.push(`Title: ${od.title}`);
    if (od.differentiator) parts.push(`Differentiator: ${od.differentiator}`);
    if (od.seedSummary) parts.push(`Summary: ${od.seedSummary}`);
    if (od.next3Actions) parts.push(`Next actions: ${od.next3Actions}`);
    if (od.rationale && typeof od.rationale === 'string') parts.push(`Rationale: ${od.rationale}`);
    if (od.candidates && Array.isArray(od.candidates)) {
      for (const c of od.candidates as Array<Record<string, unknown>>) {
        if (c.hook) parts.push(`- ${c.hook}`);
      }
    }
  }

  if (data._stageOutput && typeof data._stageOutput === 'object') {
    const so = data._stageOutput as Record<string, unknown>;
    if (so.summary && typeof so.summary === 'string') parts.push(so.summary);
    if (so.assumptions && Array.isArray(so.assumptions)) parts.push(`Assumptions: ${(so.assumptions as string[]).join(', ')}`);
    if (so.questions && Array.isArray(so.questions)) parts.push(`Questions: ${(so.questions as string[]).join(', ')}`);
  }

  if (parts.length === 0 && data.stageId && typeof data.stageId === 'string') {
    return `[${data.stageId}] Connected — waiting for data`;
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}

export default memo(TextOutputNodeInner);
