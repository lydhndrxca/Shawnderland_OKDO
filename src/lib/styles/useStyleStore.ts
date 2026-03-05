"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  getAllStyles,
  saveStyle,
  updateStyle,
  deleteStyle,
  importStyles,
  exportStyles,
  type StylePreset,
} from './styleStore';

const CHANGE_EVENT = 'shawnderland-style-change';

function broadcast() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function useStyleStore() {
  const [styles, setStyles] = useState<StylePreset[]>([]);

  const refresh = useCallback(() => {
    setStyles(getAllStyles());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => window.removeEventListener(CHANGE_EVENT, refresh);
  }, [refresh]);

  const add = useCallback((preset: Omit<StylePreset, 'id' | 'createdAt'>) => {
    const created = saveStyle(preset);
    broadcast();
    return created;
  }, []);

  const update = useCallback((id: string, updates: Partial<Omit<StylePreset, 'id' | 'createdAt'>>) => {
    const ok = updateStyle(id, updates);
    if (ok) broadcast();
    return ok;
  }, []);

  const remove = useCallback((id: string) => {
    const ok = deleteStyle(id);
    if (ok) broadcast();
    return ok;
  }, []);

  const doImport = useCallback((json: string) => {
    const count = importStyles(json);
    if (count > 0) broadcast();
    return count;
  }, []);

  const doExport = useCallback(() => exportStyles(), []);

  return { styles, add, update, remove, importStyles: doImport, exportStyles: doExport, refresh };
}
