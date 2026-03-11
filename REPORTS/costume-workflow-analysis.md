# Costume & Character Workflow Analysis Report

**Date:** 2026-03-11
**Source:** Production costume design prompts (Eric Sandhop, Slack channel)
**Purpose:** Identify prompt patterns, quantify repetition, and recommend node/tool improvements to reduce manual prompting effort.

---

## Executive Summary

Analysis of 30+ production prompts from a costume designer using the character generation toolset reveals that **~70-80% of each prompt is boilerplate** — repeated context, constraints, and material specifications copy-pasted across every generation. Five high-impact nodes could eliminate most of this overhead, with the **Character Bible** and **Preservation Lock** nodes delivering the most immediate value.

---

## 1. Prompt Pattern Analysis

### 1.1 Costume Design Direction (dominant pattern — 15+ occurrences)

Nearly every prompt opens with the same skeleton:

> *"Use your special talent as Hollywood costume designer to combine influences from [STYLES]. This woman is the [CHARACTER NAME]. [BACKSTORY PARAGRAPH]. The results should be [MATERIAL REQUIREMENTS]. This is for a [PRODUCTION CONTEXT]. Do not change [PRESERVATION CONSTRAINTS]."*

This skeleton is rebuilt from scratch every time. Only the bracketed variables change.

### 1.2 Narrative Context Block (repeated verbatim — 12+ occurrences)

The following backstory appears word-for-word or near-identical across a dozen prompts:

> *"She is a vicious villain who rules her personal cult in the back woods of Washington state from an abandoned summer camp. She and her followers worship a Lovecraftian cosmic horror that reveals itself to her and her followers. This costume is what she wears to meet her dark god and show it and her followers that she is the future ruler of the earth realm and its warrior queen."*

**This is ~60 words typed manually every single generation.** It never changes.

### 1.3 Material & Texture Specification (repeated verbatim — 10+ occurrences)

> *"material choices selected should be a mixture of hard and soft shiny, matte and satin that will remain richly textured no matter what the lighting condition"*

Identical phrasing across nearly every costume prompt.

### 1.4 Preservation Constraints (repeated — 15+ occurrences)

| Constraint | Frequency |
|---|---|
| "Do not change the hair style or face" | ~15 prompts |
| "Do not add a crown" | ~5 prompts |
| "She should not look like a fantasy character" | ~4 prompts |
| "The result should not be a dress" | ~4 prompts |
| "Do not have a cape" | ~3 prompts |
| "No electronics or future technology" | ~3 prompts |

These are typed manually every time as defensive guardrails.

### 1.5 Style Influence Fusion (8+ occurrences)

The prompt pattern "combine influences from Ref A. and Ref B. and Ref C." appears frequently. The user is feeding multiple image references and asking the model to merge their stylistic qualities. Current nodes don't structure this.

### 1.6 Director/Production Style Shorthand (6+ occurrences)

Director names are used as compressed style tokens:

| Director/Studio | Intended Style |
|---|---|
| Clive Barker | Body horror, visceral texture, organic-mechanical |
| A24 | Elevated horror, restrained, auteur-driven |
| Tim Burton | Gothic whimsy, exaggerated silhouette, high contrast |
| Zack Snyder | Hyper-stylized, desaturated, muscular composition |
| Quentin Tarantino | Grindhouse, saturated color, retro-modern |
| Daniel Warren Johnson | Heavy ink, dynamic linework, raw energy |

These get typed out in prose every time rather than selected from a list.

### 1.7 Color & Material Palette (repeated with minor variation — 8+ occurrences)

> *"Black and gray materials with dark and indigo purple and hints of red with bronze for metal parts/buckles/snaps"*

The same palette described in prose, slightly reworded each time.

### 1.8 Pose & Environment Placement (5+ occurrences)

Separate prompts are created just to place the character in a scene:

> *"show this woman in a Washington state rainforest with abandoned cabins behind her. Early morning light. She is holding an AK-47 in a soldier's stance"*

This is a distinct operation from costume design but currently uses the same freeform prompt field.

