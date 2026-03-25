/**
 * Story Arc Library for Walter Writing Room
 *
 * Real narrative structures used by real writers, directors, and filmmakers.
 * Adapted for micro-format (15s–90s) but rooted in actual craft.
 *
 * Sources: Freytag, Syd Field, Robert McKee, Blake Snyder, Dan Harmon,
 * Rod Serling, Vonnegut, Kishōtenketsu, AIDA, Aristotle, Chekhov, and
 * working short-film / commercial structures.
 */

// ─── FOUNDATIONAL STRUCTURES ────────────────────────────────────────
// These are the real frameworks writers and directors actually think in.

export const FOUNDATIONAL_ARCS = [
  {
    id: "three-act",
    name: "Three-Act Structure (Syd Field)",
    category: "foundational",
    source: "Syd Field — Screenplay: The Foundations of Screenwriting (1979)",
    description: "The backbone of all Western dramatic storytelling. Setup (25%) → Confrontation (50%) → Resolution (25%). Two plot points pivot the action. Every working screenwriter thinks in this structure even when breaking it.",
    durations: ["30s", "45s", "60s", "90s"],
    beats: [
      { order: 1, label: "Setup", description: "Introduce the world, the character, the status quo. End with an inciting incident that disrupts everything." },
      { order: 2, label: "Plot Point 1", description: "A specific event that spins the story into a new direction. The real story begins here." },
      { order: 3, label: "Confrontation", description: "The character faces obstacles, tries to restore balance or achieve a goal. Rising tension." },
      { order: 4, label: "Midpoint", description: "A shift — new information, a reversal, a raise in stakes. The character can't go back." },
      { order: 5, label: "Plot Point 2", description: "The final complication that forces the climax." },
      { order: 6, label: "Resolution", description: "The climax and its aftermath. Something has changed irrevocably." },
    ],
    microAdaptation: "At 40 seconds: Setup = 1-2 shots (5-8s). PP1 = one cut. Confrontation = 2-3 shots (15-20s). Resolution = 1-2 shots (8-10s). Skip the midpoint — it's too short. The two plot points are just two clean cuts that change direction.",
  },
  {
    id: "freytag-pyramid",
    name: "Freytag's Pyramid",
    category: "foundational",
    source: "Gustav Freytag — Die Technik des Dramas (1863)",
    description: "The original dramatic arc: Exposition → Rising Action → Climax → Falling Action → Denouement. Designed for tragedy. The climax is the PEAK, and everything after is the consequence. This is the shape of 'something builds to a breaking point.'",
    durations: ["45s", "60s", "90s"],
    beats: [
      { order: 1, label: "Exposition", description: "Introduce the world. Establish the norm." },
      { order: 2, label: "Rising Action", description: "Tension escalates. Each beat raises the stakes." },
      { order: 3, label: "Climax", description: "The peak moment. The point of no return." },
      { order: 4, label: "Falling Action", description: "The consequences begin. Tension recedes but meaning deepens." },
      { order: 5, label: "Denouement", description: "Resolution. The new normal. What's left." },
    ],
    microAdaptation: "At 40 seconds: Compress to Exposition (1 shot) → Rising (2 shots) → Climax (1 shot) → Denouement (1 shot). Cut falling action entirely — let the climax BE the ending, or let one beat of silence serve as both falling action and resolution.",
  },
  {
    id: "harmon-circle",
    name: "Dan Harmon's Story Circle",
    category: "foundational",
    source: "Dan Harmon — Channel 101 / Community / Rick and Morty",
    description: "Joseph Campbell's Hero's Journey compressed to 8 steps in a circle. The character leaves comfort, enters chaos, gets what they wanted, pays a price, returns changed. The circle means the ending mirrors the beginning — but different. Harmon calls it 'a kind of hacky attempt to distill Campbell down to almost a kind of math.'",
    durations: ["45s", "60s", "90s"],
    beats: [
      { order: 1, label: "Comfort Zone", description: "A character in their familiar world." },
      { order: 2, label: "Want", description: "They want something. A need, a desire, a lack." },
      { order: 3, label: "Unfamiliar Situation", description: "They enter new territory. The rules change." },
      { order: 4, label: "Adapt", description: "They struggle. They try. They face the new reality." },
      { order: 5, label: "Get What They Wanted", description: "They achieve the goal — or seem to." },
      { order: 6, label: "Pay the Price", description: "It costs something. The victory is complicated." },
      { order: 7, label: "Return", description: "They go back to the familiar world." },
      { order: 8, label: "Changed", description: "Same place, different person. The comfort zone is reframed." },
    ],
    microAdaptation: "At 40 seconds: Collapse to 4 beats — Comfort (1 shot) → Want + Unfamiliar (2 shots) → Pay the Price (1 shot) → Changed (1 shot). The circle still works because the last shot mirrors the first. Design the opening and closing frames as the same composition with one difference.",
  },
  {
    id: "save-the-cat",
    name: "Save the Cat (Blake Snyder Beat Sheet)",
    category: "foundational",
    source: "Blake Snyder — Save the Cat! (2005)",
    description: "15 beats that drive commercial film structure. The key insight: make the audience CARE about the character in the first beat (the 'save the cat' moment) before putting them through anything. Empathy first, then conflict.",
    durations: ["60s", "90s"],
    beats: [
      { order: 1, label: "Opening Image", description: "A visual that sets tone and shows the 'before' state." },
      { order: 2, label: "Theme Stated", description: "Someone says (or the image implies) what the story is really about." },
      { order: 3, label: "Setup", description: "The world, the character, the status quo." },
      { order: 4, label: "Catalyst", description: "The inciting incident. Life changes." },
      { order: 5, label: "Debate", description: "The character resists the change." },
      { order: 6, label: "Break Into Two", description: "The character commits. The old world is left behind." },
      { order: 7, label: "B Story", description: "A secondary thread that carries the theme." },
      { order: 8, label: "Fun and Games", description: "The promise of the premise. Why the audience showed up." },
      { order: 9, label: "Midpoint", description: "Stakes raise. False victory or false defeat." },
      { order: 10, label: "Bad Guys Close In", description: "Opposition intensifies." },
      { order: 11, label: "All Is Lost", description: "The lowest point." },
      { order: 12, label: "Dark Night of the Soul", description: "The character sits with the loss." },
      { order: 13, label: "Break Into Three", description: "A new idea or realization sparks the finale." },
      { order: 14, label: "Finale", description: "The character applies what they've learned." },
      { order: 15, label: "Final Image", description: "The 'after' state. Mirrors the opening image, but changed." },
    ],
    microAdaptation: "At 40 seconds: Use only Opening Image → Catalyst → Fun and Games → All Is Lost → Final Image. Five beats, five shots. The opening and closing images MUST mirror each other. 'Save the cat' becomes: show Walter doing something small and endearing in the first 3 seconds.",
  },
  {
    id: "mckee-values",
    name: "McKee's Value Shift",
    category: "foundational",
    source: "Robert McKee — Story: Substance, Structure, Style (1997)",
    description: "McKee's core principle: every scene must TURN A VALUE. A value is a quality of human experience (hope/despair, connection/isolation, safety/danger) that flips from positive to negative or vice versa. If a scene doesn't turn a value, it's a non-event. For micro-format: the whole episode is ONE value turn.",
    durations: ["15s", "30s", "45s", "60s", "90s"],
    beats: [
      { order: 1, label: "Value Positive", description: "Establish the current state of the value. Show it clearly." },
      { order: 2, label: "The Inciting Incident", description: "Something happens that threatens to flip the value." },
      { order: 3, label: "Progressive Complications", description: "The threat intensifies. The value shifts further." },
      { order: 4, label: "The Turn", description: "The value flips. What was positive is now negative (or vice versa)." },
    ],
    microAdaptation: "At 40 seconds: Pick ONE value (isolation → connection, silence → noise, stillness → disruption). Show the starting state in shot 1. Flip it by the last shot. The entire episode is one value turning. McKee would say: if you can name the value and its flip, you have a story. If you can't, you don't.",
  },
  {
    id: "vonnegut-man-in-hole",
    name: "Vonnegut's 'Man in Hole'",
    category: "foundational",
    source: "Kurt Vonnegut — rejected anthropology thesis, University of Chicago (1947)",
    description: "The most commercially successful story shape ever identified. A character starts okay, falls into trouble, climbs back out. Vonnegut: 'People LOVE that story. They never get sick of it.' Cornell research confirmed it: highest average box office of any narrative shape across 6,147 scripts.",
    durations: ["30s", "45s", "60s", "90s"],
    beats: [
      { order: 1, label: "Okay", description: "Character is in a stable state. Not great, not terrible. Normal." },
      { order: 2, label: "The Hole", description: "Something goes wrong. The character's fortune drops." },
      { order: 3, label: "The Climb", description: "The character works to get out. Struggle, effort, adaptation." },
      { order: 4, label: "Out (Better)", description: "The character emerges — ideally in a better state than they started." },
    ],
    microAdaptation: "At 40 seconds: Okay (1 shot, 5s) → The Hole (1-2 shots, 10-15s) → The Climb (1-2 shots, 10-15s) → Out (1 shot, 5-10s). The beauty is simplicity. You can FEEL this shape even in 15 seconds.",
  },
  {
    id: "vonnegut-bad-to-worse",
    name: "Vonnegut's 'From Bad to Worse'",
    category: "foundational",
    source: "Kurt Vonnegut — story shapes lecture",
    description: "Vonnegut's Kafka shape. Things start bad. They get worse. They keep getting worse. No relief. Vonnegut said this is the most honest shape because 'we can't actually know if life's story has a positive or negative arc.' Dark, but powerful for comedy when played deadpan.",
    durations: ["30s", "45s", "60s"],
    beats: [
      { order: 1, label: "Bad", description: "Things aren't great." },
      { order: 2, label: "Worse", description: "They get worse." },
      { order: 3, label: "Even Worse", description: "They get even worse." },
      { order: 4, label: "Bottom", description: "Rock bottom. The character sits in it. No rescue comes." },
    ],
    microAdaptation: "At 40 seconds: Each beat is a shot. The comedy comes from the rhythm of accumulating disaster and the character's non-reaction. Walter's stillness makes this shape hilarious — things keep getting worse around him and he just... stands there.",
  },
];

