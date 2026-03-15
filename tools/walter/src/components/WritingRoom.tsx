"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWalterStore } from "../store";
import type { ChatMessage, RoomPhase, RoomAgent, ProducerEpisodeState } from "../types";
import {
  generateAgentTurn, generateRoundTurn, selectNextSpeaker,
  selectRoundSpeaker, createUserMessage,
  createSystemMessage, createAgentMessage, isApprovalMessage,
  parseStoryStructure,
} from "../agentEngine";
import type { AgentTurnResult } from "../agentEngine";
import { getAllPersonas, getPersona, roleIcon } from "../agents";
import { getSerlingStats, isSerlingDataLoaded } from "@shawnderland/serling";
import { PersonaBuilder } from "./PersonaBuilder";
import { getRoundsForFormat, getRoundByIndex, isLastRound } from "../creativeRounds";

const PHASE_LABELS: Record<RoomPhase, string> = {
  idle: "Not started",
  briefing: "Producer briefing",
  rounds: "Writing Room",
  approval: "Awaiting approval",
  pitch: "Producer pitching",
  revision: "Revisions",
  approved: "Approved — ready for staging",
};

export function WritingRoom() {
  const { session, generating, autoRun, actions } = useWalterStore();
  const [userInput, setUserInput] = useState("");
  const [lockInput, setLockInput] = useState("");
  const [showPersonaBuilder, setShowPersonaBuilder] = useState(false);
  const [voiceRefinement, setVoiceRefinement] = useState(false);
  const [lastSerlingCtx, setLastSerlingCtx] = useState<AgentTurnResult["serlingContext"]>();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const autoRunRef = useRef(false);
  autoRunRef.current = autoRun;

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [session?.chatHistory.length, scrollToBottom]);

  const activeRounds = useMemo(
    () => getRoundsForFormat(session?.planning.episodeLength ?? "standard-reel"),
    [session?.planning.episodeLength],
  );
  const roundState = session?.roundState;
  const currentRound = roundState ? getRoundByIndex(roundState.currentRoundIndex, activeRounds) : undefined;
  const isRoundsPhase = session?.roomPhase === "rounds";
  const isPitch = session?.roomPhase === "pitch";
  const isApproved = session?.roomPhase === "approved";

  /* ─── Run one agent turn (round-aware) ────────────── */
  const runTurn = useCallback(async () => {
    if (!session || generating) return;
    const { roomAgents, chatHistory, roomPhase, producerBrief } = session;
    const runRs = session.roundState ?? { currentRoundIndex: 0, turnsInRound: 0, lockedDecisions: [] };

    if (roomPhase === "idle" || roomPhase === "approved") return;

    if (roomPhase === "rounds" && currentRound) {
      if (runRs.turnsInRound >= currentRound.maxTurns) {
        actions.setAutoRun(false);
        actions.addChatMessage(
          createSystemMessage(`Round limit reached (${currentRound.maxTurns} turns). Lock a decision to advance.`),
        );
        return;
      }

      const speakerId = selectRoundSpeaker(roomAgents, chatHistory, currentRound);
      if (!speakerId) return;

      actions.setGenerating(true);
      try {
        const result = await generateRoundTurn(
          speakerId, chatHistory, producerBrief ?? "",
          currentRound, runRs.lockedDecisions,
          { voiceRefinement, episodeState: session.episodeState },
        );
        if (result.serlingContext) setLastSerlingCtx(result.serlingContext);
        if (result.episodeStatePatch) actions.updateEpisodeState(result.episodeStatePatch);

        const msg = createAgentMessage(speakerId, result.text);
        actions.addChatMessage(msg);
        actions.incrementRoundTurns();

        if (runRs.turnsInRound + 1 >= currentRound.maxTurns) {
          actions.setAutoRun(false);
          actions.addChatMessage(
            createSystemMessage(`Round limit reached. Lock a decision for "${currentRound.locksField}" to advance.`),
          );
        }
      } catch (e) {
        actions.addChatMessage(
          createSystemMessage(`Error: ${e instanceof Error ? e.message : "Unknown error"}`),
        );
      } finally {
        actions.setGenerating(false);
      }
      return;
    }

    // Legacy phases: briefing, approval, pitch, revision
    const speakerId = selectNextSpeaker(roomAgents, chatHistory, roomPhase);
    if (!speakerId) return;

    actions.setGenerating(true);
    try {
      const result = await generateAgentTurn(
        speakerId, chatHistory, roomPhase, producerBrief ?? "",
        { voiceRefinement, episodeState: session.episodeState },
      );
      if (result.serlingContext) setLastSerlingCtx(result.serlingContext);
      if (result.episodeStatePatch) actions.updateEpisodeState(result.episodeStatePatch);

      const approval = isApprovalMessage(result.text);
      const msg = createAgentMessage(speakerId, result.text, { isApproval: approval });
      actions.addChatMessage(msg);

      if (approval) actions.setAgentApproval(speakerId, true);
      advancePhaseIfNeeded(roomAgents, [...chatHistory, msg], roomPhase, approval);
    } catch (e) {
      actions.addChatMessage(
        createSystemMessage(`Error: ${e instanceof Error ? e.message : "Unknown error"}`),
      );
    } finally {
      actions.setGenerating(false);
    }
  }, [session, generating, actions, voiceRefinement, currentRound]);

  /* ─── Auto-run loop ──────────────────────────────── */
  useEffect(() => {
    if (!autoRun || generating) return;
    if (!session || session.roomPhase === "idle" || session.roomPhase === "approved" || session.roomPhase === "pitch") return;

    const timer = setTimeout(() => {
      if (autoRunRef.current) runTurn();
    }, 1500);
    return () => clearTimeout(timer);
  }, [autoRun, generating, session?.chatHistory.length, session?.roomPhase, runTurn]);

  /* ─── Phase advancement (for non-round phases) ───── */
  const advancePhaseIfNeeded = useCallback(
    (agents: RoomAgent[], history: ChatMessage[], phase: RoomPhase, justApproved: boolean) => {
      if (phase === "briefing") {
        actions.setRoomPhase("rounds");
        const firstRound = getRoundByIndex(0, activeRounds);
        if (firstRound) {
          actions.addChatMessage(
            createSystemMessage(`Round 1 — ${firstRound.label}: ${firstRound.question}`),
          );
        }
        return;
      }

      if (phase === "approval" && justApproved) {
        const allApproved = agents.every((a) => {
          if (a.personaId === agents.find((ag) => getPersona(ag.personaId)?.role === "producer")?.personaId) return true;
          return a.approved || history.some((m) => m.agentId === a.personaId && m.isApproval);
        });
        if (allApproved) {
          actions.setRoomPhase("pitch");
          actions.addChatMessage(
            createSystemMessage("All agents have approved. Producer is preparing the pitch..."),
          );
          actions.setAutoRun(false);
        }
      }
    },
    [actions, activeRounds],
  );

  /* ─── Lock a decision ─────────────────────────────── */
  const handleLockDecision = useCallback(() => {
    if (!session || !currentRound || !lockInput.trim()) return;

    actions.lockDecision(
      currentRound.id,
      currentRound.locksField,
      lockInput.trim(),
      "user",
    );
    actions.addChatMessage(
      createSystemMessage(`✓ LOCKED — ${currentRound.locksField}: ${lockInput.trim()}`),
    );

    const lockRs = session.roundState ?? { currentRoundIndex: 0, turnsInRound: 0, lockedDecisions: [] };
    const nextIndex = lockRs.currentRoundIndex + 1;
    if (isLastRound(lockRs.currentRoundIndex, activeRounds)) {
      actions.advanceRound();
      actions.setRoomPhase("approval");
      actions.addChatMessage(
        createSystemMessage("All rounds complete. Agents — review the decisions board and approve the episode."),
      );
    } else {
      actions.advanceRound();
      const nextRound = getRoundByIndex(nextIndex, activeRounds);
      if (nextRound) {
        actions.addChatMessage(
          createSystemMessage(`Round ${nextIndex + 1} — ${nextRound.label}: ${nextRound.question}`),
        );
      }
    }
    setLockInput("");
  }, [session, currentRound, lockInput, actions, activeRounds]);

  /* ─── Skip to next round ──────────────────────────── */
  const handleSkipRound = useCallback(() => {
    if (!session || !currentRound) return;
    const skipRs = session.roundState ?? { currentRoundIndex: 0, turnsInRound: 0, lockedDecisions: [] };
    const nextIndex = skipRs.currentRoundIndex + 1;
    if (isLastRound(skipRs.currentRoundIndex, activeRounds)) {
      actions.setRoomPhase("approval");
      actions.addChatMessage(createSystemMessage("Skipped to approval."));
    } else {
      actions.advanceRound();
      const nextRound = getRoundByIndex(nextIndex, activeRounds);
      if (nextRound) {
        actions.addChatMessage(
          createSystemMessage(`Round ${nextIndex + 1} — ${nextRound.label}: ${nextRound.question}`),
        );
      }
    }
  }, [session, currentRound, actions, activeRounds]);

  /* ─── User sends message ─────────────────────────── */
  const handleUserSend = useCallback(() => {
    if (!userInput.trim() || !session) return;
    actions.addChatMessage(createUserMessage(userInput.trim()));
    setUserInput("");
  }, [userInput, session, actions]);

  /* ─── User approves ─────────────────────────────── */
  const handleUserApprove = useCallback(async () => {
    if (!session) return;
    actions.setUserApproved(true);
    actions.setRoomPhase("approved");
    actions.addChatMessage(
      createSystemMessage("Creator has approved the episode! Parsing story structure for staging..."),
    );

    actions.setGenerating(true);
    try {
      const result = await parseStoryStructure(
        session.chatHistory,
        session.producerBrief ?? "",
        session.planning,
        (session.roundState ?? { lockedDecisions: [] }).lockedDecisions,
      );
      actions.setStoryStructure(result.arc, result.elements, result.shots);
      actions.setScreen("staging");
      actions.addToast("Episode approved — staging room populated", "success");
    } catch (e) {
      actions.addToast(
        "Failed to parse structure: " + (e instanceof Error ? e.message : "unknown"),
        "error",
      );
    } finally {
      actions.setGenerating(false);
    }
  }, [session, actions]);

  if (!session) return null;

  const rs = session.roundState ?? { currentRoundIndex: 0, turnsInRound: 0, lockedDecisions: [] };
  const decisions = rs.lockedDecisions;
  const roundIndex = rs.currentRoundIndex;
  const turnsInRound = rs.turnsInRound;
  const canLock = isRoundsPhase && currentRound && turnsInRound >= currentRound.minTurns;

  return (
    <div className="ws-writing">
      {/* Chat area */}
      <div className="ws-chat-area">
        {/* Round banner */}
        {isRoundsPhase && currentRound && (
          <div className="ws-round-banner">
            <div className="ws-round-banner-label">
              Round {roundIndex + 1} of {activeRounds.length}
            </div>
            <div className="ws-round-banner-title">{currentRound.label}</div>
            <div className="ws-round-banner-question">{currentRound.question}</div>
            <div className="ws-round-banner-meta">
              {turnsInRound} turn{turnsInRound !== 1 ? "s" : ""} so far
              {!canLock && ` · ${currentRound.minTurns - turnsInRound} more before you can lock`}
            </div>
          </div>
        )}

        <div className="ws-chat-messages">
          {session.chatHistory.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          {generating && (
            <div className="ws-chat-typing">
              <span className="ws-typing-dots" />
              Agent is thinking...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Lock decision bar */}
        {canLock && (
          <div className="ws-lock-bar">
            <span className="ws-lock-bar-label">Lock "{currentRound.locksField}":</span>
            <textarea
              className="ws-chat-input"
              rows={2}
              placeholder={`Summarize what the room decided for "${currentRound.locksField}"...`}
              value={lockInput}
              onChange={(e) => setLockInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleLockDecision();
                }
              }}
            />
            <button
              className="ws-btn ws-btn-accent ws-btn-sm"
              onClick={handleLockDecision}
              disabled={!lockInput.trim()}
            >
              Lock & Next Round
            </button>
          </div>
        )}

        {/* Input */}
        <div className="ws-chat-input-bar">
          <textarea
            className="ws-chat-input"
            rows={2}
            placeholder="Type your message to the team..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleUserSend();
              }
            }}
          />
          <button
            className="ws-btn ws-btn-primary ws-btn-sm"
            onClick={handleUserSend}
            disabled={!userInput.trim()}
          >
            Send
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="ws-writing-sidebar">
        <div className="ws-sidebar-section">
          <h4>Phase</h4>
          <span className="ws-phase-badge">{PHASE_LABELS[session.roomPhase]}</span>
        </div>

        {/* Decisions Board */}
        {decisions.length > 0 && (
          <div className="ws-sidebar-section">
            <h4>Decisions Board</h4>
            <div className="ws-decisions-board">
              {decisions.map((d, i) => (
                <div key={i} className="ws-decision-item">
                  <span className="ws-decision-label">{d.label}</span>
                  <span className="ws-decision-value">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Episode State (Producer tracking) */}
        <EpisodeStatePanel episodeState={session.episodeState} />

        {/* Round progress */}
        {isRoundsPhase && (
          <div className="ws-sidebar-section">
            <h4>Rounds</h4>
            <div className="ws-rounds-progress">
              {activeRounds.map((r, i) => {
                const isComplete = decisions.some((d) => d.roundId === r.id);
                const isCurrent = i === roundIndex;
                return (
                  <div
                    key={r.id}
                    className={`ws-round-item ${isCurrent ? "ws-round-item--current" : ""} ${isComplete ? "ws-round-item--done" : ""}`}
                  >
                    <span className="ws-round-number">{i + 1}</span>
                    <span className="ws-round-name">{r.label}</span>
                    {isComplete && <span className="ws-round-check">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="ws-sidebar-section">
          <h4>Room Agents</h4>
          {session.roomAgents.map((ra) => {
            const persona = getPersona(ra.personaId);
            if (!persona) return null;
            const inPool = currentRound?.agentPool.includes(persona.role);
            return (
              <div key={ra.personaId} className={`ws-agent-row ${isRoundsPhase && !inPool ? "ws-agent-row--muted" : ""}`}>
                <span className="ws-agent-avatar">{persona.avatar}</span>
                <span className="ws-agent-name">{persona.name}</span>
                <span className="ws-agent-role">{persona.role}</span>
                {ra.approved && <span className="ws-agent-check">✓</span>}
                <button
                  className="ws-agent-remove"
                  title={`Remove ${persona.name}`}
                  onClick={() => {
                    actions.setRoomAgents(
                      session.roomAgents.filter((a) => a.personaId !== ra.personaId),
                    );
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
          <button
            className="ws-btn ws-btn-ghost ws-btn-sm"
            onClick={() => setShowPersonaBuilder(true)}
            style={{ marginTop: 8, width: "100%" }}
          >
            + Add Agent
          </button>
        </div>

        <div className="ws-sidebar-section">
          <h4>Controls</h4>
          <div className="ws-controls-stack">
            {!isApproved && (
              <>
                <button
                  className="ws-btn ws-btn-primary ws-btn-sm"
                  onClick={runTurn}
                  disabled={generating || session.roomPhase === "idle"}
                >
                  {generating ? "Thinking..." : "▶ Continue"}
                </button>

                <label className="ws-checkbox-label ws-auto-run-label">
                  <input
                    type="checkbox"
                    checked={autoRun}
                    onChange={(e) => actions.setAutoRun(e.target.checked)}
                  />
                  Auto-Run
                </label>

                {isRoundsPhase && (
                  <button
                    className="ws-btn ws-btn-ghost ws-btn-sm"
                    onClick={handleSkipRound}
                    disabled={generating}
                  >
                    Skip Round →
                  </button>
                )}
              </>
            )}

            {isPitch && (
              <button
                className="ws-btn ws-btn-accent ws-btn-sm"
                onClick={handleUserApprove}
                disabled={generating}
              >
                {generating ? "Parsing..." : "✓ Approve & Stage"}
              </button>
            )}

            {isApproved && (
              <button
                className="ws-btn ws-btn-accent ws-btn-sm"
                onClick={() => actions.setScreen("staging")}
              >
                Go to Staging Room →
              </button>
            )}
          </div>
        </div>

        <SerlingPanel
          lastCtx={lastSerlingCtx}
          voiceRefinement={voiceRefinement}
          onToggleVoice={setVoiceRefinement}
        />
      </aside>

      {showPersonaBuilder && (
        <PersonaBuilder
          onClose={() => setShowPersonaBuilder(false)}
          onAdd={(personaId) => {
            if (!session) return;
            const already = session.roomAgents.some((a) => a.personaId === personaId);
            if (!already) {
              actions.setRoomAgents([
                ...session.roomAgents,
                { personaId, approved: false },
              ]);
            }
            setShowPersonaBuilder(false);
          }}
        />
      )}
    </div>
  );
}

/* ─── Serling Retrieval Panel ─────────────────────────── */

function SerlingPanel({
  lastCtx,
  voiceRefinement,
  onToggleVoice,
}: {
  lastCtx?: AgentTurnResult["serlingContext"];
  voiceRefinement: boolean;
  onToggleVoice: (v: boolean) => void;
}) {
  const stats = getSerlingStats();

  return (
    <>
      <div className="ws-sidebar-section">
        <h4>Serling Engine</h4>
        <div className="ws-serling-stats">
          <span className={`ws-serling-badge ${stats.loaded ? "ws-serling-loaded" : "ws-serling-empty"}`}>
            {stats.loaded ? "Active" : "No corpus loaded"}
          </span>
          {stats.loaded && (
            <span className="ws-serling-count">
              {stats.corpusSize} chunks · {stats.decisionCount} decisions
            </span>
          )}
        </div>
      </div>

      {lastCtx && (lastCtx.corpusCount > 0 || lastCtx.decisionCount > 0) && (
        <div className="ws-sidebar-section">
          <h4>Last Retrieval</h4>
          <div className="ws-serling-retrieval">
            <div className="ws-serling-retrieval-row">
              <span className="ws-serling-label">Corpus hits:</span>
              <span>{lastCtx.corpusCount}</span>
            </div>
            <div className="ws-serling-retrieval-row">
              <span className="ws-serling-label">Decision matches:</span>
              <span>{lastCtx.decisionCount}</span>
            </div>
          </div>
        </div>
      )}

      <div className="ws-sidebar-section">
        <h4>Voice Model</h4>
        <label className="ws-checkbox-label">
          <input
            type="checkbox"
            checked={voiceRefinement}
            onChange={(e) => onToggleVoice(e.target.checked)}
          />
          Local voice refinement
        </label>
        <span className="ws-serling-hint">
          Requires Ollama running locally
        </span>
      </div>
    </>
  );
}

/* ─── Message Bubble ─────────────────────────────────── */

function EpisodeStatePanel({ episodeState }: { episodeState: ProducerEpisodeState }) {
  const hasData = episodeState.episodePremise || episodeState.openingHook || episodeState.strangeEvent;
  if (!hasData) return null;

  const fields: { label: string; value: string }[] = [
    { label: "Premise", value: episodeState.episodePremise },
    { label: "Opening Hook", value: episodeState.openingHook },
    { label: "Strange Event", value: episodeState.strangeEvent },
    { label: "Development", value: episodeState.development },
    { label: "Key Visual", value: episodeState.keyVisualMoment },
    { label: "Ending Beat", value: episodeState.endingBeat },
    { label: "Theme", value: episodeState.themeOrFeeling },
    { label: "Direction", value: episodeState.selectedDirection },
  ].filter((f) => f.value);

  const checkpointLabels: Record<string, string> = {
    "none": "",
    "premise-lock": "Premise Lock",
    "visual-lock": "Visual Lock",
    "ending-lock": "Ending Lock",
    "production-sanity": "Production Sanity",
  };

  return (
    <div className="ws-sidebar-section">
      <h4>Episode State</h4>
      <div className="ws-episode-state">
        {fields.map((f) => (
          <div key={f.label} className="ws-episode-state-item">
            <span className="ws-episode-state-label">{f.label}</span>
            <span className="ws-episode-state-value">{f.value}</span>
          </div>
        ))}
        {episodeState.practicalConcerns.length > 0 && (
          <div className="ws-episode-state-item">
            <span className="ws-episode-state-label">Practical Concerns</span>
            <span className="ws-episode-state-value">{episodeState.practicalConcerns.join("; ")}</span>
          </div>
        )}
        {episodeState.unresolvedQuestions.length > 0 && (
          <div className="ws-episode-state-item ws-episode-state-item--warn">
            <span className="ws-episode-state-label">Unresolved</span>
            <span className="ws-episode-state-value">{episodeState.unresolvedQuestions.join("; ")}</span>
          </div>
        )}
        {episodeState.checkpoint !== "none" && (
          <div className="ws-episode-state-checkpoint">
            Checkpoint: {checkpointLabels[episodeState.checkpoint]}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Message Bubble ─────────────────────────────────── */

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.sender === "user";
  const isSystem = msg.sender === "system";

  if (isSystem) {
    const isLock = msg.content.startsWith("✓ LOCKED");
    const isRoundStart = msg.content.startsWith("Round ");
    return (
      <div className={`ws-msg ws-msg--system ${isLock ? "ws-msg--locked" : ""} ${isRoundStart ? "ws-msg--round-start" : ""}`}>
        <span className="ws-msg-content">{msg.content}</span>
      </div>
    );
  }

  return (
    <div className={`ws-msg ${isUser ? "ws-msg--user" : "ws-msg--agent"}`}>
      <div className="ws-msg-header">
        <span className="ws-msg-avatar">{msg.agentAvatar}</span>
        <span className="ws-msg-name">{msg.agentName}</span>
        <span className="ws-msg-role">{msg.agentRole}</span>
        {msg.isApproval && <span className="ws-msg-approval">APPROVED</span>}
      </div>
      <div className="ws-msg-content">{msg.content}</div>
    </div>
  );
}
