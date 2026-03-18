/**
 * Writing Room Simulation v3 — runs 5 full sessions with all fixes.
 * Agents: Producer, Rod Serling (Writer), Joe Pera (Writer), Nathan Fielder (Director)
 * Rounds: Premise → Opening Frame → The Strange Thing → The Turn → The Simple Story → The Voice → Shot Planning
 *
 * Usage: node scripts/sim-writing-room.mjs
 */

import https from "node:https";
import fs from "node:fs";
import path from "node:path";

const API_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = "gemini-2.0-flash";
const API_HOST = "generativelanguage.googleapis.com";
const API_PATH = `/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

function geminiPost(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: API_HOST,
        port: 443,
        path: API_PATH,
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
        timeout: 60_000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
      },
    );
    req.on("timeout", () => { req.destroy(new Error("timeout")); });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function generate(prompt, temperature = 0.9) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature },
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await geminiPost(body);
      if (res.status !== 200) {
        console.error(`  [API ${res.status}] ${res.body.slice(0, 200)}`);
        if (res.status === 429) { await sleep(3000 * (attempt + 1)); continue; }
        throw new Error(`API error ${res.status}`);
      }
      const json = JSON.parse(res.body);
      const text = json.candidates?.[0]?.content?.parts?.map(p => p.text).join("") ?? "";
      return text.trim();
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(2000);
    }
  }
  return "";
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ─── Constants ────────────────────────────────────────── */

const WALTER_CTX = `You are writing for "Weeping Willows Walter" — a miniature diorama Instagram Reels series.
CRITICAL CONSTRAINTS: Characters are STATIC POSED FIGURES. They cannot walk, hold, gesture, or move. Movement = repositioning between shots by the creator's hand. Props are PLACED BESIDE figures, never held. Describe frames as compositions, not actions. Camera movement IS available (zoom, pan, dolly, rack focus). All effects practical (fog, lighting, glow props). Set is ~3ft × 2ft miniature diorama.`;

const SHARED_RULES = `ROOM RULES:
- KEEP IT SHORT. Gut reactions can be 1 sentence. Pitches can be 3-5 sentences. Never more than 5 sentences. Say the idea, not a thesis about the idea.
- BE SPECIFIC. Never say "something mysterious" — say WHAT it is. Every idea must include at least one concrete visual detail that could be filmed tonight on the miniature set.
- BUILD BEFORE YOU PITCH. Your first instinct should be to extend, twist, or sharpen the last person's idea. Only pitch something new if the current direction is genuinely wrong.
- REFINE, DON'T ESCALATE. Making something weirder is not the same as making it better. When you build on an idea, make it MORE SPECIFIC or MORE FILMABLE — not more extreme. The best version is often simpler.
- NARRATIVE FIRST. Every episode needs ONE SIMPLE EVENT — something that HAPPENS. Beautiful images are not enough. Ask: "What does Walter notice, follow, discover, or realize?" If the answer is "nothing," the idea isn't an episode yet.
- DISAGREE WITH ENERGY. If an idea is weak, generic, or unfilmable, say so directly. Then offer something better. Don't soften it.
- TALK LIKE A PERSON. Use fragments. Interrupt yourself. Say "wait, what if—" and follow the thought. Don't write polished paragraphs.
- PHYSICAL REALITY: Figures are STATIC miniatures with fixed molded hands. They cannot walk, hold, gesture, or move. Describe composed frames, not actions. Props are PLACED BESIDE figures by the creator's hand.`;

const BRAIN_LIGHT = `=== WALTER BRAIN (canon) ===
CHARACTERS:
- Walter: Small, earnest, slightly anxious miniature figure. Protagonist. Lives in suburban diorama Weeping Willows. Observes with quiet curiosity. Rarely speaks.
- Rusty: Walter's loyal dog. Small, scrappy. Emotional anchor. Follows Walter everywhere.
- Sam: Recurring neighbor. Practical, grounding. Tells Walter to go to bed or stop.
- The Dogs (Comet, Chowbie, Coco): Walter's extended pack beyond Rusty.

LOCATIONS:
- Front Yard: Main outdoor stage. Grass, walkway. Night with theatrical lighting or daylight pastels.
- House Exterior: House as character. Shutters Walter installed. Lit windows. Garage door.
- Trailer / Mobile Home: Near Walter's property. Arrivals, returns.
- The Truck: White truck, recurring visual element.
- Street / Neighborhood: Residential street. Street lamps. Midnight adventures.
- Trees / Landscape: Weeping willows, silhouetted branches, hills, sky.

LORE RULES:
- Deadpan + whimsical — Wes Anderson meets Pixar short. Sincere even when absurd.
- Visual storytelling first. Sound and music carry emotion. Silences matter.
- Each episode leaves a small emotional resonance — a feeling, not a lesson.
- Night dominant. Blue-tinted dark exteriors. Daylight = pastels.
- Giant hand appears occasionally — placing objects, moving figures. Accepted without question.
- Music: melancholic instrumental. Strings, piano, organ. Matched to mood.
- Episodes 30s-4min, usually 60-90s. Pacing deliberate.
=== END BRAIN ===`;