// ─── SERLING / TWILIGHT ZONE STRUCTURES ─────────────────────────────
// The actual patterns Serling used across 92 episodes.

export const SERLING_ARCS = [
  {
    id: "serling-formula",
    name: "The Serling Formula",
    category: "serling",
    source: "Rod Serling & Buck Houghton — Twilight Zone production rules (1959-1964)",
    description: "Serling's actual formula: (1) Find an interesting character at a moment of crisis. Get there QUICKLY. (2) Lay on ONE miracle — one impossible thing. Not two. (3) Let the character's response BE the story. (4) The ending reframes everything that came before. This is not 'twist ending' — it's 'the meaning was hiding in plain sight.'",
    durations: ["30s", "45s", "60s", "90s"],
    beats: [
      { order: 1, label: "Character in Crisis", description: "An ordinary person at a specific, relatable breaking point. Not generic — painfully specific." },
      { order: 2, label: "The One Miracle", description: "One impossible thing enters the story. Only one. The audience grants you one suspension of disbelief." },
      { order: 3, label: "The Response", description: "The character reacts. Their response reveals who they really are. This IS the story." },
      { order: 4, label: "The Reframe", description: "The ending reveals what the story was actually about. Not a twist — a completion. Everything before was building this argument." },
    ],
    microAdaptation: "At 40 seconds: Crisis (1 shot, 5s) → Miracle (1-2 shots, 10s) → Response (2 shots, 15s) → Reframe (1 shot, 10s). The 'one miracle' rule is perfect for micro-format. Don't try to be weird twice. Be weird once and let the character sit with it.",
  },
  {
    id: "serling-inversion",
    name: "The Moral Inversion",
    category: "serling",
    source: "Rod Serling — 'Eye of the Beholder,' 'Time Enough at Last,' 'The Monsters Are Due on Maple Street'",
    description: "Serling's signature move. The story presents what appears to be one moral argument, then the final beat reveals the OPPOSITE was true all along. Beauty is the prison. The monster is us. Getting what you wished for is the cruelest punishment. The inversion doesn't just surprise — it makes you reinterpret everything.",
    durations: ["30s", "45s", "60s", "90s"],
    beats: [
      { order: 1, label: "The Apparent Truth", description: "Establish what appears to be the story's moral framework. The audience thinks they know what this is about." },
      { order: 2, label: "Investment", description: "Deepen the apparent truth. Make the audience commit to their interpretation." },
      { order: 3, label: "The Evidence", description: "Small details that don't quite fit — but the audience ignores them because the apparent truth feels solid." },
      { order: 4, label: "The Inversion", description: "One image, one cut, one reveal that flips the moral. The audience's interpretation was wrong. The OPPOSITE was true." },
    ],
    microAdaptation: "At 40 seconds: Apparent truth (2 shots, 10s) → Investment (1-2 shots, 15s) → Inversion (1 shot, held long, 15s). The inversion shot should be held LONGER than any other shot in the episode. Let the audience sit with the flip.",
  },
  {
    id: "serling-quiet-intrusion",
    name: "The Quiet Intrusion",
    category: "serling",
    source: "Rod Serling — 'Walking Distance,' 'A Stop at Willoughby,' 'The Invaders'",
    description: "Something enters the ordinary world. Not with a bang — with wrongness. A town that looks too much like your childhood. A hitchhiker who keeps appearing. The intrusion is quiet, almost gentle, and that's what makes it unsettling. The character doesn't scream 'THIS IS IMPOSSIBLE' — they're confused, then curious, then desperate.",
    durations: ["30s", "45s", "60s", "90s"],
    beats: [
      { order: 1, label: "The Ordinary (Specific)", description: "Establish the normal world with painful specificity. Not 'a man in a town' — 'Martin Sloan, age 36, VP of media.'" },
      { order: 2, label: "The Wrongness", description: "Something is off. Not dramatic — just wrong. A detail that shouldn't be there." },
      { order: 3, label: "Investigation", description: "The character engages with the wrongness. Curiosity, then confusion, then unease." },
      { order: 4, label: "The Implication", description: "The wrongness reveals something true about the character's condition. Not a resolution — an understanding." },
    ],
    microAdaptation: "At 40 seconds: Ordinary (1 shot, 5s) → Wrongness (1 shot, 5s) → Investigation (2 shots, 15s) → Implication (1 shot, held, 15s). The wrongness should be visible in the first two shots but not the FOCUS. On rewatch, it's obvious.",
  },
];

