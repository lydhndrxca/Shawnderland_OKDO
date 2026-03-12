"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import '../character/CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const DIRECTOR_PRESETS = [
  'Clive Barker — visceral body horror, organic-mechanical',
  'A24 — elevated restrained auteur horror',
  'Tim Burton — gothic whimsy, exaggerated silhouette, high contrast',
  'Zack Snyder — hyper-stylized, desaturated, muscular composition',
  'Quentin Tarantino — grindhouse, saturated color, retro-modern',
  'Daniel Warren Johnson — heavy ink, dynamic linework, raw energy',
  'David Fincher — clinical precision, muted palette',
  'Denis Villeneuve — grand scale, atmospheric minimalism',
  'Ridley Scott — weathered realism, industrial grit',
  'Christopher Nolan — grounded spectacle, IMAX scale',
  'George Miller — kinetic chaos, saturated action',
  'Jordan Peele — social horror, unsettling normalcy',
  'Wes Anderson — symmetrical, pastel, meticulous',
  'James Cameron — high-tech naturalism, blue-orange',
];

const TONE_TAGS = [
  'Feminine', 'Masculine', 'Powerful', 'Bold', 'Wicked',
  'Modern', 'Cutting edge', 'High fashion', 'Blockbuster movie quality',
  'Iconic', 'Timeless', 'Grounded in reality', 'Cinematic',
];

function CharacterBibleNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const localEdit = useRef(false);

  const [characterName, setCharacterName] = useState((data?.characterName as string) ?? '');
  const [roleArchetype, setRoleArchetype] = useState((data?.roleArchetype as string) ?? '');
  const [backstory, setBackstory] = useState((data?.backstory as string) ?? '');
  const [worldContext, setWorldContext] = useState((data?.worldContext as string) ?? '');
  const [designIntent, setDesignIntent] = useState((data?.designIntent as string) ?? '');
  const [directors, setDirectors] = useState<string[]>((data?.directors as string[]) ?? []);
  const [customDirector, setCustomDirector] = useState((data?.customDirector as string) ?? '');
  const [toneTags, setToneTags] = useState<Set<string>>(() => new Set((data?.toneTags as string[]) ?? []));
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (localEdit.current) { localEdit.current = false; return; }
    setCharacterName((data?.characterName as string) ?? '');
    setRoleArchetype((data?.roleArchetype as string) ?? '');
    setBackstory((data?.backstory as string) ?? '');
    setWorldContext((data?.worldContext as string) ?? '');
    setDesignIntent((data?.designIntent as string) ?? '');
    setDirectors((data?.directors as string[]) ?? []);
    setCustomDirector((data?.customDirector as string) ?? '');
    setToneTags(new Set((data?.toneTags as string[]) ?? []));
  }, [data?.characterName, data?.roleArchetype, data?.backstory, data?.worldContext, data?.designIntent, data?.directors, data?.customDirector, data?.toneTags]);

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      localEdit.current = true;
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const persistAll = useCallback(
    (overrides?: Record<string, unknown>) => {
      persist({
        characterName, roleArchetype, backstory, worldContext, designIntent,
        directors, customDirector, toneTags: [...toneTags],
        ...overrides,
      });
    },
    [persist, characterName, roleArchetype, backstory, worldContext, designIntent, directors, customDirector, toneTags],
  );

  const toggleDirector = useCallback((d: string) => {
    setDirectors((prev) => {
      const next = prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d];
      setTimeout(() => persist({
        characterName, roleArchetype, backstory, worldContext, designIntent,
        directors: next, customDirector, toneTags: [...toneTags],
      }), 0);
      return next;
    });
  }, [persist, characterName, roleArchetype, backstory, worldContext, designIntent, customDirector, toneTags]);

  const toggleTone = useCallback((t: string) => {
    setToneTags((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      setTimeout(() => persist({
        characterName, roleArchetype, backstory, worldContext, designIntent,
        directors, customDirector, toneTags: [...next],
      }), 0);
      return next;
    });
  }, [persist, characterName, roleArchetype, backstory, worldContext, designIntent, directors, customDirector]);

  const filledSections = [
    characterName, roleArchetype, backstory, worldContext, designIntent,
    directors.length > 0 || customDirector ? 'yes' : '',
    toneTags.size > 0 ? 'yes' : '',
  ].filter((v) => typeof v === 'string' ? v.trim() : v).length;

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} style={{ minWidth: 340, maxWidth: 440 }}
      title="Character Bible — Write the character's identity and narrative context once. Flows into every connected generation node automatically.">
      <div className="char-node-header" style={{ background: '#d84315', cursor: 'pointer' }} onClick={() => setMinimized((m) => !m)}>
        <span>Character Bible</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {filledSections > 0 && (
            <span style={{ fontSize: 9, background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: 8 }}>
              {filledSections}/7
            </span>
          )}
          <span style={{ fontSize: 10, opacity: 0.7 }}>{minimized ? '\u25BC' : '\u25B2'}</span>
        </span>
      </div>

      {minimized && (
        <div className="char-node-body" style={{ padding: '4px 10px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {characterName || 'Unnamed'} — {filledSections}/7 sections
          </span>
        </div>
      )}

      {!minimized && (
        <div className="char-node-body" style={{ gap: 8 }}>
          {/* Character Name */}
          <div>
            <span className="char-field-label" style={{ display: 'block', marginBottom: 3, minWidth: 0 }}>Character Name</span>
            <input className="char-input nodrag" value={characterName}
              onChange={(e) => { setCharacterName(e.target.value); setTimeout(persistAll, 0); }}
              placeholder='e.g. "The Red Queen", "Bloody Mary", "Floyd"'
              style={{ width: '100%', fontSize: 11 }} />
          </div>

          {/* Role / Archetype */}
          <div>
            <span className="char-field-label" style={{ display: 'block', marginBottom: 3, minWidth: 0 }}>Role / Archetype</span>
            <input className="char-input nodrag" value={roleArchetype}
              onChange={(e) => { setRoleArchetype(e.target.value); setTimeout(persistAll, 0); }}
              placeholder="villain, warrior queen, blood magic fighter, gunslinger"
              style={{ width: '100%', fontSize: 11 }} />
          </div>

          {/* Backstory */}
          <div>
            <span className="char-field-label" style={{ display: 'block', marginBottom: 3, minWidth: 0 }}>Backstory</span>
            <textarea className="char-textarea nodrag nowheel" value={backstory}
              onChange={(e) => { setBackstory(e.target.value); setTimeout(persistAll, 0); }}
              placeholder="Write it once — it flows into every generation. Who is this person? What drives them? What are they known for?"
              rows={4} style={{ width: '100%', fontSize: 11 }} />
          </div>

          {/* World Context */}
          <div>
            <span className="char-field-label" style={{ display: 'block', marginBottom: 3, minWidth: 0 }}>World / Setting</span>
            <textarea className="char-textarea nodrag nowheel" value={worldContext}
              onChange={(e) => { setWorldContext(e.target.value); setTimeout(persistAll, 0); }}
              placeholder="Backwoods Washington, Lovecraftian horror, abandoned summer camp, demolition derby circuit..."
              rows={2} style={{ width: '100%', fontSize: 11 }} />
          </div>

          {/* Design Intent */}
          <div>
            <span className="char-field-label" style={{ display: 'block', marginBottom: 3, minWidth: 0 }}>
              Design Intent
              <span style={{ fontWeight: 400, color: '#888', marginLeft: 4, textTransform: 'none' }}>— the creative goal</span>
            </span>
            <textarea className="char-textarea nodrag nowheel" value={designIntent}
              onChange={(e) => { setDesignIntent(e.target.value); setTimeout(persistAll, 0); }}
              placeholder="e.g. gothic punk industrial version of techwear without electronics. Modern cutting edge, high fashion. A symbol of terror assembled from hardware stores and thrift shops."
              rows={3} style={{ width: '100%', fontSize: 11 }} />
          </div>

          {/* Production / Director Style (multi-select) */}
          <div>
            <span className="char-field-label" style={{ display: 'block', marginBottom: 4, minWidth: 0 }}>
              Production Style
              <span style={{ fontWeight: 400, color: '#888', marginLeft: 4, textTransform: 'none' }}>— select multiple</span>
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {DIRECTOR_PRESETS.map((d) => {
                const name = d.split(' — ')[0];
                const active = directors.includes(d);
                return (
                  <button key={d} className="nodrag" onClick={() => toggleDirector(d)}
                    title={d}
                    style={{
                      fontSize: 10, padding: '3px 8px', borderRadius: 12,
                      border: `1px solid ${active ? 'rgba(216,67,21,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      background: active ? 'rgba(216,67,21,0.15)' : 'rgba(255,255,255,0.03)',
                      color: active ? '#ff8a65' : 'var(--text-muted)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    {name}
                  </button>
                );
              })}
            </div>
            <input className="char-input nodrag" value={customDirector}
              onChange={(e) => { setCustomDirector(e.target.value); setTimeout(persistAll, 0); }}
              placeholder="Custom director / production note..."
              style={{ width: '100%', fontSize: 10, marginTop: 4 }} />
          </div>

          {/* Tone Tags */}
          <div>
            <span className="char-field-label" style={{ display: 'block', marginBottom: 4, minWidth: 0 }}>
              Tone / Quality
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {TONE_TAGS.map((t) => {
                const active = toneTags.has(t);
                return (
                  <button key={t} className="nodrag" onClick={() => toggleTone(t)}
                    style={{
                      fontSize: 10, padding: '3px 8px', borderRadius: 12,
                      border: `1px solid ${active ? 'rgba(216,67,21,0.5)' : 'rgba(255,255,255,0.1)'}`,
                      background: active ? 'rgba(216,67,21,0.15)' : 'rgba(255,255,255,0.03)',
                      color: active ? '#ff8a65' : 'var(--text-muted)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="bible-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(CharacterBibleNodeInner);
