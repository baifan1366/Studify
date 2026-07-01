"use client";

import { useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { BrainCircuit } from "lucide-react";

export type MindMapGraph = {
  nodes: Array<{ id: string; label: string; description?: string; level?: number }>;
  edges: Array<{ source: string; target: string; label?: string }>;
};

function ConceptNode({ data }: NodeProps<Node<{
  label: string;
  description?: string;
  level: number;
  variant?: "hierarchical" | "radial";
  childCount?: number;
  collapsed?: boolean;
}>>) {
  const palette = [
    "border-violet-400/80 bg-violet-500/15",
    "border-blue-400/80 bg-blue-500/15",
    "border-emerald-400/80 bg-emerald-500/15",
    "border-amber-400/80 bg-amber-500/15",
  ];
  const radial = data.variant === "radial";
  return (
    <div className={`${radial ? "w-44 cursor-pointer rounded-2xl px-4 py-2.5" : "w-48 rounded-xl p-3"} border text-slate-100 shadow-lg backdrop-blur-md ${palette[Math.min(data.level, 3)]}`}>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-slate-950 !bg-slate-300" />
      <div className="flex items-start gap-2">
        <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-current opacity-80" />
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-snug">{data.label}</div>
          {!radial && data.description && <div className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-300">{data.description}</div>}
          {radial && data.childCount ? (
            <div className="mt-1 text-[10px] text-slate-400">
              {data.collapsed ? `+ ${data.childCount} hidden branches` : `${data.childCount} branches · click to collapse`}
            </div>
          ) : null}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-slate-950 !bg-slate-300" />
    </div>
  );
}

const nodeTypes = { concept: ConceptNode };

function layoutGraph(graph: MindMapGraph): { nodes: Node[]; edges: Edge[] } {
  const levels = new Map<string, number>();
  const incoming = new Map(graph.nodes.map((node) => [node.id, 0]));
  graph.edges.forEach((edge) => incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1));
  const queue = graph.nodes.filter((node) => !incoming.get(node.id)).map((node) => node.id);
  queue.forEach((id) => levels.set(id, 0));
  while (queue.length) {
    const source = queue.shift()!;
    for (const edge of graph.edges.filter((item) => item.source === source)) {
      levels.set(edge.target, Math.max(levels.get(edge.target) || 0, (levels.get(source) || 0) + 1));
      incoming.set(edge.target, (incoming.get(edge.target) || 1) - 1);
      if (incoming.get(edge.target) === 0) queue.push(edge.target);
    }
  }
  const grouped = new Map<number, typeof graph.nodes>();
  graph.nodes.forEach((node) => {
    const level = node.level ?? levels.get(node.id) ?? 0;
    grouped.set(level, [...(grouped.get(level) || []), node]);
  });
  const levelRows = new Map<number, number>();
  const MAX_NODES_PER_ROW = 5;
  const HORIZONTAL_GAP = 230;
  const VERTICAL_GAP = 150;
  const LEVEL_GAP = 55;
  let nextLevelY = 0;

  [...grouped.keys()].sort((a, b) => a - b).forEach((level) => {
    levelRows.set(level, nextLevelY);
    const rowCount = Math.ceil((grouped.get(level)?.length || 1) / MAX_NODES_PER_ROW);
    nextLevelY += rowCount * VERTICAL_GAP + LEVEL_GAP;
  });

  const nodes = graph.nodes.map((node) => {
    const level = node.level ?? levels.get(node.id) ?? 0;
    const row = grouped.get(level) || [];
    const index = row.findIndex((item) => item.id === node.id);
    const rowIndex = Math.floor(index / MAX_NODES_PER_ROW);
    const indexInRow = index % MAX_NODES_PER_ROW;
    const nodesInThisRow = Math.min(MAX_NODES_PER_ROW, row.length - rowIndex * MAX_NODES_PER_ROW);
    return {
      id: node.id,
      type: "concept",
      position: {
        x: (indexInRow - (nodesInThisRow - 1) / 2) * HORIZONTAL_GAP,
        y: (levelRows.get(level) || 0) + rowIndex * VERTICAL_GAP,
      },
      data: { label: node.label, description: node.description, level },
    };
  });
  const ids = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)).map((edge, index) => ({
    id: `edge-${index}-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    label: edge.label?.toLowerCase() === "prerequisite" ? undefined : edge.label,
    type: "smoothstep",
    animated: false,
    style: { stroke: "#64748b", strokeWidth: 1.5 },
  }));
  return { nodes, edges };
}

function layoutRadialGraph(graph: MindMapGraph, collapsed: Set<string>): { nodes: Node[]; edges: Edge[] } {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const children = new Map<string, string[]>();
  const incoming = new Map(graph.nodes.map((node) => [node.id, 0]));
  graph.edges.forEach((edge) => {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) return;
    children.set(edge.source, [...(children.get(edge.source) || []), edge.target]);
    incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
  });

  const root = graph.nodes.find((node) => !incoming.get(node.id)) || graph.nodes[0];
  if (!root) return { nodes: [], edges: [] };

  const connected = new Set<string>();
  const collectConnected = (id: string) => {
    if (connected.has(id)) return;
    connected.add(id);
    (children.get(id) || []).forEach(collectConnected);
  };
  collectConnected(root.id);

  const visible = new Set<string>();
  const positions = new Map<string, { x: number; y: number; level: number }>();
  const place = (
    id: string,
    level: number,
    startAngle: number,
    endAngle: number,
    ancestry: Set<string>
  ) => {
    if (ancestry.has(id) || visible.has(id)) return;
    visible.add(id);
    const angle = (startAngle + endAngle) / 2;
    const radius = level === 0 ? 0 : 240 + (level - 1) * 210;
    positions.set(id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      level,
    });
    if (collapsed.has(id)) return;

    const nextAncestry = new Set(ancestry).add(id);
    const childIds = children.get(id) || [];
    const span = endAngle - startAngle;
    childIds.forEach((childId, index) => {
      const childStart = startAngle + (span * index) / childIds.length;
      const childEnd = startAngle + (span * (index + 1)) / childIds.length;
      place(childId, level + 1, childStart, childEnd, nextAncestry);
    });
  };

  place(root.id, 0, -Math.PI, Math.PI, new Set());

  // Keep disconnected concepts readable instead of dropping them.
  graph.nodes.filter((node) => !connected.has(node.id)).forEach((node, index, items) => {
    const angle = (Math.PI * 2 * index) / Math.max(items.length, 1);
    visible.add(node.id);
    positions.set(node.id, {
      x: Math.cos(angle) * 650,
      y: Math.sin(angle) * 650,
      level: node.level ?? 3,
    });
  });

  const nodes = graph.nodes
    .filter((node) => visible.has(node.id))
    .map((node) => {
      const position = positions.get(node.id)!;
      return {
        id: node.id,
        type: "concept",
        position: { x: position.x, y: position.y },
        data: {
          label: node.label,
          description: node.description,
          level: position.level,
          variant: "radial",
          childCount: children.get(node.id)?.length || 0,
          collapsed: collapsed.has(node.id),
        },
      };
    });

  const edges = graph.edges
    .filter((edge) => visible.has(edge.source) && visible.has(edge.target))
    .map((edge, index) => ({
      id: `radial-edge-${index}-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: "bezier",
      animated: false,
      style: { stroke: "#64748b", strokeWidth: 2 },
    }));

  return { nodes, edges };
}

