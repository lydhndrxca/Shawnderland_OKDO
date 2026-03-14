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
    label: 'Facial Hair', key: 'facialhair',
    common: ['Clean-shaven','Light stubble — 1-2 day growth','Heavy stubble — 3-5 day shadow','Short trimmed beard — neat edges','Full beard — medium length, natural','Goatee — chin and mustache','Mustache only — groomed','Soul patch — small chin tuft','No facial hair','5 o\'clock shadow — even'],
    rare: ['Long full beard — chest length, wild','Grey-streaked beard — salt-and-pepper, untrimmed','Braided beard — decorative','Handlebar mustache — waxed tips','Mutton chops — no chin hair','Patchy beard — uneven growth','White beard — full, weathered','Stubble — deliberately unkempt, days old','Van Dyke — pointed goatee and mustache','Beard with visible food/dirt/debris'],
  },
  {
    label: 'Expression', key: 'expression',
    common: ['Neutral, composed','Stern, focused','Calm, relaxed','Confident, direct gaze','Tired, weary','Slight smirk','Serious, jaw set','Thoughtful, distant gaze','Alert, watchful','Stoic, unreadable'],
    rare: ['Grizzled scowl — hard-lived','Battle-hardened stare — thousand-yard','Menacing glare — intimidating','Pained grimace — enduring','Defiant snarl','Haunted look — hollow eyes','Cold fury — controlled rage','World-weary resignation','Feral intensity','Amused contempt'],
  },
  {
    label: 'Body Condition', key: 'bodycondition',
    common: ['Clean, healthy skin','Light sweat sheen','Minor scrapes','Lightly sun-weathered','Dry, dusty skin','Slightly flushed','Calloused hands','Veiny forearms','Tanned, outdoor-worn','No visible damage'],
    rare: ['Blood-stained skin — dried, smeared on arms/face','Mud/dirt caked on skin — heavy','Open wounds — cuts, abrasions','Heavy scarring — multiple areas','Bruised — dark marks on arms/torso','Sweat-soaked, glistening','Burn marks — healed, textured','Ash/soot covered','Chemical stains on hands','Frost-nipped, reddened extremities'],
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
    label: 'Garment Condition', key: 'garmentcondition',
    common: ['Pristine, like-new','Lightly worn, broken-in','Well-worn but maintained','Faded from sun/washing','Wrinkled, lived-in','Scuffed edges, minor pilling','Slightly frayed hems','Minor stains — work/food','Soft and broken-in, years of wear','Crisp, recently laundered'],
    rare: ['Heavily distressed — torn, frayed, ripped edges','Battle-damaged — rips, burns, dried blood stains','Mud/dirt-caked — ground-in grime','Sweat-stained and salt-crusted','Oil/grease saturated','Patched and repaired multiple times','Threadbare — nearly transparent in spots','Charred/singed edges','Waterlogged and stiff-dried','Bloodstained — heavy, dried dark brown'],
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

MANDATORY FULL-BODY FRAMING — #1 PRIORITY (DO NOT VIOLATE):
- The character should occupy approximately 65% of the frame height, centered vertically.
- Leave at LEAST 15% empty solid grey space ABOVE the top of the head AND 15% empty solid grey space BELOW the soles of the feet/shoes.
- START composing the image from the FEET UP. Place the shoe soles first at about 15% from the bottom edge, then build the figure upward.
- The ENTIRE body must be visible: TOP OF THE HEAD (including all hair/headwear) to the BOTTOM OF THE FEET (including the flat soles of the shoes resting on the invisible ground plane).
- SHOES AND FEET are the #1 most commonly cropped part. You MUST verify feet are fully visible with grey padding below them.
- If the character is tall or has elaborate headwear, zoom the camera out further. NEVER crop ANY body part.
- Think of this as a fashion lookbook photo taken with a wide-angle lens — the model is small in the frame with lots of grey space around them.
- This is NOT a portrait, NOT a headshot, NOT waist-up, NOT shin-crop. This is a FULL-LENGTH character reference.

FOLLOW THE DESCRIPTION LITERALLY:
- Wardrobe, props, colors, materials, condition, and wear must match the attribute list.
- Body type, age, and demeanor must match the identity description.
- Include any listed props and accessories. Do not invent extra items.

VISUAL STYLE — PHOTOREALISTIC (MANDATORY, DO NOT DEVIATE):
This MUST look like a photograph taken with a real camera of a real person wearing a real costume. NOT concept art, NOT digital painting, NOT illustration, NOT a video game render, NOT stylized in any way.
- SKIN: Real human skin with visible pores, subsurface scattering, natural blemishes, uneven skin tone. NOT smooth/airbrushed/plastic-looking.
- EYES: Wet, reflective, with visible blood vessels in the sclera. NOT glowing, NOT unnaturally vivid.
- HAIR: Individual strands with natural flyaways and imperfect texture. NOT perfectly styled CG hair.
- FABRICS: Heavy, lived-in materials that sag and wrinkle under gravity. Visible thread texture, natural pilling, realistic wear. NOT clean/pristine/crisp CG materials.
- METALS: Real metal with scratches, fingerprints, uneven patina. NOT perfectly polished/shiny CG metal.
- LIGHTING: Soft, even studio photography lighting (diffused softbox). Neutral color temperature. NO dramatic rim lights, NO colored gels, NO cinematic atmosphere, NO volumetric fog, NO lens flares, NO bloom/glow effects.
- PROPORTIONS: Natural and un-idealized — realistic weight distribution, no exaggerated musculature, no heroic proportions.
- OVERALL: If this image could be mistaken for concept art, a game character, or a digital painting, it has FAILED. It must pass as a real photograph.
- Pose: casual standing, slight 3/4 to camera.

ZERO TEXT IN IMAGE (MANDATORY):
- Do NOT render any text, letters, numbers, hex codes, color codes, logos, labels, captions, annotations, or watermarks anywhere in the image.
- The image must contain ONLY the character on a plain background — absolutely nothing written or printed.

BACKGROUND (REQUIRED):
- Flat solid neutral grey only.
- No floor, no ground plane, no environment, no background objects.
- No ground shadows, reflections, gradients, or lighting effects.

CAMERA & COMPOSITION:
- Eye-level camera at chest height, natural perspective, 70-85mm equivalent lens unless overridden.
- Centered full-body framing. ZOOM OUT enough so the full character fits with padding on all sides.`;

export function getStyleNotes(styleOverride: string): string {
  return `CRITICAL IMAGE FORMAT: 9:16 vertical portrait (1536 x 2816).

MANDATORY FULL-BODY FRAMING — #1 PRIORITY (DO NOT VIOLATE):
- The character should occupy approximately 65% of the frame height, centered vertically.
- Leave at LEAST 15% empty solid grey space ABOVE the top of the head AND 15% empty solid grey space BELOW the soles of the feet/shoes.
- START composing the image from the FEET UP. Place the shoe soles first at about 15% from the bottom edge, then build the figure upward.
- The ENTIRE body must be visible: TOP OF THE HEAD (including all hair/headwear) to the BOTTOM OF THE FEET (including the flat soles of the shoes resting on the invisible ground plane).
- SHOES AND FEET are the #1 most commonly cropped part. You MUST verify feet are fully visible with grey padding below them.
- If the character is tall or has elaborate headwear, zoom the camera out further. NEVER crop ANY body part.
- This is NOT a portrait, NOT a headshot, NOT waist-up, NOT shin-crop. This is a FULL-LENGTH character reference.

FOLLOW THE DESCRIPTION LITERALLY:
- Wardrobe, props, colors, materials, condition, and wear must match the attribute list.
- Body type, age, and demeanor must match the identity description.
- Include any listed props and accessories. Do not invent extra items.

VISUAL STYLE — USER-DIRECTED (FOLLOW THIS STYLE):
Render the character in the following art style: ${styleOverride}
This style directive takes priority over any other style guidance. The entire image must be consistent with this style.

ZERO TEXT IN IMAGE (MANDATORY):
- Do NOT render any text, letters, numbers, hex codes, color codes, logos, labels, captions, annotations, or watermarks anywhere in the image.
- The image must contain ONLY the character on a plain background — absolutely nothing written or printed.

BACKGROUND (REQUIRED):
- Flat solid neutral grey only.
- No floor, no ground plane, no environment, no background objects.
- No ground shadows, reflections, gradients, or lighting effects.

CAMERA & COMPOSITION:
- Eye-level camera at chest height, natural perspective, 70-85mm equivalent lens unless overridden.
- Centered full-body framing. ZOOM OUT enough so the full character fits with padding on all sides.`;
}

export const VIEW_REQUESTS: Record<string, string> = {
  main: 'FULL-LENGTH standing pose showing the COMPLETE character from head to shoe soles. The character fills only about 65% of the vertical frame — there must be visible empty solid grey space ABOVE the head AND BELOW the feet. Compose FEET FIRST: place shoe soles at ~15% from bottom edge, build figure upward. Three-quarter front view, camera at chest height, rotated about 9 degrees right. Proportions natural, standard lens. The character\'s SHOES and FEET are the most critical element to include — they MUST be fully visible with grey padding below them. If ANY part of the feet would be cropped, ZOOM OUT MORE. This is a fashion lookbook / full-length reference photo, NOT a portrait or bust shot.',

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
  styleOverride?: string,
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

  if (styleOverride) {
    parts.push('## VISUAL STYLE & LIGHTING — USER-DIRECTED STYLE');
    parts.push(`- ART STYLE: ${styleOverride}`);
    parts.push('- Render the character in the art style described above. This style takes priority over any default.');
    parts.push('- Lighting: appropriate for the chosen style. Maintain consistency with the style direction.');
    parts.push('- Background: Flat solid neutral grey only. No floor, no environment.');
  } else {
    parts.push('## VISUAL STYLE & LIGHTING — PHOTOREALISTIC (MANDATORY)');
    parts.push('- This MUST look like a real photograph of a real person in a real costume — NOT concept art, NOT illustration, NOT a game render.');
    parts.push('- Skin: real pores, subsurface scattering, natural blemishes. Hair: individual strands with flyaways.');
    parts.push('- Fabrics: heavy, lived-in, visible thread texture, natural wrinkles and sag under gravity. Render exactly as described. NO LEATHER unless specified.');
    parts.push('- Metals/hardware: real scratches, fingerprints, uneven patina — NOT clean CG metal.');
    parts.push('- Lighting: Soft, even studio photography lighting. Neutral color temperature. NO dramatic lighting, NO colored gels, NO rim lights, NO cinematic atmosphere.');
    parts.push('- Background: Flat solid neutral grey only. No floor, no environment.');
    parts.push('- If the result could be mistaken for concept art or a digital painting, it has FAILED.');
  }
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
  parts.push('- NO text, letters, numbers, hex codes, color codes, logos, labels, captions, annotations, or watermarks anywhere in the image.');
  parts.push('- NO background environment, cityscape, or scene — ONLY solid grey.');
  parts.push('- NO tactical gear, heroic props, or sunglasses unless explicitly requested.');
  if (!styleOverride) {
    parts.push('- NO stylized rendering — no painterly strokes, no cel-shading, no digital art aesthetic, no concept art look, no video game character rendering.');
    parts.push('- NO dramatic/cinematic lighting — no colored rim lights, no atmospheric fog, no lens effects.');
  }
  parts.push('- NO idealized proportions — no exaggerated musculature, no heroic builds unless described.');

  return parts.join('\n');
}

export function buildCharacterViewPrompt(
  viewKey: string,
  characterDescription: string,
  styleOverride?: string,
): string {
  const view = VIEW_REQUESTS[viewKey] ?? VIEW_REQUESTS.main;
  const styleNotes = styleOverride ? getStyleNotes(styleOverride) : CHARACTER_STYLE_NOTES;

  if (viewKey === 'main') {
    const styleLine = styleOverride
      ? `STYLE: Render in the following art style: ${styleOverride}. This style directive takes priority. Maintain consistency with this style throughout.`
      : 'STYLE: PHOTOREALISTIC — this must look like a high-resolution PHOTOGRAPH taken with a real camera of a real person wearing a real costume in a studio. NOT a painting, NOT an illustration, NOT concept art, NOT a video game character render, NOT stylized in ANY way. Real skin pores, real fabric texture, real metal scratches. If it could be mistaken for concept art or digital art, it has FAILED.';

    const lightingLine = styleOverride
      ? 'LIGHTING: Use lighting appropriate for the chosen art style. Keep it consistent and well-crafted.'
      : 'LIGHTING: Soft, even studio PHOTOGRAPHY lighting (as from a diffused softbox). Neutral color temperature. NO dramatic cinematic lighting, NO colored gels, NO rim lights, NO neon, NO volumetric effects, NO atmospheric haze, NO lens flares, NO bloom/glow.';

    const finalChecks = styleOverride
      ? [
          'FINAL MANDATORY CHECK (verify ALL before outputting):',
          '• Are the character\'s SHOES/FEET fully visible with grey padding below? If NO → zoom out more.',
          '• Is the background solid grey with no environment? If NO → remove environment.',
          '• Is the image rendered in the requested art style? If NO → re-render in the correct style.',
        ]
      : [
          'FINAL MANDATORY CHECK (verify ALL before outputting):',
          '• Are the character\'s SHOES/FEET fully visible with grey padding below? If NO → zoom out more.',
          '• Is the background solid grey with no environment? If NO → remove environment.',
          '• Does the SKIN look like real human skin with pores and blemishes? If NO → add realistic skin detail.',
          '• Do the FABRICS look like real cloth with weight, wrinkles, and thread texture? If NO → make materials realistic.',
          '• Is the LIGHTING flat studio lighting without dramatic effects? If NO → remove cinematic lighting.',
          '• Could this image be mistaken for concept art, a digital painting, or a game render? If YES → start over with photorealistic rendering. It MUST look like a real photograph.',
        ];

    return [
      'CRITICAL RENDERING REQUIREMENTS (READ FIRST — ALL ARE MANDATORY):',
      '',
      'FRAMING: This is a FULL-LENGTH photo. The character must occupy only about 65% of the frame height. START from the FEET: place shoe soles at ~15% from the bottom edge, then build the figure upward. There MUST be visible empty grey space ABOVE the head AND BELOW the shoe soles. Think of a fashion lookbook photo — the model is relatively small in the frame with lots of grey space around them. If ANY part of the feet/shoes would be cropped, ZOOM OUT MORE. This is the #1 most common error.',
      '',
      styleLine,
      '',
      'BACKGROUND: Solid flat neutral grey ONLY. No environment, no cityscape, no room, no floor, no gradients — JUST flat grey.',
      '',
      lightingLine,
      '',
      characterDescription,
      '',
      view,
      '',
      `Style Requirements:\n${styleNotes}`,
      '',
      ...finalChecks,
    ].join('\n');
  }

  const styleIntro = styleOverride
    ? `CRITICAL: Render in the following art style: ${styleOverride}. This style directive takes priority.`
    : 'CRITICAL: This must be a PHOTOREALISTIC image — like a high-resolution photograph, NOT an illustration, painting, or concept art.';

  return [
    'ZERO TEXT IN IMAGE: Do NOT render any text, titles, labels, letters, numbers, hex codes, color codes, logos, captions, annotations, or watermarks anywhere in the image. The image must contain ONLY the character on a plain background — absolutely nothing written or printed.',
    '',
    styleIntro,
    '',
    'Using the provided character image as reference, recompose to the specified view,',
    'preserving EXACT character design, body type, materials, colors, clothing, accessories, and all details.',
    '',
    view,
    '',
    LOCK_OUTFIT_BLOCK,
    '',
    'Background: solid flat neutral grey. No floor, no shadows, no environment.',
    '',
    `Style requirements:\n${styleNotes}`,
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
  "facialhair": string,
  "expression": string,
  "bodycondition": string,
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
  "garmentcondition": string,
  "detailing": string
}

IDENTITY FIELDS — pick one of these exact strings:
- age: ${AGE_OPTIONS.map((o) => `"${o}"`).join(' | ')}
- race: ${RACE_OPTIONS.map((o) => `"${o}"`).join(' | ')}
- gender: ${GENDER_OPTIONS.map((o) => `"${o}"`).join(' | ')}
- build: ${BUILD_OPTIONS.map((o) => `"${o}"`).join(' | ')}

FIELD GUIDANCE:
- skindetail: exact skin tone with undertone (e.g. "deep brown, warm undertone, weathered and sun-damaged")
- facialhair: beard, mustache, stubble — exact style, length, color, grooming (e.g. "heavy grey-white beard, untrimmed, coarse, weeks of growth"). Write "clean-shaven" if none.
- expression: facial expression and demeanor — the character's attitude (e.g. "grizzled scowl, thousand-yard stare, jaw set, hard-lived intensity")
- bodycondition: visible condition of exposed skin — blood, dirt, wounds, sweat, grime, bruises, scars on body (e.g. "dried blood smeared on forearms and face, dirt-caked knuckles, multiple healed scars on upper arms, heavy sweat"). Write "clean, healthy skin" if none.
- eyedetail: exact eye color + unique qualities (e.g. "milky white with no visible iris, supernatural appearance")
- hairdetail: HEAD HAIR only — exact color, length, texture, style, parting (e.g. "grey-white, short, curly, receding, unkempt")
- makeupdetail: lip color, eye makeup, blush, etc. (e.g. "dark burgundy lipstick, subtle smoky eye shadow")
- neckwear: chokers, necklaces — describe pendant shape, chain type, material (e.g. "black lace choker with gold heart-shaped pendant")
- outerwear: outermost layer with EXACT construction details (e.g. "black leather jacket with three rows of silver dome studs along each sleeve, cropped at waist")
- top: layer under outerwear (e.g. "olive sleeveless hoodie, cut-off arms, stencil text across chest, hood attached")
- legwear: skirt/pants — type, material, length, shape (e.g. "camouflage cargo shorts, knee-length, torn/frayed hems, large side cargo pockets")
- underlegwear: stockings/tights/fishnets under legwear (e.g. "black fishnet stockings, mid-opacity")
- footwear: exact boot/shoe type, height, closure, material (e.g. "black leather mid-calf lace-up combat boots with thick rubber sole, heavily scuffed")
- jewelry: rings, bracelets, earrings — which hand/finger, material (e.g. "two silver rings on left hand ring and middle fingers")
- tattoos_marks: visible PERMANENT tattoos, birthmarks, scars — symbol, size, body placement (e.g. "large burn scar across left shoulder, faded tribal tattoo on right forearm")
- coloraccents: 3-5 dominant colors, comma-separated
- garmentcondition: the overall wear/damage state of ALL clothing as a whole (e.g. "heavily distressed — torn edges, dried blood stains, ground-in dirt, frayed hems, battle-damaged throughout"). This is CRITICAL for character flavor.
- detailing: material emphasis, construction techniques, repair evidence, patina

CRITICAL RULES:
1. Be HYPER-SPECIFIC. "Olive sleeveless hoodie with 'U.S. Army Rangers' stencil text, cut-off sleeves, frayed armholes, blood-stained" NOT "military top".
2. Look at the IMAGE directly — do not rely only on the text description. The image is the ground truth.
3. Capture EVERY distinctive/unique feature: unusual eye colors, tattoos, specific jewelry, visible marks.
4. bodycondition is CRUCIAL — if there is blood, dirt, wounds, sweat, or grime on the character's skin, you MUST describe it in detail. This defines the character's story.
5. garmentcondition is CRUCIAL — if clothing is torn, distressed, dirty, bloodstained, or battle-damaged, capture that. A clean description of distressed clothing will produce the wrong image.
6. NEVER write "not visible", "none", "n/a", or "unknown". If a slot has no item, describe the bare body part or current state.
7. If something is partially hidden, extrapolate from visible style.
Return ONLY JSON. No markdown, no extra text.`;

/* ── Context Lens Synthesis ──────────── */

export interface ContextLensInput {
  bibleContext?: string;
  costumeBrief?: string;
  fusionBrief?: string;
  envBrief?: string;
  lockConstraints?: string;
}

export interface ContextLensSynthesis {
  description: string;
  attributes: CharacterAttributes;
  identity: CharacterIdentity;
}

export function hasContextData(ctx: ContextLensInput): boolean {
  return !!(
    ctx.bibleContext?.trim() ||
    ctx.costumeBrief?.trim() ||
    ctx.fusionBrief?.trim() ||
    ctx.envBrief?.trim() ||
    ctx.lockConstraints?.trim()
  );
}

function formatContextSections(ctx: ContextLensInput): string[] {
  const parts: string[] = [];
  if (ctx.bibleContext?.trim()) parts.push(`CHARACTER BIBLE: ${ctx.bibleContext.trim()}`);
  if (ctx.costumeBrief?.trim()) parts.push(`COSTUME DIRECTION: ${ctx.costumeBrief.trim()}`);
  if (ctx.fusionBrief?.trim()) parts.push(`STYLE FUSION: ${ctx.fusionBrief.trim()}`);
  if (ctx.envBrief?.trim()) parts.push(`ENVIRONMENT: ${ctx.envBrief.trim()}`);
  if (ctx.lockConstraints?.trim()) parts.push(`HARD CONSTRAINTS (MUST AVOID): ${ctx.lockConstraints.trim()}`);
  return parts;
}

/**
 * Build a prompt prefix for context-aware image extraction.
 * Prepended to the DESCRIBE_IMAGE_PROMPT so the AI sees the image
 * AND the creative direction in a single pass.
 */
export function buildContextExtractionPrefix(ctx: ContextLensInput): string {
  const parts = formatContextSections(ctx);
  if (parts.length === 0) return '';

  return `🎨 CONTEXT-AWARE REIMAGINATION — READ EVERYTHING BEFORE YOU WRITE:

Your task: Describe this EXACT person wearing an ADAPTED version of their outfit suited to a new context. The result must look like the SAME CHARACTER who simply changed clothes for a new role — not a different person, and not a generic version of the new role.

═══ STEP 1: STUDY THE ORIGINAL CHARACTER ═══
Before writing anything, study the image deeply and note:
- The PERSON: face structure, age, skin tone, build, hair, scars, blood, dirt, sweat, marks, expression, posture
- EACH clothing piece: exact garment type, cut, fit, color, material, condition (worn? torn? dirty? pristine?)
- The overall CHARACTER FLAVOR: the mood, energy, story this outfit tells (gritty survivor? elegant rebel? battle-worn veteran?)
- The WEAR LEVEL: Is the clothing distressed, battle-damaged, blood-stained, muddy, pristine, tailored?

═══ STEP 2: ADAPT FOR THIS CREATIVE CONTEXT ═══
${parts.join('\n')}

ADAPTATION RULES — THESE ARE NON-NEGOTIABLE:

1. THE PERSON STAYS IDENTICAL:
   - Describe their face, skin, scars, blood, dirt, wounds, hair, beard EXACTLY as they appear in the image.
   - If they look weathered/grizzled/scarred, they STAY weathered/grizzled/scarred.
   - If they have blood on their skin, describe it. If they have dirt, describe it. Do NOT sanitize the character.

2. PIECE-BY-PIECE — EVERY item from the original gets an adapted counterpart:
   - A sleeveless hoodie → a sleeveless top of similar cut (still sleeveless, still same neckline style if it has a hood describe a hood or similar collar)
   - Cargo shorts → shorts with similar pocket details and length
   - Arm wraps → arm accessories in similar placement
   - Combat boots → heavy-duty footwear
   - Belt → belt of similar style

3. PRESERVE THE FLAVOR — this is the most important rule:
   - If the original is GRITTY and BATTLE-WORN, the adapted version is ALSO gritty and battle-worn. A torn military hoodie becomes a WORN, FADED golf vest with fraying edges — not a crisp new one.
   - If the original has DISTRESSED fabric, torn edges, stains, the adapted version has the SAME level of distressing and wear.
   - The color palette must stay in the SAME FAMILY — olive/brown/earth tones stay olive/brown/earth tones.
   - The overall MOOD (dark, rugged, hard-lived) must carry through completely.
   - A battle-scarred military veteran at a golf course should look like a battle-scarred military veteran at a golf course — NOT like a clean golf model.

4. WRONG (do NOT do this):
   ✗ Clean, pristine, new-looking clothing when the original is worn and distressed
   ✗ Changing the character's apparent age, build, or physical condition
   ✗ Removing scars, blood, dirt, or weathering from the person
   ✗ Creating a generic outfit for the new context that shares nothing with the original
   ✗ Sanitizing or "cleaning up" the character

5. If Production Style directors are listed, apply their sensibility to the adapted pieces' aesthetic details.

6. STRICTLY enforce any HARD CONSTRAINTS — those items must NOT appear.

Now describe this character head-to-toe. Start with the person's physical appearance (kept identical), then describe each adapted clothing piece:

`;
}

/**
 * Build an attribute extraction prefix that reinforces the reimagination.
 */
export function buildContextAttrExtractionPrefix(ctx: ContextLensInput): string {
  const parts = formatContextSections(ctx);
  if (parts.length === 0) return '';

  return `\n\n⚠️ REIMAGINATION CONTEXT — the description above is a REIMAGINED version of the character. Each clothing piece was adapted from the original image through this creative lens:\n${parts.join('\n')}\nExtract attributes from the REIMAGINED description as written. Every clothing item should reflect an adaptation of the original, not a generic outfit. Do NOT revert to the original image's clothing. The adapted clothing IS the correct clothing.`;
}

const SYNTH_JSON_SCHEMA = `
Return ONLY valid JSON matching this exact schema:
{
  "identity": { "age": string, "race": string, "gender": string, "build": string },
  "description": string (2-4 sentences of rich, specific prose),
  "attributes": {
    [key: string]: string (clothing/gear fields — same keys as input)
  }
}

Return ONLY JSON. No markdown fences, no explanatory text.`;

const CONTEXT_SYNTH_PROMPT = `You are a character design synthesizer. Your job is to take raw character data and creative direction, then ADAPT the character's outfit piece-by-piece to fit the new creative vision while staying clearly derived from the original.

You will receive:
1. RAW CHARACTER DATA — the base identity, description, and clothing/gear attributes. These are your SOURCE MATERIAL — each piece must be adapted, not discarded.
2. CREATIVE DIRECTION — from context nodes (character bible, costume direction, fashion fusion, environment, constraints)

ADAPTATION RULES:
- For EVERY clothing/gear attribute in the raw data, output an ADAPTED version for the new context.
- Each adapted piece must be CLEARLY DERIVED from the original:
  - Same garment category (a hoodie → a polo/vest, not pants)
  - Same color family or deliberate evolution (olive military → deep olive golf)
  - Same energy/mood translated (battle-worn military → rugged upscale athletic)
  - Construction details inspired by the original (stencil text → embroidered text, cargo pockets → pocket details)
- Do NOT create a generic outfit for the new context. If the Bible says "golfer" and the raw data shows military gear, output golf clothing that clearly evolved FROM the military gear — same colors, same silhouette proportions, same level of wear/distressing.
- If Production Style directors are listed (e.g. Tim Burton), apply their aesthetic to HOW each piece is adapted.
- Costume Direction color palettes and styles refine the adaptation further.
- Style Fusion blend weights dictate the aesthetic split — respect the percentages.
- Environment Placement sets the scene context.
- STRICTLY enforce Preservation Lock constraints — any "MUST AVOID" items must NOT appear.
- Preserve core identity (age, race, gender, build) unless the Bible explicitly says otherwise.
- Be HYPER-SPECIFIC about materials, colors, construction details for every adapted piece.
${SYNTH_JSON_SCHEMA}`;

export async function synthesizeContextLens(
  rawIdentity: CharacterIdentity,
  rawAttributes: CharacterAttributes,
  rawDescription: string,
  context: ContextLensInput,
): Promise<ContextLensSynthesis> {
  const { generateText } = await import('./imageGenApi');

  const sections: string[] = [];

  sections.push('## RAW CHARACTER DATA');
  sections.push(`Identity: ${[rawIdentity.age, rawIdentity.race, rawIdentity.gender, rawIdentity.build].filter(Boolean).join(', ') || 'not specified'}`);
  if (rawDescription.trim()) sections.push(`Description: ${rawDescription.trim()}`);

  const attrLines: string[] = [];
  for (const g of ATTRIBUTE_GROUPS) {
    const val = rawAttributes[g.key]?.trim();
    if (val && val.toLowerCase() !== 'none') attrLines.push(`  ${g.label}: ${val}`);
  }
  if (attrLines.length) sections.push(`Clothing & Gear:\n${attrLines.join('\n')}`);

  sections.push('\n## CREATIVE DIRECTION');

  if (context.bibleContext?.trim()) {
    sections.push(`### Character Bible\n${context.bibleContext.trim()}`);
  }
  if (context.costumeBrief?.trim()) {
    sections.push(`### Costume Direction\n${context.costumeBrief.trim()}`);
  }
  if (context.fusionBrief?.trim()) {
    sections.push(`### Fashion Fusion\n${context.fusionBrief.trim()}`);
  }
  if (context.envBrief?.trim()) {
    sections.push(`### Environment & Placement\n${context.envBrief.trim()}`);
  }
  if (context.lockConstraints?.trim()) {
    sections.push(`### Hard Constraints (MANDATORY — violation is failure)\n${context.lockConstraints.trim()}`);
  }

  const fullPrompt = CONTEXT_SYNTH_PROMPT + '\n\n' + sections.join('\n\n');

  const raw = await generateText(fullPrompt);

  try {
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    const match = jsonStr.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : jsonStr);

    const identity: CharacterIdentity = {
      age: parsed.identity?.age || rawIdentity.age,
      race: parsed.identity?.race || rawIdentity.race,
      gender: parsed.identity?.gender || rawIdentity.gender,
      build: parsed.identity?.build || rawIdentity.build,
    };

    const attributes: CharacterAttributes = { ...rawAttributes };
    if (parsed.attributes && typeof parsed.attributes === 'object') {
      for (const key of Object.keys(parsed.attributes)) {
        if (typeof parsed.attributes[key] === 'string' && parsed.attributes[key].trim()) {
          attributes[key] = parsed.attributes[key];
        }
      }
    }

    const description = typeof parsed.description === 'string' && parsed.description.trim()
      ? parsed.description.trim()
      : rawDescription;

    return { identity, attributes, description };
  } catch {
    return { identity: rawIdentity, attributes: rawAttributes, description: rawDescription };
  }
}
