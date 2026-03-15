export type SourceType =
  | "episode-analysis"
  | "interview"
  | "technique"
  | "stand-up"
  | "critical-essay";

export type StructuralPosition =
  | "opening-lesson"
  | "tangent"
  | "emotional-turn"
  | "quiet-moment"
  | "community-moment"
  | "closing-reflection"
  | "setup"
  | "payoff"
  | "observation";

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
