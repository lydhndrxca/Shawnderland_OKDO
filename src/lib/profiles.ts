import type { AppProfile, ToolRegistryEntry } from "./types";

const LS_KEY = "shawnderland-profile";

export type ProfileMode = AppProfile | "all";

let listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function getActiveProfile(): ProfileMode {
  if (typeof window === "undefined") return "all";
  return (localStorage.getItem(LS_KEY) as ProfileMode) || "all";
}

export function setActiveProfile(mode: ProfileMode) {
  localStorage.setItem(LS_KEY, mode);
  notify();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isToolVisible(tool: ToolRegistryEntry, mode?: ProfileMode): boolean {
  if (tool.hidden) return false;
  const profile = mode ?? getActiveProfile();
  if (profile === "all") return true;
  if (!tool.profiles || tool.profiles.length === 0) return true;
  return tool.profiles.includes(profile);
}

export function getVisibleTools(
  tools: ToolRegistryEntry[],
  mode?: ProfileMode,
): ToolRegistryEntry[] {
  return tools.filter((t) => isToolVisible(t, mode));
}

export const PROFILE_OPTIONS: { id: ProfileMode; label: string }[] = [
  { id: "all", label: "All Apps" },
  { id: "work", label: "Work" },
  { id: "personal", label: "Personal" },
];
