"use client";

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { ATTRIBUTE_GROUPS, type CharacterIdentity, type CharacterAttributes } from '@/lib/ideation/engine/conceptlab/characterPrompts';
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

const KEY_TO_XML_NAME: Record<string, string> = {
  headwear: 'Headwear', outerwear: 'Outerwear', top: 'Top', legwear: 'Legwear',
  footwear: 'Footwear', gloves: 'Gloves', facegear: 'FaceGear', utilityrig: 'UtilityRig',
  backcarry: 'BackCarry', handprop: 'HandProp', accessories: 'Accessories',
  coloraccents: 'ColorAccents', detailing: 'Detailing', pose: 'Pose',
};

const VIEW_TYPES: Record<string, string> = {
  charMainViewer: 'main', charViewer: 'main', charImageViewer: 'main',
  charFrontViewer: 'front', charBackViewer: 'back', charSideViewer: 'side',
};

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildXML(
  identity: CharacterIdentity,
  attributes: CharacterAttributes,
  description: string,
  name: string,
  viewImages: { main: boolean; front: boolean; back: boolean; side: boolean },
): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<CharacterConcept>'];
  lines.push('  <Identity>');
  lines.push(`    <Age>${escXml(identity.age || 'Not specified')}</Age>`);
  lines.push(`    <Race>${escXml(identity.race || 'Not specified')}</Race>`);
  lines.push(`    <Gender>${escXml(identity.gender || 'Not specified')}</Gender>`);
  lines.push(`    <Build>${escXml(identity.build || 'Not specified')}</Build>`);
  if (name) lines.push(`    <Name>${escXml(name)}</Name>`);
  if (description) lines.push(`    <Description>${escXml(description)}</Description>`);
  lines.push('  </Identity>');
  lines.push('  <Attributes>');
  for (const g of ATTRIBUTE_GROUPS) {
    const val = attributes[g.key]?.trim();
    if (val) {
      const xmlName = KEY_TO_XML_NAME[g.key] || g.key;
      lines.push(`    <${xmlName}>${escXml(val)}</${xmlName}>`);
    }
  }
  if (attributes.pose?.trim()) lines.push(`    <Pose>${escXml(attributes.pose)}</Pose>`);
  lines.push('  </Attributes>');
  lines.push('  <GenerationInfo>');
  lines.push(`    <HasMainImage>${viewImages.main}</HasMainImage>`);
  lines.push(`    <HasFrontView>${viewImages.front}</HasFrontView>`);
  lines.push(`    <HasBackView>${viewImages.back}</HasBackView>`);
  lines.push(`    <HasSideView>${viewImages.side}</HasSideView>`);
  lines.push(`    <CreatedDate>${new Date().toISOString().replace('T', ' ').slice(0, 19)}</CreatedDate>`);
  lines.push('  </GenerationInfo>');
  lines.push('</CharacterConcept>');
  return lines.join('\n');
}

