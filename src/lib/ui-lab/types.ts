export type GenerationMode = "FREEFORM" | "ROMZ" | "MAP";

export type AspectRatio = "1:1" | "16:9" | "3:2" | "4:3" | "9:16" | "2:3" | "3:4";

export const ASPECT_RATIOS: { label: string; value: AspectRatio; w: number; h: number }[] = [
  { label: "1:1", value: "1:1", w: 512, h: 512 },
  { label: "16:9", value: "16:9", w: 1024, h: 576 },
  { label: "3:2", value: "3:2", w: 768, h: 512 },
  { label: "4:3", value: "4:3", w: 768, h: 576 },
  { label: "9:16", value: "9:16", w: 576, h: 1024 },
  { label: "2:3", value: "2:3", w: 512, h: 768 },
  { label: "3:4", value: "3:4", w: 576, h: 768 },
];

export const GENERATION_MODES: { label: string; value: GenerationMode; description: string }[] = [
  { label: "Generate Image", value: "FREEFORM", description: "General-purpose image generation" },
  { label: "ROMs Sticker Art", value: "ROMZ", description: "90s illustrated sticker art" },
  { label: "Map Icons", value: "MAP", description: "B&W minimalist silhouette icons at 48×48" },
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
