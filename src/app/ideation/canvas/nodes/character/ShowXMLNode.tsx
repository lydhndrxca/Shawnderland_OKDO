"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ATTRIBUTE_GROUPS, type CharacterIdentity, type CharacterAttributes } from '@/lib/ideation/engine/conceptlab/characterPrompts';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function buildXML(identity: CharacterIdentity, attributes: CharacterAttributes, description: string, name: string): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<CharacterConcept>'];

  lines.push('  <Identity>');
  if (name) lines.push(`    <Name>${escXml(name)}</Name>`);
  lines.push(`    <Age>${escXml(identity.age || 'Not specified')}</Age>`);
  lines.push(`    <Race>${escXml(identity.race || 'Not specified')}</Race>`);
  lines.push(`    <Gender>${escXml(identity.gender || 'Not specified')}</Gender>`);
  lines.push(`    <Build>${escXml(identity.build || 'Not specified')}</Build>`);
  if (description) lines.push(`    <Description>${escXml(description)}</Description>`);
  lines.push('  </Identity>');

  lines.push('  <Attributes>');
  for (const g of ATTRIBUTE_GROUPS) {
    const val = attributes[g.key];
    if (val) lines.push(`    <${g.key}>${escXml(val)}</${g.key}>`);
  }
  lines.push('  </Attributes>');

  lines.push(`  <GenerationInfo>`);
  lines.push(`    <CreatedDate>${new Date().toISOString()}</CreatedDate>`);
  lines.push(`  </GenerationInfo>`);
  lines.push('</CharacterConcept>');

  return lines.join('\n');
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function ShowXMLNodeInner({ id, data, selected }: Props) {
  const { getNode, getEdges } = useReactFlow();
  const [xml, setXml] = useState('');

  const handleGenerate = useCallback(() => {
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
    }

    setXml(buildXML(identity, attributes, description, name));
  }, [id, getNode, getEdges]);

  const handleCopy = useCallback(async () => {
    if (xml) await navigator.clipboard.writeText(xml).catch(() => {});
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
          Generate XML
        </button>
        {xml && (
          <>
            <textarea className="char-xml-content nodrag nowheel" value={xml} readOnly />
            <div className="char-btn-row">
              <button className="char-btn nodrag" onClick={handleCopy}>Copy</button>
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
