"use client";

import { useCallback, useState } from 'react';
import { useEditor } from '../EditorContext';
import { loadMacros, saveCustomMacro, deleteCustomMacro } from '../engines/macroStore';
import type { EditorMacro } from '../types';

export default function MacrosPanel() {
  const ctx = useEditor();
  const [macros, setMacros] = useState<EditorMacro[]>(() => loadMacros());
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  const handleRun = useCallback(async (macro: EditorMacro) => {
    if (ctx.editBusy || !ctx.activeImage) return;
    await ctx.handlePromptEdit(macro.prompt);
  }, [ctx]);

  const handleAdd = useCallback(() => {
    if (!newName.trim() || !newPrompt.trim()) return;
    const macro = saveCustomMacro({ name: newName.trim(), prompt: newPrompt.trim() });
    setMacros((prev) => [...prev, macro]);
    setNewName('');
    setNewPrompt('');
    setShowAdd(false);
  }, [newName, newPrompt]);

  const handleDelete = useCallback((id: string) => {
    deleteCustomMacro(id);
    setMacros((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return (
    <div className="ps-macros-panel">
      <div className="ps-macros-list">
        {macros.map((macro) => (
          <div key={macro.id} className="ps-macro-item">
            <div className="ps-macro-info">
              <span className="ps-macro-name">{macro.name}</span>
              <span className="ps-macro-prompt">{macro.prompt.slice(0, 60)}...</span>
            </div>
            <button
              className="ps-macro-run"
              onClick={() => handleRun(macro)}
              disabled={ctx.editBusy || !ctx.activeImage}
              title={macro.prompt}
            >
              Run
            </button>
            {!macro.builtin && (
              <button className="ps-macro-delete" onClick={() => handleDelete(macro.id)} title="Delete macro">
                &times;
              </button>
            )}
          </div>
        ))}
      </div>
      {showAdd ? (
        <div className="ps-macro-add-form">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Macro name"
            className="ps-macro-input"
          />
          <textarea
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="Edit prompt..."
            className="ps-macro-textarea"
            rows={3}
          />
          <div className="ps-macro-add-actions">
            <button className="ps-macro-save" onClick={handleAdd} disabled={!newName.trim() || !newPrompt.trim()}>
              Save
            </button>
            <button className="ps-macro-cancel" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="ps-macro-add-btn" onClick={() => setShowAdd(true)}>+ New Macro</button>
      )}
    </div>
  );
}
