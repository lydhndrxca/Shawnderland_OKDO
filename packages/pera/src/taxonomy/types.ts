export type DecisionCategory =
  | "lesson_topic"
  | "structural_pattern"
  | "warmth_mechanism"
  | "subject_archetype"
  | "sincerity_level"
  | "opening_strategy"
  | "closing_strategy"
  | "silence_use"
  | "pacing_shape"
  | "camera_philosophy"
  | "music_role"
  | "voiceover_approach"
  | "thematic_core"
  | "tone_blend"
  | "community_element"
  | "seasonal_connection";

export const DECISION_CATEGORIES: {
  id: DecisionCategory;
  label: string;
  description: string;
}[] = [
  {
    id: "lesson_topic",
    label: "Lesson Topic",
    description:
      "What mundane topic anchors the episode (iron, beans, breakfast, chairs, grocery stores)",
  },
  {
    id: "structural_pattern",
    label: "Structural Pattern",
    description:
      "How the episode is built (lesson-with-tangent, slow-build, parallel-stories, direct-address, seasonal-arc)",
  },
  {
    id: "warmth_mechanism",
    label: "Warmth Mechanism",
    description:
      "How comfort is generated (routine celebration, community ritual, shared meal, quiet companionship, nature observation)",
  },
  {
    id: "subject_archetype",
    label: "Subject Archetype",
    description:
      "Who the central figure is (Joe himself, Gene, Sarah, the Melskys, the community, a concept)",
  },
  {
    id: "sincerity_level",
    label: "Sincerity Level",
    description: "How directly emotional the episode gets",
  },
  {
    id: "opening_strategy",
    label: "Opening Strategy",
    description: "How the episode opens",
  },
  {
    id: "closing_strategy",
    label: "Closing Strategy",
    description: "How the episode ends",
  },
  {
    id: "silence_use",
    label: "Silence Use",
    description:
      "How quiet moments function (meditative pause, letting a moment breathe, contemplative space)",
  },
  {
    id: "pacing_shape",
    label: "Pacing Shape",
    description: "Tempo arc of the episode",
  },
  {
    id: "camera_philosophy",
    label: "Camera Philosophy",
    description:
      "Visual approach (patient wide shots, close-ups on objects, landscape establishing, handheld intimate)",
  },
  {
    id: "music_role",
    label: "Music Role",
    description: "How Ryan Dann's score functions",
  },
  {
    id: "voiceover_approach",
    label: "Voiceover Approach",
    description: "How Joe's narration works",
  },
  {
    id: "thematic_core",
    label: "Thematic Core",
    description: "What the episode is actually about underneath",
  },
  {
    id: "tone_blend",
    label: "Tone Blend",
    description: "The emotional recipe",
  },
  {
    id: "community_element",
    label: "Community Element",
    description: "How the Upper Peninsula community factors in",
  },
  {
    id: "seasonal_connection",
    label: "Seasonal Connection",
    description: "How time of year/nature connects to the episode's theme",
  },
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