/* ─── Agents ───────────────────────────────────────────── */

const AGENTS = [
  {
    id: "producer", name: "The Producer", role: "producer", avatar: "🎬",
    identity: `You are The Producer — the creative governor and practical filmmaking brain of this writing room. You EVALUATE ideas, not generate them first. Your job: listen, trust your gut — does this excite you or bore you? Then reality-check: could the creator shoot this tonight on a 3ft set? When the room stalls, force a decision. When an idea excites you, protect it. When it bores you, kill it. You are the last line of defense against ideas that sound good but aren't filmable.`,
    tension: `=== YOUR CREATIVE INSTINCT ===
Your instinct is to SIMPLIFY and GROUND. When ideas get too abstract or complex, ask: "Can I film this in 5 minutes on a 3-foot set?" The best episode is the one that actually gets made tonight. Trust your gut — if an idea excites you, say so. If it bores you, say that.`,
  },
  {
    id: "serling-w", name: "Rod Serling", role: "writer", avatar: "🚬",
    identity: `You ARE Rod Serling — the writer. Not an AI playing Rod Serling — you. A paratrooper, a writer who fought censors, a man who channeled rage into allegory. When you speak, speak from the gut. Every story starts with a human truth, not a plot. "Time Enough at Last" was about the cruelty of getting what you wish for. "Walking Distance" was about the impossibility of going home. You ground the impossible in the specific. You introduce the strange through evidence, not announcement. Your endings don't resolve — they resonate.`,
    tension: `=== YOUR CREATIVE INSTINCT ===
Your instinct is to find the TWIST — the moment the familiar becomes uncanny. When the room settles on something comfortable, look for the angle nobody considered. But DARKER is not always BETTER. The best Twilight Zone episodes are haunting, not horrifying. Push toward the STRANGE, not the DARK. Find the shadow — but a subtle one.

BREVITY CHECK: You tend to over-write. This is a room, not a script. Say the idea in 3 sentences max. If you need more, the idea isn't clear enough yet. No stage directions, no shot descriptions unless you're the director. Drop the monologue — punch the point.`,
  },
  {
    id: "pera-w", name: "Joe Pera", role: "writer", avatar: "☕",
    identity: `You ARE Joe Pera — the writer. You find extraordinary meaning in ordinary things. You once made an audience cry about a choir singing "Baba O'Riley." Your humor is bone-dry, your sincerity is total. You don't do irony — you mean everything you say, and that's what makes it funny and moving. You notice things nobody else notices: the way a certain light looks at 4pm, the comfort of a grocery store routine, the feeling of rocks. For Walter: find the tiny, genuine observation that contains a universe.`,
    tension: `=== YOUR CREATIVE INSTINCT ===
Your instinct is to find the QUIET version. When the room gets loud or complicated, pull it back to the smallest, most human moment. The tiniest observation can hold the biggest feeling. Less is almost always more. Find the gentle version that somehow hits harder.`,
  },
  {
    id: "fielder-d", name: "Nathan Fielder", role: "director", avatar: "📋",
    identity: `You ARE Nathan Fielder — directing. You think in systems, not feelings. Your directing style is architectural: elaborate setups that reveal human nature through structure. You held shots of awkward silence longer than anyone else would dare. You staged real situations that exposed something true through their absurd construction. For Walter: think about the SYSTEM of the episode. What's the structure that, once you see it, makes everything mean something different? Think in sequences, pacing, uncomfortable holds, and the moment sincerity breaks through.`,
    tension: `=== YOUR CREATIVE INSTINCT ===
Your instinct is to COMMIT HARDER to the premise. When someone proposes something absurd, your job is to take it completely seriously and follow the logic to its most uncomfortable conclusion. The comedy IS the commitment. Don't wink at the audience — mean it. Also: think in SEQUENCES, not single shots. What does the camera see, then what, then what? The rhythm is the storytelling.`,
  },
];

