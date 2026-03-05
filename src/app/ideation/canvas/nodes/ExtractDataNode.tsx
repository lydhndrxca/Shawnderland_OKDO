"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { recordUsage } from '@/lib/ideation/engine/provider/costTracker';
import { logGeneration, buildLineageContext, type SessionSnapshot } from '@/lib/ideation/engine/generationLog';
import { buildModelUrl } from '@/lib/ideation/engine/apiConfig';
import './ExtractDataNode.css';

type ExtractMode = 'image-to-text' | 'image-to-image';

const IMAGE_TO_TEXT_PROMPT =
  'Describe this image in rich detail suitable for use as an AI image generation prompt. ' +
  'Include subject matter, composition, color palette, lighting, style, mood, and any notable visual elements. ' +
  'Output only the description text, no preamble.';

const IMAGE_TO_IMAGE_PROMPT =
  'Analyze this image and extract its visual style parameters. List the following as key-value pairs: ' +
  'art style, color palette (hex codes), lighting type, texture quality, level of detail, perspective, mood. ' +
  'Format as a structured list that can be used to guide AI image generation.';

interface ExtractDataNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

type WinHelpers = {
  __getNodeData?: (id: string) => Record<string, unknown> | undefined;
  __getEdges?: () => Array<{ source: string; target: string }>;
};

function findConnectedImageData(nodeId: string): { base64: string; mimeType: string } | null {
  const w = window as unknown as WinHelpers;
  const edges = w.__getEdges?.() ?? [];
  const incoming = edges.filter((e) => e.target === nodeId);

  for (const edge of incoming) {
    const data = w.__getNodeData?.(edge.source);
    if (data?.imageBase64 && typeof data.imageBase64 === 'string') {
      return {
        base64: data.imageBase64 as string,
        mimeType: (data.mimeType as string) || 'image/png',
      };
    }
  }
  return null;
}

function ExtractDataNodeInner({ id, selected }: ExtractDataNodeProps) {
  const [mode, setMode] = useState<ExtractMode>('image-to-text');
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExtract = useCallback(async () => {
    setProcessing(true);
    setError(null);

    try {
      const imageData = findConnectedImageData(id);
      if (!imageData) throw new Error('No image connected. Connect an Image or Image Influence node to the left handle.');

      const prompt = mode === 'image-to-text' ? IMAGE_TO_TEXT_PROMPT : IMAGE_TO_IMAGE_PROMPT;

      const body = {
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: imageData.mimeType, data: imageData.base64 } },
          ],
        }],
        generationConfig: { temperature: 0.2 },
      };

      const res = await fetch(buildModelUrl('gemini-2.0-flash', 'generateContent'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const json = await res.json();
      if (json?.usageMetadata) recordUsage(json.usageMetadata, 'gemini-2.0-flash');
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No text returned from Gemini vision API');

      const w = window as unknown as Record<string, unknown>;
      const sid = (w.__sessionId as string) ?? 'unknown';
      const snap = w.__sessionSnapshot as SessionSnapshot | undefined;
      logGeneration({ sessionId: sid, category: 'extract', source: 'ExtractDataNode', model: 'gemini-2.0-flash', prompt: mode === 'image-to-text' ? 'Image to text description' : 'Image to style parameters', output: { mode, resultLength: text.length, preview: text.slice(0, 200) }, lineage: snap ? buildLineageContext(snap) : undefined });

      setExtractedText(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProcessing(false);
    }
  }, [mode, id]);

  const handleCopy = useCallback(() => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [extractedText]);

  return (
    <div
      className={`extract-data-node ${selected ? 'selected' : ''} ${expanded ? 'expanded' : ''}`}
      title="Extract data from images. Image-to-Text describes the image. Image-to-Image passes visual style for generation."
    >
      <div className="extract-data-header">
        <span className="extract-data-label">Extract Data</span>
      </div>

      <div className="extract-data-body">
        <div className="extract-data-mode">
          <label className="extract-data-field-label">Mode</label>
          <select
            className="extract-data-select nodrag"
            value={mode}
            onChange={(e) => setMode(e.target.value as ExtractMode)}
          >
            <option value="image-to-text">Image to Text</option>
            <option value="image-to-image">Image to Image</option>
          </select>
          <div className="extract-data-mode-hint">
            {mode === 'image-to-text'
              ? 'Reads the image and outputs a detailed text description for prompting'
              : 'Extracts visual style parameters to apply to other image generation'}
          </div>
        </div>

        <button
          className="extract-data-run nodrag"
          onClick={(e) => { e.stopPropagation(); handleExtract(); }}
          disabled={processing}
          style={{ borderColor: '#ffab40', color: processing ? 'var(--text-muted)' : '#ffab40' }}
        >
          {processing ? 'Extracting...' : 'Extract'}
        </button>

        {processing && (
          <div className="extract-data-loading">
            <div className="extract-data-spinner" />
            <span>Analyzing image with Gemini...</span>
          </div>
        )}

        {error && <div className="extract-data-error">{error}</div>}

        {extractedText && (
          <div className="extract-data-result" onClick={() => setExpanded(!expanded)}>
            <div className="extract-data-result-header">
              <span className="extract-data-result-label">
                {mode === 'image-to-text' ? 'Description' : 'Style Parameters'}
              </span>
              <button className="extract-data-copy nodrag" onClick={(e) => { e.stopPropagation(); handleCopy(); }}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="extract-data-result-text">
              {expanded ? extractedText : extractedText.slice(0, 120) + (extractedText.length > 120 ? '...' : '')}
            </div>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="image"
        className="extract-data-handle"
        style={{ background: '#26a69a' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="extract-data-handle"
        style={{ background: mode === 'image-to-text' ? '#e0e0e0' : '#f06292' }}
      />
    </div>
  );
}

export default memo(ExtractDataNodeInner);
