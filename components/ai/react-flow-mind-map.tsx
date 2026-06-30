"use client";

import { useMemo } from "react";
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

function ConceptNode({ data }: NodeProps<Node<{ label: string; description?: string; level: number }>>) {
  const palette = [
    "border-violet-400 bg-violet-500/15",
    "border-blue-400 bg-blue-500/15",
    "border-emerald-400 bg-emerald-500/15",
    "border-amber-400 bg-amber-500/15",
  ];
  return (
    <div className={`w-52 rounded-xl border-2 p-3 shadow-lg backdrop-blur ${palette[Math.min(data.level, 3)]}`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      <div className="flex items-start gap-2">
        <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="text-sm font-semibold">{data.label}</div>
          {data.description && <div className="mt-1 text-xs text-muted-foreground">{data.description}</div>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
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
  const nodes = graph.nodes.map((node) => {
    const level = node.level ?? levels.get(node.id) ?? 0;
    const row = grouped.get(level) || [];
    const index = row.findIndex((item) => item.id === node.id);
    return {
      id: node.id,
      type: "concept",
      position: { x: (index - (row.length - 1) / 2) * 270, y: level * 170 },
      data: { label: node.label, description: node.description, level },
    };
  });
  const ids = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)).map((edge, index) => ({
    id: `edge-${index}-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: "smoothstep",
    animated: true,
  }));
  return { nodes, edges };
}

export function ReactFlowMindMap({ graph, className = "h-[520px]" }: { graph: MindMapGraph; className?: string }) {
  const flow = useMemo(() => layoutGraph(graph), [graph]);
  return (
    <div className={`overflow-hidden rounded-xl border bg-background ${className}`}>
      <ReactFlow nodes={flow.nodes} edges={flow.edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.25 }} minZoom={0.2} maxZoom={1.5}>
        <MiniMap pannable zoomable />
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} />
      </ReactFlow>
    </div>
  );
}
