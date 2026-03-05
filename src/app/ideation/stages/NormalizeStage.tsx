"use client";

import { useState, useEffect } from 'react';
import type { NormalizeOutput } from '@/lib/ideation/engine/schemas';
import { deriveEffectiveNormalize } from '@/lib/ideation/engine/normalize';
import { useSession } from '@/lib/ideation/context/SessionContext';

export default function NormalizeStage({ output }: { output: unknown }) {
  const { session, editNormalizeSummary, editNormalizeAssumptions } =
    useSession();

  const effective = deriveEffectiveNormalize(session);
  const data = effective ?? (output as NormalizeOutput);

  const [localSummary, setLocalSummary] = useState(data.seedSummary);
  const [localAssumptions, setLocalAssumptions] = useState(
    data.assumptions.map((a) => ({ ...a })),
  );
  const [dirty, setDirty] = useState(false);

  const summaryKey = data.seedSummary;
  const assumptionsKey = JSON.stringify(data.assumptions);
  useEffect(() => {
    setLocalSummary(data.seedSummary);
    setLocalAssumptions(data.assumptions.map((a) => ({ ...a })));
    setDirty(false);
  }, [summaryKey, assumptionsKey]);

  const handleSaveEdits = () => {
    const summaryChanged = localSummary !== data.seedSummary;
    const assumptionChanges = localAssumptions
      .map((a, i) => ({
        key: a.key,
        previous: data.assumptions[i]?.value ?? '',
        next: a.value,
        userOverride: true,
      }))
      .filter((c) => c.previous !== c.next);

    if (summaryChanged) {
      editNormalizeSummary(localSummary, data.seedSummary);
    }
    if (assumptionChanges.length > 0) {
      editNormalizeAssumptions(assumptionChanges);
    }
    setDirty(false);
  };

  return (
    <div className="stage-card normalize-interactive">
      <div className="field">
        <label className="field-label">Summary</label>
        <textarea
          className="normalize-summary-edit"
          value={localSummary}
          onChange={(e) => {
            setLocalSummary(e.target.value);
            setDirty(true);
          }}
          rows={3}
        />
      </div>

      <div className="field">
        <label className="field-label">Assumption Ledger</label>
        <table className="output-table normalize-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th style={{ width: 70 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {localAssumptions.map((a, i) => (
              <tr key={a.key + i}>
                <td className="assumption-key">{a.key}</td>
                <td>
                  <input
                    type="text"
                    className="assumption-input"
                    value={a.value}
                    onChange={(e) => {
                      const updated = localAssumptions.map((x, j) =>
                        j === i
                          ? { ...x, value: e.target.value, userOverride: true }
                          : x,
                      );
                      setLocalAssumptions(updated);
                      setDirty(true);
                    }}
                  />
                </td>
                <td>
                  {a.userOverride && (
                    <span className="override-badge">Override</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dirty && (
        <button
          className="action-btn run-btn normalize-save-btn"
          onClick={handleSaveEdits}
        >
          Save Edits
        </button>
      )}

      {data.clarifyingQuestions.length > 0 && (
        <div className="field">
          <label className="field-label">Clarifying Questions</label>
          <ul className="field-list">
            {data.clarifyingQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
