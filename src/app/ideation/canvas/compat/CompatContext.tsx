"use client";

import { createContext, useContext } from 'react';
import type { CompatError } from '@/lib/ideation/engine/nodeCompatibility';

const CompatCtx = createContext<Map<string, CompatError[]>>(new Map());

export function CompatProvider({
  errors,
  children,
}: {
  errors: Map<string, CompatError[]>;
  children: React.ReactNode;
}) {
  return <CompatCtx.Provider value={errors}>{children}</CompatCtx.Provider>;
}

export function useCompatErrors(nodeId: string): CompatError[] {
  const map = useContext(CompatCtx);
  return map.get(nodeId) ?? [];
}
