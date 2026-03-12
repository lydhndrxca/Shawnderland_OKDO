"use client";

/**
 * Unified node type registry shared across ALL applications.
 * Every app (ShawnderMind, Concept Lab, Tool Editor)
 * imports from here so all nodes are available everywhere.
 */

import type { NodeTypes } from '@xyflow/react';

// ── Pipeline stage nodes (ShawnderMind) ─────────────────────────
import SeedNode from '@/app/ideation/canvas/nodes/SeedNode';
import NormalizeNode from '@/app/ideation/canvas/nodes/NormalizeNode';
import DivergeNode from '@/app/ideation/canvas/nodes/DivergeNode';
import CritiqueNode from '@/app/ideation/canvas/nodes/CritiqueNode';
import ExpandNode from '@/app/ideation/canvas/nodes/ExpandNode';
import ConvergeNode from '@/app/ideation/canvas/nodes/ConvergeNode';
import CommitNode from '@/app/ideation/canvas/nodes/CommitNode';
import IterateNode from '@/app/ideation/canvas/nodes/IterateNode';

// ── Output / Input / Utility nodes ──────────────────────────────
import TextOutputNode from '@/app/ideation/canvas/nodes/TextOutputNode';
import ImageOutputNode from '@/app/ideation/canvas/nodes/ImageOutputNode';
import VideoOutputNode from '@/app/ideation/canvas/nodes/VideoOutputNode';
import CountNode from '@/app/ideation/canvas/nodes/CountNode';
import ImageReferenceNode from '@/app/ideation/canvas/nodes/ImageReferenceNode';
import ExtractDataNode from '@/app/ideation/canvas/nodes/ExtractDataNode';
import VideoAnalysisNode from '@/app/ideation/canvas/nodes/VideoAnalysisNode';

// ── Influence nodes ─────────────────────────────────────────────
import EmotionNode from '@/app/ideation/canvas/nodes/EmotionNode';
import InfluenceNode from '@/app/ideation/canvas/nodes/InfluenceNode';
import TextInfluenceNode from '@/app/ideation/canvas/nodes/TextInfluenceNode';
import DocumentInfluenceNode from '@/app/ideation/canvas/nodes/DocumentInfluenceNode';
import ImageInfluenceNode from '@/app/ideation/canvas/nodes/ImageInfluenceNode';
import LinkInfluenceNode from '@/app/ideation/canvas/nodes/LinkInfluenceNode';
import VideoInfluenceNode from '@/app/ideation/canvas/nodes/VideoInfluenceNode';

// ── Report nodes ─────────────────────────────────────────────────
import GenerateReportNode from '@/app/ideation/canvas/nodes/GenerateReportNode';

// ── Art Director nodes ──────────────────────────────────────────
import ArtDirectorNode from '@/app/ideation/canvas/nodes/ArtDirectorNode';
import ADDirectionResultNode from '@/app/ideation/canvas/nodes/ADDirectionResultNode';

// ── Level Design Director nodes ─────────────────────────────────
import LevelDesignDirectorNode from '@/app/ideation/canvas/nodes/LevelDesignDirectorNode';
import LDDirectionResultNode from '@/app/ideation/canvas/nodes/LDDirectionResultNode';

// ── Control / Layout nodes ──────────────────────────────────────
import PrepromptNode from '@/app/ideation/canvas/nodes/PrepromptNode';
import PostPromptNode from '@/app/ideation/canvas/nodes/PostPromptNode';
import StartNode from '@/app/ideation/canvas/nodes/StartNode';
import GroupNode from '@/app/ideation/canvas/nodes/GroupNode';
import PackedPipelineNode from '@/app/ideation/canvas/nodes/PackedPipelineNode';
import ResultNode from '@/app/ideation/canvas/nodes/ResultNode';

