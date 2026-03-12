/* ────────────────────────────────────────
   ConceptLab — Character Prompt System
   Attribute definitions, prompt builders, view requests.
   Ported from PUBG Madison AI Suite character_generator.py
   ──────────────────────────────────────── */

/* ── Identity Options ──────────────────── */

export const AGE_OPTIONS = [
  'teen (18–19)', 'young adult (20–29)', 'adult (30–45)',
  'middle-aged (46–65)', 'senior (66+)',
];

export const RACE_OPTIONS = [
  'Black / African descent', 'White / European descent', 'East Asian',
  'South Asian', 'Southeast Asian', 'Hispanic / Latine',
  'Middle Eastern / North African', 'Indigenous', 'Pacific Islander',
  'Mixed', 'Other / not specified',
];

export const GENDER_OPTIONS = [
  'male', 'female', 'non-binary', 'genderqueer',
  'trans masc', 'trans femme', 'androgynous', 'unspecified',
];

export const BUILD_OPTIONS = [
  'slim', 'average', 'athletic', 'muscular',
  'curvy', 'heavyset', 'soft/doughy', 'unfit',
];

/* ── Attribute Options (common + rare) ── */

export interface AttributeGroup {
  label: string;
  key: string;
  common: string[];
  rare: string[];
}

export const ATTRIBUTE_GROUPS: AttributeGroup[] = [
  {
    label: 'Headwear', key: 'headwear',
    common: ['Ball cap — sun-faded, curved brim','Knit beanie — ribbed cuff','Hood up — jersey-lined','Trucker cap — mesh back','Baseball cap — blank velcro patch','Snapback — flat brim','Watch cap — rolled cuff','Bucket hat — canvas','No visible headwear','Headband — sweat-wicking'],
    rare: ['Boonie hat — ripstop, chin cord','Beret — soft wool, tilted','Ushanka — ear flaps down','Desert shemagh — wrapped crown','Newsboy cap — worn tweed','Hard hat — scuffed ABS','Panama hat — natural straw','Ivy cap — matte leather','Flight cap — vintage leather','Visor — translucent brim','Cowboy hat — modern felt','Trapper hat — faux fur lining','Ski helmet — stickered','Riot helmet — visor up'],
  },
  {
    label: 'Outerwear', key: 'outerwear',
    common: ['Bomber jacket — weathered leather','Hooded parka — matte nylon','Field jacket — canvas, patch pockets','Denim trucker — worn seams','Softshell jacket — taped zips','Moto jacket — abrasion panels','Blazer — casual, unstructured','Utility overshirt — heavy twill','Windbreaker — lightweight','Rain shell — packable'],
    rare: ['Fishtail parka — drawcord hem','M65 with liner — olive drab','Flight jacket MA-1 — reversible','Waxed cotton coat — patinated','Tech cloak — asymmetrical front','Varsity jacket — chenille patch','Trench coat — storm flap','Puffer vest — box baffles','Peacoat — oversized lapel','Surplus greatcoat — tailored','Shearling trucker — faux shear','Quilted liner — onion stitch'],
  },
  {
    label: 'Top', key: 'top',
    common: ['Crew tee — cotton jersey','Henley — 3-button placket','Flannel shirt — muted plaid','Oxford shirt — rolled sleeves','Thermal waffle — slim fit','Polo — knit collar','Compression top — long sleeve','Hoodie — kangaroo pocket','Athletic tee — moisture wicking','Turtleneck — fine gauge'],
    rare: ['Work shirt — chain-stitch name tag','Rugby shirt — bold stripe','Chambray shirt — utility stitch','Base layer — merino crew','Guayabera — four pockets','Cuban collar shirt — camp style','Western shirt — snap buttons','Quarter-zip fleece — grid knit','Longline tee — split hem','Cable knit — fisherman style','Tech tee — welded seams','Linen shirt — airy weave'],
  },
  {
    label: 'Legwear', key: 'legwear',
    common: ['Slim jeans — dark indigo','Straight jeans — faded knee whiskers','Cargo pants — articulated knees','Chinos — tapered fit','Joggers — cuffed hem','Work pants — double knee','Tech pants — zipped pockets','Shorts — utility, knee-length','Biker jeans — ribbed panels','Overalls — single strap dropped'],
    rare: ['Corduroy pants — 8-wale','Ripstop cargos — gusseted seat','Flight suit bottoms — cuffed','Painter pants — spattered','Softshell mountaineering pants','Moto leather pants — padded thigh','Convertible pants — zip-off legs','Climbing pants — diamond gusset','BDU trousers — modified','Track pants — side stripe','Waxed canvas pants — stiff','Snow pants — scuffed cuffs'],
  },
  {
    label: 'Footwear', key: 'footwear',
    common: ['Work boots — full grain leather','Combat-inspired boots — speed laces','Sneakers — low profile, gum sole','High-top sneakers — padded collar','Trail runners — aggressive tread','Chelsea boots — matte leather','Chukka boots — crepe sole','Hiking boots — metal eyelets','Slip-on sneakers — canvas','Rain boots — rubberized'],
    rare: ['Tactical boots — side zip','Engineer boots — harness ring','Climbing approach shoes — sticky rubber','Paratrooper boots — capped toe','Moto boots — reinforced shin','Deck shoes — salt stained','Skate shoes — ollie wear','Desert boots — suede','Jungle boots — vented shank','Mountaineering boots — crampon welt','Split-toe tabi boots — modern'],
  },
  {
    label: 'Gloves', key: 'gloves',
    common: ['Fingerless gloves — knit','Mechanic gloves — synthetic','Leather gloves — unlined','Tactical gloves — knuckle padding','Fleece gloves — grippy palm','Riding gloves — perforated','Work gloves — suede palm','No gloves','Liner gloves — touchscreen','Gauntlet gloves — extended cuff'],
    rare: ['Welding gloves — heat scuffed','Climbing gloves — half finger','Motor gauntlets — reinforced','Sailing gloves — open finger','Cold-weather mitts — over-mitt','Kevlar-lined gloves — subtle','Snowmobile gloves — bulky','Nomex flight gloves — thin','Heated gloves — battery pack','Carpenter gloves — open index/middle'],
  },
  {
    label: 'Face Gear', key: 'facegear',
    common: ['Sunglasses — rectangular, matte frame','Aviators — mirrored lenses','Wraparound shades — sport','Clear safety glasses — anti-fog','Bandana mask — pulled down','Neck gaiter — half raised','No face gear','Half-face respirator — stowed','Eyeglasses — thin metal frame'],
    rare: ['Dust goggles — elastic strap','Ski goggles — reflective','Tactical visor — hinged','Diving mask — forehead rest','Balaclava — mouth open','Mesh face mask — breathable','Shooting glasses — amber','Comms boom mic — cheek','Noise-cancel ear muffs — neck worn','Welding mask — compact'],
  },
  {
    label: 'Utility Rig', key: 'utilityrig',
    common: ['Nylon belt — quick-release buckle','Webbing belt — MOLLE loops','Tool belt — modular pouches','Cross-body sling — compact','Chest rig — minimal','Waist pack — low profile','Holster-style phone pouch','Key clip — carabiner','Harness straps — subtle','Suspenders — elastic'],
    rare: ['Bandolier-style strap — blank pouches','Climbing harness — stripped down','Radio chest harness — low-viz','Courier strap — padded shoulder','Hydration bladder — hose routed','Elastic thigh strap — utility','Drop-leg panel — minimal','Rigger belt — stow loop','Ratchet belt — micro-adjust'],
  },
  {
    label: 'Back Carry', key: 'backcarry',
    common: ['Daypack — 20L, streamlined','Tactical backpack — 24L','Rolltop pack — weatherproof','Messenger bag — cross-body','Sling bag — compact','Hydration pack — slim','Tool backpack — rugged','No bag','Drawstring pack — lightweight','Laptop backpack — padded'],
    rare: ['Climbing pack — rope strap','Courier tube — blueprint case','Camera backpack — internal frame','Range bag — modular dividers','Medical jump bag — de-badged','Drone case — compact','Utility tote — waxed canvas','Bicycle pannier — single','Paracord netting — cargo'],
  },
  {
    label: 'Hand Prop', key: 'handprop',
    common: ['Smartphone — active screen','Folded map — creased','Flashlight — compact','Water bottle — stainless','Notebook — elastic band','Walkie — clipped antenna','Umbrella — collapsed','Wrench — medium adjustable','Rope coil — hand carry','Gloves — carried in hand'],
    rare: ['Drone remote — hand strap','Thermal camera — handheld','Microphone — handheld','Tablet — ruggedized case','Monocular — compact','Compass — lensatic','Spray paint can — capped','Multitool — unfolded','Bolt cutters — small','Binoculars — compact roof prism'],
  },
  {
    label: 'Accessories', key: 'accessories',
    common: ['Analog watch — brushed metal','Digital watch — rugged','Dog tags — generic','Leather bracelet — braided','Paracord bracelet — cobra weave','Necklace — simple pendant','Stud earrings — minimal','Ring — signet style','Lanyard — utility key set','Sunglass cord — retainer'],
    rare: ['Clip-on compass — watch band','Whistle — anodized','Utility pen — bolt action','Badge holder — clear','Ear cuff — industrial','Spacer ring — titanium','Smart ring — understated','Glow fob — tritium style','Tactical pen — blunt','AirTag holder — discreet'],
  },
  {
    label: 'Color Accents', key: 'coloraccents',
    common: ['Accent — muted red piping','Accent — olive webbing','Accent — charcoal hardware','Accent — tan leather trim','Accent — blacked-out fasteners','Accent — gunmetal buckles','Accent — navy contrast stitch','Accent — subtle orange tab','Accent — sand zipper pulls'],
    rare: ['Accent — hi-viz chartreuse tabs','Accent — safety orange toggles','Accent — reflective piping','Accent — anodized blue hardware','Accent — copper rivets','Accent — crimson edge paint','Accent — neon paracord','Accent — titanium D-rings','Accent — oxblood laces'],
  },
  {
    label: 'Detailing', key: 'detailing',
    common: ['Material emphasis — leather & canvas mix','Material emphasis — denim & twill','Material emphasis — nylon & mesh','Material emphasis — cotton & rib knit','Material emphasis — suede accents','Wear — lightly worn edges','Wear — scuffed hardware','Finish — matte overall','Finish — mixed matte & satin','Repair — subtle hand stitch'],
    rare: ['Material emphasis — waxed cotton body','Material emphasis — ripstop + spacer mesh','Material emphasis — Cordura panelling','Wear — sun-bleached shoulders','Wear — oil-darkened cuffs','Wear — paint flecks clustered','Finish — stonewashed overall','Repair — sashiko knee patch','Patina — brass oxidized green','Stress — honeycomb on sleeves'],
  },
];

