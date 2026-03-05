"use client";

import { useState } from 'react';
import type { ExpandExpansion, DivergeCandidate } from '@/lib/ideation/engine/schemas';
import { REGENERABLE_FIELDS, type RegenerableField } from '@/lib/ideation/engine/expand/sectionRegen';
import { useSession } from '@/lib/ideation/context/SessionContext';
import {
  getEffectiveCandidatePool,
  getExpandShortlistIds,
  getEffectiveExpansions,
  getUserEditedFields,
} from '@/lib/ideation/state/sessionSelectors';

export default function ExpandStage({ output }: { output: unknown }) {
  const {
    session,
    setExpandShortlist,
    editExpansionField,
    regenSection,
    isRunning,
  } = useSession();

  const candidates = getEffectiveCandidatePool(session);
  const shortlistIds = getExpandShortlistIds(session);
  const expansions = output ? getEffectiveExpansions(session) : [];

  if (!output && candidates.length > 0) {
    return (
      <ShortlistSelector
        candidates={candidates}
        shortlistIds={shortlistIds}
        onSetShortlist={setExpandShortlist}
      />
    );
  }

  if (!output) {
    return (
      <div className="stage-empty">
        <p>Run Critique/Salvage first to populate candidate pool.</p>
      </div>
    );
  }

  return (
    <div className="expand-board">
      <div className="expand-header">
        <ShortlistSelector
          candidates={candidates}
          shortlistIds={shortlistIds}
          onSetShortlist={setExpandShortlist}
          compact
        />
      </div>
      <div className="expand-panels">
        {expansions.map((exp) => {
          const candidate = candidates.find((c) => c.id === exp.candidateId);
          return (
            <ExpansionPanel
              key={exp.candidateId}
              expansion={exp}
              candidate={candidate ?? null}
              editedFields={getUserEditedFields(session, exp.candidateId)}
              onFieldEdit={(field, prev, next) =>
                editExpansionField(exp.candidateId, field, prev, next)
              }
              onRegenSection={(field, hint) =>
                regenSection(exp.candidateId, field, hint)
              }
              disabled={isRunning}
            />
          );
        })}
      </div>
    </div>
  );
}

function ShortlistSelector({
  candidates,
  shortlistIds,
  onSetShortlist,
  compact,
}: {
  candidates: DivergeCandidate[];
  shortlistIds: string[];
  onSetShortlist: (ids: string[]) => void;
  compact?: boolean;
}) {
  const [selection, setSelection] = useState<Set<string>>(
    new Set(shortlistIds),
  );

  const toggle = (id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 5) {
        next.add(id);
      }
      return next;
    });
  };

  const canApply = selection.size >= 2 && selection.size <= 5;

  return (
    <div className={`shortlist-selector ${compact ? 'compact' : ''}`}>
      {!compact && (
        <h4 className="panel-subheading">
          Select 2–5 candidates for expansion
        </h4>
      )}
      <div className="shortlist-candidates">
        {candidates.map((c) => (
          <label key={c.id} className="shortlist-option">
            <input
              type="checkbox"
              checked={selection.has(c.id)}
              onChange={() => toggle(c.id)}
            />
            <span className="shortlist-hook">{c.hook}</span>
            <span className="shortlist-id">{c.id.slice(0, 10)}</span>
          </label>
        ))}
      </div>
      <button
        className="action-btn shortlist-apply-btn"
        onClick={() => onSetShortlist([...selection])}
        disabled={!canApply}
      >
        Set Shortlist ({selection.size})
      </button>
    </div>
  );
}

