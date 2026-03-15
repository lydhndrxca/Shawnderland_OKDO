export type SourceType = "script" | "narration" | "interview" | "lecture" | "essay";

export type StructuralPosition =
  | "opening"
  | "rising"
  | "crisis"
  | "inversion"
  | "closing"
  | "narration-open"
  | "narration-close"
  | "dialogue"
  | "stage-direction";

export interface ChunkMetadata {
  episode?: string;
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
  year?: number;
  text: string;
}
