"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWritingStore } from "../store";
import type { ChatMessage, ChatAttachment, RoomPhase, MessageReactions, ModelTier } from "../types";
import { MODEL_TIER_OPTIONS } from "../types";
import {
  generateRoundTurn, selectRoundSpeaker,
  createUserMessage, createSystemMessage, createAgentMessage,
  isApprovalMessage, generateSummary,
  generateProducerNudge, generateWrapUpSignal, generateImmediateWrapUp,
} from "../agentEngine";
import type { AgentTurnResult } from "../agentEngine";
import { getPersona, getAllPersonas, savePersona } from "../agents";
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

const TIER_CYCLE: ModelTier[] = ["quick", "standard", "deep"];

export function WritingRoom() {
  const { session, generating, autoRun, currentSpeaker, globalModelTier, actions } = useWritingStore();
  const [userInput, setUserInput] = useState("");
  const [lockInput, setLockInput] = useState("");
  const [showPersonaBuilder, setShowPersonaBuilder] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [loraViewPersonaId, setLoraViewPersonaId] = useState<string | null>(null);
  const [stagedAttachments, setStagedAttachments] = useState<ChatAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    () => getRoundsForScope(session?.planning.scopeLength ?? "medium"),
    [session?.planning.scopeLength],
  );
  const roundState = session?.roundState;
  const currentRound = roundState ? getRoundByIndex(roundState.currentRoundIndex, activeRounds) : undefined;
  const isRoundsPhase = session?.roomPhase === "rounds";
  const isApproved = session?.roomPhase === "approved";

  const producerAgent = useMemo(
    () => session?.roomAgents.find((a) => {
      const p = getPersona(a.personaId);
      return p?.role === "producer";
    }),
    [session?.roomAgents],
  );

  /* ─── Run one agent turn ──────────────────────────── */
  const runTurn = useCallback(async () => {
    if (!session || generating) return;
    const { roomAgents, chatHistory, agentStates, projectState, producerBrief, roundState: rs } = session;
    if (roomAgents.length === 0) return;

    const phase = session.roomPhase;
    const round = currentRound;

    if (phase === "briefing" || phase === "rounds" || phase === "pitch" || phase === "revision") {
      const abort = new AbortController();
      actions.setAbortController(abort);
      actions.setGenerating(true);
      try {
        const lastSpeaker = chatHistory[chatHistory.length - 1]?.agentId ?? undefined;
        const agent = selectRoundSpeaker(roomAgents, agentStates, lastSpeaker ?? undefined);
        if (!agent) { actions.setGenerating(false); return; }

        actions.ensureAgentState(agent.personaId);
        const persona = getPersona(agent.personaId);
        actions.setCurrentSpeaker(persona?.name ?? agent.personaId);

        if (!round && (phase === "briefing" || phase === "rounds")) {
          actions.setGenerating(false);
          actions.setCurrentSpeaker(null);
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
          { wrappingUp: session.wrappingUp, signal: abort.signal, globalModelTier, planning: session.planning },
        );

        const imageAttachments: import("../types").ChatAttachment[] | undefined =
          result.generatedImages?.length
            ? result.generatedImages.map((img) => ({
                type: "image" as const,
                mimeType: img.mimeType,
                base64: img.base64,
                fileName: `${persona?.name ?? "agent"}-concept.png`,
              }))
            : undefined;

        const msg = createAgentMessage(agent.personaId, result.text, imageAttachments?.length ? { attachments: imageAttachments } : undefined);
        actions.addChatMessage(msg);

        if (imageAttachments?.length) {
          for (const att of imageAttachments) {
            try {
              const settings = typeof localStorage !== "undefined"
                ? JSON.parse(localStorage.getItem("shawnderland-global-settings") || "{}")
                : {};
              const outputDir = settings?.outputDir;
              if (outputDir && att.base64) {
                fetch("/api/character-save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    base64: att.base64,
                    mimeType: att.mimeType,
                    charName: persona?.name ?? "agent",
                    viewName: "visual-feedback",
                    outputDir,
                    appKey: "writing-room",
                    contentType: "visual-feedback",
                  }),
                }).catch(() => {});
              }
            } catch { /* ignore save errors */ }
          }
        }
        actions.bumpTurnsSinceSpoke(agent.personaId);
        actions.incrementRoundTurns();
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
        if ((err as Error).name === "AbortError") return;
        actions.addToast("Agent error: " + (err instanceof Error ? err.message : "unknown"), "error");
      } finally {
        actions.setGenerating(false);
        actions.setCurrentSpeaker(null);
        actions.setAbortController(null);
      }
    }
  }, [session, generating, actions, currentRound, activeRounds, globalModelTier]);

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

  /* ─── File / Paste helpers ───────────────────────── */
  const handleFilesSelected = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setStagedAttachments((prev) => [
          ...prev,
          { type: "image", mimeType: file.type, base64, fileName: file.name },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          setStagedAttachments((prev) => [
            ...prev,
            { type: "image", mimeType: file.type, base64, fileName: file.name || "pasted-image.png" },
          ]);
        };
        reader.readAsDataURL(file);
      }
    }
  }, []);

  const removeStagedAttachment = useCallback((idx: number) => {
    setStagedAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  /* ─── User sends message ─────────────────────────── */
  const pendingUserTurnRef = useRef(false);

  const handleUserSend = useCallback(() => {
    if ((!userInput.trim() && stagedAttachments.length === 0) || !session) return;
    const atts = stagedAttachments.length > 0 ? stagedAttachments : undefined;
    actions.addChatMessage(createUserMessage(userInput.trim(), atts));
    setUserInput("");
    setStagedAttachments([]);
    pendingUserTurnRef.current = true;
  }, [userInput, stagedAttachments, session, actions]);

  useEffect(() => {
    if (!pendingUserTurnRef.current || generating) return;
    const phase = session?.roomPhase;
    if (!phase || phase === "idle" || phase === "approved") return;
    pendingUserTurnRef.current = false;
    const timer = setTimeout(runTurn, 400);
    return () => clearTimeout(timer);
  }, [session?.chatHistory.length, generating, session?.roomPhase, runTurn]);

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

  /* ─── Nudge Producer ──────────────────────────────── */
  const handleNudgeProducer = useCallback(async () => {
    if (!session || !producerAgent) return;
    if (generating) actions.stopAll();
    await new Promise((r) => setTimeout(r, 50));
    const abort = new AbortController();
    actions.setAbortController(abort);
    actions.setGenerating(true);
    const persona = getPersona(producerAgent.personaId);
    actions.setCurrentSpeaker(persona?.name ?? "Producer");
    try {
      const text = await generateProducerNudge(
        producerAgent.personaId,
        session.chatHistory,
        session.projectState,
        session.producerBrief,
        abort.signal,
      );
      actions.addChatMessage(createAgentMessage(producerAgent.personaId, text));
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        actions.addToast("Nudge failed: " + (err instanceof Error ? err.message : "unknown"), "error");
      }
    } finally {
      actions.setGenerating(false);
      actions.setCurrentSpeaker(null);
      actions.setAbortController(null);
    }
  }, [session, generating, producerAgent, actions]);

  /* ─── Start Wrapping Up ───────────────────────────── */
  const handleStartWrapUp = useCallback(async () => {
    if (!session || !producerAgent) return;
    if (generating) actions.stopAll();
    await new Promise((r) => setTimeout(r, 50));
    const abort = new AbortController();
    actions.setAbortController(abort);
    actions.setGenerating(true);
    actions.setWrappingUp(true);
    actions.addChatMessage(createSystemMessage("The client has asked the room to start wrapping up."));
    const persona = getPersona(producerAgent.personaId);
    actions.setCurrentSpeaker(persona?.name ?? "Producer");
    try {
      const text = await generateWrapUpSignal(
        producerAgent.personaId,
        session.chatHistory,
        session.projectState,
        session.producerBrief,
        abort.signal,
      );
      actions.addChatMessage(createAgentMessage(producerAgent.personaId, text));
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        actions.addToast("Wrap-up failed: " + (err instanceof Error ? err.message : "unknown"), "error");
      }
    } finally {
      actions.setGenerating(false);
      actions.setCurrentSpeaker(null);
      actions.setAbortController(null);
    }
  }, [session, generating, producerAgent, actions]);

  /* ─── Wrap Up Now ─────────────────────────────────── */
  const handleWrapUpNow = useCallback(async () => {
    if (!session || !producerAgent) return;
    if (generating) actions.stopAll();
    await new Promise((r) => setTimeout(r, 50));
    const abort = new AbortController();
    actions.setAbortController(abort);
    actions.setGenerating(true);
    const persona = getPersona(producerAgent.personaId);
    actions.setCurrentSpeaker(persona?.name ?? "Producer");
    try {
      const text = await generateImmediateWrapUp(
        producerAgent.personaId,
        session.chatHistory,
        session.projectState,
        session.roundState.lockedDecisions,
        session.producerBrief,
        abort.signal,
      );
      actions.addChatMessage(createAgentMessage(producerAgent.personaId, text, { isTldr: true }));
      actions.setRoomPhase("approved");
      actions.setAutoRun(false);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        actions.addToast("Immediate wrap-up failed: " + (err instanceof Error ? err.message : "unknown"), "error");
      }
    } finally {
      actions.setGenerating(false);
      actions.setCurrentSpeaker(null);
      actions.setAbortController(null);
    }
  }, [session, generating, producerAgent, actions]);

  /* ─── Stop All ────────────────────────────────────── */
  const handleStopAll = useCallback(() => {
    actions.stopAll();
  }, [actions]);

  /* ─── Reaction handlers ───────────────────────────── */
  const handleReaction = useCallback(
    (msgId: string, reaction: keyof MessageReactions) => {
      if (!session) return;
      const msg = session.chatHistory.find((m) => m.id === msgId);
      const current = msg?.reactions?.[reaction] ?? false;
      actions.setMessageReaction(msgId, reaction, !current);
      if (reaction === "star" && !current && msg) {
        actions.addStarredIdea(msg.content.slice(0, 200));
      }
    },
    [session, actions],
  );

  /* ─── Add/Remove Agent ────────────────────────────── */
  const handleRemoveAgent = useCallback(
    (personaId: string) => {
      if (!session) return;
      const p = getPersona(personaId);
      actions.removeRoomAgent(personaId);
      actions.addChatMessage(createSystemMessage(`${p?.name ?? personaId} has left the room.`));
    },
    [session, actions],
  );

  const handleAddAgent = useCallback(
    (personaId: string) => {
      if (!session) return;
      const p = getPersona(personaId);
      actions.addRoomAgent(personaId);
      actions.ensureAgentState(personaId);
      actions.addChatMessage(createSystemMessage(`${p?.name ?? personaId} has joined the room.`));
      setShowAddAgent(false);
    },
    [session, actions],
  );

  /* ─── Cycle Model Tier ────────────────────────────── */
  const handleCycleTier = useCallback(
    (personaId: string) => {
      const p = getPersona(personaId);
      if (!p) return;
      const currentTier = p.modelTier ?? "standard";
      const idx = TIER_CYCLE.indexOf(currentTier);
      const next = TIER_CYCLE[(idx + 1) % TIER_CYCLE.length];
      if (!p.isPreset) {
        savePersona({ ...p, modelTier: next });
      }
      actions.addToast(`${p.name} set to ${next} mode`, "info");
    },
    [actions],
  );

  const availableToAdd = useMemo(() => {
    if (!session) return [];
    const inRoom = new Set(session.roomAgents.map((a) => a.personaId));
    return getAllPersonas().filter((p) => !inRoom.has(p.id));
  }, [session]);

  if (!session) return null;

  const phase = session.roomPhase;
  const lockedDecisions = session.roundState?.lockedDecisions ?? [];
  const chatHistory = session.chatHistory;

  return (
    <div className="wr-writing">
      {showPersonaBuilder && (
        <PersonaBuilder onClose={() => setShowPersonaBuilder(false)} />
      )}

      {loraViewPersonaId && (() => {
        const lp = getPersona(loraViewPersonaId);
        return (
          <div className="wr-lora-overlay" onClick={() => setLoraViewPersonaId(null)}>
            <div className="wr-lora-panel" onClick={(e) => e.stopPropagation()}>
              <div className="wr-lora-panel-header">
                <span>{lp?.avatar} {lp?.name} — Training Data</span>
                <button className="wr-btn wr-btn-ghost wr-btn-sm" onClick={() => setLoraViewPersonaId(null)}>×</button>
              </div>
              <div className="wr-lora-panel-body">
                {lp?.researchData || "No training data available."}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Sidebar */}
      <aside className="wr-writing-sidebar">
        <div className="wr-sidebar-section">
          <h3>Status</h3>
          <div className="wr-phase-badge">{PHASE_LABELS[phase]}</div>
          {session.wrappingUp && (
            <div style={{ fontSize: 11, color: "var(--wr-warning)", marginTop: 4 }}>Wrapping up...</div>
          )}
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
            const tier = p?.modelTier ?? "standard";
            return (
              <div key={a.personaId} className="wr-agent-badge">
                <div className="wr-agent-badge-info">
                  <span>{p?.avatar ?? "?"}</span>
                  <span className="wr-agent-name">{p?.name ?? a.personaId}</span>
                  {p?.researchData && (
                    <button
                      className="wr-lora-badge"
                      onClick={() => setLoraViewPersonaId(a.personaId)}
                      title="Has LORA training data — click to view"
                    >
                      LORA
                    </button>
                  )}
                </div>
                <button
                  className={`wr-tier-badge wr-tier-badge--${tier}`}
                  onClick={() => handleCycleTier(a.personaId)}
                  title={`${tier} — click to change`}
                >
                  {tier === "standard" ? "std" : tier}
                </button>
                <button
                  className="wr-agent-remove-btn"
                  onClick={() => handleRemoveAgent(a.personaId)}
                  title="Remove from room"
                >
                  ×
                </button>
              </div>
            );
          })}

          <div className="wr-add-agent-wrap">
            <button
              className="wr-btn wr-btn-ghost wr-btn-sm"
              onClick={() => setShowAddAgent(!showAddAgent)}
              style={{ width: "100%" }}
            >
              + Add Agent
            </button>
            {showAddAgent && availableToAdd.length > 0 && (
              <div className="wr-add-agent-dropdown">
                {availableToAdd.map((p) => (
                  <button key={p.id} onClick={() => handleAddAgent(p.id)}>
                    <span>{p.avatar}</span>
                    <span>{p.name}</span>
                    <span style={{ color: "var(--wr-text-dim)", marginLeft: "auto", fontSize: 10 }}>
                      {p.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="wr-btn wr-btn-ghost wr-btn-sm"
            onClick={() => setShowPersonaBuilder(true)}
            style={{ marginTop: 8, width: "100%" }}
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
      </aside>

      {/* Chat area */}
      <div className="wr-chat-area">
        <div className="wr-chat-messages">
          {chatHistory.map((msg) => {
            const isFinal = msg.isTldr && msg.sender === "agent";
            return (
              <div
                key={msg.id}
                className={`wr-chat-msg wr-chat-msg--${msg.sender}${isFinal ? " wr-chat-msg--final" : ""}`}
              >
                <div className="wr-chat-msg-header">
                  <span className="wr-chat-avatar">{msg.agentAvatar}</span>
                  <strong>{msg.agentName}</strong>
                  <span className="wr-chat-role">{msg.agentRole}</span>
                  <span className="wr-chat-time">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="wr-chat-msg-body">
                  {msg.content}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="wr-msg-attachments">
                      {msg.attachments.filter((a) => a.type === "image" && a.base64).map((att, i) => (
                        <div key={i} className="wr-msg-img-wrap">
                          <img
                            src={`data:${att.mimeType};base64,${att.base64}`}
                            alt={att.fileName || "attachment"}
                            className="wr-msg-thumb"
                          />
                          <div className="wr-msg-img-actions">
                            <button
                              className="wr-msg-img-btn"
                              title="Copy image"
                              onClick={() => {
                                try {
                                  const byteStr = atob(att.base64!);
                                  const bytes = new Uint8Array(byteStr.length);
                                  for (let j = 0; j < byteStr.length; j++) bytes[j] = byteStr.charCodeAt(j);
                                  const blob = new Blob([bytes], { type: att.mimeType });
                                  navigator.clipboard.write([new ClipboardItem({ [att.mimeType]: blob })]).catch(() => {});
                                } catch { /* ignore */ }
                              }}
                            >
                              📋
                            </button>
                            <button
                              className="wr-msg-img-btn"
                              title="Download image"
                              onClick={() => {
                                try {
                                  const byteStr = atob(att.base64!);
                                  const bytes = new Uint8Array(byteStr.length);
                                  for (let j = 0; j < byteStr.length; j++) bytes[j] = byteStr.charCodeAt(j);
                                  const blob = new Blob([bytes], { type: att.mimeType });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = att.fileName || "image.png";
                                  a.click();
                                  URL.revokeObjectURL(url);
                                } catch { /* ignore */ }
                              }}
                            >
                              💾
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {msg.sender === "agent" && (
                  <div className="wr-reactions">
                    <button
                      className={`wr-reaction-btn${msg.reactions?.thumbsUp ? " wr-reaction-btn--active" : ""}`}
                      onClick={() => handleReaction(msg.id, "thumbsUp")}
                      title="+1"
                    >
                      👍
                    </button>
                    <button
                      className={`wr-reaction-btn wr-reaction-btn--down${msg.reactions?.thumbsDown ? " wr-reaction-btn--active" : ""}`}
                      onClick={() => handleReaction(msg.id, "thumbsDown")}
                      title="-1"
                    >
                      👎
                    </button>
                    <button
                      className={`wr-reaction-btn wr-reaction-btn--star${msg.reactions?.star ? " wr-reaction-btn--active" : ""}`}
                      onClick={() => handleReaction(msg.id, "star")}
                      title="Star — run with this idea"
                    >
                      ⭐
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing indicator */}
          {generating && currentSpeaker && (
            <div className="wr-typing-indicator">
              <span>{currentSpeaker} is typing</span>
              <span className="wr-typing-dots">
                <span />
                <span />
                <span />
              </span>
            </div>
          )}

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

          {stagedAttachments.length > 0 && (
            <div className="wr-staged-attachments">
              {stagedAttachments.map((att, i) => (
                <div key={i} className="wr-staged-thumb-wrap">
                  <img
                    src={`data:${att.mimeType};base64,${att.base64}`}
                    alt={att.fileName || "staged"}
                    className="wr-staged-thumb"
                  />
                  <button className="wr-staged-remove" onClick={() => removeStagedAttachment(i)} title="Remove">×</button>
                </div>
              ))}
            </div>
          )}

          <div className="wr-input-row">
            <input
              type="file"
              ref={fileInputRef}
              className="wr-hidden-input"
              accept="image/*"
              multiple
              onChange={(e) => { handleFilesSelected(e.target.files); e.target.value = ""; }}
            />
            <button
              className="wr-btn wr-btn-ghost wr-btn-sm wr-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={phase === "idle"}
              title="Attach images"
            >
              📎
            </button>
            <input
              className="wr-input"
              placeholder="Say something to the room..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUserSend()}
              onPaste={handlePaste}
              disabled={phase === "idle"}
            />
            <button
              className="wr-btn wr-btn-primary wr-btn-sm"
              onClick={handleUserSend}
              disabled={(!userInput.trim() && stagedAttachments.length === 0) || phase === "idle"}
            >
              Send
            </button>
          </div>

          <div className="wr-action-row">
            {/* Stop */}
            <button
              className="wr-btn wr-btn-danger wr-btn-sm"
              onClick={handleStopAll}
              disabled={!generating && !autoRun}
              title="Stop all AI agents"
            >
              Stop
            </button>

            {/* Turn controls */}
            <button
              className="wr-btn wr-btn-primary wr-btn-sm"
              onClick={runTurn}
              disabled={generating || phase === "idle" || phase === "approved"}
            >
              {generating ? "Thinking..." : "Next Turn"}
            </button>
            <button
              className={`wr-btn wr-btn-sm ${autoRun ? "wr-btn-danger" : "wr-btn-accent"}`}
              onClick={() => actions.setAutoRun(!autoRun)}
              disabled={phase === "idle" || phase === "approved"}
            >
              {autoRun ? "Stop Auto" : "Auto-Run"}
            </button>

            <span className="wr-action-divider" />

            {/* Producer controls */}
            <button
              className="wr-btn wr-btn-secondary wr-btn-sm"
              onClick={handleNudgeProducer}
              disabled={!producerAgent || phase === "idle"}
              title="Ask the producer for a status update"
            >
              Nudge Producer
            </button>
            <button
              className="wr-btn wr-btn-secondary wr-btn-sm"
              onClick={handleStartWrapUp}
              disabled={!producerAgent || phase === "idle" || phase === "approved"}
              title="Signal the room to start wrapping up"
            >
              Start Wrapping Up
            </button>
            <button
              className="wr-btn wr-btn-secondary wr-btn-sm"
              onClick={handleWrapUpNow}
              disabled={!producerAgent || phase === "idle" || phase === "approved"}
              title="Produce a final deliverable immediately"
            >
              Wrap Up Now
            </button>

            <span className="wr-action-divider" />

            {/* Summary & Export */}
            <button
              className="wr-btn wr-btn-secondary wr-btn-sm"
              onClick={handleGenerateSummary}
              disabled={generatingSummary || chatHistory.length === 0}
            >
              {generatingSummary ? "Generating..." : "Summary"}
            </button>
            <button
              className="wr-btn wr-btn-ghost wr-btn-sm"
              onClick={handleExportTranscript}
              disabled={chatHistory.length === 0}
            >
              Export
            </button>

            <span className="wr-action-divider" />

            {/* Global speed toggle */}
            <div className="wr-speed-toggle" title="Universal AI speed — click active to revert to per-agent">
              {MODEL_TIER_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  className={`wr-speed-btn${globalModelTier === t.id ? " wr-speed-btn--active" : ""}`}
                  onClick={() => actions.setGlobalModelTier(globalModelTier === t.id ? null : t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {(phase === "approval" || isApproved) && (
              <button
                className="wr-btn wr-btn-success wr-btn-sm"
                onClick={handleUserApprove}
                disabled={isApproved}
              >
                {isApproved ? "Approved ✓" : "Approve"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