// ─── NON-WESTERN / ALTERNATIVE STRUCTURES ───────────────────────────

export const ALTERNATIVE_ARCS = [
  {
    id: "kishotenketsu",
    name: "Kishōtenketsu",
    category: "alternative",
    source: "Chinese four-line poetry (qǐchéngzhuǎnhé), adapted across Japanese, Korean, Vietnamese storytelling. Fan Heng (1272-1330).",
    description: "Four-act structure with NO CONFLICT required. Introduction → Development → Twist (a surprising new element) → Reconciliation. The twist doesn't create conflict — it creates CONTRAST. The audience reconciles two things that don't obviously fit together. Used in manga, Nintendo game design, and slice-of-life anime. Perfect for Walter's contemplative tone.",
    durations: ["30s", "45s", "60s", "90s"],
    beats: [
      { order: 1, label: "Ki (Introduction)", description: "Establish the character and setting simply." },
      { order: 2, label: "Shō (Development)", description: "Deepen the scene. Add texture, a second detail, a sense of the world." },
      { order: 3, label: "Ten (Twist/Contrast)", description: "An unexpected element appears. Not conflict — surprise. Something that doesn't obviously belong, but isn't hostile." },
      { order: 4, label: "Ketsu (Reconciliation)", description: "The original scene and the new element coexist. The audience reconciles them into a new understanding." },
    ],
    microAdaptation: "At 40 seconds: 4 shots, one per beat, roughly equal duration. The Ten (twist) should be visually surprising but tonally gentle. Kishōtenketsu is the antidote to 'every story needs conflict.' Some stories just need two things that don't obviously go together.",
  },
  {
    id: "jo-ha-kyu",
    name: "Jo-Ha-Kyū",
    category: "alternative",
    source: "Zeami Motokiyo — Noh theater (14th century Japan)",
    description: "A pacing structure, not a plot structure. Jo (slow introduction) → Ha (breaking/development, increasing pace) → Kyū (rapid climax, then sudden stop). The key insight: stories should ACCELERATE, not maintain constant pace. Start slow, build faster, end abruptly. The abruptness of the ending creates resonance.",
    durations: ["15s", "30s", "45s", "60s", "90s"],
    beats: [
      { order: 1, label: "Jo (Slow)", description: "Begin slowly. Establish tone and space. Let the audience settle in." },
      { order: 2, label: "Ha (Accelerate)", description: "The pace increases. Shots get shorter. Energy builds. New elements enter." },
      { order: 3, label: "Kyū (Sudden Stop)", description: "The climax arrives fast, then everything STOPS. The abrupt ending hangs in the air." },
    ],
    microAdaptation: "At 40 seconds: Jo = 1 long shot (10-15s). Ha = 3-4 short shots (15-20s, getting shorter). Kyū = 1 shot, held in silence (5-10s). The acceleration makes 40 seconds feel like a journey. The sudden stop makes the audience's brain keep running after the video ends.",
  },
];

