import { useSyncExternalStore } from "react";
import type {
  WalterProject, Shot, Beat, ShotType, CameraMove, TransitionType,
  TabId, ToastItem, IdeaCard, ToneMood, EpisodeConstraints, PremiseConcept,
} from "./types";
import { ARC_TEMPLATES } from "./arcTemplates";

function uid() {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const LS_KEY = "walter-projects";
const LS_ACTIVE = "walter-active-project";

function loadProjects(): WalterProject[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const projects: WalterProject[] = JSON.parse(raw);
    return projects.map(migrateProject);
  } catch {
    return [];
  }
}

function migrateProject(p: WalterProject): WalterProject {
  return {
    ...p,
    tone: p.tone ?? "",
    runtimePresetId: p.runtimePresetId ?? "standard-reel",
    steeringPrompt: p.steeringPrompt ?? "",
    constraints: p.constraints ?? {
      allowedCharacters: [],
      allowedLocations: [],
      easyToFilm: false,
      shotDensity: "normal",
      narrationHeavy: false,
      dialogueHeavy: false,
    },
    selectedPremise: p.selectedPremise ?? null,
    beats: (p.beats ?? []).map((b) => ({
      ...b,
      storyGoal: (b as Beat).storyGoal ?? "",
      tone: (b as Beat).tone ?? "",
    })),
    shots: (p.shots ?? []).map((s) => ({
      ...s,
      purpose: (s as Shot).purpose ?? "",
      characters: (s as Shot).characters ?? [],
      location: (s as Shot).location ?? "",
    })),
  };
}

function saveProjects(projects: WalterProject[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(projects));
}

interface StoreState {
  projects: WalterProject[];
  activeProjectId: string | null;
  selectedShotId: string | null;
  selectedBeatId: string | null;
  activeTab: TabId;
  playheadMs: number;
  toasts: ToastItem[];
  ideas: IdeaCard[];
  seedPrompt: string;
}