// ── Concept Lab nodes (removed from dock, kept for runtime compatibility) ──
import CharacterNode from '@/app/ideation/canvas/nodes/CharacterNode';
import WeaponNode from '@/app/ideation/canvas/nodes/WeaponNode';
import TurnaroundNode from '@/app/ideation/canvas/nodes/TurnaroundNode';
import WeapBaseNode from '@/app/concept-lab/nodes/WeapBaseNode';
import WeapComponentsNode from '@/app/concept-lab/nodes/WeapComponentsNode';

// ── Gemini Studio nodes (removed from dock, kept for runtime compatibility) ──
import PromptNode from '@/app/gemini-studio/nodes/PromptNode';
import ImageRefNode from '@/app/gemini-studio/nodes/ImageRefNode';
import ImageGenNode from '@/app/gemini-studio/nodes/ImageGenNode';
import VideoGenNode from '@/app/gemini-studio/nodes/VideoGenNode';
import OutputViewerNode from '@/app/gemini-studio/nodes/OutputViewerNode';

// ── Character Generator nodes ───────────────────────────────────
import CharIdentityNode from '@/app/ideation/canvas/nodes/character/CharIdentityNode';
import CharDescriptionNode from '@/app/ideation/canvas/nodes/character/CharDescriptionNode';
import CharAttributesNode from '@/app/ideation/canvas/nodes/character/CharAttributesNode';
import ExtractAttributesNode from '@/app/ideation/canvas/nodes/character/ExtractAttributesNode';
import EnhanceDescriptionNode from '@/app/ideation/canvas/nodes/character/EnhanceDescriptionNode';
import GenerateCharImageNode from '@/app/ideation/canvas/nodes/character/GenerateCharImageNode';
import GenerateViewsNode from '@/app/ideation/canvas/nodes/character/GenerateViewsNode';
import ReferenceCalloutNode from '@/app/ideation/canvas/nodes/character/ReferenceCalloutNode';
import MainStageViewerNode from '@/app/ideation/canvas/nodes/character/MainStageViewerNode';
import CharViewNode from '@/app/ideation/canvas/nodes/character/CharViewNode';
import ShowXMLNode from '@/app/ideation/canvas/nodes/character/ShowXMLNode';
import QuickGenerateNode from '@/app/ideation/canvas/nodes/character/QuickGenerateNode';
import GateNode from '@/app/ideation/canvas/nodes/character/GateNode';
import StyleNode from '@/app/ideation/canvas/nodes/character/StyleNode';
import ImageBucketNode from '@/app/ideation/canvas/nodes/character/ImageBucketNode';
import RandomizeNode from '@/app/ideation/canvas/nodes/character/RandomizeNode';
import GeminiEditorNode from '@/app/ideation/canvas/nodes/character/GeminiEditorNode';
import SaveGroupNode from '@/app/ideation/canvas/nodes/character/SaveGroupNode';
import UpscaleNode from '@/app/ideation/canvas/nodes/character/UpscaleNode';
import RestoreQualityNode from '@/app/ideation/canvas/nodes/character/RestoreQualityNode';
import CreativeDirectorNode from '@/app/ideation/canvas/nodes/character/CreativeDirectorNode';

// ── Character Generator nodes (removed from dock, kept for runtime compat) ──
import EditCharacterNode from '@/app/ideation/canvas/nodes/character/EditCharacterNode';
import CharHistoryNode from '@/app/ideation/canvas/nodes/character/CharHistoryNode';
import ResetCharacterNode from '@/app/ideation/canvas/nodes/character/ResetCharacterNode';
import SendToPhotoshopNode from '@/app/ideation/canvas/nodes/character/SendToPhotoshopNode';
import ProjectSettingsNode from '@/app/ideation/canvas/nodes/character/ProjectSettingsNode';
import DetachedViewerNode from '@/app/ideation/canvas/nodes/character/DetachedViewerNode';

// ── 3D Gen AI nodes ─────────────────────────────────────────────
import MeshyImageTo3DNode from '@/app/ideation/canvas/nodes/threedgen/MeshyImageTo3DNode';
import MeshyModelViewerNode from '@/app/ideation/canvas/nodes/threedgen/MeshyModelViewerNode';
import Hitem3DImageTo3DNode from '@/app/ideation/canvas/nodes/threedgen/Hitem3DImageTo3DNode';

