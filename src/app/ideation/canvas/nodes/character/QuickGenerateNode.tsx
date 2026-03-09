"use client";

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  AGE_OPTIONS,
  RACE_OPTIONS,
  GENDER_OPTIONS,
  BUILD_OPTIONS,
  ATTRIBUTE_GROUPS,
  buildCharacterDescription,
  buildCharacterViewPrompt,
  type CharacterIdentity,
  type CharacterAttributes,
} from '@/lib/ideation/engine/conceptlab/characterPrompts';
import { generateText, generateWithImagen4 } from '@/lib/ideation/engine/conceptlab/imageGenApi';
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

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
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
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

  const findDirectTargets = useCallback(() => {
    const edges = getEdges();
    return edges.filter((e) => e.source === id).map((e) => e.target);
  }, [id, getEdges]);

  const pushData = useCallback(
    (identity: CharacterIdentity, attributes: CharacterAttributes, description: string) => {
      const connected = getConnectedNodeIds();
      setNodes((nds) =>
        nds.map((n) => {
          if (!connected.has(n.id)) return n;
          if (n.type === 'charIdentity') return { ...n, data: { ...n.data, identity } };
          if (n.type === 'charDescription') return { ...n, data: { ...n.data, description } };
          if (n.type === 'charAttributes') return { ...n, data: { ...n.data, attributes } };
          return n;
        }),
      );
    },
    [getConnectedNodeIds, setNodes],
  );

  const runDescriptionOnly = useCallback(async () => {
    const ac = new AbortController();
    abortRef.current = ac;
    setGenerating(true);
    setError(null);
    setStatus('Generating random character...');
    const anim = createProcessingAnimator(setNodes, setEdges, getEdges);
    try {
      anim.markNodes([id], true);
      const identity: CharacterIdentity = {
        age: pick(AGE_OPTIONS),
        race: pick(RACE_OPTIONS),
        gender: pick(GENDER_OPTIONS),
        build: pick(BUILD_OPTIONS),
      };

      const attributes: CharacterAttributes = {};
      for (const g of ATTRIBUTE_GROUPS) {
        const pool = Math.random() < 0.7 ? g.common : g.rare;
        attributes[g.key] = pick(pool);
      }

      setStatus('Calling AI for description...');
      console.log('[QuickGen] calling generateText...');
      const prompt = `Create a brief 2-3 sentence character concept description for a ${identity.gender} character, ${identity.age}, ${identity.race}, ${identity.build} build. Be creative and specific. Return ONLY the description text.`;
      const description = await generateText(prompt);
      console.log('[QuickGen] description received, length:', description.length);
      if (ac.signal.aborted) return;

      const directTargets = findDirectTargets();
      anim.markEdgesFrom(id, true);
      anim.markNodes(directTargets, true);

      pushData(identity, attributes, description.trim());
      setStatus('Done!');
    } catch (e) {
      if (ac.signal.aborted) return;
      console.error('[QuickGen] error:', e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('Error');
    } finally {
      setGenerating(false);
      anim.clearAll();
    }
  }, [id, pushData, setNodes, setEdges, getEdges, findDirectTargets]);

  const runDescriptionAndImage = useCallback(async () => {
    const ac = new AbortController();
    abortRef.current = ac;
    setGenerating(true);
    setError(null);
    setStatus('Generating random character...');
    const anim = createProcessingAnimator(setNodes, setEdges, getEdges);
    try {
      anim.markNodes([id], true);

      const identity: CharacterIdentity = {
        age: pick(AGE_OPTIONS),
        race: pick(RACE_OPTIONS),
        gender: pick(GENDER_OPTIONS),
        build: pick(BUILD_OPTIONS),
      };

      const attributes: CharacterAttributes = {};
      for (const g of ATTRIBUTE_GROUPS) {
        const pool = Math.random() < 0.7 ? g.common : g.rare;
        attributes[g.key] = pick(pool);
      }

      setStatus('Calling AI for description...');
      console.log('[QuickGen+Image] calling generateText...');
      const prompt = `Create a brief 2-3 sentence character concept description for a ${identity.gender} character, ${identity.age}, ${identity.race}, ${identity.build} build. Be creative and specific. Return ONLY the description text.`;
      const description = await generateText(prompt);
      console.log('[QuickGen+Image] description received, length:', description.length);
      if (ac.signal.aborted) return;
      const descTrimmed = description.trim();

      const directTargets = findDirectTargets();
      anim.markEdgesFrom(id, true);
      anim.markNodes(directTargets, true);
      pushData(identity, attributes, descTrimmed);

      setStatus('Generating image...');
      console.log('[QuickGen+Image] calling Imagen 4...');
      const generateNodeIds = findDownstreamByType(new Set(['charGenerate']));
      anim.markNodes(generateNodeIds, true);
      for (const gId of generateNodeIds) anim.markEdgesTo(gId, true);

      const charDesc = buildCharacterDescription(identity, attributes, descTrimmed);
      const fullPrompt = buildCharacterViewPrompt('main', charDesc);
      const images = await generateWithImagen4(fullPrompt, '9:16', 1);
      console.log('[QuickGen+Image] image received');
      if (ac.signal.aborted) return;
      const mainImage = images[0] as GeneratedImage;

      const viewerNodeIds = findDownstreamByType(new Set(Object.keys(VIEWER_NODE_TYPES)));
      anim.markNodes(viewerNodeIds, true);
      for (const vId of viewerNodeIds) anim.markEdgesTo(vId, true);

      // Only push mainImage to main viewers — front/back/side auto-generate their own perspectives
      const mainViewerTypes = new Set(['charMainViewer', 'charViewer', 'charImageViewer']);
      const mainViewerIds = new Set<string>();
      for (const vId of viewerNodeIds) {
        const vNode = getNode(vId);
        if (vNode && mainViewerTypes.has(vNode.type ?? '')) mainViewerIds.add(vId);
      }

      anim.markNodes([id], false);
      anim.markEdgesFrom(id, false);
      anim.markNodes(directTargets, false);

      setNodes((nds) =>
        nds.map((n) => {
          if (generateNodeIds.includes(n.id)) {
            return {
              ...n,
              data: {
                ...n.data,
                generatedImages: images,
                generatedImage: mainImage,
                characterDescription: charDesc,
              },
            };
          }
          if (mainViewerIds.has(n.id)) {
            return { ...n, data: { ...n.data, generatedImage: mainImage } };
          }
          return n;
        }),
      );

      const charName = `${identity.race}_${identity.gender}`;
      fireAndForgetSave(mainImage, 'main_stage', charName);

      setStatus('Done!');
    } catch (e) {
      if (ac.signal.aborted) return;
      console.error('[QuickGen+Image] error:', e);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('Error');
    } finally {
      setGenerating(false);
      anim.clearAll();
    }
  }, [id, pushData, findDownstreamByType, findDirectTargets, getNode, setNodes, setEdges, getEdges]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''} ${generating ? 'char-node-processing' : ''}`}
      title={NODE_TOOLTIPS.charQuickGen}>
      <div className="char-node-header" style={{ background: '#ffa726' }}>
        Quick Generate
      </div>
      <div className="char-node-body">
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
          AI creates a random character and pushes to connected nodes.
        </p>
        <div className="char-quickgen-options">
          <button className="char-btn nodrag" onClick={runDescriptionOnly} disabled={generating}>
            {generating ? status || 'Working...' : 'Quick Generate Description'}
          </button>
          <button className="char-btn primary nodrag" onClick={runDescriptionAndImage} disabled={generating}>
            {generating ? status || 'Working...' : 'Quick Generate Description + Image'}
          </button>
        </div>
        {error && (
          <div className="char-error" style={{ whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'auto', fontSize: 10 }}>
            {error}
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(QuickGenerateNodeInner);
