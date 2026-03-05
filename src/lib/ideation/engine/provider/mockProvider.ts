import type { Provider, ProviderGenerateOpts } from './types';
import type { LensType } from '../schemas';

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededId(hash: number, index: number): string {
  return `mock-${((hash + index * 7919) % 100000).toString(36)}`;
}

interface MockCandidate {
  hook: string;
  axes: string[];
  antiGenericClaim: string;
  first60Minutes: string;
  lens: LensType;
  buckets: string[];
  operatorTags: string[];
}

const PRACTICAL_POOL: MockCandidate[] = [
  {
    hook: 'Automated workflow optimizer for solo creators',
    axes: ['automation', 'integration', 'efficiency'],
    antiGenericClaim: 'Replaces 5 separate tools with one context-aware pipeline that learns your patterns.',
    first60Minutes: 'Connect two existing tools, run the optimizer, see first automated handoff.',
    lens: 'practical',
    buckets: ['Tooling / Workflow'],
    operatorTags: ['Automation', 'Integration'],
  },
  {
    hook: 'Freelancer income diversification dashboard',
    axes: ['finance', 'analytics', 'self-employment'],
    antiGenericClaim: 'Goes beyond tracking to actively model income scenarios and suggest diversification moves.',
    first60Minutes: 'Import last 3 months of income data, get first risk-adjusted diversification score.',
    lens: 'practical',
    buckets: ['Business / Monetization', 'Tooling / Workflow'],
    operatorTags: ['Analytics', 'Financial modeling'],
  },
  {
    hook: 'Community skill-exchange marketplace',
    axes: ['education', 'community', 'marketplace'],
    antiGenericClaim: 'No money changes hands — pure skill barter with reputation-weighted matching.',
    first60Minutes: 'Post one skill offer and one skill request, get matched with a partner.',
    lens: 'practical',
    buckets: ['Social / Community'],
    operatorTags: ['Marketplace', 'Community'],
  },
  {
    hook: 'Content repurposing engine across formats',
    axes: ['content', 'multi-format', 'distribution'],
    antiGenericClaim: 'Not just reformatting — restructures arguments for each medium\'s native persuasion style.',
    first60Minutes: 'Feed in one blog post, get a thread, a slide deck outline, and a video script.',
    lens: 'practical',
    buckets: ['Creative Media', 'Tooling / Workflow'],
    operatorTags: ['Content', 'Repurposing'],
  },
  {
    hook: 'Real-time team dynamics simulator',
    axes: ['teamwork', 'simulation', 'organizational'],
    antiGenericClaim: 'Models actual team friction patterns, not generic "team building" exercises.',
    first60Minutes: 'Input your team roster and last 3 conflicts, see the friction model.',
    lens: 'practical',
    buckets: ['Simulation / Systems'],
    operatorTags: ['Simulation', 'Team dynamics'],
  },
  {
    hook: 'Micro-SaaS launch accelerator toolkit',
    axes: ['templates', 'saas', 'rapid-launch'],
    antiGenericClaim: 'Provides not just code but the exact decision tree for first 10 customers.',
    first60Minutes: 'Pick a template, customize the value prop, deploy a landing page with waitlist.',
    lens: 'practical',
    buckets: ['Business / Monetization'],
    operatorTags: ['SaaS', 'Launch'],
  },
];

