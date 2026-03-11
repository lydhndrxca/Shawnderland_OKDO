"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { Download, Copy } from 'lucide-react';
import { generateWithGeminiRef, type GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import './ADDirectionResultNode.css';

interface PointData {
  title: string;
  direction: string;
  rationale: string;
  reference: string;
}

type ADFocus = 'character' | 'environment' | 'props';

const FOCUS_ANNOTATION_ROLE: Record<ADFocus, string> = {
  character:
    'You are a Hollywood art director sketching character design notes directly onto a concept image. ' +
    'Draw DIRECTLY on this image using bold amber/gold markers.',
  environment:
    'You are a Hollywood production designer marking up an environment concept. ' +
    'Draw DIRECTLY on this image using bold amber/gold markers.',
  props:
    'You are a Hollywood prop master annotating a prop concept. ' +
    'Draw DIRECTLY on this image using bold amber/gold markers.',
};

function buildAnnotationPrompt(point: PointData, pointIndex: number, focus: ADFocus): string {
  return (
    FOCUS_ANNOTATION_ROLE[focus] + '\n\n' +
    'CRITICAL RULE: Focus on ONE SINGLE THING. Pick the single most important ' +
    'area or element from the feedback below and annotate ONLY that. ' +
    'Do NOT try to illustrate multiple ideas. One circle, one arrow, one label — done.\n\n' +
    'Keep it minimal:\n' +
    '- ONE circle or arrow pointing to the exact area\n' +
    '- ONE short label (2-4 words max)\n' +
    '- Optionally ONE simple sketch line if showing a proposed change\n' +
    '- Nothing else. White space is good. Less is more.\n\n' +
    'The original image must remain fully visible and undistorted.\n\n' +
    `## Direction: "${point.title}"\n` +
    point.direction + '\n\n' +
    'Pick the ONE most important element from the above and mark it clearly.'
  );
}

export default function ADDirectionResultNode({ data, selected }: NodeProps) {
  const d = data as Record<string, unknown>;
  const point = d.point as PointData | undefined;
  const pointIndex = (d.pointIndex as number) ?? 1;
  const sourceImage = d.sourceImage as GeneratedImage | undefined;
  const focus = (d.focus as ADFocus) ?? 'character';

  const [annotatedImage, setAnnotatedImage] = useState<GeneratedImage | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didGenerate = useRef(false);

  useEffect(() => {
    if (!point || !sourceImage || didGenerate.current) return;
    didGenerate.current = true;

    (async () => {
      setGenerating(true);
      setError(null);
      try {
        const prompt = buildAnnotationPrompt(point, pointIndex, focus);
        const results = await generateWithGeminiRef(prompt, sourceImage, 'gemini-flash-image');
        if (results.length > 0) {
          setAnnotatedImage(results[0]);
        } else {
          setError('No image returned');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setGenerating(false);
      }
    })();
  }, [point, pointIndex, sourceImage, focus]);

  const handleRegenerate = useCallback(async () => {
    if (!point || !sourceImage) return;
    setGenerating(true);
    setError(null);
    try {
      const prompt = buildAnnotationPrompt(point, pointIndex, focus);
      const results = await generateWithGeminiRef(prompt, sourceImage, 'gemini-flash-image');
      if (results.length > 0) {
        setAnnotatedImage(results[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [point, pointIndex, sourceImage, focus]);

  const handleCopyImage = useCallback(async () => {
    if (!annotatedImage) return;
    try {
      const res = await fetch(`data:${annotatedImage.mimeType};base64,${annotatedImage.base64}`);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch { /* clipboard may fail */ }
  }, [annotatedImage]);

  const handleDownload = useCallback(() => {
    if (!annotatedImage) return;
    const ext = annotatedImage.mimeType.includes('png') ? 'png' : 'jpg';
    const a = document.createElement('a');
    a.href = `data:${annotatedImage.mimeType};base64,${annotatedImage.base64}`;
    a.download = `art-direction-${pointIndex}.${ext}`;
    a.click();
  }, [annotatedImage, pointIndex]);

  if (!point) {
    return (
      <div className={`adresult-node ${selected ? 'selected' : ''}`}>
        <Handle type="target" position={Position.Left} className="adresult-handle" />
        <div className="adresult-empty">No direction data</div>
      </div>
    );
  }

  return (
    <div className={`adresult-node ${selected ? 'selected' : ''} ${annotatedImage ? 'has-image' : ''}`}>
      <Handle type="target" position={Position.Left} className="adresult-handle" />
      <Handle type="source" position={Position.Right} className="adresult-handle" />

      <div className="adresult-header">
        <span className="adresult-number">{pointIndex}</span>
        <span className="adresult-title">{point.title}</span>
      </div>

      <div className="adresult-image-area">
        {generating && (
          <div className="adresult-generating">
            <div className="adresult-spinner" />
            <span>Sketching art direction…</span>
          </div>
        )}

        {error && !generating && (
          <div className="adresult-error">
            {error}
            <button className="adresult-retry-btn" onClick={handleRegenerate}>Retry</button>
          </div>
        )}

        {annotatedImage && !generating && (
          <img
            className="adresult-image"
            src={`data:${annotatedImage.mimeType};base64,${annotatedImage.base64}`}
            alt={`Direction ${pointIndex}: ${point.title}`}
          />
        )}
      </div>

      <div className="adresult-body">
        <div className="adresult-direction">{point.direction}</div>
        <div className="adresult-rationale">
          <span className="adresult-label">Why:</span> {point.rationale}
        </div>
        <div className="adresult-reference">
          <span className="adresult-label">Ref:</span> {point.reference}
        </div>
      </div>

      {annotatedImage && !generating && (
        <div className="adresult-actions nodrag">
          <button className="adresult-action-btn" onClick={handleCopyImage}>
            <Copy size={11} /> Copy
          </button>
          <button className="adresult-action-btn" onClick={handleDownload}>
            <Download size={11} /> Save
          </button>
          <button className="adresult-action-btn adresult-regen-btn" onClick={handleRegenerate}>
            ↻ Regen
          </button>
        </div>
      )}
    </div>
  );
}
