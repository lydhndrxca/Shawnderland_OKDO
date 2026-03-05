"use client";

import { memo, useCallback, useState, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { VIDEO_MODELS, ASPECT_RATIOS, type ModelOption } from './modelCatalog';
import { recordVeoUsage } from '@/lib/ideation/engine/provider/costTracker';
import { logGeneration, buildLineageContext, type SessionSnapshot } from '@/lib/ideation/engine/generationLog';
import { buildModelUrl, buildOperationUrl } from '@/lib/ideation/engine/apiConfig';
import './VideoOutputNode.css';

interface VideoOutputNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function VideoOutputNodeInner({ selected }: VideoOutputNodeProps) {
  const [model, setModel] = useState<ModelOption>(VIDEO_MODELS[0]);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [prompt, setPrompt] = useState('');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pollStatus, setPollStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const pollRef = useRef(false);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setPollStatus('Submitting to Veo...');
    pollRef.current = true;

    try {
      const url = buildModelUrl(model.modelId, 'predictLongRunning');
      const body = {
        instances: [{ prompt: prompt.trim() }],
        parameters: { aspectRatio },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Veo API error ${res.status}: ${errText.slice(0, 300)}`);
      }

      const json = await res.json();
      const operationName = json?.name;

      if (!operationName) {
        if (json?.predictions?.[0]?.bytesBase64Encoded) {
          const b64 = json.predictions[0].bytesBase64Encoded;
          const mime = json.predictions[0].mimeType || 'video/mp4';
          setVideoSrc(`data:${mime};base64,${b64}`);
          recordVeoUsage(model.modelId, 6);
          const w = window as unknown as Record<string, unknown>;
          const sid = (w.__sessionId as string) ?? 'unknown';
          const snap = w.__sessionSnapshot as SessionSnapshot | undefined;
          logGeneration({ sessionId: sid, category: 'video', source: 'VideoOutputNode', model: model.modelId, prompt: prompt.trim(), output: { durationSec: 6, aspectRatio }, lineage: snap ? buildLineageContext(snap) : undefined });
          setPollStatus(null);
          return;
        }
        throw new Error('No operation name or video returned from Veo API');
      }

      setPollStatus('Video generating... polling for results');
      const pollUrl = buildOperationUrl(operationName);
      let attempts = 0;
      const maxAttempts = 60;

      while (pollRef.current && attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 5000));
        attempts++;
        setPollStatus(`Generating video... (${attempts * 5}s elapsed)`);

        const pollRes = await fetch(pollUrl);
        if (!pollRes.ok) continue;

        const pollJson = await pollRes.json();
        if (pollJson.done) {
          const video = pollJson.response?.predictions?.[0];
          if (video?.bytesBase64Encoded) {
            const mime = video.mimeType || 'video/mp4';
            setVideoSrc(`data:${mime};base64,${video.bytesBase64Encoded}`);
            recordVeoUsage(model.modelId, 6);
            const w2 = window as unknown as Record<string, unknown>;
            const sid2 = (w2.__sessionId as string) ?? 'unknown';
            const snap2 = w2.__sessionSnapshot as SessionSnapshot | undefined;
            logGeneration({ sessionId: sid2, category: 'video', source: 'VideoOutputNode', model: model.modelId, prompt: prompt.trim(), output: { durationSec: 6, aspectRatio }, lineage: snap2 ? buildLineageContext(snap2) : undefined });
          } else if (pollJson.error) {
            throw new Error(`Video generation failed: ${pollJson.error.message || JSON.stringify(pollJson.error)}`);
          } else {
            throw new Error('Video generation completed but no video data returned');
          }
          setPollStatus(null);
          return;
        }
      }

      if (attempts >= maxAttempts) {
        throw new Error('Video generation timed out after 5 minutes. Try a simpler prompt.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPollStatus(null);
    } finally {
      setGenerating(false);
      pollRef.current = false;
    }
  }, [prompt, model, aspectRatio]);

  return (
    <div
      className={`video-output-node ${selected ? 'selected' : ''} ${expanded ? 'expanded' : ''}`}
      title="Generate videos from your idea using Veo models"
    >
      <div className="video-output-header">
        <span className="video-output-label">Video Output</span>
      </div>

      <div className="video-output-body">
        <div className="video-output-model-select">
          <label className="video-output-field-label">Model</label>
          <select
            className="video-output-select nodrag"
            value={model.id}
            onChange={(e) => {
              const m = VIDEO_MODELS.find((vm) => vm.id === e.target.value);
              if (m) setModel(m);
            }}
          >
            {VIDEO_MODELS.map((m) => (
              <option key={m.id} value={m.id} title={`${m.description}\n\n${m.comparison}`}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="video-output-model-hint" title={`${model.description}\n\n${model.comparison}`}>
            {model.tags.join(' · ')}
          </div>
        </div>

        <div className="video-output-field">
          <label className="video-output-field-label">Aspect Ratio</label>
          <select
            className="video-output-select nodrag"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
          >
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar.value} value={ar.value}>{ar.label}</option>
            ))}
          </select>
        </div>

        <textarea
          className="video-output-prompt nodrag nowheel"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the video to generate..."
          rows={2}
        />

        <button
          className="video-output-generate nodrag"
          onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
          disabled={generating || !prompt.trim()}
          style={{ borderColor: '#ba68c8', color: generating ? 'var(--text-muted)' : '#ba68c8' }}
        >
          {generating ? 'Generating...' : 'Generate Video'}
        </button>

        {pollStatus && (
          <div className="video-output-polling">
            <div className="video-output-poll-spinner" />
            <span>{pollStatus}</span>
          </div>
        )}

        {error && <div className="video-output-error">{error}</div>}

        {videoSrc && (
          <div className="video-output-preview-wrap" onClick={() => setExpanded(!expanded)}>
            <video
              src={videoSrc}
              className="video-output-preview"
              controls
              autoPlay
              loop
              muted
            />
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="idea"
        className="video-output-handle"
        style={{ background: '#ba68c8' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="count"
        className="video-output-handle count-target"
        style={{ background: '#78909c' }}
      />
    </div>
  );
}

export default memo(VideoOutputNodeInner);