// ─── COMMERCIAL / ADVERTISING STRUCTURES ────────────────────────────
// These are designed for EXACTLY the runtime Walter works in.

export const COMMERCIAL_ARCS = [
  {
    id: "aida",
    name: "AIDA",
    category: "commercial",
    source: "Elias St. Elmo Lewis (1898). The oldest advertising framework still in use.",
    description: "Attention → Interest → Desire → Action. Designed for persuasion in 15-60 seconds. The first 2-3 seconds MUST grab attention. The middle builds interest and want. The end compels response. Not just for selling products — this is the architecture of every viral video.",
    durations: ["15s", "30s", "45s", "60s"],
    beats: [
      { order: 1, label: "Attention (0-3s)", description: "Stop the scroll. Something visually arresting, confusing, or beautiful in the FIRST FRAME." },
      { order: 2, label: "Interest (3-15s)", description: "Build on the hook. Add context. The viewer stays because they need to understand what they're seeing." },
      { order: 3, label: "Desire (15-30s)", description: "The emotional pull. The viewer WANTS something — an answer, a resolution, a feeling." },
      { order: 4, label: "Action (final)", description: "The payoff. In advertising it's 'buy now.' In storytelling it's the image/feeling that makes someone share, comment, or rewatch." },
    ],
    microAdaptation: "At 40 seconds: This IS the native format. Attention = first frame (design for the thumbnail). Interest = shots 2-3. Desire = the emotional middle. Action = the final image that makes someone send it to a friend.",
  },
  {
    id: "pas",
    name: "PAS (Problem-Agitate-Solve)",
    category: "commercial",
    source: "Direct response copywriting. Used in every infomercial ever made.",
    description: "Problem → Agitate → Solve. Name a problem, make it feel worse, then present the solution. Sounds manipulative — but it's also the structure of every joke (setup → tension → punchline) and every fairy tale (crisis → suffering → rescue).",
    durations: ["15s", "30s", "45s"],
    beats: [
      { order: 1, label: "Problem", description: "Something is wrong. State it clearly and specifically." },
      { order: 2, label: "Agitate", description: "Make it WORSE. Show the consequences. Let the wrongness compound." },
      { order: 3, label: "Solve", description: "The resolution. Can be literal (the problem is fixed) or emotional (the character accepts the problem, and that acceptance IS the solution)." },
    ],
    microAdaptation: "At 40 seconds: Problem (1 shot, 5s) → Agitate (2-3 shots, 20s) → Solve (1-2 shots, 15s). For Walter: the 'solve' is almost never a literal fix. It's a reframe, an acceptance, a tiny shift in perspective. The miniature world's problems don't get solved — they get sat with.",
  },
];

