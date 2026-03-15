import type { DecisionCategory } from "./taxonomy/types";
import {
  retrievePeraContext,
  isPeraDataLoaded,
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

export interface PeraContextRequest {
  episodeBrief: string;
  recentChat: string;
  phase: WritingPhase;
  userFeedback?: string;
}

export interface PeraContextResponse {
  contextBlock: string;
  corpusCount: number;
  decisionCount: number;
  retrievalQuery: string;
}

function buildRetrievalQuery(req: PeraContextRequest): string {
  const { episodeBrief, recentChat, phase, userFeedback } = req;
  const briefSnippet = episodeBrief.slice(0, 500);
  const chatSnippet = recentChat.slice(-800);

  switch (phase) {
    case "briefing":
    case "writing":
      return `${briefSnippet}\nPera approach to constructing this kind of episode. How would Pera anchor this in a mundane topic, build warmth, and find the emotional core underneath? What lesson-with-tangent or slow-build structure applies? Upper Peninsula Michigan, Marquette setting.`;
    case "directing":
      return `${chatSnippet}\nPera directorial choices for these scenes. Patient wide shots, close-ups on objects, landscape establishing, handheld intimate. Meditative pacing, letting silence breathe. Ryan Dann's score role.`;
    case "approval":
    case "pitch":
      return `${chatSnippet}\nPera episode evaluation. Does this achieve the right balance of warmth and sincerity? Is the pacing patient enough? Does the emotional turn land without cringe? Does the closing reflection feel earned?`;
    case "revision":
      return `${userFeedback || chatSnippet}\nPera approach to revising based on this feedback. How would Pera adjust while maintaining the gentle, grandfatherly voice and anti-cringe sincerity?`;
    default:
      return briefSnippet;
  }
}

function categoryFilterForPhase(phase: WritingPhase): DecisionCategory[] | undefined {
  switch (phase) {
    case "briefing":
      return [
        "lesson_topic",
        "structural_pattern",
        "thematic_core",
        "tone_blend",
        "warmth_mechanism",
      ];
    case "writing":
      return [
        "lesson_topic",
        "structural_pattern",
        "warmth_mechanism",
        "subject_archetype",
        "sincerity_level",
        "opening_strategy",
        "closing_strategy",
        "silence_use",
        "pacing_shape",
        "voiceover_approach",
        "thematic_core",
        "tone_blend",
        "community_element",
        "seasonal_connection",
      ];
    case "directing":
      return [
        "camera_philosophy",
        "silence_use",
        "pacing_shape",
        "music_role",
        "tone_blend",
        "community_element",
      ];
    case "approval":
    case "pitch":
      return undefined;
    case "revision":
      return undefined;
  }
}

export async function getPeraContext(
  req: PeraContextRequest,
): Promise<PeraContextResponse> {
  if (!isPeraDataLoaded()) {
    return {
      contextBlock: "",
      corpusCount: 0,
      decisionCount: 0,
      retrievalQuery: "",
    };
  }

  const query = buildRetrievalQuery(req);
  const categories = categoryFilterForPhase(req.phase);

  const result = await retrievePeraContext(query, {
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

export function getPeraStats(): {
  loaded: boolean;
  corpusSize: number;
  decisionCount: number;
} {
  return {
    loaded: isPeraDataLoaded(),
    corpusSize: getCorpusSize(),
    decisionCount: getDecisionCount(),
  };
}
