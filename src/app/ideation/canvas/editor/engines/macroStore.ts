import type { EditorMacro } from '../types';

const STORAGE_KEY = 'ge-macros';

const BUILTIN_MACROS: EditorMacro[] = [
  { id: 'fix-hands', name: 'Fix Hands', prompt: 'Fix the hands — correct finger count, proportions, and natural positioning. Preserve everything else exactly.', builtin: true },
  { id: 'sharpen-details', name: 'Sharpen Details', prompt: 'Sharpen all details — enhance texture definition, edge clarity, and fine detail across the entire image without changing content.', builtin: true },
  { id: 'add-rim-light', name: 'Add Rim Light', prompt: 'Add subtle rim lighting to separate the subject from the background. Preserve all content and composition.', builtin: true },
  { id: 'clean-artifacts', name: 'Clean Artifacts', prompt: 'Remove all visual artifacts, noise, banding, and compression damage. Preserve all content exactly.', builtin: true },
  { id: 'remove-text', name: 'Remove Text/Watermarks', prompt: 'Remove all text, watermarks, logos, and labels from the image. Fill naturally with what would be behind them.', builtin: true },
  { id: 'fix-eyes', name: 'Fix Eyes', prompt: 'Fix the eyes — ensure symmetry, consistent iris color, proper highlights, and natural appearance. Preserve everything else.', builtin: true },
  { id: 'enhance-lighting', name: 'Enhance Lighting', prompt: 'Improve the lighting — add depth with better key/fill balance, soft shadows, and natural highlights. Keep content identical.', builtin: true },
  { id: 'smooth-skin', name: 'Smooth Skin', prompt: 'Smooth skin texture while preserving pores and natural appearance. Remove blemishes and artifacts. Keep everything else identical.', builtin: true },
];

export function loadMacros(): EditorMacro[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const custom = JSON.parse(raw) as EditorMacro[];
      return [...BUILTIN_MACROS, ...custom];
    }
  } catch { /* ignore */ }
  return [...BUILTIN_MACROS];
}

export function saveCustomMacro(macro: Omit<EditorMacro, 'id'>): EditorMacro {
  const id = `custom-${Date.now()}`;
  const entry: EditorMacro = { ...macro, id };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: EditorMacro[] = raw ? JSON.parse(raw) : [];
    existing.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch { /* ignore */ }
  return entry;
}

export function deleteCustomMacro(id: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const existing: EditorMacro[] = JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((m) => m.id !== id)));
  } catch { /* ignore */ }
}

export { BUILTIN_MACROS };
