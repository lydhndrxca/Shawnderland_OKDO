"use client";

import { useState } from 'react';
import { useSession } from '@/lib/ideation/context/SessionContext';
import './AlwaysOnInputPanel.css';

export default function AlwaysOnInputPanel() {
  const { addUserInput } = useSession();
  const [text, setText] = useState('');

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addUserInput(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="input-panel">
      <label className="input-panel-label">Constraints / Instructions</label>
      <div className="input-panel-row">
        <textarea
          className="input-panel-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add constraints or instructions (Ctrl+Enter to submit)…"
          rows={2}
        />
        <button
          className="input-panel-add"
          onClick={handleAdd}
          disabled={!text.trim()}
        >
          Add
        </button>
      </div>
    </div>
  );
}
