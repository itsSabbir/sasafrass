import { memo } from "react";
import { NODE_HEIGHT, NODE_WIDTH } from "../../data";
import type { FlowEdge as FlowEdgeType, FlowNode } from "../../types";

interface FlowEdgeProps {
  edge: FlowEdgeType;
  source: FlowNode;
  target: FlowNode;
  selected: boolean;
  dimmed: boolean;
  onSelectTarget: (nodeId: string) => void;
  onRemove: (edgeId: string) => void;
}

export const FlowEdge = memo(function FlowEdge({ edge, source, target, selected, dimmed, onSelectTarget, onRemove }: FlowEdgeProps) {
  const x1 = source.position.x + NODE_WIDTH;
  const y1 = source.position.y + NODE_HEIGHT / 2;
  const x2 = target.position.x;
  const y2 = target.position.y + NODE_HEIGHT / 2;
  const curve = Math.max(48, Math.abs(x2 - x1) * 0.42);
  const labelX = (x1 + x2) / 2;
  const labelY = (y1 + y2) / 2 - 10;
  const markerEnd = dimmed ? "url(#arrowhead-dim)" : selected ? "url(#arrowhead-selected)" : "url(#arrowhead)";

  return (
    <g
      className={["edge-group", selected ? "selected" : "", dimmed ? "dimmed" : ""].join(" ")}
      onClick={(event) => { event.stopPropagation(); onSelectTarget(edge.target); }}
    >
      <title>{source.title} → {target.title}</title>
      <path
        className="edge-path"
        d={`M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`}
        markerEnd={markerEnd}
      />
      <g className="edge-label" transform={`translate(${labelX}, ${labelY})`}>
        <rect x="-12" y="-9" width="24" height="18" rx="9" />
        <text textAnchor="middle" dominantBaseline="central">{edge.orderHint}</text>
      </g>
      <g
        className="edge-remove"
        transform={`translate(${labelX + 30}, ${labelY})`}
        onClick={(event) => { event.stopPropagation(); onRemove(edge.id); }}
      >
        <title>Remove dependency</title>
        <rect x="-10" y="-10" width="20" height="20" rx="10" />
        <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" />
      </g>
    </g>
  );
});
