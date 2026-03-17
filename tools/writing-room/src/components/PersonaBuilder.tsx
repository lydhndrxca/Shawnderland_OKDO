"use client";

import { useCallback, useState } from "react";
import type { AgentPersona, AgentRole, ModelTier } from "../types";
import { AGENT_ROLES, MODEL_TIER_OPTIONS } from "../types";
import {
  getAllPersonas, savePersona, deletePersona,
  researchPersona, enhancePersonaDescription, infusePersonality,
} from "../agents";

interface Props {
  onClose: () => void;
  onPersonaChange?: () => void;
}

export function PersonaBuilder({ onClose, onPersonaChange }: Props) {
  const [personas, setPersonas] = useState(() => getAllPersonas());
  const [editing, setEditing] = useState<AgentPersona | null>(null);
  const [researchName, setResearchName] = useState("");
  const [researching, setResearching] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [infusing, setInfusing] = useState(false);
  const [infuseName, setInfuseName] = useState("");
  const [showResearchData, setShowResearchData] = useState(false);

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

  const handleEnhance = useCallback(async () => {
    if (!editing || !editing.userDescription?.trim()) return;
    setEnhancing(true);
    try {
      const enhanced = await enhancePersonaDescription(
        editing.name,
        editing.userDescription,
        editing.quirks,
      );
      setEditing({ ...editing, researchData: enhanced });
    } finally {
      setEnhancing(false);
    }
  }, [editing]);

  const handleInfuse = useCallback(async () => {
    if (!editing || !infuseName.trim() || !editing.researchData) return;
    setInfusing(true);
    try {
      const infused = await infusePersonality(editing.researchData, infuseName.trim());
      setEditing({ ...editing, researchData: infused });
      setInfuseName("");
    } finally {
      setInfusing(false);
    }
  }, [editing, infuseName]);

  const handleSave = useCallback(() => {
    if (!editing) return;
    savePersona({ ...editing, isPreset: false });
    setEditing(null);
    setShowResearchData(false);
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

  const handleEdit = useCallback((p: AgentPersona) => {
    setEditing({ ...p });
    setShowResearchData(false);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }}>
      <div style={{
        background: "#1a1a2e", borderRadius: 12, padding: 24,
        width: 560, maxHeight: "85vh", overflowY: "auto",
        border: "1px solid #333",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: "#fff" }}>Persona Builder</h2>
          <button onClick={onClose} style={closeBtnStyle}>×</button>
        </div>

        {!editing ? (
          <>
            {/* Research */}
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

            {/* Create Blank */}
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
                    quirks: "",
                    userDescription: "",
                  })
                }
              >
                + Create Blank Persona
              </button>
            </div>

            {/* Persona List */}
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
                  {p.modelTier && p.modelTier !== "standard" && (
                    <span style={{ color: "#8b5cf6", marginLeft: 6, fontSize: 10 }}>
                      {p.modelTier}
                    </span>
                  )}
                </span>
                <button style={smallBtnStyle} onClick={() => handleEdit(p)}>Edit</button>
                {!p.isPreset && (
                  <button style={{ ...smallBtnStyle, color: "#f44" }} onClick={() => handleDelete(p.id)}>×</button>
                )}
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Name */}
            <label style={labelStyle}>Name</label>
            <input
              style={inputStyle}
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />

            {/* Avatar */}
            <label style={labelStyle}>Avatar (emoji)</label>
            <input
              style={{ ...inputStyle, width: 60 }}
              value={editing.avatar}
              onChange={(e) => setEditing({ ...editing, avatar: e.target.value })}
            />

            {/* Role */}
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

            {/* Thinking Mode */}
            <label style={labelStyle}>Thinking Mode</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {MODEL_TIER_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  style={{
                    ...smallBtnStyle,
                    background: (editing.modelTier ?? "standard") === t.id ? "rgba(99,102,241,0.2)" : "transparent",
                    borderColor: (editing.modelTier ?? "standard") === t.id ? "#6366f1" : "#444",
                    color: (editing.modelTier ?? "standard") === t.id ? "#fff" : "#aaa",
                  }}
                  onClick={() => setEditing({ ...editing, modelTier: t.id })}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#666", margin: "0 0 8px" }}>
              {MODEL_TIER_OPTIONS.find((t) => t.id === (editing.modelTier ?? "standard"))?.description}
            </p>

            {/* User Description */}
            <label style={labelStyle}>Your Description (optional)</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80 }}
              placeholder="Describe this persona in your own words..."
              value={editing.userDescription ?? ""}
              onChange={(e) => setEditing({ ...editing, userDescription: e.target.value })}
            />

            {/* Personality Quirks */}
            <label style={labelStyle}>Personality Quirks</label>
            <textarea
              style={{ ...inputStyle, minHeight: 60 }}
              placeholder="Anything specific that must come across — catchphrases, strong opinions, distinctive traits..."
              value={editing.quirks ?? ""}
              onChange={(e) => setEditing({ ...editing, quirks: e.target.value })}
            />

            {/* AI Enhance */}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                style={{ ...btnStyle, background: "#8b5cf6" }}
                onClick={handleEnhance}
                disabled={enhancing || !editing.userDescription?.trim()}
                title="Uses AI to expand your description into a full persona profile"
              >
                {enhancing ? "Enhancing..." : "Enhance with AI"}
              </button>
            </div>

            {/* Infuse Personality */}
            <label style={labelStyle}>Infuse Personality (optional)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={inputStyle}
                placeholder="e.g. David Attenborough, Snoop Dogg..."
                value={infuseName}
                onChange={(e) => setInfuseName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInfuse()}
              />
              <button
                style={btnStyle}
                onClick={handleInfuse}
                disabled={infusing || !infuseName.trim() || !editing.researchData}
              >
                {infusing ? "..." : "Infuse"}
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#666", margin: "4px 0 0" }}>
              Blend traits from a real person or character into this persona
            </p>

            {/* Persona Profile */}
            <label style={{ ...labelStyle, marginTop: 16 }}>
              Persona Profile
              <button
                style={{ ...smallBtnStyle, marginLeft: 8 }}
                onClick={() => setShowResearchData(!showResearchData)}
              >
                {showResearchData ? "Collapse" : "Show / Edit"}
              </button>
            </label>
            {showResearchData && (
              <textarea
                style={{ ...inputStyle, minHeight: 200, fontFamily: "monospace", fontSize: 11 }}
                value={editing.researchData}
                onChange={(e) => setEditing({ ...editing, researchData: e.target.value })}
              />
            )}
            {!showResearchData && editing.researchData && (
              <p style={{ fontSize: 11, color: "#555", margin: 0 }}>
                {editing.researchData.slice(0, 120)}...
              </p>
            )}

            {/* Save / Cancel */}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button style={btnStyle} onClick={handleSave} disabled={!editing.name.trim()}>
                Save Persona
              </button>
              <button
                style={{ ...btnStyle, background: "#333" }}
                onClick={() => { setEditing(null); setShowResearchData(false); }}
              >
                Cancel
              </button>
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
