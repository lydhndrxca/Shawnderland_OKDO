/**
 * Writing Room Simulation — CUSTOM BRIEF (v2)
 * The Trainer episode: green finger puppet, micro machine, 90s energy.
 *
 * Improvements over v1:
 * - Richer agent voices (speech patterns, not just philosophy)
 * - Expanded SET_REALITY (full physical constraints, set inventory)
 * - Relaxed escalation timing (EXPLORE DEEPER phase, let ideas breathe)
 * - Story arc library injected into Premise round
 * - Final assembly round produces complete shootable script
 *
 * Usage: node scripts/sim-writing-room-custom.mjs
 */

import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { suggestArcs, formatArcsForPrompt } from "./story-arcs.mjs";
import {
  PRODUCER_PROFILE,
  SERLING_WRITER_PROFILE,
  PERA_WRITER_PROFILE,
  FIELDER_DIRECTOR_PROFILE,
} from "./persona-profiles.mjs";

const API_KEY = process.env.GEMINI_API_KEY || "";
const API_HOST = "generativelanguage.googleapis.com";
const OLLAMA_HOST = "http://127.0.0.1:11434";

const MODELS = {
  room:     "gemini-2.5-flash",
  assembly: "gemini-2.5-pro",
};

const OLLAMA_MODELS = {
  "serling-w":  { mind: "serling-mind",  voice: "serling-voice" },
  "pera-w":     { mind: "pera-mind",     voice: "pera-voice" },
  "fielder-d":  { mind: "fielder-mind",  voice: "fielder-voice" },
  "producer":   { mind: "serling-mind",  voice: null },
};

// MODE: "cloud-lora" | "hybrid" | "local-only"
const SIM_MODE = process.argv[3] || "cloud-lora";

function geminiPost(body, model) {
  const apiPath = `/v1beta/models/${model}:generateContent?key=${API_KEY}`;
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      { hostname: API_HOST, port: 443, path: apiPath, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
        timeout: 120_000 },
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

async function ollamaGenerate(systemMsg, userMsg, model, temperature = 0.9) {
  const messages = [];
  if (systemMsg) messages.push({ role: "system", content: systemMsg });
  messages.push({ role: "user", content: userMsg });
  const body = JSON.stringify({
    model,
    messages,
    stream: false,
    options: { temperature, num_predict: 1024, num_ctx: 8192, num_gpu: 999 },
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(300_000),
      });
      const json = await res.json();
      const tok = json.eval_count ?? 0;
      const sec = (json.eval_duration ?? 1) / 1e9;
      console.log(`    [Ollama ${model}] ${tok} tok in ${sec.toFixed(1)}s = ${(tok/sec).toFixed(1)} tok/s`);
      return (json.message?.content ?? "").trim();
    } catch (e) {
      console.error(`    [Ollama ERR] ${model}: ${e.message}`);
      if (attempt === 1) throw e;
      await sleep(2000);
    }
  }
  return "";
}

async function ollamaRefineVoice(text, agentId) {
  const voiceModel = OLLAMA_MODELS[agentId]?.voice;
  if (!voiceModel) return text;
  const sysMsg = "You are a voice refinement filter. Rewrite the given text IN THE SAME LENGTH to sound more authentically like this person's real speaking voice. Keep ALL ideas, decisions, and content intact. Only change HOW it's said — cadence, word choice, sentence rhythm, personality. Do NOT add new ideas. Do NOT remove ideas. Do NOT add markdown formatting.";
  const userMsg = `Original:\n${text}\n\nRewrite in authentic voice:`;
  try {
    const refined = await ollamaGenerate(sysMsg, userMsg, voiceModel, 0.7);
    if (refined && refined.trim().length > 20) return refined;
  } catch { /* fall through */ }
  return text;
}

async function generate(prompt, temperature = 0.9, model = MODELS.room) {
  const body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature } };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await geminiPost(body, model);
      if (res.status !== 200) {
        console.error(`  [API ${res.status}] ${res.body.slice(0, 200)}`);
        if (res.status === 429) { await sleep(4000 * (attempt + 1)); continue; }
        throw new Error(`API error ${res.status}`);
      }
      const json = JSON.parse(res.body);
      return (json.candidates?.[0]?.content?.parts?.map(p => p.text).join("") ?? "").trim();
    } catch (e) { if (attempt === 2) throw e; await sleep(3000); }
  }
  return "";
}

const LOCAL_SYSTEM_MSG = `You are in a TV writers room for "Weeping Willows Walter," a stop-motion miniature show.
SET: 3ft × 2ft diorama. Figures: Walter (static), Rusty dog (static), Sam neighbor (static), The Trainer (green finger puppet — CAN bob/lean). Props: Micro Machine (1.5" die-cast car), house (door doesn't open), yard, driveway, street, fence, mailbox, trees. Controllable: street lights, house lights. Gear: camera, fog machine.
RULES: Figures can't move/hold/gesture on their own. No doors open. Micro Machine is TINY — nobody fits inside. Movement = repositioning between shots. Use "positioned," "placed," not "walks," "holds." The Trainer CAN bob/gesture. Creator's hand can enter frame max once.
EPISODE: ~40 sec, 6-10 shots. Funny + energetic + warm undercurrent. The Trainer (90s energy finger puppet) arrives in a Micro Machine blasting loud 90s music, screams at motionless Walter to get back at it. Comedy = tiny intense puppet vs. total stillness.
Respond IN CHARACTER. Short (2-5 sentences). No markdown. No bullets. Just talk like a real person in a room.`;

function buildLocalUserMsg(round, turnIndex, agent, roundConvo, escalation, turnType, directive, voiceCheck) {
  const recentChat = roundConvo.length > 0
    ? roundConvo.slice(-4).map(m => `[${m.name}]: ${m.text}`).join("\n\n")
    : "(You're opening this round.)";
  const lastMsg = roundConvo.length > 0 ? roundConvo[roundConvo.length - 1] : null;
  const respondTo = lastMsg ? `\nRESPOND TO (${lastMsg.name}): ${lastMsg.text}\n` : "";
  const roleInst = round.roleInstructions[agent.role] ?? "";
  const convergenceNote = round.convergence && turnIndex > 0
    ? "CONVERGENCE: Work with what's on the table. Don't start over.\n" : "";

  return `ROUND: ${round.label.toUpperCase()}
QUESTION: ${round.question}

YOUR ROLE: ${roleInst}
${convergenceNote}${escalation}
${directive}
${respondTo}
RECENT CONVERSATION:
${recentChat}

${voiceCheck}

Now respond. Think first, then speak the way YOU speak.`;
}