// ─── SHORT FILM / MICRO-FILM STRUCTURES ─────────────────────────────
// Structures specifically designed for ultra-short filmmaking.

export const MICRO_ARCS = [
  {
    id: "one-shot-story",
    name: "The Single-Shot Story",
    category: "micro",
    source: "One-minute film festival tradition. Lumière brothers. iPhone filmmaking.",
    description: "One unbroken shot tells the whole story. The narrative happens WITHIN the frame — through lighting changes, objects entering/exiting, camera movement, or the passage of time. The constraint of one shot forces every element to do triple duty.",
    durations: ["15s", "30s", "45s"],
    beats: [
      { order: 1, label: "The Frame", description: "Lock the camera. Everything the viewer needs is in this one composition." },
      { order: 2, label: "The Change", description: "Something shifts within the frame — a light, a sound, an object placed by a hand." },
      { order: 3, label: "The New Meaning", description: "The same frame now means something different. The viewer's understanding has changed without a single cut." },
    ],
    microAdaptation: "Literally designed for this. One shot. One frame. The miniature set is perfect — you can change lighting, place props, and introduce elements without ever cutting. The giant hand can enter and leave. Time can pass through practical light shifts.",
  },
  {
    id: "two-shot-story",
    name: "The Kuleshov Cut",
    category: "micro",
    source: "Lev Kuleshov — the Kuleshov Effect experiment (1918). The foundation of film editing.",
    description: "Two shots. The MEANING is created by the cut between them, not by either shot alone. Kuleshov proved that audiences project emotion onto a neutral face based on what they see BEFORE or AFTER it. Shot A + Shot B = a meaning that exists in neither shot individually. This is the atomic unit of filmmaking.",
    durations: ["15s", "30s"],
    beats: [
      { order: 1, label: "Shot A", description: "An image with emotional potential but no fixed meaning on its own." },
      { order: 2, label: "Shot B", description: "A second image. The cut creates a meaning that exists only in the viewer's mind." },
    ],
    microAdaptation: "At 15-30 seconds: Two shots held long. Walter's fixed expression is LITERALLY the Kuleshov face — it reads differently depending on what you cut to. Walter's face → a letter on the ground = longing. Walter's face → an empty street = loneliness. Walter's face → a tiny star = wonder. Same face. Different story.",
  },
  {
    id: "the-list",
    name: "The Accumulation",
    category: "micro",
    source: "Essay film tradition. Chris Marker, Agnes Varda. Also: every listicle video ever made.",
    description: "Not a story — a collection. A series of related images that create meaning through accumulation. Each item adds to the pattern. The last item breaks or deepens it. The list format is native to social media and ancient at the same time.",
    durations: ["30s", "45s", "60s"],
    beats: [
      { order: 1, label: "Item 1", description: "Establish the pattern. What kind of list is this?" },
      { order: 2, label: "Items 2-4", description: "Build the pattern. Rhythm is consistent. The viewer starts predicting." },
      { order: 3, label: "The Final Item", description: "Break or deepen the pattern. The last item is the one that sticks." },
    ],
    microAdaptation: "At 40 seconds: 4-6 items, each getting one shot of equal duration. The last item gets a longer hold. Sound design: each item gets the same audio cue until the last one, which gets silence.",
  },
];

