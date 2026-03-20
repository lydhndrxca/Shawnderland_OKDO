/* ────────────────────────────────────────
   ConceptLab — Prop / environment object prompts
   Attribute groups for PropLab nodes (common + rare pools for randomize).
   ──────────────────────────────────────── */

import type { AttributeGroup } from './characterPrompts';

/* ── Prop identity dropdowns (PropIdentityNode) ── */

export const PROP_TYPE_OPTIONS = [
  'furniture', 'hand tool', 'weapon', 'vehicle part', 'container', 'lighting',
  'electronics', 'decorative object', 'industrial equipment', 'food / vessel',
  'textile / soft prop', 'architectural element', 'toy / game piece', 'scientific instrument',
  'other',
];

export const SETTING_OPTIONS = [
  'contemporary', 'near-future', 'far-future sci-fi', 'medieval', 'renaissance',
  'industrial revolution', 'art deco', 'mid-century modern', 'post-apocalyptic',
  'fantasy', 'steampunk', 'historical (unspecified)', 'studio / neutral',
];

export const CONDITION_OPTIONS = [
  'pristine / mint', 'light wear', 'moderate wear', 'heavy wear', 'damaged / broken',
  'weathered / outdoor aged', 'restored', 'unfinished / raw', 'stylized clean',
];

export const SCALE_OPTIONS = [
  'hand-held', 'pocket-scale', 'tabletop', 'furniture-scale', 'human-scale (wearable)',
  'room-scale / large', 'miniature / maquette', 'monumental',
];

