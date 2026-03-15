import type { DecisionCategory } from "./taxonomy/types";
import {
  retrieveFielderContext,
  isFielderDataLoaded,
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

export interface FielderContextRequest {
  episodeBrief: string;
  recentChat: string;
  phase: WritingPhase;
  userFeedback?: string;
}

export interface FielderContextResponse {
  contextBlock: string;
  corpusCount: number;
  decisionCount: number;
  retrievalQuery: string;
}

function buildRetrievalQuery(req: FielderContextRequest): string {
  const { episodeBrief, recentChat, phase, userFeedback } = req;
  const briefSnippet = episodeBrief.slice(0, 500);
  const chatSnippet = recentChat.slice(-800);

  switch (phase) {
    case "briefing":
    case "writing":
      return `${briefSnippet}\nFielder approach to constructing this kind of premise. How would Fielder escalate, structure, and find the emotional core of this concept? What scheme architecture applies?`;
    case "directing":
      return `${chatSnippet}\nFielder directorial choices for these scenes. Camera patience, silence beats, documentary observation, reaction framing, environmental sound.`;
    case "approval":
    case "pitch":
      return `${chatSnippet}\nFielder episode evaluation. Does this achieve the right balance of absurdity and genuine emotion? Is the commitment deep enough? Does the ending land?`;
    case "revision":
      return `${userFeedback || chatSnippet}\nFielder approach to revising based on this feedback. How would Fielder adjust while maintaining the deadpan commitment?`;
    default:
      return briefSnippet;
  }
}

function categoryFilterForPhase(phase: WritingPhase): DecisionCategory[] | undefined {
  switch (phase) {
    case "briefing":
      return ["scheme_type", "structural_pattern", "thematic_core", "tone_blend", "escalation_method"];
    case "writing":
      return [
        "scheme_type", "structural_pattern", "cringe_mechanism",
        "subject_archetype", "authenticity_test", "opening_strategy",
        "closing_strategy", "silence_use", "escalation_method",
        "thematic_core", "tone_blend",
      ];
    case "directing":
      return [
        "camera_philosophy", "editing_approach", "silence_use",
        "performance_direction", "tone_blend",
      ];
    case "approval":
    case "pitch":
      return undefined;
    case "revision":
      return undefined;
  }
}

export async function getFielderContext(
  req: FielderContextRequest,
): Promise<FielderContextResponse> {
  if (!isFielderDataLoaded()) {
    return {
      contextBlock: "",
      corpusCount: 0,
      decisionCount: 0,
      retrievalQuery: "",
    };
  }

  const query = buildRetrievalQuery(req);
  const categories = categoryFilterForPhase(req.phase);

  const result = await retrieveFielderContext(query, {
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

export function getFielderStats(): {
  loaded: boolean;
  corpusSize: number;
  decisionCount: number;
} {
  return {
    loaded: isFielderDataLoaded(),
    corpusSize: getCorpusSize(),
    decisionCount: getDecisionCount(),
  };
}
