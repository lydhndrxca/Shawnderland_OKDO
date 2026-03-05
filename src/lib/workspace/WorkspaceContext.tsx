"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  forwardRef,
} from "react";
import { usePathname } from "next/navigation";

interface WorkspaceContextValue {
  activePath: string;
  visitedPaths: string[];
  resetKeys: Record<string, number>;
  navigate: (path: string) => void;
  resetTool: (pathPrefix: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx)
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const initialPath = usePathname();
  const [activePath, setActivePath] = useState(initialPath);
  const [visitedSet, setVisitedSet] = useState<Set<string>>(
    () => new Set([initialPath])
  );
  const [resetKeys, setResetKeys] = useState<Record<string, number>>({});
  const activePathRef = useRef(activePath);
  activePathRef.current = activePath;

  const navigate = useCallback((path: string) => {
    setActivePath(path);
    setVisitedSet((prev) => {
      if (prev.has(path)) return prev;
      const next = new Set(prev);
      next.add(path);
      return next;
    });
    window.history.pushState(null, "", path);
  }, []);

  const resetTool = useCallback((pathPrefix: string) => {
    const currentPath = activePathRef.current;
    setVisitedSet((prev) => {
      const next = new Set<string>();
      for (const p of prev) {
        if (p === pathPrefix || p.startsWith(pathPrefix + "/")) continue;
        next.add(p);
      }
      next.add(currentPath);
      return next;
    });
    setResetKeys((prev) => ({
      ...prev,
      [pathPrefix]: (prev[pathPrefix] || 0) + 1,
    }));
  }, []);

  useEffect(() => {
    function handlePopState() {
      const path = window.location.pathname;
      setActivePath(path);
      setVisitedSet((prev) => {
        if (prev.has(path)) return prev;
        const next = new Set(prev);
        next.add(path);
        return next;
      });
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    setVisitedSet((prev) => {
      if (prev.has(activePath)) return prev;
      const next = new Set(prev);
      next.add(activePath);
      return next;
    });
  }, [activePath]);

  return (
    <WorkspaceContext.Provider
      value={{
        activePath,
        visitedPaths: Array.from(visitedSet),
        resetKeys,
        navigate,
        resetTool,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

interface WorkspaceLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  children: React.ReactNode;
}

export const WorkspaceLink = forwardRef<HTMLAnchorElement, WorkspaceLinkProps>(
  function WorkspaceLink({ href, onClick, children, ...props }, ref) {
    const { navigate } = useWorkspace();
    return (
      <a
        ref={ref}
        href={href}
        onClick={(e) => {
          e.preventDefault();
          navigate(href);
          onClick?.(e);
        }}
        {...props}
      >
        {children}
      </a>
    );
  }
);
