/**
 * Consumer-facing node descriptions shown in the Details panel.
 * Each entry describes what the node does, what it connects to, and what it receives from.
 */

export interface NodeDescription {
  label: string;
  color: string;
  description: string;
  connectsTo?: string[];
  connectsFrom?: string[];
}

export const NODE_DESCRIPTIONS: Record<string, NodeDescription> = {
  // ── Pipeline (ShawnderMind) ──
  seed: {
    label: 'Idea Seed',
    color: '#6c63ff',
    description: 'This is where you start. Type any idea — a product, a problem, a concept — and the AI takes it from there.',
    connectsTo: ['Normalize', 'Any processing node'],
    connectsFrom: ['Emotion', 'Persona', 'Text', 'Image', 'Video', 'Document', 'Link'],
  },
  normalize: {
    label: 'Normalize',
    color: '#64b5f6',
    description: 'Takes your raw idea and organizes it — creates a summary, identifies assumptions, and raises clarifying questions.',
    connectsTo: ['Diverge', 'Any downstream node'],
    connectsFrom: ['Idea Seed'],
  },
  diverge: {
    label: 'Diverge',
    color: '#69f0ae',
    description: 'Brainstorms many different takes on your idea. Generates practical, contrarian, and creative variations to explore.',
    connectsTo: ['Critique', 'Converge'],
    connectsFrom: ['Normalize'],
  },
  'critique-salvage': {
    label: 'Critique',
    color: '#ff8a65',
    description: 'Reviews each brainstormed idea and rates how generic or unique it is. Generic ideas get creative "mutations" to make them stand out.',
    connectsTo: ['Expand'],
    connectsFrom: ['Diverge'],
  },
  expand: {
    label: 'Expand',
    color: '#ce93d8',
    description: 'Deep-dives into the best ideas — identifies risks, creates action plans, and figures out what to do on day one.',
    connectsTo: ['Converge'],
    connectsFrom: ['Critique'],
  },
  converge: {
    label: 'Converge',
    color: '#ffd54f',
    description: 'Scores and ranks all expanded ideas on novelty, usefulness, and feasibility. Picks a winner and suggests what to cut to ship faster.',
    connectsTo: ['Commit'],
    connectsFrom: ['Expand'],
  },
  commit: {
    label: 'Commit',
    color: '#4db6ac',
    description: 'Creates a polished final artifact from the winning idea — with a title, differentiator, and clear next steps.',
    connectsTo: ['Iterate'],
    connectsFrom: ['Converge'],
  },
  iterate: {
    label: 'Iterate',
    color: '#90a4ae',
    description: 'Suggests follow-up prompts and next directions. Use these to start another round of ideation or branch in a new direction.',
    connectsFrom: ['Commit'],
  },

  // ── Outputs ──
  textOutput: {
    label: 'Text Output',
    color: '#e0e0e0',
    description: 'Displays your idea as formatted, copyable text. Connect any node to see its text output here.',
    connectsFrom: ['Any pipeline node', 'Extract Data'],
  },
  imageOutput: {
    label: 'Image Output',
    color: '#f06292',
    description: 'Generates images from your idea using AI. Pick a model, adjust settings, and generate.',
    connectsFrom: ['Any pipeline or text node'],
  },
  videoOutput: {
    label: 'Video Output',
    color: '#ba68c8',
    description: 'Generates short video clips from your idea using AI video models.',
    connectsFrom: ['Any pipeline, text, or image node'],
  },
  extractData: {
    label: 'Extract Data',
    color: '#ffab40',
    description: 'Uses AI vision to read an image and extract a text description, visual style info, or structured data.',
    connectsTo: ['Text Output', 'Any processing node'],
    connectsFrom: ['Image Reference', 'Image Influence'],
  },

  // ── Inputs & References ──
  textInfluence: {
    label: 'Text',
    color: '#7986cb',
    description: 'Paste any text — articles, notes, transcripts — to influence the AI\'s output at the connection point.',
    connectsTo: ['Any pipeline or processing node'],
  },
  documentInfluence: {
    label: 'Document',
    color: '#a1887f',
    description: 'Upload a document (.txt, .md, .pdf) and its content becomes an influence on whatever node you connect it to.',
    connectsTo: ['Any pipeline or processing node'],
  },
  imageInfluence: {
    label: 'Image',
    color: '#4db6ac',
    description: 'Add an image as a visual reference. The AI analyzes what it sees and incorporates it into the connected node.',
    connectsTo: ['Any pipeline or processing node', 'Extract Attributes'],
  },
  linkInfluence: {
    label: 'Link',
    color: '#4fc3f7',
    description: 'Paste a URL (website, article, video) as an influence. The AI considers the linked content.',
    connectsTo: ['Any pipeline or processing node'],
  },
  videoInfluence: {
    label: 'Video',
    color: '#ce93d8',
    description: 'Upload a video file to influence the pipeline with visual content the AI can analyze.',
    connectsTo: ['Any pipeline or processing node'],
  },
  imageReference: {
    label: 'Image Reference',
    color: '#26a69a',
    description: 'Load or paste a reference image. The AI sees and analyzes it when connected to other nodes.',
    connectsTo: ['Extract Data', 'Reference Callout', 'Generate Character', 'Any processing node'],
  },

  // ── Modifiers ──
  count: {
    label: 'Count',
    color: '#78909c',
    description: 'Controls how many results a connected output node generates. Drag the slider or type a number.',
    connectsTo: ['Any output node'],
  },
  emotion: {
    label: 'Emotion',
    color: '#e57373',
    description: 'Sets the emotional tone for the AI. Type a feeling — "playful", "serious", "rebellious" — and it shapes the output.',
    connectsTo: ['Any pipeline or generation node'],
  },
  influence: {
    label: 'Persona',
    color: '#ab47bc',
    description: 'Channels a real person\'s creative style. Type a name (director, writer, artist) and the AI weaves their approach into the result.',
    connectsTo: ['Any pipeline or generation node'],
  },
  preprompt: {
    label: 'Preprompt',
    color: '#66bb6a',
    description: 'Injects your text BEFORE the AI reads incoming data — sets the context, frame, or lens for everything that follows.',
    connectsTo: ['Any pipeline or processing node'],
    connectsFrom: ['Any node'],
  },
  postprompt: {
    label: 'PostPrompt',
    color: '#ffa726',
    description: 'Injects your text AFTER the AI reads incoming data — tells the AI what to DO with everything it just received.',
    connectsTo: ['Any pipeline or processing node'],
    connectsFrom: ['Any node'],
  },

  // ── Character Generator ──
  charIdentity: {
    label: 'Character Identity',
    color: '#7c4dff',
    description: 'Define your character\'s core identity — age, race, gender, and body build. These presets are passed to the image generator to shape the character.',
    connectsTo: ['Generate Character', 'Extract Attributes'],
    connectsFrom: ['Quick Generate', 'Randomize'],
  },
  charDescription: {
    label: 'Character Description',
    color: '#5c6bc0',
    description: 'Write a freeform text description of your character. This gets sent to the AI along with identity and attributes to generate the image.',
    connectsTo: ['Generate Character', 'Enhance Description'],
    connectsFrom: ['Quick Generate', 'Extract Attributes'],
  },
  charAttributes: {
    label: 'Character Attributes',
    color: '#9c27b0',
    description: 'Define detailed attributes like hair, eyes, clothing, gear, and accessories. Each attribute group can be expanded and customized.',
    connectsTo: ['Generate Character'],
    connectsFrom: ['Extract Attributes', 'Randomize'],
  },
  charStyle: {
    label: 'Style',
    color: '#7b1fa2',
    description: 'Set the visual style for your character — add style reference images, text descriptions, or both. This influences the overall look and feel of generated images.',
    connectsTo: ['Generate Character'],
    connectsFrom: ['Image Reference'],
  },
  charExtractAttrs: {
    label: 'Extract Attributes',
    color: '#ffab40',
    description: 'Feed an image in and the AI analyzes it to automatically fill in identity, description, and attribute fields. Great for importing existing character designs.',
    connectsTo: ['Character Identity', 'Character Description', 'Character Attributes'],
    connectsFrom: ['Image Reference', 'Image Influence', 'Any viewer node'],
  },
  charEnhanceDesc: {
    label: 'Enhance Description',
    color: '#66bb6a',
    description: 'AI expands and enriches a character description with more detail and creative language. Connects to and automatically updates the Description node.',
    connectsTo: ['Character Description'],
    connectsFrom: ['Character Description'],
  },
  charGenerate: {
    label: 'Generate Character',
    color: '#e91e63',
    description: 'The main generation engine. Takes identity, description, attributes, and style inputs and generates character images for all connected viewers (Main Stage, Front, Back, Side).',
    connectsTo: ['Main Stage Viewer', 'Front View', 'Back View', 'Side View', 'Custom View'],
    connectsFrom: ['Character Identity', 'Character Description', 'Character Attributes', 'Style', 'Reference Callout', 'Image Reference'],
  },
  charGate: {
    label: 'Gate (On/Off)',
    color: '#66bb6a',
    description: 'A simple toggle switch. When turned OFF, it blocks data from flowing through to the next node. Place it between any two nodes to control the connection.',
    connectsTo: ['Any node'],
    connectsFrom: ['Any node'],
  },
  charMainViewer: {
    label: 'Main Stage Viewer',
    color: '#00bfa5',
    description: 'The primary image display for your character. Shows the full-body main view. Supports zoom (scroll wheel), pan (middle-click drag), and right-click options.',
    connectsTo: ['Image Studio', 'Save Group'],
    connectsFrom: ['Generate Character', 'Quick Generate'],
  },
  charFrontViewer: {
    label: 'Front View',
    color: '#42a5f5',
    description: 'Shows the front angle of your character. Auto-generates when connected to Generate Character. Supports zoom, pan, and right-click options.',
    connectsTo: ['Image Studio', 'Save Group'],
    connectsFrom: ['Generate Character'],
  },
  charBackViewer: {
    label: 'Back View',
    color: '#ab47bc',
    description: 'Shows the back angle of your character. Auto-generates when connected to Generate Character. Supports zoom, pan, and right-click options.',
    connectsTo: ['Image Studio', 'Save Group'],
    connectsFrom: ['Generate Character'],
  },
  charSideViewer: {
    label: 'Side View',
    color: '#ff7043',
    description: 'Shows the side angle of your character. Auto-generates when connected to Generate Character. Supports zoom, pan, and right-click options.',
    connectsTo: ['Image Studio', 'Save Group'],
    connectsFrom: ['Generate Character'],
  },
  charCustomView: {
    label: 'Custom View',
    color: '#7e57c2',
    description: 'Generate a custom angle or pose by typing a prompt (e.g., "3/4 view from above"). Great for specific angles not covered by Front/Back/Side.',
    connectsTo: ['Image Studio', 'Save Group'],
    connectsFrom: ['Generate Character'],
  },
  charRefCallout: {
    label: 'Reference Callout',
    color: '#26a69a',
    description: 'Annotate a reference image with specific callouts for the AI to pay attention to during generation. Add labels pointing to specific areas of the image.',
    connectsTo: ['Generate Character'],
    connectsFrom: ['Image Reference'],
  },
  charShowXML: {
    label: 'Show XML',
    color: '#8d6e63',
    description: 'Displays the full XML configuration for the current character — useful for debugging or exporting the character definition.',
    connectsFrom: ['Character Identity', 'Character Description', 'Character Attributes'],
  },
  charQuickGen: {
    label: 'Quick Generate',
    color: '#ffa726',
    description: 'Instantly creates a random character with AI-generated identity, description, and attributes. Click to roll the dice on a new character concept.',
    connectsTo: ['Character Identity', 'Character Description', 'Character Attributes', 'Main Stage Viewer'],
  },
  charRandomize: {
    label: 'Randomize',
    color: '#ff5722',
    description: 'Randomly shuffles the options on connected nodes — great for quickly exploring different attribute combinations.',
    connectsTo: ['Character Attributes', 'Character Identity'],
  },
  imageStudio: {
    label: 'Image Studio',
    color: '#00bcd4',
    description: 'A full-screen image editor with text-based editing, brush masking, inpainting, and precision point feedback. Connect viewer nodes and click "Open Editor" to start.',
    connectsFrom: ['Main Stage Viewer', 'Front View', 'Back View', 'Side View', 'Custom View'],
  },
  charSaveGroup: {
    label: 'Save Group',
    color: '#009688',
    description: 'Saves all connected character images as a named group to your Files panel. You can also download them as individual image files. Drag groups from Files back onto the canvas anytime.',
    connectsFrom: ['Main Stage Viewer', 'Front View', 'Back View', 'Side View', 'Custom View'],
  },
  charUpscale: {
    label: 'Upscale Image',
    color: '#e040fb',
    description: 'Uses Google Imagen 4 to AI-upscale an image to higher resolution without losing detail. Choose x2, x3, or x4 factor (up to 17 megapixels). The upscaled image replaces the original in the connected viewer.',
    connectsFrom: ['Main Stage Viewer', 'Front View', 'Back View', 'Side View', 'Custom View', 'Any image viewer'],
  },
  charRestore: {
    label: 'Restore Quality',
    color: '#00c853',
    description: 'Fixes accumulated quality degradation from iterative AI editing. When you keep editing an image, each round compounds compression artifacts, noise, blur, and resolution loss — like recording over an analog tape.\n\nThis node sends the degraded image through Gemini for a complete clean redraw while preserving every detail of the content. The AI essentially redraws the image from scratch using the original as a reference, producing a fresh, artifact-free version.\n\nTwo modes:\n• Restore — AI redraw only (Gemini Pro for best results, Flash for speed)\n• Restore + Upscale — AI redraw followed by Imagen x2 upscale for maximum quality\n\nAlso available as a "Restore" button directly in the toolbar of all viewer nodes.',
    connectsFrom: ['Main Stage Viewer', 'Front View', 'Back View', 'Side View', 'Custom View', 'Any image viewer'],
  },
  charCreativeDirector: {
    label: 'Creative Director',
    color: '#ff6f00',
    description: 'A Hollywood-caliber character designer reviews your character and provides 4-6 specific, actionable design suggestions to elevate the design. Analyzes silhouette, color story, materials, proportions, accessories, and overall attitude.\n\nConnect an image viewer (Main Stage Viewer, Front View, etc.) to the input. Optionally connect Identity, Description, and Attributes nodes for context. Click "Get Critique" and the AI studies every detail of your character.\n\nEach suggestion appears as a card you can click "Apply" to inject into a connected Description node.',
    connectsTo: ['Character Description'],
    connectsFrom: ['Main Stage Viewer', 'Front View', 'Back View', 'Side View', 'Custom View', 'Any image viewer', 'Character Identity', 'Character Description', 'Character Attributes'],
  },
  charImageBucket: {
    label: 'Generated Images',
    color: '#43a047',
    description: 'Browse all generated images saved in your output directory. Useful for reviewing past generations.',
  },

  // ── 3D Gen AI ──
  meshyImageTo3D: {
    label: 'Image → 3D (Meshy)',
    color: '#00acc1',
    description: 'Sends character images to Meshy AI to generate a textured 3D model. Supports single-image and multi-image (front/back/side views) input. All Meshy parameters are exposed: AI model version, topology (tri/quad), polycount, symmetry, pose mode, PBR, remesh, lighting removal, and texture prompts. Polls Meshy automatically until the model is complete.',
    connectsTo: ['3D Model Viewer'],
    connectsFrom: ['Main Stage Viewer', 'Front View', 'Back View', 'Side View', 'Custom View', 'Any image viewer'],
  },
  hitem3dImageTo3D: {
    label: 'Image → 3D (Hitem3D)',
    color: '#ff6e40',
    description: 'Generates high-detail 3D models from character images using Hitem3D. Offers finer control than Meshy with:\n\n• Generation type — Geometry Only (fast blockouts), All-in-One (geometry + texture), or Staged Texture (v1.5: texture an existing mesh separately)\n• Model selection — General v1.5/v2.0 or dedicated Portrait models (v1.5/v2.0/v2.1) optimized for faces and busts\n• Resolution — 512 (preview) → 1536pro (production quality)\n• Polygon slider — 100K to 2M faces for precise topology control\n• Output format — OBJ, GLB, STL, FBX, or USDZ\n\nSupports single-image and multi-view input (front required, plus back/left/right). Shows estimated credit cost before generating.',
    connectsTo: ['3D Model Viewer'],
    connectsFrom: ['Main Stage Viewer', 'Front View', 'Back View', 'Side View', 'Custom View', 'Any image viewer'],
  },
  meshyModelViewer: {
    label: '3D Model Viewer',
    color: '#8e24aa',
    description: 'Interactive 3D viewer powered by Three.js. Orbit, zoom, and pan the generated model. Toggle wireframe, normals, materials, and auto-rotation. Page through multiple models if several are connected. Export in OBJ (default), GLB, FBX, or USDZ to the directory configured in Settings.',
    connectsTo: [],
    connectsFrom: ['Image → 3D (Meshy)', 'Image → 3D (Hitem3D)'],
  },

  // ── Audio AI (ElevenLabs) ──
  elTTS: {
    label: 'Text-to-Speech',
    color: '#ff6f00',
    description: 'Generates high-quality speech from text using ElevenLabs. Choose from pre-built voices or your own cloned voices. Select a model (Eleven v3 for expressiveness, Flash v2.5 for speed, Multilingual v2 for 29 languages). Tune voice stability, clarity, and style expression. Output as MP3, PCM, or Opus at various bitrates.\n\nPerfect for character voice prototyping — type dialogue, pick a voice, and hear your character speak.',
    connectsTo: ['Voice Clone', 'Any output node'],
    connectsFrom: ['Any text source', 'Pipeline nodes', 'Character Description'],
  },
  elSFX: {
    label: 'Sound Effects',
    color: '#e65100',
    description: 'Generates sound effects from text descriptions using ElevenLabs. Type what you want to hear — "thunder crack", "sword unsheathing", "spaceship engine hum", "crowd cheering" — and the AI creates it.\n\nControl duration (auto to 22 seconds) and prompt influence (how closely the output matches your description vs. creative variation). Recent generations are kept in a history for quick comparison.',
    connectsTo: ['Voice Clone', 'Any output node'],
    connectsFrom: ['Any text source', 'Pipeline nodes'],
  },
  elVoiceScript: {
    label: 'Voice Script Writer',
    color: '#42a5f5',
    description: 'Uses Gemini AI to write game-quality voice-over text — character dialogue, monologues, battle cries, or narrator voiceover. Optionally connect Character Identity, Description, and Attributes nodes so Gemini writes in-character. Choose a tone (Heroic, Menacing, Calm, etc.) and mode, then generate. The output text flows directly into the Text-to-Speech node.',
    connectsTo: ['Text-to-Speech'],
    connectsFrom: ['Character Identity', 'Character Description', 'Character Attributes', 'Any text node'],
  },
  elVoiceClone: {
    label: 'Voice Clone',
    color: '#7b1fa2',
    description: 'Create an instant voice clone from a short audio sample (1-30 seconds ideal). Upload an MP3, WAV, or OGG file — or connect an upstream audio source — give it a name, and ElevenLabs clones the voice.\n\nOnce cloned, test it with custom text right in the node. The cloned voice ID is stored and can be used by the TTS node for generating character dialogue in that voice.',
    connectsTo: ['Text-to-Speech'],
    connectsFrom: ['Text-to-Speech (for sample)', 'Sound Effects (for sample)'],
  },
  elVoiceDesigner: {
    label: 'Voice Designer',
    color: '#1976d2',
    description: 'Connect a character image and Gemini AI acts as a veteran voice casting director — analyzing appearance, age, build, expression, clothing, and attitude to write a detailed voice description.\n\nThe output covers pitch, accent, pace, texture, emotional baseline, and personality-through-voice. It reads like a professional casting call brief. You can edit the result, then connect it downstream to the Text-to-Speech node or Dialogue Writer to shape how the character sounds.',
    connectsTo: ['Text-to-Speech', 'Dialogue Writer', 'Voice Clone'],
    connectsFrom: ['Main Stage Viewer', 'Front View', 'Back View', 'Side View', 'Character Identity', 'Character Description', 'Character Attributes'],
  },
  elDialogueWriter: {
    label: 'Dialogue Writer',
    color: '#388e3c',
    description: 'Describe what the character is talking about — a situation, a reaction, a conversation topic — and Gemini writes actual spoken dialogue lines in-character.\n\nChoose a line style (dialogue, monologue, battle cry, taunt, greeting, narrator VO), emotional tone, and how many lines to generate. Connect a Voice Designer node upstream and Gemini will match the speech patterns to the voice description. Connect Character Identity/Description/Attributes for personality context.\n\nOutput flows directly into Text-to-Speech to hear the lines spoken.',
    connectsTo: ['Text-to-Speech'],
    connectsFrom: ['Voice Designer', 'Character Identity', 'Character Description', 'Character Attributes', 'Any text node'],
  },

  // ── Containers ──
  uiFrame: {
    label: 'Frame',
    color: '#78909c',
    description: 'A visual container for organizing nodes on the canvas. Give it a name and resize it to group related nodes together.',
  },
  group: {
    label: 'Group',
    color: '#607d8b',
    description: 'A collapsible group of nodes. Select multiple nodes and right-click to create a group. Double-click to expand or collapse.',
  },

  // ── Gemini Studio ──
  gsPrompt: {
    label: 'Prompt',
    color: '#64b5f6',
    description: 'Type a text prompt for Gemini to generate from. This is the starting point for image or video generation in Gemini Studio.',
    connectsTo: ['Image Gen', 'Video Gen'],
  },
  gsImageRef: {
    label: 'Image Ref',
    color: '#4dd0e1',
    description: 'Load a reference image for Gemini to consider during generation. The AI uses it as visual context.',
    connectsTo: ['Image Gen', 'Video Gen'],
  },
  gsImageGen: {
    label: 'Image Gen',
    color: '#f06292',
    description: 'Generates images from a text prompt using Gemini. Connect a Prompt node and optionally an Image Ref.',
    connectsTo: ['Output Viewer'],
    connectsFrom: ['Prompt', 'Image Ref'],
  },
  gsVideoGen: {
    label: 'Video Gen',
    color: '#ba68c8',
    description: 'Generates short video clips from a text prompt using Gemini. Connect a Prompt node and optionally an Image Ref.',
    connectsTo: ['Output Viewer'],
    connectsFrom: ['Prompt', 'Image Ref'],
  },
  gsOutputViewer: {
    label: 'Output Viewer',
    color: '#e0e0e0',
    description: 'Displays generated images or videos. Right-click to copy or save. Supports zoom and pan.',
    connectsFrom: ['Image Gen', 'Video Gen'],
  },

  // ── Tool Editor ──
  teGeneric: {
    label: 'TE Node',
    color: '#607d8b',
    description: 'A generic node in the Tool Editor. Use it as a building block for custom tool layouts.',
  },
  teButton: {
    label: 'TE Button',
    color: '#42a5f5',
    description: 'A button element for Tool Editor layouts. Configure its label and behavior.',
  },
  teTextbox: {
    label: 'TE Text Box',
    color: '#66bb6a',
    description: 'A text input field for Tool Editor layouts. Users can type into this at runtime.',
  },
  teDropdown: {
    label: 'TE Dropdown',
    color: '#ffa726',
    description: 'A dropdown menu for Tool Editor layouts. Define options that users can select from.',
  },
  teImage: {
    label: 'TE Image',
    color: '#ab47bc',
    description: 'An image display element for Tool Editor layouts.',
  },
  teWindow: {
    label: 'TE Window',
    color: '#78909c',
    description: 'A window container with a title bar for Tool Editor layouts.',
  },
  teFrame: {
    label: 'TE Frame',
    color: '#8d6e63',
    description: 'A frame container for organizing elements in Tool Editor layouts.',
  },
};