const INVERSION_POOL: MockCandidate[] = [
  {
    hook: 'Reverse mentorship network — juniors teach seniors',
    axes: ['mentorship', 'reversal', 'generational'],
    antiGenericClaim: 'Flips the mentorship model: the newest hires teach executives about emerging reality.',
    first60Minutes: 'Sign up as a reverse mentor, get matched with a senior leader, set first session.',
    lens: 'inversion',
    buckets: ['Social / Community', 'Business / Monetization'],
    operatorTags: ['Inversion', 'Mentorship'],
  },
  {
    hook: 'Anti-productivity journal for creative recovery',
    axes: ['reflection', 'slowness', 'well-being'],
    antiGenericClaim: 'The only tool that actively discourages you from being productive.',
    first60Minutes: 'Write your first "waste of time" entry. Get scored on how unproductive it was.',
    lens: 'inversion',
    buckets: ['Creative Media', 'Weird / Art Film'],
    operatorTags: ['Inversion', 'Anti-pattern'],
  },
  {
    hook: 'Chaos-injecting project manager',
    axes: ['randomness', 'project-management', 'discovery'],
    antiGenericClaim: 'Deliberately introduces controlled chaos to prevent groupthink and premature convergence.',
    first60Minutes: 'Import a project plan, let the chaos engine shuffle one dependency, see what breaks.',
    lens: 'inversion',
    buckets: ['Tooling / Workflow', 'Simulation / Systems'],
    operatorTags: ['Inversion', 'Chaos engineering'],
  },
  {
    hook: 'Public failure portfolio showcase',
    axes: ['failure', 'transparency', 'learning'],
    antiGenericClaim: 'A LinkedIn for failures — where the most spectacular flops get the most engagement.',
    first60Minutes: 'Post your biggest professional failure, tag what you learned, get community reactions.',
    lens: 'inversion',
    buckets: ['Social / Community', 'Creative Media'],
    operatorTags: ['Inversion', 'Transparency'],
  },
  {
    hook: 'Competitor collaboration protocol',
    axes: ['cooperation', 'industry', 'open-data'],
    antiGenericClaim: 'Turns competitors into co-creators by sharing non-core data for mutual benefit.',
    first60Minutes: 'Identify one non-core dataset, propose a share with one competitor, model the benefit.',
    lens: 'inversion',
    buckets: ['Business / Monetization', 'Social / Community'],
    operatorTags: ['Inversion', 'Cooperation'],
  },
  {
    hook: 'Intentional degrowth business planner',
    axes: ['sustainability', 'minimalism', 'anti-scale'],
    antiGenericClaim: 'Plans for deliberately getting smaller while increasing per-unit value and satisfaction.',
    first60Minutes: 'Input current revenue, set a lower target, see the degrowth path with quality metrics.',
    lens: 'inversion',
    buckets: ['Business / Monetization', 'Simulation / Systems'],
    operatorTags: ['Inversion', 'Degrowth'],
  },
];

const CONSTRAINT_ART_POOL: MockCandidate[] = [
  {
    hook: 'One-color visual storytelling tool',
    axes: ['constraint', 'visual-narrative', 'minimalism'],
    antiGenericClaim: 'Forces every story into a single color palette, revealing structure through shade alone.',
    first60Minutes: 'Pick one color, upload a story concept, see it rendered in monochrome narrative panels.',
    lens: 'constraint_art',
    buckets: ['Creative Media', 'Weird / Art Film'],
    operatorTags: ['Constraint-Art', 'Visual'],
  },
  {
    hook: '60-second idea theater performance engine',
    axes: ['time-constraint', 'performance', 'rapid-ideation'],
    antiGenericClaim: 'Every idea must be performed, not presented — in exactly 60 seconds.',
    first60Minutes: 'Record your first 60-second idea performance. Get scored on clarity and energy.',
    lens: 'constraint_art',
    buckets: ['Weird / Art Film', 'Creative Media'],
    operatorTags: ['Constraint-Art', 'Performance'],
  },
  {
    hook: 'City-block-scale emergent simulation',
    axes: ['geography', 'emergence', 'urban-systems'],
    antiGenericClaim: 'Simulates one city block as a living system where every shop and resident has agency.',
    first60Minutes: 'Pick a real city block, seed 20 agents with goals, watch the first day unfold.',
    lens: 'constraint_art',
    buckets: ['Simulation / Systems', 'Social / Community'],
    operatorTags: ['Constraint-Art', 'Simulation'],
  },
  {
    hook: 'Haiku-format requirements specification tool',
    axes: ['poetry', 'engineering', 'brevity'],
    antiGenericClaim: 'Every software requirement must fit in 5-7-5 syllables, forcing radical clarity.',
    first60Minutes: 'Convert 3 existing requirements into haiku format, compare comprehension scores.',
    lens: 'constraint_art',
    buckets: ['Tooling / Workflow', 'Weird / Art Film'],
    operatorTags: ['Constraint-Art', 'Cross-domain'],
  },
  {
    hook: 'Sound-only social network with no text',
    axes: ['audio', 'social-constraint', 'accessibility'],
    antiGenericClaim: 'Zero text, zero images — every interaction is a sound, a voice, or a silence.',
    first60Minutes: 'Record a 10-second sound intro, listen to 5 others, respond with sound only.',
    lens: 'constraint_art',
    buckets: ['Social / Community', 'Creative Media'],
    operatorTags: ['Constraint-Art', 'Sensory'],
  },
  {
    hook: 'Zero-budget innovation framework challenge',
    axes: ['zero-budget', 'resourcefulness', 'strategic'],
    antiGenericClaim: 'You literally cannot spend money — forces pure ingenuity and social capital.',
    first60Minutes: 'Define your innovation goal, list every non-monetary resource available, build first plan.',
    lens: 'constraint_art',
    buckets: ['Business / Monetization', 'Simulation / Systems'],
    operatorTags: ['Constraint-Art', 'Resource constraint'],
  },
];

