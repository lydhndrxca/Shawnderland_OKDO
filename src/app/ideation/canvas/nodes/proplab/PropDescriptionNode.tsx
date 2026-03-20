"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { TextModelId } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { generateText } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import TextModelSelector from '@/components/TextModelSelector';
import { PROP_ATTRIBUTE_GROUPS } from '@/lib/ideation/engine/conceptlab/propPrompts';
import '../character/CharacterNodes.css';
import './PropLabNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const ATTR_KEYS = PROP_ATTRIBUTE_GROUPS.map((g) => g.key);

const POPULATE_PROMPT = `You are a senior environment artist and prop designer. Given a prop description, fully design the prop with every detail. Use the description as your creative brief and INFER plausible details.

Output ONLY valid JSON with no markdown fencing:
{
  "identity": { "propType": string, "setting": string, "condition": string, "scale": string },
  "attributes": { ${ATTR_KEYS.map((k) => `"${k}": string`).join(', ')} }
}

Rules for identity:
- propType: the category (furniture, vehicle, weapon, etc.)
- setting: the era/period (medieval, futuristic, etc.)
- condition: wear level (pristine, moderate-wear, etc.)
- scale: size reference (hand-held, furniture-scale, etc.)

Rules for attributes:
- Be HYPER-SPECIFIC about materials, surface finish, wear patterns, color
- Describe textures, functional elements, lighting effects
- Only write "none" if truly not applicable`;

function PropDescriptionNodeInner({ id, data, selected }: Props) {
  const { setNodes, getEdges } = useReactFlow();
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
        `${POPULATE_PROMPT}\n\nPROP DESCRIPTION:\n${desc}`,
        undefined,
        textModel,
      );

      const jsonStr = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      const identity = parsed.identity && typeof parsed.identity === 'object'
        ? {
            propType: String(parsed.identity.propType ?? ''),
            setting: String(parsed.identity.setting ?? ''),
            condition: String(parsed.identity.condition ?? ''),
            scale: String(parsed.identity.scale ?? ''),
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

          if (n.type === 'propIdentity' && identity) {
            const nd = n.data as Record<string, unknown>;
            const locks = (nd.lockedAttrs as Record<string, boolean>) ?? {};
            const existing = (nd.identity as Record<string, string>) ?? {};
            const mergedIdentity = {
              propType: locks.propType ? existing.propType : identity.propType,
              setting: locks.setting ? existing.setting : identity.setting,
              condition: locks.condition ? existing.condition : identity.condition,
              scale: locks.scale ? existing.scale : identity.scale,
            };
            return { ...n, data: { ...n.data, identity: mergedIdentity, name: nd.name ?? '' } };
          }
          if (n.type === 'propAttributes' && attributes) {
            const existing = (n.data as Record<string, unknown>).attributes as Record<string, string> | undefined;
            const locks = (n.data as Record<string, unknown>).lockedAttrs as Record<string, boolean> | undefined;
            const merged = { ...(existing ?? {}) };
            for (const [key, val] of Object.entries(attributes)) {
              if (locks?.[key]) continue;
              merged[key] = typeof val === 'string' ? val : String(val ?? '');
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
    <div
      className={`char-node ${selected ? 'selected' : ''}`}
      title="Prop description — connect to Prop Identity and Prop Attributes; use Populate to fill from AI."
    >
      <div className="char-node-header" style={{ background: '#5c6bc0', gap: 6 }}>
        <span>Prop Description</span>
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
          placeholder="Describe the prop — what it is, its purpose, visual appearance, context..."
          rows={5}
        />
        <button
          type="button"
          className="char-btn nodrag"
          onClick={handlePopulate}
          disabled={populating || !description.trim()}
          title="Analyze description with AI and populate connected Prop Identity and Prop Attributes nodes"
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

export default memo(PropDescriptionNodeInner);
