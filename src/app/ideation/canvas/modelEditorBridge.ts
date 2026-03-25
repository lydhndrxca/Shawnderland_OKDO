/**
 * Bridge between UE3DViewerNode (inside React Flow) and the canvas host (overlay host).
 * Same pattern as geminiEditorBridge — simple callback ref avoids globals and timing issues.
 */

let _openCallback: ((nodeId: string) => void) | null = null;

export function registerModelEditorOpener(cb: (nodeId: string) => void) {
  _openCallback = cb;
}

export function unregisterModelEditorOpener() {
  _openCallback = null;
}

export function requestOpenModelEditor(nodeId: string) {
  if (_openCallback) _openCallback(nodeId);
}