const LENS_POOLS: Record<string, MockCandidate[]> = {
  practical: PRACTICAL_POOL,
  inversion: INVERSION_POOL,
  constraint_art: CONSTRAINT_ART_POOL,
};

function instantiateCandidates(
  pool: MockCandidate[],
  hash: number,
  count: number,
  offset: number,
): Array<MockCandidate & { id: string }> {
  const h = hash % 1000;
  return pool.slice(0, count).map((c, i) => ({
    ...c,
    id: seededId(hash, i + offset),
    hook: `${c.hook} (${h})`,
  }));
}

function generateMockForStage(stageHint: string, hash: number, prompt: string): unknown {
  const h = hash % 1000;

  switch (stageHint) {
    case 'seed':
      return { seedText: `Seed concept (${h})` };

    case 'normalize':
      return {
        seedSummary: `A structured analysis of the seed concept revealing core assumptions and areas for exploration (variant ${h}).`,
        assumptions: [
          { key: 'Target Audience', value: 'Early adopters and tech-savvy users' },
          { key: 'Timeline', value: 'MVP within 3 months' },
          { key: 'Budget', value: 'Bootstrap / self-funded' },
        ],
        clarifyingQuestions: [
          'What specific problem does this solve for the target user?',
          'Are there existing solutions the user is currently using?',
        ],
      };

    case 'diverge': {
      const lensMatch = prompt.match(/\[LENS:([^\]]+)\]/);
      const regenVariant = prompt.includes('[REGEN:variant]');
      const regenMissing = prompt.includes('[REGEN:missing]');

      if (regenVariant) {
        return {
          id: seededId(hash, 999),
          hook: `Variant: Reimagined from a different angle (${h})`,
          axes: ['variant-axis-1', 'variant-axis-2', 'variant-axis-3'],
          antiGenericClaim: 'This variant takes the core idea in a fundamentally different direction.',
          first60Minutes: 'Rapid prototype of the variant concept with focus on the differentiating axis.',
          lens: 'practical',
          buckets: ['Tooling / Workflow', 'Creative Media'],
          operatorTags: ['Variant'],
        };
      }

      if (regenMissing) {
        const requiredMatch = prompt.match(/## Required Buckets\n(.+)\n/);
        const required = requiredMatch
          ? requiredMatch[1].split(', ')
          : ['Weird / Art Film'];
        return {
          candidates: required.map((bucket, i) => ({
            id: seededId(hash, 900 + i),
            hook: `Gap-filler for ${bucket} (${h})`,
            axes: ['gap-fill', 'targeted', `bucket-${i}`],
            antiGenericClaim: `Specifically designed to cover the ${bucket} gap in the portfolio.`,
            first60Minutes: `Quick prototype targeting the ${bucket} space with minimal viable scope.`,
            lens: 'practical' as const,
            buckets: [bucket],
            operatorTags: ['Gap-fill', 'Targeted'],
          })),
        };
      }

      const lens = lensMatch ? lensMatch[1] : 'practical';
      const pool = LENS_POOLS[lens] ?? PRACTICAL_POOL;
      const countMatch = prompt.match(/exactly (\d+) candidates/);
      const count = countMatch ? parseInt(countMatch[1], 10) : 6;
      const offset = lens === 'practical' ? 0 : lens === 'inversion' ? 100 : 200;

      return {
        candidates: instantiateCandidates(pool, hash, count, offset),
      };
    }

    case 'critique-salvage': {
      const candidatesMatch = prompt.match(/\[CANDIDATES:([^\]]+)\]/);
      const ids = candidatesMatch
        ? candidatesMatch[1].split(',')
        : [seededId(hash, 0), seededId(hash, 1), seededId(hash, 2)];

      const critiques = ids.map((id, i) => ({
        candidateId: id,
        genericness: i % 3 === 0 ? 7 : i % 3 === 1 ? 4 : 8,
        explanation: i % 3 === 0
          ? `Candidate ${id.slice(0, 8)} follows a well-trodden path. The hook sounds like many existing tools.`
          : i % 3 === 1
            ? `Good differentiation. The approach is fresh and the anti-generic claim is backed by concrete actions.`
            : `Very generic framing. Missing a clear audience and the value prop is indistinguishable from competitors.`,
        flags: i % 3 === 0
          ? 'cliché pattern, missing differentiator'
          : i % 3 === 2
            ? 'cliché pattern, unclear audience, sameness to others'
            : '',
        samenessNotes: i % 3 !== 1
          ? 'Shares structure with 2+ other candidates in the portfolio.'
          : 'Sufficiently differentiated from peers.',
      }));

      const mutations = critiques
        .filter((c) => c.genericness >= 6)
        .flatMap((c, ci) => {
          const baseIdx = 500 + ci * 20;
          return [
            {
              candidateId: c.candidateId,
              mutationId: seededId(hash, baseIdx),
              operator: 'SCAMPER',
              description: 'Substitute the core delivery mechanism with an unexpected medium.',
              mutatedCandidate: {
                id: seededId(hash, baseIdx + 100),
                hook: `[SCAMPER] Reimagined ${c.candidateId.slice(0, 8)} via medium substitution (${h})`,
                axes: ['substitution', 'medium-shift', 'novelty'],
                antiGenericClaim: 'Delivers the same value through a completely unexpected channel, creating surprise and memorability.',
                first60Minutes: 'Identify the substitute medium, build a 1-screen proof-of-concept, test with 3 people.',
                lens: 'practical' as const,
                buckets: ['Creative Media', 'Tooling / Workflow'],
                operatorTags: ['SCAMPER', 'Substitution', 'Mutation'],
              },
            },
            {
              candidateId: c.candidateId,
              mutationId: seededId(hash, baseIdx + 1),
              operator: 'Inversion',
              description: 'Flip the core assumption: instead of adding features, remove them to find the essence.',
              mutatedCandidate: {
                id: seededId(hash, baseIdx + 101),
                hook: `[Inverted] Minimal-essence version of ${c.candidateId.slice(0, 8)} (${h})`,
                axes: ['minimalism', 'inversion', 'essence'],
                antiGenericClaim: 'Instead of building more, strips to the absolute minimum that delivers value — one screen, one action.',
                first60Minutes: 'Define the single most valuable action, build just that in one screen, test immediately.',
                lens: 'inversion' as const,
                buckets: ['Weird / Art Film', 'Simulation / Systems'],
                operatorTags: ['Inversion', 'Minimalism', 'Mutation'],
              },
            },
          ];
        });

      return { critiques, mutations };
    }

    case 'expand': {
      const expandMatch = prompt.match(/\[EXPAND_CANDIDATE:([^\]]+)\]/);
      const candidateId = expandMatch ? expandMatch[1] : seededId(hash, 0);
      const sectionMatch = prompt.match(/\[SECTION_REGEN:([^\]]+)\]/);

      if (sectionMatch) {
        const field = sectionMatch[1];
        const base = generateBaseExpansion(candidateId, h);
        const regen: Record<string, unknown> = { ...base };
        switch (field) {
          case 'concept':
            regen.concept = `[Regenerated] Fresh take on the concept — focus shifted to community-first delivery (${h})`;
            break;
          case 'differentiator':
            regen.differentiator = `[Regenerated] The differentiator now emphasizes speed-to-value over feature depth (${h})`;
            break;
          case 'risks':
            regen.risks = [
              { risk: 'Market timing may shift', mitigation: 'Build in pivot triggers at 30/60/90 day marks' },
              { risk: 'User acquisition cost unknown', mitigation: 'Start with organic community channels only' },
            ];
            break;
          case 'planDay1':
            regen.planDay1 = `[Regenerated] Talk to 5 potential users before writing any code. Map their pain points. (${h})`;
            break;
          case 'planWeek1':
            regen.planWeek1 = `[Regenerated] Build throwaway prototype covering top pain point, test with interviewees, iterate. (${h})`;
            break;
          default:
            break;
        }
        return regen;
      }

      return generateBaseExpansion(candidateId, h);
    }

    case 'converge': {
      const convergeMatch = prompt.match(/\[CONVERGE_IDS:([^\]]+)\]/);
      const ids = convergeMatch
        ? convergeMatch[1].split(',')
        : [seededId(hash, 0), seededId(hash, 1)];

      const scorecard = ids.map((id, i) => ({
        candidateId: id,
        novelty: Math.round((6 + (hash % 4) + i * 0.7) * 10) / 10,
        usefulness: Math.round((7 + ((hash >> 3) % 3) - i * 0.5) * 10) / 10,
        feasibility: Math.round((5 + ((hash >> 6) % 4) + i * 0.3) * 10) / 10,
        differentiation: Math.round((7 + ((hash >> 9) % 3) - i * 0.8) * 10) / 10,
        energyGuess: Math.round((6 + ((hash >> 12) % 3) + i * 0.2) * 10) / 10,
        rationale: i === 0
          ? 'Strongest overall profile with high novelty and differentiation. Feasibility is the main risk but manageable with phased execution.'
          : i === 1
            ? 'Most practical and useful option. Lower novelty compensated by higher feasibility and clearer path to market.'
            : `Solid candidate with balanced scores across all dimensions. Worth considering as an alternative. (${h})`,
      }));

      const sorted = [...scorecard].sort((a, b) => {
        const ta = a.novelty + a.usefulness + a.feasibility + a.differentiation + a.energyGuess;
        const tb = b.novelty + b.usefulness + b.feasibility + b.differentiation + b.energyGuess;
        return tb - ta;
      });

      return {
        scorecard: sorted,
        winnerId: sorted[0]?.candidateId,
        runnerUpId: sorted[1]?.candidateId,
        cutsToShip: sorted[0]
          ? [{
              candidateId: sorted[0].candidateId,
              cuts: 'Cut: social features (add in v2). Cut: analytics dashboard (manual reports first). Cut: multi-platform (web-only MVP).',
            }]
          : [],
      };
    }

    case 'commit':
      return {
        artifactType: 'Product Concept',
        title: `Concept Alpha-${h}`,
        differentiator: 'Automated intelligence that eliminates manual configuration while maintaining user control.',
        constraints: 'Must ship MVP within 3 months. Bootstrap budget. Single developer.',
        first60Minutes: 'Define core data schema. Scaffold project. Build the primary user interaction loop.',
        next3Actions: '1. Validate core assumption with 5 target users.\n2. Build throwaway prototype of key feature.\n3. Set up feedback collection pipeline.',
        riskNotes: 'Primary risk: technical complexity. Mitigate by shipping simple rule-based version first. Secondary risk: market timing. Mitigate by launching fast and iterating.',
      };

    case 'iterate':
      return {
        nextPromptSuggestions:
          'Consider exploring:\n1. How might the core differentiator evolve with user feedback?\n2. What adjacent problems could this solution address?\n3. How would the architecture need to change to support 10x more users?',
      };

    default:
      return {};
  }
}

