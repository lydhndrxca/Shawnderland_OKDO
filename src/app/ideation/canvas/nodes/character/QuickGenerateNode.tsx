"use client";

import { memo, useCallback, useState } from 'react';
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
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function QuickGenerateNodeInner({ id, data, selected }: Props) {
  const { setNodes, getEdges } = useReactFlow();
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pushData = useCallback(
    (identity: CharacterIdentity, attributes: CharacterAttributes, description: string) => {
      const edges = getEdges();
      const outgoing = edges.filter((e) => e.source === id);

      setNodes((nds) =>
        nds.map((n) => {
          const outEdge = outgoing.find((e) => e.target === n.id);
          if (!outEdge) return n;

          if (n.type === 'charIdentity') {
            return { ...n, data: { ...n.data, identity } };
          }
          if (n.type === 'charDescription') {
            return { ...n, data: { ...n.data, description } };
          }
          if (n.type === 'charAttributes') {
            return { ...n, data: { ...n.data, attributes } };
          }
          return n;
        }),
      );
    },
    [id, getEdges, setNodes],
  );

  const runDescriptionOnly = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setStatus('Generating random character...');
    try {
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

      const prompt = `Create a brief 2-3 sentence character concept description for a ${identity.gender} character, ${identity.age}, ${identity.race}, ${identity.build} build. Be creative and specific. Return ONLY the description text.`;
      const description = await generateText(prompt);

      pushData(identity, attributes, description.trim());
      setStatus('Description generated');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [pushData]);

  const runDescriptionAndImage = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setStatus('Generating random character...');
    try {
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

      setStatus('Generating description...');
      const prompt = `Create a brief 2-3 sentence character concept description for a ${identity.gender} character, ${identity.age}, ${identity.race}, ${identity.build} build. Be creative and specific. Return ONLY the description text.`;
      const description = await generateText(prompt);
      const descTrimmed = description.trim();

      pushData(identity, attributes, descTrimmed);

      setStatus('Generating image...');
      const charDesc = buildCharacterDescription(identity, attributes, descTrimmed);
      const fullPrompt = buildCharacterViewPrompt('main', charDesc);
      const images = await generateWithImagen4(fullPrompt, '9:16', 1);

      const edges = getEdges();
      const outgoing = edges.filter((e) => e.source === id);
      setNodes((nds) =>
        nds.map((n) => {
          const outEdge = outgoing.find((e) => e.target === n.id);
          if (!outEdge) return n;
          if (n.type === 'charGenerate') {
            return {
              ...n,
              data: {
                ...n.data,
                generatedImages: images,
                generatedImage: images[0],
                characterDescription: charDesc,
              },
            };
          }
          return n;
        }),
      );

      setStatus('Done!');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [id, pushData, getEdges, setNodes]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#ffa726' }}>
        Quick Generate
      </div>
      <div className="char-node-body">
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
          AI creates a random character and pushes to connected nodes.
        </p>
        <div className="char-quickgen-options">
          <button className="char-btn nodrag" onClick={runDescriptionOnly} disabled={generating}>
            {generating ? status : 'Quick Generate Description'}
          </button>
          <button className="char-btn primary nodrag" onClick={runDescriptionAndImage} disabled={generating}>
            {generating ? status : 'Quick Generate Description + Image'}
          </button>
        </div>
        {error && <div className="char-error">{error}</div>}
      </div>

      <Handle type="source" position={Position.Right} id="identity-out" className="char-handle" style={{ top: '25%' }} />
      <Handle type="source" position={Position.Right} id="desc-out" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="attrs-out" className="char-handle" style={{ top: '75%' }} />
    </div>
  );
}

export default memo(QuickGenerateNodeInner);