function ExpansionPanel({
  expansion,
  candidate,
  editedFields,
  onFieldEdit,
  onRegenSection,
  disabled,
}: {
  expansion: ExpandExpansion;
  candidate: DivergeCandidate | null;
  editedFields: Set<string>;
  onFieldEdit: (field: string, prev: string, next: string) => void;
  onRegenSection: (field: string, hint?: string) => void;
  disabled: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [regenHints, setRegenHints] = useState<Record<string, string>>({});

  return (
    <div className="expansion-panel">
      <div className="expansion-panel-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="expansion-toggle">{collapsed ? '▸' : '▾'}</span>
        <span className="expansion-hook">
          {candidate?.hook ?? expansion.candidateId}
        </span>
        <span className="expansion-id">{expansion.candidateId.slice(0, 10)}</span>
      </div>
      {!collapsed && (
        <div className="expansion-panel-body">
          <EditableField
            label="Concept"
            field="concept"
            value={expansion.concept}
            isEdited={editedFields.has('concept')}
            onEdit={(prev, next) => onFieldEdit('concept', prev, next)}
            onRegen={(hint) => onRegenSection('concept', hint)}
            regenHint={regenHints['concept'] ?? ''}
            onHintChange={(h) =>
              setRegenHints((p) => ({ ...p, concept: h }))
            }
            disabled={disabled}
          />
          <EditableField
            label="Differentiator"
            field="differentiator"
            value={expansion.differentiator}
            isEdited={editedFields.has('differentiator')}
            onEdit={(prev, next) => onFieldEdit('differentiator', prev, next)}
            onRegen={(hint) => onRegenSection('differentiator', hint)}
            regenHint={regenHints['differentiator'] ?? ''}
            onHintChange={(h) =>
              setRegenHints((p) => ({ ...p, differentiator: h }))
            }
            disabled={disabled}
          />
          <div className="field">
            <label className="field-label">
              Scope
              {editedFields.has('scope') && (
                <span className="user-edit-badge">USER EDIT</span>
              )}
            </label>
            <div className="scope-fields">
              <div className="scope-field">
                <span className="scope-label">Tighten:</span>
                <span className="field-value">{expansion.scope.tighten}</span>
              </div>
              <div className="scope-field">
                <span className="scope-label">Loosen:</span>
                <span className="field-value">{expansion.scope.loosen}</span>
              </div>
            </div>
          </div>
          <div className="field">
            <div className="field-label-row">
              <label className="field-label">
                Risks
                {editedFields.has('risks') && (
                  <span className="user-edit-badge">USER EDIT</span>
                )}
              </label>
              <RegenButton
                field="risks"
                onRegen={(hint) => onRegenSection('risks', hint)}
                disabled={disabled || editedFields.has('risks')}
                hint={regenHints['risks'] ?? ''}
                onHintChange={(h) =>
                  setRegenHints((p) => ({ ...p, risks: h }))
                }
              />
            </div>
            <table className="output-table">
              <thead>
                <tr>
                  <th>Risk</th>
                  <th>Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {expansion.risks.map((r, i) => (
                  <tr key={i}>
                    <td>{r.risk}</td>
                    <td>{r.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <EditableField
            label="Plan: Day 1"
            field="planDay1"
            value={expansion.planDay1}
            isEdited={editedFields.has('planDay1')}
            onEdit={(prev, next) => onFieldEdit('planDay1', prev, next)}
            onRegen={(hint) => onRegenSection('planDay1', hint)}
            regenHint={regenHints['planDay1'] ?? ''}
            onHintChange={(h) =>
              setRegenHints((p) => ({ ...p, planDay1: h }))
            }
            disabled={disabled}
          />
          <EditableField
            label="Plan: Week 1"
            field="planWeek1"
            value={expansion.planWeek1}
            isEdited={editedFields.has('planWeek1')}
            onEdit={(prev, next) => onFieldEdit('planWeek1', prev, next)}
            onRegen={(hint) => onRegenSection('planWeek1', hint)}
            regenHint={regenHints['planWeek1'] ?? ''}
            onHintChange={(h) =>
              setRegenHints((p) => ({ ...p, planWeek1: h }))
            }
            disabled={disabled}
          />
          {expansion.culture && (
            <div className="expansion-culture-block">
              <label className="field-label">
                Cultural Anchoring
                <span className="culture-badge">CULTURE</span>
              </label>
              <div className="culture-detail">
                <span className="culture-label">Narrative Form:</span>
                <span>{expansion.culture.anchors.narrativeForm}</span>
              </div>
              <div className="culture-detail">
                <span className="culture-label">Material Practice:</span>
                <span>{expansion.culture.anchors.materialPractice}</span>
              </div>
              <div className="culture-detail">
                <span className="culture-label">Social Structure:</span>
                <span>{expansion.culture.anchors.socialStructure}</span>
              </div>
              <div className="culture-detail">
                <span className="culture-label">Respect Note:</span>
                <span>{expansion.culture.respectNote}</span>
              </div>
              <div className="culture-detail">
                <span className="culture-label">Research to Validate:</span>
                <span>{expansion.culture.researchToValidate}</span>
              </div>
              {expansion.culture.exoticismFlags && (
                <div className="exoticism-flag">{expansion.culture.exoticismFlags}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditableField({
  label,
  field,
  value,
  isEdited,
  onEdit,
  onRegen,
  regenHint,
  onHintChange,
  disabled,
}: {
  label: string;
  field: string;
  value: string;
  isEdited: boolean;
  onEdit: (prev: string, next: string) => void;
  onRegen: (hint?: string) => void;
  regenHint: string;
  onHintChange: (h: string) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    if (draft !== value) onEdit(value, draft);
    setEditing(false);
  };

  return (
    <div className="field">
      <div className="field-label-row">
        <label className="field-label">
          {label}
          {isEdited && <span className="user-edit-badge">USER EDIT</span>}
        </label>
        <RegenButton
          field={field}
          onRegen={onRegen}
          disabled={disabled || isEdited}
          hint={regenHint}
          onHintChange={onHintChange}
        />
      </div>
      {editing ? (
        <div className="editable-wrap">
          <textarea
            className="editable-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="editable-actions">
            <button className="action-btn small" onClick={save}>
              Save
            </button>
            <button
              className="action-btn small secondary"
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p
          className="field-value editable-value"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
          title="Click to edit"
        >
          {value}
        </p>
      )}
    </div>
  );
}

function RegenButton({
  field,
  onRegen,
  disabled,
  hint,
  onHintChange,
}: {
  field: string;
  onRegen: (hint?: string) => void;
  disabled: boolean;
  hint: string;
  onHintChange: (h: string) => void;
}) {
  const [showHint, setShowHint] = useState(false);

  if (!(REGENERABLE_FIELDS as readonly string[]).includes(field)) return null;

  return (
    <div className="regen-section-wrap">
      <button
        className="regen-section-btn"
        onClick={() => {
          if (showHint) {
            onRegen(hint || undefined);
            setShowHint(false);
          } else {
            setShowHint(true);
          }
        }}
        disabled={disabled}
        title={disabled ? 'Cannot regen user-edited field' : 'Regenerate this section'}
      >
        ↻ Regen
      </button>
      {showHint && (
        <div className="regen-hint-input">
          <input
            type="text"
            placeholder="Optional hint…"
            value={hint}
            onChange={(e) => onHintChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onRegen(hint || undefined);
                setShowHint(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
