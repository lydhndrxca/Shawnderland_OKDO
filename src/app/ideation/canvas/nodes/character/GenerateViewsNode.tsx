"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { buildCharacterViewPrompt } from '@/lib/ideation/engine/conceptlab/characterPrompts';
import {
  generateWithGeminiRef,
  GEMINI_IMAGE_MODELS,
  type GeminiImageModel,
  type GeneratedImage,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const VIEWS = [
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'side', label: 'Side' },
];

function getSourceImage(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): { image: GeneratedImage; description: string } | null {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === nodeId && e.targetHandle === 'ref-image');
  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;
    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) {
      return {
        image: img,
        description: (d.characterDescription as string) ?? '',
      };
    }
  }
  return null;
}

function GenerateViewsNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();
  const [activeTab, setActiveTab] = useState('front');
  const [viewImages, setViewImages] = useState<Record<string, GeneratedImage>>(
    (data?.viewImages as Record<string, GeneratedImage>) ?? {},
  );
  const [generating, setGenerating] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [geminiModel, setGeminiModel] = useState<GeminiImageModel>('gemini-3-pro');

  const generateView = useCallback(async (viewKey: string) => {
    const source = getSourceImage(id, getNode, getEdges);
    if (!source) {
      setError('Connect a GenerateCharImage node first.');
      return;
    }
    setGenerating(true);
    setError(null);
    setProgressLabel(viewKey);

    try {
      const prompt = buildCharacterViewPrompt(viewKey, source.description);
      const result = await generateWithGeminiRef(prompt, source.image, geminiModel);
      if (result.length > 0) {
        const img = result[0];
        setViewImages((prev) => {
          const next = { ...prev, [viewKey]: img };
          setNodes((nds) =>
            nds.map((n) =>
              n.id === id
                ? { ...n, data: { ...n.data, viewImages: next, [`view_${viewKey}`]: img } }
                : n,
            ),
          );
          return next;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
      setProgressLabel('');
    }
  }, [id, getNode, getEdges, setNodes, geminiModel]);

  const handleGenerateAll = useCallback(async () => {
    const source = getSourceImage(id, getNode, getEdges);
    if (!source) {
      setError('Connect a GenerateCharImage node first.');
      return;
    }
    setGenerating(true);
    setError(null);

    for (const v of VIEWS) {
      setProgressLabel(v.label);
      try {
        const prompt = buildCharacterViewPrompt(v.key, source.description);
        const result = await generateWithGeminiRef(prompt, source.image, geminiModel);
        if (result.length > 0) {
          const img = result[0];
          setViewImages((prev) => {
            const next = { ...prev, [v.key]: img };
            setNodes((nds) =>
              nds.map((n) =>
                n.id === id
                  ? { ...n, data: { ...n.data, viewImages: next, [`view_${v.key}`]: img } }
                  : n,
              ),
            );
            return next;
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        break;
      }
    }

    setGenerating(false);
    setProgressLabel('');
  }, [id, getNode, getEdges, setNodes, geminiModel]);

  const currentImage = viewImages[activeTab];

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#00bfa5' }}>
        Generate Views
      </div>
      <div className="char-node-body">
        <div className="char-field">
          <span className="char-field-label">Model</span>
          <select
            className="char-select nodrag"
            value={geminiModel}
            onChange={(e) => setGeminiModel(e.target.value as GeminiImageModel)}
            disabled={generating}
          >
            {(Object.keys(GEMINI_IMAGE_MODELS) as GeminiImageModel[]).map((k) => (
              <option key={k} value={k}>{GEMINI_IMAGE_MODELS[k].label}</option>
            ))}
          </select>
        </div>

        <div className="char-viewer-tabs" style={{ padding: '4px 0 0' }}>
          {VIEWS.map((v) => (
            <button
              key={v.key}
              className={`char-viewer-tab nodrag ${activeTab === v.key ? 'active' : ''} ${viewImages[v.key] ? 'has-image' : ''}`}
              onClick={() => setActiveTab(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>

        {currentImage ? (
          <ImageContextMenu image={currentImage} alt={`${activeTab}-view`}>
            <img
              src={`data:${currentImage.mimeType};base64,${currentImage.base64}`}
              alt={`${activeTab} view`}
              className="char-preview"
            />
          </ImageContextMenu>
        ) : (
          <div className="char-viewer-empty">
            {activeTab === 'front' ? 'Click Generate to create views' : `No ${activeTab} view yet`}
          </div>
        )}

        <div className="char-btn-row">
          <button className="char-btn primary nodrag" onClick={handleGenerateAll} disabled={generating}>
            {generating ? `Generating ${progressLabel}...` : 'Generate All Views'}
          </button>
          <button className="char-btn nodrag" onClick={() => generateView(activeTab)} disabled={generating}>
            Generate Selected
          </button>
        </div>
        {error && <div className="char-error">{error}</div>}
      </div>

      <Handle type="target" position={Position.Left} id="ref-image" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="view-front" className="char-handle" style={{ top: '30%' }} />
      <Handle type="source" position={Position.Right} id="view-back" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="view-side" className="char-handle" style={{ top: '70%' }} />
    </div>
  );
}

export default memo(GenerateViewsNodeInner);
