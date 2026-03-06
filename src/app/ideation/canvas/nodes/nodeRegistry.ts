import type { StageId } from '@/lib/ideation/engine/stages';

export interface NodeMeta {
  stageId: StageId;
  label: string;
  color: string;
  tooltip: string;
  runLabel: string;
  loadingMessage: string;
  inputTooltip: string;
  outputTooltip: string;
}

export const NODE_META: Record<StageId, NodeMeta> = {
  seed: {
    stageId: 'seed',
    label: 'Idea Seed',
    color: '#6c63ff',
    tooltip: 'This is where you type your idea. It can be anything \u2014 a product, a hobby, a problem you want to solve. The AI will take it from here.',
    runLabel: 'Start Exploring',
    loadingMessage: 'Capturing your idea...',
    inputTooltip: 'Receives input from other nodes (like Emotion) to influence your idea.',
    outputTooltip: 'Sends your idea to Normalize for analysis.',
  },
  normalize: {
    stageId: 'normalize',
    label: 'Normalize',
    color: '#64b5f6',
    tooltip: 'Takes your raw idea and breaks it down: a clear summary, assumptions (things we\u2019re guessing about your idea), and questions (things that are unclear). Think of it as organizing your thoughts.',
    runLabel: 'Analyze',
    loadingMessage: 'Analyzing your idea...',
    inputTooltip: 'Receives your raw idea from Seed.',
    outputTooltip: 'Sends the structured analysis to Diverge.',
  },
  diverge: {
    stageId: 'diverge',
    label: 'Diverge',
    color: '#69f0ae',
    tooltip: 'Brainstorms lots of different takes on your idea. Generates practical approaches, opposite-thinking twists, and creative constraint-based variations. The goal is quantity and variety.',
    runLabel: 'Generate',
    loadingMessage: 'Generating candidates across 3 lenses...',
    inputTooltip: 'Receives the structured analysis from Normalize.',
    outputTooltip: 'Sends all the candidate ideas to Critique.',
  },
  'critique-salvage': {
    stageId: 'critique-salvage',
    label: 'Critique',
    color: '#ff8a65',
    tooltip: 'Reviews each brainstormed idea and rates how generic or unique it is. Ideas that are too generic get improved with "mutations" \u2014 creative tweaks to make them more original.',
    runLabel: 'Evaluate',
    loadingMessage: 'Evaluating and salvaging candidates...',
    inputTooltip: 'Receives candidate ideas from Diverge.',
    outputTooltip: 'Sends evaluated and improved ideas to Expand.',
  },
  expand: {
    stageId: 'expand',
    label: 'Expand',
    color: '#ce93d8',
    tooltip: 'Takes the best ideas and does a deep dive \u2014 identifies risks, creates action plans, defines scope, and figures out what would need to happen on day 1 and week 1.',
    runLabel: 'Deep Dive',
    loadingMessage: 'Deep-diving into candidates...',
    inputTooltip: 'Receives the top candidates from Critique.',
    outputTooltip: 'Sends expanded ideas to Converge for scoring.',
  },
  converge: {
    stageId: 'converge',
    label: 'Converge',
    color: '#ffd54f',
    tooltip: 'Scores and ranks all the expanded ideas on novelty, usefulness, feasibility, and energy. Picks a winner and suggests what to cut to ship faster.',
    runLabel: 'Score & Rank',
    loadingMessage: 'Scoring and ranking candidates...',
    inputTooltip: 'Receives expanded ideas from Expand.',
    outputTooltip: 'Sends the winning idea to Commit.',
  },
  commit: {
    stageId: 'commit',
    label: 'Commit',
    color: '#4db6ac',
    tooltip: 'Creates a final, polished artifact from your winning idea \u2014 complete with a title, differentiator, and a clear action plan for next steps.',
    runLabel: 'Create Artifact',
    loadingMessage: 'Creating your artifact...',
    inputTooltip: 'Receives the winning idea from Converge.',
    outputTooltip: 'Sends the artifact to Iterate for follow-up ideas.',
  },
  iterate: {
    stageId: 'iterate',
    label: 'Iterate',
    color: '#90a4ae',
    tooltip: 'Suggests follow-up prompts and next steps you could explore. Use these to start a new round of ideation or branch off in a new direction.',
    runLabel: 'Plan Next',
    loadingMessage: 'Planning next steps...',
    inputTooltip: 'Receives the final artifact from Commit.',
    outputTooltip: '',
  },
};

