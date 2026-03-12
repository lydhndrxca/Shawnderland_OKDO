/**
 * Hover tooltip text for every node type across Shawnderland.
 * Format: short purpose + what to connect to.
 */

export const NODE_TOOLTIPS: Record<string, string> = {
  // ── Character nodes ──
  charIdentity:
    'Set character age, race, gender, and build. Connect output → Generate Character Image or Extract Attributes.',
  charDescription:
    'Write or receive a character description. Connect output → Generate Character Image.',
  charAttributes:
    'Detailed character attributes (hair, eyes, outfit, etc.). Connect output → Generate Character Image.',
  charExtractAttrs:
    'Analyze an image to extract identity, description, and attributes. Connect image input ← Image/Reference. Connect output → Identity, Description, Attributes.',
  charEnhanceDesc:
    'Enhance and expand a character description using AI. Connect input ← Description. Output auto-updates the connected Description node.',
  charGenerate:
    'Generate the main character image from all connected inputs. Connect inputs ← Identity, Description, Attributes, Style, References. Connect output → Main Stage Viewer, Front/Back/Side Views.',
  charGate:
    'On/Off toggle switch. When OFF, blocks data flow to downstream nodes. Place between any two nodes to control the connection.',
  charMainViewer:
    'Large resizable image viewer for the main stage view. Connect input ← Generate Character Image. Supports zoom (scroll), pan (middle-click), right-click menu.',
  charViewer:
    'Image viewer. Connect input ← any image source. Supports zoom, pan, and right-click context menu.',
  charImageViewer:
    'Image viewer. Connect input ← any image source. Supports zoom, pan, and right-click context menu.',
  charFrontViewer:
    'Front view image viewer. Connect input ← Generate Character Image (auto-generates front view).',
  charBackViewer:
    'Back view image viewer. Connect input ← Generate Character Image (auto-generates back view).',
  charSideViewer:
    'Side view image viewer. Connect input ← Generate Character Image (auto-generates side view).',
  charShowXML:
    'Displays full character XML configuration. Connect inputs ← Identity, Description, Attributes.',
  charQuickGen:
    'AI creates a random character instantly. Connect outputs → Identity, Description, Attributes.',
  charStyle:
    'Load style reference images and text. Connect output → Generate Character Image to influence visual style.',
  charRefCallout:
    'Annotate a reference image with specific callouts for generation. Connect input ← Image Reference. Connect output → Generate Character Image.',
  charGenViews:
    'Generate front/back/side multi-views from the main image. Connect input ← Generate Character Image.',
  charCustomView:
    'Generate a custom-angle view with a text prompt. Connect input ← Generate Character Image.',
  charRandomize:
    'Randomize character attributes. Connect output → Attributes, Identity.',
  charImageBucket:
    'Opens the generated images folder. Shows all saved outputs.',
  imageStudio:
    'Full-screen image editor with text editing, brush masking, and inpainting. Connect inputs ← any image viewer nodes. Click "Open Editor" to expand.',
  charSaveGroup:
    'Save connected images as a named group to Files. Connect image viewer nodes and click Save.',
  charUpscale:
    'AI-powered image upscaler using Imagen 4. Connect input ← any image viewer node. Choose x2, x3, or x4 and click Upscale.',
  charRestore:
    'Restore Quality — fixes accumulated artifacts from iterative editing. Sends the image through Gemini for a clean AI redraw, preserving all content while removing compression artifacts, noise, blur, and degradation. Optional Imagen upscale afterward.',
  charModelSettings:
    'Model Settings — Choose which AI models to use for image generation and multimodal tasks. Image Gen model handles main stage creation (text-to-image). Multimodal model handles ortho views, edits, and reference-based generation. Save as preset to persist across sessions.',
  charCreativeDirector:
    'Art Direction Output — Hollywood-level design critique. Auto-runs when Main Stage generates an image. Provides actionable design suggestions with Apply Edit to push changes back to the character.',
  // ── 3D Gen AI ──
  meshyImageTo3D:
    'Convert character images to a 3D model using Meshy AI. Connect inputs ← Main Stage Viewer, Front/Back/Side views. All Meshy API parameters exposed. Connect output → 3D Model Viewer.',
  hitem3dImageTo3D:
    'Image-to-3D via Hitem3D — finer mesh control, portrait models, resolution up to 1536pro, polygon slider 100K–2M, 5 output formats. Connect inputs ← image viewers. Connect output → 3D Model Viewer.',
  meshyModelViewer:
    '3D model viewer with orbit controls, wireframe, normals, materials toggles. Page through multiple models. Export as OBJ, GLB, FBX, or USDZ. Connect input ← Image→3D node.',

  // ── Audio AI (ElevenLabs) ──
  elTTS:
    'Text-to-Speech — generate character dialogue or narration with ElevenLabs voices. Select voice, model (v3, Flash, Multilingual), tune stability/clarity/style, and output as MP3/PCM/Opus. Connect text input ← any text source.',
  elSFX:
    'Sound Effects — describe any sound ("sword clash", "thunder crack", "footsteps on gravel") and ElevenLabs generates it. Control duration (up to 22s) and prompt influence. Connect text input ← any text source.',
  elVoiceScript:
    'AI writes character dialogue, narration, or battle cries using Gemini. Connect input ← Character Identity, Description, Attributes for context. Connect output → Text-to-Speech to hear it spoken.',
  elVoiceClone:
    'Voice Clone — upload a short audio sample (1-30s) to create an instant voice clone. Test the cloned voice with custom text. Connect audio input ← TTS or SFX output. Connect output → TTS to use cloned voice.',
  elVoiceDesigner:
    'Voice Designer — connect a character image and Gemini writes a detailed voice casting description (pitch, accent, pace, texture, personality). Connect input ← any image viewer. Connect output → TTS or Voice Clone.',
  elDialogueWriter:
    'Dialogue Writer — describe what the character is talking about and Gemini writes in-character spoken lines. Connect inputs ← Voice Designer, Identity, Description. Connect output → Text-to-Speech.',

  // ── Ideation / ShawnderMind nodes ──
  seed:
    'Starting idea seed. Type a prompt or attach an image/video/document. Connect output → any processing node.',
  normalize:
    'Normalize and clean up ideas. Connect input ← Seed or any idea source. Connect output → Diverge, Critique, or Expand.',
  diverge:
    'Generate multiple divergent variations of an idea. Connect input ← Normalize or Seed. Connect output → Critique or Converge.',
  converge:
    'Merge multiple ideas into a unified concept. Connect inputs ← multiple Diverge or Expand outputs.',
  critique:
    'AI critiques and scores ideas. Connect input ← Diverge or any idea source. Connect output → Iterate or Expand.',
  expand:
    'Expand and elaborate on an idea. Connect input ← any idea source. Connect output → Critique, Converge.',
  iterate:
    'Refine an idea through iterations. Connect input ← Critique or Expand.',
  commit:
    'Finalize and commit an idea. Connect input ← any processed idea.',
  count:
    'Count items in the pipeline. Connect input ← any node. Connect output → downstream.',
  textOutput:
    'Display text results. Connect input ← Extract Data, or any node producing text.',
  extractData:
    'Extract structured data from images, documents, or text. Connect input ← Image, Document, or Text source. Connect output → Text Output.',
  imageOutput:
    'Generate an image from connected context. Connect input ← any text or document source.',
  videoOutput:
    'Generate a video from connected context. Connect input ← any text, image, or document source.',
  preprompt:
    'Inject custom text at the beginning of a prompt. Connect output → any processing node input.',
  postprompt:
    'Inject custom text at the end of a prompt. Connect output → any processing node input.',

  // ── Influence nodes ──
  imageInfluence:
    'Attach a reference image to influence generation. Connect output → Extract Attributes, Generate Character Image, or any processing node.',
  videoInfluence:
    'Attach a reference video. Connect output → any processing node.',
  documentInfluence:
    'Attach a document (PDF, text). Connect output → Extract Data or any processing node.',
  textInfluence:
    'Attach reference text. Connect output → any processing node.',
  linkInfluence:
    'Attach a URL reference. Connect output → any processing node.',
  imageReference:
    'Load a reference image. Connect output → Reference Callout or Generate Character Image.',

  emotion:
    'Define emotional tone for generation. Connect output → any generation node.',
  group:
    'Group container for organizing nodes. Select multiple nodes and group them.',

  // ── Gemini Studio ──
  gsPrompt:
    'Text prompt input. Connect output → Image Gen or Video Gen.',
  gsImageRef:
    'Reference image input. Connect output → Image Gen or Video Gen.',
  gsImageGen:
    'Text-to-image generation. Connect inputs ← Prompt, Image Ref. Connect output → Output Viewer.',
  gsVideoGen:
    'Text-to-video generation. Connect inputs ← Prompt, Image Ref. Connect output → Output Viewer.',
  gsOutputViewer:
    'View and export generated media. Connect input ← Image Gen or Video Gen.',

  // ── UI / Containers ──
  uiFrame:
    'Layout frame for visually grouping nodes. Double-click the label to rename it.',
};

export default NODE_TOOLTIPS;
