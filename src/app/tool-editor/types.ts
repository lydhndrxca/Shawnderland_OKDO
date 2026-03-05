/* ────────────────────────────────────────
   Tool-Editor shared types
   ──────────────────────────────────────── */

export type TENodeKind = 'generic' | 'window' | 'frame' | 'button' | 'textbox' | 'dropdown' | 'image';

export interface TEPort {
  id: string;
  label: string;
  side: 'left' | 'right' | 'top' | 'bottom';
}

export interface TEDropdown {
  id: string;
  label: string;
  options: string[];
}

export type TEGenericData = {
  kind: 'generic';
  label: string;
  description: string;
  inputs: TEPort[];
  outputs: TEPort[];
  dropdowns: TEDropdown[];
  width: number;
  height: number;
  color: string;
  [key: string]: unknown;
};

export type TEWindowData = {
  kind: 'window';
  label: string;
  description: string;
  inputs: TEPort[];
  outputs: TEPort[];
  width: number;
  height: number;
  color: string;
  [key: string]: unknown;
};

export type TEFrameData = {
  kind: 'frame';
  label: string;
  description: string;
  width: number;
  height: number;
  color: string;
  [key: string]: unknown;
};

export type TEButtonData = {
  kind: 'button';
  label: string;
  description: string;
  width: number;
  height: number;
  color: string;
  [key: string]: unknown;
};

export type TETextBoxData = {
  kind: 'textbox';
  label: string;
  description: string;
  placeholder: string;
  width: number;
  height: number;
  color: string;
  [key: string]: unknown;
};

export type TEDropdownData = {
  kind: 'dropdown';
  label: string;
  description: string;
  options: string[];
  width: number;
  height: number;
  color: string;
  [key: string]: unknown;
};

export type TEImageData = {
  kind: 'image';
  label: string;
  description: string;
  alt: string;
  width: number;
  height: number;
  color: string;
  [key: string]: unknown;
};

export type TENodeData = TEGenericData | TEWindowData | TEFrameData | TEButtonData | TETextBoxData | TEDropdownData | TEImageData;

export interface TEEdgeExport {
  id: string;
  source: string;
  sourceHandle: string | null;
  target: string;
  targetHandle: string | null;
  label?: string;
}

export interface TENodeExport {
  id: string;
  kind: TENodeKind;
  label: string;
  description: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  color: string;
  inputs?: TEPort[];
  outputs?: TEPort[];
  dropdowns?: TEDropdown[];
  placeholder?: string;
  options?: string[];
  alt?: string;
}

export interface TEExport {
  version: 1;
  exportedAt: string;
  gridSize: number;
  nodes: TENodeExport[];
  edges: TEEdgeExport[];
}