// Pose options moved to dedicated PoseNode — kept here for reference/export
export const POSE_COMMON = ['Pose — relaxed A-stance, hands at sides','Pose — hands on hips, grounded','Pose — one hand pocket, casual','Pose — slight contrapposto','Pose — feet shoulder width, neutral','Pose — arms crossed, relaxed','Pose — thumbs hooked on belt','Pose — light step forward','Pose — squared to camera','Pose — head tilt, attentive'];
export const POSE_RARE = ['Pose — checking watch, subtle','Pose — adjusting cuff','Pose — lifting hood slightly','Pose — slinging pack on','Pose — leaning on foot, ready','Pose — securing strap','Pose — scanning horizon','Pose — rolling sleeve','Pose — kneeling to check boot','Pose — pinching bridge of nose'];

/* ── Character Identity ── */

export interface CharacterIdentity {
  age: string;
  race: string;
  gender: string;
  build: string;
}

export interface CharacterAttributes {
  [key: string]: string;
}

/* ── Style Constants ── */

export const CHARACTER_STYLE_NOTES = `CRITICAL IMAGE FORMAT: 9:16 vertical portrait (1536 x 2816).

MANDATORY FULL-BODY FRAMING (DO NOT VIOLATE):
- The ENTIRE character must be visible from the TOP OF THE HEAD (including hair) to the BOTTOM OF THE FEET (including soles).
- Leave at LEAST 5% padding above the head and below the feet — NEVER crop or cut off ANY body part.
- The head, face, and hair must be FULLY visible and not touching or exceeding the top edge.
- The feet and shoes must be FULLY visible and not touching or exceeding the bottom edge.
- If the character is tall or has tall hair/headwear, ZOOM OUT to fit everything. NEVER crop to fit.
- This is NOT a portrait or headshot. This is a FULL-BODY character sheet image.

FOLLOW THE DESCRIPTION LITERALLY:
- Wardrobe, props, colors, materials, condition, and wear must match the attribute list.
- Body type, age, and demeanor must match the identity description.
- Include any listed props and accessories. Do not invent extra items.

VISUAL STYLE: Photorealistic character portrait. Proportions must be natural and un-idealized, showing realistic weight distribution without underlying muscular definition. Soft, even studio lighting (diffused softbox), gentle contrast, clean shadows. Visible skin pores and fabric weave. RENDER fabrics as heavy, lived-in materials that sag and wrinkle naturally under the character's weight. Pose: casual standing, slight 3/4 to camera.

NO TEXT:
- Do not render any text, letters, numbers, logos, labels, or watermarks.

BACKGROUND (REQUIRED):
- Flat solid grey (#D3D3D3) only.
- No floor, no ground plane, no environment, no background objects.
- No ground shadows, reflections, gradients, or lighting effects.

CAMERA & COMPOSITION:
- Eye-level camera at chest height, natural perspective, 70-85mm equivalent lens unless overridden.
- Centered full-body framing. ZOOM OUT enough so the full character fits with padding on all sides.`;

