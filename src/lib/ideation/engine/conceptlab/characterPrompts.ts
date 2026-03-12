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
    label: 'Skin Detail', key: 'skindetail',
    common: ['Porcelain pale, cool undertone','Fair with warm peach undertone','Light olive, Mediterranean','Medium tan, golden','Deep brown, warm undertone','Dark ebony, cool undertone','Freckled fair skin','Sun-kissed bronze','Ruddy complexion','Ashen pale, almost translucent'],
    rare: ['Albino pale, pink undertone','Grey-tinted skin, otherworldly','Blue-grey, deathly pale','Greenish tint, sickly','Scarred and mottled texture','Weathered and sun-damaged','Porcelain with visible veins','Flushed pink, cold exposure'],
  },
  {
    label: 'Eye Detail', key: 'eyedetail',
    common: ['Brown, warm and deep','Blue, clear sky','Green, forest','Hazel, shifting gold-green','Dark brown, nearly black','Grey, steel','Blue-green, teal','Amber, warm honey','Light brown, cognac','Dark blue, midnight'],
    rare: ['Milky white, no visible iris','Heterochromia — one blue, one brown','Pale lavender, almost silver','Blood red, supernatural','Golden, inhuman','Black sclera, demon-like','Glowing cyan','Reflective silver, metallic','Clouded blind eye, one side','Violet, vivid'],
  },
  {
    label: 'Hair Detail', key: 'hairdetail',
    common: ['Black, straight, shoulder-length','Brown, wavy, mid-back','Blonde, straight, long','Auburn, curly, chin-length','Dark brown, short, cropped','Red, wavy, past shoulders','Black, slicked back','Dirty blonde, messy, medium','Grey, short, neat','Brown, ponytail, tight'],
    rare: ['Platinum white, wavy, past shoulders','Silver-grey, long, loose','Jet black with blue sheen','Shaved sides, long top','Dreadlocks, waist-length','Mohawk, styled up','Two-tone split dye','Bald, smooth','White streak in dark hair','Bright unnatural color'],
  },
  {
    label: 'Makeup Detail', key: 'makeupdetail',
    common: ['No visible makeup','Natural, minimal','Dark lipstick, smoky eye','Red lip, clean skin','Subtle foundation, nude lip','Heavy eyeliner, winged','Glossy lip, light blush','Matte skin, dark lip','Bold eyebrow pencil','Concealer only'],
    rare: ['Dark burgundy lip, pale foundation','Black lipstick, white powder','Theatrical stage makeup','Scar-covering concealer','Gothic — dark eyes, dark lips, pale base','Avant-garde, artistic','Smudged/running eye makeup','Glitter accents','Face paint, tribal','Bruise/wound prosthetic makeup'],
  },
  {
    label: 'Neckwear', key: 'neckwear',
    common: ['No neckwear','Simple chain necklace','Dog tags','Scarf — wrapped loosely','Bandana — knotted','Turtleneck collar visible','Hoodie drawstrings','Lanyard','Thin leather cord','Collar popped'],
    rare: ['Black lace choker with pendant','Velvet choker, ornate clasp','Studded leather collar','Multi-chain layered necklace','Cross pendant on chain','Tribal necklace, bone/stone','Spiked collar','Pearl strand','Gem pendant, large','Tooth/claw necklace'],
  },
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
    label: 'Under-Legwear', key: 'underlegwear',
    common: ['Bare legs','Sheer nude stockings','Black opaque tights','Knee-high socks','Ankle socks — white','Ankle socks — black','Compression tights','Thermal leggings — under pants','No under-legwear visible','Thigh-high stockings'],
    rare: ['Black fishnet stockings','White fishnet tights','Patterned lace stockings','Torn/ripped tights','Striped knee-highs','Net/mesh leggings','Garter-attached stockings','Leg wraps — bandage style','Shin guards underneath','Colored opaque tights'],
  },
  {
    label: 'Jewelry', key: 'jewelry',
    common: ['No jewelry','Single ring — silver band','Stud earrings — small','Hoop earrings — small','Watch — simple','Bracelet — thin chain','Ring — gold band','Pendant necklace — simple','Two rings — different fingers','Ear cuff — minimal'],
    rare: ['Multiple silver rings, left hand','Skull ring — detailed','Gemstone ring — large','Layered bracelets — mixed material','Nose ring — septum','Lip ring — small hoop','Eyebrow piercing','Full ear piercings — multiple','Knuckle rings — set','Ornate brooch — vintage'],
  },
  {
    label: 'Tattoos & Marks', key: 'tattoos_marks',
    common: ['No visible tattoos or marks','Small wrist tattoo','Forearm sleeve tattoo','Neck tattoo — small','Shoulder tattoo','Scar — face, small','Birthmark — subtle','Freckles across nose','Beauty mark — cheek','Scar — across eyebrow'],
    rare: ['Chest tattoo — symbol, centered','Full sleeve tattoo — both arms','Face tattoo — tribal/geometric','Hand tattoos — knuckle text','Cross/religious symbol — chest','Runic symbols — neck/collarbone','Burn scar — large area','Ritual scarification','Glowing marks — supernatural','Brand mark — stylized'],
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
- The character should occupy approximately 75% of the frame height, centered vertically.
- Leave at LEAST 12% empty space above the top of the head and 12% below the bottom of the feet.
- The ENTIRE character must be visible: TOP OF THE HEAD (including all hair/headwear) to the BOTTOM OF THE FEET (including shoe soles touching the ground line).
- The feet/shoes MUST be clearly visible — this is the #1 most common error. If in doubt, ZOOM OUT MORE.
- If the character is tall, zoom the camera out further rather than cropping. NEVER crop any body part.
- Think of it as a full-length mirror photo — you can always see the shoes.
- This is NOT a portrait, NOT a headshot, NOT waist-up. This is a FULL-LENGTH character reference.

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
  main: 'FULL-LENGTH standing pose showing the COMPLETE character from head to shoes. Camera pulled back far enough that the character fills only about 75% of the vertical frame — with visible empty grey space above the head and below the feet. Three-quarter front view, camera at chest height, rotated about 9 degrees right. Proportions natural, standard lens. The character\'s SHOES/FEET must be clearly visible near the bottom of the frame. If feet would be cropped, the camera MUST zoom out further. This is a full-length reference photo, not a portrait.',

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

  parts.push('## NEGATIVE CONSTRAINTS (MUST AVOID)');
  parts.push('- NO cropped body, NO cut off feet, NO cut off head.');
  parts.push('- NO close-up, NO portrait framing, NO headshot, NO bust shot, NO waist-up framing.');
  parts.push('- NO text, logos, or watermarks.');
  parts.push('- NO background environment, cityscape, or scene — ONLY solid grey.');
  parts.push('- NO tactical gear, heroic props, or sunglasses unless explicitly requested.');

  return parts.join('\n');
}

