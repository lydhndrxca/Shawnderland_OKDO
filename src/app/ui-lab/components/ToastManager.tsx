"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle, Info, XCircle, X } from "lucide-react";

type ToastLevel = "info" | "success" | "warning" | "error";

interface Toast {
  id: number;
  message: string;
  level: ToastLevel;
  fading: boolean;
}

interface ToastContextValue {
  info: (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let _toastId = 0;

const LEVEL_CONFIG: Record<ToastLevel, { icon: typeof Info; bg: string; border: string }> = {
  info: { icon: Info, bg: "var(--color-surface)", border: "var(--color-tool-ui)" },
  success: { icon: CheckCircle, bg: "var(--color-surface)", border: "var(--color-success)" },
  warning: { icon: AlertCircle, bg: "var(--color-surface)", border: "#e8b84a" },
  error: { icon: XCircle, bg: "var(--color-surface)", border: "var(--color-destructive)" },
};

const TOAST_DURATION = 4000;
const FADE_DURATION = 300;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, level: ToastLevel) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, message, level, fading: false }]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, fading: true } : t)),
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, FADE_DURATION);
    }, TOAST_DURATION);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, fading: true } : t)),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, FADE_DURATION);
  }, []);

  const api: ToastContextValue = {
    info: useCallback((m: string) => addToast(m, "info"), [addToast]),
    success: useCallback((m: string) => addToast(m, "success"), [addToast]),
    warning: useCallback((m: string) => addToast(m, "warning"), [addToast]),
    error: useCallback((m: string) => addToast(m, "error"), [addToast]),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[10001] flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.map((toast) => {
          const config = LEVEL_CONFIG[toast.level];
          const Icon = config.icon;
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-2 px-3 py-2.5 rounded-lg shadow-lg transition-all"
              style={{
                background: config.bg,
                borderLeft: `3px solid ${config.border}`,
                border: `1px solid var(--color-border)`,
                borderLeftWidth: 3,
                borderLeftColor: config.border,
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                minWidth: 280,
                maxWidth: 400,
                opacity: toast.fading ? 0 : 1,
                transform: toast.fading ? "translateX(20px)" : "translateX(0)",
                transition: `opacity ${FADE_DURATION}ms, transform ${FADE_DURATION}ms`,
              }}
            >
              <Icon
                className="h-4 w-4 shrink-0 mt-0.5"
                style={{ color: config.border }}
              />
              <span className="text-xs flex-1" style={{ color: "var(--color-text-primary)" }}>
                {toast.message}
              </span>
              <button
                onClick={() => dismiss(toast.id)}
                className="shrink-0 p-0.5 rounded hover:bg-[var(--color-hover)] transition-colors"
                style={{ color: "var(--color-text-muted)" }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