export const VIEW_REQUESTS: Record<string, string> = {
  main: 'Casual standing pose, FULL BODY from head to toe, three-quarter front view of the character. Camera at chest height, rotated about 9 degrees to the right from the front view. Primarily front-facing with just a hint of the right side visible. Keep proportions natural, lens normal, no extreme perspective. The TOP OF THE HEAD and the BOTTOM OF THE FEET must both be clearly visible with padding — do NOT crop the head or feet.',

  front: `Recompose to a dead-center orthographic front view at 0 degrees azimuth. Orthographic or 200mm+ lens, zero perspective distortion. Left and right halves perfectly symmetrical. No 3/4 turn, no yaw, no rotation. Neutral A-pose, arms 30 degrees from body, palms forward, feet shoulder-width. Show face dead-on, chest, belt, front of both arms/legs/shoes, all front-facing gear. Full body from top of head to bottom of feet with padding, no cropping. Solid grey background, no floor.`,

  back: `Recompose to a dead-center orthographic rear view at 180 degrees azimuth. Orthographic or 200mm+ lens, zero perspective distortion. Only the back visible, face completely hidden. Back left/right perfectly symmetrical. No 3/4 turn, no yaw, no rotation. Neutral A-pose, arms 30 degrees from body, feet shoulder-width, head facing away. Show back of head/hair, shoulder blades, spine, back of clothing and belt, rear pockets, back of arms/legs, heels, any rear gear. Full body from top of head to bottom of feet with padding, no cropping. Solid grey background, no floor.`,

  side: `Recompose to a pure left-side orthographic profile view at exactly 90 degrees azimuth. Orthographic or 200mm+ lens, zero perspective distortion. Nose points to right edge of frame, back of head points left. Clean silhouette profile — only one ear (left) visible. If both eyes are visible, you are doing a 3/4 view which is wrong. True 90-degree side profile only. Neutral standing, arms slightly away from body, head in profile facing screen-right. Show left profile of face, left ear, left shoulder/arm, side silhouette of torso, left hip/leg, side of all gear. Full body from top of head to bottom of feet with padding, no cropping. Solid grey background, no floor.`,
};

