"use client";

import { useRef } from 'react';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { STAGE_LABELS, type StageId } from '@/lib/ideation/engine/stages';
import type { SessionEvent } from '@/lib/ideation/state/sessionTypes';
import './HistoryPanel.css';

function eventSummary(event: SessionEvent): string {
  switch (event.type) {
    case 'SESSION_CREATE':
      return 'Session created';
    case 'SEED_EDIT': {
      const txt = (event.data.seedText as string) || '';
      return `Seed: "${txt.length > 40 ? txt.slice(0, 40) + '…' : txt}"`;
    }
    case 'USER_INPUT': {
      const content = (event.data.content as string) || '';
      return `Input: "${content.length > 40 ? content.slice(0, 40) + '…' : content}"`;
    }
    case 'STAGE_RUN':
      return `Ran ${event.stageId ? STAGE_LABELS[event.stageId as StageId] : 'unknown'}`;
    case 'NORMALIZE_EDIT_SUMMARY':
      return 'Edited normalize summary';
    case 'NORMALIZE_EDIT_ASSUMPTIONS': {
      const changes = event.data.changes as Array<{ key: string }> | undefined;
      const count = changes?.length ?? 0;
      return `Edited ${count} assumption${count !== 1 ? 's' : ''}`;
    }
    case 'DIVERGE_PIN':
      return `Pinned ${(event.data.candidateId as string)?.slice(0, 12)}…`;
    case 'DIVERGE_UNPIN':
      return `Unpinned ${(event.data.candidateId as string)?.slice(0, 12)}…`;
    case 'DIVERGE_REGEN_UNPINNED':
      return 'Regenerated unpinned candidates';
    case 'DIVERGE_REGEN_VARIANT':
      return `Variant regen along "${event.data.differAlong}"`;
    case 'CRITIQUE_RUN': {
      const summary = event.data.resultSummary as { totalCritiqued?: number; genericCount?: number } | undefined;
      return `Critique: ${summary?.totalCritiqued ?? '?'} reviewed, ${summary?.genericCount ?? '?'} generic`;
    }
    case 'MUTATION_APPLIED':
      return `Applied mutation → ${(event.data.toCandidateId as string)?.slice(0, 12)}…`;
    case 'MUTATION_REJECTED':
      return `Rejected mutation ${(event.data.mutationId as string)?.slice(0, 12)}…`;
    case 'EXPAND_SHORTLIST_SET': {
      const ids = event.data.candidateIds as string[] | undefined;
      return `Shortlist set: ${ids?.length ?? 0} candidates`;
    }
    case 'EXPAND_RUN':
      return `Expanded ${(event.data.candidateIds as string[])?.length ?? '?'} candidates`;
    case 'EXPAND_FIELD_EDIT':
      return `Edited ${event.data.field} for ${(event.data.candidateId as string)?.slice(0, 10)}…`;
    case 'EXPAND_SECTION_REGEN':
      return `Regen ${event.data.field} for ${(event.data.candidateId as string)?.slice(0, 10)}…`;
    case 'CONVERGE_RUN':
      return `Scored candidates`;
    case 'SELECT_WINNER':
      return `Selected winner: ${(event.data.candidateId as string)?.slice(0, 12)}…`;
    case 'SELECT_RUNNER_UP':
      return `Selected runner-up: ${(event.data.candidateId as string)?.slice(0, 12)}…`;
    case 'OVERRIDE_WINNER':
      return `Overrode winner → ${(event.data.candidateId as string)?.slice(0, 12)}…`;
    case 'COMMIT_RUN':
      return `Committed: ${(event.data.title as string)?.slice(0, 30) ?? 'artifact'}`;
    case 'EXPORT_MARKDOWN':
      return `Exported markdown${event.data.path ? ` → ${(event.data.path as string).slice(0, 30)}` : ''}`;
    case 'EXPORT_CLIPBOARD':
      return 'Copied to clipboard';
    case 'BRANCH_CREATE':
      return `Branch: ${(event.data.newBranchId as string)?.slice(0, 16)}`;
    case 'SETTINGS_UPDATE': {
      const changes = event.data.changes as Record<string, unknown> | undefined;
      return `Settings: ${changes ? Object.keys(changes).join(', ') : 'updated'}`;
    }
    case 'SAFETY_INTERVENTION':
      return `Safety: ${(event.data.kind as string)} — ${(event.data.reason as string)?.slice(0, 40)}`;
    case 'EVAL_RUN':
      return `Eval ${event.data.mode}: ${event.data.pass ? 'PASS' : 'FAIL'}`;
    case 'EVAL_METRICS_RECORDED':
      return 'Metrics recorded';
    case 'SMOKE_RUN':
      return `Smoke ${event.data.providerMode}: ${event.data.pass ? 'PASS' : 'FAIL'} (${event.data.failuresCount} failures)`;
    case 'SMOKE_RESULT':
      return `Smoke result: ${event.data.ok ? 'OK' : 'FAILED'}`;
    case 'SESSION_CORRUPTION_DETECTED':
      return `Corruption detected: ${(event.data.reason as string)?.slice(0, 40)}`;
    case 'SESSION_SIZE_WARNING':
      return `Session size warning: ${((event.data.bytes as number) / (1024 * 1024)).toFixed(1)} MB`;
    case 'SESSION_ARCHIVE_EXPORTED':
      return `Archive exported${event.data.path ? `: ${(event.data.path as string).slice(0, 30)}` : ''}`;
    default:
      return event.type;
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const TYPE_LABELS: Record<string, string> = {
  SESSION_CREATE: 'SYS',
  SEED_EDIT: 'SEED',
  USER_INPUT: 'INPUT',
  STAGE_RUN: 'RUN',
  NORMALIZE_EDIT_SUMMARY: 'EDIT',
  NORMALIZE_EDIT_ASSUMPTIONS: 'EDIT',
  DIVERGE_PIN: 'PIN',
  DIVERGE_UNPIN: 'UNPIN',
  DIVERGE_REGEN_UNPINNED: 'REGEN',
  DIVERGE_REGEN_VARIANT: 'REGEN',
  CRITIQUE_RUN: 'CRIT',
  MUTATION_APPLIED: 'MUTATE',
  MUTATION_REJECTED: 'REJECT',
  EXPAND_SHORTLIST_SET: 'LIST',
  EXPAND_RUN: 'EXPAND',
  EXPAND_FIELD_EDIT: 'EDIT',
  EXPAND_SECTION_REGEN: 'REGEN',
  CONVERGE_RUN: 'SCORE',
  SELECT_WINNER: 'WIN',
  SELECT_RUNNER_UP: 'RUNNER',
  OVERRIDE_WINNER: 'OVERRIDE',
  COMMIT_RUN: 'COMMIT',
  EXPORT_MARKDOWN: 'EXPORT',
  EXPORT_CLIPBOARD: 'COPY',
  BRANCH_CREATE: 'BRANCH',
  SETTINGS_UPDATE: 'CONFIG',
  SAFETY_INTERVENTION: 'SAFETY',
  EVAL_RUN: 'EVAL',
  EVAL_METRICS_RECORDED: 'METRIC',
  SMOKE_RUN: 'SMOKE',
  SMOKE_RESULT: 'SMOKE',
  SESSION_CORRUPTION_DETECTED: 'CORRUPT',
  SESSION_SIZE_WARNING: 'SIZE',
  SESSION_ARCHIVE_EXPORTED: 'ARCHIVE',
};

export default function HistoryPanel() {
  const { session } = useSession();
  const listRef = useRef<HTMLDivElement>(null);

  const events = [...session.events].reverse();

  return (
    <div className="history-panel">
      <h3 className="history-heading">History</h3>
      <div className="history-list" ref={listRef}>
        {events.map((event) => (
          <div
            key={event.id}
            className={`history-event history-${event.type.toLowerCase()}`}
          >
            <span className="history-time">{formatTime(event.timestamp)}</span>
            <span
              className={`history-type-badge badge-${event.type.toLowerCase()}`}
            >
              {TYPE_LABELS[event.type] ?? event.type}
            </span>
            <span className="history-summary">{eventSummary(event)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
