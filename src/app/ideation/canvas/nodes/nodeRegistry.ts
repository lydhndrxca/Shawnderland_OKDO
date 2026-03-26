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

export type OutputNodeType = 'textOutput' | 'imageOutput' | 'videoOutput' | 'generateReport' | 'artDirector' | 'adDirectionResult' | 'levelDesignDirector' | 'ldDirectionResult';
export type InputNodeType = 'count';
export type InfluenceNodeType = 'emotion' | 'influence' | 'textInfluence' | 'documentInfluence' | 'imageInfluence' | 'linkInfluence' | 'videoInfluence' | 'wrPersona' | 'agentThinking';
export type PromptInjectionNodeType = 'preprompt' | 'postprompt';
export type UtilityNodeType = 'imageReference' | 'extractData';
export type ControlNodeType = 'start';
export type ResultNodeType = 'resultNode';
export type GroupNodeType = 'group';
export type PackedPipelineNodeType = 'packedPipeline';
export type CharGeneratorNodeType =
  | 'charIdentity' | 'charDescription' | 'charAttributes'
  | 'charExtractAttrs' | 'charEnhanceDesc'
  | 'charGenerate' | 'charGenViews'
  | 'charRefCallout' | 'charViewer' | 'charImageViewer'
  | 'charEdit' | 'charHistory'
  | 'charReset' | 'charSendPS' | 'charShowXML' | 'charQuickGen' | 'charProject'
  | 'charGate' | 'charMainViewer' | 'charFrontViewer' | 'charBackViewer' | 'charSideViewer'
  | 'charStyle' | 'charImageBucket' | 'charRandomize' | 'charCustomView'
  | 'charSaveGroup' | 'charUpscale' | 'charRestore' | 'charCreativeDirector' | 'imageStudio' | 'geminiEditor' | 'detachedViewer';
