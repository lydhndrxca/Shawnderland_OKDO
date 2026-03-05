"use client";

import React from "react";
import { StatusBadge } from "./StatusBadge";
import { WorkspaceLink } from "@/lib/workspace/WorkspaceContext";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface ToolShellProps {
  toolId: string;
  title: string;
  description: string;
  breadcrumbs: Breadcrumb[];
  accentColor: string;
  embed?: boolean;
  children: React.ReactNode;
}

export function ToolShell({
  toolId,
  title,
  description,
  breadcrumbs,
  accentColor,
  embed,
  children,
}: ToolShellProps) {
  return (
    <div className={`flex h-full flex-col ${embed ? "" : "overflow-y-auto"}`}>
      <header
        className="flex items-center justify-between border-b border-border px-6 py-3 shrink-0"
        style={{ borderBottomColor: accentColor + "40" }}
      >
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <WorkspaceLink
              href="/"
              className="hover:text-foreground transition-colors"
            >
              Home
            </WorkspaceLink>
            {breadcrumbs.map((bc, i) => (
              <React.Fragment key={i}>
                <span className="text-muted-foreground/40">/</span>
                {bc.href ? (
                  <WorkspaceLink
                    href={bc.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {bc.label}
                  </WorkspaceLink>
                ) : (
                  <span className="text-foreground/80">{bc.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge toolId={toolId} />
        </div>
      </header>

      {!embed && (
        <div className="px-6 pt-5 pb-2 shrink-0">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      )}

      <div className={embed ? "flex-1 overflow-hidden" : "flex-1 px-6 py-4"}>
        {children}
      </div>
    </div>
  );
}
