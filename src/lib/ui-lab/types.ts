export type GenerationMode =
  | "FREEFORM"
  | "UI_GEN"
  | "ROMZ"
  | "MAP"
  | "DIM_PLANNER"
  | "FONT_GEN";

export type AspectRatio = "1:1" | "16:9" | "3:2" | "4:3" | "9:16" | "2:3" | "3:4";

export type SessionBlend = 0 | 0.5 | 1;

export const ASPECT_RATIOS: { label: string; value: AspectRatio; w: number; h: number }[] = [
  { label: "Square (1:1)", value: "1:1", w: 512, h: 512 },
  { label: "Landscape (16:9)", value: "16:9", w: 1024, h: 576 },
  { label: "Landscape (3:2)", value: "3:2", w: 768, h: 512 },
  { label: "Landscape (4:3)", value: "4:3", w: 768, h: 576 },
  { label: "Portrait (9:16)", value: "9:16", w: 576, h: 1024 },
  { label: "Portrait (2:3)", value: "2:3", w: 512, h: 768 },
  { label: "Portrait (3:4)", value: "3:4", w: 576, h: 768 },
];

export const GENERATION_MODES: { label: string; value: GenerationMode }[] = [
  { label: "Generate Image", value: "FREEFORM" },
  { label: "UI Generator", value: "UI_GEN" },
  { label: "ROMs Sticker Art (Valor)", value: "ROMZ" },
  { label: "Map Icons", value: "MAP" },
  { label: "Dimension Planner", value: "DIM_PLANNER" },
  { label: "Font Generator", value: "FONT_GEN" },
];

export const SESSION_BLENDS: { label: string; value: SessionBlend }[] = [
  { label: "Off (0%)", value: 0 },
  { label: "Hybrid (50%)", value: 0.5 },
  { label: "Full (100%)", value: 1 },
];

export interface SlotImage {
  dataUrl: string;
  file?: File;
  name: string;
}

export interface StyleFolder {
  name: string;
  guidance: string;
  image_count: number;
}

export interface StyleFolderDetail {
  folder: string;
  guidance: string;
  images: { name: string; thumbnail: string }[];
}

export interface GenerateResult {
  image: string;
  model?: string;
}

export interface ExtractSpecResult {
  [key: string]: unknown;
}

export interface ExtractAttributesResult {
  attributes: string;
}

export interface RemoveUIResult {
  image: string;
}

export type UILabTab =
  | "generate"
  | "extract-style"
  | "extract-spec"
  | "remove-ui"
  | "dimension-planner";

export type ImageTabKey =
  | "Mainstage"
  | "StyleLibrary"
  | "RefA"
  | "RefB"
  | "RefC"
  | "Extract"
  | "ExtractBG";

export const IMAGE_TABS: { label: string; key: ImageTabKey }[] = [
  { label: "Mainstage", key: "Mainstage" },
  { label: "Style Library", key: "StyleLibrary" },
  { label: "Ref A", key: "RefA" },
  { label: "Ref B", key: "RefB" },
  { label: "Ref C", key: "RefC" },
  { label: "Extract Style", key: "Extract" },
  { label: "Extract Background", key: "ExtractBG" },
];

/* ─── UI Generator element types ─── */

export type UIGenElementType = "button" | "icon" | "scrollbar" | "font" | "number";

export const UIGEN_ELEMENT_TYPES: { label: string; value: UIGenElementType }[] = [
  { label: "Button", value: "button" },
  { label: "Icon", value: "icon" },
  { label: "Scrollbar", value: "scrollbar" },
  { label: "Font Letter", value: "font" },
  { label: "Number", value: "number" },
];

export const BUTTON_SHAPES = [
  { label: "Auto", value: "auto" },
  { label: "Rectangle", value: "rectangle" },
  { label: "Rounded Rectangle", value: "rounded_rectangle" },
  { label: "Square", value: "square" },
  { label: "Circle / Oval", value: "circle" },
  { label: "Pill / Capsule", value: "pill" },
  { label: "Diamond", value: "diamond" },
  { label: "Hexagon", value: "hexagon" },
  { label: "Triangle", value: "triangle" },
];

export const BORDER_STYLES = [
  { label: "Auto", value: "auto" },
  { label: "Thin", value: "thin" },
  { label: "Medium", value: "medium" },
  { label: "Thick", value: "thick" },
  { label: "None", value: "none" },
];

export const TEXT_SIZES = [
  { label: "Auto", value: "auto" },
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { label: "Large", value: "large" },
];

/* ─── Dimension Planner box types ─── */

export type DPBoxType = "ui" | "background" | "button" | "icon" | "text";

export const DP_BOX_TYPES: { label: string; value: DPBoxType }[] = [
  { label: "UI", value: "ui" },
  { label: "Background", value: "background" },
  { label: "Button", value: "button" },
  { label: "Icon", value: "icon" },
  { label: "Text", value: "text" },
];

export const DP_TRAINED_ELEMENT_MODES = [
  { label: "Use Both (Hybrid)", value: "hybrid" },
  { label: "Trained UI Elements Only", value: "trained_only" },
  { label: "Style Library Only", value: "project_only" },
];

export const DP_REFERENCE_SCOPES = [
  { label: "Tie to Element Type", value: "strict" },
  { label: "Freeform (All References)", value: "freeform" },
];
