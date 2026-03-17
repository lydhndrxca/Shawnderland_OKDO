import type { GeneratedImage, GeminiImageModel } from '@/lib/ideation/engine/conceptlab/imageGenApi';

export type { GeneratedImage, GeminiImageModel };

export type EditorTool =
  | 'move' | 'marquee' | 'lasso' | 'smartSelect' | 'pointSelect'
  | 'brush' | 'eraser' | 'cloneStamp'
  | 'crop' | 'outpaint'
  | 'aiEdit' | 'bgRemove' | 'styleTransfer' | 'smartErase'
  | 'hand' | 'zoom' | 'eyedropper';

export type PanelTab = 'layers' | 'history' | 'properties' | 'macros';

export interface ConnectedSource {
  nodeId: string;
  label: string;
  image: GeneratedImage | null;
}

export interface HistoryEntry {
  image: GeneratedImage;
  label: string;
  timestamp: number;
}

export interface PointPin {
  imgX: number;
  imgY: number;
}

export interface EditorMacro {
  id: string;
  name: string;
  prompt: string;
  builtin?: boolean;
}

export const TOOL_SHORTCUTS: Record<string, EditorTool> = {
  v: 'move', m: 'marquee', l: 'lasso', w: 'smartSelect', p: 'pointSelect',
  b: 'brush', e: 'eraser', s: 'cloneStamp',
  c: 'crop', o: 'outpaint',
  t: 'aiEdit', g: 'bgRemove', y: 'styleTransfer',
  h: 'hand', z: 'zoom', i: 'eyedropper',
};

export const TOOL_SHORTCUT_DISPLAY: Record<EditorTool, string> = {
  move: 'V', marquee: 'M', lasso: 'L', smartSelect: 'W', pointSelect: 'P',
  brush: 'B', eraser: 'E', cloneStamp: 'S',
  crop: 'C', outpaint: 'O',
  aiEdit: 'T', bgRemove: 'G', styleTransfer: 'Y', smartErase: '',
  hand: 'H', zoom: 'Z', eyedropper: 'I',
};

export const TOOL_LABELS: Record<EditorTool, string> = {
  move: 'Move Tool', marquee: 'Marquee Select', lasso: 'Lasso Select',
  smartSelect: 'Smart Select', pointSelect: 'Point Select',
  brush: 'Brush', eraser: 'Eraser', cloneStamp: 'Clone Stamp',
  crop: 'Crop', outpaint: 'Outpaint / Extend',
  aiEdit: 'AI Edit', bgRemove: 'Remove Background', styleTransfer: 'Style Transfer',
  smartErase: 'Smart Erase',
  hand: 'Hand', zoom: 'Zoom', eyedropper: 'Eyedropper',
};

export const TOOL_GROUPS: { label: string; tools: EditorTool[] }[] = [
  { label: 'Select', tools: ['move', 'marquee', 'lasso', 'smartSelect', 'pointSelect'] },
  { label: 'Paint', tools: ['brush', 'eraser', 'cloneStamp'] },
  { label: 'Transform', tools: ['crop', 'outpaint'] },
  { label: 'AI', tools: ['aiEdit', 'bgRemove', 'styleTransfer', 'smartErase'] },
  { label: 'Nav', tools: ['hand', 'zoom', 'eyedropper'] },
];

export const NODE_TYPE_LABELS: Record<string, string> = {
  charMainViewer: 'Main Stage', charViewer: 'Main Stage',
  charImageViewer: 'Main Stage', charFrontViewer: 'Front View',
  charBackViewer: 'Back View', charSideViewer: 'Side View',
  charCustomView: 'Custom View', imageOutput: 'Image Output',
  charGenerate: 'Generate', charQuickGen: 'Quick Generate',
};