// ─── COMEDY-SPECIFIC STRUCTURES ─────────────────────────────────────

export const COMEDY_ARCS = [
  {
    id: "setup-punchline",
    name: "Setup-Punchline (The Rule of Three)",
    category: "comedy",
    source: "Stand-up comedy structure. Vaudeville. Every joke ever told.",
    description: "Establish a pattern with two examples. Break it with the third. The brain expects pattern continuation — the break creates surprise, and surprise creates laughter. The rule of three is the minimum viable joke structure.",
    durations: ["15s", "30s", "45s"],
    beats: [
      { order: 1, label: "Establish", description: "First instance. Sets the pattern." },
      { order: 2, label: "Reinforce", description: "Second instance. Confirms the pattern. The brain now expects a third." },
      { order: 3, label: "Break", description: "Third instance violates the pattern. The gap between expectation and reality = comedy." },
    ],
    microAdaptation: "At 30 seconds: Three shots, matched framing. Shot 1 and 2 are the same format. Shot 3 is the same framing but the content has changed. Keep shots 1 and 2 the same duration. Shot 3 can be held longer for the reaction.",
  },
  {
    id: "comic-escalation",
    name: "Comic Escalation",
    category: "comedy",
    source: "Monty Python, Zucker brothers, Buster Keaton. The comedy of compounding.",
    description: "A small thing gets bigger and bigger and bigger. Each beat raises the stakes while the character remains oblivious or stoic. The comedy is in the gap between how much the situation has escalated and how little the character has reacted. Walter's static stillness makes this structure incredibly powerful.",
    durations: ["30s", "45s", "60s", "90s"],
    beats: [
      { order: 1, label: "The Small Thing", description: "Something minor happens. Almost beneath notice." },
      { order: 2, label: "Bigger", description: "It gets worse. Or more. Or stranger. Still manageable." },
      { order: 3, label: "Absurd", description: "It's now completely out of proportion. Wildly beyond the original scope." },
      { order: 4, label: "The Non-Reaction", description: "The character does nothing. Or does the same small thing they were doing at the start. The gap between the situation and the response IS the punchline." },
    ],
    microAdaptation: "At 40 seconds: Each escalation step gets its own shot, getting progressively shorter in duration (the pace accelerates like Jo-Ha-Kyū). The final shot — the non-reaction — is held the longest. Walter standing calmly in the middle of chaos.",
  },
  {
    id: "uncomfortable-hold",
    name: "The Uncomfortable Hold",
    category: "comedy",
    source: "Nathan Fielder, Tim & Eric, The Office. Anti-comedy. Duration as punchline.",
    description: "Hold on something longer than the audience expects. Past the point of comfort. The duration itself becomes the joke. Normal show: hold for 2 seconds. This: hold for 8. The audience laughs because the discomfort becomes absurd. Nathan Fielder's entire directorial language is built on this.",
    durations: ["15s", "30s", "45s"],
    beats: [
      { order: 1, label: "The Setup", description: "Show something clearly. Quick, efficient." },
      { order: 2, label: "The Normal Cut Point", description: "This is where any other show would cut. Don't cut." },
      { order: 3, label: "The Hold", description: "Keep holding. The audience becomes aware that they're STILL looking at this. They start projecting meaning, emotion, comedy onto the static image. The duration does the writing." },
    ],
    microAdaptation: "At 30 seconds: Setup (5s) → Hold (25s). Yes, really. One shot for 25 seconds. The set decorations, the tiny details, the ambient sound — the viewer starts noticing things they wouldn't in a 3-second shot. The miniature set is DESIGNED for this level of scrutiny.",
  },
];

