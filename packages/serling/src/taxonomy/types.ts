export type DecisionCategory =
  | "premise_type"
  | "structural_pattern"
  | "twist_mechanism"
  | "character_archetype"
  | "character_test"
  | "opening_strategy"
  | "closing_strategy"
  | "dialogue_density"
  | "narration_role"
  | "lighting_philosophy"
  | "staging_approach"
  | "pacing_shape"
  | "music_relationship"
  | "thematic_core"
  | "tone_blend"
  | "scale_of_stakes";

export const DECISION_CATEGORIES: {
  id: DecisionCategory;
  label: string;
  description: string;
}[] = [
  { id: "premise_type", label: "Premise Type", description: "What kind of story seed (wish fulfillment, identity crisis, conformity test, etc.)" },
  { id: "structural_pattern", label: "Structural Pattern", description: "How the story is built (slow reveal, compression, parallel timeline, etc.)" },
  { id: "twist_mechanism", label: "Twist Mechanism", description: "How the inversion works (reframe, reversal, expansion, collapse, etc.)" },
  { id: "character_archetype", label: "Character Archetype", description: "What kind of protagonist (everyman, authority figure, outsider, dreamer, etc.)" },
  { id: "character_test", label: "Character Test", description: "How the character is tested (isolation, temptation, confrontation, loss, etc.)" },
  { id: "opening_strategy", label: "Opening Strategy", description: "How the episode opens (specific ordinary, in media res, narrator frame, etc.)" },
  { id: "closing_strategy", label: "Closing Strategy", description: "How the episode ends (resonance, irony, ambiguity, quiet devastation, etc.)" },
  { id: "dialogue_density", label: "Dialogue Density", description: "How much characters talk (silent, sparse, conversational, monologue-heavy)" },
  { id: "narration_role", label: "Narration Role", description: "What the narrator does (frame, commentary, revelation, none)" },
  { id: "lighting_philosophy", label: "Lighting Philosophy", description: "Visual approach (chiaroscuro, naturalistic, expressionist, etc.)" },
  { id: "staging_approach", label: "Staging Approach", description: "Spatial strategy (confined, expansive, threshold, compressed)" },
  { id: "pacing_shape", label: "Pacing Shape", description: "Tempo arc (slow-burn, escalating, staccato, wave)" },
  { id: "music_relationship", label: "Music Relationship", description: "How score functions (underscore, counterpoint, absence, late-entry)" },
  { id: "thematic_core", label: "Thematic Core", description: "Primary theme (nostalgia, conformity, identity, wishes, justice, loneliness)" },
  { id: "tone_blend", label: "Tone Blend", description: "Tonal recipe (wry-melancholy, eerie-warm, bitter-tender, etc.)" },
  { id: "scale_of_stakes", label: "Scale of Stakes", description: "What is at risk (personal, communal, existential, cosmic)" },
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
  year: number;
  synopsis: string;
  decisions: Omit<DecisionEntry, "embedding">[];
}
