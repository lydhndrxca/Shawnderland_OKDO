/* ────────────────────────────────────────
   ConceptLab — UI asset generation prompts
   Generation intents, resolution modes, constraint builders.
   ──────────────────────────────────────── */

/* ── Generation Intent ── */

export const GENERATION_INTENT_OPTIONS = [
  'Freeform',
  'HUD',
  'Achievement',
  'Weapon',
  'Equipment',
  'Injury',
  'Meds',
  'Status',
  'Item',
  'Throwable',
  'ROMZ',
  'Map Icons',
  'HUD UI Layouts',
] as const;

export type GenerationIntent = (typeof GENERATION_INTENT_OPTIONS)[number];

/* ── Resolution Mode ── */

export const RESOLUTION_MODE_OPTIONS = ['Freeform', '16-bit', '64-bit'] as const;
export type ResolutionMode = (typeof RESOLUTION_MODE_OPTIONS)[number];

/* ── Wear Level ── */

export const WEAR_LEVEL_OPTIONS = ['Clean', 'Lightly Weathered', 'Heavily Damaged'] as const;
export type WearLevel = (typeof WEAR_LEVEL_OPTIONS)[number];

/* ── HUD Elements ── */

export const HUD_ELEMENT_OPTIONS = ['Weapon', 'Ammo', 'Fire Mode', 'Throwable'] as const;

/* ── Interfaces ── */

export interface UIConfig {
  generationIntent: GenerationIntent;
  resolutionMode: ResolutionMode;
  wearLevel: WearLevel;
  hudElements: Set<string>;
  iconSpec?: Record<string, unknown>;
}

export interface UIIconSpec {
  shapeLanguage: string;
  material: string;
  colorPalette: string;
  outlineStyle: string;
  shading: string;
  renderingMedium: string;
  [key: string]: string;
}

/* ── Prompt ref token parsing ── */

export function parsePromptRefs(promptText: string): Set<string> {
  const text = (promptText || '').toLowerCase();
  const refs = new Set<string>();
  if (text.includes('refa') || text.includes('ref a') || text.includes('ref_a')) refs.add('RefA');
  if (text.includes('refb') || text.includes('ref b') || text.includes('ref_b')) refs.add('RefB');
  if (text.includes('refc') || text.includes('ref c') || text.includes('ref_c')) refs.add('RefC');
  return refs;
}

/* ── Constraint builder (ported from pipeline.py compose_constraints) ── */