// ─── SOCIAL / PLATFORM-NATIVE STRUCTURES ────────────────────────────

export const SOCIAL_ARCS = [
  {
    id: "hook-hold-payoff",
    name: "Hook-Hold-Payoff",
    category: "social",
    source: "Instagram/TikTok algorithm optimization. The structure that stops the scroll.",
    description: "First frame grabs attention (hook). The middle maintains curiosity (hold). The last beat delivers (payoff). This isn't just marketing — it's Aristotle's Poetics compressed for the attention economy. Beginning, middle, end. The first frame must work as a STILL IMAGE because that's what the algorithm shows.",
    durations: ["15s", "30s", "45s", "60s"],
    beats: [
      { order: 1, label: "Hook (0-2s)", description: "A visually arresting first frame. Works as a still image. The viewer stops scrolling." },
      { order: 2, label: "Hold (middle)", description: "Context, tension, curiosity. Why should the viewer keep watching? Each shot must answer 'what happens next?'" },
      { order: 3, label: "Payoff (final)", description: "The answer, the twist, the feeling. It must justify the viewer's time. The share trigger lives here." },
    ],
    microAdaptation: "At 40 seconds: Hook = first frame, design it for the thumbnail. Hold = shots 2-5. Payoff = final shot, held longer. The payoff should be the image someone screenshots to send to a friend.",
  },
  {
    id: "the-loop",
    name: "The Seamless Loop",
    category: "social",
    source: "Vine, TikTok, Instagram Reels. Platform-native structure designed for replay.",
    description: "The last frame connects back to the first frame. The viewer rewatches without realizing. The seam between end and beginning is invisible. This exploits the autoplay loop on every platform. Replay = algorithm boost = more viewers.",
    durations: ["15s", "30s", "45s"],
    beats: [
      { order: 1, label: "Opening State", description: "A specific visual and audio state." },
      { order: 2, label: "The Journey", description: "Things change. The story happens." },
      { order: 3, label: "Return to Opening", description: "The final frame matches the opening frame in composition, lighting, and audio. The loop is invisible." },
    ],
    microAdaptation: "Design the first and last frames to match EXACTLY in framing and lighting. Audio must loop seamlessly. The viewer watches 2-3 times before realizing they've looped. Each rewatch reveals details they missed.",
  },
  {
    id: "ambiguous-ending",
    name: "The Ambiguous Ending",
    category: "social",
    source: "The Sopranos finale. Every film that divided audiences. Comment-section architecture.",
    description: "End on something the viewer NEEDS to discuss. Not vague — specifically ambiguous. Two clear interpretations, both valid. The ambiguity drives comments, shares, debates. David Chase didn't end The Sopranos with ambiguity by accident — he engineered it to keep the conversation alive forever.",
    durations: ["30s", "45s", "60s", "90s"],
    beats: [
      { order: 1, label: "Clear Setup", description: "The beginning is unambiguous. The viewer knows what they're watching." },
      { order: 2, label: "Clear Middle", description: "Something happens. The events are concrete." },
      { order: 3, label: "The Fork", description: "The final image can be read two ways. Both readings are supported by the evidence. Neither is 'right.'" },
    ],
    microAdaptation: "At 40 seconds: The ambiguity must be SPECIFIC — name both interpretations before filming. If you can't name two readings, it's not ambiguous, it's just vague. The final shot should be held long enough for the viewer to start asking questions.",
  },
];