export type ThreeDGenNodeType = 'meshyImageTo3D' | 'meshyModelViewer' | 'hitem3dImageTo3D';
export type AudioAINodeType = 'elTTS' | 'elSFX' | 'elVoiceClone' | 'elVoiceScript' | 'elVoiceDesigner' | 'elDialogueWriter';
export type AnyNodeType = StageId | OutputNodeType | InputNodeType | InfluenceNodeType | PromptInjectionNodeType | UtilityNodeType | ControlNodeType | ResultNodeType | GroupNodeType | PackedPipelineNodeType | CharGeneratorNodeType | ThreeDGenNodeType | AudioAINodeType;

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
  generateReport: {
    type: 'generateReport',
    label: 'Generate Report',
    color: '#4fc3f7',
    tooltip: 'Generates a comprehensive report from the idea pipeline output.',
  },
  artDirector: {
    type: 'artDirector',
    label: 'Art Director',
    color: '#ffb74d',
    tooltip: 'Hollywood art direction feedback through a 6-phase ideation gauntlet.',
  },
  adDirectionResult: {
    type: 'adDirectionResult',
    label: 'AD Direction Result',
    color: '#ffcc80',
    tooltip: 'A single art direction point with annotated image.',
  },
  levelDesignDirector: {
    type: 'levelDesignDirector',
    label: 'Level Design Director',
    color: '#81c784',
    tooltip: 'AAA level layout feedback through a 6-phase ideation gauntlet.',
  },
  ldDirectionResult: {
    type: 'ldDirectionResult',
    label: 'LD Direction Result',
    color: '#a5d6a7',
    tooltip: 'A single level design direction point with annotated image.',
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
  wrPersona: {
    type: 'wrPersona',
    label: 'Creative Persona',
    color: '#7c4dff',
    tooltip: 'Assign a Writing Room bot persona to the pipeline. The AI channels their creative voice, personality, and decision-making style into every stage.',
  },
  agentThinking: {
    type: 'agentThinking',
    label: 'Agent Thinking',
    color: '#f59e0b',
    tooltip: 'Displays the persona\'s thought process as they work through each stage. Connect from the Creative Persona node.',
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

export const OUTPUT_NODE_TYPES: OutputNodeType[] = ['textOutput', 'imageOutput', 'videoOutput', 'generateReport', 'artDirector', 'levelDesignDirector', 'ldDirectionResult'];
export const INPUT_NODE_TYPES: InputNodeType[] = ['count'];
export const INFLUENCE_NODE_TYPES: InfluenceNodeType[] = ['emotion', 'influence', 'textInfluence', 'documentInfluence', 'imageInfluence', 'linkInfluence', 'videoInfluence', 'wrPersona', 'agentThinking'];
export const UTILITY_NODE_TYPES: UtilityNodeType[] = ['imageReference', 'extractData'];
export const GROUP_NODE_TYPES: GroupNodeType[] = ['group'];

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
  const sourceIsOutput = OUTPUT_NODE_TYPES.includes(source as OutputNodeType);

  if (sourceIsStage && targetIsStage) return true;
  if (sourceIsStage && targetIsOutput) return true;
  if (sourceIsInput && targetIsOutput) return true;
  if (sourceIsInput && targetIsStage) return true;

  const targetIsInfluence = INFLUENCE_NODE_TYPES.includes(target as InfluenceNodeType);

  if (sourceIsInfluence && targetIsStage) return true;
  if (sourceIsInfluence && targetIsOutput) return true;
  if (sourceIsInfluence && targetIsUtility) return true;
  if (sourceIsInfluence && targetIsInfluence && source !== target) return true;
  if (sourceIsStage && targetIsInfluence) return true;

  if (source === 'imageReference' && (target === 'extractData' || targetIsOutput || targetIsStage)) return true;
  if (source === 'extractData' && (targetIsStage || targetIsOutput)) return true;
  if (sourceIsUtility && targetIsUtility && source !== target) return true;
  if (sourceIsUtility && targetIsOutput) return true;

  if (sourceIsOutput && (targetIsUtility || targetIsStage || targetIsOutput || targetIsPromptInjection)) return true;

  if (sourceIsPromptInjection && targetIsStage) return true;
  if (sourceIsPromptInjection && targetIsOutput) return true;
  if (sourceIsPromptInjection && targetIsUtility) return true;
  if (sourceIsPromptInjection && targetIsPromptInjection && source !== target) return true;
  if (sourceIsStage && targetIsPromptInjection) return true;
  if (sourceIsInfluence && targetIsPromptInjection) return true;
  if (sourceIsUtility && targetIsPromptInjection) return true;

  // Character Generator connections — flexible chaining
  const CHAR_GEN_TYPES: string[] = [
    'charIdentity', 'charDescription', 'charAttributes',
    'charExtractAttrs', 'charEnhanceDesc',
    'charGenerate', 'charGenViews',
    'charRefCallout', 'charViewer', 'charImageViewer',
    'charEdit', 'charHistory',
    'charReset', 'charSendPS', 'charShowXML', 'charQuickGen', 'charProject',
    'charGate', 'charMainViewer', 'charFrontViewer', 'charBackViewer', 'charSideViewer',
    'charStyle', 'charImageBucket', 'charRandomize', 'charCustomView',
    'charSaveGroup', 'charUpscale', 'charRestore', 'charCreativeDirector', 'imageStudio', 'geminiEditor', 'detachedViewer',
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
  if (sourceIsOutput && targetIsCharGen) return true;

  // 3D Gen AI connections
  const THREED_GEN_TYPES: string[] = ['meshyImageTo3D', 'meshyModelViewer', 'hitem3dImageTo3D'];
  const sourceIs3DGen = THREED_GEN_TYPES.includes(source);
  const targetIs3DGen = THREED_GEN_TYPES.includes(target);

  if (sourceIs3DGen && targetIs3DGen && source !== target) return true;
  if (sourceIsCharGen && targetIs3DGen) return true;
  if (sourceIs3DGen && targetIsCharGen) return true;
  if (sourceIs3DGen && targetIsOutput) return true;
  if (sourceIsUtility && targetIs3DGen) return true;
  if (sourceIsInfluence && targetIs3DGen) return true;

  // Prop Lab connections
  const PROP_LAB_TYPES: string[] = [
    'propIdentity', 'propDescription', 'propAttributes', 'propStyle',
    'propGenerate', 'propExtractAttrs', 'propEnhanceDesc', 'propRefCallout',
    'propMainViewer', 'propFrontViewer', 'propBackViewer', 'propSideViewer', 'propTopViewer',
  ];
  const sourceIsPropLab = PROP_LAB_TYPES.includes(source);
  const targetIsPropLab = PROP_LAB_TYPES.includes(target);

  if (sourceIsPropLab && targetIsPropLab && source !== target) return true;
  if (sourceIsPropLab && targetIsOutput) return true;
  if (sourceIsPropLab && targetIsCharGen) return true;
  if (sourceIsCharGen && targetIsPropLab) return true;
  if (sourceIsPropLab && targetIsUtility) return true;
  if (sourceIsUtility && targetIsPropLab) return true;
  if (sourceIsInfluence && targetIsPropLab) return true;
  if (sourceIsOutput && targetIsPropLab) return true;
  if (sourceIsPropLab && targetIs3DGen) return true;

  // Audio AI connections
  const AUDIO_AI_TYPES: string[] = ['elTTS', 'elSFX', 'elVoiceClone', 'elVoiceScript', 'elVoiceDesigner', 'elDialogueWriter'];
  const sourceIsAudio = AUDIO_AI_TYPES.includes(source);
  const targetIsAudio = AUDIO_AI_TYPES.includes(target);

  if (sourceIsAudio && targetIsAudio && source !== target) return true;
  if (sourceIsCharGen && targetIsAudio) return true;
  if (sourceIsAudio && targetIsCharGen) return true;
  if (sourceIsAudio && targetIsOutput) return true;
  if (sourceIsOutput && targetIsAudio) return true;
  if (sourceIsUtility && targetIsAudio) return true;
  if (sourceIsInfluence && targetIsAudio) return true;
  if (sourceIsStage && targetIsAudio) return true;
  if (sourceIsPromptInjection && targetIsAudio) return true;

  return false;
}

export const NODE_DEFAULT_STYLE: Record<string, { width: number; height: number }> = {
  charImageViewer: { width: 600, height: 700 },
  charViewer: { width: 600, height: 700 },
  charHistory: { width: 260, height: 500 },
  charMainViewer: { width: 600, height: 700 },
  charFrontViewer: { width: 300, height: 400 },
  charBackViewer: { width: 300, height: 400 },
  charSideViewer: { width: 300, height: 400 },
  charGate: { width: 160, height: 80 },
  charStyle: { width: 360, height: 400 },
  charImageBucket: { width: 240, height: 180 },
  charRandomize: { width: 180, height: 100 },
  charCustomView: { width: 400, height: 500 },
  charSaveGroup: { width: 280, height: 240 },
  charUpscale: { width: 240, height: 260 },
  charRestore: { width: 260, height: 320 },
  charCreativeDirector: { width: 820, height: 500 },
  imageStudio: { width: 240, height: 220 },
  geminiEditor: { width: 240, height: 220 },
  detachedViewer: { width: 350, height: 400 },
  meshyImageTo3D: { width: 340, height: 620 },
  meshyModelViewer: { width: 480, height: 640 },
  hitem3dImageTo3D: { width: 340, height: 640 },
  elTTS: { width: 340, height: 560 },
  elSFX: { width: 320, height: 420 },
  elVoiceClone: { width: 340, height: 520 },
  elVoiceScript: { width: 340, height: 500 },
  elVoiceDesigner: { width: 340, height: 420 },
  elDialogueWriter: { width: 360, height: 520 },
};