// ── Audio AI nodes (ElevenLabs) ─────────────────────────────────
import ElevenLabsTTSNode from '@/app/ideation/canvas/nodes/audio/ElevenLabsTTSNode';
import ElevenLabsSFXNode from '@/app/ideation/canvas/nodes/audio/ElevenLabsSFXNode';
import ElevenLabsVoiceCloneNode from '@/app/ideation/canvas/nodes/audio/ElevenLabsVoiceCloneNode';
import VoiceScriptNode from '@/app/ideation/canvas/nodes/audio/VoiceScriptNode';
import VoiceDesignerNode from '@/app/ideation/canvas/nodes/audio/VoiceDesignerNode';
import DialogueWriterNode from '@/app/ideation/canvas/nodes/audio/DialogueWriterNode';

// ── Shared UI element nodes ─────────────────────────────────────
import {
  UIButtonNode, UITextBoxNode, UIDropdownNode,
  UIImageNode, UIWindowNode, UIFrameNode, UIGenericNode,
} from '@/components/nodes/ui';

// ── Tool Editor nodes ───────────────────────────────────────────
import TEGenericNode from '@/app/tool-editor/nodes/GenericNode';
import TEWindowNode from '@/app/tool-editor/nodes/WindowNode';
import TEFrameNode from '@/app/tool-editor/nodes/FrameNode';
import TEButtonNode from '@/app/tool-editor/nodes/ButtonNode';
import TETextBoxNode from '@/app/tool-editor/nodes/TextBoxNode';
import TEDropdownNode from '@/app/tool-editor/nodes/DropdownNode';
import TEImageNode from '@/app/tool-editor/nodes/ImageNode';

/**
 * ALL raw node types (without withCompatCheck or applyResizeToAll).
 * Each application applies those wrappers as needed.
 */
