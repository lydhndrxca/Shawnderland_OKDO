"use client";

import { memo, useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { Handle, Position, useEdges, useNodes, useReactFlow } from '@xyflow/react';
import { VIDEO_MODELS, ASPECT_RATIOS, type ModelOption } from './modelCatalog';
import { recordVeoUsage } from '@/lib/ideation/engine/provider/costTracker';
import { logGeneration, buildLineageContext, type SessionSnapshot } from '@/lib/ideation/engine/generationLog';
import { proxyGenerate, proxyPollOperation } from '@/lib/ideation/engine/aiProxy';
import './VideoOutputNode.css';

function extractUpstreamContext(nodeId: string, allNodes: ReturnType<typeof useNodes>, allEdges: ReturnType<typeof useEdges>): string {
  const incomingEdges = allEdges.filter((e) => e.target === nodeId);
  const contexts: string[] = [];
  for (const edge of incomingEdges) {
    const sourceNode = allNodes.find((n) => n.id === edge.source);
    if (!sourceNode) continue;
    const d = sourceNode.data as Record<string, unknown>;
    if (d.extractedText && typeof d.extractedText === 'string') contexts.push(d.extractedText);
    if (d.documentContent && typeof d.documentContent === 'string') contexts.push(d.documentContent);
    if (d.nodeText && typeof d.nodeText === 'string') contexts.push(d.nodeText);
    if (d.outputData && typeof d.outputData === 'object') {
      const od = d.outputData as Record<string, unknown>;
      if (od.title) contexts.push(`Title: ${od.title}`);
      if (od.seedSummary) contexts.push(`Summary: ${od.seedSummary}`);
    }
    if (d.seedText && typeof d.seedText === 'string') contexts.push(d.seedText);
    if (d.text && typeof d.text === 'string' && !contexts.length) contexts.push(d.text);
    if (d.prefillSeed && typeof d.prefillSeed === 'string') contexts.push(d.prefillSeed);
  }
  return contexts.join('\n');
}

interface VideoOutputNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function VideoOutputNodeInner({ id, selected }: VideoOutputNodeProps) {
  const { setNodes } = useReactFlow();
  const allNodes = useNodes();
  const allEdges = useEdges();
  const [model, setModelLocal] = useState<ModelOption>(VIDEO_MODELS[0]);
  const [aspectRatio, setAspectRatioLocal] = useState('16:9');
  const [prompt, setPrompt] = useState('');
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [pollStatus, setPollStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const setModel = useCallback((m: ModelOption) => {
    setModelLocal(m);
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, selectedModelId: m.id } } : n));
  }, [id, setNodes]);

  const setAspectRatio = useCallback((ar: string) => {
    setAspectRatioLocal(ar);
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, aspectRatio: ar } } : n));
  }, [id, setNodes]);

  const upstreamContext = useMemo(() => extractUpstreamContext(id, allNodes, allEdges), [id, allNodes, allEdges]);
  const hasUpstream = upstreamContext.trim().length > 0;

  const buildEffectivePrompt = useCallback((): string => {
    const parts: string[] = [];
    if (hasUpstream) parts.push(upstreamContext);
    if (prompt.trim()) parts.push(prompt.trim());
    return parts.join('\n\n');
  }, [hasUpstream, upstreamContext, prompt]);

  const canGenerate = prompt.trim().length > 0 || hasUpstream;

  const handleGenerate = useCallback(async () => {
    const effectivePrompt = buildEffectivePrompt();
    if (!effectivePrompt.trim()) return;
    setGenerating(true);
    setError(null);
    setPollStatus('Submitting to Veo...');
    pollRef.current = true;

    try {
      const json = await proxyGenerate(model.modelId, 'predictLongRunning', {
        instances: [{ prompt: effectivePrompt }],
        parameters: { aspectRatio },
      }, 60_000) as { name?: string; predictions?: Array<{ bytesBase64Encoded: string; mimeType?: string }> };

      const operationName = json?.name;

      if (!operationName) {
        if (json?.predictions?.[0]?.bytesBase64Encoded) {
          if (!mountedRef.current) return;
          const b64 = json.predictions[0].bytesBase64Encoded;
          const mime = json.predictions[0].mimeType || 'video/mp4';
          setVideoSrc(`data:${mime};base64,${b64}`);
          setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, videoBase64: b64, videoMimeType: mime } } : n));
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
      let attempts = 0;
      const maxAttempts = 60;

      while (pollRef.current && attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 5000));
        attempts++;
        setPollStatus(`Generating video... (${attempts * 5}s elapsed)`);

        let pollJson: Record<string, unknown>;
        try {
          pollJson = await proxyPollOperation(operationName);
        } catch {
          continue;
        }
        if ((pollJson as { done?: boolean }).done) {
          const resp = pollJson as { response?: { predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }> }; error?: { message?: string } };
          const video = resp.response?.predictions?.[0];
          if (video?.bytesBase64Encoded) {
            if (!mountedRef.current) return;
            const mime = video.mimeType || 'video/mp4';
            setVideoSrc(`data:${mime};base64,${video.bytesBase64Encoded}`);
            setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, videoBase64: video.bytesBase64Encoded, videoMimeType: mime } } : n));
            recordVeoUsage(model.modelId, 6);
            const w2 = window as unknown as Record<string, unknown>;
            const sid2 = (w2.__sessionId as string) ?? 'unknown';
            const snap2 = w2.__sessionSnapshot as SessionSnapshot | undefined;
            logGeneration({ sessionId: sid2, category: 'video', source: 'VideoOutputNode', model: model.modelId, prompt: prompt.trim(), output: { durationSec: 6, aspectRatio }, lineage: snap2 ? buildLineageContext(snap2) : undefined });
          } else if (resp.error) {
            throw new Error(`Video generation failed: ${resp.error.message || JSON.stringify(resp.error)}`);
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
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : String(e));
        setPollStatus(null);
      }
    } finally {
      if (mountedRef.current) setGenerating(false);
      pollRef.current = false;
    }
  }, [buildEffectivePrompt, model, aspectRatio, id, setNodes]);

  return (
    <div
      className={`video-output-node ${selected ? 'selected' : ''}`}
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
              const m2 = VIDEO_MODELS.find((vm) => vm.id === e.target.value);
              if (m2) setModel(m2);
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

        {hasUpstream && (
          <div className="video-output-upstream-hint" style={{ fontSize: '10px', color: 'rgba(186,104,200,0.6)', marginBottom: 4 }}>
            Connected upstream data will be used as context
          </div>
        )}

        <button
          className="video-output-generate nodrag"
          onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
          disabled={generating || !canGenerate}
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
          <div className="video-output-preview-wrap">
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
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="video-output-handle"
        style={{ background: '#ba68c8' }}
      />
    </div>
  );
}

export default memo(VideoOutputNodeInner);
