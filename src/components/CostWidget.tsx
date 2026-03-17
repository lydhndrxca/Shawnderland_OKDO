"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import {
  subscribeCosts,
  getSnapshot,
  resetCosts,
  setActiveApp,
  type CostSnapshot,
} from '@/lib/ideation/engine/provider/costTracker';
import { exportForResearch, downloadResearchExport } from '@/lib/ideation/engine/generationLog';
import './CostWidget.css';

const APP_LABELS: Record<string, string> = {
  shawndermind: 'Ideation Pipeline',
  'concept-lab': 'ConceptLab',
  'gemini-studio': 'Gemini Studio',
  'tool-editor': 'Tool Editor',
  walter: 'W_w_W Story',
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatCost(cost: number): string {
  if (cost < 0.0001) return '$0.0000';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(4)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function CostWidget({ appKey }: { appKey: string }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cost = useSyncExternalStore(subscribeCosts, getSnapshot, getSnapshot);

  useEffect(() => {
    setActiveApp(appKey);
  }, [appKey]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="cost-widget" ref={wrapperRef}>
      <button
        className={`cost-pill ${open ? 'active' : ''} ${cost.apiCalls > 0 ? 'has-data' : ''}`}
        onClick={() => setOpen(!open)}
        title="API usage & costs"
      >
        <span className="cost-pill-icon">&#x26A1;</span>
        {cost.apiCalls > 0 && (
          <span className="cost-pill-amount">{formatCost(cost.estimatedCost)}</span>
        )}
      </button>

      {open && <CostPanel cost={cost} />}
    </div>
  );
}

function CostPanel({ cost }: { cost: CostSnapshot }) {
  const apps = Object.entries(cost.byApp);
  const models = Object.entries(cost.byModel);

  return (
    <div className="cost-panel">
      <div className="cost-panel-header">
        <span className="cost-panel-title">API Usage</span>
        <span className="cost-panel-badge">{cost.apiCalls} calls</span>
      </div>

      <div className="cost-panel-body">
        <div className="cost-row cost-row-total">
          <span className="cost-label">Cumulative Total</span>
          <span className="cost-value cost-value-green">{formatCost(cost.estimatedCost)}</span>
        </div>

        {cost.totalTokens > 0 && (
          <>
            <div className="cost-row">
              <span className="cost-label">Input Tokens</span>
              <span className="cost-value">{formatTokens(cost.inputTokens)}</span>
            </div>
            <div className="cost-row">
              <span className="cost-label">Output Tokens</span>
              <span className="cost-value">{formatTokens(cost.outputTokens)}</span>
            </div>
          </>
        )}

        {apps.length > 0 && (
          <>
            <div className="cost-divider" />
            <div className="cost-section-label">By Application</div>
            {apps.map(([key, usage]) => (
              <div key={key} className="cost-row">
                <span className="cost-label">{APP_LABELS[key] || key}</span>
                <span className="cost-value">
                  <span className="cost-app-calls">{usage.calls}x</span>
                  <span className="cost-value-green">{formatCost(usage.cost)}</span>
                </span>
              </div>
            ))}
          </>
        )}

        {models.length > 0 && (
          <>
            <div className="cost-divider" />
            <div className="cost-section-label">By Model</div>
            {models.map(([name, usage]) => (
              <div key={name} className="cost-model-block">
                <div className="cost-model-name">
                  <span>{name}</span>
                  <span className="cost-model-calls">{usage.calls}x</span>
                </div>
                <div className="cost-model-details">
                  {usage.inputTokens > 0 && <span>{formatTokens(usage.inputTokens)} in</span>}
                  {usage.outputTokens > 0 && <span>{formatTokens(usage.outputTokens)} out</span>}
                  {usage.imagesGenerated > 0 && <span>{usage.imagesGenerated} img{usage.imagesGenerated !== 1 ? 's' : ''}</span>}
                  {usage.videoSeconds > 0 && <span>{usage.videoSeconds}s video</span>}
                  <span className="cost-value-green">{formatCost(usage.cost)}</span>
                </div>
              </div>
            ))}
          </>
        )}

        <div className="cost-divider" />
        <div className="cost-row">
          <span className="cost-label">Tracking Since</span>
          <span className="cost-value cost-value-muted">{formatDate(cost.firstCallAt)}</span>
        </div>
        <div className="cost-row">
          <span className="cost-label">Last Call</span>
          <span className="cost-value cost-value-muted">{formatDate(cost.lastCallAt)}</span>
        </div>
      </div>

      <div className="cost-pricing-note">
        Flash: $0.10/$0.40 per 1M tok &middot; Imagen: $0.03-0.04/img &middot; Veo: $0.35/sec
      </div>

      <div className="cost-actions">
        <button className="cost-action-btn cost-reset" onClick={resetCosts}>
          Reset Counter
        </button>
        <button
          className="cost-action-btn cost-export"
          onClick={async () => {
            const d = await exportForResearch();
            downloadResearchExport(d);
          }}
        >
          Export Log
        </button>
      </div>
    </div>
  );
}