function getBaseRules(intent: string, hudElements: Set<string>): string[] {
  if (intent === 'HUD_UI') {
    const requested = [...hudElements].sort().join(', ') || 'none';
    return [
      'HUD layout mockup for bottom-right corner',
      `STRICT: Include ONLY these HUD elements and nothing else: ${requested}`,
      'Do NOT draw ammo count, fire mode label, or throwable icon unless they are in the list above',
      'Do NOT draw weapon silhouette unless Weapon is in the list above',
      'allow text labels and numbers only for elements that are in the list',
      'allow containers, grids, and clear composition',
      'designed for real-time HUD; prioritize readability at small size',
      'match UI_REF and Style slot look (outline weight, typography vibe, palette)',
      'BACKGROUND: uniform chroma green #00FF00 for easy separation if needed',
      'no watermark',
    ];
  }
  if (intent === 'ROMZ') {
    return [
      'complete illustrated graphic asset',
      'centered subject with atmospheric background',
      'STYLE_TRANSFER: Strictly emulate the artistic DNA of the Style reference images, including line weight, grain, and color saturation',
      "Apply the 'bugged-out eyes' and specific character design features found in the reference images to any new subject requested in the USER_PROMPT",
      'STYLE_DNA: Extract the artistic style, line weight, and specific texture (e.g., grainy 90s sticker art) from the Style reference images',
      'EMULATE STYLE: Use the provided images as a strict visual reference for art style, color palette, and line weight',
      'prefer flat color blocks, bold ink outlines, and halftone textures',
      'do not desaturate; maintain vibrant but gritty 90s aesthetic',
      'high contrast and high detail',
      'no text unless explicitly requested',
      'no watermark',
    ];
  }
  if (intent === 'MAP') {
    return [
      'single minimalist game map icon',
      'centered subject on a solid background',
      'COLOR: strictly BLACK and WHITE only',
      'STYLE: minimalist, high-contrast, bold silhouettes',
      'COMPOSITION: icon fills most of the 48x48 frame, leaving only 1-2 pixels of padding from edges',
      'EMULATE STYLE: match the provided Map Icons reference images exactly',
      'no gradients, no gray tones, no shading',
      'high contrast and highly readable at very small sizes',
      'no text unless explicitly requested',
      'no watermark',
    ];
  }
  return [
    'single game UI icon',
    'centered composition',
    'icon-only, no extra objects',
    'BACKGROUND: perfectly uniform solid chroma green #00FF00 (flat fill)',
    'BACKGROUND: no gradient, no vignette, no texture, no lighting, no haze',
    'BACKGROUND: no cast shadows, no drop shadow onto the green',
    'BACKGROUND: no ambient occlusion touching the background',
    'color palette should match the Style reference (hue, saturation, brightness)',
    'prefer flat color blocks and hard pixel transitions over smooth gradients',
    'do not desaturate or render in grayscale unless explicitly requested',
    'high contrast, readable at small sizes',
    'no text unless explicitly requested',
    'no watermark',
  ];
}

const INTENT_RULES: Record<string, string[]> = {
  FREEFORM: ['prompt-driven icon design', 'still a game UI icon'],
  HUD: ['designed for real-time on-screen HUD', 'clean silhouette', 'functional and minimal'],
  ACHIEVEMENT: ['emblematic achievement icon', 'symbolic and celebratory', 'badge-like composition'],
  WEAPON: ['weapon icon representation', 'clear weapon silhouette', 'recognizable at small size'],
  EQUIPMENT: ['equipment icon representation', 'clear equipment silhouette', 'readable at small size'],
  INJURY: ['injury icon representation', 'clear medical or damage silhouette', 'readable at small size'],
  MEDS: ['medical item icon', 'clear and recognizable at small size'],
  STATUS: ['status effect icon', 'symbolic and abstract'],
  ITEM: ['inventory item icon', 'clear object focus'],
  THROWABLE: ['throwable icon representation', 'clear silhouette and recognizable at small size'],
  ROMZ: [
    'ROMZ style sticker art',
    "90s 'Off the Wall' illustrated aesthetic",
    'bold, creative character or object focus',
    'COMPOSITION: Foreground subject + detailed background',
    'BACKGROUND: mimic the reference images (tiling patterns, atmospheric clouds, or geometric shapes)',
    'ASPECT RATIO: exactly 883x569 landscape orientation',
    'STYLE: heavy halftone patterns, bold black ink outlines, gritty textures',
    "UI_ELEMENTS: Include the 'Made in Seoul, Korea' and '680-20-BE' identification markers on the vertical edges exactly as seen in reference",
    'STRICT_ADHERENCE: you MUST match the provided ROMZ reference images exactly in line weight, texture, and background logic',
  ],
  MAP: [
    'minimalist game map icon',
    'BLACK AND WHITE silhouette only',
    'STRICT DIMENSIONS: exactly 48x48 square',
    'EDGE_FILL: subject should extend to within 1-2 pixels of the frame edges',
    'STRICT_ADHERENCE: you MUST match the provided Map Icons reference images exactly in style and minimalist silhouette',
  ],
  HUD_UI: [
    'HUD layout mockup; include ONLY the HUD elements specified in REQUESTED_HUD_ELEMENTS',
    'do not add weapon, ammo, fire mode, or throwable unless that element is in the list',
    'prioritize readability at small size',
    'match UI_REF + Style slot look (outline weight, typography vibe, palette)',
  ],
};

