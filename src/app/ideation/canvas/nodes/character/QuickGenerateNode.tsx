"use client";

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  ATTRIBUTE_GROUPS,
  buildCharacterDescription,
  buildCharacterViewPrompt,
  type CharacterIdentity,
  type CharacterAttributes,
} from '@/lib/ideation/engine/conceptlab/characterPrompts';
import { generateText, generateWithNanoBanana } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { getGlobalSettings } from '@/lib/globalSettings';
import { createProcessingAnimator } from '@/lib/processingAnimation';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const VIEWER_NODE_TYPES: Record<string, string> = {
  charMainViewer: 'main',
  charViewer: 'main',
  charImageViewer: 'main',
  charFrontViewer: 'front',
  charBackViewer: 'back',
  charSideViewer: 'side',
};

const ATTR_KEYS = ATTRIBUTE_GROUPS.map((g) => g.key);

const CREATIVE_PROMPT = `You are a world-class character designer for film, games, and animation. Invent a UNIQUE, compelling, original character from scratch. Be creative — avoid generic or obvious choices. Mix unexpected influences.

Return ONLY a JSON object with this exact structure (no markdown, no backticks):
{
  "name": "character name",
  "age": "specific age description (e.g. 'Late 30s', 'Early 20s')",
  "race": "ethnicity/race",
  "gender": "gender",
  "build": "body type description",
  "description": "2-3 sentence character concept — who they are, what they do, what makes them interesting",
  ${ATTR_KEYS.map((k) => `"${k}": "detailed description of their ${k}"`).join(',\n  ')}
}

Every field must be filled with specific, vivid, visual detail. Don't use generic terms — describe exact colors, materials, wear patterns, and style details. Make the character feel like they have a real life and history.`;

function fireAndForgetSave(image: GeneratedImage, viewName: string, charName: string) {
  const outputDir = getGlobalSettings().outputDir;
  if (!outputDir) return;
  fetch('/api/character-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base64: image.base64,
      mimeType: image.mimeType,
      charName: charName || 'character',
      viewName,
      outputDir,
      appKey: 'concept-lab',
      contentType: 'characters',
    }),
  }).catch((e) => console.warn('[quick-gen save]', e));
}

