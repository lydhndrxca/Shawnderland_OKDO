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
    'Generate the main character image from all connected inputs. Connect inputs ← Identity, Description, Attributes, Style, References. Connect output → History, Main Stage Viewer, Front/Back/Side Views.',
  charGate:
    'On/Off toggle switch. When OFF, blocks data flow to downstream nodes. Place between any two nodes to control the connection.',
  charMainViewer:
    'Large resizable image viewer for the main stage view. Connect input ← Generate Character Image or History. Supports zoom (scroll), pan (middle-click), right-click menu.',
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
  charEdit:
    'Apply text-based edits to character images. Connect directly to Main Stage, Front, Back, and Side viewers. Toggle which views to edit. All views reference the Main Stage image as the base character. Only main stage edits are logged in History.',
  charHistory:
    'Tracks generation history with state snapshots. Connect input ← Generate Character Image. Connect output → Main Stage Viewer. Click entries to restore past states.',
  charReset:
    'Clears all character data in connected nodes. Connect to Identity, Description, Attributes nodes.',
  charSendPS:
    'Send images to Adobe Photoshop. Connect input ← any viewer node with a generated image.',
  charShowXML:
    'Displays full character XML configuration. Connect inputs ← Identity, Description, Attributes.',
  charQuickGen:
    'AI creates a random character instantly. Connect outputs → Identity, Description, Attributes. Click "Description + Image" to also generate an image through the chain.',
  charStyle:
    'Load style reference images and text. Connect output → Generate Character Image to influence visual style.',
  charRefCallout:
    'Annotate a reference image with specific callouts for generation. Connect input ← Image Reference. Connect output → Generate Character Image.',
  charGenViews:
    'Generate front/back/side multi-views from the main image. Connect input ← Generate Character Image. Connect outputs → Front, Back, Side Viewers.',
  charProject:
    'Project settings (read-only). Shows global output directory. Click "Open Global Settings" to change.',
  charCustomView:
    'Generate a custom-angle view with a text prompt. Connect input ← Generate Character Image.',
  charRandomize:
    'Randomize character attributes. Connect output → Attributes, Identity.',
  charImageBucket:
    'Opens the generated images folder on disk. Shows all saved outputs.',

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
  result:
    'Display final results with scores and summaries. Connect input ← Critique, Expand, or Commit.',
  count:
    'Count items in the pipeline. Connect input ← any node. Connect output → downstream.',
  start:
    'Pipeline start trigger. Connect output → Seed or first processing node.',
  packedPipeline:
    'Run the full Seed → Normalize → Diverge → Critique pipeline in one step.',
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

  // ── Concept Lab specific ──
  character:
    'Character concept node. Define and generate character concepts.',
  weapon:
    'Weapon concept node. Define and generate weapon concepts with multi-view turnarounds.',
  turnaround:
    'Generate turnaround views of a concept. Connect input ← Character or Weapon node.',
  emotion:
    'Define emotional tone for generation. Connect output → any generation node.',
  group:
    'Group container for organizing nodes. Select multiple nodes and group them.',
};

export default NODE_TOOLTIPS;