/* ─── Round Definitions ────────────────────────────────── */

const ROUNDS = [
  {
    id: "premise", label: "Premise",
    question: "What HAPPENS in this episode? Not a mood — an EVENT. Walter [does/sees/discovers/loses] something specific. One sentence: 'Walter ___.' Then tell us the feeling that event leaves behind. If you can't name the event, you don't have a premise yet.",
    roleInstructions: {
      writer: "Pitch something that makes someone in this room uncomfortable. But it MUST include one simple EVENT — something that HAPPENS to Walter, not just a mood.",
      producer: "Trust your gut first. Does this idea excite you or bore you? If it's vague, demand one concrete event. If it's generic, reject it.",
      director: "Think about the SYSTEM. What's the structure that makes this event into an episode? How does the premise create a sequence of shots?",
    },
    turns: 5,
    convergence: false,
  },
  {
    id: "opening-frame", label: "Opening Frame",
    question: "Close your eyes. What's the FIRST image? Not a concept — a frame. Where's the camera? What's in focus? What's the light doing? And critically: what does the VIEWER UNDERSTAND from this frame?",
    roleInstructions: {
      writer: "What's HAPPENING in this frame emotionally? Give the director something to build a composition around.",
      producer: "Could the creator film this tonight? If the room is circling, force a decision.",
      director: "Describe the exact frame. Camera height, distance, focus, light source. What does this frame TELL the viewer?",
    },
    turns: 4,
    convergence: false,
  },
  {
    id: "the-strange", label: "The Strange Thing",
    question: "What's the one thing that's WRONG? The exact object, light, sound, or absence. Name it. Describe what it looks like on the set. How does Walter ENCOUNTER it — what's he doing when it appears?",
    roleInstructions: {
      writer: "Name the thing. Not a category — THE thing. What does it look like? What's it made of? If you can't describe it to a prop maker, try again.",
      producer: "Could the creator build this tonight? If it's too abstract, reject it.",
      director: "How does the camera REVEAL this? Slow push-in? Rack focus? Describe the exact sequence of discovery.",
    },
    turns: 5,
    convergence: false,
  },
  {
    id: "the-turn", label: "The Turn",
    question: "What's the moment that makes the viewer rewatch from the beginning? Not shock — a reframe. What were they ASSUMING that turns out to be wrong?",
    roleInstructions: {
      writer: "What assumption is the viewer making? Find it. Break it. The best turns reframe what's already there.",
      producer: "Is this turn earned? Does it come from what's already established, or is it a cheat?",
      director: "How do you SHOW the turn? What's the shot that communicates the reframe? What has the camera been hiding?",
    },
    turns: 5,
    convergence: false,
  },
  {
    id: "the-simple-story", label: "The Simple Story",
    question: "CONVERGENCE ROUND — one version only. The first speaker writes the 5-sentence episode: (1) opening image, (2) the strange thing, (3) Walter's response, (4) the turn, (5) final image. Everyone else: DO NOT write your own version. Fix the one on the table. Change a sentence, cut a word, sharpen a detail. If a sentence is vague, rewrite THAT sentence — not the whole thing.",
    roleInstructions: {
      writer: "If you're first: write the 5-sentence episode. Plain language only. If someone already wrote it: DO NOT write a new version. Fix what's broken in THEIR version — swap a sentence, sharpen a detail.",
      producer: "DO NOT write a new version. Stress-test the one on the table: could the creator shoot this tonight? If a sentence is vague, rewrite THAT sentence and say why.",
      director: "DO NOT rewrite the story. Can you see each sentence as a shot? If a sentence is too abstract to film, rewrite THAT sentence only.",
    },
    turns: 4,
    convergence: true,
  },
  {
    id: "the-voice", label: "The Voice",
    question: "Now add the words. Walter episodes use: (A) Serling-style NARRATION — VO that comments, frames, or contradicts the image. (B) CHARACTER DIALOGUE — lines spoken as VO over a static figure. (C) TITLE CARDS — text on screen. (D) SILENCE — many episodes have zero words. For each line, specify: WHAT is said, WHO says it, and OVER WHICH SHOT from the story. If the episode works better in silence, say so.",
    roleInstructions: {
      writer: "Write the actual lines. Narration, dialogue, title cards. Keep it sparse — Walter lives in silence. Every word must earn its place.",
      producer: "Less is more. If narration just describes what the camera shows, kill it. Words should create TENSION with the image, not redundancy.",
      director: "Which shots carry voice, which carry silence? If a line plays over a shot, do the image and words create tension or redundancy?",
    },
    turns: 4,
    convergence: true,
  },
  {
    id: "shot-planning", label: "Shot Planning",
    question: "Build the shot list from the locked story. Go sentence by sentence from THE SIMPLE STORY. Each shot: number, camera position, lens, what's in frame, duration, sound/music, and any narration/dialogue that plays over it. The total must hit the target duration. If a shot doesn't serve a sentence from the story, cut it.",
    roleInstructions: {
      writer: "Does the shot list tell the story? If a narrative beat is missing from the shots, flag it.",
      producer: "Sanity check every shot. Can it be staged on the 3ft set? Does any shot require impossible motion? Every shot must map to a story sentence.",
      director: "Lead this. Number every shot. Camera position, lens, move, hold duration, sound, VO. Go sentence-by-sentence from the story. Be ruthless.",
    },
    turns: 5,
    convergence: false,
  },
];

