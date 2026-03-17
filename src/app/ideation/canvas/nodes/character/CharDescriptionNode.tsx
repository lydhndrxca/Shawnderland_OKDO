"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { TextModelId } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { generateText } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import TextModelSelector from '@/components/TextModelSelector';
import { ATTRIBUTE_GROUPS } from '@/lib/ideation/engine/conceptlab/characterPrompts';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const ATTR_KEYS = ATTRIBUTE_GROUPS.map((g) => g.key);

const POPULATE_PROMPT = `You are a senior character concept artist and costume designer. Given a character description, your job is to FULLY DESIGN the character from head to toe — filling in EVERY detail, even those not explicitly stated. Use the description as your creative brief and INFER plausible, interesting, character-appropriate details for everything.

CRITICAL: Do NOT write "none" unless the character truly would NOT have that item (e.g. a modern soldier wouldn't have jewelry). If something isn't mentioned, INVENT a fitting detail. A fisherman needs boots, gloves, outerwear, a hat. A soldier needs gear, a rig, footwear. Think like a costume designer dressing an actor — every slot gets filled with something specific and visually interesting.

Output ONLY valid JSON with no markdown fencing.

The JSON must have two top-level keys:
1. "identity" — an object with exactly these string fields: "age", "race", "gender", "build". Use concise, natural descriptions (e.g. "Late 30s", "Caucasian", "Male", "Athletic, broad-shouldered"). Infer race/ethnicity from context clues if possible.
2. "attributes" — an object with string fields for each of these keys: ${ATTR_KEYS.map((k) => `"${k}"`).join(', ')}, "pose".

Rules for attributes:
- EVERY field should have a rich, specific, visual description (materials, colors, condition, wear)
- For clothing: specify the exact garment, material, color, fit, and condition (e.g. "Heavy oilskin slicker — dark yellow, salt-crusted, torn left pocket, toggle closures")
- For physical features: be precise and cinematic (e.g. "Deep crow's feet, wind-burned cheeks, salt-white eyebrows")
- For gear/accessories: choose items that tell the character's story and match their world
- Garment condition should reflect the character's lifestyle
- Color accents should form a cohesive palette
- Only write "none" if the character genuinely would not have that item at all
- Think head-to-toe: hat, face, neck, layers, hands, belt/rig, legs, feet, accessories, props`;

function CharDescriptionNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();
  const [description, setDescription] = useState((data?.description as string) ?? '');
  const [textModel, setTextModel] = useState<TextModelId>((data?.textModel as TextModelId) ?? 'fast');
  const [populating, setPopulating] = useState(false);
  const [populateError, setPopulateError] = useState<string | null>(null);
  const localEdit = useRef(false);

  useEffect(() => {
    const external = (data?.description as string) ?? '';
    if (!localEdit.current && external !== description) {
      setDescription(external);
    }
    localEdit.current = false;
  }, [data?.description]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const restored = (data?.textModel as TextModelId) ?? 'fast';
    if (restored !== textModel) setTextModel(restored);
  }, [data?.textModel]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const handlePopulate = useCallback(async () => {
    const desc = description.trim();
    if (!desc) return;
    setPopulating(true);
    setPopulateError(null);

    try {
      const result = await generateText(
        `${POPULATE_PROMPT}\n\nCHARACTER DESCRIPTION:\n${desc}`,
        undefined,
        textModel,
      );

      const jsonStr = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      const identity = parsed.identity && typeof parsed.identity === 'object'
        ? {
            age: parsed.identity.age || '',
            race: parsed.identity.race || '',
            gender: parsed.identity.gender || '',
            build: parsed.identity.build || '',
          }
        : null;

      const attributes = parsed.attributes && typeof parsed.attributes === 'object'
        ? parsed.attributes as Record<string, string>
        : null;

      const edges = getEdges();
      const connectedIds = new Set<string>();
      const queue = [id];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (connectedIds.has(cur)) continue;
        connectedIds.add(cur);
        for (const e of edges) {
          if (e.source === cur && !connectedIds.has(e.target)) queue.push(e.target);
          if (e.target === cur && !connectedIds.has(e.source)) queue.push(e.source);
        }
      }

      setNodes((nds) =>
        nds.map((n) => {
          if (!connectedIds.has(n.id)) return n;

          if (n.type === 'charIdentity' && identity) {
            const nd = n.data as Record<string, unknown>;
            const locks = (nd.lockedAttrs as Record<string, boolean>) ?? {};
            const existing = (nd.identity as Record<string, string>) ?? {};
            const mergedIdentity = {
              age: locks.age ? existing.age : identity.age,
              race: locks.race ? existing.race : identity.race,
              gender: locks.gender ? existing.gender : identity.gender,
              build: locks.build ? existing.build : identity.build,
            };
            return { ...n, data: { ...n.data, identity: mergedIdentity, name: nd.name ?? '' } };
          }
          if (n.type === 'charAttributes' && attributes) {
            const existing = (n.data as Record<string, unknown>).attributes as Record<string, string> | undefined;
            const locks = (n.data as Record<string, unknown>).lockedAttrs as Record<string, boolean> | undefined;
            const merged = { ...(existing ?? {}) };
            for (const [key, val] of Object.entries(attributes)) {
              if (locks?.[key]) continue;
              merged[key] = val;
            }
            return { ...n, data: { ...n.data, attributes: merged } };
          }
          return n;
        }),
      );
    } catch (e) {
      setPopulateError(e instanceof Error ? e.message : String(e));
    } finally {
      setPopulating(false);
    }
  }, [id, description, textModel, getEdges, setNodes]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charDescription}>
      <div className="char-node-header" style={{ background: '#5c6bc0', gap: 6 }}>
        <span>Character Description</span>
        <span style={{ marginLeft: 'auto' }}>
          <TextModelSelector
            value={textModel}
            onChange={(m) => { setTextModel(m); persist({ textModel: m }); }}
            disabled={populating}
          />
        </span>
      </div>
      <div className="char-node-body">
        <textarea
          className="char-textarea nodrag nowheel"
          value={description}
          onChange={(e) => {
            const v = e.target.value;
            localEdit.current = true;
            setDescription(v);
            persist({ description: v });
          }}
          placeholder="Describe your character concept — appearance, personality, context..."
          rows={5}
        />
        <button
          type="button"
          className="char-btn nodrag"
          onClick={handlePopulate}
          disabled={populating || !description.trim()}
          title="Analyze description with AI and populate connected Identity and Attributes nodes"
          style={{ width: '100%', marginTop: 4, fontWeight: 600 }}
        >
          {populating ? 'Populating…' : 'Populate Identity & Attributes'}
        </button>
        {populateError && <div className="char-error" style={{ fontSize: 10, marginTop: 4 }}>{populateError}</div>}
      </div>

      <Handle type="target" position={Position.Left} id="desc-in" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="desc-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(CharDescriptionNodeInner);