export const ALL_RAW_NODE_TYPES: NodeTypes = {
  // Pipeline stages
  seed: SeedNode,
  normalize: NormalizeNode,
  diverge: DivergeNode,
  'critique-salvage': CritiqueNode,
  expand: ExpandNode,
  converge: ConvergeNode,
  commit: CommitNode,
  iterate: IterateNode,

  // Outputs
  textOutput: TextOutputNode,
  imageOutput: ImageOutputNode,
  videoOutput: VideoOutputNode,

  // Inputs / Utility
  count: CountNode,
  imageReference: ImageReferenceNode,
  extractData: ExtractDataNode,
  videoAnalysis: VideoAnalysisNode,

  // Influences
  emotion: EmotionNode,
  influence: InfluenceNode,
  textInfluence: TextInfluenceNode,
  documentInfluence: DocumentInfluenceNode,
  imageInfluence: ImageInfluenceNode,
  linkInfluence: LinkInfluenceNode,
  videoInfluence: VideoInfluenceNode,

  // Prompt injection
  preprompt: PrepromptNode,
  postprompt: PostPromptNode,

  // Report
  generateReport: GenerateReportNode,

  // Art Director
  artDirector: ArtDirectorNode,
  adDirectionResult: ADDirectionResultNode,

  // Level Design Director
  levelDesignDirector: LevelDesignDirectorNode,
  ldDirectionResult: LDDirectionResultNode,

  // Control / Layout (not in dock but used by pipeline at runtime)
  start: StartNode,
  group: GroupNode,
  packedPipeline: PackedPipelineNode,
  resultNode: ResultNode,

  // Concept Lab (not in dock, kept for runtime)
  character: CharacterNode,
  weapon: WeaponNode,
  turnaround: TurnaroundNode,
  weapBase: WeapBaseNode,
  weapComponents: WeapComponentsNode,

  // Gemini Studio (not in dock, kept for runtime)
  gsPrompt: PromptNode,
  gsImageRef: ImageRefNode,
  gsImageGen: ImageGenNode,
  gsVideoGen: VideoGenNode,
  gsOutputViewer: OutputViewerNode,

  // Character Generator
  charIdentity: CharIdentityNode,
  charDescription: CharDescriptionNode,
  charAttributes: CharAttributesNode,
  charExtractAttrs: ExtractAttributesNode,
  charEnhanceDesc: EnhanceDescriptionNode,
  charGenerate: GenerateCharImageNode,
  charGenViews: GenerateViewsNode,
  charRefCallout: ReferenceCalloutNode,
  charViewer: MainStageViewerNode,
  charImageViewer: MainStageViewerNode,
  charGate: GateNode,
  charMainViewer: CharViewNode,
  charFrontViewer: CharViewNode,
  charBackViewer: CharViewNode,
  charSideViewer: CharViewNode,
  charPose: CharAttributesNode,
  charStyle: StyleNode,
  charImageBucket: ImageBucketNode,
  charRandomize: RandomizeNode,
  charCustomView: CharViewNode,
  charShowXML: ShowXMLNode,
  charQuickGen: QuickGenerateNode,
  imageStudio: GeminiEditorNode,
  geminiEditor: GeminiEditorNode,
  charSaveGroup: SaveGroupNode,
  charUpscale: UpscaleNode,
  charRestore: RestoreQualityNode,
  charCreativeDirector: CreativeDirectorNode,

  // Character Generator (removed from dock, kept for saved canvases)
  charEdit: EditCharacterNode,
  charHistory: CharHistoryNode,
  charReset: ResetCharacterNode,
  charSendPS: SendToPhotoshopNode,
  charProject: ProjectSettingsNode,
  detachedViewer: DetachedViewerNode,

  // 3D Gen AI
  meshyImageTo3D: MeshyImageTo3DNode,
  meshyModelViewer: MeshyModelViewerNode,
  hitem3dImageTo3D: Hitem3DImageTo3DNode,

  // Audio AI (ElevenLabs + Gemini)
  elTTS: ElevenLabsTTSNode,
  elSFX: ElevenLabsSFXNode,
  elVoiceClone: ElevenLabsVoiceCloneNode,
  elVoiceScript: VoiceScriptNode,
  elVoiceDesigner: VoiceDesignerNode,
  elDialogueWriter: DialogueWriterNode,

  // Shared UI (removed from dock except Frame, kept for saved canvases)
  uiButton: UIButtonNode,
  uiTextBox: UITextBoxNode,
  uiDropdown: UIDropdownNode,
  uiImage: UIImageNode,
  uiWindow: UIWindowNode,
  uiFrame: UIFrameNode,
  uiGeneric: UIGenericNode,

  // Tool Editor (prefixed with te-)
  teGeneric: TEGenericNode,
  teWindow: TEWindowNode,
  teFrame: TEFrameNode,
  teButton: TEButtonNode,
  teTextbox: TETextBoxNode,
  teDropdown: TEDropdownNode,
  teImage: TEImageNode,
};

/**
 * Default node styles (width/height) applied when a node is created.
 */