export const PROP_ATTRIBUTE_GROUPS: AttributeGroup[] = [
  {
    label: 'Primary Material',
    key: 'primaryMaterial',
    common: [
      'Oiled walnut — tight grain, hand-rubbed satin',
      'Cast iron — matte black, slight orange peel texture',
      'Brushed aluminum — directional grain, cool grey',
      'Forged steel — hammer marks, gun-blue patina',
      'Bone dry ceramic — unglazed, light speckle',
      'Waxed canvas — folded creases, dusty khaki',
      'Full-grain leather — veg tan, natural edge',
      'Tempered glass — beveled edge, faint green tint',
    ],
    rare: [
      'Obsidian glass — conchoidal chips at corners',
      'Bismuth crystal plating — stepped rainbow facets',
      'Fossil-inlaid resin — amber, trapped botanicals',
      'Meteoritic iron — Widmanstätten shimmer under raking light',
    ],
  },
  {
    label: 'Secondary Materials',
    key: 'secondaryMaterials',
    common: [
      'Brass hardware — satin lacquer, mild tarnish at touch points',
      'Black oxide fasteners — countersunk, flush',
      'Rubber feet — shore 70A, dust in pores',
      'Nylon webbing — herringbone weave, fray-sealed ends',
      'Copper rivets — domed, green oxide halos',
      'PE plastic trim — soft-touch overmold',
    ],
    rare: [
      'Mother-of-pearl inlay — thin strips, iridescent shift',
      'Shagreen wrap — polished ray skin, hex tile pattern',
      'Kevlar weave panel — visible cross-hatch under clear coat',
    ],
  },
  {
    label: 'Surface Finish',
    key: 'surfaceFinish',
    common: [
      'Matte powder coat — 10% sheen, even orange peel',
      'Satin polyurethane — subtle specular tail on edges',
      'Hand-planed wood — faint ripple, open pores',
      'Machine-sanded metal — 220 grit scratch pattern',
      'Eggshell paint — micro texture, soft highlights',
    ],
    rare: [
      'Oil-slick heat treatment — purple/teal interference',
      'Cerused grain — white paste lodged in open oak pores',
      'Hammer-tone enamel — fine dimpled landscape',
    ],
  },
  {
    label: 'Wear & Damage',
    key: 'wearPattern',
    common: [
      'Factory-new — no visible wear',
      'Light handling polish — high spots slightly brighter',
      'Edge softening — corners gently radiused from use',
      'Dust in recesses — engraved lines slightly filled',
      'Water rings — pale halos on horizontal wood',
    ],
    rare: [
      'Impact dent — paint cracked radially, bare metal peek',
      'Heat bluing migration — rainbow near exhaust vent',
      'Cable rub scar — braided imprint in lacquer',
    ],
  },
  {
    label: 'Color Palette',
    key: 'colorPalette',
    common: [
      'Charcoal, warm grey, bone accent',
      'Olive drab, rust brown, black trim',
      'Navy, brass, cream paper tone',
      'Terracotta, sand, dusty black metal',
      'Slate blue, silver, off-white ceramic',
    ],
    rare: [
      'Petrol blue, copper oxide green, graphite',
      'Desaturated plum, aged ivory, gunmetal',
    ],
  },
  {
    label: 'Texture Detail',
    key: 'textureDetail',
    common: [
      'Fine pitting across flat panels — uniform micro-dimples',
      'Directional brush marks — parallel to longest edge',
      'Woven fabric macro — visible thread crossing',
      'Pebbled leather — irregular grain islands',
      'Sand-cast roughness — chill lines near ribs',
    ],
    rare: [
      'Biological growth — faint lichen at underside lip',
      'Crazed lacquer — hairline web, matte valleys',
    ],
  },
  {
    label: 'Functional Elements',
    key: 'functionalElements',
    common: [
      'Hinged lid — gas strut assist, rubber bumper stops',
      'Keyed lock — brass escutcheon, slight wobble',
      'Drain hole — chamfered, water stain trail below',
      'Adjustable feet — threaded nylon, one corner raised',
      'Cable grommet — split rubber, dust feathering',
    ],
    rare: [
      'Quick-release pins — ball detents, polished heads',
      'Hidden magnet closure — seam gap < 0.5 mm',
    ],
  },
  {
    label: 'Decorative Detail',
    key: 'decorativeDetail',
    common: [
      'Engine-turned ring pattern — concentric on face plate',
      'Subtle Art Deco fluting — vertical grooves, even spacing',
      'Maker stamp — shallow relief, ink residue in recess',
      'Painted pinstripe — 1 mm, slightly wavy hand line',
      'No ornament — utilitarian silence',
    ],
    rare: [
      'Acid-etched sigil — darkened recess, polished rim',
      'Kintsugi repair — gold vein across ceramic cheek',
    ],
  },
  {
    label: 'Material Response',
    key: 'lightingEffects',
    common: [
      'Diffuse matte — even scatter, low reflectivity across surfaces',
      'Broad specular — soft highlight bloom on curved forms when lit',
      'Subsurface translucency — light passes through thin plastic/wax walls',
      'Micro-satin surface — kills hotspots, very low sheen',
    ],
    rare: [
      'Anisotropic reflectance — stretched highlight along brushed grain axis',
      'Thin-film interference — rainbow shift at grazing angles',
    ],
  },
  {
    label: 'Context & Story',
    key: 'contextualStory',
    common: [
      'Workshop prop — oil smudges, pencil tick marks',
      'Museum replica — overly clean, label adhesive ghost',
      'Film set hero — asymmetrical hero-side polish',
      'Street vendor object — sticker residue, corner tape',
    ],
    rare: [
      'Archeological reconstruction — mismatched patina patches',
      'Heirloom — monogram worn to near illegible',
    ],
  },
];

export type PropAttributes = Record<string, string>;

export interface PropIdentity {
  propType: string;
  setting: string;
  condition: string;
  scale: string;
}

/* ── Style Constants ── */

export const PROP_STYLE_NOTES = `Photorealistic product rendering for a AAA game asset pipeline. Real materials with accurate texture and wear detail. CRITICAL LIGHTING RULE: Completely flat, shadowless, uniform ambient illumination only — like an overcast light-tent. NO directional light, NO cast shadows, NO specular highlights, NO rim light, NO bounce light, NO ambient occlusion baked in. The prop must look like an unlit albedo/diffuse reference so it can be properly lit in-engine.`;

export function getPropStyleNotes(styleOverride: string): string {
  return `Render in the following art style: ${styleOverride}. This style takes priority over photorealism. Match the style precisely.`;
}

/* ── View Requests ── */

