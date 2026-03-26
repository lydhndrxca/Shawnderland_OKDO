"use client";

import { memo, useState, useCallback, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { getAllPersonas } from '@tools/writing-room/agents';
import type { AgentPersona } from '@tools/writing-room/types';
import { fetchPersonaCurrentEvents, isCacheFresh } from '@/lib/ideation/engine/personaCurrentEvents';
import type { PersonaNewsResult } from '@/lib/ideation/engine/personaCurrentEvents';
import { useGlobalSettings } from '@/lib/globalSettings';
import './WritingRoomPersonaNode.css';

interface WritingRoomPersonaNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function updateNodeData(id: string, d: Record<string, unknown>) {
  if ((window as unknown as Record<string, unknown>).__updateNodeData) {
    ((window as unknown as Record<string, unknown>).__updateNodeData as (id: string, d: Record<string, unknown>) => void)(id, d);
  }
}

function WritingRoomPersonaNodeInner({ id, data, selected }: WritingRoomPersonaNodeProps) {
  const persistedPersonaId = (data.personaId as string) ?? '';
  const persistedMood = (data.moodDirective as string) ?? '';
  const persistedUseEvents = (data.useCurrentEvents as boolean) ?? false;
  const persistedCache = (data.currentEventsCache as PersonaNewsResult | null) ?? null;
  const persistedEnabledDocs = (data.enabledKnowledgeDocs as string[]) ?? [];

  const [personaId, setPersonaId] = useState(persistedPersonaId);
  const [mood, setMood] = useState(persistedMood);
  const [useCurrentEvents, setUseCurrentEvents] = useState(persistedUseEvents);
  const [eventsCache, setEventsCache] = useState<PersonaNewsResult | null>(persistedCache);
  const [fetching, setFetching] = useState(false);
  const [newsExpanded, setNewsExpanded] = useState(false);
  const [enabledDocs, setEnabledDocs] = useState<string[]>(persistedEnabledDocs);
  const globalSettings = useGlobalSettings();
  const knowledgeDocs = globalSettings.projectKnowledgeDocs ?? [];

  const personas = useMemo<AgentPersona[]>(() => {
    try {
      return getAllPersonas();
    } catch {
      return [];
    }
  }, []);

  const selectedPersona = useMemo(
    () => personas.find((p) => p.id === personaId) ?? null,
    [personas, personaId],
  );

  const handlePersonaChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setPersonaId(next);
    setEventsCache(null);
    updateNodeData(id, { personaId: next, moodDirective: mood, useCurrentEvents, currentEventsCache: null, enabledKnowledgeDocs: enabledDocs });
  }, [id, mood, useCurrentEvents, enabledDocs]);

  const handleMoodChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setMood(next);
    updateNodeData(id, { personaId, moodDirective: next, useCurrentEvents, currentEventsCache: eventsCache, enabledKnowledgeDocs: enabledDocs });
  }, [id, personaId, useCurrentEvents, eventsCache, enabledDocs]);

  const doFetchEvents = useCallback(async (force = false) => {
    if (!selectedPersona) return;
    if (!force && isCacheFresh(eventsCache)) return;

    setFetching(true);
    try {
      const result = await fetchPersonaCurrentEvents({
        name: selectedPersona.name,
        role: selectedPersona.role,
        researchData: selectedPersona.researchData,
      });
      setEventsCache(result);
      updateNodeData(id, { personaId, moodDirective: mood, useCurrentEvents: true, currentEventsCache: result, enabledKnowledgeDocs: enabledDocs });
    } catch {
      // Non-critical failure
    } finally {
      setFetching(false);
    }
  }, [id, personaId, mood, selectedPersona, eventsCache]);

  const handleToggleEvents = useCallback(() => {
    const next = !useCurrentEvents;
    setUseCurrentEvents(next);
    updateNodeData(id, { personaId, moodDirective: mood, useCurrentEvents: next, currentEventsCache: eventsCache, enabledKnowledgeDocs: enabledDocs });
    if (next && selectedPersona && !isCacheFresh(eventsCache)) {
      doFetchEvents(true);
    }
  }, [id, personaId, mood, useCurrentEvents, selectedPersona, eventsCache, doFetchEvents]);

  const handleRefresh = useCallback(() => {
    doFetchEvents(true);
  }, [doFetchEvents]);

  const handleToggleDoc = useCallback((docId: string) => {
    const next = enabledDocs.includes(docId)
      ? enabledDocs.filter((d) => d !== docId)
      : [...enabledDocs, docId];
    setEnabledDocs(next);
    updateNodeData(id, { personaId, moodDirective: mood, useCurrentEvents, currentEventsCache: eventsCache, enabledKnowledgeDocs: next });
  }, [id, personaId, mood, useCurrentEvents, eventsCache, enabledDocs]);

  return (
    <div
      className={`wr-persona-node ${selected ? 'selected' : ''}`}
      title="Assign a Writing Room persona to infuse their creative voice into the ideation pipeline."
    >
      <div className="wr-persona-header">
        <span className="wr-persona-header-dot" />
        <span className="wr-persona-header-label">Creative Persona</span>
      </div>

      <div className="wr-persona-body">
        <select
          className="wr-persona-select nodrag nowheel"
          value={personaId}
          onChange={handlePersonaChange}
        >
          <option value="">None (default AI)</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.avatar} {p.name} — {p.role}
            </option>
          ))}
        </select>

        {selectedPersona && (
          <div className="wr-persona-preview">
            <span className="wr-persona-avatar">{selectedPersona.avatar}</span>
            <div className="wr-persona-info">
              <span className="wr-persona-name">{selectedPersona.name}</span>
              <span className="wr-persona-role">{selectedPersona.role}</span>
            </div>
          </div>
        )}

        <span className="wr-persona-mood-label">Mood / Directive</span>
        <textarea
          className="wr-persona-mood-input nodrag nowheel"
          value={mood}
          onChange={handleMoodChange}
          placeholder="e.g. furious, melancholic, sleep-deprived, playful..."
          spellCheck={false}
          rows={2}
        />

        {selectedPersona && (
          <div className="wr-persona-events-section">
            <label className="wr-persona-events-toggle nodrag">
              <input
                type="checkbox"
                checked={useCurrentEvents}
                onChange={handleToggleEvents}
                className="wr-persona-events-checkbox"
              />
              <span className="wr-persona-events-icon">🌍</span>
              <span className="wr-persona-events-label">Use Current Events</span>
            </label>

            {useCurrentEvents && fetching && (
              <div className="wr-persona-events-loading">
                <span className="wr-persona-events-spinner" />
                Scanning the world...
              </div>
            )}

            {useCurrentEvents && !fetching && eventsCache?.summary && (
              <div className="wr-persona-events-preview nodrag nowheel">
                <div className="wr-persona-events-preview-header">
                  <span className="wr-persona-events-source-count">
                    {eventsCache.sources.length} source{eventsCache.sources.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    className="wr-persona-events-refresh"
                    onClick={handleRefresh}
                    title="Refresh current events"
                  >
                    ↻
                  </button>
                  <button
                    className="wr-persona-events-expand"
                    onClick={() => setNewsExpanded(!newsExpanded)}
                  >
                    {newsExpanded ? '▾' : '▸'}
                  </button>
                </div>
                <div className={`wr-persona-events-text ${newsExpanded ? 'expanded' : ''}`}>
                  {newsExpanded ? eventsCache.summary : eventsCache.summary.slice(0, 200) + (eventsCache.summary.length > 200 ? '...' : '')}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedPersona && knowledgeDocs.length > 0 && (
          <div className="wr-persona-kb-section">
            <span className="wr-persona-kb-label">Project Knowledge</span>
            {knowledgeDocs.map((doc) => (
              <label key={doc.id} className="wr-persona-kb-toggle nodrag">
                <input
                  type="checkbox"
                  checked={enabledDocs.includes(doc.id)}
                  onChange={() => handleToggleDoc(doc.id)}
                  className="wr-persona-events-checkbox"
                />
                <span className="wr-persona-kb-icon">📋</span>
                <span className="wr-persona-kb-name">{doc.name}</span>
              </label>
            ))}
          </div>
        )}

        {!selectedPersona && (
          <div className="wr-persona-empty">
            Pick a persona to channel their creative voice
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="base-handle target-handle"
        style={{ background: '#7c4dff' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="base-handle source-handle"
        style={{ background: '#7c4dff' }}
      />
    </div>
  );
}

export default memo(WritingRoomPersonaNodeInner);
