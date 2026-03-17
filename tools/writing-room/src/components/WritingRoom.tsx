"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWritingStore } from "../store";
import type { ChatMessage, RoomPhase, ProducerProjectState } from "../types";
import {
  generateRoundTurn, selectRoundSpeaker,
  createUserMessage, createSystemMessage, createAgentMessage,
  isApprovalMessage, detectConvergence, generateSummary,
} from "../agentEngine";
import type { AgentTurnResult, ConvergenceResult } from "../agentEngine";
import { getPersona } from "../agents";
import { PersonaBuilder } from "./PersonaBuilder";
import { getRoundsForScope, getRoundByIndex, isLastRound } from "../creativeRounds";

const PHASE_LABELS: Record<RoomPhase, string> = {
  idle: "Not started",
  briefing: "Producer briefing",
  rounds: "Writing Room",
  approval: "Awaiting approval",
  pitch: "Producer pitching",
  revision: "Revisions",
  approved: "Approved — ready for export",
};

export function WritingRoom() {
  const { session, generating, autoRun, actions } = useWritingStore();
  const [userInput, setUserInput] = useState("");
  const [lockInput, setLockInput] = useState("");
  const [showPersonaBuilder, setShowPersonaBuilder] = useState(false);
  const [convergence, setConvergence] = useState<ConvergenceResult | null>(null);
  const [summaryText, setSummaryText] = useState("");
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoRunRef = useRef(false);
  const consecutiveErrors = useRef(0);
  autoRunRef.current = autoRun;

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [session?.chatHistory.length, scrollToBottom]);

  const activeRounds = useMemo(
    () => getRoundsForScope(session?.planning.scopeLength ?? "medium"),
    [session?.planning.scopeLength],
  );
  const roundState = session?.roundState;
  const currentRound = roundState ? getRoundByIndex(roundState.currentRoundIndex, activeRounds) : undefined;
  const isRoundsPhase = session?.roomPhase === "rounds";
  const isApproved = session?.roomPhase === "approved";

  /* ─── Run one agent turn ──────────────────────────── */
  const runTurn = useCallback(async () => {
    if (!session || generating) return;
    const { roomAgents, chatHistory, agentStates, projectState, producerBrief, roundState: rs } = session;
    if (roomAgents.length === 0) return;

    const phase = session.roomPhase;
    const round = currentRound;

    if (phase === "briefing" || phase === "rounds" || phase === "pitch" || phase === "revision") {
      actions.setGenerating(true);
      try {
        const lastSpeaker = chatHistory[chatHistory.length - 1]?.agentId ?? undefined;
        const agent = selectRoundSpeaker(roomAgents, agentStates, lastSpeaker ?? undefined);
        if (!agent) { actions.setGenerating(false); return; }

        actions.ensureAgentState(agent.personaId);

        if (!round && (phase === "briefing" || phase === "rounds")) {
          actions.setGenerating(false);
          return;
        }

        const result: AgentTurnResult = await generateRoundTurn(
          agent,
          roomAgents,
          chatHistory,
          round ?? activeRounds[0],
          agentStates,
          projectState,
          producerBrief,
          rs?.lockedDecisions ?? [],
          rs?.turnsInRound ?? 0,
        );

        const msg = createAgentMessage(agent.personaId, result.text);
        actions.addChatMessage(msg);
        actions.bumpTurnsSinceSpoke(agent.personaId);
        actions.incrementRoundTurns();
        consecutiveErrors.current = 0;

        if (result.agentStatePatch) {
          actions.updateAgentState(agent.personaId, result.agentStatePatch);
        }

        if (result.projectStatePatch) {
          actions.updateProjectState(result.projectStatePatch);
        }

        if (phase === "briefing" && (rs?.turnsInRound ?? 0) >= 2) {
          actions.setRoomPhase("rounds");
          actions.addChatMessage(createSystemMessage("Briefing complete. Entering creative rounds."));
        }

        if (isApprovalMessage(result.text) && phase !== "briefing") {
          const p = getPersona(agent.personaId);
          if (p?.role === "producer") {
            actions.setAgentApproval(agent.personaId, true);
          }
        }
      } catch (err) {
        consecutiveErrors.current++;
        actions.addToast("Agent error: " + (err instanceof Error ? err.message : "unknown"), "error");
        if (consecutiveErrors.current >= 3) {
          actions.setAutoRun(false);
          actions.addToast("Too many errors — auto-run paused", "warning");
        }
      } finally {
        actions.setGenerating(false);
      }
    }
  }, [session, generating, actions, currentRound, activeRounds]);

  /* ─── Auto-run loop ──────────────────────────────── */
  useEffect(() => {
    if (!autoRun || generating) return;
    if (session?.roomPhase === "approved" || session?.roomPhase === "idle") {
      actions.setAutoRun(false);
      return;
    }
    const timer = setTimeout(runTurn, 800);
    return () => clearTimeout(timer);
  }, [autoRun, generating, session?.chatHistory.length, session?.roomPhase, runTurn, actions]);

  /* ─── Lock a decision ─────────────────────────────── */
  const doLock = useCallback(
    (value: string) => {
      if (!value.trim() || !currentRound || !session) return;
      actions.lockDecision(currentRound.id, currentRound.label, value.trim(), "user");
      actions.addChatMessage(
        createSystemMessage(`Decision locked for "${currentRound.label}": ${value.trim()}`),
      );
    },
    [actions, currentRound, session],
  );

  const handleLockDecision = useCallback(() => {
    doLock(lockInput);
    setLockInput("");
  }, [doLock, lockInput]);

  /* ─── Skip to next round ──────────────────────────── */
  const handleSkipRound = useCallback(() => {
    if (!currentRound || !session) return;
    const rIdx = session.roundState.currentRoundIndex;
    if (isLastRound(rIdx, activeRounds)) {
      actions.setRoomPhase("approval");
      actions.addChatMessage(createSystemMessage("All rounds complete. Awaiting final approval."));
    } else {
      actions.advanceRound();
      const next = getRoundByIndex(rIdx + 1, activeRounds);
      if (next) {
        actions.addChatMessage(createSystemMessage(`Moving to next round: ${next.label} — "${next.question}"`));
      }
    }
  }, [actions, currentRound, session, activeRounds]);

  /* ─── User sends message ─────────────────────────── */
  const handleUserSend = useCallback(() => {
    if (!userInput.trim() || !session) return;
    actions.addChatMessage(createUserMessage(userInput.trim()));
    setUserInput("");
  }, [userInput, session, actions]);

  /* ─── User approves ─────────────────────────────── */
  const handleUserApprove = useCallback(() => {
    if (!session) return;
    actions.setUserApproved(true);
    actions.setRoomPhase("approved");
    actions.addChatMessage(createSystemMessage("Project approved by creator. Ready for export."));
    actions.addToast("Project approved!", "success");
  }, [session, actions]);

  /* ─── Summary ──────────────────────────────────── */
  const handleGenerateSummary = useCallback(async () => {
    if (!session || generatingSummary) return;
    setGeneratingSummary(true);
    try {
      const summary = await generateSummary(
        session.chatHistory,
        session.roundState.lockedDecisions,
        session.projectState,
      );
      setSummaryText(summary);
      actions.addToast("Summary generated", "success");
    } catch (e) {
      actions.addToast("Summary failed: " + (e instanceof Error ? e.message : "unknown"), "error");
    } finally {
      setGeneratingSummary(false);
    }
  }, [session, generatingSummary, actions]);

  /* ─── Export Transcript ────────────────────────────── */
  const handleExportTranscript = useCallback(() => {
    if (!session) return;
    const lines = session.chatHistory.map((m) => {
      const time = new Date(m.timestamp).toLocaleTimeString();
      return `[${time}] ${m.agentName} (${m.agentRole}): ${m.content}`;
    });
    const text = `# Writing Room Transcript\n# Project: ${session.name}\n# ${new Date().toLocaleDateString()}\n\n${lines.join("\n\n")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.name}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
    actions.addToast("Transcript exported", "success");
  }, [session, actions]);

  if (!session) return null;

  const phase = session.roomPhase;
  const lockedDecisions = session.roundState?.lockedDecisions ?? [];
  const chatHistory = session.chatHistory;

  return (
    <div className="wr-writing">
      {showPersonaBuilder && (
        <PersonaBuilder onClose={() => setShowPersonaBuilder(false)} />
      )}

      {/* Sidebar */}
      <aside className="wr-writing-sidebar">
        <div className="wr-sidebar-section">
          <h3>Status</h3>
          <div className="wr-phase-badge">{PHASE_LABELS[phase]}</div>
          {currentRound && isRoundsPhase && (
            <div className="wr-round-info">
              <strong>Round:</strong> {currentRound.label}
              <p className="wr-round-question">{currentRound.question}</p>
            </div>
          )}
        </div>

        <div className="wr-sidebar-section">
          <h3>Room</h3>
          {session.roomAgents.map((a) => {
            const p = getPersona(a.personaId);
            return (
              <div key={a.personaId} className="wr-agent-badge">
                <span>{p?.avatar ?? "?"}</span>
                <span>{p?.name ?? a.personaId}</span>
              </div>
            );
          })}
          <button
            className="wr-btn wr-btn-ghost wr-btn-sm"
            onClick={() => setShowPersonaBuilder(true)}
            style={{ marginTop: 8 }}
          >
            Manage Personas
          </button>
        </div>

        {lockedDecisions.length > 0 && (
          <div className="wr-sidebar-section">
            <h3>Decisions</h3>
            {lockedDecisions.map((d, i) => (
              <div key={i} className="wr-decision-item">
                <strong>{d.label}</strong>
                <p>{d.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="wr-sidebar-section" style={{ marginTop: "auto" }}>
          <button
            className="wr-btn wr-btn-secondary wr-btn-sm"
            onClick={handleGenerateSummary}
            disabled={generatingSummary || chatHistory.length === 0}
            style={{ width: "100%", marginBottom: 6 }}
          >
            {generatingSummary ? "Generating..." : "Generate Summary"}
          </button>
          <button
            className="wr-btn wr-btn-ghost wr-btn-sm"
            onClick={handleExportTranscript}
            disabled={chatHistory.length === 0}
            style={{ width: "100%" }}
          >
            Export Transcript
          </button>
        </div>
      </aside>

      {/* Chat area */}
      <div className="wr-chat-area">
        <div className="wr-chat-messages">
          {chatHistory.map((msg) => (
            <div key={msg.id} className={`wr-chat-msg wr-chat-msg--${msg.sender}`}>
              <div className="wr-chat-msg-header">
                <span className="wr-chat-avatar">{msg.agentAvatar}</span>
                <strong>{msg.agentName}</strong>
                <span className="wr-chat-role">{msg.agentRole}</span>
                <span className="wr-chat-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="wr-chat-msg-body">{msg.content}</div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Summary overlay */}
        {summaryText && (
          <div className="wr-summary-overlay">
            <div className="wr-summary-header">
              <h3>Session Summary</h3>
              <button onClick={() => setSummaryText("")} className="wr-btn wr-btn-ghost wr-btn-sm">×</button>
            </div>
            <div className="wr-summary-content">
              {summaryText.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
            <button
              className="wr-btn wr-btn-secondary wr-btn-sm"
              onClick={() => {
                navigator.clipboard.writeText(summaryText);
                actions.addToast("Summary copied to clipboard", "success");
              }}
            >
              Copy to Clipboard
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="wr-chat-controls">
          {isRoundsPhase && currentRound && (
            <div className="wr-lock-row">
              <input
                className="wr-input"
                placeholder={`Lock decision for "${currentRound.label}"...`}
                value={lockInput}
                onChange={(e) => setLockInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLockDecision()}
              />
              <button className="wr-btn wr-btn-secondary wr-btn-sm" onClick={handleLockDecision}>
                Lock
              </button>
              <button className="wr-btn wr-btn-ghost wr-btn-sm" onClick={handleSkipRound}>
                Skip Round →
              </button>
            </div>
          )}

          <div className="wr-input-row">
            <input
              className="wr-input"
              placeholder="Say something to the room..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUserSend()}
              disabled={phase === "idle"}
            />
            <button
              className="wr-btn wr-btn-primary wr-btn-sm"
              onClick={handleUserSend}
              disabled={!userInput.trim() || phase === "idle"}
            >
              Send
            </button>
          </div>

          <div className="wr-action-row">
            <button
              className="wr-btn wr-btn-primary"
              onClick={runTurn}
              disabled={generating || phase === "idle" || phase === "approved"}
            >
              {generating ? "Thinking..." : "Next Turn"}
            </button>
            <button
              className={`wr-btn ${autoRun ? "wr-btn-danger" : "wr-btn-accent"}`}
              onClick={() => actions.setAutoRun(!autoRun)}
              disabled={phase === "idle" || phase === "approved"}
            >
              {autoRun ? "Stop Auto-Run" : "Auto-Run"}
            </button>
            {(phase === "approval" || isApproved) && (
              <button
                className="wr-btn wr-btn-success"
                onClick={handleUserApprove}
                disabled={isApproved}
              >
                {isApproved ? "Approved ✓" : "Approve & Finish"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