export const STAGE_ORDER: StageId[] = [
  'seed', 'normalize', 'diverge', 'critique-salvage',
  'expand', 'converge', 'commit', 'iterate',
];

export type OutputNodeType = 'textOutput' | 'imageOutput' | 'videoOutput';
export type InputNodeType = 'count';
export type InfluenceNodeType = 'emotion' | 'influence' | 'textInfluence' | 'documentInfluence' | 'imageInfluence' | 'linkInfluence' | 'videoInfluence';
export type PromptInjectionNodeType = 'preprompt' | 'postprompt';
export type UtilityNodeType = 'imageReference' | 'extractData';
export type ControlNodeType = 'start';
export type ResultNodeType = 'resultNode';
export type GroupNodeType = 'group';
export type PackedPipelineNodeType = 'packedPipeline';
export type ConceptLabNodeType = 'character' | 'weapon' | 'turnaround';
export type CharGeneratorNodeType =
  | 'charIdentity' | 'charDescription' | 'charAttributes'
  | 'charExtractAttrs' | 'charEnhanceDesc'
  | 'charGenerate' | 'charGenViews'
  | 'charRefCallout' | 'charViewer'
  | 'charEdit' | 'charHistory'
  | 'charReset' | 'charSendPS' | 'charShowXML' | 'charQuickGen' | 'charProject';
export type AnyNodeType = StageId | OutputNodeType | InputNodeType | InfluenceNodeType | PromptInjectionNodeType | UtilityNodeType | ControlNodeType | ResultNodeType | GroupNodeType | PackedPipelineNodeType | ConceptLabNodeType | CharGeneratorNodeType;

export interface OutputNodeMeta {
  type: OutputNodeType;
  label: string;
  color: string;
  tooltip: string;
}

export interface InputNodeMeta {
  type: InputNodeType;
  label: string;
  color: string;
  tooltip: string;
}

export const OUTPUT_NODE_META: Record<OutputNodeType, OutputNodeMeta> = {
  textOutput: {
    type: 'textOutput',
    label: 'Text Output',
    color: '#e0e0e0',
    tooltip: 'Shows your idea as formatted, copyable text. Connect any pipeline node to see its output here.',
  },
  imageOutput: {
    type: 'imageOutput',
    label: 'Image Output',
    color: '#f06292',
    tooltip: 'Generates images from your idea using AI image models. Pick a model, set options, and hit generate.',
  },
  videoOutput: {
    type: 'videoOutput',
    label: 'Video Output',
    color: '#ba68c8',
    tooltip: 'Generates short video clips from your idea using AI video models.',
  },
};

export const INPUT_NODE_META: Record<InputNodeType, InputNodeMeta> = {
  count: {
    type: 'count',
    label: 'Count',
    color: '#78909c',
    tooltip: 'Sets how many results to generate. Connect this to an output node to control quantity.',
  },
};

export interface InfluenceNodeMeta {
  type: InfluenceNodeType;
  label: string;
  color: string;
  tooltip: string;
}

