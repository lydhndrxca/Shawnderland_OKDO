"use client";

import { memo, useCallback, useState, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NODE_META, STAGE_ORDER } from './nodeRegistry';
import type { StageId } from '@/lib/ideation/engine/stages';
import './GroupNode.css';

interface GroupNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function getWindow() {
  return window as unknown as Record<string, unknown>;
}

function getUpdateNodeData(): ((id: string, d: Record<string, unknown>) => void) | undefined {
  return getWindow().__updateNodeData as ((id: string, d: Record<string, unknown>) => void) | undefined;
}

function GroupNodeInner({ id, data, selected }: GroupNodeProps) {
  const groupName = (data.groupName as string) ?? 'Pack';
  const childNodeIds = (data.childNodeIds as string[]) ?? [];
  const [expanded, setExpanded] = useState((data.expanded as boolean) ?? false);
  const [nameEditing, setNameEditing] = useState(false);
  const [localName, setLocalName] = useState(groupName);

  const outputHandles = useMemo(() => {
    const getEdges = getWindow().__getEdges as (() => Array<{ source: string; target: string }>) | undefined;
    if (!getEdges) return [];
    const edges = getEdges();
    const childSet = new Set(childNodeIds);
    const outgoing = edges.filter((e) => childSet.has(e.source) && !childSet.has(e.target));

    const seen = new Set<string>();
    const handles: Array<{ sourceId: string; label: string; color: string }> = [];
    for (const e of outgoing) {
      if (seen.has(e.source)) continue;
      seen.add(e.source);
      const stageId = e.source.split('-')[0] as StageId;
      const meta = STAGE_ORDER.includes(stageId) ? NODE_META[stageId] : null;
      handles.push({
        sourceId: e.source,
        label: meta?.label ?? e.source,
        color: meta?.color ?? '#607d8b',
      });
    }
    return handles;
  }, [childNodeIds]);

  const toggleExpanded = useCallback(() => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    const update = getUpdateNodeData();
    if (update) update(id, { expanded: newExpanded });

    if (newExpanded) {
      const autoLayout = getWindow().__triggerGroupExpand as ((groupId: string) => void) | undefined;
      if (autoLayout) autoLayout(id);
    }
  }, [id, expanded]);

  const handleNameSave = useCallback(() => {
    setNameEditing(false);
    const update = getUpdateNodeData();
    if (update) update(id, { groupName: localName });
  }, [id, localName]);

  return (
    <div
      className={`group-node ${selected ? 'selected' : ''} ${expanded ? 'expanded' : 'collapsed'}`}
      onDoubleClick={(e) => { e.stopPropagation(); toggleExpanded(); }}
      title={expanded ? 'Double-click to collapse into a pack node' : 'Double-click to expand and show child nodes'}
    >
      <div className="group-node-header">
        <span className="group-node-dot" />
        {nameEditing ? (
          <input
            className="group-node-name-input nodrag nowheel"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); }}
            autoFocus
          />
        ) : (
          <span
            className="group-node-label"
            onDoubleClick={(e) => { e.stopPropagation(); setNameEditing(true); }}
          >
            {localName}
          </span>
        )}
        <span className="group-node-badge">{childNodeIds.length} nodes</span>
      </div>

      {!expanded && (
        <div className="group-node-collapsed-body">
          {childNodeIds.length > 0 && (
            <div className="group-node-child-tags">
              {childNodeIds.map((cid) => {
                const stageId = cid.split('-')[0] as StageId;
                const meta = STAGE_ORDER.includes(stageId) ? NODE_META[stageId] : null;
                return (
                  <div key={cid} className="group-node-child-tag">
                    {meta && <span className="group-child-dot" style={{ background: meta.color }} />}
                    <span>{meta?.label ?? cid}</span>
                  </div>
                );
              })}
            </div>
          )}
          {outputHandles.length > 0 && (
            <div className="group-node-outputs">
              <div className="group-outputs-label">Outputs</div>
              {outputHandles.map((h) => (
                <div key={h.sourceId} className="group-output-row">
                  <span className="group-output-dot" style={{ background: h.color }} />
                  <span className="group-output-name">{h.label}</span>
                </div>
              ))}
            </div>
          )}
          <div className="group-node-hint">Double-click to expand</div>
        </div>
      )}

      {expanded && (
        <div className="group-node-expanded-body">
          <div className="group-node-children-area">
            {childNodeIds.map((cid) => {
              const stageId = cid.split('-')[0] as StageId;
              const meta = STAGE_ORDER.includes(stageId) ? NODE_META[stageId] : null;
              return (
                <div key={cid} className="group-node-child-tag">
                  {meta && <span className="group-child-dot" style={{ background: meta.color }} />}
                  <span>{meta?.label ?? cid}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        className="base-handle target-handle"
        style={{ background: '#607d8b' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="base-handle source-handle"
        style={{ background: '#607d8b' }}
      />
    </div>
  );
}

export default memo(GroupNodeInner);
