"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ATTRIBUTE_GROUPS, type CharacterIdentity, type CharacterAttributes } from '@/lib/ideation/engine/conceptlab/characterPrompts';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

/**
 * Map our lowercase attribute keys to PascalCase XML element names
 * matching the original PUBG Madison AI Suite character_generator.py.
 */
const KEY_TO_XML_NAME: Record<string, string> = {
  headwear: 'Headwear',
  outerwear: 'Outerwear',
  top: 'Top',
  legwear: 'Legwear',
  footwear: 'Footwear',
  gloves: 'Gloves',
  facegear: 'FaceGear',
  utilityrig: 'UtilityRig',
  backcarry: 'BackCarry',
  handprop: 'HandProp',
  accessories: 'Accessories',
  coloraccents: 'ColorAccents',
  detailing: 'Detailing',
  pose: 'Pose',
};

const VIEW_TYPES: Record<string, string> = {
  charMainViewer: 'main',
  charViewer: 'main',
  charImageViewer: 'main',
  charFrontViewer: 'front',
  charBackViewer: 'back',
  charSideViewer: 'side',
};

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Builds XML in the exact same format as PUBG Madison AI Suite's
 * character_generator.py `generate_xml()` method.
 */
function buildXML(
  identity: CharacterIdentity,
  attributes: CharacterAttributes,
  description: string,
  name: string,
  viewImages: { main: boolean; front: boolean; back: boolean; side: boolean },
): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<CharacterConcept>'];

  // Identity
  lines.push('  <Identity>');
  lines.push(`    <Age>${escXml(identity.age || 'Not specified')}</Age>`);
  lines.push(`    <Race>${escXml(identity.race || 'Not specified')}</Race>`);
  lines.push(`    <Gender>${escXml(identity.gender || 'Not specified')}</Gender>`);
  lines.push(`    <Build>${escXml(identity.build || 'Not specified')}</Build>`);
  if (name) lines.push(`    <Name>${escXml(name)}</Name>`);
  if (description) lines.push(`    <Description>${escXml(description)}</Description>`);
  lines.push('  </Identity>');

  // Attributes (PascalCase element names matching PUBG suite)
  lines.push('  <Attributes>');
  for (const g of ATTRIBUTE_GROUPS) {
    const val = attributes[g.key]?.trim();
    if (val) {
      const xmlName = KEY_TO_XML_NAME[g.key] || g.key;
      lines.push(`    <${xmlName}>${escXml(val)}</${xmlName}>`);
    }
  }
  if (attributes.pose?.trim()) {
    lines.push(`    <Pose>${escXml(attributes.pose)}</Pose>`);
  }
  lines.push('  </Attributes>');

  // GenerationInfo (matches PUBG suite — includes view image status)
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

function ShowXMLNodeInner({ id, data, selected }: Props) {
  const { getNode, getEdges } = useReactFlow();
  const [xml, setXml] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(() => {
    const edges = getEdges();
    const incoming = edges.filter((e) => e.target === id);

    let identity: CharacterIdentity = { age: '', race: '', gender: '', build: '' };
    let description = '';
    let name = '';
    let attributes: CharacterAttributes = {};

    // Walk all upstream connected nodes to gather data
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

    // Detect which view images exist by scanning all nodes reachable from
    // the same generate node(s) that feed into this Show XML node.
    const viewImages = { main: false, front: false, back: false, side: false };
    const allEdges = getEdges();
    const allNodes = new Set<string>();

    // Gather all source node IDs that connect to us
    const sourceIds = incoming.map((e) => e.source);
    // Walk outward from each source to find viewer nodes
    const visited = new Set<string>();
    const queue = [...sourceIds];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      allNodes.add(cur);
      const outgoing = allEdges.filter((e) => e.source === cur);
      for (const oe of outgoing) {
        if (!visited.has(oe.target)) queue.push(oe.target);
      }
    }

    // Check each reachable node for viewer type + generated image
    for (const nid of allNodes) {
      const n = getNode(nid);
      if (!n) continue;
      const viewKey = VIEW_TYPES[n.type ?? ''];
      if (!viewKey) continue;
      const nd = n.data as Record<string, unknown>;
      const img = nd.generatedImage as GeneratedImage | undefined;
      if (img?.base64) {
        viewImages[viewKey as keyof typeof viewImages] = true;
      }
    }

    const xmlStr = buildXML(identity, attributes, description, name, viewImages);
    setXml(xmlStr);

    // Auto-copy to clipboard (same as PUBG suite's "Copy XML")
    navigator.clipboard.writeText(xmlStr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [id, getNode, getEdges]);

  const handleCopy = useCallback(async () => {
    if (!xml) return;
    await navigator.clipboard.writeText(xml).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [xml]);

  const handleSave = useCallback(() => {
    if (!xml) return;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'character.xml';
    a.click();
    URL.revokeObjectURL(url);
  }, [xml]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charShowXML}>
      <div className="char-node-header" style={{ background: '#8d6e63' }}>
        Show XML
      </div>
      <div className="char-node-body">
        <button className="char-btn nodrag" onClick={handleGenerate}>
          {copied ? '✓ Copied to Clipboard' : 'Generate XML'}
        </button>
        {xml && (
          <>
            <textarea className="char-xml-content nodrag nowheel" value={xml} readOnly />
            <div className="char-btn-row">
              <button className="char-btn nodrag" onClick={handleCopy}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button className="char-btn nodrag" onClick={handleSave}>Save XML</button>
            </div>
          </>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(ShowXMLNodeInner);