function QuickGenerateNodeInner({ id, data, selected }: Props) {
  const { setNodes, setEdges, getNode, getEdges } = useReactFlow();
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const getConnectedNodeIds = useCallback(() => {
    const edges = getEdges();
    const targets = new Set<string>();
    for (const e of edges) {
      if (e.source === id) targets.add(e.target);
      if (e.target === id) targets.add(e.source);
    }
    return targets;
  }, [id, getEdges]);

  const findDownstreamByType = useCallback((targetTypes: Set<string>) => {
    const edges = getEdges();
    const found: string[] = [];
    const visited = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const outgoing = edges.filter((e) => e.source === current);
      for (const e of outgoing) {
        const target = getNode(e.target);
        if (!target || visited.has(target.id)) continue;
        if (target.type === 'charGate') {
          const gd = target.data as Record<string, unknown>;
          if (!(gd.enabled as boolean ?? true)) continue;
        }
        if (targetTypes.has(target.type ?? '')) found.push(target.id);
        queue.push(target.id);
      }
    }
    return found;
  }, [id, getNode, getEdges]);

  const pushData = useCallback(
    (identity: CharacterIdentity, attributes: CharacterAttributes, description: string, charName?: string): number => {
      const connected = getConnectedNodeIds();
      let pushed = 0;
      setNodes((nds) =>
        nds.map((n) => {
          if (!connected.has(n.id)) return n;
          if (n.type === 'charIdentity') {
            pushed++;
            return { ...n, data: { ...n.data, identity, name: charName ?? '' } };
          }
          if (n.type === 'charDescription') {
            pushed++;
            return { ...n, data: { ...n.data, description } };
          }
          if (n.type === 'charAttributes') {
            pushed++;
            const d = n.data as Record<string, unknown>;
            const existingAttrs = (d.attributes as CharacterAttributes) ?? {};
            const merged = {
              ...attributes,
              pose: existingAttrs.pose || 'Pose — relaxed A-stance, hands at sides',
            };
            return { ...n, data: { ...n.data, attributes: merged } };
          }
          return n;
        }),
      );
      return pushed;
    },
    [getConnectedNodeIds, setNodes],
  );

  const generateCharacter = useCallback(async () => {
    setStatus('AI is inventing a character…');
    const raw = await generateText(CREATIVE_PROMPT);
    if (!mountedRef.current || cancelledRef.current) return null;

    let parsed: Record<string, string>;
    try {
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Could not parse AI response as JSON');
    }

    const identity: CharacterIdentity = {
      age: parsed.age || 'Mid 30s',
      race: parsed.race || 'Mixed',
      gender: parsed.gender || 'Male',
      build: parsed.build || 'Athletic',
    };

    const attributes: CharacterAttributes = {};
    for (const key of ATTR_KEYS) {
      attributes[key] = parsed[key] || '';
    }

    const description = parsed.description || '';
    const name = parsed.name || '';

    return { identity, attributes, description, name };
  }, []);

  const runDescriptionOnly = useCallback(async () => {
    if (generating) return;
    cancelledRef.current = false;
    setGenerating(true);
    setError(null);
    setLastResult(null);
    const anim = createProcessingAnimator(setNodes, setEdges, getEdges);
    try {
      anim.markNodes([id], true);
      anim.markEdgesFrom(id, true);

      const result = await generateCharacter();
      if (!result || !mountedRef.current || cancelledRef.current) return;

      const { identity, attributes, description, name } = result;
      setStatus('Filling out connected nodes…');

      attributes.pose = 'Relaxed A-stance, hands at sides';
      const pushed = pushData(identity, attributes, description, name);
      const summary = `${name || identity.gender}, ${identity.age}, ${identity.race}`;
      setLastResult(pushed > 0
        ? `Created: ${summary} → pushed to ${pushed} node(s)`
        : `Created: ${summary} — connect Identity/Description/Attributes nodes`);
      setStatus('');
    } catch (e) {
      if (cancelledRef.current) return;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('abort')) return;
      console.error('[QuickGen] error:', e);
      if (mountedRef.current) setError(msg);
      setStatus('');
    } finally {
      if (mountedRef.current) setGenerating(false);
      anim.clearAll();
    }
  }, [generating, id, pushData, generateCharacter, setNodes, setEdges, getEdges]);

  const runDescriptionAndImage = useCallback(async () => {
    if (generating) return;
    cancelledRef.current = false;
    setGenerating(true);
    setError(null);
    setLastResult(null);
    const anim = createProcessingAnimator(setNodes, setEdges, getEdges);
    try {
      anim.markNodes([id], true);
      anim.markEdgesFrom(id, true);

      const result = await generateCharacter();
      if (!result || !mountedRef.current || cancelledRef.current) return;

      const { identity, attributes, description, name } = result;
      attributes.pose = 'Relaxed A-stance, hands at sides';
      setStatus('Pushing to connected nodes…');
      pushData(identity, attributes, description, name);

      if (!mountedRef.current || cancelledRef.current) return;

      setStatus('Generating character image (Nano Banana 2)…');
      const generateNodeIds = findDownstreamByType(new Set(['charGenerate']));
      anim.markNodes(generateNodeIds, true);

      const mainViewerTypes = new Set(['charMainViewer', 'charViewer', 'charImageViewer']);
      const viewerNodeIds = findDownstreamByType(new Set(Object.keys(VIEWER_NODE_TYPES)));
      const mainViewerIds = new Set<string>();
      for (const vId of viewerNodeIds) {
        const vNode = getNode(vId);
        if (vNode && mainViewerTypes.has(vNode.type ?? '')) mainViewerIds.add(vId);
      }

      setNodes((nds) =>
        nds.map((n) =>
          mainViewerIds.has(n.id) ? { ...n, data: { ...n.data, generating: true } } : n,
        ),
      );

      const charDesc = buildCharacterDescription(identity, attributes, description);
      const fullPrompt = buildCharacterViewPrompt('main', charDesc);
      const images = await generateWithNanoBanana(fullPrompt, '9:16', 1);
      if (!mountedRef.current || cancelledRef.current) return;
      const mainImage = images[0] as GeneratedImage;

      anim.markNodes(viewerNodeIds, true);

      setNodes((nds) =>
        nds.map((n) => {
          if (generateNodeIds.includes(n.id)) {
            return { ...n, data: { ...n.data, generatedImage: mainImage, characterDescription: charDesc } };
          }
          if (mainViewerIds.has(n.id)) {
            return { ...n, data: { ...n.data, generatedImage: mainImage, generating: false, _orthoTrigger: Date.now() } };
          }
          return n;
        }),
      );

      const charName = name || `${identity.race}_${identity.gender}`;
      fireAndForgetSave(mainImage, 'main_stage', charName);

      const summary = `${name || identity.gender}, ${identity.age}, ${identity.race}`;
      setLastResult(`Created: ${summary} + image → ${mainViewerIds.size} viewer(s)`);
      setStatus('');
    } catch (e) {
      if (cancelledRef.current) return;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('abort')) return;
      console.error('[QuickGen+Image] error:', e);
      if (mountedRef.current) setError(msg);
      setStatus('');
    } finally {
      if (mountedRef.current) setGenerating(false);
      const allViewerIds = findDownstreamByType(new Set(Object.keys(VIEWER_NODE_TYPES)));
      const mvTypes = new Set(['charMainViewer', 'charViewer', 'charImageViewer']);
      const mvIds = new Set<string>();
      for (const vId of allViewerIds) {
        const vNode = getNode(vId);
        if (vNode && mvTypes.has(vNode.type ?? '')) mvIds.add(vId);
      }
      if (mvIds.size > 0) {
        setNodes((nds) =>
          nds.map((n) =>
            mvIds.has(n.id) ? { ...n, data: { ...n.data, generating: false } } : n,
          ),
        );
      }
      anim.clearAll();
    }
  }, [generating, id, pushData, generateCharacter, findDownstreamByType, getNode, setNodes, setEdges, getEdges]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''} ${generating ? 'char-node-processing' : ''}`}
      title={NODE_TOOLTIPS.charQuickGen}>
      <div className="char-node-header" style={{ background: '#ffa726' }}>
        Quick Generate
      </div>
      <div className="char-node-body">
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
          AI invents a unique character from scratch — fills out Identity, Description, and all Attributes.
        </p>
        <div className="char-quickgen-options">
          <button className="char-btn nodrag" onClick={runDescriptionOnly} disabled={generating}>
            {generating ? status || 'Working…' : 'Quick Generate Description'}
          </button>
          <button className="char-btn primary nodrag" onClick={runDescriptionAndImage} disabled={generating}>
            {generating ? status || 'Working…' : 'Quick Generate Description + Image'}
          </button>
        </div>
        {generating && status && (
          <div className="char-progress">{status}</div>
        )}
        {error && (
          <div className="char-error" style={{ whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'auto', fontSize: 10 }}>
            {error}
          </div>
        )}
        {lastResult && !generating && !error && (
          <div style={{ fontSize: 10, color: '#69f0ae', padding: '4px 0' }}>
            {lastResult}
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(QuickGenerateNodeInner);