### 1.9 Iterative Refinement Loop

The prompt history shows a clear pattern: generate → review → adjust one thing → regenerate. Examples:

- "create new pants that match her upper body"
- "give this man a mustache like the man in Ref A"
- "remove the elbow pads"
- "show this man from behind. Do not show the vest on the back"

Small, targeted edits that rebuild the full prompt context each time.

---

## 2. Waste Quantification

| Category | Avg Words Per Prompt | Times Repeated | Total Wasted Words |
|---|---|---|---|
| Narrative context | ~60 | 12 | ~720 |
| Material specification | ~25 | 10 | ~250 |
| Preservation constraints | ~15 | 15 | ~225 |
| Production style context | ~20 | 6 | ~120 |
| Color palette description | ~20 | 8 | ~160 |
| **Total estimated waste** | | | **~1,475 words** |

Roughly **1,500 words of redundant typing** across this prompt set, not counting the cognitive load of remembering and reconstructing context.

---

## 3. Recommended Nodes & Features

### 3.1 Character Bible Node (PRIORITY 1 — highest impact)

**What it does:** A persistent node where the user writes the character's identity and narrative context once. Any connected generation node automatically inherits this context.

**Fields:**
- **Character name** — text (e.g., "The Red Queen," "Bloody Mary," "Floyd")
- **Backstory** — multi-line text (the cult, the camp, the cosmic horror)
- **Role / archetype** — text or tags (villain, warrior queen, blood magic fighter)
- **World context** — text (backwoods Washington, Lovecraftian horror, A24 film)
- **Production context** — dropdown or text (Clive Barker A24, Tim Burton, etc.)

**Eliminates:** The ~60-word backstory block repeated in every prompt. User writes it once, it flows downstream.

**Connection model:** Output handle connects to any generation node (Image Gen, Art Director, Costume Director, etc.). The receiving node prepends the bible context to its prompt automatically.

### 3.2 Preservation Lock Node (PRIORITY 2 — quick win)

**What it does:** A structured constraint node with toggle switches for common "do not change" rules. Auto-appends to any connected generation prompt.

**Toggle switches:**
- Keep face
- Keep hair / hair color
- Keep pose
- Keep body type / build
- Keep camera angle
- Keep lighting

**Negative constraint list (user-editable tags):**
- No crown
- No fantasy elements
- No dress
- No cape
- No electronics / technology
- No [custom]

**Eliminates:** The 5-6 defensive constraint sentences typed in every prompt.

### 3.3 Costume Director Node (PRIORITY 3 — replaces the core workflow)

**What it does:** A specialized director node (can be a new focus mode on Art Director, or standalone) with structured fields that replace prose descriptions of style, material, and color.

**Fields:**

*Style Influences (multi-select tags):*
- Heavy metal, Punk rock, Industrial, Gothic, Art nouveau
- Techwear, Rockabilly, Outlaw biker, Pro wrestling
- High fashion, Streetwear, Military surplus, Thrift store DIY

*Material Palette (checkboxes):*
- Leather (matte / patent / distressed)
- Satin / silk
- Metal hardware (bronze / chrome / blackened steel)
- Canvas / denim
- Mesh / lace
- Vinyl / PVC
- Fur / feather
- Rubber / neoprene

*Color Palette (structured):*
- Primary color(s) — color picker + swatch
- Secondary color(s) — color picker + swatch
- Accent color — color picker + swatch
- Hardware color — dropdown (bronze, chrome, gold, blackened, copper)

*Production Style (dropdown):*
- Clive Barker (visceral body horror)
- A24 (elevated restrained auteur)
- Tim Burton (gothic whimsy)
- Zack Snyder (hyper-stylized)
- Tarantino (grindhouse retro)
- Custom text field

*Texture Rule:*
- Toggle: "Ensure rich texture reads across all lighting conditions" (auto-appends the material sentence)

**Eliminates:** The entire material/color/style prose block. Replaces ~40 words of manual description with structured form inputs.

