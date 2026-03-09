/**
 * Global active-request tracker.
 * Any long-running API call can register its AbortController here.
 * The toolbar "Cancel All" button calls cancelAll() to abort every in-flight request.
 */

type Listener = (count: number) => void;

const controllers = new Set<AbortController>();
const listeners = new Set<Listener>();

function notify() {
  const count = controllers.size;
  for (const fn of listeners) fn(count);
}

export function registerRequest(): AbortController {
  const ac = new AbortController();
  controllers.add(ac);
  ac.signal.addEventListener('abort', () => {
    controllers.delete(ac);
    notify();
  });
  notify();
  return ac;
}

export function unregisterRequest(ac: AbortController) {
  controllers.delete(ac);
  notify();
}

export function cancelAll() {
  const snapshot = [...controllers];
  controllers.clear();
  for (const ac of snapshot) {
    try { ac.abort(); } catch { /* ignore */ }
  }
  notify();
}

export function getActiveCount(): number {
  return controllers.size;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