export const LOCK_OUTFIT_BLOCK = `IDENTITY LOCK - MANDATORY:
• SAME body type, height, weight, proportions, age
• SAME face, skin tone, hair style/color, facial hair
• SAME clothing - every garment, color, pattern, material, damage, dirt
• SAME accessories - all gear, tools, weapons, belts, pouches, bags
• SAME held objects in same hands
• Do NOT add, remove, or change ANY items
• ONLY change the camera angle`;

/* ── Prompt Builders ── */

export function buildCharacterDescription(
  identity: CharacterIdentity,
  attributes: CharacterAttributes,
  userDescription: string,
): string {
  const parts: string[] = [];

  if (userDescription.trim()) {
    parts.push('[REQUIRED DESCRIPTION]');
    parts.push(userDescription.trim());
    parts.push('');
  }

  const identityParts = [identity.age, identity.race, identity.gender, identity.build].filter(Boolean);
  if (identityParts.length) {
    parts.push('## CHARACTER IDENTITY (PRIMARY)');
    parts.push('[IDENTITY]');
    parts.push(identityParts.join(', '));
    parts.push('');
  }

  parts.push('## CLOTHING & GEAR (STRICT ADHERENCE)');
  for (const group of ATTRIBUTE_GROUPS) {
    const val = attributes[group.key]?.trim();
    if (val && val.toLowerCase() !== 'none') {
      parts.push(`${group.label}: ${val}`);
    }
  }
  parts.push('');

  parts.push('## VISUAL STYLE & LIGHTING');
  parts.push('- Style: Photorealistic character portrait with natural proportions and realistic materials, full-body shot.');
  parts.push('- Lighting: Soft, even studio lighting with neutral color grading. Gentle contrast, no dramatic shadows or cinematic glows.');
  parts.push('- Texture: Visible skin pores and fabric weave. Render fabrics exactly as described. NO LEATHER unless specified.');
  parts.push('- Background: Flat solid grey (#D3D3D3) only. No floor, no environment.');
  parts.push('');

  parts.push('## CAMERA & COMPOSITION');
  parts.push('- Aspect Ratio: 9:16 portrait.');
  parts.push('- Framing: FULL BODY — the complete character from the top of the head (including all hair/headwear) to the bottom of the feet (including soles of shoes) MUST be visible with padding. NEVER crop the head or feet.');
  parts.push('- Lens: 85mm portrait lens, eye-level at chest height, no extreme perspective.');
  parts.push('- Zoom out enough so the entire figure fits comfortably with space above and below.');
  parts.push('');

  parts.push('## NEGATIVE CONSTRAINTS');
  parts.push('- NO TEXT, LOGOS, OR WATERMARKS.');
  parts.push('- NO TACTICAL GEAR, NO HEROIC PROPS, NO SUNGLASSES UNLESS REQUESTED.');

  return parts.join('\n');
}

