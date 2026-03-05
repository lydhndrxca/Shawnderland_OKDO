import { z } from 'zod';
import type { StageId } from './stages';

export const SeedOutputSchema = z.object({
  seedText: z.string(),
});
export type SeedOutput = z.infer<typeof SeedOutputSchema>;

export const NormalizeOutputSchema = z.object({
  seedSummary: z.string(),
  assumptions: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      userOverride: z.boolean().optional(),
    }),
  ),
  clarifyingQuestions: z.array(z.string()),
});
export type NormalizeOutput = z.infer<typeof NormalizeOutputSchema>;

export const LensEnum = z.enum(['practical', 'inversion', 'constraint_art']);
export type LensType = z.infer<typeof LensEnum>;

export const CultureBlockSchema = z.object({
  anchors: z.object({
    narrativeForm: z.string(),
    materialPractice: z.string(),
    socialStructure: z.string(),
  }),
  respectNote: z.string(),
  researchToValidate: z.string(),
  exoticismFlags: z.string().optional(),
});
export type CultureBlock = z.infer<typeof CultureBlockSchema>;

export const DivergeCandidateSchema = z.object({
  id: z.string(),
  hook: z.string(),
  axes: z.array(z.string()),
  antiGenericClaim: z.string(),
  first60Minutes: z.string(),
  lens: LensEnum,
  buckets: z.array(z.string()),
  operatorTags: z.array(z.string()),
  culture: CultureBlockSchema.optional(),
});
export type DivergeCandidate = z.infer<typeof DivergeCandidateSchema>;

export const DivergeOutputSchema = z.object({
  candidates: z.array(DivergeCandidateSchema),
});
export type DivergeOutput = z.infer<typeof DivergeOutputSchema>;

export const DivergeBatchSchema = z.object({
  candidates: z.array(DivergeCandidateSchema),
});
export type DivergeBatch = z.infer<typeof DivergeBatchSchema>;

export const CritiqueEntrySchema = z.object({
  candidateId: z.string(),
  genericness: z.number().min(0).max(10),
  explanation: z.string(),
  flags: z.preprocess((v) => v ?? '', z.string()),
  samenessNotes: z.preprocess((v) => v ?? '', z.string()),
});
export type CritiqueEntry = z.infer<typeof CritiqueEntrySchema>;

export const MutationEntrySchema = z.object({
  candidateId: z.string(),
  mutationId: z.string(),
  operator: z.string(),
  description: z.string(),
  mutatedCandidate: DivergeCandidateSchema,
});
export type MutationEntry = z.infer<typeof MutationEntrySchema>;

export const CritiqueSalvageOutputSchema = z.object({
  critiques: z.array(CritiqueEntrySchema),
  mutations: z.array(MutationEntrySchema),
});
export type CritiqueSalvageOutput = z.infer<typeof CritiqueSalvageOutputSchema>;

export const ExpandExpansionSchema = z.object({
  candidateId: z.string(),
  concept: z.string(),
  differentiator: z.string(),
  scope: z.object({
    tighten: z.string(),
    loosen: z.string(),
  }),
  risks: z.array(
    z.object({
      risk: z.string(),
      mitigation: z.string(),
    }),
  ),
  planDay1: z.string(),
  planWeek1: z.string(),
  userNotes: z.string().optional(),
  culture: CultureBlockSchema.optional(),
});
export type ExpandExpansion = z.infer<typeof ExpandExpansionSchema>;

export const ExpandOutputSchema = z.object({
  expansions: z.array(ExpandExpansionSchema),
});
export type ExpandOutput = z.infer<typeof ExpandOutputSchema>;

export const ScoreEntrySchema = z.object({
  candidateId: z.string(),
  novelty: z.number(),
  usefulness: z.number(),
  feasibility: z.number(),
  differentiation: z.number(),
  energyGuess: z.number(),
  rationale: z.string(),
});
export type ScoreEntry = z.infer<typeof ScoreEntrySchema>;

export const CutsToShipSchema = z.object({
  candidateId: z.string(),
  cuts: z.string(),
});
export type CutsToShip = z.infer<typeof CutsToShipSchema>;

export const ConvergeOutputSchema = z.object({
  scorecard: z.array(ScoreEntrySchema),
  winnerId: z.string().optional(),
  runnerUpId: z.string().optional(),
  cutsToShip: z.array(CutsToShipSchema).optional(),
});
export type ConvergeOutput = z.infer<typeof ConvergeOutputSchema>;

export const CommitOutputSchema = z.object({
  artifactType: z.string(),
  title: z.string(),
  differentiator: z.string(),
  constraints: z.string(),
  first60Minutes: z.string(),
  next3Actions: z.string(),
  riskNotes: z.string(),
});
export type CommitOutput = z.infer<typeof CommitOutputSchema>;

export const IterateOutputSchema = z.object({
  nextPromptSuggestions: z.string(),
});
export type IterateOutput = z.infer<typeof IterateOutputSchema>;

export const STAGE_SCHEMAS: Record<StageId, z.ZodType> = {
  seed: SeedOutputSchema,
  normalize: NormalizeOutputSchema,
  diverge: DivergeOutputSchema,
  'critique-salvage': CritiqueSalvageOutputSchema,
  expand: ExpandOutputSchema,
  converge: ConvergeOutputSchema,
  commit: CommitOutputSchema,
  iterate: IterateOutputSchema,
};
