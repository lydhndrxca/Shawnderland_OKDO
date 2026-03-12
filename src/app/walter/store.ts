import { useSyncExternalStore } from "react";
import type { WalterProject, Shot, Beat, ShotType, CameraMove, TransitionType } from "./types";
import { ARC_TEMPLATES } from "./arcTemplates";

function uid() {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const LS_KEY = "walter-projects";
const LS_ACTIVE = "walter-active-project";

function loadProjects(): WalterProject[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjects(projects: WalterProject[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(projects));
}

interface StoreState {
  projects: WalterProject[];
  activeProjectId: string | null;
  selectedShotId: string | null;
  selectedBeatId: string | null;
}

let state: StoreState = {
  projects: loadProjects(),
  activeProjectId: localStorage.getItem(LS_ACTIVE) || null,
  selectedShotId: null,
  selectedBeatId: null,
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

export const walterActions = {
  createProject(name: string, arcTemplateId: string) {
    const template = ARC_TEMPLATES.find((t) => t.id === arcTemplateId);
    const beats: Beat[] = (template?.beats ?? []).map((b, i) => ({
      ...b,
      id: uid(),
      order: i,
    }));
    const project: WalterProject = {
      id: uid(),
      name,
      description: "",
      arcTemplateId,
      beats,
      shots: [],
      aspectRatio: "16:9",
      fps: 30,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const projects = [...state.projects, project];
    update({ projects, activeProjectId: project.id, selectedShotId: null, selectedBeatId: null });
    localStorage.setItem(LS_ACTIVE, project.id);
    persistProjects();
    return project.id;
  },

  openProject(id: string) {
    update({ activeProjectId: id, selectedShotId: null, selectedBeatId: null });
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

  updateProjectMeta(fields: Partial<Pick<WalterProject, "name" | "description" | "aspectRatio" | "fps">>) {
    const p = getActiveProject();
    if (!p) return;
    updateProject(p.id, (proj) => ({ ...proj, ...fields }));
  },

  selectShot(id: string | null) {
    update({ selectedShotId: id });
  },

  selectBeat(id: string | null) {
    update({ selectedBeatId: id });
  },

  addBeat(label: string) {
    const p = getActiveProject();
    if (!p) return;
    const beat: Beat = {
      id: uid(),
      label,
      description: "",
      color: "#64748b",
      order: p.beats.length,
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
    const shot: Shot = {
      id: uid(),
      beatId,
      title: `Shot ${p.shots.length + 1}`,
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
      order: shotsInBeat.length,
    };
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

  reorderBeats(orderedIds: string[]) {
    const p = getActiveProject();
    if (!p) return;
    updateProject(p.id, (proj) => ({
      ...proj,
      beats: proj.beats.map((b) => {
        const idx = orderedIds.indexOf(b.id);
        return idx >= 0 ? { ...b, order: idx } : b;
      }),
    }));
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

  applyArcTemplate(arcTemplateId: string) {
    const p = getActiveProject();
    if (!p) return;
    const template = ARC_TEMPLATES.find((t) => t.id === arcTemplateId);
    if (!template) return;
    const beats: Beat[] = template.beats.map((b, i) => ({
      ...b,
      id: uid(),
      order: i,
    }));
    updateProject(p.id, (proj) => ({
      ...proj,
      arcTemplateId,
      beats,
      shots: [],
    }));
    update({ selectedShotId: null, selectedBeatId: null });
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
    const beats: Beat[] = input.beats.map((b, i) => ({
      id: uid(),
      label: b.label,
      description: b.description,
      color: b.color,
      order: i,
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
          description: shot.description,
          beat: beat.label,
          shotType: shot.shotType,
          cameraMove: shot.cameraMove,
          transition: shot.transition,
          dialogue: shot.dialogue,
          voiceOver: shot.voiceOver,
          sfx: shot.sfxNote,
          audio: shot.audioNote,
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
