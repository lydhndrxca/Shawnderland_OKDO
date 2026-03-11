"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TOOLS } from "@/lib/registry";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { ToolNode, type ToolNodeData } from "./ToolNode";
import { PipelineEdge } from "@shawnderland/ui";

const nodeTypes: NodeTypes = {
  tool: ToolNode,
};

const edgeTypes = {
  pipeline: PipelineEdge,
};

const LAYOUT: Record<string, { x: number; y: number }> = {
  "sprite-lab": { x: 80, y: 40 },
  ideation: { x: 80, y: 340 },
  "ui-lab": { x: 500, y: 40 },
  "concept-lab": { x: 500, y: 340 },
  walter: { x: 290, y: 620 },
};

export function HubCanvas() {
  const { navigate } = useWorkspace();

  const onOpenTool = useCallback(
    (toolId: string) => {
      const tool = TOOLS.find((t) => t.id === toolId);
      if (tool) navigate(tool.href);
    },
    [navigate]
  );

  const visibleTools = useMemo(() => TOOLS.filter((t) => !t.hidden), []);

  const nodes: Node[] = useMemo(
    () =>
      visibleTools.map((tool) => ({
        id: tool.id,
        type: "tool",
        position: LAYOUT[tool.id] ?? { x: 0, y: 0 },
        data: {
          toolId: tool.id,
          name: tool.name,
          tagline: tool.tagline,
          description: tool.description,
          accentColor: tool.accentColor,
          features: tool.features,
          mode: tool.mode,
          onOpen: onOpenTool,
        } satisfies ToolNodeData,
      })),
    [visibleTools, onOpenTool]
  );

  const hiddenIds = useMemo(() => new Set(TOOLS.filter((t) => t.hidden).map((t) => t.id)), []);

  const edges: Edge[] = useMemo(
    () => [
      {
        id: "concept-to-sprite",
        source: "concept-lab",
        target: "sprite-lab",
        type: "pipeline",
        data: {
          sourceColor: "var(--color-tool-concept)",
          isComplete: true,
        },
      },
      {
        id: "ideation-to-concept",
        source: "ideation",
        target: "concept-lab",
        type: "pipeline",
        data: {
          sourceColor: "var(--color-tool-mind)",
          isComplete: true,
        },
      },
      {
        id: "sprite-to-walter",
        source: "sprite-lab",
        target: "walter",
        type: "pipeline",
        data: {
          sourceColor: "var(--color-tool-sprite)",
          isComplete: false,
        },
      },
      {
        id: "concept-to-uilab",
        source: "concept-lab",
        target: "ui-lab",
        type: "pipeline",
        data: {
          sourceColor: "var(--color-tool-concept)",
          isComplete: false,
        },
      },
    ].filter((e) => !hiddenIds.has(e.source) && !hiddenIds.has(e.target)),
    [hiddenIds]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
      >
        <Background gap={20} size={1} color="var(--color-border)" />
        <Controls
          showInteractive={false}
          className="!bg-card !border-border !rounded-lg !shadow-lg"
        />
        <MiniMap
          nodeColor={(node) => {
            const d = node.data as ToolNodeData;
            return d.accentColor || "#6c63ff";
          }}
          className="!bg-card !border-border !rounded-lg"
          maskColor="rgba(0,0,0,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
