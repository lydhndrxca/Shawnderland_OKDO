/**
 * Bridge between GeminiEditorNode (inside React Flow) and FlowCanvas (overlay host).
 * Avoids window globals and CustomEvent timing issues by using a simple callback ref.
 */

let _openCallback: ((nodeId: string) => void) | null = null;

export function registerEditorOpener(cb: (nodeId: string) => void) {
  _openCallback = cb;
}

export function unregisterEditorOpener() {
  _openCallback = null;
}

export function requestOpenEditor(nodeId: string) {
  if (_openCallback) _openCallback(nodeId);
}