export const PROP_VIEW_REQUESTS: Record<string, string> = {
  main: 'HERO SHOT: Three-quarter front angle, camera slightly above eye-level, rotated about 30 degrees. The prop fills approximately 70% of the frame. LIGHTING: Completely flat, shadowless, uniform ambient illumination — like an overcast light-tent. Absolutely NO directional light, NO cast shadows, NO specular highlights, NO rim light. Solid flat neutral grey background, no environment, no floor shadow. Show the prop\'s most visually interesting and recognizable angle.',

  front: 'FRONT ELEVATION: Camera placed directly in front of the prop at center height, facing it dead-on. Orthographic projection, zero perspective distortion, like a 200mm+ telephoto lens. Left and right halves perfectly symmetrical. The prop centered in frame, filling 70% vertically with padding. NO angle, NO rotation — pure flat front face only. LIGHTING: Flat, shadowless, uniform ambient only — no directional light, no shadows, no highlights. Solid grey background, no floor.',

  back: 'REAR ELEVATION: Camera placed directly behind the prop at center height, facing the rear dead-on. Orthographic projection, zero perspective distortion. Only the back surface visible — NO side walls, NO angled view. The prop centered in frame. LIGHTING: Flat, shadowless, uniform ambient only — no directional light, no shadows, no highlights. Solid grey background, no floor.',

  side: 'SIDE ELEVATION: Camera placed at EXACTLY 90 degrees to the left side of the prop, at center height. Orthographic projection, zero perspective distortion. PURE flat side-profile silhouette — NO 3/4 angle, NO front face visible, NO rotation. The viewer should see ONLY the left side surface. Like a technical side-elevation architectural drawing. LIGHTING: Flat, shadowless, uniform ambient only — no directional light, no shadows, no highlights. Solid grey background, no floor.',

  top: 'PLAN VIEW / TOP-DOWN: Camera placed DIRECTLY ABOVE the prop, pointing STRAIGHT DOWN at exactly 90 degrees from horizontal. The viewer sees ONLY the top surface/roof of the prop — as if looking down from a ceiling-mounted camera or a bird\'s-eye drone. NO side walls visible, NO front or back face visible, NO perspective, NO angled view. PURE flat plan-view only, like a top-down architectural floor plan. The prop centered in frame. LIGHTING: Flat, shadowless, uniform ambient only — no directional light, no shadows, no highlights. Solid grey background.',
};

export const LOCK_DESIGN_BLOCK = `DESIGN LOCK - MANDATORY:
• SAME materials, colors, textures, surface finish
• SAME wear patterns, damage, dirt, grime
• SAME functional elements, handles, buttons, hinges
• SAME decorative details, markings, labels
• SAME proportions and scale
• Do NOT add, remove, or change ANY details
• ONLY change the camera angle`;

/* ── Prompt Builders ── */

export function buildPropDescription(
  identity: PropIdentity,
  attributes: PropAttributes,
  userDescription: string,
): string {
  const parts: string[] = [];

  if (userDescription.trim()) {
    parts.push('PROP CONCEPT: ' + userDescription.trim());
    parts.push('');
  }

  const identityParts = [identity.propType, identity.setting, identity.condition, identity.scale].filter(Boolean);
  if (identityParts.length) {
    parts.push('IDENTITY: ' + identityParts.join(', '));
  }

  const attrLines: string[] = [];
  for (const group of PROP_ATTRIBUTE_GROUPS) {
    const val = attributes[group.key]?.trim();
    if (val && val.toLowerCase() !== 'none') {
      attrLines.push(`${group.label}: ${val}`);
    }
  }
  if (attrLines.length) {
    parts.push('');
    parts.push('ATTRIBUTES:');
    parts.push(attrLines.join('\n'));
  }

  return parts.join('\n');
}