// ─── ALL ARCS ───────────────────────────────────────────────────────

export const ALL_ARCS = [
  ...FOUNDATIONAL_ARCS,
  ...SERLING_ARCS,
  ...ALTERNATIVE_ARCS,
  ...COMMERCIAL_ARCS,
  ...MICRO_ARCS,
  ...COMEDY_ARCS,
  ...SOCIAL_ARCS,
];

/**
 * Get arcs that work for a given duration tier.
 */
export function getArcsForDuration(duration) {
  return ALL_ARCS.filter(arc => arc.durations.includes(duration));
}

/**
 * Get arcs by category.
 */
export function getArcsByCategory(category) {
  return ALL_ARCS.filter(arc => arc.category === category);
}

/**
 * Select recommended arcs for an episode brief.
 * Returns 3-5 arcs scored by relevance to mood and tags.
 */
export function suggestArcs({ duration, mood, tags = [] }) {
  const candidates = getArcsForDuration(duration);

  const moodMap = {
    funny: ["setup-punchline", "comic-escalation", "uncomfortable-hold", "vonnegut-man-in-hole", "pas"],
    mysterious: ["serling-formula", "serling-quiet-intrusion", "serling-inversion", "mckee-values", "kishotenketsu"],
    warm: ["kishotenketsu", "vonnegut-man-in-hole", "harmon-circle", "jo-ha-kyu", "one-shot-story"],
    melancholy: ["vonnegut-bad-to-worse", "mckee-values", "freytag-pyramid", "one-shot-story", "the-list"],
    energetic: ["aida", "hook-hold-payoff", "three-act", "comic-escalation", "jo-ha-kyu"],
    surreal: ["serling-quiet-intrusion", "kishotenketsu", "serling-inversion", "two-shot-story"],
    deadpan: ["uncomfortable-hold", "setup-punchline", "vonnegut-bad-to-worse", "two-shot-story"],
    meta: ["ambiguous-ending", "the-loop", "harmon-circle"],
  };

  const tagMap = {
    visitor: ["serling-quiet-intrusion", "three-act", "harmon-circle", "mckee-values"],
    return: ["vonnegut-man-in-hole", "harmon-circle", "save-the-cat"],
    twist: ["serling-inversion", "serling-formula"],
    quiet: ["kishotenketsu", "one-shot-story", "jo-ha-kyu", "uncomfortable-hold"],
    loop: ["the-loop", "harmon-circle"],
    escalation: ["comic-escalation", "vonnegut-bad-to-worse", "freytag-pyramid"],
    contrast: ["kishotenketsu", "two-shot-story", "setup-punchline"],
  };

  const scores = {};
  for (const arc of candidates) {
    scores[arc.id] = 0;
    const moodIds = moodMap[mood] || [];
    if (moodIds.includes(arc.id)) scores[arc.id] += 3;
    for (const tag of tags) {
      const tagIds = tagMap[tag] || [];
      if (tagIds.includes(arc.id)) scores[arc.id] += 2;
    }
  }

  return candidates
    .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
    .slice(0, 5);
}

/**
 * Format arcs for injection into a writing room prompt.
 */
export function formatArcsForPrompt(arcs) {
  return `=== STORY ARC OPTIONS ===
These are real narrative structures used by real writers and directors.
You don't have to use one — but they're here as scaffolding. If you
recognize one, use it. If you see a better structure, name it.

${arcs.map((arc, i) => `${i + 1}. **${arc.name}** (${arc.source})
   ${arc.description}
   Beats: ${arc.beats.map(b => b.label).join(" → ")}
   For ~40 seconds: ${arc.microAdaptation}
`).join("\n")}
=== END ARCS ===`;
}
