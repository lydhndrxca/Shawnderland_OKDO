import { useSyncExternalStore } from "react";
import type {
  WalterSession, PlanningData, ChatMessage, RoomAgent, RoomPhase,
  StoryArcPhase, StoryElement, StagingShot, ScreenId, ToastItem,
  LockedDecision, CreativeRoundId, ProducerEpisodeState,
} from "./types";
import { DEFAULT_PLANNING, DEFAULT_EPISODE_STATE } from "./types";

function uid() {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const LS_SESSIONS = "walter-sessions-v2";
const LS_ACTIVE = "walter-active-session";

/* ─── Persistence ────────────────────────────────────── */

function loadSessions(): WalterSession[] {
  try {
    const raw = localStorage.getItem(LS_SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: WalterSession[]) {
  localStorage.setItem(LS_SESSIONS, JSON.stringify(sessions));
}

/* ─── Default Session ────────────────────────────────── */

function createBlankSession(name = "Untitled Episode"): WalterSession {
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
    episodeState: { ...DEFAULT_EPISODE_STATE },
    storyArc: [],
    storyElements: [],
    shots: [],
    activeScreen: "planning",
    userApproved: false,
  };
}

/* ─── Store State ────────────────────────────────────── */

interface StoreState {
  sessions: WalterSession[];
  activeSessionId: string | null;
  toasts: ToastItem[];
  generating: boolean;
  autoRun: boolean;
}

let state: StoreState = {
  sessions: loadSessions(),
  activeSessionId: localStorage.getItem(LS_ACTIVE) || null,
  toasts: [],
  generating: false,
  autoRun: false,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function getSnapshot(): StoreState {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(partial: Partial<StoreState>) {
  state = { ...state, ...partial };
  emit();
}

function persistSessions() {
  saveSessions(state.sessions);
}

function getActiveSession(): WalterSession | undefined {
  return state.sessions.find((s) => s.id === state.activeSessionId);
}

function updateSession(id: string, updater: (s: WalterSession) => WalterSession) {
  const sessions = state.sessions.map((s) =>
    s.id === id ? updater({ ...s, updatedAt: Date.now() }) : s,
  );
  update({ sessions });
  persistSessions();
}

/* ─── Actions ────────────────────────────────────────── */

export const walterActions = {
  /* Session management */
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
      const imported = JSON.parse(json) as WalterSession;
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

  duplicateSession() {
    const s = getActiveSession();
    if (!s) return;
    const copy: WalterSession = {
      ...JSON.parse(JSON.stringify(s)),
      id: uid(),
      name: s.name + " (copy)",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const sessions = [...state.sessions, copy];
    update({ sessions, activeSessionId: copy.id });
    localStorage.setItem(LS_ACTIVE, copy.id);
    persistSessions();
    return copy.id;
  },

  /* Navigation */
  setScreen(screen: ScreenId) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({ ...sess, activeScreen: screen }));
  },

  /* Planning */
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

  /* Producer */
  setProducerBrief(brief: string) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({ ...sess, producerBrief: brief }));
  },

  /* Writing Room */
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

  /* Staging Room */
  setStoryStructure(
    arc: StoryArcPhase[],
    elements: StoryElement[],
    shots: StagingShot[],
  ) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({
      ...sess,
      storyArc: arc,
      storyElements: elements,
      shots,
    }));
  },

  updateShot(shotId: string, fields: Partial<StagingShot>) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({
      ...sess,
      shots: sess.shots.map((sh) =>
        sh.id === shotId ? { ...sh, ...fields, userEdited: true } : sh,
      ),
    }));
  },

  updateEpisodeState(patch: Partial<ProducerEpisodeState>) {
    const s = getActiveSession();
    if (!s) return;
    updateSession(s.id, (sess) => ({
      ...sess,
      episodeState: { ...sess.episodeState, ...patch },
    }));
  },

  /* Round-Based Writing Room */
  lockDecision(roundId: CreativeRoundId, label: string, value: string, lockedBy: string) {
    const s = getActiveSession();
    if (!s) return;
    const decision: LockedDecision = {
      roundId,
      label,
      value,
      lockedBy,
      lockedAt: Date.now(),
    };
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

  /* UI State */
  setGenerating(generating: boolean) {
    update({ generating });
  },

  setAutoRun(autoRun: boolean) {
    update({ autoRun });
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

export function useWalterStore() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const session = snap.sessions.find((s) => s.id === snap.activeSessionId) ?? null;

  return {
    ...snap,
    session,
    actions: walterActions,
  };
}
