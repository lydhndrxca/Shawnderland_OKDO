"use client";

import type { ToastItem } from "../types";

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div className="ws-toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`ws-toast ws-toast--${t.type}`}
          onClick={() => onDismiss(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
