"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow, useHandleConnections } from '@xyflow/react';
import { buildCharacterViewPrompt } from '@/lib/ideation/engine/conceptlab/characterPrompts';
import { buildWeaponViewPrompt } from '@/lib/ideation/engine/conceptlab/weaponPrompts';
import {
  generateWithGeminiRef,
  getActiveBackend,
  GEMINI_IMAGE_MODELS,
  type GeminiImageModel,
  type GeneratedImage,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import './TurnaroundNode.css';

interface TurnaroundNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

interface ViewDef {
  key: string;
  label: string;
}

const CHARACTER_VIEWS: ViewDef[] = [
  { key: 'main', label: 'Main' },
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'side', label: 'Side' },
];

const WEAPON_VIEWS: ViewDef[] = [
  { key: 'main', label: 'Main' },
  { key: 'three_quarter', label: '3/4' },
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'side', label: 'Side' },
  { key: 'top', label: 'Top' },
];

function TurnaroundNodeInner({ id, selected }: TurnaroundNodeProps) {
  const { getNode, setNodes } = useReactFlow();
  const connections = useHandleConnections({ type: 'target', id: 'ref-image' });

  const [activeTab, setActiveTab] = useState('main');
  const [viewImages, setViewImages] = useState<Record<string, GeneratedImage>>({});
  const [generating, setGenerating] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [geminiModel, setGeminiModel] = useState<GeminiImageModel>('gemini-3-pro');

  const getSourceInfo = useCallback((): { type: 'character' | 'weapon'; image: GeneratedImage; description: string } | null => {
    if (!connections.length) return null;
    const srcNodeId = connections[0].source;
    const srcNode = getNode(srcNodeId);
    if (!srcNode) return null;

    const srcData = srcNode.data as Record<string, unknown>;
    const genImg = srcData?.generatedImage as GeneratedImage | undefined;
    if (!genImg) return null;

    const nodeType = srcNode.type === 'character' ? 'character' : 'weapon';
    const desc = (nodeType === 'character'
      ? srcData?.characterDescription
      : srcData?.weaponDescription) as string | undefined;
    return { type: nodeType, image: genImg, description: desc ?? '' };
  }, [connections, getNode]);

  const views: ViewDef[] = (() => {
    const info = getSourceInfo();
    if (!info) return CHARACTER_VIEWS;
    return info.type === 'character' ? CHARACTER_VIEWS : WEAPON_VIEWS;
  })();

  const generateView = useCallback(async (viewKey: string) => {
    const info = getSourceInfo();
    if (!info) {
      setError('Connect a Character or Weapon node to the input first.');
      return;
    }

    setGenerating(true);
    setError(null);
    setProgressLabel(viewKey);

    try {
      let prompt: string;
      if (info.type === 'character') {
        prompt = buildCharacterViewPrompt(viewKey, info.description);
      } else {
        prompt = buildWeaponViewPrompt(viewKey, info.description);
      }

      const result = await generateWithGeminiRef(prompt, info.image, geminiModel);
      if (result.length > 0) {
        setViewImages((prev) => ({ ...prev, [viewKey]: result[0] }));
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id
              ? { ...n, data: { ...n.data, [`view_${viewKey}`]: result[0] } }
              : n,
          ),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
      setProgressLabel('');
    }
  }, [getSourceInfo, id, setNodes, geminiModel]);

  const handleGenerateAll = useCallback(async () => {
    const info = getSourceInfo();
    if (!info) {
      setError('Connect a Character or Weapon node to the input first.');
      return;
    }

    const viewList = info.type === 'character' ? CHARACTER_VIEWS : WEAPON_VIEWS;
    setGenerating(true);
    setError(null);

    for (const v of viewList) {
      if (v.key === 'main') continue;
      setProgressLabel(v.label);
      try {
        let prompt: string;
        if (info.type === 'character') {
          prompt = buildCharacterViewPrompt(v.key, info.description);
        } else {
          prompt = buildWeaponViewPrompt(v.key, info.description);
        }

        const result = await generateWithGeminiRef(prompt, info.image, geminiModel);
        if (result.length > 0) {
          setViewImages((prev) => ({ ...prev, [v.key]: result[0] }));
          setNodes((nds) =>
            nds.map((n) =>
              n.id === id
                ? { ...n, data: { ...n.data, [`view_${v.key}`]: result[0] } }
                : n,
            ),
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        break;
      }
    }

    setGenerating(false);
    setProgressLabel('');
  }, [getSourceInfo, id, setNodes, geminiModel]);

  const currentImage = viewImages[activeTab];
  const sourceInfo = getSourceInfo();
  const mainImage = sourceInfo?.image;

  const displayImage = activeTab === 'main' ? mainImage : currentImage;

  return (
    <div className={`turnaround-node ${selected ? 'selected' : ''}`}>
      <div className="turn-header">
        <span>Turnaround Views</span>
        <span className="turn-backend-badge" title={`Using ${getActiveBackend() === 'vertex' ? 'Vertex AI' : 'AI Studio'} backend`}>
          {getActiveBackend() === 'vertex' ? 'Vertex' : 'Studio'}
        </span>
      </div>

      <div className="turn-body">
        <div className="turn-model-select nodrag">
          <select
            className="turn-select"
            value={geminiModel}
            onChange={(e) => setGeminiModel(e.target.value as GeminiImageModel)}
            disabled={generating}
          >
            {(Object.keys(GEMINI_IMAGE_MODELS) as GeminiImageModel[]).map((k) => (
              <option key={k} value={k} title={GEMINI_IMAGE_MODELS[k].description}>
                {GEMINI_IMAGE_MODELS[k].label}
              </option>
            ))}
          </select>
        </div>
        <div className="turn-tabs nodrag">
          {views.map((v) => (
            <button
              key={v.key}
              className={`turn-tab ${activeTab === v.key ? 'active' : ''} ${viewImages[v.key] || (v.key === 'main' && mainImage) ? 'has-image' : ''}`}
              onClick={() => setActiveTab(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="turn-viewer">
          {displayImage ? (
            <ImageContextMenu image={displayImage} alt={`${activeTab}-view`}>
              <img
                src={`data:${displayImage.mimeType};base64,${displayImage.base64}`}
                alt={`${activeTab} view`}
                className="turn-preview"
              />
            </ImageContextMenu>
          ) : (
            <div className="turn-empty">
              {activeTab === 'main'
                ? 'Connect a Character or Weapon node'
                : 'Click Generate to create this view'}
            </div>
          )}
        </div>

        <div className="turn-btn-row">
          <button
            className="turn-btn primary nodrag"
            onClick={(e) => { e.stopPropagation(); handleGenerateAll(); }}
            disabled={generating || !sourceInfo}
          >
            {generating ? `Generating ${progressLabel}...` : 'Generate All Views'}
          </button>
          {activeTab !== 'main' && (
            <button
              className="turn-btn nodrag"
              onClick={(e) => { e.stopPropagation(); generateView(activeTab); }}
              disabled={generating || !sourceInfo}
            >
              Regen
            </button>
          )}
        </div>

        {error && <div className="turn-error">{error}</div>}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="ref-image"
        className="turn-handle"
        style={{ background: '#00bfa5' }}
      />

      {views.filter((v) => v.key !== 'main').map((v, i) => (
        <Handle
          key={v.key}
          type="source"
          position={Position.Right}
          id={`view-${v.key}`}
          className="turn-handle"
          style={{
            background: '#00bfa5',
            top: `${30 + (i + 1) * (100 / (views.length + 1))}%`,
          }}
        />
      ))}
    </div>
  );
}

export default memo(TurnaroundNodeInner);
