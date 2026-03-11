"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { Download, Copy } from 'lucide-react';
import { generateWithGeminiRef, type GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import './LDDirectionResultNode.css';

interface PointData {
  title: string;
  direction: string;
  rationale: string;
  reference: string;
}

function buildAnnotationPrompt(point: PointData, pointIndex: number): string {
  return (
    'You are a level designer marking up a screenshot printout. ' +
    'Draw DIRECTLY on this image using bold red/orange markers.\n\n' +
    'CRITICAL RULE: Focus on ONE SINGLE THING. Pick the single most important ' +
    'area or element from the feedback below and annotate ONLY that. ' +
    'Do NOT try to illustrate multiple ideas. One circle, one arrow, one label — done.\n\n' +
    'Keep it minimal:\n' +
    '- ONE circle or arrow pointing to the exact area\n' +
    '- ONE short label (2-4 words max)\n' +
    '- Optionally ONE simple sketch line if showing a proposed change\n' +
    '- Nothing else. White space is good. Less is more.\n\n' +
    'The original image must remain fully visible and undistorted.\n\n' +
    `## Feedback: "${point.title}"\n` +
    point.direction + '\n\n' +
    'Pick the ONE most important spatial element from the above and mark it clearly.'
  );
}

export default function LDDirectionResultNode({ data, selected }: NodeProps) {
  const d = data as Record<string, unknown>;
  const point = d.point as PointData | undefined;
  const pointIndex = (d.pointIndex as number) ?? 1;
  const sourceImage = d.sourceImage as GeneratedImage | undefined;

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
        const prompt = buildAnnotationPrompt(point, pointIndex);
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
  }, [point, pointIndex, sourceImage]);

  const handleRegenerate = useCallback(async () => {
    if (!point || !sourceImage) return;
    setGenerating(true);
    setError(null);
    try {
      const prompt = buildAnnotationPrompt(point, pointIndex);
      const results = await generateWithGeminiRef(prompt, sourceImage, 'gemini-flash-image');
      if (results.length > 0) {
        setAnnotatedImage(results[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [point, pointIndex, sourceImage]);

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
    a.download = `ld-direction-${pointIndex}.${ext}`;
    a.click();
  }, [annotatedImage, pointIndex]);

  if (!point) {
    return (
      <div className={`ldresult-node ${selected ? 'selected' : ''}`}>
        <Handle type="target" position={Position.Left} className="ldresult-handle" />
        <div className="ldresult-empty">No direction data</div>
      </div>
    );
  }

  return (
    <div className={`ldresult-node ${selected ? 'selected' : ''} ${annotatedImage ? 'has-image' : ''}`}>
      <Handle type="target" position={Position.Left} className="ldresult-handle" />
      <Handle type="source" position={Position.Right} className="ldresult-handle" />

      {/* Header */}
      <div className="ldresult-header">
        <span className="ldresult-number">{pointIndex}</span>
        <span className="ldresult-title">{point.title}</span>
      </div>

      {/* Image area */}
      <div className="ldresult-image-area">
        {generating && (
          <div className="ldresult-generating">
            <div className="ldresult-spinner" />
            <span>Sketching annotations…</span>
          </div>
        )}

        {error && !generating && (
          <div className="ldresult-error">
            {error}
            <button className="ldresult-retry-btn" onClick={handleRegenerate}>Retry</button>
          </div>
        )}

        {annotatedImage && !generating && (
          <img
            className="ldresult-image"
            src={`data:${annotatedImage.mimeType};base64,${annotatedImage.base64}`}
            alt={`Direction ${pointIndex}: ${point.title}`}
          />
        )}
      </div>

      {/* Direction text */}
      <div className="ldresult-body">
        <div className="ldresult-direction">{point.direction}</div>
        <div className="ldresult-rationale">
          <span className="ldresult-label">Why:</span> {point.rationale}
        </div>
        <div className="ldresult-reference">
          <span className="ldresult-label">Ref:</span> {point.reference}
        </div>
      </div>

      {/* Actions */}
      {annotatedImage && !generating && (
        <div className="ldresult-actions nodrag">
          <button className="ldresult-action-btn" onClick={handleCopyImage}>
            <Copy size={11} /> Copy
          </button>
          <button className="ldresult-action-btn" onClick={handleDownload}>
            <Download size={11} /> Save
          </button>
          <button className="ldresult-action-btn ldresult-regen-btn" onClick={handleRegenerate}>
            ↻ Regen
          </button>
        </div>
      )}
    </div>
  );
}
