/* ────────────────────────────────────────
   ConceptLab — Influence Resolver
   Reads connected influence nodes via React Flow
   and builds an influence block for image prompts.
   ──────────────────────────────────────── */

interface NodeLike {
  id: string;
  type?: string;
  data: Record<string, unknown>;
}

interface EdgeLike {
  source: string;
  target: string;
}

/**
 * Given a target node ID, walks all incoming edges, finds influence nodes,
 * and returns a prompt block to prepend/append to the generation prompt.
 *
 * Call this from CharacterNode/WeaponNode before generating, passing
 * getNode/getEdges from useReactFlow.
 */
export function resolveNodeInfluences(
  targetNodeId: string,
  getNode: (id: string) => NodeLike | undefined,
  getEdges: () => EdgeLike[],
): string {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === targetNodeId);

  const parts: string[] = [];

  for (const edge of incoming) {
    const src = getNode(edge.source);
    if (!src?.type) continue;
    const data = src.data ?? {};

    switch (src.type) {
      case 'emotion': {
        const text = data.nodeText as string | undefined;
        if (text?.trim()) {
          parts.push(`[EMOTIONAL TONE] Infuse this character/weapon design with the feeling: "${text.trim()}". Let this mood influence the color palette, posture, wear patterns, and overall aesthetic.`);
        }
        break;
      }

      case 'influence': {
        const personName = data.nodeText as string | undefined;
        const notes = data.nodeNotes as string | undefined;
        if (personName?.trim()) {
          let p = `[CREATIVE INFLUENCE] Channel the design sensibility of ${personName.trim()}. Consider their visual style, signature aesthetics, and creative philosophy.`;
          if (notes?.trim()) p += ` Focus on: ${notes.trim()}.`;
          parts.push(p);
        }
        break;
      }

      case 'textInfluence': {
        const text = data.nodeText as string | undefined;
        if (text?.trim()) {
          parts.push(`[DESIGN CONTEXT] Incorporate the following creative direction into the design:\n"${text.trim()}"`);
        }
        break;
      }

      case 'documentInfluence': {
        const text = data.nodeText as string | undefined;
        const fileName = data.fileName as string | undefined;
        if (text?.trim()) {
          const label = fileName ? ` (from "${fileName}")` : '';
          parts.push(`[DOCUMENT REFERENCE] Apply concepts from this reference material${label} to the design:\n"${text.trim().slice(0, 500)}"`);
        }
        break;
      }

      case 'imageInfluence': {
        const desc = data.nodeText as string | undefined;
        if (desc?.trim()) {
          parts.push(`[VISUAL REFERENCE] The user provided a visual reference described as: "${desc.trim()}". Match the mood, palette, and style elements in this design.`);
        }
        break;
      }

      case 'linkInfluence': {
        const url = data.nodeText as string | undefined;
        const notes = data.nodeNotes as string | undefined;
        if (url?.trim()) {
          let p = `[LINK REFERENCE] Draw design inspiration from: ${url.trim()}.`;
          if (notes?.trim()) p += ` Notes: "${notes.trim()}"`;
          parts.push(p);
        }
        break;
      }
    }
  }

  if (parts.length === 0) return '';

  return (
    '\n\n[INFLUENCE DIRECTIVES]\n' +
    'The following creative influences shape this design. Synthesize them holistically — ' +
    'blend them into the visual direction rather than treating them as separate instructions.\n\n' +
    parts.map((p, i) => `${i + 1}. ${p}`).join('\n\n') +
    '\n\nApply these influences throughout the design.'
  );
}