export const INFLUENCE_NODE_META: Record<InfluenceNodeType, InfluenceNodeMeta> = {
  emotion: {
    type: 'emotion',
    label: 'Emotion',
    color: '#e57373',
    tooltip: 'Injects an emotional tone or feeling into the process. Type how you want the idea to feel \u2014 "playful", "serious", "rebellious", etc.',
  },
  influence: {
    type: 'influence',
    label: 'Persona',
    color: '#ab47bc',
    tooltip: 'Channels a real person\u2019s creative style into the pipeline. Type a name (director, writer, artist) and the AI weaves their known creative philosophy and decision-making patterns into the idea from this connection point onward.',
  },
  textInfluence: {
    type: 'textInfluence',
    label: 'Text',
    color: '#7986cb',
    tooltip: 'Paste any text as an influence \u2014 articles, notes, transcripts, or reference material. The AI considers this content.',
  },
  documentInfluence: {
    type: 'documentInfluence',
    label: 'Document',
    color: '#a1887f',
    tooltip: 'Upload a document (.txt, .md, .pdf) and its content becomes an influence on the pipeline.',
  },
  imageInfluence: {
    type: 'imageInfluence',
    label: 'Image',
    color: '#4db6ac',
    tooltip: 'Add an image as a visual influence. The AI will analyze it and incorporate what it sees into the process.',
  },
  linkInfluence: {
    type: 'linkInfluence',
    label: 'Link',
    color: '#4fc3f7',
    tooltip: 'Paste a URL (website, article, video) as an influence. The AI considers the linked content.',
  },
  videoInfluence: {
    type: 'videoInfluence',
    label: 'Video',
    color: '#ce93d8',
    tooltip: 'Upload a video file (.mp4, .webm, .mov) to influence the pipeline with visual content.',
  },
};

export interface PromptInjectionNodeMeta {
  type: PromptInjectionNodeType;
  label: string;
  color: string;
  tooltip: string;
}

export const PROMPT_INJECTION_NODE_META: Record<PromptInjectionNodeType, PromptInjectionNodeMeta> = {
  preprompt: {
    type: 'preprompt',
    label: 'Preprompt',
    color: '#66bb6a',
    tooltip: 'Injects text BEFORE incoming data — sets the frame, lens, or context the AI reads everything through. Great for "Keep this in mind when reading what follows."',
  },
  postprompt: {
    type: 'postprompt',
    label: 'PostPrompt',
    color: '#ffa726',
    tooltip: 'Injects text AFTER incoming data — tells the AI what to DO with everything it just read. Great for "Summarize the above into an image prompt."',
  },
};

export const PROMPT_INJECTION_NODE_TYPES: PromptInjectionNodeType[] = ['preprompt', 'postprompt'];

export interface ControlNodeMeta {
  type: ControlNodeType;
  label: string;
  color: string;
  tooltip: string;
}

export const CONTROL_NODE_META: Record<ControlNodeType, ControlNodeMeta> = {
  start: {
    type: 'start',
    label: 'Start',
    color: '#42a5f5',
    tooltip: 'Run controller \u2014 choose Automated to run the full pipeline end-to-end, or Interactive for step-by-step guidance.',
  },
};

export interface GroupNodeMeta {
  type: GroupNodeType;
  label: string;
  color: string;
  tooltip: string;
}

export const GROUP_NODE_META: Record<GroupNodeType, GroupNodeMeta> = {
  group: {
    type: 'group',
    label: 'Group',
    color: '#607d8b',
    tooltip: 'A visual collection of nodes. Double-click to expand or collapse. Select nodes and right-click to create a group.',
  },
};

export interface PackedPipelineNodeMeta {
  type: PackedPipelineNodeType;
  label: string;
  color: string;
  tooltip: string;
}

export const PACKED_PIPELINE_NODE_META: Record<PackedPipelineNodeType, PackedPipelineNodeMeta> = {
  packedPipeline: {
    type: 'packedPipeline',
    label: 'Full Pipeline',
    color: '#4db6ac',
    tooltip: 'A compact view of the entire pipeline. Right-click to expand into individual stages.',
  },
};

export interface UtilityNodeMeta {
  type: UtilityNodeType;
  label: string;
  color: string;
  tooltip: string;
}

export const UTILITY_NODE_META: Record<UtilityNodeType, UtilityNodeMeta> = {
  imageReference: {
    type: 'imageReference',
    label: 'Image',
    color: '#26a69a',
    tooltip: 'Load or paste an image as a visual reference. The AI will see and analyze it when connected to other nodes.',
  },
  extractData: {
    type: 'extractData',
    label: 'Extract Data',
    color: '#ffab40',
    tooltip: 'Reads an image and extracts a text description or visual style info using AI vision.',
  },
};

