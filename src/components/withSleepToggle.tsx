"use client";

import { memo, type ComponentType } from 'react';
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

    return (
      <div
        className={sleeping ? 'node-sleep-wrapper node-sleeping' : 'node-sleep-wrapper'}
      >
        <WrappedNode {...props} />
      </div>
    );
  }

  SleepWrapper.displayName = `Sleep(${WrappedNode.displayName || WrappedNode.name || 'Node'})`;
  return memo(SleepWrapper) as unknown as ComponentType<P>;
}
