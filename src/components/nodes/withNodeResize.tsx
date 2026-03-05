"use client";

/**
 * Debug HOC — adds edge-grab resize handles to any React Flow node.
 * Wrap node types at registration time:
 *   const resizableTypes = applyResizeToAll(nodeTypes);
 *
 * Toggle off by removing the wrapper call when no longer needed.
 */

import React, { memo, useCallback } from 'react';
import { NodeResizer, useReactFlow } from '@xyflow/react';
import './ui/UINodes.css';

const MIN_W = 80;
const MIN_H = 40;

export function withNodeResize<P extends { id: string; selected?: boolean }>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  const Wrapped = memo(function ResizableNode(props: P) {
    const { setNodes } = useReactFlow();
    const { id, selected } = props;

    const onResize = useCallback(
      (_: unknown, params: { width: number; height: number }) => {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id
              ? {
                  ...n,
                  style: {
                    ...n.style,
                    width: Math.round(params.width),
                    height: Math.round(params.height),
                  },
                }
              : n,
          ),
        );
      },
      [id, setNodes],
    );

    return (
      <>
        <NodeResizer
          minWidth={MIN_W}
          minHeight={MIN_H}
          isVisible={!!selected}
          onResize={onResize}
          lineClassName="ui-resize-line"
          handleClassName="ui-resize-handle"
        />
        <Component {...props} />
      </>
    );
  });

  Wrapped.displayName = `Resizable(${
    (Component as { displayName?: string }).displayName ||
    Component.name ||
    'Node'
  })`;

  return Wrapped as unknown as React.ComponentType<P>;
}

/**
 * Wrap every node type in a record with resize handles.
 * Usage: const nodeTypes = applyResizeToAll(RAW_NODE_TYPES);
 */
export function applyResizeToAll<T extends Record<string, React.ComponentType<any>>>(
  types: T,
): T {
  const result: Record<string, React.ComponentType<any>> = {};
  for (const [key, Comp] of Object.entries(types)) {
    result[key] = withNodeResize(Comp);
  }
  return result as T;
}