function generateBaseExpansion(candidateId: string, h: number) {
  return {
    candidateId,
    concept: `A focused tool that delivers immediate value through smart defaults and progressive disclosure (variant ${h}).`,
    differentiator: `Zero-config setup that adapts to user behavior patterns within the first session.`,
    scope: {
      tighten: 'Start with a single use case (solo creator workflow). Remove multi-user features.',
      loosen: 'Expand to team workflows, add marketplace for community-created templates.',
    },
    risks: [
      { risk: 'Technical complexity may delay launch', mitigation: 'Start with rule-based system, add ML later' },
      { risk: 'Users may distrust automated decisions', mitigation: 'Always show reasoning and allow overrides' },
      { risk: 'Market may shift during build', mitigation: 'Ship smallest viable increment every 2 weeks' },
    ],
    planDay1: 'Set up project, define core data model, build basic interaction scaffold. Talk to 3 potential users.',
    planWeek1: 'Complete core loop, add 3 key automations, run first user test. Write up findings.',
  };
}

export const mockProvider: Provider = {
  async generateStructured<T>(opts: ProviderGenerateOpts<T>): Promise<T> {
    const hash = simpleHash(opts.prompt);
    const stageMatch = opts.prompt.match(/\[STAGE:([^\]]+)\]/);
    const stageHint = stageMatch ? stageMatch[1] : 'unknown';
    const result = generateMockForStage(stageHint, hash, opts.prompt);
    return opts.schema.parse(result) as T;
  },

  async multiSampleStructured<T>(
    opts: ProviderGenerateOpts<T> & { n: number },
  ): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < opts.n; i++) {
      const modifiedPrompt = `${opts.prompt} [SAMPLE:${i}]`;
      const hash = simpleHash(modifiedPrompt);
      const stageMatch = opts.prompt.match(/\[STAGE:([^\]]+)\]/);
      const stageHint = stageMatch ? stageMatch[1] : 'unknown';
      const result = generateMockForStage(stageHint, hash, modifiedPrompt);
      results.push(opts.schema.parse(result) as T);
    }
    return results;
  },
};