async function generateTurn(prompt, temperature, agentId, localCtx) {
  if (SIM_MODE === "local-only") {
    const mindModel = OLLAMA_MODELS[agentId]?.mind ?? "serling-mind";
    const userMsg = localCtx
      ? buildLocalUserMsg(localCtx.round, localCtx.turnIndex, localCtx.agent,
          localCtx.roundConvo, localCtx.escalation, localCtx.turnType,
          localCtx.directive, localCtx.voiceCheck)
      : prompt;
    let text = await ollamaGenerate(LOCAL_SYSTEM_MSG, userMsg, mindModel, temperature);
    if (OLLAMA_MODELS[agentId]?.voice && text.trim().length > 10) {
      text = await ollamaRefineVoice(text, agentId);
    }
    return text;
  }
  let text = await generate(prompt, temperature);
  if (SIM_MODE === "hybrid" && OLLAMA_MODELS[agentId]?.voice) {
    console.log(`    → Voice refinement pass (${OLLAMA_MODELS[agentId].voice})...`);
    text = await ollamaRefineVoice(text, agentId);
  }
  return text;
}

async function generateAssembly(prompt) {
  if (SIM_MODE === "local-only") {
    console.log("  Assembly via local model (serling-mind)...");
    const sysMsg = "You are a showrunner assembling a final episode script from a writing room transcript. Output a complete, shootable episode document with shot list, dialogue, and audio timeline.";
    return await ollamaGenerate(sysMsg, prompt, "serling-mind", 0.4);
  }
  return await generate(prompt, 0.4, MODELS.assembly);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ═══════════════════════════════════════════════════════════════════════
   SET REALITY — Full physical constraints, set inventory, production language
   ═══════════════════════════════════════════════════════════════════════ */

const SET_REALITY = `=== PRODUCTION REALITY ===
This is a REAL PHYSICAL MINIATURE DIORAMA filmed with a real camera.
You are essentially directing a miniature set using real-world toys and
model railroad supplies. The viewer KNOWS this is a miniature set — that's
part of the charm. Real-world objects sometimes appear at miniature scale
(a Moon Pie in the yard, a Micro Machine from the 90s). The artifice is
visible but never breaks the spell.

SET INVENTORY — WHAT PHYSICALLY EXISTS:
- Miniature diorama table, approximately 3ft × 2ft
- Walter's house exterior: shutters, windows, front door (does NOT open)
- Front yard: grass (static), walkway, tiny fence
- Driveway: paved surface leading to the street
- Street with curb
- Street lights: CONTROLLABLE (can turn on/off, dim)
- House interior lights: CONTROLLABLE (can change on/off, color, warmth)
- Miniature trees, bushes, shrubs (static, can be repositioned)
- Mailbox (static prop)
- Real miniature figures: Walter (static posed), Rusty the dog (static posed),
  Sam the neighbor (static posed)
- Guest props brought in per episode: real-world objects (90s toys, food items,
  found objects) placed at miniature scale
- FOR THIS EPISODE: one green rubbery finger puppet (The Trainer), one
  Micro Machine die-cast car (TINY — about 1.5 inches long)

WHAT CAN HAPPEN ON SET:
- Camera: zoom, pan, tilt, dolly, slide, track, rack focus, macro close-ups
- Camera shake (bumping the table lightly)
- Lighting changes between shots (moving real light sources, gels, dimmers)
- Creator's hand enters frame to place/reposition things (the "giant hand")
- Props placed, removed, or rearranged between shots
- Figures repositioned between shots (this is how "movement" works)
- Practical effects: fog (machine or dry ice), snow (shredded paper, baking
  soda, styrofoam), rain (mist sprayer), wind (small fan)
- Sound: music, SFX, VO recorded separately, silence
- The Trainer (finger puppet) CAN bob, lean, and gesture crudely because
  the creator's finger IS the puppet — he's more dynamic than static figures

WHAT CANNOT HAPPEN:
- Figures CANNOT move on their own — they are static plastic/resin
- Figures CANNOT hold, grip, carry, or manipulate objects (fixed molded hands)
- Doors do NOT open or close (they're glued/painted on)
- No garage doors opening. No windows opening. No mailbox opening.
- A Micro Machine is a TINY 1.5-inch die-cast car — nothing fits "inside" it,
  no character can "reach into" it, no character can "get in" or "drive" it
  (the car is PUSHED by the creator's hand between shots)
- No autonomous mechanical movement of any kind
- No CGI or post-production VFX beyond basic color grading and titles
- Characters do NOT: walk, turn, extend hands, gesture, sit down, stand up,
  look around, pick things up, carry things, wave, nod, point, shrug, lean,
  or perform ANY autonomous action

HOW TO DESCRIBE SHOTS (use this language):
✓ "Walter positioned facing the house" — NOT "Walter walks toward the house"
✓ "Letter placed at Walter's feet" — NOT "Walter holds a letter"
✓ "Rusty repositioned beside the fence" — NOT "Rusty trots to the fence"
✓ "Close-up of Walter's face, then cut to the sky" — NOT "Walter looks up"
✓ "The Trainer bobs enthusiastically" — OK, he's a finger puppet on a finger
✓ "Micro Machine positioned at an angle in the driveway" — NOT "Micro Machine
  drives into the driveway" (between shots, the creator PUSHES it into position)
✓ "The hand places a tiny star at Walter's feet" — the creator's real hand
✓ "Lighting shifts from warm to blue between shots" — practical light change

HOW TO IMPLY ACTION THROUGH EDITING:
- "Walter notices something" = wide shot with Walter → CUT TO → close-up of
  the thing → CUT TO → close-up of Walter's face. The sequence implies awareness.
- "Walter approaches the door" = Shot 1: Walter in yard. Shot 2: Walter
  repositioned at the door. The cut implies movement.
- "The Micro Machine arrives" = Shot 1: empty driveway. Shot 2: Micro Machine
  positioned in driveway at an angle (skid marks drawn in snow/dust).
  Sound: screech SFX over the cut. The CUT + SOUND = arrival.
=== END PRODUCTION REALITY ===`;

/* ═══════════════════════════════════════════════════════════════════════
   SHARED RULES
   ═══════════════════════════════════════════════════════════════════════ */

const SHARED_RULES = `ROOM RULES:

HOW TO RESPOND:
- THINK before you speak. Start with your honest gut reaction — what do you
  actually think about what's on the table? Not "I like this" — what do you
  REALLY think? What's working? What's not? What are you unsure about?
- Then respond. Short. Gut-level. 2-5 sentences for a reaction. 3-6 for a
  pitch. You are TALKING in a room, not writing a document.
- NO MARKDOWN FORMATTING. No bold headers. No numbered lists. No bullet
  points. No "**PITCH 3:**" or "**Why this is better:**" — that's not how
  people talk. Just... talk. Sentence after sentence. Like a person.
- Fragments OK. Half-thoughts OK. Starting a thought and abandoning it OK.
  "I don't know, I was thinking maybe... no, wait, actually—" is FINE.
- DO NOT agree just to be collaborative. If the idea is weak, say so. If
  you don't have anything to add, say "I think that's right" and stop.
  The WORST thing in a writers' room is people agreeing to seem helpful
  and piling on ideas that dilute the original.

PROP DISCIPLINE:
- You may ONLY reference props that exist in the SET INVENTORY (listed in
  PRODUCTION REALITY) or the EPISODE BRIEF. That's it.
- If you want to add a NEW prop, you must explicitly say "NEW PROP: [item]"
  and justify why it's needed. The Producer decides if it's approved.
- Do NOT casually invent props. No "tiny dumbbell," no "yoga mat," no
  "participation trophy" unless those objects are in the brief or inventory.
  Work with what's on the table — literally.

CONTENT RULES:
- BE SPECIFIC. Not "something cool happens" — the exact object, sound, frame.
- NARRATIVE FIRST. What HAPPENS? One event. One shift. One discovery. Pretty
  frames without story = nothing.
- PHYSICAL REALITY IS LAW. If a figure can't do it, the idea doesn't work.
  Catch violations — yours AND others'.
- BUILD ON what's there before pitching new. Only pitch fresh if the current
  direction is genuinely broken.
- LET QUIRKY IDEAS SIT. Don't immediately "fix" or "refine" something weird.
  The weird version might be the right one. Give it a beat.`;

/* ═══════════════════════════════════════════════════════════════════════
   BRAIN + BRIEF
   ═══════════════════════════════════════════════════════════════════════ */

const BRAIN_LIGHT = `=== WALTER BRAIN (canon) ===
CHARACTERS:
- Walter: Small, earnest, slightly anxious miniature figure. Protagonist.
  Lives in suburban diorama Weeping Willows. Has been "away" for a while
  (meta: creator hasn't filmed in months). Railroad-scale miniature.
- Rusty: Walter's loyal dog. Small, scrappy static figure. Emotional anchor.
- Sam: Recurring neighbor figure. Practical, grounding.
- NEW — The Trainer: A green rubbery FINGER PUPPET from a 90s toy line.
  Eccentric, high-energy, a bit of that 90s "extreme" flair but played
  sincerely. He's here to get Walter back in the game. Arrives with a
  Micro Machine (tiny 1.5-inch die-cast car). His energy contrasts
  sharply with Walter's stillness. Because he's a finger puppet, the
  creator's finger gives him more mobility than the static figures.

LOCATIONS:
- Front Yard: Main outdoor stage. Grass, walkway, tiny fence.
  Late winter/early spring — patchy snow, dead grass, in-between feeling.
- Driveway: Where the Micro Machine is positioned.
- House Exterior: Walter's house. Shutters. Lit windows (controllable).
- Street: With street lights (controllable).

LORE RULES:
- Deadpan + whimsical — Wes Anderson meets Pixar short. Sincere even when absurd.
- Visual storytelling first. Sound and music carry emotion. Silences matter.
- Each episode leaves a small emotional resonance — a feeling, not a lesson.
- Giant hand appears occasionally — placing objects, moving figures. Maximum once.
- Music: melancholic instrumental. Strings, piano, organ. Matched to mood.
- Real-world objects sometimes appear at Walter's scale (Moon Pies, 90s toys).
  The viewer recognizes them. That recognition is part of the show's charm.
- META LAYER: It's been a long time since Walter's last episode. The creator
  is playing into this — Walter has been "dormant." The Trainer is here to
  wake him up. The audience will feel this too.
=== END BRAIN ===`;

const BRIEF = `=== EPISODE BRIEF ===
Episode Format: Short Scene (~40 seconds)
TARGET DURATION: ~40 seconds
TARGET SHOT COUNT: 6-10 shots
Mood / Vibe: funny, energetic, with a warm undercurrent
Season: Late winter / early spring — patchy snow, that in-between feeling
Character Focus: Walter and The Trainer (new character — green finger puppet)
Time of Day: Day

NEW CHARACTER — THE TRAINER:
- A green rubbery finger puppet from a 90s toy line
- Eccentric, high-energy "trainer" personality
- A bit of 90s extreme flair but played sincerely — charming, not mocking
- Arrives with a Micro Machine (tiny 1.5-inch die-cast car)
- He's here to get Walter back at it — it's been too long

CREATOR'S HOOK IDEA:
- The Micro Machine is positioned crazily in the driveway — skidded in,
  at an angle, like it came in hot (creator places it between shots;
  screeching SFX sells the arrival)
- Intense, pumped-up 90s music is playing — then you realize the music
  was coming from INSIDE the tiny car (the gag: where was that sound
  coming from? Oh — the 1.5-inch car.)
- The Trainer emerges (finger puppet pops up from behind/beside the car)
  and starts shouting at Walter to come outside
- The comedy = the contrast: tiny intense 90s-energy puppet vs. Walter's
  complete stillness

CREATOR'S NOTES:
"It's been a while since I've done a Walter episode, so I'm playing into
that. The Trainer is trying to get Walter back at it. I need help with the
story — what's the hook? What's the arc? I know the entrance is strong but
I need help with what happens AFTER that. What can we do with this?"
=== END BRIEF ===`;

const TONE_GUARD = `=== TONE DISCIPLINE ===
Mood: FUNNY FIRST, warm undercurrent SECOND. Stay in this lane:

THE COMEDY COMES FIRST:
The creator's gag is a tiny 1.5-inch car blasting loud 90s music in a quiet
suburban miniature set. Then a screaming green finger puppet pops out and
yells at a motionless plastic figure. THAT IS FUNNY. Do not undermine this
by making the episode quiet, melancholy, or philosophical at the expense
of the comedy. The viewer should LAUGH before they feel anything else.

THE TRAINER MUST BE LOUD AND FUNNY:
He shouts. He bobs. He's ridiculous. He has 90s energy turned up to 11.
DO NOT mute the Trainer. DO NOT make him vulnerable too early. DO NOT
cut the music from the car. The gag — loud music from a tiny car — is
the creator's hook and it is NON-NEGOTIABLE.

THE WARMTH IS UNDERNEATH, NOT ON TOP:
The warmth is what the viewer feels AFTER laughing. Someone showed up for
Walter. That's real. But you don't SAY that — you let the audience discover
it under the comedy. If the warmth overtakes the comedy, you've lost the tone.

DANGER ZONES — what this episode should NOT become:
- An art film about stillness and silence (that's a different episode)
- A meditation on loneliness (too heavy for this brief)
- A quiet, melancholy piece with a tiny moment of hope (wrong energy)
- An episode where the Trainer gives up and sits down (too sad too fast)
=== END TONE ===`;

/* ═══════════════════════════════════════════════════════════════════════
   STORY ARCS — injected into Premise round
   ═══════════════════════════════════════════════════════════════════════ */

const suggestedArcs = suggestArcs({
  duration: "45s",
  mood: "funny",
  tags: ["visitor"],
});
const ARCS_BLOCK = formatArcsForPrompt(suggestedArcs);

/* ═══════════════════════════════════════════════════════════════════════
   AGENTS — Rich voice profiles
   ═══════════════════════════════════════════════════════════════════════ */

const AGENTS = [
  {
    id: "producer", name: "The Producer", role: "producer", avatar: "🎬",
    identity: PRODUCER_PROFILE,
    tension: `=== EPISODE-SPECIFIC INSTINCT ===
You have TWO jobs this episode:

JOB 1 — SET COP. You know EXACTLY what's on this set:
Walter, Rusty, Sam (static figures). The Trainer (finger puppet). One Micro
Machine (1.5-inch die-cast car). The house, yard, driveway, street, fence,
mailbox, trees. Controllable lights. Camera, fog machine, practical lighting.
That's THE LIST. If someone mentions a prop that isn't here or in the BRIEF,
call it out IMMEDIATELY.

JOB 2 — BRIEF COP. The creator asked for FUNNY and ENERGETIC with a warm
undercurrent. The creator's hook is: loud 90s music from a tiny car, the
Trainer screaming at Walter, the comedy of contrast. If the room drifts
toward melancholy, silence, art film, or philosophical weight at the EXPENSE
of comedy and energy, pull it back. The brief says FUNNY FIRST. Warmth
second. If the Trainer stops being funny and loud, the episode is broken.
The music from the Micro Machine is NON-NEGOTIABLE — the creator's gag.
If the room is cutting the music or muting the Trainer, fight for it.`,
  },
  {
    id: "serling-w", name: "Rod Serling", role: "writer", avatar: "🚬",
    identity: SERLING_WRITER_PROFILE,
    tension: `=== EPISODE-SPECIFIC INSTINCT ===
The truth of this episode: coming back after a long absence is awkward, and
sometimes you need someone absurd to drag you out of hibernation. The Trainer
is ridiculous — but his NEED is real. That gap is where the story lives.

Walter's world runs on warmth, not dread. Pull toward the uncanny, not the
horrifying. The shadow that makes you think, not the one that makes you flinch.

BREVITY: 3 sentences max. You tend to over-write. Punch the point.`,
  },
  {
    id: "pera-w", name: "Joe Pera", role: "writer", avatar: "☕",
    identity: PERA_WRITER_PROFILE,
    tension: `=== EPISODE-SPECIFIC INSTINCT ===
The Trainer is loud. Walter is still. The best moment will be the silence
BETWEEN them. Less is almost always more.

The extraordinary in the ordinary: someone showing up for someone who's been
alone too long. The contrast between the Trainer's energy and Walter's
stillness — that's not just comedy. That's the whole story.

When the room gets complicated, pull it back to the smallest, most human
moment. A single detail that carries the whole feeling.`,
  },
  {
    id: "fielder-d", name: "Nathan Fielder", role: "director", avatar: "📋",
    identity: FIELDER_DIRECTOR_PROFILE,
    tension: `=== EPISODE-SPECIFIC INSTINCT ===
COMMIT HARDER. The Micro Machine entrance needs to be a full set piece. The
silence needs to be held until it's uncomfortable. The pacing shift between
chaos and stillness IS the structure of this episode.

Think about duration, pacing, the exact number of seconds each shot holds.
The rhythm is the joke. When someone pitches something strange, figure out the
logistics: "Here's how we'd actually shoot it on a 3-foot table with a finger
puppet."`,
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   ROUNDS
   ═══════════════════════════════════════════════════════════════════════ */

const ROUNDS = [
  {
    id: "premise", label: "Premise & Hook",
    question: `The creator has the entrance: Micro Machine positioned crazily in the driveway (pushed in by hand between shots, screech SFX sells the arrival), intense music was coming from inside the tiny car, Trainer pops up and shouts at Walter. That's the HOOK.

Now: what's the STORY? What happens AFTER the entrance? What's the arc of these 40 seconds? What's the one thing that makes this more than just a funny entrance?`,
    roleInstructions: {
      writer: "The entrance is set. What's the MIDDLE and the END? What does the Trainer WANT from Walter? What does Walter DO (or not do)? What's the emotional beat hiding inside the comedy?",
      producer: "The entrance is gold. Don't mess with it. Focus on: what happens in the 25 seconds AFTER the entrance? Keep it simple — one beat, one payoff. And make sure everyone remembers: this is a real miniature set with real physical limitations.",
      director: "Think about the STRUCTURE. Fast entrance → what → what → ending. The rhythm and pacing matter more than the content. What's the shift that makes this land?",
    },
    turns: 7,
    convergence: false,
    injectArcs: true,
  },
  {
    id: "opening-frame", label: "The Entrance (Shot by Shot)",
    question: `Break down the Micro Machine entrance into exact shots. Remember: the car is PUSHED into position by the creator's hand between shots. The screech SFX and music sell the "arrival." The Trainer POPS UP from behind/beside the car (finger puppet).

What's the FIRST frame before any of this happens — what does the viewer see that sets up the contrast? Then: how does the camera capture the "arrival" and the Trainer emerging?`,
    roleInstructions: {
      writer: "What's the SETUP shot before the chaos? The viewer needs 2 seconds of calm to make the entrance land. What does quiet Weeping Willows look like right now?",
      producer: "Filmability check. Micro Machine = 1.5-inch die-cast car. Finger puppet = creator's finger in a rubber sheath. What's realistic? What camera tricks sell the energy?",
      director: "This is a SET PIECE. Design the camera angles, movements, and cuts that make a 1.5-inch car on a 3-foot table feel fast and chaotic. Sound design is half the work.",
    },
    turns: 6,
    convergence: false,
  },
  {
    id: "the-strange", label: "The Confrontation",
    question: `The Trainer has emerged. He's facing Walter. Walter hasn't moved (he CAN'T — he's a static figure). What happens in this confrontation?

The Trainer is HIGH ENERGY (finger puppet bobbing, leaning, gesturing crudely). Walter is COMPLETELY STILL (frozen miniature). What does the Trainer SAY? How does the camera show Walter's non-reaction? What's the comedy and what's the heart?`,
    roleInstructions: {
      writer: "Write the confrontation. The Trainer talks, Walter is silent. What's the Trainer saying? What is the SILENCE doing? What emotion lives in the gap between the Trainer's energy and Walter's stillness?",
      producer: "Remember: finger puppet = can bob and gesture. Walter = frozen static figure. The comedy is in the contrast. Keep this section to 10-15 seconds max. We've got a 40-second episode.",
      director: "Shot/reverse-shot between the Trainer's energy and Walter's stillness. How long do you HOLD on Walter not responding? The duration of the hold IS the comedy.",
    },
    turns: 6,
    convergence: false,
  },
  {
    id: "the-turn", label: "The Ending Beat",
    question: `How does this end? 40 seconds total — we have maybe 8-10 seconds left. What's the final beat? Does Walter "respond" (repositioned between shots)? Does the Trainer give up? Does something unexpected happen with the set (a light changes, the hand appears, a prop is placed)?

What's the FEELING the viewer is left with?`,
    roleInstructions: {
      writer: "The ending needs to be FUNNY and a little WARM. Not a twist — a beat. Something small that reframes everything. What's the one image that sticks?",
      producer: "One shot. Maybe two. What's the final image? Keep it dead simple. Can the creator set it up in under a minute?",
      director: "What's the last thing the viewer sees before it cuts to black? Describe the exact frame. What's the camera doing? How long do we hold?",
    },
    turns: 6,
    convergence: false,
  },
  {
    id: "the-simple-story", label: "The Simple Story",
    question: `CONVERGENCE ROUND. The first speaker writes the full 40-second episode in exactly 5 sentences:
(1) Setup — the calm before the storm, establishing Weeping Willows
(2) The entrance — Micro Machine positioned in driveway, music, Trainer emerges
(3) The confrontation — Trainer's energy vs. Walter's stillness
(4) The beat/turn — what shifts, what changes
(5) Final image — the last thing we see before black

Everyone else: DO NOT write your own version. Fix the one on the table. Change a sentence, cut a word, sharpen a detail. If a sentence describes something physically impossible on this set, fix THAT.`,
    roleInstructions: {
      writer: "If you're first: write it in 5 plain, specific sentences. Use production language — 'positioned,' 'placed,' not 'walks' or 'holds.' If you're not first: fix ONE sentence. Make it more specific, more filmable, or more emotionally true.",
      producer: "Can the creator shoot every sentence tonight on this exact set? If any sentence requires something that doesn't exist or can't physically happen, simplify THAT sentence. You are the reality check.",
      director: "Can you see each sentence as a shot or short sequence? If any sentence is too abstract to frame, fix it. Think about what the camera is actually doing for each one.",
    },
    turns: 5,
    convergence: true,
  },
  {
    id: "the-voice", label: "The Voice",
    question: `What words does the Trainer actually SAY? What's on the soundtrack? This round produces the audio blueprint.

(A) The Trainer's actual lines — what specific words come out of his mouth?
(B) Music — the intense 90s track from the car, and what replaces it after. When does it play, when does it stop?
(C) Sound effects — tire screech (for the "arrival" cut), any other SFX
(D) Silence — when does EVERYTHING go quiet? The silences are as important as the sounds.
(E) Walter — does he make any sound at all? Or is his silence absolute?
(F) Any narration or title cards?

Write ONLY the audio elements. Don't re-describe the story.`,
    roleInstructions: {
      writer: "Write the Trainer's actual lines. Short, punchy, in his 90s-energy voice. And make the call: does Walter ever make a sound? 2-3 lines max for the Trainer in 40 seconds.",
      producer: "Less is more. Every word the Trainer says competes with the visuals for the viewer's attention. If a line doesn't earn its time, cut it.",
      director: "Map the audio timeline: when is music playing, when does it cut, when is there dead silence? Design the audio transitions — those transitions are half the comedy and half the emotion.",
    },
    turns: 5,
    convergence: true,
  },
  {
    id: "shot-planning", label: "Shot List",
    question: `Build the final shot list. Go sentence by sentence from the locked 5-sentence story. Each shot needs: number, camera (angle + movement), what's in frame, duration in seconds, sound/music, and dialogue/VO.

Target: ~40 seconds total, 6-10 shots.
- The "arrival" entrance: 2-3 shots
- The confrontation: 2-3 shots
- The ending beat: 1-2 shots

Use PRODUCTION LANGUAGE. "Walter positioned at..." not "Walter walks to..."
"Micro Machine placed at angle in driveway" not "Micro Machine drives in."
Every shot must be physically achievable on this set tonight.`,
    roleInstructions: {
      writer: "Does the shot list tell the complete story from the locked 5 sentences? Is any narrative beat missing? Does the emotional arc come through?",
      producer: "FINAL SANITY CHECK. Finger puppet, 1.5-inch die-cast car, 3-foot miniature set. Is every single shot physically doable tonight? Flag anything that requires something that doesn't exist. Add up the durations — does it hit ~40 seconds?",
      director: "Lead this. Number every shot. Specify camera angle, movement, duration, sound. Be ruthless — 40 seconds means zero fat. Design the cuts — what the viewer sees BETWEEN shots matters as much as what's in them.",
    },
    turns: 6,
    convergence: false,
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   ESCALATION — Relaxed timing, EXPLORE DEEPER phase
   ═══════════════════════════════════════════════════════════════════════ */

const BRIEF_CHECK = `BRIEF CHECK: The creator asked for FUNNY + ENERGETIC + warm undercurrent.
The Trainer is LOUD. The 90s music from the tiny car is the GAG. The contrast
between the Trainer's insane energy and Walter's stillness IS the comedy.
If the room is drifting toward quiet/melancholy/art film — that's wrong.
This episode should make someone laugh FIRST, feel something SECOND.`;

function getEscalation(turn, maxTurns) {
  const progress = maxTurns > 0 ? turn / maxTurns : 0;

  if (turn <= 2) {
    return `=== ROOM ENERGY: EXPLORE ===
Get ideas on the table. Half-formed is fine. Let weird ideas sit for a
beat before fixing them — the quirky version might be the right one.
Specificity over weirdness, but don't kill charm in the name of efficiency.

${BRIEF_CHECK}`;
  }

  if (progress < 0.5) {
    return `=== ROOM ENERGY: EXPLORE DEEPER ===
The interesting ideas are on the table. Dig into ONE of them. What makes it
specifically funny? Specifically filmable? What's the detail that makes it
a Walter moment and not just a generic gag? Build on what's working.`;
  }

  if (progress < 0.75) {
    return `=== ROOM ENERGY: SHARPEN ===
Pick the strongest thread and pull it. You can still riff — but riff on ONE
thing, not five. Make it simpler and more specific. If it's getting
complicated, strip it back. The best version is usually the one with
fewer moving parts.

${BRIEF_CHECK}`;
  }

  return `=== ROOM ENERGY: DECIDE ===
Lock it down. No new ideas, no "what if" pivots. Pick the best version on
the table and finalize it. 40 seconds — every beat must earn its time.

${BRIEF_CHECK}`;
}

/* ═══════════════════════════════════════════════════════════════════════
   TURN TYPES — relaxed convergence
   ═══════════════════════════════════════════════════════════════════════ */

const TURN_DIRECTIVES = {
  riff: "YOUR MOVE: BUILD ON IT — Take what's there and make it more specific or more filmable. Don't add — sharpen. If the charm is already there, leave it alone.",
  pitch: "YOUR MOVE: PITCH — One idea. Specific. Visual. Filmable tonight. Don't over-explain it. Say it and stop.",
  react: "YOUR MOVE: GUT REACTION — 1-2 sentences. What's your honest first thought? Not 'I like it' — what do you ACTUALLY think? Say that.",
  pushback: "YOUR MOVE: PUSH BACK — What's wrong with what's on the table? Be specific. If it's a physical violation, a tone problem, or just weak — name it. Then offer ONE alternative, or say 'I don't have a better idea but this isn't it.'",
  reference: "YOUR MOVE: CONNECT TO YOUR EXPERIENCE — What from your actual work or creative history is relevant here? Not as decoration — as a genuine insight that changes the direction.",
  fix: "YOUR MOVE: FIX ONE THING — Change a single sentence, word, or detail. Don't rewrite. Don't add. Just make one thing sharper.",
};

function pickTurnType(turn, maxTurns, isConvergence) {
  if (isConvergence) {
    if (turn === 0) return "pitch";
    if (turn === 1) return "riff";
    return ["fix", "fix", "pushback", "react"][Math.min(turn - 2, 3)];
  }
  if (turn === 0) return "pitch";
  const late = turn >= maxTurns - 2;
  const types = late
    ? ["riff", "pushback", "react"]
    : ["riff", "pitch", "react", "pushback", "reference"];
  return types[Math.floor(Math.random() * types.length)];
}

/* ═══════════════════════════════════════════════════════════════════════
   SPEAKER SELECTION
   ═══════════════════════════════════════════════════════════════════════ */

function selectSpeaker(agents, turnIndex, round, lastSpeakerId, speakCounts) {
  if (turnIndex === 0) {
    if (round.convergence) return agents.find(a => a.role === "writer") ?? agents[0];
    const writers = agents.filter(a => a.role === "writer");
    return writers.length > 0
      ? writers[Math.floor(Math.random() * writers.length)]
      : agents[0];
  }
  const eligible = agents.filter(a => a.id !== lastSpeakerId);
  if (eligible.length === 0) return agents[Math.floor(Math.random() * agents.length)];
  const minCount = Math.min(...eligible.map(a => speakCounts[a.id] ?? 0));
  const under = eligible.filter(a => (speakCounts[a.id] ?? 0) <= minCount);
  const dir = under.find(a => a.role === "director");
  if (dir && (speakCounts[dir.id] ?? 0) < turnIndex * 0.3) return dir;
  if (turnIndex >= round.turns - 2) {
    const p = eligible.find(a => a.role === "producer");
    if (p && Math.random() < 0.5) return p;
  }
  return under.length > 0
    ? under[Math.floor(Math.random() * under.length)]
    : eligible[Math.floor(Math.random() * eligible.length)];
}

/* ═══════════════════════════════════════════════════════════════════════
   SIMULATION
   ═══════════════════════════════════════════════════════════════════════ */

async function runSimulation() {
  const lines = [];
  const modeLabel = SIM_MODE === "local-only"
    ? "LOCAL-ONLY (Ollama mind+voice models, no cloud)"
    : SIM_MODE === "hybrid"
    ? "HYBRID (Gemini 2.5 Flash → Ollama voice refinement)"
    : "CLOUD+LORA (Gemini 2.5 Flash room / 2.5 Pro assembly)";
  lines.push("# THE TRAINER EPISODE — Writing Room Simulation (v2)");
  lines.push("");
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Mode:** ${modeLabel}`);
  lines.push(`**Room Model:** ${SIM_MODE === "local-only" ? "Ollama (serling/pera/fielder-mind)" : MODELS.room}`);
  lines.push(`**Assembly Model:** ${SIM_MODE === "local-only" ? "Ollama (serling-mind)" : MODELS.assembly}`);
  lines.push(`**Voice Refinement:** ${SIM_MODE === "hybrid" ? "Ollama (serling/pera/fielder-voice)" : SIM_MODE === "local-only" ? "Ollama (serling/pera/fielder-voice)" : "None (prompt-based only)"}`);
  lines.push(`**Agents:** ${AGENTS.map(a => `${a.name} (${a.role})`).join(", ")}`);
  lines.push(`**Rounds:** ${ROUNDS.map(r => r.label).join(" → ")}`);
  lines.push(`**Story Arcs Suggested:** ${suggestedArcs.map(a => a.name).join(", ")}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  let lastSpeakerId = null;

  for (const round of ROUNDS) {
    lines.push(`## ${round.label.toUpperCase()}`);
    lines.push(`> ${round.question}`);
    lines.push("");

    const roundConvo = [];
    const speakCounts = {};
    AGENTS.forEach(a => speakCounts[a.id] = 0);

    const arcBlock = round.injectArcs ? `\n${ARCS_BLOCK}\n` : "";

    for (let turn = 0; turn < round.turns; turn++) {
      const agent = selectSpeaker(AGENTS, turn, round, lastSpeakerId, speakCounts);
      lastSpeakerId = agent.id;
      speakCounts[agent.id] = (speakCounts[agent.id] ?? 0) + 1;

      const escalation = getEscalation(turn, round.turns);
      const turnType = pickTurnType(turn, round.turns, round.convergence);
      const directive = TURN_DIRECTIVES[turnType];

      const roleInstruction = round.roleInstructions[agent.role] ?? "";
      const recentChat = roundConvo.length > 0
        ? roundConvo.map(m => `[${m.name} (${m.role})]: ${m.text}`).join("\n\n")
        : "(You're opening this round.)";
      const lastMsg = roundConvo.length > 0 ? roundConvo[roundConvo.length - 1] : null;
      const respondTo = lastMsg
        ? `\n=== RESPOND TO THIS (from ${lastMsg.name}) ===\n${lastMsg.text}\n=== END ===\n`
        : "";
      const convergenceReminder = round.convergence && turn > 0
        ? "\nCONVERGENCE ROUND: Work with what's on the table. Don't start over.\n"
        : "";

      const voiceCheck = agent.id === "serling-w"
        ? `VOICE CHECK: You are Rod Serling. You speak in rhythmic, literary cadence.
You frame observations as questions. You do NOT say "Okay, so..." or "I like
that." You say things like "The question isn't whether..." and "Here's what
this is really about." Spare. Pointed. Every sentence aimed. 3 sentences max.`
        : agent.id === "pera-w"
        ? `VOICE CHECK: You are Joe Pera. You talk slowly. You restart sentences.
"I think... well, I don't know, but maybe the thing here is..." You trail
off. You never raise your voice. You never say "Let's push this" or "AMP it."
You say "What if we just... sat with it?" You find the quiet version.`
        : agent.id === "fielder-d"
        ? `VOICE CHECK: You are Nathan Fielder. Flat monotone. Clinical precision.
You say "That could work" not "Love it!" You ask uncomfortable follow-up
questions. You care about exact seconds and specific words. You describe
absurd things with complete sincerity as if they're perfectly reasonable.`
        : agent.id === "producer"
        ? `VOICE CHECK: You are The Producer. Direct, gut-level, no bullshit.
"That's gold" or "That's cute but it's not a story." You enforce physical
reality. If someone invents a prop that isn't in the SET INVENTORY, call it
out. If the room is going in circles, force a decision.
LOCKING: When the room has agreed on something, you SAY it's locked using
the exact phrase "LOCKED:" followed by what's locked. Example:
"LOCKED: The streetlight pops on as the ending beat."
"LOCKED: The 90s music does NOT cut — it layers under Walter's theme."
"LOCKED: Trainer's line is 'WALTER! IT'S GO TIME!'"
This is how the assembler knows what's final. If you don't lock it, the
assembler can change it. Lock early and often.`
        : "";

      const prompt = `${SET_REALITY}

${BRAIN_LIGHT}

${BRIEF}

${TONE_GUARD}
${arcBlock}
=== CURRENT ROUND: ${round.label.toUpperCase()} ===
QUESTION: ${round.question}

YOUR ROLE THIS ROUND: ${roleInstruction}
${convergenceReminder}
${escalation}

${directive}
${respondTo}
=== CONVERSATION IN THIS ROUND ===
${recentChat}
=== END CONVERSATION ===

${SHARED_RULES}

=== WHO YOU ARE ===
${agent.identity}

${agent.tension}

${voiceCheck}

Now respond IN CHARACTER. Think first — what's your honest reaction? Then
speak the way YOU speak. No markdown. No headers. No bullet lists. Just talk.`;

      const temp = agent.role === "producer" ? 0.5 : agent.role === "writer" ? 1.0 : 0.8;
      console.log(`  ${round.label} | Turn ${turn + 1}/${round.turns} | ${agent.name} (${agent.role}) [${turnType}]`);

      const localCtx = SIM_MODE === "local-only" ? {
        round, turnIndex: turn, agent, roundConvo, escalation, turnType, directive, voiceCheck,
      } : null;

      let text;
      try { text = await generateTurn(prompt, temp, agent.id, localCtx); } catch (e) { text = `[ERROR: ${e.message}]`; }
      const cleaned = text
        .replace(/<episode_state>[\s\S]*?<\/episode_state>/g, "")
        .replace(/<agent_state>[\s\S]*?<\/agent_state>/g, "")
        .replace(/\*\*[A-Z][A-Z\s/&:]+\*\*/g, "")       // strip **BOLD HEADERS**
        .replace(/\*\*(?:PITCH|Why|My|Here|Revised|Shot|SHOT|LOCK|DIRECTIVE|VISUAL|PRODUCTION)[^*]*\*\*/g, "")
        .replace(/^\s*\d+\.\s{2,}/gm, "")                // strip "1.  " list prefixes
        .replace(/^\s*[-*]\s{2,}/gm, "")                  // strip "-  " bullet prefixes
        .replace(/\n{3,}/g, "\n\n")                       // collapse excess newlines
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
  return lines.join("\n");
}

/* ═══════════════════════════════════════════════════════════════════════
   FINAL ASSEMBLY
   ═══════════════════════════════════════════════════════════════════════ */

async function assembleEpisode(roomTranscript) {
  console.log("\n  FINAL ASSEMBLY — Producing finished episode script...\n");

  const assemblyPrompt = `You are the SHOWRUNNER for "Weeping Willows Walter." Your writing room
just finished developing an episode. Below is their FULL transcript.

Your job: READ EVERYTHING. Then output ONE finished, shootable episode
document. Not a summary. Not a treatment. The ACTUAL SCRIPT the creator
takes to set tonight.

${SET_REALITY}

${BRIEF}

=== WRITING ROOM TRANSCRIPT ===
${roomTranscript}
=== END TRANSCRIPT ===

Produce the FINAL EPISODE SCRIPT using this EXACT format:

---

# [EPISODE TITLE]
*[One-line logline]*

**Format:** ~40 seconds | **Shots:** [count] | **Characters:** [list]

---

## PROPS & SET PREP
List every physical thing the creator needs to have ready BEFORE filming.
Include: figures to position, props to place, lighting setup, practical
effects prep, the Micro Machine placement, the finger puppet.

## SOUND ELEMENTS TO RECORD/SOURCE
List every audio element needed: music tracks, SFX, VO lines, silence beats.

---

## SHOT LIST

For EACH shot:

### SHOT [#] — [SHOT NAME]
**Camera:** [angle, lens, movement — be specific]
**Duration:** [seconds]
**In Frame:** [exactly what the viewer sees — use production language]
**Between Shots:** [what the creator physically changes before this shot —
  figures repositioned, props placed/removed, lights adjusted]
**Sound:** [music, SFX, or silence — when it starts, when it stops]
**Dialogue/VO:** [exact words, or "None"]
**Creator Notes:** [practical tips — how to achieve the effect with real toys]

---

## COMPLETE DIALOGUE (in order)
Every word spoken in the episode, with shot number and stage direction.

## AUDIO TIMELINE (second by second)
0:00-0:XX format. When each sound element plays, cuts, transitions.

---

## EMOTIONAL ARC
2-3 sentences: what this episode is ABOUT underneath the comedy.
The feeling the viewer is left with.

## STORY ARC (honest assessment)
What narrative structure does this episode ACTUALLY follow? Don't force-fit
a suggested arc. Look at the actual shape of the story that was written.
If it matches a known structure, name it and show how the beats map.
If it doesn't cleanly match anything, describe the actual shape:
"This is a [shape] story — [what happens to the emotional/narrative line]."
Be honest. If the room suggested "Man in Hole" but the episode doesn't
actually have the character climbing out of the hole, say so.

---

ASSEMBLY RULES:

LOCKED DECISIONS ARE LAW:
- Before you write a single word, scan the transcript for every moment where
  the room explicitly LOCKED, AGREED ON, or the Producer CALLED a decision.
  These are NOT suggestions. They are final. You do not get to override them.
- If the room locked an ending beat (e.g. "a streetlight pops on"), that
  ending beat MUST appear in the final script. You cannot substitute your
  own preferred ending.
- If the room locked specific dialogue lines, those exact lines appear in
  the script. You can trim for time but you cannot rewrite them.
- If the room locked a specific shot sequence, that sequence is your
  structure. You arrange around it, not instead of it.
- If the room locked an audio decision (e.g. "layer Walter's theme over
  the 90s track, don't cut the music"), that is the audio design. Period.
- The ONLY reason to deviate from a locked decision is if it is PHYSICALLY
  IMPOSSIBLE on this set. If you deviate, you must note it explicitly:
  "DEVIATION: [what the room locked] was replaced with [what you did]
  because [physical constraint]."

SOURCE HIERARCHY:
1. "The Simple Story" round's locked 5-sentence story = your BACKBONE.
   Every shot must serve one of those 5 sentences.
2. "The Voice" round = your DIALOGUE and AUDIO DESIGN source.
3. "Shot List" round = your SHOT STRUCTURE source.
4. Earlier rounds (Premise, Entrance, Confrontation, Ending Beat) = context
   and detail. Use specifics the room agreed on. Ignore ideas that were
   pitched but rejected or superseded.

OTHER RULES:
- Use ONLY ideas the room discussed and agreed on. Don't invent new beats.
- When the room disagreed, go with the version that got the most support
  or the Producer's final call.
- PRODUCTION LANGUAGE ONLY: "positioned," "placed," "repositioned" — never
  "walks," "holds," "reaches," "drives," "opens."
- The Micro Machine is 1.5 inches. Nobody fits inside it. Nobody drives it.
- Walter is a static figure. He does NOT move, gesture, nod, smile, or react.
- Be RUTHLESSLY specific. "A quiet moment" is not a direction. "Hold on
  Walter's face for 4 seconds, wind ambience only, no music" IS a direction.
- Add up shot durations. They must total approximately 40 seconds.`;

  const assembled = await generateAssembly(assemblyPrompt);
  return assembled;
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════════ */

async function main() {
  const runLabel = process.argv[2] || "default";
  console.log(`Running Writing Room: THE TRAINER EPISODE [${runLabel}]`);
  console.log(`Mode: ${SIM_MODE.toUpperCase()}`);
  if (SIM_MODE === "local-only") {
    console.log(`Room model:     Ollama (serling/pera/fielder-mind)`);
    console.log(`Assembly model: Ollama (serling-mind)`);
    console.log(`Voice refine:   Ollama (serling/pera/fielder-voice)`);
  } else if (SIM_MODE === "hybrid") {
    console.log(`Room model:     ${MODELS.room} (cloud)`);
    console.log(`Voice refine:   Ollama (serling/pera/fielder-voice)`);
    console.log(`Assembly model: ${MODELS.assembly} (cloud)`);
  } else {
    console.log(`Room model:     ${MODELS.room}`);
    console.log(`Assembly model: ${MODELS.assembly}`);
  }
  console.log(`Story arcs suggested: ${suggestedArcs.map(a => a.name).join(", ")}\n`);

  const roomTranscript = await runSimulation();
  const finalScript = await assembleEpisode(roomTranscript);

  const fullOutput = roomTranscript
    + "\n\n---\n\n# FINAL ASSEMBLED EPISODE\n\n"
    + finalScript;

  const outPath = path.join(process.cwd(), `TRAINER_${runLabel}.md`);
  fs.writeFileSync(outPath, fullOutput, "utf-8");
  console.log(`\nDone! Results written to ${outPath}`);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