export function buildCharacterViewPrompt(
  viewKey: string,
  characterDescription: string,
): string {
  const view = VIEW_REQUESTS[viewKey] ?? VIEW_REQUESTS.main;

  if (viewKey === 'main') {
    return [
      'CRITICAL RENDERING REQUIREMENTS (READ FIRST — ALL ARE MANDATORY):',
      '',
      'FRAMING: This is a FULL-LENGTH photo. The character must occupy about 75% of the frame height. The character\'s SHOES and FEET must be clearly visible near the bottom. There must be visible empty grey space ABOVE the head and BELOW the feet. Think of a full-length mirror photo — you always see the shoes. If the character would be cropped at the shins/knees/waist, the camera is TOO CLOSE — zoom out.',
      '',
      'STYLE: PHOTOREALISTIC — like a high-resolution photograph of a real person in a real costume. NOT a painting, NOT an illustration, NOT concept art.',
      '',
      'BACKGROUND: Solid flat grey (#D3D3D3) ONLY. No environment, no cityscape, no room, no floor, no gradients — JUST flat grey.',
      '',
      'LIGHTING: Soft, even studio lighting. No dramatic cinematic lighting, no neon, no volumetric effects.',
      '',
      characterDescription,
      '',
      view,
      '',
      `Style Requirements:\n${CHARACTER_STYLE_NOTES}`,
      '',
      'FINAL MANDATORY CHECK:',
      '• Are the character\'s SHOES/FEET visible? If NO → zoom out more.',
      '• Is the background solid grey with no environment? If NO → remove environment.',
      '• Does it look like a photograph (not illustration)? If NO → make photorealistic.',
    ].join('\n');
  }

  return [
    'Do not render any text, titles, labels, letters, numbers, logos, captions, or annotations in the image. The image must contain only the character on a plain background.',
    '',
    'CRITICAL: This must be a PHOTOREALISTIC image — like a high-resolution photograph, NOT an illustration, painting, or concept art.',
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

export const EXTRACT_ATTRIBUTES_PROMPT = `You are a forensic-level character design extraction tool. Study both the image AND the description below. Your job is to produce PRECISE, SPECIFIC attributes — not generic summaries.

Return JSON only with this exact schema:
{
  "age": string,
  "race": string,
  "gender": string,
  "build": string,
  "skindetail": string,
  "eyedetail": string,
  "hairdetail": string,
  "makeupdetail": string,
  "headwear": string,
  "neckwear": string,
  "outerwear": string,
  "top": string,
  "legwear": string,
  "underlegwear": string,
  "footwear": string,
  "gloves": string,
  "facegear": string,
  "utilityrig": string,
  "backcarry": string,
  "handprop": string,
  "jewelry": string,
  "tattoos_marks": string,
  "accessories": string,
  "coloraccents": string,
  "detailing": string
}

IDENTITY FIELDS — pick one of these exact strings:
- age: ${AGE_OPTIONS.map((o) => `"${o}"`).join(' | ')}
- race: ${RACE_OPTIONS.map((o) => `"${o}"`).join(' | ')}
- gender: ${GENDER_OPTIONS.map((o) => `"${o}"`).join(' | ')}
- build: ${BUILD_OPTIONS.map((o) => `"${o}"`).join(' | ')}

FIELD GUIDANCE:
- skindetail: exact skin tone with undertone (e.g. "porcelain pale with cool blue undertone")
- eyedetail: exact eye color + unique qualities (e.g. "milky white with no visible iris, supernatural appearance")
- hairdetail: exact color, length, texture, style, parting (e.g. "platinum white, wavy, past shoulders, center-parted, loose")
- makeupdetail: lip color, eye makeup, blush, etc. (e.g. "dark burgundy lipstick, subtle smoky eye shadow")
- neckwear: chokers, necklaces — describe pendant shape, chain type, material (e.g. "black lace choker with gold heart-shaped pendant")
- outerwear: outermost layer with EXACT construction details (e.g. "black leather jacket with three rows of silver dome studs along each sleeve, cropped at waist")
- top: layer under outerwear (e.g. "black boned corset with front button closure and lace trim along neckline")
- legwear: skirt/pants — type, material, length, shape (e.g. "black velvet high-low skirt, mid-calf front, ankle-length back")
- underlegwear: stockings/tights/fishnets under legwear (e.g. "black fishnet stockings, mid-opacity")
- footwear: exact boot/shoe type, height, closure, material (e.g. "black leather mid-calf lace-up combat boots with thick rubber sole")
- jewelry: rings, bracelets, earrings — which hand/finger, material (e.g. "two silver rings on left hand ring and middle fingers")
- tattoos_marks: visible tattoos, birthmarks, scars — symbol, size, body placement (e.g. "small cross/star symbol tattoo on upper chest, centered above corset line")
- coloraccents: 3-5 dominant colors, comma-separated
- detailing: wear, texture details, scuffs, patina, fabric condition

CRITICAL RULES:
1. Be HYPER-SPECIFIC. "Black studded leather jacket with rows of silver dome studs on sleeves" NOT "studded leather jacket".
2. Look at the IMAGE directly — do not rely only on the text description. The image is the ground truth.
3. Capture EVERY distinctive/unique feature: unusual eye colors, tattoos, specific jewelry, visible marks.
4. NEVER write "not visible", "none", "n/a", or "unknown". If a slot has no item, describe the bare body part.
5. If something is partially hidden, extrapolate from visible style.
Return ONLY JSON. No markdown, no extra text.`;