let state: StoreState = {
  projects: loadProjects(),
  activeProjectId: localStorage.getItem(LS_ACTIVE) || null,
  selectedShotId: null,
  selectedBeatId: null,
  activeTab: "episode",
  playheadMs: 0,
  toasts: [],
  ideas: [],
  seedPrompt: "",
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

function persistProjects() {
  saveProjects(state.projects);
}

function getActiveProject(): WalterProject | undefined {
  return state.projects.find((p) => p.id === state.activeProjectId);
}

function updateProject(id: string, updater: (p: WalterProject) => WalterProject) {
  const projects = state.projects.map((p) =>
    p.id === id ? updater({ ...p, updatedAt: Date.now() }) : p
  );
  update({ projects });
  persistProjects();
}

function defaultShot(beatId: string, order: number, totalShots: number): Shot {
  return {
    id: uid(),
    beatId,
    title: `Shot ${totalShots + 1}`,
    description: "",
    dialogue: "",
    voiceOver: "",
    shotType: "medium",
    cameraMove: "static",
    transition: "cut",
    durationSec: 3,
    thumbnailUrl: "",
    audioNote: "",
    sfxNote: "",
    order,
    visualDescription: "",
    narration: "",
    onScreenText: "",
    soundNotes: "",
    purpose: "",
    characters: [],
    location: "",
  };
}

export const walterActions = {
  createProject(
    name: string,
    arcTemplateId: string,
    opts?: {
      tone?: ToneMood;
      runtimePresetId?: string;
      steeringPrompt?: string;
      constraints?: EpisodeConstraints;
      selectedPremise?: PremiseConcept;
      durationMs?: number;
    }
  ) {
    const template = ARC_TEMPLATES.find((t) => t.id === arcTemplateId);
    const totalMs = opts?.durationMs ?? 60000;
    const beatCount = template?.beats.length || 1;
    const msPerBeat = totalMs / beatCount;
    const beats: Beat[] = (template?.beats ?? []).map((b, i) => ({
      ...b,
      id: uid(),
      order: i,
      startMs: Math.round(i * msPerBeat),
      endMs: Math.round((i + 1) * msPerBeat),
      breakdown: "",
      storyGoal: "",
      tone: "",
    }));
    const project: WalterProject = {
      id: uid(),
      name,
      description: opts?.selectedPremise?.premise ?? "",
      arcTemplateId,
      beats,
      shots: [],
      aspectRatio: "9:16",
      fps: 30,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      storyOverview: opts?.selectedPremise?.premise ?? "",
      tone: opts?.tone ?? "",
      runtimePresetId: opts?.runtimePresetId ?? "standard-reel",
      steeringPrompt: opts?.steeringPrompt ?? "",
      constraints: opts?.constraints ?? {
        allowedCharacters: [],
        allowedLocations: [],
        easyToFilm: false,
        shotDensity: "normal",
        narrationHeavy: false,
        dialogueHeavy: false,
      },
      selectedPremise: opts?.selectedPremise ?? null,
    };
    const projects = [...state.projects, project];
    update({
      projects,
      activeProjectId: project.id,
      selectedShotId: null,
      selectedBeatId: null,
      activeTab: "episode",
    });
    localStorage.setItem(LS_ACTIVE, project.id);
    persistProjects();
    return project.id;
  },

  openProject(id: string) {
    update({ activeProjectId: id, selectedShotId: null, selectedBeatId: null, activeTab: "episode" });
    localStorage.setItem(LS_ACTIVE, id);
  },

  deleteProject(id: string) {
    const projects = state.projects.filter((p) => p.id !== id);
    const activeProjectId =
      state.activeProjectId === id ? (projects[0]?.id ?? null) : state.activeProjectId;
    update({ projects, activeProjectId, selectedShotId: null, selectedBeatId: null });
    localStorage.setItem(LS_ACTIVE, activeProjectId ?? "");
    persistProjects();
  },

  updateProjectMeta(
    fields: Partial<Pick<WalterProject,
      "name" | "description" | "aspectRatio" | "fps" | "storyOverview" |
      "tone" | "runtimePresetId" | "steeringPrompt" | "constraints" | "selectedPremise"
    >>
  ) {
    const p = getActiveProject();
    if (!p) return;
    updateProject(p.id, (proj) => ({ ...proj, ...fields }));
  },

  setActiveTab(tab: TabId) {
    update({ activeTab: tab });
  },

  selectShot(id: string | null) {
    update({ selectedShotId: id });
  },

  selectBeat(id: string | null) {
    update({ selectedBeatId: id });
  },

  setPlayhead(ms: number) {
    update({ playheadMs: Math.max(0, ms) });
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

  addBeat(label: string) {
    const p = getActiveProject();
    if (!p) return;
    const totalMs = p.shots.reduce((sum, s) => sum + s.durationSec * 1000, 0) || 60000;
    const beat: Beat = {
      id: uid(),
      label,
      description: "",
      color: "#64748b",
      order: p.beats.length,
      startMs: totalMs,
      endMs: totalMs + 5000,
      breakdown: "",
      storyGoal: "",
      tone: "",
    };
    updateProject(p.id, (proj) => ({ ...proj, beats: [...proj.beats, beat] }));
    return beat.id;
  },

  updateBeat(beatId: string, fields: Partial<Omit<Beat, "id">>) {
    const p = getActiveProject();
    if (!p) return;
    updateProject(p.id, (proj) => ({
      ...proj,
      beats: proj.beats.map((b) => (b.id === beatId ? { ...b, ...fields } : b)),
    }));
  },

  deleteBeat(beatId: string) {
    const p = getActiveProject();
    if (!p) return;
    updateProject(p.id, (proj) => ({
      ...proj,
      beats: proj.beats.filter((b) => b.id !== beatId).map((b, i) => ({ ...b, order: i })),
      shots: proj.shots.filter((s) => s.beatId !== beatId),
    }));
    if (state.selectedBeatId === beatId) update({ selectedBeatId: null });
  },

  addShot(beatId: string) {
    const p = getActiveProject();
    if (!p) return;
    const shotsInBeat = p.shots.filter((s) => s.beatId === beatId);
    const shot = defaultShot(beatId, shotsInBeat.length, p.shots.length);
    updateProject(p.id, (proj) => ({ ...proj, shots: [...proj.shots, shot] }));
    update({ selectedShotId: shot.id });
    return shot.id;
  },

  updateShot(shotId: string, fields: Partial<Omit<Shot, "id">>) {
    const p = getActiveProject();
    if (!p) return;
    updateProject(p.id, (proj) => ({
      ...proj,
      shots: proj.shots.map((s) => (s.id === shotId ? { ...s, ...fields } : s)),
    }));
  },

  deleteShot(shotId: string) {
    const p = getActiveProject();
    if (!p) return;
    updateProject(p.id, (proj) => ({
      ...proj,
      shots: proj.shots.filter((s) => s.id !== shotId),
    }));
    if (state.selectedShotId === shotId) update({ selectedShotId: null });
  },

  duplicateShot(shotId: string) {
    const p = getActiveProject();
    if (!p) return;
    const source = p.shots.find((s) => s.id === shotId);
    if (!source) return;
    const shot: Shot = {
      ...source,
      id: uid(),
      title: source.title + " (copy)",
      order: p.shots.filter((s) => s.beatId === source.beatId).length,
    };
    updateProject(p.id, (proj) => ({ ...proj, shots: [...proj.shots, shot] }));
    update({ selectedShotId: shot.id });
  },

  reorderShots(beatId: string, orderedIds: string[]) {
    const p = getActiveProject();
    if (!p) return;
    updateProject(p.id, (proj) => ({
      ...proj,
      shots: proj.shots.map((s) => {
        if (s.beatId !== beatId) return s;
        const idx = orderedIds.indexOf(s.id);
        return idx >= 0 ? { ...s, order: idx } : s;
      }),
    }));
  },

  applyArcTemplate(arcTemplateId: string, durationMs?: number) {
    const p = getActiveProject();
    if (!p) return;
    const template = ARC_TEMPLATES.find((t) => t.id === arcTemplateId);
    if (!template) return;
    const totalMs = durationMs ?? 60000;
    const beatCount = template.beats.length || 1;
    const msPerBeat = totalMs / beatCount;
    const beats: Beat[] = template.beats.map((b, i) => ({
      ...b,
      id: uid(),
      order: i,
      startMs: Math.round(i * msPerBeat),
      endMs: Math.round((i + 1) * msPerBeat),
      breakdown: "",
      storyGoal: "",
      tone: "",
    }));
    updateProject(p.id, (proj) => ({
      ...proj,
      arcTemplateId,
      beats,
      shots: [],
      storyOverview: "",
    }));
    update({ selectedShotId: null, selectedBeatId: null });
  },

  updateBeatTiming(beatId: string, startMs: number, endMs: number) {
    const p = getActiveProject();
    if (!p) return;
    updateProject(p.id, (proj) => ({
      ...proj,
      beats: proj.beats.map((b) =>
        b.id === beatId ? { ...b, startMs, endMs } : b
      ),
    }));
  },

  setSeedPrompt(prompt: string) {
    update({ seedPrompt: prompt });
  },

  setIdeas(ideas: IdeaCard[]) {
    update({ ideas });
  },

  toggleStarIdea(id: string) {
    update({
      ideas: state.ideas.map((i) =>
        i.id === id ? { ...i, starred: !i.starred } : i
      ),
    });
  },

  removeIdea(id: string) {
    update({ ideas: state.ideas.filter((i) => i.id !== id) });
  },

  createProjectFromStructure(input: {
    name: string;
    description: string;
    arcTemplateId: string;
    aspectRatio?: WalterProject["aspectRatio"];
    beats: Array<{ label: string; description: string; color: string }>;
    shots: Array<{
      beatIndex: number;
      title: string;
      description: string;
      durationSec: number;
      shotType?: string;
      cameraMove?: string;
      transition?: string;
      dialogue?: string;
      voiceOver?: string;
      audioNote?: string;
      sfxNote?: string;
    }>;
  }): string {
    const totalMs = input.shots.reduce((sum, s) => sum + s.durationSec * 1000, 0) || 60000;
    const beatCount = input.beats.length || 1;
    const msPerBeat = totalMs / beatCount;

    const beats: Beat[] = input.beats.map((b, i) => ({
      id: uid(),
      label: b.label,
      description: b.description,
      color: b.color,
      order: i,
      startMs: Math.round(i * msPerBeat),
      endMs: Math.round((i + 1) * msPerBeat),
      breakdown: "",
      storyGoal: "",
      tone: "",
    }));

    const shots: Shot[] = input.shots.map((s, i) => ({
      id: uid(),
      beatId: beats[Math.min(s.beatIndex, beats.length - 1)]?.id ?? beats[0]?.id ?? "",
      title: s.title,
      description: s.description,
      dialogue: s.dialogue ?? "",
      voiceOver: s.voiceOver ?? "",
      shotType: (s.shotType ?? "medium") as ShotType,
      cameraMove: (s.cameraMove ?? "static") as CameraMove,
      transition: (s.transition ?? "cut") as TransitionType,
      durationSec: s.durationSec,
      thumbnailUrl: "",
      audioNote: s.audioNote ?? "",
      sfxNote: s.sfxNote ?? "",
      order: i,
      visualDescription: s.description,
      narration: s.voiceOver ?? "",
      onScreenText: "",
      soundNotes: s.sfxNote ?? "",
      purpose: "",
      characters: [],
      location: "",
    }));

    const project: WalterProject = {
      id: uid(),
      name: input.name,
      description: input.description,
      arcTemplateId: input.arcTemplateId,
      beats,
      shots,
      aspectRatio: input.aspectRatio ?? "9:16",
      fps: 30,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      storyOverview: "",
      tone: "",
      runtimePresetId: "standard-reel",
      steeringPrompt: "",
      constraints: {
        allowedCharacters: [],
        allowedLocations: [],
        easyToFilm: false,
        shotDensity: "normal",
        narrationHeavy: false,
        dialogueHeavy: false,
      },
      selectedPremise: null,
    };
    const projects = [...state.projects, project];
    update({ projects, activeProjectId: project.id, selectedShotId: null, selectedBeatId: null });
    localStorage.setItem(LS_ACTIVE, project.id);
    persistProjects();
    return project.id;
  },

  exportCapCutJson(): string {
    const p = getActiveProject();
    if (!p) return "{}";
    const sortedBeats = [...p.beats].sort((a, b) => a.order - b.order);
    let offsetMs = 0;
    const tracks = sortedBeats.flatMap((beat) => {
      const shots = [...p.shots]
        .filter((s) => s.beatId === beat.id)
        .sort((a, b) => a.order - b.order);
      return shots.map((shot) => {
        const durationMs = shot.durationSec * 1000;
        const entry = {
          type: "video",
          name: shot.title,
          description: shot.description || shot.visualDescription,
          beat: beat.label,
          shotType: shot.shotType,
          cameraMove: shot.cameraMove,
          transition: shot.transition,
          dialogue: shot.dialogue,
          voiceOver: shot.voiceOver || shot.narration,
          sfx: shot.sfxNote || shot.soundNotes,
          audio: shot.audioNote,
          onScreenText: shot.onScreenText,
          startMs: offsetMs,
          endMs: offsetMs + durationMs,
          durationMs,
        };
        offsetMs += durationMs;
        return entry;
      });
    });
    return JSON.stringify(
      {
        projectName: p.name,
        description: p.description,
        aspectRatio: p.aspectRatio,
        fps: p.fps,
        totalDurationMs: offsetMs,
        tracks,
      },
      null,
      2
    );
  },
};

export function useWalterStore() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const project = snap.projects.find((p) => p.id === snap.activeProjectId) ?? null;
  const selectedShot = project?.shots.find((s) => s.id === snap.selectedShotId) ?? null;
  const selectedBeat = project?.beats.find((b) => b.id === snap.selectedBeatId) ?? null;

  return {
    ...snap,
    project,
    selectedShot,
    selectedBeat,
    actions: walterActions,
  };
}
