export type { CorpusChunk, RawCorpusFile, SourceType, StructuralPosition, ChunkMetadata } from "./corpus/types";

export type { DecisionCategory, DecisionEntry, EpisodeDecisionSet } from "./taxonomy/types";
export { DECISION_CATEGORIES } from "./taxonomy/types";
export { groupByCategory, groupByEpisode, uniqueChoices, findSimilarChoices } from "./taxonomy/patterns";

export { VectorStore } from "./retrieval/vectorStore";
export type { VectorEntry, SearchResult } from "./retrieval/vectorStore";
export { embedText, embedTexts } from "./retrieval/embeddings";
export {
  retrievePeraContext,
  loadCorpusData,
  loadDecisionData,
  isPeraDataLoaded,
  getCorpusSize,
  getDecisionCount,
} from "./retrieval/retrieve";
export type { PeraRetrievalResult } from "./retrieval/retrieve";

export {
  getPeraContext,
  getPeraStats,
} from "./peraContext";
export type { PeraContextRequest, PeraContextResponse, WritingPhase } from "./peraContext";

export { refinePeraVoice, generateLocal, isLocalModelAvailable, getLocalModelStatus } from "./voice/localModel";
export type { VoiceRefinementOptions, LocalGenerationOptions, LocalModelStatus } from "./voice/localModel";

export { usePeraLoader } from "./usePeraLoader";
export type { PeraLoadState } from "./usePeraLoader";
