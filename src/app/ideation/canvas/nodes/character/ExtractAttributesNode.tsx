"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  EXTRACT_ATTRIBUTES_PROMPT,
  ATTRIBUTE_GROUPS,
  BUILD_OPTIONS,
  AGE_OPTIONS,
  RACE_OPTIONS,
  GENDER_OPTIONS,
} from '@/lib/ideation/engine/conceptlab/characterPrompts';
import { generateText, type GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const DESCRIBE_IMAGE_PROMPT = `You are a forensic-level character appearance analyst. Study this image with extreme precision and write a DETAILED head-to-toe description that another artist could use to recreate this EXACT character.

STRUCTURE your description in this exact order:

1. FACE & HEAD: Exact skin tone (not just "pale" — specify undertone), eye color and any unusual qualities (e.g. milky, glowing, heterochromia), eyebrow shape/color, lip color/shape, facial marks/scars/tattoos, makeup details. Hair: exact color (platinum blonde vs ash blonde vs silver-white), length, texture (straight/wavy/curly), styling, parting.

2. NECK & UPPER BODY: Necklaces/chokers (exact pendant shapes, materials, chain type), visible tattoos/marks/scars on chest/neck (describe symbol, size, placement precisely), collar details.

3. TORSO CLOTHING: Layer by layer from outermost to innermost. For EACH layer specify: garment type, exact material (leather, velvet, cotton, mesh), color, construction details (buttons, zippers, lacing, studs — count/pattern/placement), fit (tight, loose, cropped), and condition.

4. ARMS & HANDS: Sleeve details, gloves or bare hands, rings (which fingers, material, design), bracelets, watches, arm tattoos.

5. LOWER BODY: Skirt/pants type, material, length, shape (A-line, pencil, high-low hem). Underneath layers: stockings/tights/fishnets (material, color, opacity). Specify if legs are bare.

6. FOOTWEAR: Boot/shoe type, height (ankle, mid-calf, knee-high), material, color, closure (laces, zippers, buckles), sole type, condition.

RULES:
- Be SPECIFIC not generic. "Black studded leather jacket with three rows of silver dome studs along each sleeve" NOT "studded leather jacket".
- Name exact colors: "milky white with no visible iris" NOT "light eyes".
- If something is UNIQUE or DISTINCTIVE (unusual eyes, tattoos, specific jewelry), emphasize it prominently.
- Body build MUST use one of: ${BUILD_OPTIONS.join(', ')}.
- If any body part is cropped/hidden, extrapolate confidently from the visible style. Never say "not visible".
- Do NOT describe pose, actions, background, or setting.
- Return ONLY the description text, no JSON or formatting.`;

function bestMatch(value: string, options: string[]): string {
  if (!value) return '';
  const v = value.toLowerCase().trim();
  const exact = options.find((o) => o.toLowerCase() === v);
  if (exact) return exact;
  const contains = options.find((o) => o.toLowerCase().includes(v) || v.includes(o.toLowerCase()));
  if (contains) return contains;
  const firstWord = v.split(/[\s,()/]+/)[0];
  const partial = options.find((o) => o.toLowerCase().startsWith(firstWord));
  if (partial) return partial;
  return value;
}

function findUpstreamImage(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): GeneratedImage | null {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === nodeId);
  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;
    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) return img;
    const b64 = d.imageBase64 as string | undefined;
    if (b64) return { base64: b64, mimeType: (d.mimeType as string) || 'image/png' };
  }
  return null;
}

function ExtractAttributesNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState((data?.resultText as string) ?? '');
  const [userHint, setUserHint] = useState((data?.userHint as string) ?? '');

  const pushToDownstream = useCallback(
    (description: string, json: Record<string, string>) => {
      const edges = getEdges();
      const outgoing = edges.filter((e) => e.source === id);

      setNodes((nds) =>
        nds.map((n) => {
          const outEdge = outgoing.find((e) => e.target === n.id);
          if (!outEdge) return n;

          const nd = n.data as Record<string, unknown>;
          const updates: Record<string, unknown> = {};

          if (n.type === 'charIdentity') {
            updates.identity = {
              age: bestMatch(json.age ?? '', AGE_OPTIONS),
              race: bestMatch(json.race ?? '', RACE_OPTIONS),
              gender: bestMatch(json.gender ?? '', GENDER_OPTIONS),
              build: bestMatch(json.build ?? '', BUILD_OPTIONS),
            };
          } else if (n.type === 'charDescription') {
            updates.description = description;
          } else if (n.type === 'charAttributes') {
            const attrs: Record<string, string> = {};
            for (const g of ATTRIBUTE_GROUPS) {
              if (json[g.key]) attrs[g.key] = json[g.key];
            }
            updates.attributes = { ...(nd.attributes as Record<string, string> ?? {}), ...attrs };
          }

          if (Object.keys(updates).length === 0) return n;
          return { ...n, data: { ...nd, ...updates } };
        }),
      );
    },
    [id, getEdges, setNodes],
  );

  const handleExtract = useCallback(async () => {
    const img = findUpstreamImage(id, getNode, getEdges);
    if (!img) {
      setError('Connect an image source (ImageReference or generated image) first.');
      return;
    }
    setGenerating(true);
    setError(null);
    setStatus('Describing character...');
    try {
      const hint = userHint.trim();

      // Parse user exclusion terms upfront — used for prompt AND post-processing
      const excludeTerms: string[] = [];
      if (hint) {
        const patterns = [
          /\b(?:no|ignore|remove|without|exclude|skip|drop|omit)\s+(?:the\s+)?(.+)/gi,
        ];
        for (const pat of patterns) {
          let m: RegExpExecArray | null;
          while ((m = pat.exec(hint)) !== null) {
            const raw = m[1].toLowerCase().split(/[,;&]+/).map((t) => t.trim()).filter(Boolean);
            excludeTerms.push(...raw);
          }
        }
      }

      // Place user override BEFORE the main instruction so the AI processes it first
      const excludeList = excludeTerms.length > 0
        ? `ITEMS TO COMPLETELY EXCLUDE (pretend they do not exist in the image): ${excludeTerms.join(', ')}\n`
        : '';

      const descHintBlock = hint
        ? `⚠️ MANDATORY USER OVERRIDE — HIGHEST PRIORITY:\n${excludeList}${hint}\nIf the user says to ignore/exclude/remove any item, that item MUST NOT appear ANYWHERE in your description. Write as if it does not exist. Do not mention it even indirectly.\n\n`
        : '';

      const attrHintBlock = hint
        ? `\n\n⚠️ MANDATORY USER OVERRIDE — HIGHEST PRIORITY (overrides "no none values" rule):\n${excludeList}${hint}\nIf the user says "no [item]", "ignore [item]", "remove [item]", "without [item]", or "exclude [item]", you MUST set ANY field that would describe that item to "none". For example: "no tool belt" → "waist": "none", "handprop": "none". "no hat" → "headwear": "none". This overrides everything else.`
        : '';

      // Step 1: image → prose description (user override BEFORE the main prompt)
      const description = await generateText(descHintBlock + DESCRIBE_IMAGE_PROMPT, img);

      // Post-process description: remove sentences that mention excluded items
      let cleanDescription = description;
      if (excludeTerms.length > 0) {
        const sentences = description.split(/(?<=[.!?])\s+/);
        cleanDescription = sentences
          .filter((sentence) => {
            const lower = sentence.toLowerCase();
            return !excludeTerms.some((term) => lower.includes(term));
          })
          .join(' ');
      }

      setStatus('Extracting identity and attributes...');

      // Step 2: description → structured JSON attributes
      const attrPrompt = `${EXTRACT_ATTRIBUTES_PROMPT}${attrHintBlock}\n\nCHARACTER DESCRIPTION:\n${cleanDescription}`;
      const attrText = await generateText(attrPrompt, img);

      const combined = `Description:\n${cleanDescription}\n\nAttributes:\n${attrText}`;
      setResultText(combined);
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, resultText: combined } } : n)),
      );

      const json = JSON.parse(attrText.replace(/```json?\n?/g, '').replace(/```/g, '').trim());

      // Post-process: scrub attributes matching user exclusion patterns
      if (excludeTerms.length > 0) {
        for (const key of Object.keys(json)) {
          const val = (json[key] ?? '').toLowerCase();
          for (const term of excludeTerms) {
            if (val.includes(term)) {
              json[key] = 'none';
              break;
            }
          }
        }
      }

      pushToDownstream(cleanDescription, json);
      setStatus('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('');
    } finally {
      setGenerating(false);
    }
  }, [id, getNode, getEdges, setNodes, pushToDownstream, userHint]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charExtractAttrs}>
      <div className="char-node-header" style={{ background: '#ffab40' }}>
        Extract Attributes
      </div>
      <div className="char-node-body">
        <textarea
          className="char-textarea nodrag nopan nowheel"
          value={userHint}
          onChange={(e) => {
            const v = e.target.value;
            setUserHint(v);
            setNodes((nds) =>
              nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, userHint: v } } : n)),
            );
          }}
          placeholder="Optional: focus on armor details, ignore background, treat hair as blonde..."
          rows={2}
          style={{ fontSize: 11, minHeight: 36 }}
        />
        <button className="char-btn primary nodrag" onClick={handleExtract} disabled={generating}>
          {generating ? 'Extracting...' : 'Extract Attributes'}
        </button>
        {generating && status && <div className="char-progress">{status}</div>}
        {error && <div className="char-error">{error}</div>}
        {resultText && (
          <div className="char-scroll-area nodrag nowheel" style={{ maxHeight: 200 }}>
            <pre style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {resultText.slice(0, 1000)}
            </pre>
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="image-in" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(ExtractAttributesNodeInner);
