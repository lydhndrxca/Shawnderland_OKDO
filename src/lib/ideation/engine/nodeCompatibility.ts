/* ──────────────────────────────────────────────────────
   Node Compatibility Checker
   Validates connections between nodes and surfaces
   clear error messages when capabilities don't match.
   ────────────────────────────────────────────────────── */

export interface CompatError {
  nodeId: string;
  severity: 'error' | 'warning';
  message: string;
}

interface NodeInfo {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface EdgeInfo {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/* ── Capability declarations ── */

interface NodeCapabilities {
  providesImage: boolean;
  providesText: boolean;
  requiresImage: boolean;
  requiresText: boolean;
  requiresMultimodal: boolean;
  supportsMultimodal: boolean;
}

const NODE_CAPABILITIES: Record<string, Partial<NodeCapabilities>> = {
  // Pipeline stages — text-in, text-out
  seed:               { providesText: true },
  normalize:          { providesText: true, requiresText: true },
  diverge:            { providesText: true, requiresText: true },
  'critique-salvage': { providesText: true, requiresText: true },
  expand:             { providesText: true, requiresText: true },
  converge:           { providesText: true, requiresText: true },
  commit:             { providesText: true, requiresText: true },
  iterate:            { providesText: true, requiresText: true },

  // Influence nodes — provide text/data
  emotion:            { providesText: true },
  influence:          { providesText: true },
  textInfluence:      { providesText: true },
  documentInfluence:  { providesText: true },
  linkInfluence:      { providesText: true },
  imageInfluence:     { providesImage: true },
  videoInfluence:     {},

  // Output nodes
  textOutput:         { requiresText: true },
  imageOutput:        { requiresText: true },
  videoOutput:        { requiresText: true },

  // Utility nodes
  imageReference:     { providesImage: true },
  extractData:        { requiresImage: true, requiresMultimodal: true, providesText: true },

  // Input nodes
  count:              { providesText: true },

  // Control
  start:              { providesText: true },
  packedPipeline:     { providesText: true, requiresText: true },
  resultNode:         { providesText: true },

  // ConceptLab nodes
  character:          { providesImage: true, providesText: true },
  weapon:             { providesImage: true, providesText: true },
  turnaround:         { requiresImage: true, requiresMultimodal: true, providesImage: true },
};

function getCaps(type: string): NodeCapabilities {
  const partial = NODE_CAPABILITIES[type] ?? {};
  return {
    providesImage: partial.providesImage ?? false,
    providesText: partial.providesText ?? false,
    requiresImage: partial.requiresImage ?? false,
    requiresText: partial.requiresText ?? false,
    requiresMultimodal: partial.requiresMultimodal ?? false,
    supportsMultimodal: partial.supportsMultimodal ?? false,
  };
}

const FRIENDLY_NAMES: Record<string, string> = {
  seed: 'Idea Seed',
  normalize: 'Normalize',
  diverge: 'Diverge',
  'critique-salvage': 'Critique',
  expand: 'Expand',
  converge: 'Converge',
  commit: 'Commit',
  iterate: 'Iterate',
  textOutput: 'Text Output',
  imageOutput: 'Image Output',
  videoOutput: 'Video Output',
  imageReference: 'Image Reference',
  extractData: 'Extract Data',
  emotion: 'Emotion',
  influence: 'Persona',
  textInfluence: 'Text Influence',
  documentInfluence: 'Document Influence',
  imageInfluence: 'Image Influence',
  linkInfluence: 'Link Influence',
  videoInfluence: 'Video Influence',
  count: 'Count',
  start: 'Start',
  packedPipeline: 'Packed Pipeline',
  resultNode: 'Result',
  character: 'Character',
  weapon: 'Weapon',
  turnaround: 'Turnaround',
  group: 'Group',
};

function friendlyName(type: string): string {
  return FRIENDLY_NAMES[type] ?? type;
}

/* ── Validation rules ── */

export function validateNodeConnections(
  nodes: NodeInfo[],
  edges: EdgeInfo[],
): CompatError[] {
  const errors: CompatError[] = [];
  const nodeMap = new Map<string, NodeInfo>();
  for (const n of nodes) nodeMap.set(n.id, n);

  for (const node of nodes) {
    const type = node.type;
    if (!type || type === 'group') continue;

    const caps = getCaps(type);
    const incomingEdges = edges.filter((e) => e.target === node.id);
    const incomingSources = incomingEdges
      .map((e) => nodeMap.get(e.source))
      .filter(Boolean) as NodeInfo[];

    // 1. Turnaround requires an image-producing source
    if (type === 'turnaround') {
      const hasImageSource = incomingSources.some((src) => getCaps(src.type).providesImage);
      const hasCharOrWeapon = incomingSources.some(
        (src) => src.type === 'character' || src.type === 'weapon',
      );

      if (incomingSources.length === 0) {
        errors.push({
          nodeId: node.id,
          severity: 'warning',
          message: 'No input connected. Connect a Character or Weapon node to generate turnaround views.',
        });
      } else if (!hasCharOrWeapon && !hasImageSource) {
        const srcNames = incomingSources.map((s) => friendlyName(s.type)).join(', ');
        errors.push({
          nodeId: node.id,
          severity: 'error',
          message: `Incompatible source: ${srcNames} does not provide image data. Turnaround requires a Character, Weapon, or Image Reference node.`,
        });
      } else if (!hasCharOrWeapon && hasImageSource) {
        errors.push({
          nodeId: node.id,
          severity: 'warning',
          message: 'Connected to a generic image source. For best results, connect a Character or Weapon node.',
        });
      }
    }

    // 2. ExtractData requires an image source
    if (type === 'extractData') {
      const hasImageSource = incomingSources.some(
        (src) => getCaps(src.type).providesImage,
      );
      if (incomingSources.length > 0 && !hasImageSource) {
        const srcNames = incomingSources.map((s) => friendlyName(s.type)).join(', ');
        errors.push({
          nodeId: node.id,
          severity: 'error',
          message: `Incompatible source: ${srcNames} does not provide image data. Extract Data requires an Image Reference, Character, or Weapon node.`,
        });
      }
    }

    // 3. Text-only sources connected to nodes that need images
    if (caps.requiresImage && incomingSources.length > 0) {
      const onlyTextSources = incomingSources.every(
        (src) => getCaps(src.type).providesText && !getCaps(src.type).providesImage,
      );
      if (onlyTextSources && type !== 'extractData' && type !== 'turnaround') {
        errors.push({
          nodeId: node.id,
          severity: 'error',
          message: `This node requires image input, but all connected sources (${incomingSources.map((s) => friendlyName(s.type)).join(', ')}) only provide text.`,
        });
      }
    }

    // 4. Image-only source feeding text-only consumer
    if (caps.requiresText && !caps.requiresImage && incomingSources.length > 0) {
      for (const src of incomingSources) {
        const srcCaps = getCaps(src.type);
        if (srcCaps.providesImage && !srcCaps.providesText) {
          if (type !== 'extractData') {
            errors.push({
              nodeId: node.id,
              severity: 'warning',
              message: `${friendlyName(src.type)} provides images but ${friendlyName(type)} expects text. Consider adding an Extract Data node between them to convert image → text.`,
            });
          }
        }
      }
    }

    // 5. ImageOutput model-specific checks
    if (type === 'imageOutput') {
      const endpoint = node.data?.selectedModelEndpoint as string | undefined;
      const modelId = node.data?.selectedModelId as string | undefined;
      const isImagen = endpoint === 'imagen' || (modelId?.startsWith('imagen') ?? false);

      const hasImageOnlyInput = incomingSources.some(
        (src) => getCaps(src.type).providesImage && !getCaps(src.type).providesText,
      );
      if (isImagen && hasImageOnlyInput) {
        errors.push({
          nodeId: node.id,
          severity: 'error',
          message: `Imagen models are text-to-image only — they cannot accept reference images as input. Switch to a Gemini model for image-to-image generation, or remove the image connection.`,
        });
      }

      const hasImageSource = incomingSources.some(
        (src) => src.type === 'imageReference' || src.type === 'imageInfluence' ||
                 src.type === 'character' || src.type === 'weapon',
      );
      if (isImagen && hasImageSource) {
        errors.push({
          nodeId: node.id,
          severity: 'warning',
          message: `Imagen 4 does not support multimodal input (image + text). The connected image will be ignored. Use a Gemini image model if you want reference-based generation.`,
        });
      }
    }

    // 6. Connecting non-image nodes to character/weapon (they only accept influence text)
    if ((type === 'character' || type === 'weapon') && incomingSources.length > 0) {
      for (const src of incomingSources) {
        const isInfluence = [
          'emotion', 'influence', 'textInfluence', 'documentInfluence',
          'imageInfluence', 'linkInfluence', 'videoInfluence',
        ].includes(src.type);
        const isImageRef = src.type === 'imageReference';

        if (!isInfluence && !isImageRef) {
          const srcCaps = getCaps(src.type);
          if (!srcCaps.providesText && !srcCaps.providesImage) {
            errors.push({
              nodeId: node.id,
              severity: 'warning',
              message: `${friendlyName(src.type)} may not provide useful data to ${friendlyName(type)}. Try using Influence or Image Reference nodes instead.`,
            });
          }
        }
      }
    }

    // 7. Video influence connected to text-only pipeline stages
    if (incomingSources.some((src) => src.type === 'videoInfluence')) {
      const isTextOnlyStage = [
        'seed', 'normalize', 'diverge', 'critique-salvage',
        'expand', 'converge', 'commit', 'iterate',
      ].includes(type);
      if (isTextOnlyStage) {
        errors.push({
          nodeId: node.id,
          severity: 'warning',
          message: `Video Influence is connected but ${friendlyName(type)} is a text-only stage. The video content may not be processed. Consider using Text Influence instead.`,
        });
      }
    }
  }

  return errors;
}
