"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Handle, Position, useStore, useReactFlow } from "@xyflow/react";
import type { GeneratedImage } from "@/lib/ideation/engine/conceptlab/imageGenApi";
import { ATTRIBUTE_GROUPS, type CharacterIdentity, type CharacterAttributes } from "@/lib/ideation/engine/conceptlab/characterPrompts";
import { getAllPersonas } from "@tools/writing-room/agents";
import { createSessionFromExternal } from "@tools/writing-room/bridge";
import type { ChatAttachment, WritingType } from "@tools/writing-room/types";
import { WRITING_TYPE_OPTIONS } from "@tools/writing-room/types";
import "./UtilityNodes.css";

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const DEFAULT_ART_AGENTS = [
  "preset-producer",
  "preset-art-director",
  "preset-costume-designer",
];

function collectCharacterContext(
  nodeId: string,
  getNode: (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
  getEdges: () => Array<{ source: string; target: string }>,
): string {
  const edges = getEdges();
  const visited = new Set<string>();
  const queue = [nodeId];
  const parts: string[] = [];

  let identity: CharacterIdentity | null = null;
  let description = "";
  let charName = "";
  const attrs: CharacterAttributes = {};
  let bibleContext = "";
  let costumeParts: string[] = [];
  let styleFusion = "";
  let poseText = "";

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);

    for (const e of edges) {
      if (e.target === cur && !visited.has(e.source)) queue.push(e.source);
    }

    if (cur === nodeId) continue;
    const n = getNode(cur);
    if (!n?.data) continue;
    const d = n.data as Record<string, unknown>;

    switch (n.type) {
      case "charIdentity":
        if (d.identity) identity = d.identity as CharacterIdentity;
        if (d.name) charName = d.name as string;
        break;
      case "charDescription":
        if (d.description) description = d.description as string;
        break;
      case "charAttributes":
        if (d.attributes) Object.assign(attrs, d.attributes as CharacterAttributes);
        break;
      case "charPose":
        if (d.pose) poseText = d.pose as string;
        break;
      case "charBible": {
        const bp: string[] = [];
        if (d.characterName) bp.push(`Character: ${d.characterName}`);
        if (d.roleArchetype) bp.push(`Role: ${d.roleArchetype}`);
        if (d.backstory) bp.push(`Backstory: ${d.backstory}`);
        if (d.worldContext) bp.push(`World: ${d.worldContext}`);
        if (d.designIntent) bp.push(`Design intent: ${d.designIntent}`);
        const dirs = d.directors as string[] | undefined;
        if (dirs?.length) bp.push(`Production style: ${dirs.join(". ")}`);
        const tones = d.toneTags as string[] | undefined;
        if (tones?.length) bp.push(`Tone: ${tones.join(", ")}`);
        if (bp.length) bibleContext = bp.join("\n");
        break;
      }
      case "costumeDirector": {
        const cp: string[] = [];
        if (d.era) cp.push(`Era: ${d.era}`);
        if (d.setting) cp.push(`Setting: ${d.setting}`);
        if (d.notes) cp.push(`Notes: ${d.notes}`);
        if (cp.length) costumeParts = cp;
        break;
      }
      case "charStyleFusion":
        if (d.fusionBrief) styleFusion = d.fusionBrief as string;
        break;
      default:
        break;
    }
  }

  if (charName) parts.push(`CHARACTER NAME: ${charName}`);
  if (description) parts.push(`DESCRIPTION: ${description}`);
  if (identity) {
    const idParts = [identity.age, identity.race, identity.gender, identity.build].filter(Boolean);
    if (idParts.length) parts.push(`IDENTITY: ${idParts.join(", ")}`);
  }
  const attrLines: string[] = [];
  for (const g of ATTRIBUTE_GROUPS) {
    const val = attrs[g.key]?.trim();
    if (val && val.toLowerCase() !== "none") attrLines.push(`${g.label}: ${val}`);
  }
  if (attrs.pose?.trim()) attrLines.push(`Pose: ${attrs.pose.trim()}`);
  if (poseText && !attrs.pose?.trim()) attrLines.push(`Pose: ${poseText}`);
  if (attrLines.length) parts.push(`\nCHARACTER ATTRIBUTES:\n${attrLines.join("\n")}`);
  if (bibleContext) parts.push(`\nCHARACTER BIBLE:\n${bibleContext}`);
  if (costumeParts.length) parts.push(`\nCOSTUME DIRECTION:\n${costumeParts.join("\n")}`);
  if (styleFusion) parts.push(`\nSTYLE FUSION:\n${styleFusion}`);

  return parts.join("\n");
}