export function composeUIConstraints(
  config: UIConfig,
  promptText: string,
  usedRefs: Set<string>,
  hasStyleImages: boolean,
): { prompt: string; usedRefs: string[] } {
  const intent = config.generationIntent.toUpperCase().replace(/ /g, '_').replace('LAYOUTS', '').replace(/^HUD_UI_?$/, 'HUD_UI').replace('MAP_ICONS', 'MAP');
  const isRomz = intent === 'ROMZ';
  const isMap = intent === 'MAP';

  const baseRules = getBaseRules(intent, config.hudElements);
  const parts: string[] = [];
  parts.push('HARD CONSTRAINTS: ' + baseRules.join('; '));

  const rules = INTENT_RULES[intent];
  if (rules) parts.push('GENERATION_INTENT: ' + rules.join('; '));

  const resMode = config.resolutionMode;
  if (resMode === '16-bit') {
    parts.push(
      "RESOLUTION_STYLE: 16-bit pixel art. Hard edges, visible pixels, limited palette. Match the Style reference's chunky pixel outlines and dithered shading.",
    );
  } else if (resMode === '64-bit') {
    parts.push(
      'RESOLUTION_STYLE: 64-bit era pixel art. Gritty, low-resolution texture, heavy black pixel outlines. ABSOLUTELY NO soft gradients, no smooth surfaces, no 3D rendering, no anti-aliasing, no glossy sheen. The output must be flat, chunky pixel art. ' +
        "Match the provided style reference images' chunky pixel density and muted, gritty arcade palette exactly.",
    );
  } else {
    parts.push('RESOLUTION_STYLE: match the Style reference fidelity.');
  }

  if (hasStyleImages || resMode !== 'Freeform') {
    parts.push(
      'STYLE_LOCK: Match the provided Style reference images extremely closely. Duplicate the specific outline thickness, pixel density, palette muting, and chunky shading method. Avoid glossy/3D render look; use only hard pixel steps for all curves and details.',
    );
    parts.push('STYLE_REF_IMAGE_IS_PRIMARY: prioritize the Style image(s) above all other guidance.');
    parts.push('COLOR_LOCK: Preserve the Style reference color palette and saturation. Do not wash out or grayscale. Match the specific color depth of the reference.');
    parts.push('PIXEL_ART_ENFORCEMENT: render with visible, square pixels and hard boundaries.');
  }

  if (usedRefs.size > 0) {
    const refList = [...usedRefs].sort().join(', ');
    parts.push(
      `REFERENCE_IMAGES: Reference images for ${refList} are provided in the multimodal context. Use these specific images for subject, composition, or details as requested in the USER_PROMPT. Refer to these images by their labels (RefA, RefB, RefC).`,
    );
  }

  const wear = config.wearLevel;
  if (wear === 'Lightly Weathered') {
    parts.push('WEAR: lightly weathered; subtle scuffs, small chips, mild grime.');
  } else if (wear === 'Heavily Damaged') {
    parts.push('WEAR: heavily damaged; significant scratches, dents, grime, and wear.');
  } else {
    parts.push('WEAR: clean, new, no visible damage.');
  }

  if (config.iconSpec) {
    parts.push('ICON_ATTRIBUTES_JSON:\n' + JSON.stringify(config.iconSpec, null, 2));
  }

  if (intent === 'HUD_UI') {
    const requested = [...config.hudElements].sort().join(', ') || 'none';
    parts.push('REQUESTED_HUD_ELEMENTS (include ONLY these; omit all others): ' + requested);
    parts.push('Follow the UI_REF and Style references and the USER_PROMPT; use a conventional, readable HUD layout.');
  }

  const trimmed = (promptText || '').trim();
  if (trimmed) parts.push('USER_PROMPT:\n' + trimmed);

  return {
    prompt: parts.join('\n\n'),
    usedRefs: [...usedRefs].sort(),
  };
}

