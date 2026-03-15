import type { DecisionCategory } from "./taxonomy/types";
import {
  retrieveSerlingContext,
  isSerlingDataLoaded,
  getCorpusSize,
  getDecisionCount,
} from "./retrieval/retrieve";

export type WritingPhase =
  | "briefing"
  | "writing"
  | "directing"
  | "approval"
  | "pitch"
  | "revision";

export interface SerlingContextRequest {
  episodeBrief: string;
  recentChat: string;
  phase: WritingPhase;
  userFeedback?: string;
}

export interface SerlingContextResponse {
  contextBlock: string;
  corpusCount: number;
  decisionCount: number;
  retrievalQuery: string;
}

function buildRetrievalQuery(req: SerlingContextRequest): string {
  const { episodeBrief, recentChat, phase, userFeedback } = req;
  const briefSnippet = episodeBrief.slice(0, 500);
  const chatSnippet = recentChat.slice(-800);

  switch (phase) {
    case "briefing":
    case "writing":
      return `${briefSnippet}\nSerling story construction approach for this kind of premise. How would Serling structure, open, and twist a story with these elements?`;
    case "directing":
      return `${chatSnippet}\nSerling staging, visual approach, and directorial decisions for these scenes. Camera, lighting, pacing, blocking choices.`;
    case "approval":
    case "pitch":
      return `${chatSnippet}\nSerling episode structure evaluation. Does this story achieve the right balance of intimacy, surprise, and thematic weight?`;
    case "revision":
      return `${userFeedback || chatSnippet}\nSerling approach to revising and refining based on this feedback. How would Serling adjust?`;
    default:
      return briefSnippet;
  }
}

function categoryFilterForPhase(phase: WritingPhase): DecisionCategory[] | undefined {
  switch (phase) {
    case "briefing":
      return ["premise_type", "structural_pattern", "thematic_core", "scale_of_stakes", "tone_blend"];
    case "writing":
      return [
        "premise_type", "structural_pattern", "twist_mechanism",
        "character_archetype", "character_test", "opening_strategy",
        "closing_strategy", "dialogue_density", "narration_role",
        "thematic_core", "tone_blend",
      ];
    case "directing":
      return [
        "lighting_philosophy", "staging_approach", "pacing_shape",
        "music_relationship", "tone_blend",
      ];
    case "approval":
    case "pitch":
      return undefined;
    case "revision":
      return undefined;
  }
}

export async function getSerlingContext(
  req: SerlingContextRequest,
): Promise<SerlingContextResponse> {
  if (!isSerlingDataLoaded()) {
    return {
      contextBlock: "",
      corpusCount: 0,
      decisionCount: 0,
      retrievalQuery: "",
    };
  }

  const query = buildRetrievalQuery(req);
  const categories = categoryFilterForPhase(req.phase);

  const result = await retrieveSerlingContext(query, {
    corpusTopK: 5,
    decisionTopK: 8,
    categories,
  });

  return {
    contextBlock: result.contextBlock,
    corpusCount: result.corpusChunks.length,
    decisionCount: result.decisionPatterns.length,
    retrievalQuery: query,
  };
}

export function getSerlingStats(): {
  loaded: boolean;
  corpusSize: number;
  decisionCount: number;
} {
  return {
    loaded: isSerlingDataLoaded(),
    corpusSize: getCorpusSize(),
    decisionCount: getDecisionCount(),
  };
}
