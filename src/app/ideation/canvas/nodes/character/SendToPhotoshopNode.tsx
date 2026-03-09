"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

async function sendImageToPS(image: GeneratedImage, label: string): Promise<string> {
  const res = await fetch('/api/send-to-photoshop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64: image.base64, mimeType: image.mimeType, label }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Send failed: ${err}`);
  }
  const json = await res.json();
  return json.message ?? 'Sent';
}

function collectImages(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): { image: GeneratedImage; label: string }[] {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === nodeId);
  const result: { image: GeneratedImage; label: string }[] = [];

  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;
    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) {
      result.push({ image: img, label: src.type ?? 'image' });
    }
    const viewImages = d.viewImages as Record<string, GeneratedImage> | undefined;
    if (viewImages) {
      for (const [key, vImg] of Object.entries(viewImages)) {
        if (vImg?.base64) result.push({ image: vImg, label: key });
      }
    }
  }
  return result;
}

function SendToPhotoshopNodeInner({ id, data, selected }: Props) {
  const { getNode, getEdges } = useReactFlow();
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendCurrent = useCallback(async () => {
    const imgs = collectImages(id, getNode, getEdges);
    if (imgs.length === 0) {
      setStatus('No images connected');
      return;
    }
    setSending(true);
    try {
      const msg = await sendImageToPS(imgs[0].image, imgs[0].label);
      setStatus(msg);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }, [id, getNode, getEdges]);

  const handleSendAll = useCallback(async () => {
    const imgs = collectImages(id, getNode, getEdges);
    if (imgs.length === 0) {
      setStatus('No images connected');
      return;
    }
    setSending(true);
    let count = 0;
    for (const item of imgs) {
      try {
        await sendImageToPS(item.image, item.label);
        count++;
      } catch {
        break;
      }
    }
    setStatus(`Sent ${count}/${imgs.length} images`);
    setSending(false);
  }, [id, getNode, getEdges]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charSendPS}>
      <div className="char-node-header" style={{ background: '#1565c0' }}>
        Send to Photoshop
      </div>
      <div className="char-node-body">
        <div className="char-btn-row">
          <button type="button" className="char-btn primary nodrag" onClick={handleSendCurrent} disabled={sending}>
            {sending ? 'Sending...' : 'Send Current'}
          </button>
          <button type="button" className="char-btn nodrag" onClick={handleSendAll} disabled={sending}>
            Send All
          </button>
        </div>
        {status && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{status}</div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="image-in" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(SendToPhotoshopNodeInner);
