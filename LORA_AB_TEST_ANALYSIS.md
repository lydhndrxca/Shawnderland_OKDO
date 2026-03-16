# Training Data A/B Test: 3 Without vs. 3 With

**Date:** 2026-03-16
**Model:** Gemini 2.5 Flash (room) + Gemini 2.5 Pro (assembly)
**Episode:** The Trainer
**Variable:** Full persona research profiles (identity field) — ON vs. OFF
**Control:** Everything else identical — VOICE CHECK blocks, SHARED_RULES, TONE_GUARD, SET_REALITY, BRIEF, story arcs, round structure, speaker selection

---

## Raw Data

| | NO_LORA_1 | NO_LORA_2 | NO_LORA_3 | LORA_1 | LORA_2 | LORA_3 |
|---|---|---|---|---|---|---|
| **Title** | Performance Review | The Trainer | Go Time | GO-TIME | THE TRAINER | GO TIME, CHAMP |
| **Shots** | 8 | 7 | 7 | 7 | 7 | 7 |
| **Duration** | ~41s | ~40s | ~40s | ~40s | ~36s | ~38s |
| **File size** | 52.6 KB | 51.4 KB | 59.5 KB | 66.7 KB | 68.1 KB | 61.0 KB |
| **Music cut?** | No (continuous) | Yes (abrupt) | Yes (replaced) | No (fades, stays) | Yes (abrupt at black) | No (fades to thrum) |
| **Invented props** | Fan (off-camera) | None | None | None | None | Yellow flower |
| **Physical violations** | None | None | None | None | None | None |
| **Tone drift** | On brief | Slight melancholy | Slight art-film | On brief | On brief | On brief |
| **Story arc** | Setup-Punchline | Comic Intrusion | Disruption/Restabilization | Comic Escalation | Sustained Contrast | Catalyst & Stillness |

---

## Finding 1: File Size (Proxy for Depth of Conversation)

**LORA runs averaged 65.3 KB. NO_LORA runs averaged 54.5 KB.**

That's ~20% more content in the LORA runs. The agents with training data produce longer, more detailed responses. They have more to draw on, so they say more — more specific observations, more developed pitches, more granular pushback.

**Verdict: LORA wins. More substance per round.**

---

## Finding 2: Voice Distinction

This is where the results get nuanced. Both groups produce recognizable voices because the VOICE CHECK blocks do the heavy lifting on speech patterns. But there's a qualitative difference in *what* they say vs. *how* they say it.

### Joe Pera — NO_LORA:
> "Yes. I think… I think that's right, Nathan. The silence after all that, it really... it pulls you in, doesn't it?"

> "Okay. Yeah. That... that makes sense. The loud arrival, and the Trainer just... going at it."

### Joe Pera — LORA:
> "You know, I think Nathan is right here. The Trainer… he shouldn't sag. Not yet. That kind of quiet, that *deep* quiet, it needs to be earned, I think."

> "I think... what if we just sat with that for a moment? A slightly wide shot, maybe from a little bit above, looking down on Walter's front yard. We see the patchy snow, the still brown grass, the little fence. Walter is there, you know, just positioned by the house, looking out, but not really looking *at* anything. Just... being."

**The LORA Pera has more creative specificity.** He doesn't just agree — he builds visual pictures, he has opinions about pacing ("that quiet needs to be earned"), he sees details. The NO_LORA Pera trails off and agrees but contributes less substance.

### Nathan Fielder — NO_LORA:
> "That could work. The contrast between that extreme energy and the stillness is the core mechanism."

> "Okay, the entrance is good. The car, the music, the Trainer. That's a strong opening."

### Nathan Fielder — LORA:
> "During those twenty seconds, from 15 to 35, The Trainer should not become static. His bobbing could slow significantly, yes, but his gestures towards Walter should continue, perhaps becoming more insistent, even confused... He could lean in slightly, as if attempting to understand Walter's lack of response."

> "A finger puppet has a limited set of actions. If he simply becomes less energetic, that could read as him giving up or becoming just another static prop."

**The LORA Fielder is more technically precise and more directorial.** He thinks about what things *read as* on camera. He gives specific duration windows. He catches physical constraint issues. The NO_LORA Fielder is clinical but thinner — he approves things more than he shapes them.

### Rod Serling — NO_LORA:
> "The true narrative here is not about Walter's movement, but the seismic shift in his world."

> "The grand arrival is set, but what of the subsequent act? Perhaps the Trainer's relentless, unheeded summons provides the humor."

### Rod Serling — LORA:
> "The true narrative begins not with what is done, but what remains undone. Let the Trainer unleash a storm of 90s-era motivational frenzy, a torrent of frantic bobs and shouted platitudes..."