export interface ResultNodeMeta {
  type: ResultNodeType;
  label: string;
  color: string;
  tooltip: string;
}

export const RESULT_NODE_META: Record<ResultNodeType, ResultNodeMeta> = {
  resultNode: {
    type: 'resultNode',
    label: 'Result',
    color: '#80cbc4',
    tooltip: 'Shows the output from a completed step. Click to expand results. Drag a result out to use it as a new starting point.',
  },
};

export const OUTPUT_NODE_TYPES: OutputNodeType[] = ['textOutput', 'imageOutput', 'videoOutput'];
export const INPUT_NODE_TYPES: InputNodeType[] = ['count'];
export const INFLUENCE_NODE_TYPES: InfluenceNodeType[] = ['emotion', 'influence', 'textInfluence', 'documentInfluence', 'imageInfluence', 'linkInfluence', 'videoInfluence'];
export const UTILITY_NODE_TYPES: UtilityNodeType[] = ['imageReference', 'extractData'];
export const CONTROL_NODE_TYPES: ControlNodeType[] = ['start'];
export const RESULT_NODE_TYPES: ResultNodeType[] = ['resultNode'];
export const GROUP_NODE_TYPES: GroupNodeType[] = ['group'];
export const CONCEPTLAB_NODE_TYPES: ConceptLabNodeType[] = ['character', 'weapon', 'turnaround'];

export interface ConceptLabNodeMeta {
  type: ConceptLabNodeType;
  label: string;
  color: string;
  tooltip: string;
}

export const CONCEPTLAB_NODE_META: Record<ConceptLabNodeType, ConceptLabNodeMeta> = {
  character: {
    type: 'character',
    label: 'Character',
    color: '#7c4dff',
    tooltip: 'Design a character with detailed attribute controls. Generate full-body images with AI. Expand the side panel for clothing, gear, and identity options.',
  },
  weapon: {
    type: 'weapon',
    label: 'Weapon',
    color: '#ff6d00',
    tooltip: 'Design a weapon with component-level controls. Generate weapon renders with AI. Expand the side panel for receiver, barrel, stock, finish, and condition.',
  },
  turnaround: {
    type: 'turnaround',
    label: 'Turnaround',
    color: '#00bfa5',
    tooltip: 'Generate multi-view turnaround sheets from a Character or Weapon image. Connect a source node and generate front, back, side, and 3/4 views.',
  },
};

export function getValidTargets(sourceStage: StageId): StageId[] {
  const idx = STAGE_ORDER.indexOf(sourceStage);
  if (idx === -1) return [];
  return STAGE_ORDER.slice(idx + 1);
}