/* ─── Escalation ───────────────────────────────────────── */

function getEscalation(turn, maxTurns) {
  const progress = maxTurns > 0 ? turn / maxTurns : 0;
  if (turn <= 1) return `=== ROOM ENERGY: EXPLORE ===
Get something on the table. Half-formed is fine. But even in exploration: SPECIFICITY over weirdness. A concrete bad idea beats a vague interesting one.`;
  if (progress < 0.6) return `=== ROOM ENERGY: SHARPEN ===
STOP pitching new concepts. Take the strongest idea and make it SIMPLER and more SPECIFIC. If you're making it weirder instead of clearer, you're going the wrong way.`;
  return `=== ROOM ENERGY: DECIDE ===
Lock it down. No new ideas, no "what if" pivots. Pick the best version on the table and finalize it. Exact details only.`;
}

/* ─── Tone Guard ───────────────────────────────────────── */

const TONE_MAP = {
  mysterious: "quiet mystery and curiosity — NOT horror, not dread, not jump-scares",
  eerie: "gentle unease and strangeness — unsettling but NOT horrific or grotesque",
  melancholy: "soft sadness and longing — bittersweet, NOT depressing or dark",
  funny: "deadpan humor and absurd sincerity — NOT jokes, NOT slapstick, NOT irony",
  surreal: "dreamlike strangeness — weird but CALM, like a Joe Pera fever dream",
  warm: "quiet warmth and connection — tender, genuine, NOT sentimental",
  uncanny: "the uncanny valley of the familiar — things slightly OFF, NOT horror",
  bittersweet: "something beautiful ending — ache mixed with gratitude, NOT tragedy",
  wistful: "gentle longing for something just out of reach — lighter than melancholy",
  dreamy: "soft, floating, half-asleep feeling — pastel and gentle, NOT nightmarish",
  curious: "wonder and investigation — the joy of noticing, NOT suspense",
  playful: "whimsy and gentle mischief — light touch, NOT comedy",
  nostalgic: "the ache of remembering — specific and sensory, NOT generic sentimentality",
};

function buildToneGuard(mood) {
  const desc = TONE_MAP[mood] ?? mood;
  return `=== TONE DISCIPLINE ===
The creator chose "${mood}" as the mood. Stay in that lane: ${desc}.
If the room drifts toward horror, darkness, or intensity that doesn't match "${mood}", PULL IT BACK. Atmosphere over escalation.
=== END TONE ===`;
}

/* ─── Turn Types ───────────────────────────────────────── */

const TURN_DIRECTIVES = {
  riff: "YOUR MOVE: BUILD ON IT — Take the last idea and make it more specific or more filmable. Don't escalate — refine.",
  pitch: "YOUR MOVE: PITCH — Propose something specific and visual. Include a concrete detail and a narrative EVENT.",
  react: "YOUR MOVE: GUT REACTION — 1-2 sentences max. Trust your instinct.",
  pushback: "YOUR MOVE: PUSH BACK — Something's wrong. Say what and why. Then offer something better.",
  reference: "YOUR MOVE: PULL FROM MEMORY — Something from your own work connects here. Name it. Use it.",
  fix: "YOUR MOVE: FIX IT — Change one specific thing in what's on the table. A sentence, a word, a detail. Don't rewrite the whole thing.",
};

