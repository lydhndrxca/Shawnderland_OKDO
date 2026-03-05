export interface ToolRegistryEntry {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  href: string;
  baseUrl: string;
  accentColor: string;
  accentDim: string;
  features: string[];
  startCommand: string;
  mode: "web" | "desktop" | "electron-only";
}

export interface ToolResponse<T = unknown> {
  status: "ok" | "error" | "running";
  result?: T;
  error?: string;
}
