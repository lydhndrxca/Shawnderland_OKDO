/* ────────────────────────────────────────
   ConceptLab — Weapon Prompt System
   Component definitions, prompt builders, camera guides.
   Ported from PUBG Madison AI Suite Weapon_Generator_V1_3.py
   ──────────────────────────────────────── */

/* ── Component Fields ── */

export const WEAPON_COMPONENT_FIELDS = [
  'Receiver', 'Barrel', 'Stock', 'Grip',
  'Magazine', 'Optic', 'Muzzle', 'Markings',
] as const;

export type WeaponComponents = Record<string, string>;

/* ── Material Finish Options ── */

export const MATERIAL_FINISH_OPTIONS: Record<string, string> = {
  'Blued Steel': 'Dark oxidized steel with reflective finish.',
  'Parkerized': 'Matte gray-green corrosion-resistant phosphate coating.',
  'Nickel Plated': 'Shiny metallic coating, highly reflective and corrosion resistant.',
  'Stainless': 'Bare silver steel, smooth finish, no rust.',
  'Cerakote': 'Modern ceramic-polymer coating, customizable color and texture.',
  'Anodized': 'Color-tinted aluminum surface treatment, durable and smooth.',
  'Painted': 'Simple painted surface — color and texture vary.',
};

/* ── Condition Options ── */

export const CONDITION_OPTIONS: Record<string, string> = {
  '1 - Factory New': 'Mint condition, pristine, as if never fired.',
  '2 - Light Wear': 'Slight handling marks, minimal cosmetic wear.',
  '3 - Service Used': 'Visible wear, maintained but field-used.',
  '4 - Heavily Worn': 'Significant scratches, faded finish, still functional.',
  '5 - Damaged': 'Rust, cracks, or mechanical issues, barely functional.',
};

/* ── Camera Guides ── */

export const CAMERA_GUIDES: Record<string, string> = {
  three_quarter: 'Rotate the weapon to a true 3/4 angle relative to the camera (about 45 degrees), camera at weapon centerline height.',
  front: 'Camera straight down the barrel, centered on the barrel axis.',
  back: 'Camera aligned down the sights from a few feet behind the gun, slightly lower angle (just below sightline), centered on the barrel axis so the full weapon is visible.',
  side: 'Camera exactly perpendicular to receiver, full side profile view.',
  top: 'Camera directly above the weapon, perfectly orthographic top-down view.',
  bottom: 'Camera directly below the weapon, perfectly orthographic bottom-up view.',
};

export const VIEW_LABELS: Record<string, string> = {
  three_quarter: '3/4 View — rotate the weapon about 45° to the camera',
  front: 'Front View — straight down the barrel',
  back: 'Back View — low angle behind, looking down the sights',
  side: 'Side View — direct perpendicular full-length shot',
  top: 'Top View — direct orthographic top-down',
  bottom: 'Bottom View — direct orthographic bottom-up',
  main: 'Main Stage',
};

const NO_TEXT_DIRECTIVE = 'No text, letters, numbers, logos, labels, or watermarks anywhere in the image.';

/* ── Prompt Builders ── */

export function buildWeaponPrompt(
  components: WeaponComponents,
  description: string,
  finish: string,
  condition: string,
): string {
  const parts: string[] = [];

  if (description.trim()) {
    parts.push(description.trim());
    parts.push('');
  }

  const componentParts: string[] = [];
  for (const field of WEAPON_COMPONENT_FIELDS) {
    const val = components[field]?.trim();
    if (val) componentParts.push(`The ${field.toLowerCase()} should appear as ${val}.`);
  }
  if (finish) {
    const desc = MATERIAL_FINISH_OPTIONS[finish] ?? '';
    componentParts.push(`Apply ${finish} finish to the entire weapon surface.${desc ? ` ${desc}` : ''}`);
  }
  if (condition) {
    const desc = CONDITION_OPTIONS[condition] ?? '';
    componentParts.push(`The weapon condition should appear as ${condition.toLowerCase()}.${desc ? ` ${desc}` : ''}`);
  }

  if (componentParts.length) {
    parts.push('Focus edits on the following weapon components:');
    parts.push(componentParts.join('\n'));
    parts.push('');
  }

  parts.push('VISUAL STYLE:');
  parts.push('- Photorealistic weapon render with accurate material properties.');
  parts.push('- Soft, even studio lighting. Neutral color grading.');
  parts.push('- Show complete weapon, no crop. Centered in frame.');
  parts.push(`- ${NO_TEXT_DIRECTIVE}`);
  parts.push('- Flat neutral grey background (#3B3B3B).');
  parts.push('- 16:9 landscape aspect ratio.');

  return parts.join('\n');
}

export function buildWeaponViewPrompt(
  viewKey: string,
  description: string,
): string {
  const cameraInstruction = CAMERA_GUIDES[viewKey] ?? '';
  const viewLabel = VIEW_LABELS[viewKey] ?? 'Alternate weapon angle view';

  return [
    description.trim(),
    '',
    `View: ${viewLabel}.`,
    cameraInstruction,
    'Keep the exact same weapon design and proportions.',
    'Orthographic view only (no perspective tilt or lens distortion).',
    'Camera height aligned to the weapon centerline; no roll or yaw beyond the view instruction.',
    'Full weapon visible, centered, no crop. Do not cut off any part of the weapon.',
    `Flat neutral grey background (#3B3B3B). ${NO_TEXT_DIRECTIVE}`,
  ].join('\n');
}

/* ── Extract / Enhance ── */

export const EXTRACT_WEAPON_PROMPT = `Analyze this image in detail and reinterpret it as inspiration for a unique firearm design.
If it's not a weapon, imagine what kind of gun could be derived from it — consider its shapes, colors, materials, and visual style.
Describe this concept as if designing a themed weapon.
Then provide structured attributes as JSON with this schema:
{
  "description": string,
  "receiver": string,
  "barrel": string,
  "stock": string,
  "grip": string,
  "magazine": string,
  "optic": string,
  "muzzle": string,
  "markings": string,
  "materialFinish": string,
  "condition": string
}
Return ONLY JSON. No markdown, no extra text.`;

export function buildEnhancePrompt(userDescription: string): string {
  return [
    'Take the user\'s short weapon description and expand it into a richer, detailed weapon concept.',
    'Then provide structured attributes using JSON with this schema:',
    '{',
    '  "description": "a creative paragraph describing the weapon concept",',
    '  "receiver": string,',
    '  "barrel": string,',
    '  "stock": string,',
    '  "grip": string,',
    '  "magazine": string,',
    '  "optic": string,',
    '  "muzzle": string,',
    '  "markings": string,',
    '  "materialFinish": string,',
    '  "condition": string',
    '}',
    'Return ONLY JSON. No markdown, no extra text.',
    '',
    `USER DESCRIPTION:\n${userDescription}`,
  ].join('\n');
}
