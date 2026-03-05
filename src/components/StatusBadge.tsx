"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { checkHealth } from "@/lib/tool-client";

interface StatusBadgeProps {
  toolId: string;
  showLabel?: boolean;
  className?: string;
}

export function StatusBadge({
  toolId,
  showLabel = true,
  className,
}: StatusBadgeProps) {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      const ok = await checkHealth(toolId);
      if (mounted) setOnline(ok);
    }

    poll();
    const interval = setInterval(poll, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [toolId]);

  const label =
    online === null ? "Checking" : online ? "Connected" : "Not running";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        online === null && "text-muted-foreground",
        online === true && "text-success",
        online === false && "text-muted-foreground/60",
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          online === null && "bg-muted-foreground animate-pulse",
          online === true && "bg-success",
          online === false && "bg-muted-foreground/40"
        )}
      />
      {showLabel && label}
    </span>
  );
}
