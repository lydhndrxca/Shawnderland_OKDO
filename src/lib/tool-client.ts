import type { ToolResponse } from "./types";

export async function fetchTool<T = unknown>(
  toolId: string,
  endpoint: string,
  options?: RequestInit
): Promise<ToolResponse<T>> {
  const url = `/api/tools/${toolId}/${endpoint.replace(/^\//, "")}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      return {
        status: "error",
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    return { status: "ok", result: data as T };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function checkHealth(toolId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tools/${toolId}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