export function buildCharacterViewPrompt(
  viewKey: string,
  characterDescription: string,
): string {
  const view = VIEW_REQUESTS[viewKey] ?? VIEW_REQUESTS.main;

  if (viewKey === 'main') {
    return [
      characterDescription,
      '',
      'Grounded, realistic character study with flat, natural overcast lighting.',
      'No dramatic highlights or hero-lighting on muscles.',
      'Text-only generation; do not rely on any reference images.',
      view,
      '',
      `Style Requirements:\n${CHARACTER_STYLE_NOTES}`,
      '',
      'FINAL CHECK — ABSOLUTELY MANDATORY: The generated image MUST show the COMPLETE character from the very top of the head to the very bottom of the feet. If the head or feet would be cut off, zoom out further. This is non-negotiable.',
    ].join('\n');
  }

  return [
    'Do not render any text, titles, labels, letters, numbers, logos, captions, or annotations in the image. The image must contain only the character on a plain background.',
    '',
    'Using the provided character image as reference, recompose to the specified view,',
    'preserving EXACT character design, body type, materials, colors, clothing, accessories, and all details.',
    '',
    view,
    '',
    LOCK_OUTFIT_BLOCK,
    '',
    'Background: solid flat grey (#D3D3D3). No floor, no shadows, no environment.',
    '',
    `Style requirements:\n${CHARACTER_STYLE_NOTES}`,
  ].join('\n');
}

/* ── Extract Attributes Schema ── */

export const EXTRACT_ATTRIBUTES_PROMPT = `You are a character design extrapolation tool. Your job is to produce a COMPLETE full-body character outfit from the provided image — head to toe, front and back — even if the image only shows part of the character.

Return JSON only with this exact schema:
{
  "age": string,
  "race": string,
  "gender": string,
  "build": string,
  "headwear": string,
  "outerwear": string,
  "top": string,
  "legwear": string,
  "footwear": string,
  "gloves": string,
  "facegear": string,
  "utilityrig": string,
  "backcarry": string,
  "handprop": string,
  "accessories": string,
  "coloraccents": string,
  "detailing": string
}

IDENTITY FIELDS — you MUST pick one of these exact strings:
- age: ${AGE_OPTIONS.map((o) => `"${o}"`).join(' | ')}
- race: ${RACE_OPTIONS.map((o) => `"${o}"`).join(' | ')}
- gender: ${GENDER_OPTIONS.map((o) => `"${o}"`).join(' | ')}
- build: ${BUILD_OPTIONS.map((o) => `"${o}"`).join(' | ')}

CRITICAL RULES:
1. EVERY clothing/gear field MUST contain a specific, descriptive value. Describe color, material, pattern, fit, and condition.
2. You are building a FULL-BODY character. If feet are cropped out, INVENT appropriate footwear. If hands are hidden, INVENT appropriate gloves or describe bare hands. If a field has no obvious match, DESIGN something that fits the character's overall aesthetic, era, and style.
3. NEVER write "not visible", "none", "n/a", "unknown", or "not shown". These are FORBIDDEN values. Every field must describe an actual garment, accessory, or design choice.
4. If a slot genuinely wouldn't have an item (e.g. no gloves), describe what the bare body part looks like instead (e.g. "bare hands, calloused knuckles with a faded scar across the right palm").
5. Think like a character designer completing a concept sheet — extrapolate from the visible style, silhouette, color palette, materials, and era to fill in anything not shown.
- coloraccents: 2-5 primary colors, comma-separated
- detailing: specific wear, stains, damage, dust, wrinkles, scuffs, repairs, etc.
Return ONLY JSON. No markdown, no extra text.`;
