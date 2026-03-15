"use client";

import { useCallback, useState } from "react";
import type { AgentRole, AgentPersona } from "../types";
import { AGENT_ROLES } from "../types";
import { getAllPersonas, researchPersona, savePersona, roleIcon } from "../agents";

interface Props {
  onClose: () => void;
  onAdd: (personaId: string) => void;
}

export function PersonaBuilder({ onClose, onAdd }: Props) {
  const [mode, setMode] = useState<"select" | "create">("select");
  const [selectedRole, setSelectedRole] = useState<AgentRole>("writer");
  const [referenceName, setReferenceName] = useState("");
  const [researching, setResearching] = useState(false);

  const personas = getAllPersonas();

  const handleResearch = useCallback(async () => {
    if (!referenceName.trim()) return;
    setResearching(true);
    try {
      const data = await researchPersona(selectedRole, referenceName.trim());
      const id = `custom-${Date.now()}`;
      const persona: AgentPersona = {
        id,
        role: selectedRole,
        name: referenceName.trim(),
        referenceName: referenceName.trim(),
        isPreset: false,
        researchData: data,
        avatar: roleIcon(selectedRole),
      };
      savePersona(persona);
      onAdd(id);
    } catch {
      alert("Research failed — check your API connection.");
    } finally {
      setResearching(false);
    }
  }, [selectedRole, referenceName, onAdd]);

  return (
    <div className="ws-overlay" onClick={onClose}>
      <div className="ws-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ws-modal-header">
          <h3>Add Agent to Room</h3>
          <button className="ws-btn ws-btn-ghost ws-btn-sm" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ws-modal-tabs">
          <button
            className={`ws-toggle-btn ${mode === "select" ? "ws-toggle-btn--active" : ""}`}
            onClick={() => setMode("select")}
          >
            Existing Personas
          </button>
          <button
            className={`ws-toggle-btn ${mode === "create" ? "ws-toggle-btn--active" : ""}`}
            onClick={() => setMode("create")}
          >
            Create New
          </button>
        </div>

        {mode === "select" && (
          <div className="ws-persona-list">
            {personas.map((p) => (
              <button
                key={p.id}
                className="ws-persona-card"
                onClick={() => onAdd(p.id)}
              >
                <span className="ws-persona-avatar">{p.avatar}</span>
                <div>
                  <strong>{p.name}</strong>
                  <span className="ws-persona-role">
                    {p.role}
                    {p.isPreset ? " (preset)" : " (custom)"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {mode === "create" && (
          <div className="ws-create-persona">
            <label className="ws-label">Role</label>
            <select
              className="ws-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as AgentRole)}
            >
              {AGENT_ROLES.filter((r) => r.id !== "producer").map((r) => (
                <option key={r.id} value={r.id}>
                  {r.icon} {r.label}
                </option>
              ))}
            </select>

            <label className="ws-label" style={{ marginTop: 12 }}>
              Creative Reference
            </label>
            <input
              className="ws-input"
              placeholder="e.g. Rod Serling, Wes Anderson, Roger Deakins"
              value={referenceName}
              onChange={(e) => setReferenceName(e.target.value)}
            />

            <button
              className="ws-btn ws-btn-primary"
              style={{ marginTop: 16, width: "100%" }}
              onClick={handleResearch}
              disabled={researching || !referenceName.trim()}
            >
              {researching ? "Researching..." : "Research & Build"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
