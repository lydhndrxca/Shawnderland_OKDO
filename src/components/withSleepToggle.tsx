"use client";

import { memo, useCallback, type ComponentType } from 'react';
import { useReactFlow } from '@xyflow/react';
import './SleepToggle.css';

interface SleepableProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

export function withSleepToggle<P extends SleepableProps>(
  WrappedNode: ComponentType<P>,
): ComponentType<P> {
  function SleepWrapper(props: P) {
    const sleeping = props.data?._sleeping === true;
    const { setNodes } = useReactFlow();

    const toggle = useCallback(() => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === props.id
            ? { ...n, data: { ...n.data, _sleeping: !sleeping } }
            : n,
        ),
      );
    }, [props.id, sleeping, setNodes]);

    return (
      <div
        className={sleeping ? 'node-sleep-wrapper node-sleeping' : 'node-sleep-wrapper'}
      >
        <button
          type="button"
          className="node-sleep-btn nodrag"
          onClick={toggle}
          title={sleeping ? 'Wake — re-enable this node' : 'Sleep — bypass this node'}
        >
          {sleeping ? 'ZZZ' : 'ON'}
        </button>
        <WrappedNode {...props} />
      </div>
    );
  }

  SleepWrapper.displayName = `Sleep(${WrappedNode.displayName || WrappedNode.name || 'Node'})`;
  return memo(SleepWrapper) as unknown as ComponentType<P>;
}
