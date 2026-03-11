"use client";

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { saveGroup, generateThumbnail, applyNamingPattern, type SavedImage, type SavedGroup } from '@/lib/filesStore';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const VIEW_LABEL_MAP: Record<string, string> = {
  charMainViewer: 'Main Stage',
  charFrontViewer: 'Front',
  charBackViewer: 'Back',
  charSideViewer: 'Side',
  charCustomView: 'Custom',
  charViewer: 'Viewer',
  charImageViewer: 'Image Viewer',
  imageOutput: 'Image Output',
  imageReference: 'Image Reference',
  charGenerate: 'Generate',
};

function getNodeViewName(node: { type?: string; data: Record<string, unknown> }): string {
  const custom = node.data?.customLabel as string | undefined;
  if (custom) return custom;
  const viewKey = node.data?.viewKey as string | undefined;
  if (viewKey) return viewKey;
  return VIEW_LABEL_MAP[node.type ?? ''] ?? node.type ?? 'image';
}

function SaveGroupNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [groupName, setGroupName] = useState<string>((data?.groupName as string) ?? '');
  const [namingPattern, setNamingPattern] = useState<string>((data?.namingPattern as string) ?? '{name}_{view}');
  const [showPattern, setShowPattern] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(statusTimer.current), []);

  const persist = useCallback((updates: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n));
  }, [id, setNodes]);

  const connectedImages = useStore(
    useCallback(
      (state: { edges: Array<{ source: string; target: string }>; nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }> }) => {
        const incoming = state.edges.filter((e) => e.target === id);
        const results: { nodeId: string; viewName: string; image: GeneratedImage }[] = [];
        for (const e of incoming) {
          const src = state.nodes.find((n) => n.id === e.source);
          if (!src?.data) continue;
          const img = src.data.generatedImage as GeneratedImage | undefined;
          if (img?.base64) {
            results.push({
              nodeId: src.id,
              viewName: getNodeViewName({ type: src.type, data: src.data }),
              image: img,
            });
          }
        }
        return results;
      },
      [id],
    ),
  );

  const handleSave = useCallback(async (download: boolean) => {
    if (connectedImages.length === 0) {
      setStatus('No images connected');
      clearTimeout(statusTimer.current);
      statusTimer.current = setTimeout(() => setStatus(null), 3000);
      return;
    }

    const name = groupName.trim() || `Save ${new Date().toLocaleString()}`;
    setSaving(true);
    setStatus('Saving...');

    try {
      const images: SavedImage[] = connectedImages.map((ci) => ({
        viewName: ci.viewName,
        base64: ci.image.base64,
        mimeType: ci.image.mimeType,
        nodeLabel: ci.viewName,
      }));

      const thumb = await generateThumbnail(images[0].base64, images[0].mimeType);

      const group: SavedGroup = {
        id: crypto.randomUUID(),
        name,
        appKey: 'concept-lab',
        images,
        namingPattern: namingPattern || '{name}_{view}',
        createdAt: new Date().toISOString(),
        thumbnailBase64: thumb,
      };

      await saveGroup(group);

      if (download) {
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const fileName = applyNamingPattern(
            namingPattern || '{name}_{view}',
            name,
            img.viewName,
            i + 1,
          ) + '.png';
          try {
            const blob = await fetch(`data:${img.mimeType};base64,${img.base64}`).then((r) => r.blob());
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
          } catch { /* best-effort download */ }
        }
      }

      setStatus(`Saved "${name}" (${images.length} image${images.length > 1 ? 's' : ''})`);
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
      clearTimeout(statusTimer.current);
      statusTimer.current = setTimeout(() => setStatus(null), 4000);
    }
  }, [connectedImages, groupName, namingPattern]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charSaveGroup ?? 'Save connected images as a group'}>
      <div className="char-node-header" style={{ background: '#009688' }}>
        Save Group
      </div>
      <div className="char-node-body">
        {/* Group Name */}
        <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2 }}>Group Name</label>
        <input
          className="nodrag nowheel"
          type="text"
          placeholder="e.g. Warrior Final"
          value={groupName}
          onChange={(e) => { setGroupName(e.target.value); persist({ groupName: e.target.value }); }}
          style={{
            width: '100%',
            padding: '5px 8px',
            fontSize: 12,
            background: '#1a1a2e',
            color: '#eee',
            border: '1px solid #444',
            borderRadius: 4,
            marginBottom: 6,
          }}
        />

        {/* Naming Pattern (collapsible) */}
        <button
          type="button"
          className="nodrag"
          onClick={() => setShowPattern(!showPattern)}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: 10,
            cursor: 'pointer',
            padding: '2px 0',
            marginBottom: 4,
            textAlign: 'left',
          }}
        >
          {showPattern ? '▼' : '▶'} Naming Pattern
        </button>
        {showPattern && (
          <div style={{ marginBottom: 6 }}>
            <input
              className="nodrag nowheel"
              type="text"
              value={namingPattern}
              onChange={(e) => { setNamingPattern(e.target.value); persist({ namingPattern: e.target.value }); }}
              style={{
                width: '100%',
                padding: '4px 6px',
                fontSize: 11,
                background: '#1a1a2e',
                color: '#eee',
                border: '1px solid #444',
                borderRadius: 4,
                marginBottom: 3,
              }}
            />
            <div style={{ fontSize: 9, color: '#666', lineHeight: 1.4 }}>
              Tokens: {'{name}'} = group name, {'{view}'} = view name, {'{###}'} = padded index
            </div>
          </div>
        )}

        {/* Connected images status */}
        <div style={{ fontSize: 11, color: connectedImages.length > 0 ? '#69f0ae' : '#888', marginBottom: 6 }}>
          {connectedImages.length > 0
            ? `${connectedImages.length} image${connectedImages.length > 1 ? 's' : ''}: ${connectedImages.map((c) => c.viewName).join(', ')}`
            : 'No images connected'
          }
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            className="char-btn primary nodrag"
            onClick={() => handleSave(false)}
            disabled={saving || connectedImages.length === 0}
            style={{ flex: 1 }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            className="char-btn primary nodrag"
            onClick={() => handleSave(true)}
            disabled={saving || connectedImages.length === 0}
            style={{ flex: 1, background: '#00796b' }}
          >
            Save + Download
          </button>
        </div>

        {status && (
          <div style={{ fontSize: 10, color: status.startsWith('Error') ? '#ef5350' : '#69f0ae', marginTop: 4 }}>
            {status}
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(SaveGroupNodeInner);