export const NODE_DEFAULTS: Record<string, { style?: { width: number; height: number }; data?: Record<string, unknown> }> = {
  charImageViewer: { style: { width: 600, height: 700 } },
  charViewer: { style: { width: 600, height: 700 } },
  charMainViewer: { style: { width: 600, height: 700 }, data: { viewKey: 'main' } },
  charFrontViewer: { style: { width: 400, height: 720 }, data: { viewKey: 'front' } },
  charBackViewer: { style: { width: 400, height: 720 }, data: { viewKey: 'back' } },
  charSideViewer: { style: { width: 400, height: 720 }, data: { viewKey: 'side' } },
  charIdentity: { style: { width: 360, height: 500 } },
  charAttributes: { style: { width: 400, height: 1600 } },
  charGate: { style: { width: 160, height: 80 }, data: { enabled: true } },
  charStyle: { style: { width: 360, height: 400 } },
  charImageBucket: { style: { width: 240, height: 180 } },
  charRandomize: { style: { width: 180, height: 100 } },
  charCustomView: { style: { width: 400, height: 720 }, data: { viewKey: 'custom' } },
  imageStudio: { style: { width: 240, height: 220 } },
  charSaveGroup: { style: { width: 280, height: 240 } },
  charUpscale: { style: { width: 240, height: 260 } },
  charRestore: { style: { width: 260, height: 320 } },
  charCreativeDirector: { style: { width: 820, height: 500 } },
  meshyImageTo3D: { style: { width: 340, height: 620 } },
  meshyModelViewer: { style: { width: 480, height: 640 } },
  hitem3dImageTo3D: { style: { width: 340, height: 640 } },
  elTTS: { style: { width: 340, height: 560 } },
  elSFX: { style: { width: 320, height: 420 } },
  elVoiceClone: { style: { width: 340, height: 520 } },
  elVoiceScript: { style: { width: 340, height: 500 } },
  elVoiceDesigner: { style: { width: 340, height: 420 } },
  elDialogueWriter: { style: { width: 360, height: 520 } },
  videoAnalysis: { style: { width: 440, height: 640 } },
};

export interface DockNodeDef {
  type: string;
  label: string;
  desc: string;
  color: string;
}

export interface DockCategory {
  key: string;
  label: string;
  icon: string;
  items: DockNodeDef[];
}

/**
 * Unified dock categories containing EVERY node, used by all applications.
 * Organized by workflow: Ideation → Character Design → 3D → Audio → Layout
 */