export function isValidConnection(source: string, target: string): boolean {
  if (source === target) return false;

  const sourceIsStage = STAGE_ORDER.includes(source as StageId);
  const targetIsStage = STAGE_ORDER.includes(target as StageId);
  const targetIsOutput = OUTPUT_NODE_TYPES.includes(target as OutputNodeType);
  const sourceIsInput = INPUT_NODE_TYPES.includes(source as InputNodeType);
  const sourceIsInfluence = INFLUENCE_NODE_TYPES.includes(source as InfluenceNodeType);
  const sourceIsPromptInjection = PROMPT_INJECTION_NODE_TYPES.includes(source as PromptInjectionNodeType);
  const targetIsPromptInjection = PROMPT_INJECTION_NODE_TYPES.includes(target as PromptInjectionNodeType);
  const sourceIsUtility = UTILITY_NODE_TYPES.includes(source as UtilityNodeType);
  const targetIsUtility = UTILITY_NODE_TYPES.includes(target as UtilityNodeType);
  const sourceIsResult = RESULT_NODE_TYPES.includes(source as ResultNodeType);
  const sourceIsControl = CONTROL_NODE_TYPES.includes(source as ControlNodeType);
  const sourceIsPacked = source === 'packedPipeline' || (source as string).startsWith('packedPipeline');
  const targetIsPacked = target === 'packedPipeline' || (target as string).startsWith('packedPipeline');
  const sourceIsOutput = OUTPUT_NODE_TYPES.includes(source as OutputNodeType);
  const sourceIsConceptLab = CONCEPTLAB_NODE_TYPES.includes(source as ConceptLabNodeType);
  const targetIsConceptLab = CONCEPTLAB_NODE_TYPES.includes(target as ConceptLabNodeType);

  if (sourceIsControl && targetIsPacked) return true;
  if (sourceIsPacked && (targetIsOutput || targetIsStage)) return true;

  if (sourceIsStage && targetIsStage) return true;
  if (sourceIsStage && targetIsOutput) return true;
  if (sourceIsInput && targetIsOutput) return true;
  if (sourceIsInput && targetIsStage) return true;

  if (sourceIsInfluence && targetIsStage) return true;
  if (sourceIsInfluence && targetIsOutput) return true;
  if (sourceIsInfluence && targetIsUtility) return true;
  if (sourceIsInfluence && targetIsConceptLab) return true;

  if (sourceIsControl && targetIsStage) return true;

  if (source === 'imageReference' && (target === 'extractData' || targetIsOutput || targetIsStage)) return true;
  if (source === 'extractData' && (targetIsStage || targetIsOutput)) return true;
  if (sourceIsUtility && targetIsUtility && source !== target) return true;
  if (sourceIsUtility && targetIsOutput) return true;

  if (sourceIsResult && (targetIsStage || targetIsOutput || targetIsUtility)) return true;
  if (sourceIsOutput && (targetIsUtility || targetIsStage || targetIsOutput || targetIsPromptInjection)) return true;

  // Preprompt/PostPrompt connections — can be wired inline in the flow
  if (sourceIsPromptInjection && targetIsStage) return true;
  if (sourceIsPromptInjection && targetIsOutput) return true;
  if (sourceIsPromptInjection && targetIsUtility) return true;
  if (sourceIsPromptInjection && targetIsConceptLab) return true;
  if (sourceIsPromptInjection && targetIsPromptInjection && source !== target) return true;
  if (sourceIsStage && targetIsPromptInjection) return true;
  if (sourceIsInfluence && targetIsPromptInjection) return true;
  if (sourceIsResult && targetIsPromptInjection) return true;
  if (sourceIsUtility && targetIsPromptInjection) return true;

  // ConceptLab connections
  if ((source === 'character' || source === 'weapon') && target === 'turnaround') return true;
  if (sourceIsConceptLab && targetIsOutput) return true;
  if (sourceIsConceptLab && targetIsConceptLab && source !== target) return true;
  if (source === 'imageReference' && targetIsConceptLab) return true;

  // Character Generator connections — flexible chaining
  const CHAR_GEN_TYPES: string[] = [
    'charIdentity', 'charDescription', 'charAttributes',
    'charExtractAttrs', 'charEnhanceDesc',
    'charGenerate', 'charGenViews',
    'charRefCallout', 'charViewer',
    'charEdit', 'charHistory',
    'charReset', 'charSendPS', 'charShowXML', 'charQuickGen', 'charProject',
  ];
  const sourceIsCharGen = CHAR_GEN_TYPES.includes(source);
  const targetIsCharGen = CHAR_GEN_TYPES.includes(target);

  if (sourceIsCharGen && targetIsCharGen && source !== target) return true;
  if (sourceIsCharGen && targetIsOutput) return true;
  if (sourceIsCharGen && targetIsUtility) return true;
  if (sourceIsUtility && targetIsCharGen) return true;
  if (sourceIsInfluence && targetIsCharGen) return true;
  if (source === 'imageReference' && targetIsCharGen) return true;
  if (sourceIsPromptInjection && targetIsCharGen) return true;
  if (sourceIsResult && targetIsCharGen) return true;
  if (sourceIsCharGen && targetIsConceptLab) return true;
  if (sourceIsConceptLab && targetIsCharGen) return true;
  if (sourceIsOutput && targetIsCharGen) return true;

  return false;
}

export const NODE_DEFAULT_STYLE: Record<string, { width: number; height: number }> = {
  character: { width: 240, height: 200 },
  weapon: { width: 240, height: 220 },
};
