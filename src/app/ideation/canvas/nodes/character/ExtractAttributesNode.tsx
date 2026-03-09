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

const DESCRIBE_IMAGE_PROMPT = `Analyze this image and write a 2-3 paragraph FULL-BODY character appearance summary — from head to toe — even if the image only shows part of the character.
Focus on appearance: age, race, build, face, hair (color, length, texture, style), and clothing/gear from head to toe (materials, colors, condition, fit).
Do NOT describe actions, pose, or what the person is doing. Do NOT mention background, setting, environment, or props outside the outfit.
IMPORTANT: Explicitly state the body build using ONE of these exact terms: ${BUILD_OPTIONS.join(', ')}.
Also describe body size/weight in plain language so it is unmistakable.
CRITICAL: You must describe the ENTIRE character head-to-toe. If any part of the body is cropped, obscured, or not shown (lower body, feet, hands, back), you MUST extrapolate and describe what those parts would look like — design appropriate clothing, footwear, gloves, accessories, etc. that match the visible style, materials, era, and color palette. Write your extrapolations as confident descriptions, not guesses. NEVER say "not visible", "not shown", or "unknown".
Return ONLY the description text, no JSON or formatting.`;

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
      // Step 1: image → prose description (matches original tool)
      const description = await generateText(DESCRIBE_IMAGE_PROMPT, img);

      setStatus('Extracting identity and attributes...');

      // Step 2: description → structured JSON attributes
      const attrPrompt = `${EXTRACT_ATTRIBUTES_PROMPT}\n\nCHARACTER DESCRIPTION:\n${description}`;
      const attrText = await generateText(attrPrompt, img);

      const combined = `Description:\n${description}\n\nAttributes:\n${attrText}`;
      setResultText(combined);
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, resultText: combined } } : n)),
      );

      const json = JSON.parse(attrText.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
      pushToDownstream(description, json);
      setStatus('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('');
    } finally {
      setGenerating(false);
    }
  }, [id, getNode, getEdges, setNodes, pushToDownstream]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charExtractAttrs}>
      <div className="char-node-header" style={{ background: '#ffab40' }}>
        Extract Attributes
      </div>
      <div className="char-node-body">
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