export const ALL_DOCK_CATEGORIES: DockCategory[] = [
  /* ━━ Ideation ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  {
    key: 'pipeline',
    label: 'Ideation Pipeline',
    icon: '\u{1F4A1}',
    items: [
      { type: 'seed', label: 'Idea Seed', desc: 'Your starting idea', color: '#6c63ff' },
      { type: 'normalize', label: 'Normalize', desc: 'Break down & clarify', color: '#64b5f6' },
      { type: 'diverge', label: 'Diverge', desc: 'Brainstorm variations', color: '#69f0ae' },
      { type: 'critique-salvage', label: 'Critique', desc: 'Rate & improve', color: '#ff8a65' },
      { type: 'expand', label: 'Expand', desc: 'Deep dive into best', color: '#ce93d8' },
      { type: 'converge', label: 'Converge', desc: 'Score & pick winner', color: '#ffd54f' },
      { type: 'commit', label: 'Commit', desc: 'Create final artifact', color: '#4db6ac' },
      { type: 'iterate', label: 'Iterate', desc: 'Plan what\u2019s next', color: '#90a4ae' },
      { type: 'generateReport', label: 'Generate Report', desc: 'Full idea report with TLDR', color: '#ef5350' },
      { type: 'artDirector', label: 'Art Director', desc: 'Hollywood art direction — 5 points of expert feedback', color: '#f9a825' },
      { type: 'levelDesignDirector', label: 'Level Design Director', desc: 'AAA level design critique — gameplay-focused feedback', color: '#00e676' },
    ],
  },
  /* ━━ Inputs / Outputs / Modifiers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  {
    key: 'inputs',
    label: 'Inputs & References',
    icon: '\u{1F4CE}',
    items: [
      { type: 'textInfluence', label: 'Text', desc: 'Paste text as influence', color: '#7986cb' },
      { type: 'documentInfluence', label: 'Document', desc: 'Upload a document', color: '#a1887f' },
      { type: 'imageInfluence', label: 'Image', desc: 'Add image input', color: '#4db6ac' },
      { type: 'imageReference', label: 'Image Reference', desc: 'Load or paste reference image', color: '#26a69a' },
      { type: 'linkInfluence', label: 'Link', desc: 'Add URL / link', color: '#4fc3f7' },
      { type: 'videoInfluence', label: 'Video', desc: 'Add video file', color: '#ce93d8' },
    ],
  },
  {
    key: 'modifiers',
    label: 'Modifiers',
    icon: '\u2699',
    items: [
      { type: 'count', label: 'Count', desc: 'Set result quantity', color: '#78909c' },
      { type: 'emotion', label: 'Emotion', desc: 'Set emotional tone', color: '#e57373' },
      { type: 'influence', label: 'Persona', desc: 'Apply creative persona', color: '#ab47bc' },
      { type: 'preprompt', label: 'Preprompt', desc: 'Inject text before data', color: '#66bb6a' },
      { type: 'postprompt', label: 'PostPrompt', desc: 'Inject text after data', color: '#ffa726' },
      { type: 'charGate', label: 'Gate (On/Off)', desc: 'Toggle connection on/off', color: '#66bb6a' },
    ],
  },
  {
    key: 'outputs',
    label: 'Outputs',
    icon: '\u25C8',
    items: [
      { type: 'textOutput', label: 'Text Output', desc: 'Generate text output', color: '#e0e0e0' },
      { type: 'imageOutput', label: 'Image Output', desc: 'Generate images', color: '#f06292' },
      { type: 'videoOutput', label: 'Video Output', desc: 'Generate video', color: '#ba68c8' },
      { type: 'extractData', label: 'Extract Data', desc: 'Read image with AI', color: '#ffab40' },
      { type: 'videoAnalysis', label: 'Video Analysis', desc: 'Analyze videos with AI prompt', color: '#26c6da' },
    ],
  },
  /* ━━ Character Design ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  {
    key: 'charDefine',
    label: 'Character \u2014 Define',
    icon: '\u{1F464}',
    items: [
      { type: 'charQuickGen', label: 'Quick Generate', desc: 'AI invents a full random character', color: '#ffa726' },
      { type: 'charIdentity', label: 'Identity', desc: 'Age, race, gender, build', color: '#7c4dff' },
      { type: 'charDescription', label: 'Description', desc: 'Freeform character description', color: '#5c6bc0' },
      { type: 'charAttributes', label: 'Attributes', desc: 'Clothing, gear, accessories', color: '#9c27b0' },
      { type: 'charStyle', label: 'Style', desc: 'Visual style text or reference images', color: '#7b1fa2' },
      { type: 'charRandomize', label: 'Randomize', desc: 'Randomize connected node options', color: '#ff5722' },
    ],
  },
  {
    key: 'charGenerate',
    label: 'Character \u2014 Generate',
    icon: '\u{1F3A8}',
    items: [
      { type: 'charGenerate', label: 'Generate Character', desc: 'Generate all enabled views', color: '#e91e63' },
      { type: 'charExtractAttrs', label: 'Extract Attributes', desc: 'AI reads image \u2192 fills Identity/Desc/Attrs', color: '#ffab40' },
      { type: 'charEnhanceDesc', label: 'Enhance Description', desc: 'AI enriches description text', color: '#66bb6a' },
      { type: 'charRefCallout', label: 'Reference Callout', desc: 'Annotate reference image for generation', color: '#26a69a' },
    ],
  },
  {
    key: 'charView',
    label: 'Character \u2014 View',
    icon: '\u{1F441}',
    items: [
      { type: 'charMainViewer', label: 'Main Stage Viewer', desc: 'Primary character image display', color: '#00bfa5' },
      { type: 'charFrontViewer', label: 'Front View', desc: 'Front angle viewer', color: '#42a5f5' },
      { type: 'charBackViewer', label: 'Back View', desc: 'Back angle viewer', color: '#ab47bc' },
      { type: 'charSideViewer', label: 'Side View', desc: 'Side angle viewer', color: '#ff7043' },
      { type: 'charCustomView', label: 'Custom View', desc: 'User-prompted custom angle', color: '#7e57c2' },
    ],
  },
  {
    key: 'charTools',
    label: 'Character \u2014 Tools',
    icon: '\u{1F528}',
    items: [
      { type: 'charCreativeDirector', label: 'Creative Director', desc: 'AI design critique & suggestions', color: '#ff6f00' },
      { type: 'imageStudio', label: 'Image Studio', desc: 'Full-screen editor with inpainting', color: '#00bcd4' },
      { type: 'charUpscale', label: 'Upscale Image', desc: 'AI upscale (x2/x3/x4)', color: '#e040fb' },
      { type: 'charRestore', label: 'Restore Quality', desc: 'AI redraw to remove artifacts', color: '#00c853' },
      { type: 'charSaveGroup', label: 'Save Group', desc: 'Save images as named group', color: '#009688' },
      { type: 'charShowXML', label: 'Show XML', desc: 'View character config', color: '#8d6e63' },
    ],
  },
  /* ━━ 3D Generation ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  {
    key: 'threeDGen',
    label: '3D Generation',
    icon: '\u{1F4A0}',
    items: [
      { type: 'meshyImageTo3D', label: 'Image → 3D (Meshy)', desc: 'Convert character images to 3D model via Meshy', color: '#00acc1' },
      { type: 'hitem3dImageTo3D', label: 'Image → 3D (Hitem3D)', desc: 'High-detail 3D with portrait models & fine controls', color: '#ff6e40' },
      { type: 'meshyModelViewer', label: '3D Model Viewer', desc: 'View, inspect & export 3D models', color: '#8e24aa' },
    ],
  },
  /* ━━ Audio AI ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  {
    key: 'audioWrite',
    label: 'Audio \u2014 AI Writers',
    icon: '\u{1F4DD}',
    items: [
      { type: 'elVoiceDesigner', label: 'Voice Designer', desc: 'Gemini analyzes character image \u2192 voice description', color: '#1976d2' },
      { type: 'elDialogueWriter', label: 'Dialogue Writer', desc: 'Describe a topic \u2192 Gemini writes spoken lines', color: '#388e3c' },
    ],
  },
  {
    key: 'audioGen',
    label: 'Audio \u2014 Generate',
    icon: '\u{1F3A4}',
    items: [
      { type: 'elTTS', label: 'Text-to-Speech', desc: 'Generate speech with ElevenLabs voices', color: '#ff6f00' },
      { type: 'elSFX', label: 'Sound Effects', desc: 'Generate SFX from text prompts', color: '#e65100' },
      { type: 'elVoiceClone', label: 'Voice Clone', desc: 'Clone a voice from an audio sample', color: '#7b1fa2' },
    ],
  },
  /* ━━ Layout & Dev ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  {
    key: 'layout',
    label: 'Layout',
    icon: '\u{1F4E6}',
    items: [
      { type: 'uiFrame', label: 'Frame', desc: 'Visual grouping container', color: '#78909c' },
    ],
  },
  {
    key: 'teElements',
    label: 'Tool Editor',
    icon: '\u2692',
    items: [
      { type: 'teGeneric', label: 'TE Node', desc: 'Generic node', color: '#607d8b' },
      { type: 'teButton', label: 'TE Button', desc: 'Button element', color: '#42a5f5' },
      { type: 'teTextbox', label: 'TE Text Box', desc: 'Text input', color: '#66bb6a' },
      { type: 'teDropdown', label: 'TE Dropdown', desc: 'Dropdown menu', color: '#ffa726' },
      { type: 'teImage', label: 'TE Image', desc: 'Image display', color: '#ab47bc' },
      { type: 'teWindow', label: 'TE Window', desc: 'Window container', color: '#78909c' },
      { type: 'teFrame', label: 'TE Frame', desc: 'Frame container', color: '#8d6e63' },
    ],
  },
];

/**
 * Build context menu categories from the dock categories.
 */
export function buildCtxCategoriesFromDock(categories: DockCategory[]) {
  return categories.map((cat) => ({
    label: cat.label,
    items: cat.items.map((item) => ({ id: item.type, label: item.label, color: item.color })),
  }));
}

export const ALL_CTX_CATEGORIES = buildCtxCategoriesFromDock(ALL_DOCK_CATEGORIES);