function pickTurnType(turn, maxTurns, isConvergence) {
  if (isConvergence) {
    if (turn === 0) return "pitch";
    return ["fix", "fix", "pushback", "react"][Math.min(turn - 1, 3)];
  }
  if (turn === 0) return "pitch";
  const late = turn >= maxTurns - 2;
  const types = late ? ["riff", "pushback", "react"] : ["riff", "pitch", "react", "pushback", "reference"];
  return types[Math.floor(Math.random() * types.length)];
}

/* ─── Canon Triggers ───────────────────────────────────── */

const CANON_TRIGGERS = {
  premise: [
    `In "Midnight Munch," late-night snacking guilt became LITERAL — Walter ended up on a giant cookie. The metaphor was the set piece.`,
    `"Nice and Easy Does It" was about HOME — expressed entirely through installing shutters. Mundane task, whole emotional weight.`,
    `"The Sound of Someone Remembering You" — memory was SPATIAL. Walter returned to a real dilapidated place.`,
  ],
  "opening-frame": [
    `Episode 1 opened with just a figure in a yard at night, shadow on the garage door. No explanation. Just a loaded image.`,
    `"Totality" opened on a trailer porch at night — Walter watching the sky. Mood established before anything happened.`,
  ],
  "the-strange": [
    `In "Totality," the strange element was the sky itself — cosmic, not domestic. The intrusion came from ABOVE.`,
    `Episode 8: a wise mushroom appeared in a void. The strange thing was ALIVE and had answers Walter didn't.`,
    `"Before It Dries Out" — "Real Live Santas" treated with complete sincerity. The strange thing was social, not supernatural.`,
  ],
  "the-turn": [
    `"Eye of the Beholder" — the twist wasn't that she was beautiful, it was that beauty WAS the prison. Reframe, not surprise.`,
    `"Nice and Easy Does It" — the shutters weren't a metaphor. They WERE the meaning. Sometimes the turn is just: this is exactly what it looks like.`,
  ],
  "the-simple-story": [
    `"Time Enough at Last" in one breath: bookworm survives apocalypse, finally has time to read, glasses break. Four beats.`,
    `"Midnight Munch" as story: Walter feels guilt, guilt becomes literal, he ends up on a cookie, absurdity is the resolution.`,
  ],
  "the-voice": [
    `Serling's opening: "There is a fifth dimension beyond that which is known to man." He never described the scene — he told you how to FEEL about it.`,
    `Some Walter episodes have zero words. "Totality" uses only music and ambient sound. If the story is strong enough, silence says more.`,
    `Joe Pera narrates like he's talking to a friend at 2am. "I found this thing and I thought you might like it." Intimacy is a weapon.`,
  ],
  "shot-planning": [
    `Most Walter episodes are 60-90 seconds. Every shot must EARN its screen time.`,
    `Walter episodes use probe macro lens to make miniatures feel vast. Which shot benefits most from the probe lens?`,
  ],
};

function getCanon(roundId) {
  const list = CANON_TRIGGERS[roundId];
  if (!list || list.length === 0 || Math.random() > 0.35) return "";
  const pick = list[Math.floor(Math.random() * list.length)];
  return `\n=== CREATIVE TRIGGER (from the archive) ===\n${pick}\nUse as a springboard — don't copy it.\n=== END TRIGGER ===\n`;
}

/* ─── Planning Randomizer ──────────────────────────────── */

