"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { GitBranch, LockKeyhole, Search, UnlockKeyhole, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { VerbFamily, VerbFamilyNode } from "@/features/word-tree/types";

export type FamilyCanvasView = "structure" | "overview";

type VerbNodeData = {
  verb: VerbFamilyNode;
};

type VerbFlowNode = Node<VerbNodeData, "verb">;

const nodeTypes = { verb: VerbCanvasNode };

export function VerbFamilyCanvas({
  family,
  view,
  onSelect,
}: {
  family: VerbFamily;
  view: FamilyCanvasView;
  onSelect(nodeId: string): void;
}) {
  const model = useMemo(() => buildFlowModel(family, view), [family, view]);

  return (
    <InteractiveCanvas
      model={model}
      onSelect={onSelect}
      compact
    />
  );
}

export function VerbForestCanvas({
  families,
  onSelect,
}: {
  families: VerbFamily[];
  onSelect(nodeId: string): void;
}) {
  const model = useMemo(() => buildForestModel(families), [families]);

  return (
    <InteractiveCanvas
      model={model}
      onSelect={onSelect}
      searchable
    />
  );
}

function InteractiveCanvas({
  model,
  onSelect,
  compact = false,
  searchable = false,
}: {
  model: { nodes: VerbFlowNode[]; edges: Edge[] };
  onSelect(nodeId: string): void;
  compact?: boolean;
  searchable?: boolean;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<VerbFlowNode>(model.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(model.edges);

  useEffect(() => {
    setNodes(model.nodes);
    setEdges(model.edges);
  }, [model, setEdges, setNodes]);

  return (
    <div
      className={`${compact ? "h-[58vh] min-h-[520px] sm:h-[66vh] sm:min-h-[620px]" : "h-[78vh] min-h-[680px]"} overflow-hidden rounded-2xl border border-[#30445f] bg-[#09111c] shadow-[inset_0_0_70px_rgba(34,54,82,.22)]`}
    >
      <ReactFlow<VerbFlowNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onSelect(node.id)}
        nodesConnectable={false}
        edgesReconnectable={false}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.18, maxZoom: 1.25 }}
        minZoom={0.18}
        maxZoom={1.8}
        colorMode="dark"
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#3d587b"
          gap={24}
          size={1.35}
        />
        <Panel position="top-left">
          <div className="flex flex-wrap gap-2 rounded-xl border border-[#34465d] bg-[#0b131f]/92 p-2 text-[10px] font-black uppercase tracking-[0.1em] shadow-xl backdrop-blur">
            <LegendItem
              color="#7188e8"
              label="Family root"
            />
            <LegendItem
              color="#89b85a"
              label="Unlocked"
            />
            <LegendItem
              color="#59697d"
              label="Locked"
              dashed
            />
            <LegendItem
              color="#e3c378"
              label="Selected"
            />
          </div>
        </Panel>
        {searchable && (
          <CanvasSearch
            nodes={nodes}
            onSelect={onSelect}
          />
        )}
        <MiniMap<VerbFlowNode>
          pannable
          zoomable
          nodeColor={(node) =>
            node.data.verb.depth === 0
              ? "#7188e8"
              : node.data.verb.unlocked
                ? "#89b85a"
                : "#59697d"
          }
          maskColor="rgba(2, 6, 12, 0.76)"
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

function CanvasSearch({
  nodes,
  onSelect,
}: {
  nodes: VerbFlowNode[];
  onSelect(nodeId: string): void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { fitView, getNode, setNodes } = useReactFlow<VerbFlowNode, Edge>();
  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return [];

    return nodes
      .filter((node) => node.data.verb.normalizedLemma.includes(normalizedQuery))
      .sort((left, right) => {
        const leftExact = left.data.verb.normalizedLemma === normalizedQuery;
        const rightExact = right.data.verb.normalizedLemma === normalizedQuery;
        return Number(rightExact) - Number(leftExact);
      })
      .slice(0, 8);
  }, [nodes, query]);

  const focusNode = (nodeId: string) => {
    const node = getNode(nodeId);
    if (!node) return;

    setNodes((current) =>
      current.map((item) => ({ ...item, selected: item.id === nodeId })),
    );
    onSelect(nodeId);
    setQuery(node.data.verb.lemma);
    setOpen(false);
    void fitView({
      nodes: [node],
      duration: 650,
      padding: 1.4,
      minZoom: 1.05,
      maxZoom: 1.35,
    });
  };

  return (
    <Panel position="top-right">
      <div className="relative w-[min(19rem,calc(100vw-3rem))]">
        <div className="flex items-center gap-2 rounded-xl border border-[#34465d] bg-[#0b131f]/95 px-3 shadow-xl backdrop-blur">
          <Search
            className="shrink-0 text-[#91a8f7]"
            size={17}
          />
          <input
            type="search"
            className="nodrag nowheel min-w-0 flex-1 bg-transparent py-3 text-sm font-bold text-[var(--ink)] outline-none placeholder:text-[#718096]"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) {
                event.preventDefault();
                focusNode(results[0].id);
              }
              if (event.key === "Escape") setOpen(false);
            }}
            placeholder="Find a verb…"
            aria-label="Find a verb in the forest"
          />
          {query && (
            <button
              type="button"
              className="nodrag grid size-7 shrink-0 place-items-center rounded-lg text-[#91a0b5] hover:bg-[#1b2a3d] hover:text-white"
              onClick={() => {
                setQuery("");
                setOpen(false);
              }}
              aria-label="Clear verb search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {open && query.trim() && (
          <div className="nodrag absolute right-0 top-[calc(100%+.45rem)] max-h-72 w-full overflow-y-auto rounded-xl border border-[#34465d] bg-[#0b131f] p-1.5 shadow-2xl">
            {results.length ? (
              results.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-[#18263a]"
                  onClick={() => focusNode(node.id)}
                >
                  <span
                    className="truncate text-sm font-black text-[var(--ink)]"
                    lang={node.data.verb.language}
                  >
                    {node.data.verb.lemma}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider ${
                      node.data.verb.unlocked ? "text-[#b9df72]" : "text-[#7f8da1]"
                    }`}
                  >
                    {node.data.verb.unlocked ? "Unlocked" : "Locked"}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-center text-sm font-semibold text-[#8290a3]">
                No verb found in this forest.
              </p>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}

function VerbCanvasNode({ data, selected }: NodeProps<VerbFlowNode>) {
  const node = data.verb;
  const root = node.depth === 0;
  const stateStyle = root
    ? "border-[#7188e8] bg-[#172544] shadow-[0_12px_32px_rgba(113,136,232,.2)]"
    : node.unlocked
      ? "border-[#6f9949] bg-[#1a2b1b] shadow-[0_12px_30px_rgba(137,184,90,.15)]"
      : "border-dashed border-[#59697d] bg-[#0d1622] shadow-[0_10px_24px_rgba(0,0,0,.25)]";

  return (
    <div
      className={`min-w-52 rounded-2xl border-2 px-5 py-4 transition ${stateStyle} ${
        selected ? "ring-4 ring-[#e3c378]/30 outline outline-2 outline-[#e3c378]" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`!size-2.5 !border-0 ${root ? "!bg-[#91a8f7]" : node.unlocked ? "!bg-[#b9df72]" : "!bg-[#6c7d92]"}`}
      />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`truncate text-lg font-black ${node.unlocked || root ? "text-[var(--ink)]" : "text-[#a2afc0]"}`}
            lang={node.language}
          >
            {node.lemma}
          </p>
          <p
            className={`mt-1 text-[10px] font-black uppercase tracking-[0.14em] ${
              root
                ? "text-[#a9bbff]"
                : node.unlocked
                  ? "text-[#b9df72]"
                  : "text-[#718096]"
            }`}
          >
            {root ? "Family root" : node.unlocked ? "Unlocked" : "Locked"}
          </p>
        </div>
        {root ? (
          <GitBranch
            className="shrink-0 text-[#a9bbff]"
            size={19}
          />
        ) : node.unlocked ? (
          <UnlockKeyhole
            className="shrink-0 text-[#b9df72]"
            size={19}
          />
        ) : (
          <LockKeyhole
            className="shrink-0 text-[#d2a865]"
            size={19}
          />
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={`!size-2.5 !border-0 ${root ? "!bg-[#91a8f7]" : node.unlocked ? "!bg-[#b9df72]" : "!bg-[#6c7d92]"}`}
      />
    </div>
  );
}

function buildFlowModel(
  family: VerbFamily,
  view: FamilyCanvasView,
): { nodes: VerbFlowNode[]; edges: Edge[] } {
  const ordered = [...family.nodes].sort(
    (left, right) => left.depth - right.depth || left.lemma.localeCompare(right.lemma),
  );
  const positions =
    view === "structure"
      ? structurePositions(ordered)
      : overviewPositions(ordered, family.rootId);

  const nodes: VerbFlowNode[] = ordered.map((node) => ({
    id: node.id,
    type: "verb",
    position: positions.get(node.id) ?? { x: 0, y: 0 },
    data: { verb: node },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
  }));

  const edges: Edge[] = ordered
    .filter((node) => node.id !== family.rootId)
    .map((node) => ({
      id: `${view}-${view === "overview" ? family.rootId : node.parentId}-${node.id}`,
      source: view === "overview" ? family.rootId : (node.parentId ?? family.rootId),
      target: node.id,
      type: "smoothstep",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: node.unlocked ? "#9dcb68" : "#59697d",
      },
      style: {
        stroke: node.unlocked ? "#9dcb68" : "#59697d",
        strokeWidth: node.unlocked ? 2.4 : 1.7,
        strokeDasharray: node.unlocked ? undefined : "7 6",
      },
    }));

  return { nodes, edges };
}

function buildForestModel(families: VerbFamily[]): {
  nodes: VerbFlowNode[];
  edges: Edge[];
} {
  const columns = Math.max(1, Math.ceil(Math.sqrt(families.length)));
  const nodes: VerbFlowNode[] = [];
  const edges: Edge[] = [];

  families.forEach((family, familyIndex) => {
    const model = buildFlowModel(family, "structure");
    const column = familyIndex % columns;
    const row = Math.floor(familyIndex / columns);
    const xOffset = column * 1080;
    const yOffset = row * 760;

    nodes.push(
      ...model.nodes.map((node) => ({
        ...node,
        position: {
          x: node.position.x + xOffset,
          y: node.position.y + yOffset,
        },
      })),
    );
    edges.push(...model.edges);
  });

  return { nodes, edges };
}

function structurePositions(nodes: VerbFamilyNode[]) {
  const byDepth = new Map<number, VerbFamilyNode[]>();

  for (const node of nodes) {
    const level = byDepth.get(node.depth) ?? [];
    level.push(node);
    byDepth.set(node.depth, level);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [depth, level] of byDepth) {
    const width = (level.length - 1) * 285;
    level.forEach((node, index) => {
      positions.set(node.id, {
        x: index * 285 - width / 2,
        y: depth * 180,
      });
    });
  }

  return positions;
}

function overviewPositions(nodes: VerbFamilyNode[], rootId: string) {
  const positions = new Map<string, { x: number; y: number }>();
  positions.set(rootId, { x: 0, y: 0 });

  const members = nodes.filter((node) => node.id !== rootId);
  const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(members.length))));
  const rowWidth = (columns - 1) * 285;

  members.forEach((node, index) => {
    positions.set(node.id, {
      x: (index % columns) * 285 - rowWidth / 2,
      y: 190 + Math.floor(index / columns) * 180,
    });
  });

  return positions;
}

function LegendItem({
  color,
  label,
  dashed = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#111c2a] px-2 py-1.5 text-[#aeb9c8]">
      <span
        className={`size-2.5 rounded-sm border-2 ${dashed ? "border-dashed" : ""}`}
        style={{ borderColor: color, backgroundColor: dashed ? "transparent" : color }}
      />
      {label}
    </span>
  );
}
