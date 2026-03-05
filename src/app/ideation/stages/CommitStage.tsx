"use client";

import { useState } from 'react';
import type { CommitOutput } from '@/lib/ideation/engine/schemas';
import { COMMIT_TEMPLATES } from '@/lib/ideation/engine/commit/templates';
import { makeExportFilename, exportCommitAsMarkdown } from '@/lib/ideation/engine/commit/export';
import { copyToClipboard, saveFileDialog } from '../ipc';
import { useSession } from '@/lib/ideation/context/SessionContext';
import {
  getResolvedWinnerId,
  getLastExportPath,
} from '@/lib/ideation/state/sessionSelectors';

export default function CommitStage({ output }: { output: unknown }) {
  const {
    session,
    runStage,
    recordExport,
    isRunning,
    setActiveStageId,
  } = useSession();
  const [templateType, setTemplateType] = useState('game-one-pager');
  const [copied, setCopied] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const winnerId = getResolvedWinnerId(session);
  const lastExport = getLastExportPath(session);
  const data = output as CommitOutput | null;

  if (!winnerId) {
    return (
      <div className="commit-board">
        <div className="commit-blocking">
          <p>No winner selected. Please complete the Converge stage first.</p>
          <button
            className="action-btn"
            onClick={() => setActiveStageId('converge')}
          >
            Go to Converge
          </button>
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    await runStage('commit', { templateType });
  };

  const handleCopy = async () => {
    if (!data) return;
    const md = exportCommitAsMarkdown(data, session, winnerId, templateType);
    await copyToClipboard(md);
    recordExport('clipboard');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!data) return;
    const md = exportCommitAsMarkdown(data, session, winnerId, templateType);
    const filename = makeExportFilename();
    const result = await saveFileDialog(md, filename);
    if (result) {
      recordExport('markdown', filename);
      setSavedPath(filename);
    }
  };

  return (
    <div className="commit-board">
      <div className="commit-controls">
        <div className="commit-template-row">
          <label className="field-label">Template</label>
          <select
            className="commit-template-select"
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value)}
          >
            {COMMIT_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            className="action-btn"
            onClick={handleGenerate}
            disabled={isRunning}
          >
            {isRunning ? 'Generating…' : 'Generate Commit'}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div className="commit-header">
            <div className="commit-title-row">
              <span className="commit-type-badge">{data.artifactType}</span>
              <h3 className="commit-title">{data.title}</h3>
            </div>
            <div className="commit-actions">
              <button className="action-btn small" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                className="action-btn small secondary"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </div>

          <div className="commit-sections">
            <div className="field">
              <label className="field-label">Differentiator</label>
              <p className="field-value">{data.differentiator}</p>
            </div>
            <div className="field">
              <label className="field-label">Constraints</label>
              <p className="field-value">{data.constraints}</p>
            </div>
            <div className="field">
              <label className="field-label">First 60 Minutes</label>
              <p className="field-value">{data.first60Minutes}</p>
            </div>
            <div className="field">
              <label className="field-label">Next 3 Actions</label>
              <p className="field-value pre-wrap">{data.next3Actions}</p>
            </div>
            <div className="field">
              <label className="field-label">Risk Notes</label>
              <p className="field-value">{data.riskNotes}</p>
            </div>
          </div>

          {(savedPath || lastExport) && (
            <div className="commit-export-info">
              <span className="text-muted">
                Last export: {savedPath ?? lastExport}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
