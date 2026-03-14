"use client";

import React, { useState, useCallback, useEffect } from "react";
import { walterActions } from "../store";

const ENV_KEY_NAME = "GOOGLE_AI_API_KEY";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "testing" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("walter-gemini-key") || "";
    if (stored) setApiKey(stored);
  }, []);

  const handleSave = useCallback(() => {
    if (!apiKey.trim()) {
      setStatus("error");
      setMessage("Please enter an API key.");
      return;
    }
    localStorage.setItem("walter-gemini-key", apiKey.trim());
    setStatus("saved");
    setMessage("API key saved to local storage.");
    walterActions.addToast("Gemini API key saved", "success");
  }, [apiKey]);

  const handleRemove = useCallback(() => {
    localStorage.removeItem("walter-gemini-key");
    setApiKey("");
    setStatus("idle");
    setMessage("");
    walterActions.addToast("API key removed", "info");
  }, []);

  const handleTest = useCallback(async () => {
    setStatus("testing");
    setMessage("Testing connection...");
    try {
      const response = await fetch("/api/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Say hello in one word",
          temperature: 0.1,
          maxTokens: 10,
        }),
      });
      if (response.ok) {
        setStatus("saved");
        setMessage("Connection successful. Gemini is working.");
      } else {
        const err = await response.json();
        setStatus("error");
        setMessage(`Connection failed: ${err.error || response.statusText}`);
      }
    } catch (err) {
      setStatus("error");
      setMessage(`Connection failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, []);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="btn-sm" onClick={onClose}>Close</button>
        </div>

        <div className="settings-section">
          <h3>Gemini API Key</h3>
          <div className="settings-hint">
            Walter uses Google Gemini for AI features like story generation, beat breakdown,
            and ideation. The API key is configured via your <code>.env.local</code> file
            ({ENV_KEY_NAME}). You can also store a local override here for testing.
          </div>

          {apiKey && (
            <div className="settings-current-key">
              <span className="settings-key-label">Current:</span>
              <span className="settings-key-masked">
                {apiKey.slice(0, 6)}...{apiKey.slice(-4)}
              </span>
            </div>
          )}

          <div className="settings-key-input-row">
            <input
              className="settings-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter Gemini API key..."
            />
          </div>

          <div className="settings-actions">
            <button className="btn-sm" onClick={handleTest} disabled={status === "testing"}>
              {status === "testing" ? "Testing..." : "Test Connection"}
            </button>
            <button className="btn-sm btn-primary" onClick={handleSave}>
              Save
            </button>
            {apiKey && (
              <button className="btn-sm btn-danger" onClick={handleRemove}>
                Remove
              </button>
            )}
          </div>

          {message && (
            <div
              className={`settings-message ${
                status === "saved"
                  ? "settings-message-success"
                  : status === "error"
                  ? "settings-message-error"
                  : "settings-message-info"
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
