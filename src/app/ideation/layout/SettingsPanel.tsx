"use client";

import { useSession } from '@/lib/ideation/context/SessionContext';
import { getEffectiveSettings } from '@/lib/ideation/state/sessionSelectors';
import './SettingsPanel.css';

interface Props {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: Props) {
  const { session, updateSettings, exportArchive, sessionSizeBytes } = useSession();
  const settings = getEffectiveSettings(session);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Settings</h3>
          <button className="settings-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="settings-section">
          <h4>Provider</h4>
          <label className="settings-toggle">
            <select
              value={settings.providerMode}
              onChange={(e) =>
                updateSettings({
                  providerMode: e.target.value as 'mock' | 'real',
                })
              }
            >
              <option value="mock">Mock (deterministic)</option>
              <option value="real">Real (Gemini)</option>
            </select>
            <span className="settings-description">
              Real provider reads API key from environment variable only. Keys
              are never persisted in session data.
            </span>
          </label>
        </div>

        <div className="settings-section">
          <h4>Cross-Cultural Packs</h4>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={settings.crossCulturalEnabled}
              onChange={(e) =>
                updateSettings({ crossCulturalEnabled: e.target.checked })
              }
            />
            <span>Enable cultural anchoring</span>
          </label>
          <span className="settings-description">
            When enabled, Diverge and Expand stages will include cultural anchor
            fields (narrative form, material practice, social structure) and
            anti-exoticism checks.
          </span>

          {settings.crossCulturalEnabled && (
            <label className="settings-toggle indent">
              <input
                type="checkbox"
                checked={settings.proxyCultureMode}
                onChange={(e) =>
                  updateSettings({ proxyCultureMode: e.target.checked })
                }
              />
              <span>Proxy culture mode</span>
              <span className="settings-description">
                Uses fictional proxy framing instead of blocking on exoticism
                flags.
              </span>
            </label>
          )}
        </div>

        <div className="settings-section">
          <h4>Session</h4>
          <div className="settings-info">
            <span>Session ID: {session.id.slice(0, 16)}…</span>
            <span>Events: {session.events.length}</span>
            <span>Branch: {session.activeBranchId}</span>
            {sessionSizeBytes > 0 && (
              <span>Size: {(sessionSizeBytes / 1024).toFixed(0)} KB</span>
            )}
          </div>
          <button className="settings-archive-btn" onClick={exportArchive}>
            Export Session Archive…
          </button>
          <span className="settings-description">
            Saves a full copy of the current session as a JSON file via the
            system save dialog.
          </span>
        </div>
      </div>
    </div>
  );
}
