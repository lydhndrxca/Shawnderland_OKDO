"use client";

import { useCallback, useState } from "react";
import type { AgentPersona, AgentRole } from "../types";
import { AGENT_ROLES } from "../types";
import { getAllPersonas, savePersona, deletePersona, researchPersona } from "../agents";

interface Props {
  onClose: () => void;
  onPersonaChange?: () => void;
}

export function PersonaBuilder({ onClose, onPersonaChange }: Props) {
  const [personas, setPersonas] = useState(() => getAllPersonas());
  const [editing, setEditing] = useState<AgentPersona | null>(null);
  const [researchName, setResearchName] = useState("");
  const [researching, setResearching] = useState(false);

  const refresh = useCallback(() => {
    setPersonas(getAllPersonas());
    onPersonaChange?.();
  }, [onPersonaChange]);

  const handleResearch = useCallback(async () => {
    if (!researchName.trim()) return;
    setResearching(true);
    try {
      const data = await researchPersona(researchName.trim());
      setEditing({
        id: `custom-${Date.now()}`,
        role: "writer",
        name: researchName.trim(),
        referenceName: researchName.trim(),
        isPreset: false,
        researchData: data,
        avatar: "🎭",
      });
    } finally {
      setResearching(false);
    }
  }, [researchName]);

  const handleSave = useCallback(() => {
    if (!editing) return;
    savePersona(editing);
    setEditing(null);
    refresh();
  }, [editing, refresh]);

  const handleDelete = useCallback(
    (id: string) => {
      if (!confirm("Delete this persona?")) return;
      deletePersona(id);
      refresh();
    },
    [refresh],
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "#1a1a2e", borderRadius: 12, padding: 24,
        width: 520, maxHeight: "80vh", overflowY: "auto",
        border: "1px solid #333",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: "#fff" }}>Persona Builder</h2>
          <button onClick={onClose} style={closeBtnStyle}>×</button>
        </div>

        {!editing ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Research a person or archetype</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={inputStyle}
                  placeholder="e.g. Aaron Sorkin, Devil's Advocate, etc."
                  value={researchName}
                  onChange={(e) => setResearchName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleResearch()}
                />
                <button
                  style={btnStyle}
                  onClick={handleResearch}
                  disabled={researching || !researchName.trim()}
                >
                  {researching ? "..." : "Research"}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <button
                style={btnStyle}
                onClick={() =>
                  setEditing({
                    id: `custom-${Date.now()}`,
                    role: "writer",
                    name: "",
                    referenceName: "",
                    isPreset: false,
                    researchData: "",
                    avatar: "🎭",
                  })
                }
              >
                + Create Blank Persona
              </button>
            </div>

            <h3 style={{ color: "#aaa", fontSize: 13, marginBottom: 8 }}>All Personas</h3>
            {personas.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 0", borderBottom: "1px solid #222",
                }}
              >
                <span>{p.avatar}</span>
                <span style={{ flex: 1, color: "#ddd", fontSize: 13 }}>
                  {p.name}
                  <span style={{ color: "#666", marginLeft: 6 }}>({p.role})</span>
                  {p.isPreset && <span style={{ color: "#555", marginLeft: 6 }}>preset</span>}
                </span>
                {!p.isPreset && (
                  <>
                    <button style={smallBtnStyle} onClick={() => setEditing({ ...p })}>Edit</button>
                    <button style={{ ...smallBtnStyle, color: "#f44" }} onClick={() => handleDelete(p.id)}>×</button>
                  </>
                )}
              </div>
            ))}
          </>
        ) : (
          <>
            <label style={labelStyle}>Name</label>
            <input
              style={inputStyle}
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />

            <label style={labelStyle}>Avatar (emoji)</label>
            <input
              style={{ ...inputStyle, width: 60 }}
              value={editing.avatar}
              onChange={(e) => setEditing({ ...editing, avatar: e.target.value })}
            />

            <label style={labelStyle}>Role</label>
            <select
              style={inputStyle}
              value={editing.role}
              onChange={(e) => setEditing({ ...editing, role: e.target.value as AgentRole })}
            >
              {AGENT_ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>

            <label style={labelStyle}>Persona Description</label>
            <textarea
              style={{ ...inputStyle, minHeight: 160 }}
              value={editing.researchData}
              onChange={(e) => setEditing({ ...editing, researchData: e.target.value })}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button style={btnStyle} onClick={handleSave}>Save</button>
              <button style={{ ...btnStyle, background: "#333" }} onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", color: "#999", fontSize: 12, marginTop: 12, marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  width: "100%", background: "#0d0d1a", border: "1px solid #333",
  borderRadius: 6, padding: "8px 10px", color: "#ddd", fontSize: 13,
};
const btnStyle: React.CSSProperties = {
  background: "#6366f1", color: "#fff", border: "none", borderRadius: 6,
  padding: "8px 16px", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap",
};
const smallBtnStyle: React.CSSProperties = {
  background: "transparent", border: "1px solid #444", borderRadius: 4,
  padding: "2px 8px", color: "#aaa", cursor: "pointer", fontSize: 12,
};
const closeBtnStyle: React.CSSProperties = {
  background: "transparent", border: "none", color: "#888",
  fontSize: 20, cursor: "pointer",
};
