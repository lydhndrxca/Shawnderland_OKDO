export type DecisionCategory =
  | "scheme_type"
  | "structural_pattern"
  | "cringe_mechanism"
  | "subject_archetype"
  | "authenticity_test"
  | "opening_strategy"
  | "closing_strategy"
  | "silence_use"
  | "escalation_method"
  | "camera_philosophy"
  | "editing_approach"
  | "performance_direction"
  | "thematic_core"
  | "tone_blend"
  | "meta_layer"
  | "emotional_payload";

export const DECISION_CATEGORIES: {
  id: DecisionCategory;
  label: string;
  description: string;
}[] = [
  { id: "scheme_type", label: "Scheme Type", description: "What kind of elaborate concept (business advice, social experiment, rehearsal, reality manipulation, scripted-as-documentary)" },
  { id: "structural_pattern", label: "Structural Pattern", description: "How the episode is built (escalation, nested layers, long con, reveal, parallel threads)" },
  { id: "cringe_mechanism", label: "Cringe Mechanism", description: "How discomfort is weaponized (committed silence, social pressure, logical trap, oversharing, earnest absurdity)" },
  { id: "subject_archetype", label: "Subject Archetype", description: "Who the central figure/mark is (small business owner, Nathan himself, volunteer, unsuspecting public, hired actor)" },
  { id: "authenticity_test", label: "Authenticity Test", description: "What's real vs constructed (genuine emotion in fake context, real stakes in absurd frame, documentary in fiction)" },
  { id: "opening_strategy", label: "Opening Strategy", description: "How the episode opens (deadpan premise pitch, voiceover setup, cold open on location, Nathan explaining the plan)" },
  { id: "closing_strategy", label: "Closing Strategy", description: "How the episode ends (lingering silence, accidental emotion, absurd escalation peak, meta-reveal, unresolved)" },
  { id: "silence_use", label: "Silence Use", description: "How dead air and pauses function (comic timing, power dynamics, genuine discomfort, contemplative space)" },
  { id: "escalation_method", label: "Escalation Method", description: "How the premise compounds (logical extension, adding stakeholders, raising stakes, commitment deepening, scope creep)" },
  { id: "camera_philosophy", label: "Camera Philosophy", description: "Visual approach (documentary handheld, surveillance static, observation patience, intimate close-up, neutral wide)" },
  { id: "editing_approach", label: "Editing Approach", description: "How cuts function (smash cuts, lingering holds, reaction shots, match cuts, montage, jump cuts to compress time)" },
  { id: "performance_direction", label: "Performance Direction", description: "How 'acting' is deployed (Nathan's deadpan, real people reacting, rehearsed naturalism, meta-performance layers)" },
  { id: "thematic_core", label: "Thematic Core", description: "Primary theme (loneliness, control, authenticity, human connection, social anxiety, the gap between intent and outcome)" },
  { id: "tone_blend", label: "Tone Blend", description: "Tonal recipe (cringe-tender, absurd-melancholy, comic-profound, awkward-beautiful, deadpan-devastating)" },
  { id: "meta_layer", label: "Meta Layer", description: "Level of self-awareness (straightforward scheme, show-within-show, reality questioning, fourth wall erosion, audience implication)" },
  { id: "emotional_payload", label: "Emotional Payload", description: "The hidden feeling (loneliness masked as comedy, genuine connection in artificial setup, the beauty of trying, the pain of wanting control)" },
];

export interface DecisionEntry {
  id: string;
  episodeId: string;
  episodeTitle: string;
  category: DecisionCategory;
  choice: string;
  alternatives: string[];
  reasoning: string;
  embedding: number[];
}

export interface EpisodeDecisionSet {
  episodeId: string;
  episodeTitle: string;
  show: string;
  year: number;
  synopsis: string;
  decisions: Omit<DecisionEntry, "embedding">[];
}
