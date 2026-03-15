export type { CorpusChunk, RawCorpusFile, SourceType, StructuralPosition, ChunkMetadata } from "./corpus/types";

export type { DecisionCategory, DecisionEntry, EpisodeDecisionSet } from "./taxonomy/types";
export { DECISION_CATEGORIES } from "./taxonomy/types";
export { groupByCategory, groupByEpisode, uniqueChoices, findSimilarChoices } from "./taxonomy/patterns";

export { VectorStore } from "./retrieval/vectorStore";
export type { VectorEntry, SearchResult } from "./retrieval/vectorStore";
export { embedText, embedTexts } from "./retrieval/embeddings";
export {
  retrieveFielderContext,
  loadCorpusData,
  loadDecisionData,
  isFielderDataLoaded,
  getCorpusSize,
  getDecisionCount,
} from "./retrieval/retrieve";
export type { FielderRetrievalResult } from "./retrieval/retrieve";

export {
  getFielderContext,
  getFielderStats,
} from "./fielderContext";
export type { FielderContextRequest, FielderContextResponse, WritingPhase } from "./fielderContext";

export { refineFielderVoice, generateLocal, isLocalModelAvailable, getLocalModelStatus } from "./voice/localModel";
export type { VoiceRefinementOptions, LocalGenerationOptions, LocalModelStatus } from "./voice/localModel";

export { useFielderLoader } from "./useFielderLoader";
export type { FielderLoadState } from "./useFielderLoader";