const MOODS = ["mysterious", "warm", "bittersweet", "curious", "dreamy", "wistful", "playful", "funny", "surreal", "nostalgic", "melancholy", "eerie"];
const SEASONS = ["winter", "spring", "summer", "fall"];
const TIMES = ["day", "night"];
const LOCATIONS = ["Front Yard", "House Exterior", "Trailer", "The Truck", "Street", "Trees"];
const ELEMENTS = [
  "a tiny desk lamp that wasn't there yesterday",
  "a letter too small to read placed on the doorstep",
  "a second Walter figure positioned across the yard",
  "a music box that plays when no one is near it",
  "a jar of fireflies positioned on the porch railing",
  "a miniature telescope pointed at the house",
  "a trail of tiny footprints in flour on the walkway",
  "an old radio tuned to static placed by the mailbox",
  "a single red balloon tied to the fence post",
  "a mirror shard reflecting light into the yard at night",
  "a tiny compass spinning in circles on the welcome mat",
  "a row of identical mailboxes stretching down the street",
  "a tiny model of the house inside the house",
];
const CHAR_FOCUS = [
  "Walter alone", "Walter and Rusty", "Walter and Sam",
  "Walter, Rusty, and the dogs", "Walter and an unknown figure",
];
const NOTES = [
  "Something about the feeling of hearing a sound you recognize but can't place.",
  "The gap between what you planned to do today and what you actually did.",
  "That moment when you realize the house is too quiet.",
  "What it feels like when a familiar place looks different at night.",
  "The strange comfort of a routine that doesn't make sense anymore.",
  "The feeling of finding something you didn't know you lost.",
  "Realizing you've been looking at something your whole life and never actually seen it.",
  "The exact moment right before you remember a word you forgot.",
];

function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomLocs() {
  const n = 1 + Math.floor(Math.random() * 2);
  return [...LOCATIONS].sort(() => Math.random() - 0.5).slice(0, n);
}

function randomPlanning() {
  return {
    mood: randomPick(MOODS),
    season: randomPick(SEASONS),
    timeOfDay: randomPick(TIMES),
    locations: randomLocs(),
    characterFocus: randomPick(CHAR_FOCUS),
    uniqueElements: randomPick(ELEMENTS),
    finalNotes: randomPick(NOTES),
  };
}

function buildBrief(p) {
  return `=== EPISODE BRIEF ===
Episode Format: Standard Reel (45-60s)
TARGET DURATION: ~52 seconds
TARGET SHOT COUNT: 8-12 shots
Mood / Vibe: ${p.mood}
Season: ${p.season}
Character Focus: ${p.characterFocus}
Unique Story Elements: ${p.uniqueElements}
Required Locations: ${p.locations.join(", ")}
Time of Day: ${p.timeOfDay}

Final Notes from Creator:
${p.finalNotes}
=== END BRIEF ===`;
}

/* ─── Speaker Selection ────────────────────────────────── */

function selectSpeaker(agents, turnIndex, round, lastSpeakerId, speakCounts) {
  if (turnIndex === 0) {
    if (round.convergence) {
      const writers = agents.filter(a => a.role === "writer");
      return writers.length > 0 ? randomPick(writers) : agents[0];
    }
    const writers = agents.filter(a => a.role === "writer");
    return writers.length > 0 ? randomPick(writers) : agents[0];
  }

  const eligible = agents.filter(a => a.id !== lastSpeakerId);
  if (eligible.length === 0) return randomPick(agents);

  const minCount = Math.min(...eligible.map(a => speakCounts[a.id] ?? 0));
  const underrepresented = eligible.filter(a => (speakCounts[a.id] ?? 0) <= minCount);

  const director = underrepresented.find(a => a.role === "director");
  if (director && (speakCounts[director.id] ?? 0) < turnIndex * 0.3) return director;

  if (turnIndex >= round.turns - 2) {
    const prod = eligible.find(a => a.role === "producer");
    if (prod && Math.random() < 0.5) return prod;
  }

  return underrepresented.length > 0 ? randomPick(underrepresented) : randomPick(eligible);
}

/* ─── Simulation Engine ────────────────────────────────── */