function ExportNodeInner({ id, data, selected }: Props) {
  const { getNode, getEdges, setNodes } = useReactFlow();
  const [groupName, setGroupName] = useState<string>((data?.groupName as string) ?? '');
  const [namingPattern, setNamingPattern] = useState<string>((data?.namingPattern as string) ?? '{name}_{view}');
  const [showPattern, setShowPattern] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [xml, setXml] = useState('');
  const [showXml, setShowXml] = useState(false);
  const [xmlCopied, setXmlCopied] = useState(false);

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

    const name = groupName.trim() || `Export ${new Date().toLocaleString()}`;
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

  const gatherXmlData = useCallback(() => {
    const edges = getEdges();
    const incoming = edges.filter((e) => e.target === id);

    let identity: CharacterIdentity = { age: '', race: '', gender: '', build: '' };
    let description = '';
    let name = '';
    let attributes: CharacterAttributes = {};

    for (const e of incoming) {
      const src = getNode(e.source);
      if (!src?.data) continue;
      const d = src.data as Record<string, unknown>;
      if (d.identity) identity = d.identity as CharacterIdentity;
      if (d.description) description = d.description as string;
      if (d.name) name = d.name as string;
      if (d.attributes) attributes = { ...attributes, ...(d.attributes as CharacterAttributes) };
      if (d.pose) attributes.pose = d.pose as string;
    }

    const viewImages = { main: false, front: false, back: false, side: false };
    const sourceIds = incoming.map((e) => e.source);
    const visited = new Set<string>();
    const queue = [...sourceIds];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const outgoing = edges.filter((e) => e.source === cur);
      for (const oe of outgoing) {
        if (!visited.has(oe.target)) queue.push(oe.target);
      }
    }
    for (const nid of visited) {
      const n = getNode(nid);
      if (!n) continue;
      const viewKey = VIEW_TYPES[n.type ?? ''];
      if (!viewKey) continue;
      const nd = n.data as Record<string, unknown>;
      const img = nd.generatedImage as GeneratedImage | undefined;
      if (img?.base64) viewImages[viewKey as keyof typeof viewImages] = true;
    }

    return buildXML(identity, attributes, description, name || groupName, viewImages);
  }, [id, getNode, getEdges, groupName]);

  const handleViewXml = useCallback(() => {
    const xmlStr = gatherXmlData();
    setXml(xmlStr);
    setShowXml(true);
    navigator.clipboard.writeText(xmlStr).then(() => {
      setXmlCopied(true);
      setTimeout(() => setXmlCopied(false), 2000);
    }).catch(() => {});
  }, [gatherXmlData]);

  const handleCopyXml = useCallback(() => {
    if (!xml) return;
    navigator.clipboard.writeText(xml).then(() => {
      setXmlCopied(true);
      setTimeout(() => setXmlCopied(false), 2000);
    }).catch(() => {});
  }, [xml]);

  const handleSaveXml = useCallback(() => {
    if (!xml) return;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${groupName.trim() || 'character'}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }, [xml, groupName]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charSaveGroup ?? 'Export connected images and character data'}>
      <div className="char-node-header" style={{ background: '#009688' }}>
        Export
      </div>
      <div className="char-node-body">
        <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2 }}>Name</label>
        <input
          className="nodrag nowheel"
          type="text"
          placeholder="e.g. Warrior Final"
          value={groupName}
          onChange={(e) => { setGroupName(e.target.value); persist({ groupName: e.target.value }); }}
          style={{
            width: '100%', padding: '5px 8px', fontSize: 12,
            background: '#1a1a2e', color: '#eee', border: '1px solid #444',
            borderRadius: 4, marginBottom: 6,
          }}
        />

        <button
          type="button"
          className="nodrag"
          onClick={() => setShowPattern(!showPattern)}
          style={{
            background: 'none', border: 'none', color: '#888',
            fontSize: 10, cursor: 'pointer', padding: '2px 0',
            marginBottom: 4, textAlign: 'left',
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
                width: '100%', padding: '4px 6px', fontSize: 11,
                background: '#1a1a2e', color: '#eee', border: '1px solid #444',
                borderRadius: 4, marginBottom: 3,
              }}
            />
            <div style={{ fontSize: 9, color: '#666', lineHeight: 1.4 }}>
              Tokens: {'{name}'} = group name, {'{view}'} = view name, {'{###}'} = padded index
            </div>
          </div>
        )}

        <div style={{ fontSize: 11, color: connectedImages.length > 0 ? '#69f0ae' : '#888', marginBottom: 6 }}>
          {connectedImages.length > 0
            ? `${connectedImages.length} image${connectedImages.length > 1 ? 's' : ''}: ${connectedImages.map((c) => c.viewName).join(', ')}`
            : 'No images connected'
          }
        </div>

        {/* ── Image export ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <button type="button" className="char-btn primary nodrag" onClick={() => handleSave(false)}
            disabled={saving || connectedImages.length === 0} style={{ flex: 1 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" className="char-btn primary nodrag" onClick={() => handleSave(true)}
            disabled={saving || connectedImages.length === 0} style={{ flex: 1, background: '#00796b' }}>
            Save + Download
          </button>
        </div>

        {/* ── XML export ── */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button type="button" className="char-btn nodrag" onClick={handleViewXml} style={{ flex: 1 }}>
            {xmlCopied && !showXml ? '✓ Copied' : 'View XML'}
          </button>
          <button type="button" className="char-btn nodrag" onClick={() => { const x = gatherXmlData(); setXml(x); handleSaveXml(); }}
            style={{ flex: 1 }}>
            Export XML
          </button>
        </div>

        {/* ── XML viewer panel ── */}
        {showXml && xml && (
          <div style={{ marginTop: 6 }}>
            <textarea
              className="char-xml-content nodrag nowheel"
              value={xml}
              readOnly
              style={{
                width: '100%', minHeight: 120, maxHeight: 200,
                fontSize: 10, fontFamily: 'monospace',
                background: '#0d0d1a', color: '#b0b0c0', border: '1px solid #444',
                borderRadius: 4, padding: '6px 8px', resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <button type="button" className="char-btn nodrag" onClick={handleCopyXml} style={{ flex: 1 }}>
                {xmlCopied ? '✓ Copied' : 'Copy XML'}
              </button>
              <button type="button" className="char-btn nodrag" onClick={handleSaveXml} style={{ flex: 1 }}>
                Save XML File
              </button>
              <button type="button" className="char-btn nodrag" onClick={() => setShowXml(false)}
                style={{ padding: '4px 8px', color: '#888' }}>
                ✕
              </button>
            </div>
          </div>
        )}

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

export default memo(ExportNodeInner);
