export type SourceType = "episode-analysis" | "interview" | "technique" | "critical-essay" | "production-notes";

export type StructuralPosition =
  | "opening"
  | "escalation"
  | "peak-absurdity"
  | "emotional-turn"
  | "closing"
  | "setup"
  | "payoff"
  | "silence-beat"
  | "meta-layer";

export interface ChunkMetadata {
  episode?: string;
  show?: string;
  year?: number;
  themes?: string[];
  structuralPosition?: StructuralPosition;
}

export interface CorpusChunk {
  id: string;
  source: string;
  sourceType: SourceType;
  section: string;
  text: string;
  embedding: number[];
  metadata: ChunkMetadata;
}

export interface RawCorpusFile {
  filename: string;
  sourceType: SourceType;
  title: string;
  show?: string;
  year?: number;
  text: string;
}
