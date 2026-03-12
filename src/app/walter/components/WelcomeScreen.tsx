"use client";

import React, { useState } from "react";
import { useWalterStore } from "../store";
import { ARC_TEMPLATES } from "../arcTemplates";
import { Sparkles } from "lucide-react";

interface WelcomeProps {
  onOpenAIWriter?: () => void;
}

export function WelcomeScreen({ onOpenAIWriter }: WelcomeProps) {
  const { projects, actions } = useWalterStore();
  const [name, setName] = useState("");

  function handleCreate(arcId: string) {
    const projectName = name.trim() || "Untitled Storyboard";
    actions.createProject(projectName, arcId);
  }

  return (
    <div className="walter-welcome">
      <div className="walter-welcome-inner">
        <h2>Walter Storyboarding</h2>
        <p>
          Arc-guided short-form video storyboarding. Choose a narrative
          template to structure your shots, or start from a blank canvas.
        </p>

        {projects.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8, textAlign: "left" }}>
              Recent Projects
            </div>
            <div className="walter-project-list">
              {projects.slice().reverse().slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="walter-project-item"
                  onClick={() => actions.openProject(p.id)}
                >
                  <span className="walter-project-item-name">{p.name}</span>
                  <span className="walter-project-item-date">
                    {p.beats.length} beats &middot; {p.shots.length} shots
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ marginBottom: 14 }}>
          <input
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 13,
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text-primary)",
              outline: "none",
            }}
            placeholder="Project name (optional)..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate("three-act");
            }}
          />
        </div>

        {onOpenAIWriter && (
          <button
            className="aw-welcome-ai-btn"
            onClick={onOpenAIWriter}
          >
            <Sparkles size={16} />
            <div>
              <strong>Generate Episode with AI</strong>
              <span>Enter an idea and let Gemini build a full storyboard</span>
            </div>
          </button>
        )}

        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8, textAlign: "left" }}>
          Or Choose an Arc Template
        </div>
        <div className="walter-arc-grid">
          {ARC_TEMPLATES.map((arc) => (
            <div
              key={arc.id}
              className="walter-arc-card"
              onClick={() => handleCreate(arc.id)}
            >
              <h3>{arc.name}</h3>
              <p>{arc.description}</p>
              <div className="beat-count">
                {arc.beats.length === 0 ? "No beats" : `${arc.beats.length} beats`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
