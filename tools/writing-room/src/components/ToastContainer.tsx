"use client";

import type { ToastItem } from "../types";

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const TYPE_COLORS: Record<ToastItem["type"], string> = {
  info: "#3b82f6",
  success: "#22c55e",
  error: "#ef4444",
  warning: "#f59e0b",
};

export function ToastContainer({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: "#1e1e2e",
            border: `1px solid ${TYPE_COLORS[t.type]}`,
            borderLeft: `4px solid ${TYPE_COLORS[t.type]}`,
            color: "#e0e0e0",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 13,
            maxWidth: 360,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
          onClick={() => onDismiss(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
