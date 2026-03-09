"use client";

/**
 * Unified node type registry shared across ALL applications.
 * Every app (ShawnderMind, Concept Lab, Gemini Studio, Tool Editor)
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

// ── Influence nodes ─────────────────────────────────────────────
import EmotionNode from '@/app/ideation/canvas/nodes/EmotionNode';
import InfluenceNode from '@/app/ideation/canvas/nodes/InfluenceNode';
import TextInfluenceNode from '@/app/ideation/canvas/nodes/TextInfluenceNode';
import DocumentInfluenceNode from '@/app/ideation/canvas/nodes/DocumentInfluenceNode';
import ImageInfluenceNode from '@/app/ideation/canvas/nodes/ImageInfluenceNode';
import LinkInfluenceNode from '@/app/ideation/canvas/nodes/LinkInfluenceNode';
import VideoInfluenceNode from '@/app/ideation/canvas/nodes/VideoInfluenceNode';

// ── Control / Layout nodes ──────────────────────────────────────
import PrepromptNode from '@/app/ideation/canvas/nodes/PrepromptNode';
import PostPromptNode from '@/app/ideation/canvas/nodes/PostPromptNode';
import StartNode from '@/app/ideation/canvas/nodes/StartNode';
import GroupNode from '@/app/ideation/canvas/nodes/GroupNode';
import PackedPipelineNode from '@/app/ideation/canvas/nodes/PackedPipelineNode';
import ResultNode from '@/app/ideation/canvas/nodes/ResultNode';

// ── Concept Lab nodes ───────────────────────────────────────────
import CharacterNode from '@/app/ideation/canvas/nodes/CharacterNode';
import WeaponNode from '@/app/ideation/canvas/nodes/WeaponNode';
import TurnaroundNode from '@/app/ideation/canvas/nodes/TurnaroundNode';

// ── Concept Lab weapon detail nodes ─────────────────────────────
import WeapBaseNode from '@/app/concept-lab/nodes/WeapBaseNode';
import WeapComponentsNode from '@/app/concept-lab/nodes/WeapComponentsNode';

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
import EditCharacterNode from '@/app/ideation/canvas/nodes/character/EditCharacterNode';
import CharHistoryNode from '@/app/ideation/canvas/nodes/character/CharHistoryNode';
import ResetCharacterNode from '@/app/ideation/canvas/nodes/character/ResetCharacterNode';
import SendToPhotoshopNode from '@/app/ideation/canvas/nodes/character/SendToPhotoshopNode';
import ShowXMLNode from '@/app/ideation/canvas/nodes/character/ShowXMLNode';
import QuickGenerateNode from '@/app/ideation/canvas/nodes/character/QuickGenerateNode';
import ProjectSettingsNode from '@/app/ideation/canvas/nodes/character/ProjectSettingsNode';
import GateNode from '@/app/ideation/canvas/nodes/character/GateNode';
import StyleNode from '@/app/ideation/canvas/nodes/character/StyleNode';
import ImageBucketNode from '@/app/ideation/canvas/nodes/character/ImageBucketNode';
import RandomizeNode from '@/app/ideation/canvas/nodes/character/RandomizeNode';
import GeminiEditorNode from '@/app/ideation/canvas/nodes/character/GeminiEditorNode';
import DetachedViewerNode from '@/app/ideation/canvas/nodes/character/DetachedViewerNode';
// CustomViewNode is now handled by CharViewNode with viewKey='custom'

// ── Gemini Studio nodes ─────────────────────────────────────────
import PromptNode from '@/app/gemini-studio/nodes/PromptNode';
import ImageRefNode from '@/app/gemini-studio/nodes/ImageRefNode';
import ImageGenNode from '@/app/gemini-studio/nodes/ImageGenNode';
import VideoGenNode from '@/app/gemini-studio/nodes/VideoGenNode';
import OutputViewerNode from '@/app/gemini-studio/nodes/OutputViewerNode';

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

  // Control / Layout
  start: StartNode,
  group: GroupNode,
  packedPipeline: PackedPipelineNode,
  resultNode: ResultNode,

  // Concept Lab
  character: CharacterNode,
  weapon: WeaponNode,
  turnaround: TurnaroundNode,
  weapBase: WeapBaseNode,
  weapComponents: WeapComponentsNode,

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
  charEdit: EditCharacterNode,
  charHistory: CharHistoryNode,
  charReset: ResetCharacterNode,
  charSendPS: SendToPhotoshopNode,
  charShowXML: ShowXMLNode,
  charQuickGen: QuickGenerateNode,
  charProject: ProjectSettingsNode,
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
  geminiEditor: GeminiEditorNode,
  detachedViewer: DetachedViewerNode,

  // Gemini Studio
  gsPrompt: PromptNode,
  gsImageRef: ImageRefNode,
  gsImageGen: ImageGenNode,
  gsVideoGen: VideoGenNode,
  gsOutputViewer: OutputViewerNode,

  // Shared UI elements
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
  character: { style: { width: 240, height: 200 } },
  weapon: { style: { width: 240, height: 220 } },
  charImageViewer: { style: { width: 600, height: 700 } },
  charViewer: { style: { width: 600, height: 700 } },
  charHistory: { style: { width: 260, height: 500 } },
  charMainViewer: { style: { width: 600, height: 700 }, data: { viewKey: 'main' } },
  charFrontViewer: { style: { width: 400, height: 720 }, data: { viewKey: 'front' } },
  charBackViewer: { style: { width: 400, height: 720 }, data: { viewKey: 'back' } },
  charSideViewer: { style: { width: 400, height: 720 }, data: { viewKey: 'side' } },
  charIdentity: { style: { width: 360, height: 400 } },
  charAttributes: { style: { width: 360, height: 600 } },
  charGate: { style: { width: 160, height: 80 }, data: { enabled: true } },
  charStyle: { style: { width: 360, height: 400 } },
  charImageBucket: { style: { width: 240, height: 180 } },
  charRandomize: { style: { width: 180, height: 100 } },
  charCustomView: { style: { width: 400, height: 720 }, data: { viewKey: 'custom' } },
  geminiEditor: { style: { width: 240, height: 220 } },
  detachedViewer: { style: { width: 350, height: 400 } },
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
 */
