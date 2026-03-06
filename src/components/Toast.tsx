"use client";

import { useState, useEffect, useCallback } from 'react';
import './Toast.css';

interface ToastMessage {
  id: number;
  text: string;
}

let _nextId = 0;
let _listener: ((msg: ToastMessage) => void) | null = null;

export function showToast(text: string, durationMs = 2500): void {
  const msg: ToastMessage = { id: _nextId++, text };
  _listener?.(msg);
  setTimeout(() => {
    _dismissListener?.(msg.id);
  }, durationMs);
}

let _dismissListener: ((id: number) => void) | null = null;

export function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const handleNew = useCallback((msg: ToastMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleDismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  useEffect(() => {
    _listener = handleNew;
    _dismissListener = handleDismiss;
    return () => {
      _listener = null;
      _dismissListener = null;
    };
  }, [handleNew, handleDismiss]);

  if (messages.length === 0) return null;

  return (
    <div className="toast-container">
      {messages.map((m) => (
        <div key={m.id} className="toast-item">
          {m.text}
        </div>
      ))}
    </div>
  );
}
