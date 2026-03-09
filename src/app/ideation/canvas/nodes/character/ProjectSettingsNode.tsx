"use client";

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useGlobalSettings } from '@/lib/globalSettings';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function ProjectSettingsNodeInner({ data, selected }: Props) {
  const settings = useGlobalSettings();
  const projectName = (data?.projectName as string) || '';
  const displayDir = settings.outputDir || '(not set)';

  const openSettings = () => {
    const w = window as unknown as Record<string, unknown>;
    const nav = w.__workspaceNavigate as ((path: string) => void) | undefined;
    if (nav) {
      nav('/settings');
    } else {
      window.history.pushState({}, '', '/settings');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charProject}>
      <div className="char-node-header" style={{ background: '#546e7a' }}>
        Project Settings
      </div>
      <div className="char-node-body">
        {projectName && (
          <div className="char-field">
            <span className="char-field-label">Name</span>
            <span className="char-input" style={{ opacity: 0.7, fontSize: 11 }}>{projectName}</span>
          </div>
        )}
        <div className="char-field">
          <span className="char-field-label wide">Output Directory</span>
          <span className="char-input" style={{ opacity: 0.7, fontSize: 11, wordBreak: 'break-all' }}>
            {displayDir}
          </span>
        </div>
        <button
          type="button"
          className="char-btn nodrag"
          onClick={openSettings}
          style={{ marginTop: 4, width: '100%' }}
        >
          Open Global Settings
        </button>
      </div>

      <Handle type="source" position={Position.Right} id="settings-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(ProjectSettingsNodeInner);
