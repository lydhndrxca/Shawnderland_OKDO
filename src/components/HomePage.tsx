"use client";

import { useCallback, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { TOOLS } from '@/lib/registry';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { useStyleStore } from '@/lib/styles/useStyleStore';
import './Home.css';

const TOOL_ICONS: Record<string, string> = {
  'sprite-lab': '\u{1F3A8}',
  ideation: '\u{1F9E0}',
  'ui-lab': '\u{1F5BC}',
  'concept-lab': '\u{1F4A1}',
  'gemini-studio': '\u2728',
  'tool-editor': '\u{1F527}',
  walter: '\u{1F3AC}',
};

const HOWTO_STEPS = [
  { title: 'Pick a tool', body: 'Click any tool card below to jump straight into it. Each app opens in its own tab.' },
  { title: 'Use nodes', body: 'Most apps use the same node-based canvas. Drag nodes from the dock, connect them, and run pipelines.' },
  { title: 'Save styles', body: 'Create styles in the Style Store below. Every app can reference them so your look stays consistent.' },
  { title: 'Export anything', body: 'Right-click generated images to save, copy, or export. Use the global toolbar for bulk actions.' },
];

export default function HomePage() {
  const { navigate } = useWorkspace();
  const { styles, add, remove, importStyles, exportStyles } = useStyleStore();
  const importRef = useRef<HTMLInputElement>(null);

  const [newStyleOpen, setNewStyleOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newGuidance, setNewGuidance] = useState('');
  const [newTags, setNewTags] = useState('');

  const handleToolClick = useCallback((href: string) => {
    navigate(href);
  }, [navigate]);

  const handleAddStyle = useCallback(() => {
    if (!newName.trim()) return;
    add({
      name: newName.trim(),
      description: newDesc.trim(),
      guidance: newGuidance.trim(),
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
    });
    setNewName('');
    setNewDesc('');
    setNewGuidance('');
    setNewTags('');
    setNewStyleOpen(false);
  }, [newName, newDesc, newGuidance, newTags, add]);

  const handleExport = useCallback(() => {
    const json = exportStyles();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shawnderland-styles.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [exportStyles]);

  const handleImport = useCallback(() => {
    importRef.current?.click();
  }, []);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const count = importStyles(reader.result as string);
      if (count === 0) alert('No new styles imported (duplicates or invalid format).');
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [importStyles]);

  return (
    <div className="home-shell">
      {/* Hero */}
      <div className="home-hero">
        <div className="home-hero-icon">
          <Sparkles size={22} color="var(--accent, #6c63ff)" />
        </div>
        <h1>Shawnderland</h1>
        <p>Your creative AI workspace. Every tool below shares the same node system, style store, and design tokens — so ideas flow freely between them.</p>
      </div>

      <div className="home-content">
        {/* How To */}
        <div className="home-section">
          <div className="home-section-title">Getting Started</div>
          <div className="home-howto">
            {HOWTO_STEPS.map((step, i) => (
              <div key={i} className="home-howto-step">
                <div className="home-howto-num">{i + 1}</div>
                <h4>{step.title}</h4>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="home-section">
          <div className="home-section-title">Tools</div>
          <div className="home-tools-grid">
            {TOOLS.filter((t) => !t.hidden).map((tool) => (
              <div
                key={tool.id}
                className="home-tool-card"
                onClick={() => handleToolClick(tool.href)}
              >
                <div
                  className="home-tool-accent"
                  style={{ background: tool.accentDim || 'rgba(108,99,255,0.12)' }}
                >
                  {TOOL_ICONS[tool.id] || '\u2699'}
                </div>
                <div className="home-tool-info">
                  <div className="home-tool-name">{tool.name}</div>
                  <div className="home-tool-tagline">{tool.tagline}</div>
                  <div className="home-tool-desc">{tool.description}</div>
                  <div className="home-tool-features">
                    {tool.features.map((f) => (
                      <span key={f} className="home-tool-feature">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Style Store */}
        <div className="home-section">
          <div className="home-section-title">Style Store</div>
          <div className="home-styles-area">
            <div className="home-styles-header">
              <h4>Saved Styles ({styles.length})</h4>
              <div className="home-styles-actions">
                <button className="home-styles-btn" onClick={() => setNewStyleOpen((v) => !v)}>
                  + New Style
                </button>
                {styles.length > 0 && (
                  <button className="home-styles-btn" onClick={handleExport}>Export</button>
                )}
                <button className="home-styles-btn" onClick={handleImport}>Import</button>
                <input
                  ref={importRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleImportFile}
                />
              </div>
            </div>

            {newStyleOpen && (
              <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  placeholder="Style name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 12 }}
                />
                <input
                  placeholder="Short description"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 12 }}
                />
                <textarea
                  placeholder="Style guidance (prompts, directions, references...)"
                  value={newGuidance}
                  onChange={(e) => setNewGuidance(e.target.value)}
                  rows={3}
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 12, resize: 'vertical' }}
                />
                <input
                  placeholder="Tags (comma-separated)"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 12 }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="home-styles-btn" onClick={handleAddStyle} style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}>Save Style</button>
                  <button className="home-styles-btn" onClick={() => setNewStyleOpen(false)}>Cancel</button>
                </div>
              </div>
            )}

            {styles.length === 0 ? (
              <div className="home-styles-empty">
                No saved styles yet. Create a style to share it across all your tools.
              </div>
            ) : (
              <div className="home-styles-list">
                {styles.map((s) => (
                  <div key={s.id} className="home-style-chip">
                    <div className="home-style-chip-name">{s.name}</div>
                    {s.description && <div className="home-style-chip-desc">{s.description}</div>}
                    {s.tags.length > 0 && (
                      <div className="home-style-chip-tags">
                        {s.tags.map((t) => <span key={t} className="home-style-chip-tag">{t}</span>)}
                      </div>
                    )}
                    <div className="home-style-chip-actions">
                      <button className="delete" onClick={() => remove(s.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