export const ALL_DOCK_CATEGORIES: DockCategory[] = [
  {
    key: 'pipeline',
    label: 'Pipeline',
    icon: '\u26D3',
    items: [
      { type: 'seed', label: 'Idea Seed', desc: 'Your starting idea', color: '#6c63ff' },
      { type: 'normalize', label: 'Normalize', desc: 'Break down & clarify', color: '#64b5f6' },
      { type: 'diverge', label: 'Diverge', desc: 'Brainstorm variations', color: '#69f0ae' },
      { type: 'critique-salvage', label: 'Critique', desc: 'Rate & improve', color: '#ff8a65' },
      { type: 'expand', label: 'Expand', desc: 'Deep dive into best', color: '#ce93d8' },
      { type: 'converge', label: 'Converge', desc: 'Score & pick winner', color: '#ffd54f' },
      { type: 'commit', label: 'Commit', desc: 'Create final artifact', color: '#4db6ac' },
      { type: 'iterate', label: 'Iterate', desc: 'Plan what\u2019s next', color: '#90a4ae' },
    ],
  },
  {
    key: 'inputs',
    label: 'Inputs & References',
    icon: '\u{1F4CE}',
    items: [
      { type: 'textInfluence', label: 'Text', desc: 'Paste text as influence', color: '#7986cb' },
      { type: 'documentInfluence', label: 'Document', desc: 'Upload a document', color: '#a1887f' },
      { type: 'imageInfluence', label: 'Image', desc: 'Add image input', color: '#4db6ac' },
      { type: 'linkInfluence', label: 'Link', desc: 'Add URL / link', color: '#4fc3f7' },
      { type: 'videoInfluence', label: 'Video', desc: 'Add video file', color: '#ce93d8' },
      { type: 'imageReference', label: 'Image Reference', desc: 'Load or paste reference image', color: '#26a69a' },
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
    ],
  },
  {
    key: 'control',
    label: 'Control',
    icon: '\u25B6',
    items: [
      { type: 'start', label: 'Start', desc: 'Run the pipeline', color: '#42a5f5' },
      { type: 'resultNode', label: 'Result', desc: 'Shows pipeline output', color: '#80cbc4' },
      { type: 'packedPipeline', label: 'Full Pipeline', desc: 'Compact full pipeline', color: '#4db6ac' },
    ],
  },
  {
    key: 'geminiStudio',
    label: 'Gemini Studio',
    icon: '\u2728',
    items: [
      { type: 'gsPrompt', label: 'Prompt', desc: 'Text prompt input', color: '#64b5f6' },
      { type: 'gsImageRef', label: 'Image Ref', desc: 'Reference image input', color: '#4dd0e1' },
      { type: 'gsImageGen', label: 'Image Gen', desc: 'Text-to-image generation', color: '#f06292' },
      { type: 'gsVideoGen', label: 'Video Gen', desc: 'Text-to-video generation', color: '#ba68c8' },
      { type: 'gsOutputViewer', label: 'Output Viewer', desc: 'View and export media', color: '#e0e0e0' },
    ],
  },
  {
    key: 'conceptlab',
    label: 'Concept Lab',
    icon: '\u{1F3A8}',
    items: [
      { type: 'character', label: 'Character', desc: 'Design a character with AI', color: '#7c4dff' },
      { type: 'weapon', label: 'Weapon', desc: 'Design a weapon with AI', color: '#ff6d00' },
      { type: 'turnaround', label: 'Turnaround', desc: 'Multi-view turnaround sheet', color: '#00bfa5' },
      { type: 'weapBase', label: 'Weapon Generator', desc: 'Weapon description + generate', color: '#ff6d00' },
      { type: 'weapComponents', label: 'Weapon Components', desc: 'Receiver, barrel, stock, grip', color: '#e65100' },
    ],
  },
  {
    key: 'charGenerator',
    label: 'Character Generator',
    icon: '\u{1F464}',
    items: [
      { type: 'charProject', label: 'Project Settings', desc: 'Project name and output dir', color: '#546e7a' },
      { type: 'charIdentity', label: 'Character Identity', desc: 'Age, race, gender, build presets', color: '#7c4dff' },
      { type: 'charDescription', label: 'Character Description', desc: 'Freeform description text', color: '#5c6bc0' },
      { type: 'charAttributes', label: 'Character Attributes', desc: 'Clothing/gear attribute groups', color: '#9c27b0' },
      { type: 'charStyle', label: 'Style', desc: 'Style text or reference images', color: '#7b1fa2' },
      { type: 'charExtractAttrs', label: 'Extract Attributes', desc: 'AI image analysis', color: '#ffab40' },
      { type: 'charEnhanceDesc', label: 'Enhance Description', desc: 'AI text enhancement', color: '#66bb6a' },
      { type: 'charGenerate', label: 'Generate Character', desc: 'Generate all enabled views', color: '#e91e63' },
      { type: 'charGate', label: 'Gate (On/Off)', desc: 'Toggle connection on/off', color: '#66bb6a' },
      { type: 'charMainViewer', label: 'Main Stage Viewer', desc: 'Large image viewer (600x700)', color: '#00bfa5' },
      { type: 'charFrontViewer', label: 'Front View', desc: 'Front view (300x400)', color: '#42a5f5' },
      { type: 'charBackViewer', label: 'Back View', desc: 'Back view (300x400)', color: '#ab47bc' },
      { type: 'charSideViewer', label: 'Side View', desc: 'Side view (300x400)', color: '#ff7043' },
      { type: 'charRefCallout', label: 'Reference Callout', desc: 'Annotate reference image', color: '#26a69a' },
      { type: 'charEdit', label: 'Edit Character', desc: 'Text-based image edits', color: '#29b6f6' },
      { type: 'charHistory', label: 'History', desc: 'Track generation history', color: '#78909c' },
      { type: 'charReset', label: 'Reset Character', desc: 'Clear all character data', color: '#ef5350' },
      { type: 'charSendPS', label: 'Send to Photoshop', desc: 'Send to Adobe Photoshop', color: '#1565c0' },
      { type: 'charShowXML', label: 'Show XML', desc: 'View character XML config', color: '#8d6e63' },
      { type: 'charQuickGen', label: 'Quick Generate', desc: 'Random character generator', color: '#ffa726' },
      { type: 'charImageBucket', label: 'Generated Images', desc: 'Browse generated image directory', color: '#43a047' },
      { type: 'charRandomize', label: 'Randomize', desc: 'Randomize connected node options', color: '#ff5722' },
      { type: 'charCustomView', label: 'Custom View', desc: 'User-prompted custom angle/view', color: '#7e57c2' },
      { type: 'geminiEditor', label: 'Gemini Editor', desc: 'Full-screen image editor with inpainting', color: '#00bcd4' },
      { type: 'detachedViewer', label: 'Detached Viewer', desc: 'Floating image viewer — connect to any view node', color: '#607d8b' },
    ],
  },
  {
    key: 'styles',
    label: 'Styles',
    icon: '\u{1F3A8}',
    items: [
      { type: 'charStyle', label: 'Style', desc: 'Blank style — add prompt or images', color: '#7b1fa2' },
    ],
  },
  {
    key: 'uiElements',
    label: 'UI Elements',
    icon: '\u{1F532}',
    items: [
      { type: 'uiButton', label: 'Button', desc: 'Resizable button placeholder', color: '#5c6bc0' },
      { type: 'uiTextBox', label: 'Text Box', desc: 'Resizable text input placeholder', color: '#66bb6a' },
      { type: 'uiDropdown', label: 'Dropdown', desc: 'Dropdown menu placeholder', color: '#ffa726' },
      { type: 'uiImage', label: 'Image', desc: 'Image placeholder', color: '#ab47bc' },
      { type: 'uiGeneric', label: 'Node', desc: 'Generic node with header', color: '#607d8b' },
    ],
  },
  {
    key: 'uiContainers',
    label: 'Containers',
    icon: '\u{1F4E6}',
    items: [
      { type: 'uiWindow', label: 'Window', desc: 'Window panel with title bar', color: '#26a69a' },
      { type: 'uiFrame', label: 'Frame', desc: 'Layout frame / grouping', color: '#78909c' },
    ],
  },
  {
    key: 'teElements',
    label: 'Tool Editor',
    icon: '\u{1F6E0}',
    items: [
      { type: 'teGeneric', label: 'TE Node', desc: 'Tool Editor generic node', color: '#607d8b' },
      { type: 'teButton', label: 'TE Button', desc: 'Tool Editor button', color: '#42a5f5' },
      { type: 'teTextbox', label: 'TE Text Box', desc: 'Tool Editor text input', color: '#66bb6a' },
      { type: 'teDropdown', label: 'TE Dropdown', desc: 'Tool Editor dropdown', color: '#ffa726' },
      { type: 'teImage', label: 'TE Image', desc: 'Tool Editor image', color: '#ab47bc' },
      { type: 'teWindow', label: 'TE Window', desc: 'Tool Editor window', color: '#78909c' },
      { type: 'teFrame', label: 'TE Frame', desc: 'Tool Editor frame', color: '#8d6e63' },
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
