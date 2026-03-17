"use client";

import { useSyncExternalStore } from "react";
import type {
  WritingSession, PlanningData, ChatMessage, RoomAgent, RoomPhase,
  ScreenId, ToastItem, LockedDecision, CreativeRoundId,
  ProducerProjectState, AgentTurnState, MessageReactions, ModelTier,
} from "./types";
import { DEFAULT_PLANNING, DEFAULT_PROJECT_STATE, DEFAULT_AGENT_TURN_STATE } from "./types";

function uid() {
  return `wr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const LS_SESSIONS = "writing-room-sessions-v1";
const LS_ACTIVE = "writing-room-active-session";

/* ─── Persistence ────────────────────────────────────── */

function loadSessions(): WritingSession[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(LS_SESSIONS) : null;
    if (!raw) return [];
    const sessions: WritingSession[] = JSON.parse(raw);
    for (const s of sessions) {
      if (!s.projectState) s.projectState = { ...DEFAULT_PROJECT_STATE };
      const ps = s.projectState;
      if (!Array.isArray(ps.openQuestions)) ps.openQuestions = [];
      if (!Array.isArray(ps.hardRules)) ps.hardRules = [];
      if (!Array.isArray(ps.rejectedAlternatives)) ps.rejectedAlternatives = [];
      if (!s.roundState) s.roundState = { currentRoundIndex: 0, turnsInRound: 0, lockedDecisions: [] };
      if (!s.agentStates) s.agentStates = {};
    }
    return sessions;
  } catch {
    return [];
  }
}

function saveSessions(sessions: WritingSession[]) {
  localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions));
}

/* ─── Default Session ────────────────────────────────── */

function createBlankSession(name = "Untitled Project"): WritingSession {
  return {
    id: uid(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    planning: { ...DEFAULT_PLANNING },
    producerBrief: null,
    roomAgents: [],
    chatHistory: [],
    roomPhase: "idle",
    roundState: { currentRoundIndex: 0, turnsInRound: 0, lockedDecisions: [] },
    agentStates: {},
    projectState: { ...DEFAULT_PROJECT_STATE },
    activeScreen: "planning",
    userApproved: false,
  };
}

/* ─── Store State ────────────────────────────────────── */

interface StoreState {
  sessions: WritingSession[];
  activeSessionId: string | null;
  toasts: ToastItem[];
  generating: boolean;
  autoRun: boolean;
  currentSpeaker: string | null;
  abortController: AbortController | null;
  globalModelTier: ModelTier | null;
}

let state: StoreState = {
  sessions: typeof window !== "undefined" ? loadSessions() : [],
  activeSessionId: typeof window !== "undefined" ? localStorage.getItem(LS_ACTIVE) || null : null,
  toasts: [],
  generating: false,
  autoRun: false,
  currentSpeaker: null,
  abortController: null,
  globalModelTier: null,
};

const listeners = new Set<() => void>();

function emit() { listeners.forEach((fn) => fn()); }
function getSnapshot(): StoreState { return state; }
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function update(partial: Partial<StoreState>) {
  state = { ...state, ...partial };
  emit();
}
function persistSessions() { saveSessions(state.sessions); }
function getActiveSession(): WritingSession | undefined {
  return state.sessions.find((s) => s.id === state.activeSessionId);
}
function updateSession(id: string, updater: (s: WritingSession) => WritingSession) {
  const sessions = state.sessions.map((s) =>
    s.id === id ? updater({ ...s, updatedAt: Date.now() }) : s,
  );
  update({ sessions });
  persistSessions();
}

/* ─── Actions ────────────────────────────────────────── */

export const storeActions = {
  newSession(name?: string) {
    const session = createBlankSession(name);
    const sessions = [...state.sessions, session];
    update({ sessions, activeSessionId: session.id });
    localStorage.setItem(LS_ACTIVE, session.id);
    persistSessions();
    return session.id;
  },

  openSession(id: string) {
    update({ activeSessionId: id });
    localStorage.setItem(LS_ACTIVE, id);
  },

  deleteSession(id: string) {
    const sessions = state.sessions.filter((s) => s.id !== id);
    const activeSessionId =
      state.activeSessionId === id ? (sessions[0]?.id ?? null) : state.activeSessionId;
    update({ sessions, activeSessionId });
    localStorage.setItem(LS_ACTIVE, activeSessionId ?? "");
    persistSessions();
  },

  renameSession(name: string) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({ ...sess, name }));
  },

  resetSession() {
    const s = getActiveSession();
    if (!s) return;
    const blank = createBlankSession(s.name);
    blank.id = s.id;
    updateSession(s.id, () => blank);
  },

  exportSession(): string | null {
    const s = getActiveSession();
    if (!s) return null;
    return JSON.stringify(s, null, 2);
  },

  importSession(json: string) {
    try {
      const imported = JSON.parse(json) as WritingSession;
      imported.id = uid();
      imported.updatedAt = Date.now();
      const sessions = [...state.sessions, imported];
      update({ sessions, activeSessionId: imported.id });
      localStorage.setItem(LS_ACTIVE, imported.id);
      persistSessions();
      return imported.id;
    } catch {
      return null;
    }
  },

  setScreen(screen: ScreenId) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({ ...sess, activeScreen: screen }));
  },

  updatePlanning(fields: Partial<PlanningData>) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({
      ...sess,
      planning: { ...sess.planning, ...fields },
    }));
  },

  setFullPlanning(planning: PlanningData) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({ ...sess, planning }));
  },

  setProducerBrief(brief: string) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({ ...sess, producerBrief: brief }));
  },

  setRoomAgents(agents: RoomAgent[]) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({ ...sess, roomAgents: agents }));
  },

  setRoomPhase(phase: RoomPhase) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({ ...sess, roomPhase: phase }));
  },

  addChatMessage(message: ChatMessage) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({
      ...sess,
      chatHistory: [...sess.chatHistory, message],
    }));
  },

  setAgentApproval(personaId: string, approved: boolean) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({
      ...sess,
      roomAgents: sess.roomAgents.map((a) =>
        a.personaId === personaId ? { ...a, approved } : a,
      ),
    }));
  },

  setUserApproved(approved: boolean) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({ ...sess, userApproved: approved }));
  },

  updateProjectState(patch: Partial<ProducerProjectState>) {
    const s = getActiveSession();
    if (!s) return;
    const safe: Partial<ProducerProjectState> = { ...patch };
    if (safe.openQuestions != null && !Array.isArray(safe.openQuestions)) safe.openQuestions = [];
    if (safe.hardRules != null && !Array.isArray(safe.hardRules)) safe.hardRules = [];
    if (safe.rejectedAlternatives != null && !Array.isArray(safe.rejectedAlternatives)) safe.rejectedAlternatives = [];
    updateSession(s.id, (sess) => ({
      ...sess,
      projectState: { ...sess.projectState, ...safe },
    }));
  },

  updateAgentState(personaId: string, patch: Partial<AgentTurnState>) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => {
      const prev = sess.agentStates[personaId] ?? { ...DEFAULT_AGENT_TURN_STATE, personaId };
      return {
        ...sess,
        agentStates: { ...sess.agentStates, [personaId]: { ...prev, ...patch } },
      };
    });
  },

  resetAgentStates() {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => {
      const reset: Record<string, AgentTurnState> = {};
      for (const id of Object.keys(sess.agentStates)) {
        reset[id] = { ...DEFAULT_AGENT_TURN_STATE, personaId: id };
      }
      return { ...sess, agentStates: reset };
    });
  },

  bumpTurnsSinceSpoke(excludePersonaId: string) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => {
      const next: Record<string, AgentTurnState> = {};
      for (const [id, st] of Object.entries(sess.agentStates)) {
        next[id] = id === excludePersonaId
          ? { ...st, turnsSinceLastSpoke: 0, totalTurnsSpoken: st.totalTurnsSpoken + 1 }
          : { ...st, turnsSinceLastSpoke: st.turnsSinceLastSpoke + 1 };
      }
      return { ...sess, agentStates: next };
    });
  },

  ensureAgentState(personaId: string) {
    const s = getActiveSession();
    if (!s || s.agentStates[personaId]) return;
    updateSession(s.id, (sess) => ({
      ...sess,
      agentStates: {
        ...sess.agentStates,
        [personaId]: { ...DEFAULT_AGENT_TURN_STATE, personaId },
      },
    }));
  },

  lockDecision(roundId: CreativeRoundId, label: string, value: string, lockedBy: string) {
    const s = getActiveSession();
    if (!s) return;
    const decision: LockedDecision = { roundId, label, value, lockedBy, lockedAt: Date.now() };
    updateSession(s.id, (sess) => {
      const rs = sess.roundState ?? { currentRoundIndex: 0, turnsInRound: 0, lockedDecisions: [] };
      return { ...sess, roundState: { ...rs, lockedDecisions: [...rs.lockedDecisions, decision] } };
    });
  },

  advanceRound() {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => {
      const rs = sess.roundState ?? { currentRoundIndex: 0, turnsInRound: 0, lockedDecisions: [] };
      return { ...sess, roundState: { ...rs, currentRoundIndex: rs.currentRoundIndex + 1, turnsInRound: 0 } };
    });
  },

  incrementRoundTurns() {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => {
      const rs = sess.roundState ?? { currentRoundIndex: 0, turnsInRound: 0, lockedDecisions: [] };
      return { ...sess, roundState: { ...rs, turnsInRound: rs.turnsInRound + 1 } };
    });
  },

  addRoomAgent(personaId: string) {
    const s = getActiveSession();
    if (!s) return;
    if (s.roomAgents.some((a) => a.personaId === personaId)) return;
    updateSession(s.id, (sess) => ({
      ...sess,
      roomAgents: [...sess.roomAgents, { personaId, approved: false }],
    }));
  },

  removeRoomAgent(personaId: string) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({
      ...sess,
      roomAgents: sess.roomAgents.filter((a) => a.personaId !== personaId),
    }));
  },

  setWrappingUp(wrappingUp: boolean) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({ ...sess, wrappingUp }));
  },

  addStarredIdea(idea: string) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({
      ...sess,
      starredIdeas: [...(sess.starredIdeas ?? []), idea],
    }));
  },

  setMessageReaction(messageId: string, reaction: keyof MessageReactions, value: boolean) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({
      ...sess,
      chatHistory: sess.chatHistory.map((m) =>
        m.id === messageId
          ? {
              ...m,
              reactions: {
                thumbsUp: false,
                thumbsDown: false,
                star: false,
                ...m.reactions,
                [reaction]: value,
              },
            }
          : m,
      ),
    }));
  },

  setGenerating(generating: boolean) { update({ generating }); },
  setAutoRun(autoRun: boolean) { update({ autoRun }); },
  setCurrentSpeaker(name: string | null) { update({ currentSpeaker: name }); },
  setAbortController(ctrl: AbortController | null) { update({ abortController: ctrl }); },
  setGlobalModelTier(tier: ModelTier | null) { update({ globalModelTier: tier }); },

  stopAll() {
    if (state.abortController) {
      state.abortController.abort();
    }
    update({ generating: false, autoRun: false, currentSpeaker: null, abortController: null });
  },

  addToast(message: string, type: ToastItem["type"] = "info") {
    const toast: ToastItem = { id: uid(), message, type };
    update({ toasts: [...state.toasts, toast] });
    setTimeout(() => {
      update({ toasts: state.toasts.filter((t) => t.id !== toast.id) });
    }, 4000);
  },

  removeToast(id: string) {
    update({ toasts: state.toasts.filter((t) => t.id !== id) });
  },
};

/* ─── Hook ───────────────────────────────────────────── */

export function useWritingStore() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const session = snap.sessions.find((s) => s.id === snap.activeSessionId) ?? null;
  return { ...snap, session, actions: storeActions };
}