function WritingRoomNodeInner({ id, selected }: Props) {
  const [prompt, setPrompt] = useState("");
  const [writingType, setWritingType] = useState<WritingType>("art-direction");
  const [selectedAgents, setSelectedAgents] = useState<string[]>(DEFAULT_ART_AGENTS);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { getNode, getEdges } = useReactFlow();

  const allPersonas = useMemo(() => getAllPersonas(), []);

  const toggleAgent = useCallback((agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId) ? prev.filter((a) => a !== agentId) : [...prev, agentId],
    );
  }, []);

  const inputImagesSelector = useCallback(
    (state: {
      nodes: Array<{ id: string; data: Record<string, unknown> }>;
      edges: Array<{ source: string; target: string }>;
    }) => {
      const images: GeneratedImage[] = [];
      for (const e of state.edges) {
        if (e.target !== id) continue;
        const peer = state.nodes.find((n) => n.id === e.source);
        if (!peer?.data) continue;
        const bulk = peer.data._bulkImages as GeneratedImage[] | undefined;
        if (bulk?.length) { images.push(...bulk); continue; }
        const out = peer.data._outputImages as GeneratedImage[] | undefined;
        if (out?.length) { images.push(...out); continue; }
        const single = peer.data.generatedImage as GeneratedImage | undefined;
        if (single?.base64) images.push(single);
      }
      return images;
    },
    [id],
  );
  const inputImages = useStore(inputImagesSelector);

  const handleStart = useCallback(() => {
    const imageAttachments: ChatAttachment[] = inputImages.map((img) => ({
      type: "image" as const,
      mimeType: img.mimeType,
      base64: img.base64,
      fileName: "concept-lab-image.png",
    }));

    const charCtx = collectCharacterContext(
      id,
      getNode as (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
      getEdges as () => Array<{ source: string; target: string }>,
    );

    const sid = createSessionFromExternal({
      title: prompt.slice(0, 40) || "Art Direction Session",
      writingType,
      prompt: prompt || "Art direction discussion on the provided images.",
      selectedAgentIds: selectedAgents,
      imageAttachments,
      characterContext: charCtx || undefined,
    });

    setSessionId(sid);
  }, [inputImages, prompt, writingType, selectedAgents, id, getNode, getEdges]);

  const handleGoToRoom = useCallback(() => {
    const nav = (window as unknown as Record<string, unknown>).__workspaceNavigate as
      | ((path: string) => void)
      | undefined;
    if (nav) nav("/writing-room");
  }, []);

  return (
    <div
      className="utility-node"
      style={{ minWidth: 280, maxWidth: 320 }}
      data-selected={selected || undefined}
    >
      <Handle type="target" position={Position.Left} />
      <div className="utility-node-header">Writing Room Bridge</div>

      <div className="utility-node-body" style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 10px" }}>
        <div style={{ fontSize: 11, color: "#999" }}>
          {inputImages.length > 0
            ? `${inputImages.length} image${inputImages.length > 1 ? "s" : ""} connected`
            : "No images connected — connect an input"}
        </div>

        <label style={{ fontSize: 11, fontWeight: 600 }}>Writing Type</label>
        <select
          value={writingType}
          onChange={(e) => setWritingType(e.target.value as WritingType)}
          style={{ fontSize: 11, padding: "4px 6px", borderRadius: 4, background: "#1a1a2e", color: "#e0e0e0", border: "1px solid #333" }}
        >
          {WRITING_TYPE_OPTIONS.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>

        <label style={{ fontSize: 11, fontWeight: 600 }}>Art Direction Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What do you want art direction on?"
          rows={3}
          style={{ fontSize: 11, padding: 6, borderRadius: 4, background: "#1a1a2e", color: "#e0e0e0", border: "1px solid #333", resize: "vertical" }}
        />

        <label style={{ fontSize: 11, fontWeight: 600 }}>Personas</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {allPersonas.map((p) => (
            <button
              key={p.id}
              onClick={() => toggleAgent(p.id)}
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                border: "1px solid",
                borderColor: selectedAgents.includes(p.id) ? "#6366f1" : "#444",
                background: selectedAgents.includes(p.id) ? "rgba(99,102,241,0.2)" : "transparent",
                color: selectedAgents.includes(p.id) ? "#a5b4fc" : "#999",
                cursor: "pointer",
              }}
            >
              {p.avatar} {p.name}
            </button>
          ))}
        </div>

        {!sessionId ? (
          <button
            onClick={handleStart}
            disabled={selectedAgents.length === 0}
            style={{
              marginTop: 4,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: "none",
              background: "#6366f1",
              color: "#fff",
              cursor: selectedAgents.length > 0 ? "pointer" : "not-allowed",
              opacity: selectedAgents.length > 0 ? 1 : 0.5,
            }}
          >
            Start Discussion
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600 }}>
              Discussion started
            </div>
            <button
              onClick={handleGoToRoom}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: "1px solid #6366f1",
                background: "transparent",
                color: "#a5b4fc",
                cursor: "pointer",
              }}
            >
              Go to Writing Room
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const WritingRoomNode = memo(WritingRoomNodeInner);