export function buildPropViewPrompt(
  viewKey: string,
  propDescription: string,
  styleOverride?: string,
): string {
  const view = PROP_VIEW_REQUESTS[viewKey] ?? PROP_VIEW_REQUESTS.main;

  if (viewKey === 'main') {
    const styleLine = styleOverride
      ? 'STYLE: Render in the art style described/shown in the style reference. This takes priority over photorealism.'
      : 'STYLE: Photorealistic product rendering for a game asset pipeline — real materials with accurate texture and wear detail.';

    const lightingLine = styleOverride
      ? 'LIGHTING: Flat, shadowless, uniform ambient illumination only. Even if the style reference has dramatic lighting, do NOT bake any directional light, shadows, or specular highlights into the prop. The prop must be evenly lit for in-engine relighting.'
      : 'LIGHTING: Completely flat, shadowless, uniform ambient illumination only — like an overcast light-tent. NO directional light source, NO cast shadows, NO specular highlights, NO rim light, NO ambient occlusion. The prop must appear evenly lit from all directions so it can be properly lit in-engine.';

    return [
      'No text, labels, or watermarks in the image.',
      '',
      styleLine,
      lightingLine,
      'BACKGROUND: Solid flat neutral grey only. No environment, no floor.',
      'FRAMING: Prop fills ~70% of frame. Generous padding on all sides.',
      '',
      view,
      '',
      propDescription,
    ].join('\n');
  }

  const styleLine = styleOverride
    ? 'Render in the art style from the style reference. Style takes priority.'
    : 'Photorealistic game asset rendering — real materials with accurate texture and wear, not illustration or concept art.';

  return [
    'No text, labels, or watermarks in the image.',
    '',
    styleLine,
    'LIGHTING: Completely flat, shadowless, uniform ambient illumination only. NO directional light, NO cast shadows, NO specular highlights, NO rim light. The prop must be evenly lit for in-engine relighting.',
    '',
    'Recompose the prop to the specified view. Preserve EXACT design, materials, wear, and all details.',
    '',
    view,
    '',
    LOCK_DESIGN_BLOCK,
    '',
    'Background: solid flat neutral grey. No floor, no environment.',
    '',
    propDescription,
  ].join('\n');
}

/* ── Extract Attributes Prompt ── */

export const EXTRACT_PROP_ATTRIBUTES_PROMPT = `You are a forensic-level prop/object analysis tool for AAA game environment art. Study both the image AND the description below. Produce PRECISE, SPECIFIC attributes — not generic summaries.

Return JSON only with this exact schema:
{
  "propType": string,
  "setting": string,
  "condition": string,
  "scale": string,
  ${PROP_ATTRIBUTE_GROUPS.map((g) => `"${g.key}": string`).join(',\n  ')}
}

IDENTITY FIELDS — pick the closest match:
- propType: ${PROP_TYPE_OPTIONS.map((o) => `"${o}"`).join(' | ')}
- setting: ${SETTING_OPTIONS.map((o) => `"${o}"`).join(' | ')}
- condition: ${CONDITION_OPTIONS.map((o) => `"${o}"`).join(' | ')}
- scale: ${SCALE_OPTIONS.map((o) => `"${o}"`).join(' | ')}

FIELD GUIDANCE:
- primaryMaterial: exact primary material with finish detail (e.g. "oiled walnut — tight grain, hand-rubbed satin, honey brown tone")
- secondaryMaterials: supporting materials, fasteners, trim (e.g. "brass hardware — satin lacquer, mild tarnish at touch points")
- surfaceFinish: surface treatment and sheen level (e.g. "matte powder coat — 10% sheen, even orange peel")
- wearPattern: specific wear marks, scratches, dents — location and severity (e.g. "edge softening on corners, water rings on top surface")
- colorPalette: 3-5 dominant colors with relationships (e.g. "charcoal body, warm grey panels, brass accent hardware")
- textureDetail: surface texture at close inspection (e.g. "fine pitting across flat panels, directional brush marks on edges")
- functionalElements: moving parts, mechanisms, interfaces (e.g. "hinged lid with gas strut, keyed lock with brass escutcheon")
- decorativeDetail: ornament, markings, engravings (e.g. "engine-turned ring pattern on face plate, maker stamp in shallow relief")
- lightingEffects: intrinsic material response — reflectivity, translucency, sheen (e.g. "broad specular on curved forms, subsurface translucency through thin plastic wall, micro-satin low sheen")
- contextualStory: what the wear/marks tell about its history (e.g. "workshop prop — oil smudges, pencil tick marks, heavily used")

CRITICAL RULES:
1. Be HYPER-SPECIFIC. "Oiled walnut with tight grain and honey brown tone" NOT "wooden".
2. Look at the IMAGE directly — the image is ground truth.
3. Capture EVERY distinctive feature: unusual materials, specific damage patterns, unique functional elements.
4. NEVER write "not visible", "none", or "unknown". Extrapolate from visible style.
Return ONLY JSON. No markdown, no extra text.`;