/* ── System instruction for image generation ── */

export const UI_SYSTEM_INSTRUCTION =
  'You are a professional game asset generator. ' +
  'Your ONLY task is to generate a single image based on the provided style and prompt. ' +
  'DO NOT return text, DO NOT return JSON, DO NOT explain your reasoning. ' +
  "If images are provided, you MUST mimic their STYLE_DNA (art style, line weight, color palette, texture) EXACTLY.";

/* ── Multimodal wrapper prompt ── */

export function buildUIImagePrompt(constraintPrompt: string, hasImages: boolean, targetW: number, targetH: number, isRomz: boolean, isMap: boolean): string {
  const parts: string[] = [];
  if (hasImages) {
    parts.push('I have provided several reference images. Some are labeled for specific prompt instructions (RefA, RefB, RefC).');
    parts.push('STYLE_TRANSFER: Strictly emulate the artistic DNA of the Style reference images, including line weight, grain, and color saturation.');
    parts.push('STYLE_DNA: Extract the artistic style, line weight, and specific texture from the Style reference images.');
    parts.push('EMULATE STYLE: Use the provided images as a strict visual reference for art style, color palette, and line weight.');
    parts.push(`Dimensions: Match the aspect ratio and resolution of ${targetW}x${targetH}.`);
  }
  parts.push(`Task: Create a new image of: ${constraintPrompt}`);
  if (isRomz) {
    parts.push("Requirement: Apply the 'bugged-out eyes' and specific character design features found in the reference images to any new subject requested.");
    parts.push("Requirement: Ensure the character and background remain strictly consistent with the 'Off the Wall' 90s style seen in the references.");
  } else if (isMap) {
    parts.push('Requirement: Strictly BLACK and WHITE minimalist silhouette.');
    parts.push('Requirement: NO background elements, NO gradients, NO shading.');
  } else {
    parts.push('Requirement: Use a solid chroma green background #00FF00.');
  }
  return parts.join('\n\n');
}

/* ── Extract Icon Spec Prompt ── */

export const EXTRACT_ICON_SPEC_PROMPT = `You are a forensic-level game UI/icon analyst. Study the provided image with extreme precision.

Extract a strict JSON icon specification. Return JSON ONLY with this exact schema:
{
  "shapeLanguage": string,
  "material": string,
  "colorPalette": string,
  "outlineStyle": string,
  "shading": string,
  "renderingMedium": string,
  "silhouetteClarity": string,
  "iconographyStyle": string,
  "edgeQuality": string,
  "backgroundHandling": string
}

FIELD GUIDANCE:
- shapeLanguage: geometric primitives, angular vs rounded, overall composition (e.g. "bold geometric, rounded corners, chunky silhouette")
- material: surface appearance (e.g. "matte plastic with subtle grain", "metallic with specular edge catch")
- colorPalette: dominant + accent colors (e.g. "deep navy primary, gold accent, warm grey shadows")
- outlineStyle: border treatment (e.g. "2px solid black outline, consistent weight", "no outline, shape-defined edges")
- shading: light/shadow approach (e.g. "flat cel-shaded, 2-tone", "soft gradient with ambient occlusion")
- renderingMedium: art style (e.g. "16-bit pixel art", "vector flat design", "hand-painted miniature")
- silhouetteClarity: how readable at small sizes (e.g. "instantly readable at 32px, strong negative space")
- iconographyStyle: symbolic approach (e.g. "literal object depiction", "abstract symbolic representation")
- edgeQuality: anti-aliasing and crispness (e.g. "pixel-perfect hard edges", "smooth anti-aliased curves")
- backgroundHandling: what's behind the icon (e.g. "chroma green #00FF00", "transparent", "dark gradient badge")

RULES:
1. Be HYPER-SPECIFIC. Not "colorful" — give exact color descriptions.
2. The image is ground truth — describe what you see, not what you expect.
3. Return ONLY valid JSON. No markdown, no extra text.`;
