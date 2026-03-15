export type { CorpusChunk, RawCorpusFile, SourceType, StructuralPosition, ChunkMetadata } from "./corpus/types";

export type { DecisionCategory, DecisionEntry, EpisodeDecisionSet } from "./taxonomy/types";
export { DECISION_CATEGORIES } from "./taxonomy/types";
export { groupByCategory, groupByEpisode, uniqueChoices, findSimilarChoices } from "./taxonomy/patterns";

export { VectorStore } from "./retrieval/vectorStore";
export type { VectorEntry, SearchResult } from "./retrieval/vectorStore";
export { embedText, embedTexts } from "./retrieval/embeddings";
export {
  retrieveSerlingContext,
  loadCorpusData,
  loadDecisionData,
  isSerlingDataLoaded,
  getCorpusSize,
  getDecisionCount,
} from "./retrieval/retrieve";
export type { SerlingRetrievalResult } from "./retrieval/retrieve";

export {
  getSerlingContext,
  getSerlingStats,
} from "./serlingContext";
export type { SerlingContextRequest, SerlingContextResponse, WritingPhase } from "./serlingContext";

export { refineSerlingVoice, generateLocal, isLocalModelAvailable, getLocalModelStatus } from "./voice/localModel";
export type { VoiceRefinementOptions, LocalGenerationOptions, LocalModelStatus } from "./voice/localModel";

export { useSerlingLoader } from "./useSerlingLoader";
export type { SerlingLoadState } from "./useSerlingLoader";
