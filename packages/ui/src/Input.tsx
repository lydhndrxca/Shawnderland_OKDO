"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = "", id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2 text-sm outline-none transition-colors ${className}`}
        style={{
          background: "var(--color-elevated)",
          color: "var(--color-text-primary)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
        }}
        {...props}
      />
    </div>
  );
}