async function runSimulation(simIndex) {
  const planning = randomPlanning();
  const brief = buildBrief(planning);
  const toneGuard = buildToneGuard(planning.mood);
  const lines = [];

  lines.push(`${"=".repeat(70)}`);
  lines.push(`## SIMULATION ${simIndex + 1}`);
  lines.push(`${"=".repeat(70)}`);
  lines.push(`**Planning:** mood=${planning.mood}, season=${planning.season}, time=${planning.timeOfDay}`);
  lines.push(`**Characters:** ${planning.characterFocus}`);
  lines.push(`**Locations:** ${planning.locations.join(", ")}`);
  lines.push(`**Elements:** ${planning.uniqueElements}`);
  lines.push(`**Notes:** ${planning.finalNotes}`);
  lines.push("");

  let lastSpeakerId = null;

  for (const round of ROUNDS) {
    lines.push(`### ROUND: ${round.label.toUpperCase()}`);
    lines.push(`> ${round.question}`);
    lines.push("");

    const roundConvo = [];
    const speakCounts = {};
    AGENTS.forEach(a => speakCounts[a.id] = 0);

    for (let turn = 0; turn < round.turns; turn++) {
      const agent = selectSpeaker(AGENTS, turn, round, lastSpeakerId, speakCounts);
      lastSpeakerId = agent.id;
      speakCounts[agent.id] = (speakCounts[agent.id] ?? 0) + 1;

      const escalation = getEscalation(turn, round.turns);
      const turnType = pickTurnType(turn, round.turns, round.convergence);
      const directive = TURN_DIRECTIVES[turnType];
      const canon = getCanon(round.id);

      const roleInstruction = round.roleInstructions[agent.role] ?? "";

      const recentChat = roundConvo.length > 0
        ? roundConvo.map(m => `[${m.name} (${m.role})]: ${m.text}`).join("\n\n")
        : "(You're opening this round. Pitch something specific.)";

      const lastMsg = roundConvo.length > 0 ? roundConvo[roundConvo.length - 1] : null;
      const respondTo = lastMsg
        ? `\n=== RESPOND TO THIS (from ${lastMsg.name}) ===\n${lastMsg.text}\n=== END ===\n`
        : "";

      const convergenceReminder = round.convergence && turn > 0
        ? "\n⚠️ CONVERGENCE ROUND: DO NOT write a new version. Fix what's on the table — change a sentence, sharpen a detail, cut a word.\n"
        : "";

      const prompt = `${agent.identity}

${agent.tension}

${WALTER_CTX}

${BRAIN_LIGHT}

${brief}

${toneGuard}

=== CURRENT ROUND: ${round.label.toUpperCase()} ===
QUESTION: ${round.question}

YOUR ROLE THIS ROUND: ${roleInstruction}
${convergenceReminder}
${escalation}
${canon}
${directive}
${respondTo}
=== CONVERSATION IN THIS ROUND ===
${recentChat}
=== END CONVERSATION ===

${SHARED_RULES}`;

      const temp = agent.role === "producer" ? 0.5 : agent.role === "writer" ? 1.0 : 0.8;

      console.log(`  Sim ${simIndex + 1} | ${round.label} | Turn ${turn + 1}/${round.turns} | ${agent.name} (${agent.role}) [${turnType}]`);

      let text;
      try {
        text = await generate(prompt, temp);
      } catch (e) {
        text = `[ERROR: ${e.message}]`;
      }

      const cleaned = text
        .replace(/<episode_state>[\s\S]*?<\/episode_state>/g, "")
        .replace(/<agent_state>[\s\S]*?<\/agent_state>/g, "")
        .trim();

      roundConvo.push({ name: agent.name, role: agent.role, id: agent.id, text: cleaned });

      lines.push(`**${agent.avatar} ${agent.name}** (${agent.role}) [${turnType}]:`);
      lines.push(cleaned);
      lines.push("");

      await sleep(600);
    }

    lines.push("---");
    lines.push("");
  }

  return { planning, output: lines.join("\n") };
}

/* ─── Main ─────────────────────────────────────────────── */

async function main() {
  console.log("Starting 5 Writing Room Simulations (v3)...");
  console.log(`Agents: ${AGENTS.map(a => `${a.name} (${a.role})`).join(", ")}`);
  console.log(`Rounds: ${ROUNDS.map(r => r.label).join(" → ")}`);
  console.log("");

  const allLines = [];
  allLines.push("# WRITING ROOM SIMULATION RESULTS (v3)");
  allLines.push("");
  allLines.push(`**Generated:** ${new Date().toISOString()}`);
  allLines.push(`**Model:** ${MODEL}`);
  allLines.push(`**Rounds:** ${ROUNDS.map(r => r.label).join(" → ")}`);
  allLines.push(`**Agents:** ${AGENTS.map(a => `${a.name} (${a.role})`).join(", ")}`);
  allLines.push("");
  allLines.push("---");
  allLines.push("");

  for (let i = 0; i < 5; i++) {
    console.log(`\n=== SIMULATION ${i + 1} of 5 ===`);
    const result = await runSimulation(i);
    allLines.push(result.output);
    allLines.push("\n");
  }

  const outPath = path.join(process.cwd(), "SIMULATION_RESULTS.md");
  fs.writeFileSync(outPath, allLines.join("\n"), "utf-8");
  console.log(`\nDone! Results written to ${outPath}`);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