**Pipeline:** Runs the same 6-phase ideation gauntlet as Art Director, producing 5 costume direction points with annotated reference images.

### 3.4 Style Fusion Node (PRIORITY 4)

**What it does:** Takes 2-4 image reference inputs with per-reference labels and weight sliders. Outputs a structured style brief that feeds into the Costume Director or Art Director.

**Fields per reference slot:**
- Image upload / paste
- Style label — text (e.g., "high fashion eclipse silhouette," "rugged practical cut")
- Weight slider — 0-100%
- What to take from this reference — dropdown: silhouette, material, color, detail work, overall vibe

**Output:** A structured style fusion brief auto-injected into the next node's prompt.

**Eliminates:** "Combine influences from Ref A and Ref B" prose. Replaces it with visual slots and structured intent.

### 3.5 Environment Placement Node (PRIORITY 5)

**What it does:** Composites a character into a scene with structured fields rather than freeform prose.

**Fields:**
- Location — text or presets (Pacific Northwest forest, abandoned camp, urban, studio)
- Time of day — dropdown (dawn, morning, golden hour, overcast, night)
- Lighting — dropdown (dappled forest light, harsh direct, soft diffused, rim-lit, campfire)
- Pose — text or presets (soldier's stance, portrait 3/4, from behind, full body centered)
- Props — text (AK-47, fanny pack, canteen)
- Camera — dropdown (full body, waist up, portrait, extreme close-up)
- Output format — dropdown (16:9, 1:1 square 1024px, 3:4)

**Eliminates:** The 3-4 sentence environment/pose prompts that are separate from costume work.

---

## 4. Implementation Priority Matrix

| Node | Effort | Impact | Prompts Eliminated | Priority |
|---|---|---|---|---|
| Character Bible | Low | Very High | ~12 prompt blocks | **P1 — Build first** |
| Preservation Lock | Low | High | ~15 constraint lines | **P2 — Quick win** |
| Costume Director | Medium | Very High | Core workflow replacement | **P3 — Main feature** |
| Style Fusion | Medium | Medium | ~8 reference combos | **P4 — Enhancement** |
| Environment Placement | Medium | Medium | ~5 scene prompts | **P5 — Nice to have** |

### Suggested build order:
1. **Character Bible** + **Preservation Lock** — can ship together, immediately reduces boilerplate
2. **Costume Director** — the flagship feature, replaces the core manual workflow
3. **Style Fusion** — enhances the Costume Director with structured multi-reference input
4. **Environment Placement** — separate concern, can ship independently

---

## 5. Connection Model

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  Character    │────▶│  Costume Director │────▶│  AD Result Node  │ ×5
│  Bible        │     │  (6-phase gauntlet│     │  (annotated img) │
└──────────────┘     │   + form fields)  │     └──────────────────┘
                      └───────────────────┘
┌──────────────┐            ▲
│ Preservation │────────────┘
│ Lock         │
└──────────────┘
┌──────────────┐            ▲
│ Style Fusion │────────────┘
│ (Ref A+B+C)  │
└──────────────┘
```

The Character Bible, Preservation Lock, and Style Fusion nodes all feed into the Costume Director as structured input. The Costume Director runs the 6-phase gauntlet and spawns 5 annotated result nodes — same architecture as the existing Art Director and Level Design Director.

---

## 6. Estimated Impact

With all five nodes implemented:

| Metric | Before | After |
|---|---|---|
| Avg prompt length | ~120 words | ~15-20 words (only the delta) |
| Time per iteration | ~3-5 min (reconstruct + type) | ~15-30 sec (toggle + tweak) |
| Repeated context typing | Every prompt | Never (set once in Bible) |
| Constraint typing | Every prompt | Never (toggles persist) |
| Material/color description | Prose every time | Form selection (persists) |
| Style reference handling | Inline prose | Structured visual slots |

**Projected reduction in manual prompting effort: 70-80%.**

---

*Report generated from analysis of 30+ production costume design prompts. Patterns identified through manual classification of recurring text blocks, constraint phrases, and workflow sequences.*