export function ReactFlowMindMap({
  graph,
  className = "h-[520px]",
  layout = "hierarchical",
  onAsk,
}: {
  graph: MindMapGraph;
  className?: string;
  layout?: "hierarchical" | "radial";
  onAsk?: (prompt: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const flow = useMemo(
    () => layout === "radial" ? layoutRadialGraph(graph, collapsed) : layoutGraph(graph),
    [collapsed, graph, layout]
  );
  return (
    <div className={`overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950 ${className}`}>
      <ReactFlow
        colorMode="dark"
        nodes={flow.nodes}
        edges={flow.edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.12,
          minZoom: layout === "radial" ? 0.3 : 0.5,
          maxZoom: 0.9,
        }}
        minZoom={layout === "radial" ? 0.2 : 0.35}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => {
          const label = String(node.data?.label || "");
          const description = String(node.data?.description || "");
          if (onAsk && label) {
            onAsk(
              `Explain "${label}" in the context of this video lesson.${
                description ? ` Focus on: ${description}` : ""
              }`
            );
          }
          if (layout === "radial" && node.data?.childCount) {
            setCollapsed((current) => {
              const next = new Set(current);
              if (next.has(node.id)) next.delete(node.id);
              else next.add(node.id);
              return next;
            });
          }
        }}
      >
        <MiniMap
          pannable
          zoomable
          position="bottom-right"
          className="!rounded-lg !border !border-slate-700 !bg-slate-950/95"
          maskColor="rgba(15, 23, 42, 0.72)"
          nodeColor={(node) => {
            const level = Number(node.data?.level || 0);
            return ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"][Math.min(level, 3)];
          }}
        />
        <Controls
          showInteractive={false}
          className="!overflow-hidden !rounded-lg !border !border-slate-700 !bg-slate-900 [&_.react-flow__controls-button]:!border-0 [&_.react-flow__controls-button]:!border-b [&_.react-flow__controls-button]:!border-slate-700 [&_.react-flow__controls-button]:!bg-slate-900 [&_.react-flow__controls-button]:!text-slate-200 [&_.react-flow__controls-button:hover]:!bg-slate-800 [&_svg]:!fill-slate-200"
        />
        <Background color="#334155" variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}
