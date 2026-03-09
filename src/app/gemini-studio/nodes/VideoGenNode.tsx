"use client";

import { memo, useCallback, useState, useRef } from 'react';
import { Handle, Position, useReactFlow, useHandleConnections } from '@xyflow/react';
import { ALL_VIDEO_MODELS_SORTED, ASPECT_RATIOS, type ModelOption } from '@/app/ideation/canvas/nodes/modelCatalog';
import { proxyGenerate, proxyPollOperation } from '@/lib/ideation/engine/aiProxy';

interface VideoGenNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function VideoGenNodeInner({ id, selected }: VideoGenNodeProps) {
  const { getNode, setNodes } = useReactFlow();
  const promptConns = useHandleConnections({ type: 'target', id: 'prompt-in' });

  const [model, setModel] = useState<ModelOption>(ALL_VIDEO_MODELS_SORTED[0]);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [localPrompt, setLocalPrompt] = useState('');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pollStatus, setPollStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef(false);

  const getPromptText = useCallback((): string => {
    if (localPrompt.trim()) return localPrompt.trim();
    for (const conn of promptConns) {
      const src = getNode(conn.source);
      if (src) {
        const text = (src.data as Record<string, unknown>)?.promptText as string | undefined;
        if (text?.trim()) return text.trim();
      }
    }
    return '';
  }, [localPrompt, promptConns, getNode]);

  const handleGenerate = useCallback(async () => {
    const prompt = getPromptText();
    if (!prompt) { setError('Enter a prompt or connect a Prompt node.'); return; }

    setGenerating(true);
    setError(null);
    setPollStatus('Submitting to Veo...');
    pollRef.current = true;

    try {
      const json = await proxyGenerate(model.modelId, 'predictLongRunning', {
        instances: [{ prompt }],
        parameters: { aspectRatio },
      }, 60_000) as { name?: string; predictions?: Array<{ bytesBase64Encoded: string; mimeType?: string }> };

      const opName = json?.name;

      if (!opName) {
        if (json?.predictions?.[0]?.bytesBase64Encoded) {
          const b64 = json.predictions[0].bytesBase64Encoded;
          const mime = json.predictions[0].mimeType || 'video/mp4';
          const src = `data:${mime};base64,${b64}`;
          setVideoSrc(src);
          setNodes((nds) =>
            nds.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, videoSrc: src } } : n,
            ),
          );
          setPollStatus(null);
          return;
        }
        throw new Error('No operation name or video returned');
      }

      setPollStatus('Video generating... polling for results');
      let attempts = 0;

      while (pollRef.current && attempts < 60) {
        await new Promise((r) => setTimeout(r, 5000));
        attempts++;
        setPollStatus(`Generating video... (${attempts * 5}s elapsed)`);

        let pollJson: Record<string, unknown>;
        try {
          pollJson = await proxyPollOperation(opName);
        } catch {
          continue;
        }
        if ((pollJson as { done?: boolean }).done) {
          const resp = pollJson as { response?: { predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }> }; error?: { message?: string } };
          const video = resp.response?.predictions?.[0];
          if (video?.bytesBase64Encoded) {
            const mime = video.mimeType || 'video/mp4';
            const src = `data:${mime};base64,${video.bytesBase64Encoded}`;
            setVideoSrc(src);
            setNodes((nds) =>
              nds.map((n) =>
                n.id === id ? { ...n, data: { ...n.data, videoSrc: src } } : n,
              ),
            );
          } else if (resp.error) {
            throw new Error(`Failed: ${resp.error.message || JSON.stringify(resp.error)}`);
          }
          setPollStatus(null);
          return;
        }
      }

      if (attempts >= 60) throw new Error('Video timed out after 5 minutes.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPollStatus(null);
    } finally {
      setGenerating(false);
      pollRef.current = false;
    }
  }, [getPromptText, model, aspectRatio, id, setNodes]);

  return (
    <div className={`gs-video-gen-node ${selected ? 'selected' : ''}`}>
      <div className="gs-node-header gs-video-header">
        <span className="gs-node-title">Video Gen</span>
      </div>
      <div className="gs-node-tldr">Text-to-video with Veo models</div>
      <div className="gs-node-body">
        <div className="gs-field">
          <label className="gs-field-label">Model</label>
          <select
            className="gs-select nodrag"
            value={model.id}
            onChange={(e) => {
              const m = ALL_VIDEO_MODELS_SORTED.find((x) => x.id === e.target.value);
              if (m) setModel(m);
            }}
          >
            {ALL_VIDEO_MODELS_SORTED.map((m) => (
              <option key={m.id} value={m.id} title={m.description}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="gs-model-tags">{model.tags.join(' · ')}</div>
        </div>

        <div className="gs-field">
          <label className="gs-field-label">Aspect Ratio</label>
          <select
            className="gs-select nodrag"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
          >
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar.value} value={ar.value}>{ar.label}</option>
            ))}
          </select>
        </div>

        <textarea
          className="gs-prompt-inline nodrag nowheel"
          value={localPrompt}
          onChange={(e) => setLocalPrompt(e.target.value)}
          placeholder={promptConns.length ? 'Override prompt (or use connected)...' : 'Describe the video...'}
          rows={2}
        />

        <button
          className="gs-generate-btn gs-video-btn nodrag"
          onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
          disabled={generating}
        >
          {generating ? 'Generating...' : 'Generate Video'}
        </button>

        {pollStatus && (
          <div className="gs-poll-status">
            <div className="gs-spinner" />
            <span>{pollStatus}</span>
          </div>
        )}

        {error && <div className="gs-error">{error}</div>}

        {videoSrc && (
          <div className="gs-video-wrap">
            <video src={videoSrc} className="gs-preview-video" controls autoPlay loop muted />
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="prompt-in" style={{ background: '#64b5f6' }} />
      <Handle type="source" position={Position.Right} id="video-out" style={{ background: '#ba68c8' }} />
    </div>
  );
}

export default memo(VideoGenNodeInner);
