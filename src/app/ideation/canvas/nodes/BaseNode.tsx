"use client";

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { StageId } from '@/lib/ideation/engine/stages';
import { NODE_META, STAGE_ORDER } from './nodeRegistry';
import { useSession } from '@/lib/ideation/context/SessionContext';
import './BaseNode.css';

export type NodeStatus = 'empty' | 'running' | 'complete' | 'stale';

interface BaseNodeProps {
  stageId: StageId;
  status: NodeStatus;
  selected?: boolean;
  children?: React.ReactNode;
  onRun?: () => void;
  hideSourceHandle?: boolean;
  hideTargetHandle?: boolean;
  hideResultHandle?: boolean;
  subName?: string;
}

function BaseNodeInner({
  stageId,
  status,
  selected,
  children,
  onRun,
  hideSourceHandle,
  hideTargetHandle,
  hideResultHandle,
  subName,
}: BaseNodeProps) {
  const meta = NODE_META[stageId];
  const { runningStageId } = useSession();

  const isPathComplete = runningStageId
    ? STAGE_ORDER.indexOf(stageId) < STAGE_ORDER.indexOf(runningStageId) && status === 'complete'
    : false;

  const statusIcon =
    status === 'running' ? '\u27F3' :
    status === 'complete' ? '\u2713' :
    status === 'stale' ? '\u27F3' :
    '\u25CB';

  const classNames = [
    'base-node',
    selected ? 'selected' : '',
    `status-${status}`,
    isPathComplete ? 'status-path-complete' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      title={meta.tooltip}
    >
      <div className="base-node-header" style={{ background: meta.color }}>
        <div className="base-node-label-group">
          <span className="base-node-label">{meta.label}</span>
          {subName && <span className="base-node-subname">{subName}</span>}
        </div>
        <span className={`base-node-status status-icon-${status}`}>{statusIcon}</span>
      </div>

      <div className="base-node-body">
        {children}

        {onRun && status !== 'running' && (
          <button
            className="base-node-run"
            onClick={(e) => { e.stopPropagation(); onRun(); }}
            style={{ borderColor: meta.color, color: meta.color }}
          >
            {status === 'complete' && !staleCheck(status) ? 'Re-run' : meta.runLabel}
          </button>
        )}

        {status === 'running' && (
          <div className="base-node-loading">
            <div className="base-node-spinner" style={{ borderTopColor: meta.color }} />
            <span>{meta.loadingMessage}</span>
          </div>
        )}
      </div>

      {!hideTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="base-handle target-handle"
          style={{ background: meta.color }}
        />
      )}
      {!hideSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          id="main"
          className="base-handle source-handle"
          style={{ background: meta.color }}
        />
      )}
      {!hideResultHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="results"
          className="base-handle result-handle"
          style={{ background: '#80cbc4' }}
        />
      )}
    </div>
  );
}

function staleCheck(status: NodeStatus) {
  return status === 'stale';
}

export default memo(BaseNodeInner);
