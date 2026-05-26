import { memo } from "react";
import type { PointerEvent } from "react";
import { DraftTextArea } from "../../components/DraftFields";
import { Icon } from "../../components/Icon";
import { nodeTypeLabels } from "../../data";
import { getNodeIssues } from "../../graph";
import type { CanvasDetailMode } from "../../app/appTypes";
import type { EnvironmentLane, FlowEdge, FlowNode, ValidationIssue } from "../../types";

interface FlowNodeCardProps {
  node: FlowNode;
  environment: EnvironmentLane | undefined;
  edges: FlowEdge[];
  allIssues: ValidationIssue[];
  selectedNodeId: string | null;
  connectingFrom: string | null;
  canvasDetailMode: CanvasDetailMode;
  focusNeighborhood: boolean;
  relatedNodeIds: Set<string>;
  onPointerDown: (event: PointerEvent<HTMLDivElement>, node: FlowNode) => void;
  onClick: (nodeId: string) => void;
  onConnect: (targetId: string) => void;
  onStartConnect: (nodeId: string | null) => void;
  onUpdateNote: (nodeId: string, value: string) => void;
}

function compactText(value: string, maxLength = 48): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}...`;
}

function nodeSummaryLines(node: FlowNode, mode: CanvasDetailMode): [string, string] {
  if (mode === "architecture") {
    const line1 = compactText(
      node.schema.sourceName ||
      (node.schema.joinKeys.length > 0 ? node.schema.joinKeys.map((k) => `${k.left}=${k.right}`).join("; ") : "") ||
      (node.schema.derivedColumns.length > 0 ? node.schema.derivedColumns.map((c) => `${c.name}=${c.expression}`).join("; ") : "") ||
      (node.schema.outputColumns.length > 0 ? node.schema.outputColumns.join(", ") : "") ||
      "Architecture details pending"
    );
    const line2 = compactText(
      node.schema.selectedColumns.length > 0 ? `${node.schema.selectedColumns.length} columns selected` :
      node.schema.outputColumns.length > 0 ? `${node.schema.outputColumns.length} output columns` : ""
    );
    return [line1, line2];
  }
  if (mode === "review") {
    const line1 = compactText(
      node.metadata.risks[0] || node.metadata.openQuestions[0] || node.metadata.reviewerComments[0] || node.notes || "No review notes yet"
    );
    const line2 = compactText(
      node.metadata.assumptions[0] || ""
    );
    return [line1, line2];
  }
  const line1 = compactText(
    node.metadata.jobName || node.metadata.producedOutputs[0] || node.schema.sourceName || node.metadata.requiredInputs[0] || ""
  );
  const line2 = compactText(
    node.schema.sourceName && node.metadata.jobName ? node.schema.sourceName :
    node.schema.joinKeys.length > 0 ? `Join: ${node.schema.joinKeys.map((k) => `${k.left}=${k.right}`).join(", ")}` :
    node.schema.selectedColumns.length > 0 ? `${node.schema.selectedColumns.length} columns selected` :
    node.metadata.producedOutputs[0] ?? ""
  );
  return [line1 || "Details pending", line2];
}

function nodeChips(node: FlowNode, inCount: number, outCount: number, mode: CanvasDetailMode): string[] {
  const shared = [
    inCount > 0 ? `up ${inCount}` : "",
    outCount > 0 ? `down ${outCount}` : ""
  ];
  if (mode === "architecture") {
    return [...shared,
      node.schema.selectedColumns.length > 0 ? `${node.schema.selectedColumns.length} cols` : "",
      node.schema.outputColumns.length > 0 ? `${node.schema.outputColumns.length} out cols` : "",
      node.schema.joinKeys.length > 0 ? `keys ${node.schema.joinKeys.length}` : "",
      node.schema.derivedColumns.length > 0 ? `derives ${node.schema.derivedColumns.length}` : "",
      node.schema.dataQualityChecks.length > 0 ? `${node.schema.dataQualityChecks.length} DQ` : ""
    ].filter(Boolean).slice(0, 4);
  }
  if (mode === "review") {
    return [...shared,
      node.metadata.openQuestions.length > 0 ? `${node.metadata.openQuestions.length} questions` : "",
      node.metadata.risks.length > 0 ? `${node.metadata.risks.length} risks` : "",
      node.metadata.assumptions.length > 0 ? `${node.metadata.assumptions.length} assumptions` : "",
      node.metadata.reviewerComments.length > 0 ? `${node.metadata.reviewerComments.length} comments` : ""
    ].filter(Boolean).slice(0, 4);
  }
  return [...shared,
    node.metadata.requiredInputs.length > 0 ? `${node.metadata.requiredInputs.length} inputs` : "",
    node.metadata.producedOutputs.length > 0 ? `${node.metadata.producedOutputs.length} outputs` : "",
    node.metadata.validations.length > 0 ? `${node.metadata.validations.length} checks` : ""
  ].filter(Boolean).slice(0, 4);
}

export const FlowNodeCard = memo(function FlowNodeCard(props: FlowNodeCardProps) {
  const {
    node, environment, edges, allIssues, selectedNodeId, connectingFrom,
    canvasDetailMode, focusNeighborhood, relatedNodeIds,
    onPointerDown, onClick, onConnect, onStartConnect, onUpdateNote
  } = props;

  const nodeIssues = getNodeIssues(allIssues, node.id);
  const hasError = nodeIssues.some((i) => i.severity === "error");
  const hasWarning = !hasError && nodeIssues.some((i) => i.severity === "warning");
  const inCount = edges.filter((e) => e.target === node.id).length;
  const outCount = edges.filter((e) => e.source === node.id).length;
  const chips = nodeChips(node, inCount, outCount, canvasDetailMode);
  const [summary1, summary2] = nodeSummaryLines(node, canvasDetailMode);
  const isSelected = selectedNodeId === node.id;
  const dimmed = focusNeighborhood && !relatedNodeIds.has(node.id);
  const upstream = Boolean(selectedNodeId && edges.some((e) => e.source === node.id && e.target === selectedNodeId));
  const downstream = Boolean(selectedNodeId && edges.some((e) => e.source === selectedNodeId && e.target === node.id));

  return (
    <div
      className={[
        "flow-node", node.type,
        isSelected ? "selected" : "",
        connectingFrom === node.id ? "connecting" : "",
        dimmed ? "dimmed" : "",
        upstream ? "upstream" : "",
        downstream ? "downstream" : "",
        hasError ? "has-error" : hasWarning ? "has-warning" : ""
      ].join(" ")}
      style={{ left: node.position.x, top: node.position.y, borderColor: isSelected ? environment?.color : undefined }}
      onPointerDown={(event) => onPointerDown(event, node)}
      onClick={(event) => {
        event.stopPropagation();
        if (connectingFrom && connectingFrom !== node.id) { onConnect(node.id); }
        else { onClick(node.id); }
      }}
    >
      <div className="node-accent" style={{ background: environment?.color }} />
      <div className="node-header">
        <span className={`type-dot ${node.type}`} />
        <span>{nodeTypeLabels[node.type]}</span>
        {environment && <span className="node-env-badge" style={{ background: environment.color }}>{environment.name}</span>}
        {nodeIssues.length > 0 && <span className={hasError ? "node-badge error" : "node-badge warning"}>{nodeIssues.length}</span>}
      </div>
      <div className="node-title-row">
        <div className="node-title">{node.title}</div>
        {(upstream || downstream) && <span className="node-relation">{upstream ? "upstream" : "downstream"}</span>}
      </div>
      <div className="node-summary">
        <div className="node-meta">{summary1}</div>
        {summary2 && <div className="node-meta secondary">{summary2}</div>}
      </div>
      <div className="node-chip-row">
        {chips.map((chip) => (<span key={chip}>{chip}</span>))}
      </div>
      <div
        className={isSelected || canvasDetailMode === "review" ? "node-note-wrap editable" : "node-note-wrap"}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {isSelected || canvasDetailMode === "review" ? (
          <DraftTextArea
            ariaLabel={`Canvas note for ${node.title}`}
            className="node-note-input"
            placeholder="Node note"
            value={node.notes ?? ""}
            onCommit={(value) => onUpdateNote(node.id, value)}
          />
        ) : (
          <div className="node-note-preview">{compactText(node.notes || "No node note", 64)}</div>
        )}
      </div>
      <button
        className="connector out"
        title="Start dependency connector"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => { event.stopPropagation(); onStartConnect(connectingFrom === node.id ? null : node.id); }}
      >
        <Icon name="connector" />
      </button>
    </div>
  );
});