> "The duration of the hold, then, is not merely a comedic device, is it? It becomes a testament to presence."

**Both Serlings are literary and cosmic.** The difference is subtler here — the LORA Serling produces slightly more *pointed* observations. But Gemini's pre-training knowledge of Rod Serling is strong enough that both versions sound like him.

**Verdict: LORA wins on depth and specificity. NO_LORA still sounds right but contributes less.**

---

## Finding 3: Prop Discipline

| | NO_LORA | LORA |
|---|---|---|
| **Runs with invented props** | 1/3 (fan in NL1) | 1/3 (flower in L3) |
| **Props discussed but caught** | Gold star (NL2, caught by assembly) | None extra |

**Verdict: Tie.** Both groups had one prop violation across 3 runs. The training data doesn't significantly improve or worsen prop discipline — that's driven by the SHARED_RULES and Producer's SET COP directive.

---

## Finding 4: Music Discipline (Brief Compliance)

The brief says: "The music from the Micro Machine is NON-NEGOTIABLE."

| | Continuous | Cut/Replaced |
|---|---|---|
| **NO_LORA** | 1/3 | 2/3 |
| **LORA** | 2/3 | 1/3 |

**LORA runs were better at keeping the music continuous.** The NO_LORA runs more frequently cut or replaced the 90s music, often with melancholic themes — which is exactly the kind of drift the brief warns against. The training data seems to anchor the agents more firmly to the show's established creative principles.

**Verdict: LORA wins. Better brief adherence.**

---

## Finding 5: Tone Discipline

| | On Brief (Funny First) | Drifted |
|---|---|---|
| **NO_LORA** | 1/3 | 2/3 (melancholy, art-film) |
| **LORA** | 3/3 | 0/3 |

This is the clearest signal. **All 3 LORA runs stayed "funny first, warm undercurrent."** Two of the three NO_LORA runs drifted — one toward a melancholy ending (dead silence), one toward an art-film ending (melancholic music replacement + slow dolly).

The training data includes detailed show context about Walter's tone, the show's sensibility, and each agent's relationship to the material. Without it, the agents default more toward their "generic" tendencies — Serling pulls toward darkness, Pera pulls toward quiet, and without the counterweight of deep show knowledge, the room drifts.

**Verdict: LORA wins clearly. 100% brief adherence vs. 33%.**

---

## Finding 6: Story Diversity

| NO_LORA Arcs | LORA Arcs |
|---|---|
| Setup-Punchline + Escalation | Comic Escalation |
| Comic Intrusion | Sustained Contrast / Immovable Object |
| Disruption & Re-stabilization | Catalyst and Stillness |

Both groups produced diverse story arcs. Neither was repetitive.

**Verdict: Tie. Both groups generate varied approaches.**

---

## Finding 7: Assembly Quality

Both groups produced complete, shootable scripts with full shot lists, dialogue, audio timelines, and creator notes. The LORA assemblies were slightly longer and more detailed, consistent with the richer transcripts they were assembling.

**Verdict: Tie. Pro handles both well.**

---

## Summary Scorecard

| Dimension | Winner | Margin |
|---|---|---|
| Conversation depth | LORA | Clear (~20% more content) |
| Voice distinction (how they talk) | Tie | VOICE CHECK blocks drive this |
| Voice distinction (what they say) | LORA | Clear (more specific, more directorial) |
| Prop discipline | Tie | 1 violation each |
| Music / brief compliance | LORA | 2/3 vs 1/3 kept music |
| Tone discipline | LORA | 3/3 vs 1/3 stayed on brief |
| Story diversity | Tie | Both varied |
| Assembly quality | Tie | Pro handles both |
| Physical constraint compliance | Tie | 0 violations each |

**Overall: LORA wins 4, Ties 5, NO_LORA wins 0.**

---

## Conclusion

The training data doesn't make or break the simulation. Without it, you still get recognizable voices, functional scripts, and good ideas. The VOICE CHECK blocks and Gemini's pre-training knowledge of these public figures carry the vocal patterns.

But the training data provides a measurable advantage in three areas that matter for creative quality:

1. **Depth of contribution** — Agents say more, pitch more, and give more specific creative input
2. **Brief adherence** — Agents with show context stay on-tone more reliably (3/3 vs 1/3)
3. **Creative specificity** — LORA Fielder thinks like a director, LORA Pera sees visual details, LORA Serling makes pointed observations rather than generic literary flourishes

The training data is like the difference between an actor who's read the script once and an actor who's done their research. Both can perform, but one brings texture and grounding the other doesn't.

**Recommendation: Keep the training data enabled. It's not carrying the voice — it's carrying the rigor.**
