"use client";

import React, { memo } from 'react';
import { useCompatErrors } from './CompatContext';
import type { CompatError } from '@/lib/ideation/engine/nodeCompatibility';
import './CompatBanner.css';

function CompatBanner({ errors }: { errors: CompatError[] }) {
  if (errors.length === 0) return null;

  return (
    <div className="compat-banner-container">
      {errors.map((err, i) => (
        <div
          key={i}
          className={`compat-banner compat-${err.severity}`}
          title={err.message}
        >
          <span className="compat-icon">
            {err.severity === 'error' ? '✕' : '⚠'}
          </span>
          <span className="compat-msg">{err.message}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * HOC that wraps a React Flow node component and renders
 * compatibility error banners below the node when issues exist.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withCompatCheck(WrappedNode: React.ComponentType<any>): React.ComponentType<any> {
  const WithCompat = memo(function WithCompat(props: { id: string; [key: string]: unknown }) {
    const errors = useCompatErrors(props.id);

    return (
      <>
        <WrappedNode {...props} />
        <CompatBanner errors={errors} />
      </>
    );
  });

  WithCompat.displayName = `WithCompat(${WrappedNode.displayName || WrappedNode.name || 'Node'})`;
  return WithCompat;
}
