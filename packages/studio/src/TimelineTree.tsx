import React, {useMemo} from "react";
import type {
  StudioTimelineGraph,
  StudioTimelineNode,
} from "./sessionArchive";

type LayoutNode = StudioTimelineNode & {
  x: number;
  y: number;
};

const layoutGraph = (graph: StudioTimelineGraph) => {
  const incoming = new Map<string, string[]>();
  for (const edge of graph.edges) {
    incoming.set(edge.to, [
      ...(incoming.get(edge.to) ?? []),
      edge.from,
    ]);
  }

  const memo = new Map<string, number>();
  const depthOf = (id: string, seen = new Set<string>()): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (seen.has(id)) return 0;
    const parents = incoming.get(id) ?? [];
    if (parents.length === 0) {
      memo.set(id, 0);
      return 0;
    }
    const nextSeen = new Set(seen);
    nextSeen.add(id);
    const depth =
      1 +
      Math.max(
        ...parents.map((parent) =>
          depthOf(parent, nextSeen),
        ),
      );
    memo.set(id, depth);
    return depth;
  };

  const byDepth = new Map<number, StudioTimelineNode[]>();
  for (const node of graph.nodes) {
    const depth = depthOf(node.id);
    byDepth.set(depth, [
      ...(byDepth.get(depth) ?? []),
      node,
    ]);
  }

  const positioned: LayoutNode[] = [];
  for (const [depth, nodes] of [...byDepth.entries()].sort(
    ([a], [b]) => a - b,
  )) {
    nodes
      .sort((a, b) => a.id.localeCompare(b.id))
      .forEach((node, index) => {
        positioned.push({
          ...node,
          x: 24 + depth * 190,
          y: 24 + index * 82,
        });
      });
  }

  const width =
    Math.max(1, ...positioned.map((node) => node.x)) + 180;
  const height =
    Math.max(1, ...positioned.map((node) => node.y)) + 70;

  return {positioned, width, height};
};

export const TimelineTree: React.FC<{
  graph: StudioTimelineGraph;
  selectedId?: string | null;
  activeReceiptId?: string;
  onSelect: (node: StudioTimelineNode) => void;
}> = ({
  graph,
  selectedId,
  activeReceiptId,
  onSelect,
}) => {
  const layout = useMemo(() => layoutGraph(graph), [graph]);
  const positions = new Map(
    layout.positioned.map((node) => [node.id, node]),
  );

  return (
    <div className="timeline-tree-scroll">
      <div
        className="timeline-tree-canvas"
        style={{
          width: layout.width,
          height: layout.height,
        }}
      >
        <svg
          className="timeline-tree-edges"
          width={layout.width}
          height={layout.height}
          aria-hidden="true"
        >
          {graph.edges.map((edge) => {
            const from = positions.get(edge.from);
            const to = positions.get(edge.to);
            if (!from || !to) return null;
            const x1 = from.x + 144;
            const y1 = from.y + 24;
            const x2 = to.x;
            const y2 = to.y + 24;
            const bend = (x1 + x2) / 2;
            return (
              <path
                key={edge.id}
                d={
                  `M ${x1} ${y1} C ${bend} ${y1}, ${bend} ${y2}, ${x2} ${y2}`
                }
                className={`timeline-edge ${edge.kind}`}
              />
            );
          })}
        </svg>

        {layout.positioned.map((node) => {
          const active =
            node.receiptId === activeReceiptId;
          return (
            <button
              key={node.id}
              className={[
                "timeline-tree-node",
                node.kind,
                selectedId === node.id ? "selected" : "",
                active ? "active" : "",
                node.checkpointId ? "checkpoint" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                left: node.x,
                top: node.y,
              }}
              onClick={() => onSelect(node)}
            >
              <span>
                {node.kind === "branch"
                  ? "BRANCH"
                  : node.kind === "relation"
                    ? "RELATION"
                    : node.kind === "capsule"
                      ? "HAUNT"
                      : node.kind === "proposal"
                        ? "PROPOSAL"
                        : node.checkpointId
                          ? "CHECKPOINT"
                          : "RECEIPT"}
              </span>
              <strong>{node.label}</strong>
              {node.authorityClass ? (
                <small>{node.authorityClass}</small>
              ) : node.phase ? (
                <small>{node.phase}</small>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
