"use client";

import React from "react";
import { useWalterStore } from "../store";

export function ToastContainer() {
  const { toasts, actions } = useWalterStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.type}`}
          onClick={() => actions.removeToast(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
