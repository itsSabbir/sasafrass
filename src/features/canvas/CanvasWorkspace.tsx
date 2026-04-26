import type { DragEvent, PointerEvent, RefObject } from "react";
import { CANVAS_WIDTH, LANE_HEIGHT } from "../../app/constants";
import { NODE_HEIGHT, NODE_WIDTH, nodeTypeLabels } from "../../data";
import { DraftTextArea } from "../../components/DraftFields";
import { getNodeIssues } from "../../graph";
import { Icon } from "../../components/Icon";
import type { CanvasDetailMode } from "../../app/appTypes";
import type { Flow, FlowNode, Project, ValidationIssue, Viewport } from "../../types";

interface CanvasWorkspaceProps {
  project: Project;
  flow: Flow;
  selectedNodeId: string | null;
  connectingFrom: string | null;
  allIssues: ValidationIssue[];
  canvasDetailMode: CanvasDetailMode;
  setCanvasDetailMode: (mode: CanvasDetailMode) => void;
  snapToGrid: boolean;
  setSnapToGrid: (value: boolean) => void;
  setSelectedNodeId: (id: string | null) => void;
  setConnectingFrom: (id: string | null) => void;
  addDependency: (sourceId: string, targetId: string) => void;
  removeDependency: (edgeId: string) => void;
  deleteSelectedNode: () => void;
  duplicateSelectedNode: () => void;
  copySelectedNode: () => void;
  pasteNode: () => void;
  updateNode: (nodeId: string, updater: (node: FlowNode) => FlowNode, label: string) => void;
  copiedNode: FlowNode | null;
  fitView: () => void;
  alignToLanes: () => void;
  setViewport: (updater: (viewport: Viewport) => Viewport) => void;
  canvasRef: RefObject<HTMLDivElement | null>;
  onDropTemplate: (event: DragEvent<HTMLDivElement>) => void;
  onNodePointerDown: (event: PointerEvent<HTMLDivElement>, node: FlowNode) => void;
  onCanvasPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onCanvasPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onCanvasPointerUp: () => void;
}

function compactText(value: string, maxLength = 48): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}...`;
}

function architectureLine(node: FlowNode): string {
  if (node.schema.sourceName) {
    return compactText(node.schema.sourceName);
  }
  if (node.schema.joinKeys.length > 0) {
    return compactText(node.schema.joinKeys.map((key) => `${key.left} = ${key.right}`).join("; "));
  }
  if (node.schema.derivedColumns.length > 0) {
    return compactText(node.schema.derivedColumns.map((column) => `${column.name} = ${column.expression}`).join("; "));
  }
  if (node.schema.outputColumns.length > 0) {
    return compactText(node.schema.outputColumns.join(", "));
  }
  return "Architecture details pending";
}

function reviewLine(node: FlowNode): string {
  return compactText(
    node.metadata.risks[0] ||
      node.metadata.openQuestions[0] ||
      node.metadata.reviewerComments[0] ||
      node.notes ||
      "No review notes yet"
  );
}

function nodePrimaryLine(node: FlowNode, mode: CanvasDetailMode): string {
  if (mode === "architecture") {
    return architectureLine(node);
  }
  if (mode === "review") {
    return reviewLine(node);
  }
  return compactText(
    node.metadata.jobName ||
      node.metadata.producedOutputs[0] ||
      node.schema.sourceName ||
      node.metadata.requiredInputs[0] ||
      "Handoff details pending"
  );
}

function nodeFactChips(node: FlowNode, incomingCount: number, outgoingCount: number, mode: CanvasDetailMode): string[] {
  const shared = [
    incomingCount > 0 ? `up ${incomingCount}` : "",
    outgoingCount > 0 ? `down ${outgoingCount}` : "",
  ];

  const handoff = [
    node.metadata.requiredInputs.length > 0 ? `${node.metadata.requiredInputs.length} inputs` : "",
    node.metadata.producedOutputs.length > 0 ? `${node.metadata.producedOutputs.length} outputs` : "",
    node.metadata.validations.length > 0 ? `${node.metadata.validations.length} checks` : ""
  ];

  const architecture = [
    node.schema.selectedColumns.length > 0 ? `${node.schema.selectedColumns.length} cols` : "",
    node.schema.outputColumns.length > 0 ? `${node.schema.outputColumns.length} out cols` : "",
    node.schema.joinKeys.length > 0 ? `keys ${node.schema.joinKeys.length}` : "",
    node.schema.derivedColumns.length > 0 ? `derives ${node.schema.derivedColumns.length}` : "",
    node.schema.dataQualityChecks.length > 0 ? `${node.schema.dataQualityChecks.length} DQ` : ""
  ];

  const review = [
    node.metadata.openQuestions.length > 0 ? `${node.metadata.openQuestions.length} questions` : "",
    node.metadata.risks.length > 0 ? `${node.metadata.risks.length} risks` : "",
    node.metadata.assumptions.length > 0 ? `${node.metadata.assumptions.length} assumptions` : "",
    node.metadata.reviewerComments.length > 0 ? `${node.metadata.reviewerComments.length} comments` : ""
  ];

  return [...shared, ...(mode === "architecture" ? architecture : mode === "review" ? review : handoff)]
    .filter(Boolean)
    .slice(0, 4);
}

export function CanvasWorkspace(props: CanvasWorkspaceProps) {
  const {
    project,
    flow,
    selectedNodeId,
    connectingFrom,
    allIssues,
    canvasDetailMode,
    setCanvasDetailMode,
    snapToGrid,
    setSnapToGrid,
    setSelectedNodeId,
    setConnectingFrom,
    addDependency,
    removeDependency,
    deleteSelectedNode,
    duplicateSelectedNode,
    copySelectedNode,
    pasteNode,
    updateNode,
    copiedNode,
    fitView,
    alignToLanes,
    setViewport,
    canvasRef,
    onDropTemplate,
    onNodePointerDown,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp
  } = props;

  const nodeMap = new Map(flow.nodes.map((node) => [node.id, node]));
  const canvasHeight = Math.max(project.environments.length * LANE_HEIGHT, 900);
  const selectedEdgeIds = new Set(
    selectedNodeId
      ? flow.edges.filter((edge) => edge.source === selectedNodeId || edge.target === selectedNodeId).map((edge) => edge.id)
      : []
  );
  const focusNeighborhood = selectedEdgeIds.size > 0;
  const relatedNodeIds = new Set<string>(selectedNodeId ? [selectedNodeId] : []);

  if (selectedNodeId) {
    for (const edge of flow.edges) {
      if (edge.source === selectedNodeId) {
        relatedNodeIds.add(edge.target);
      }
      if (edge.target === selectedNodeId) {
        relatedNodeIds.add(edge.source);
      }
    }
  }

  return (
    <div className="canvas-shell">
      <div className="canvas-toolbar">
        <button className="icon-button" title="Zoom in" onClick={() => setViewport((viewport) => ({ ...viewport, zoom: Math.min(1.6, viewport.zoom + 0.1) }))}>
          <Icon name="zoomIn" />
        </button>
        <button className="icon-button" title="Zoom out" onClick={() => setViewport((viewport) => ({ ...viewport, zoom: Math.max(0.35, viewport.zoom - 0.1) }))}>
          <Icon name="zoomOut" />
        </button>
        <button className="icon-button" title="Fit view" onClick={fitView}>
          <Icon name="fit" />
        </button>
        <button className={snapToGrid ? "icon-button active" : "icon-button"} title="Snap to grid" onClick={() => setSnapToGrid(!snapToGrid)}>
          <Icon name="grid" />
        </button>
        <button className="text-button" onClick={alignToLanes}>
          Arrange
        </button>
        <div className="canvas-mode-tabs" aria-label="Canvas detail mode">
          {(["handoff", "architecture", "review"] as CanvasDetailMode[]).map((mode) => (
            <button key={mode} className={canvasDetailMode === mode ? "active" : ""} onClick={() => setCanvasDetailMode(mode)}>
              {mode === "handoff" ? "DevOps" : mode === "architecture" ? "Data" : "Review"}
            </button>
          ))}
        </div>
        <span className="toolbar-divider" />
        <button
          className={connectingFrom ? "text-button active" : "text-button"}
          disabled={!selectedNodeId}
          onClick={() => {
            if (!selectedNodeId) {
              return;
            }
            setConnectingFrom(connectingFrom === selectedNodeId ? null : selectedNodeId);
          }}
        >
          <Icon name="connector" /> {connectingFrom ? "Cancel connect" : "Connect"}
        </button>
        <button className="icon-button" title="Duplicate node" disabled={!selectedNodeId} onClick={duplicateSelectedNode}>
          <Icon name="duplicate" />
        </button>
        <button className="icon-button" title="Copy node" disabled={!selectedNodeId} onClick={copySelectedNode}>
          <Icon name="copy" />
        </button>
        <button className="icon-button" title="Paste node" disabled={!copiedNode} onClick={pasteNode}>
          <Icon name="plus" />
        </button>
        <button className="icon-button danger" title="Delete node" disabled={!selectedNodeId} onClick={deleteSelectedNode}>
          <Icon name="trash" />
        </button>
        <span className="toolbar-spacer" />
        {connectingFrom && <span className="connect-hint">Choose a target node for the dependency</span>}
        <span className="zoom-readout">{Math.round(flow.viewport.zoom * 100)}%</span>
      </div>

      <div
        ref={canvasRef}
        className="canvas-viewport"
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDropTemplate}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPointerCancel={onCanvasPointerUp}
        onWheel={(event) => {
          if (!event.ctrlKey && !event.metaKey) {
            return;
          }
          event.preventDefault();
          const delta = event.deltaY > 0 ? -0.08 : 0.08;
          setViewport((viewport) => ({ ...viewport, zoom: Math.max(0.35, Math.min(1.6, viewport.zoom + delta)) }));
        }}
      >
        <div
          className="canvas-content"
          style={{
            width: CANVAS_WIDTH,
            height: canvasHeight,
            transform: `translate(${flow.viewport.x}px, ${flow.viewport.y}px) scale(${flow.viewport.zoom})`
          }}
        >
          {project.environments.map((environment, index) => (
            <div key={environment.id} className="environment-lane" style={{ top: index * LANE_HEIGHT, height: LANE_HEIGHT }}>
              <div className="lane-label" style={{ borderColor: environment.color }}>
                <span style={{ background: environment.color }} />
                {environment.name}
              </div>
            </div>
          ))}

          <svg className="edge-layer" width={CANVAS_WIDTH} height={canvasHeight}>
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="#54657b" />
              </marker>
              <marker id="arrowhead-selected" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="#d52b1e" />
              </marker>
              <marker id="arrowhead-dim" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="#aeb8c6" />
              </marker>
            </defs>
            {flow.edges.map((edge) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              if (!source || !target) {
                return null;
              }
              const selectedEdge = selectedEdgeIds.has(edge.id);
              const dimmedEdge = focusNeighborhood && !selectedEdge;
              const x1 = source.position.x + NODE_WIDTH;
              const y1 = source.position.y + NODE_HEIGHT / 2;
              const x2 = target.position.x;
              const y2 = target.position.y + NODE_HEIGHT / 2;
              const curve = Math.max(48, Math.abs(x2 - x1) * 0.42);
              const labelX = (x1 + x2) / 2;
              const labelY = (y1 + y2) / 2 - 10;
              return (
                <g
                  key={edge.id}
                  className={["edge-group", selectedEdge ? "selected" : "", dimmedEdge ? "dimmed" : ""].join(" ")}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedNodeId(edge.target);
                  }}
                >
                  <title>
                    {source.title} to {target.title}
                  </title>
                  <path
                    className="edge-path"
                    d={`M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`}
                    markerEnd={dimmedEdge ? "url(#arrowhead-dim)" : selectedEdge ? "url(#arrowhead-selected)" : "url(#arrowhead)"}
                  />
                  <g className="edge-label" transform={`translate(${labelX}, ${labelY})`}>
                    <rect x="-12" y="-9" width="24" height="18" rx="9" />
                    <text textAnchor="middle" dominantBaseline="central">
                      {edge.orderHint}
                    </text>
                  </g>
                  <g
                    className="edge-remove"
                    transform={`translate(${labelX + 30}, ${labelY})`}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeDependency(edge.id);
                    }}
                  >
                    <title>Remove dependency</title>
                    <rect x="-10" y="-10" width="20" height="20" rx="10" />
                    <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" />
                  </g>
                </g>
              );
            })}
          </svg>

          {flow.nodes.map((node) => {
            const environment = project.environments.find((candidate) => candidate.id === node.environmentId);
            const nodeIssues = getNodeIssues(allIssues, node.id);
            const hasError = nodeIssues.some((issue) => issue.severity === "error");
            const hasWarning = nodeIssues.some((issue) => issue.severity === "warning");
            const incomingCount = flow.edges.filter((edge) => edge.target === node.id).length;
            const outgoingCount = flow.edges.filter((edge) => edge.source === node.id).length;
            const chips = nodeFactChips(node, incomingCount, outgoingCount, canvasDetailMode);
            const dimmedNode = focusNeighborhood && !relatedNodeIds.has(node.id);
            const upstreamNode = Boolean(selectedNodeId && flow.edges.some((edge) => edge.source === node.id && edge.target === selectedNodeId));
            const downstreamNode = Boolean(selectedNodeId && flow.edges.some((edge) => edge.source === selectedNodeId && edge.target === node.id));

            return (
              <div
                key={node.id}
                className={[
                  "flow-node",
                  node.type,
                  selectedNodeId === node.id ? "selected" : "",
                  connectingFrom === node.id ? "connecting" : "",
                  dimmedNode ? "dimmed" : "",
                  upstreamNode ? "upstream" : "",
                  downstreamNode ? "downstream" : "",
                  hasError ? "has-error" : hasWarning ? "has-warning" : ""
                ].join(" ")}
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  borderColor: selectedNodeId === node.id ? environment?.color : undefined
                }}
                onPointerDown={(event) => onNodePointerDown(event, node)}
                onClick={(event) => {
                  event.stopPropagation();
                  if (connectingFrom && connectingFrom !== node.id) {
                    addDependency(connectingFrom, node.id);
                  } else {
                    setSelectedNodeId(node.id);
                  }
                }}
              >
                <div className="node-accent" style={{ background: environment?.color }} />
                <div className="node-header">
                  <span className={`type-dot ${node.type}`} />
                  <span>{nodeTypeLabels[node.type]}</span>
                  {nodeIssues.length > 0 && <span className={hasError ? "node-badge error" : "node-badge warning"}>{nodeIssues.length}</span>}
                </div>
                <div className="node-title-row">
                  <div className="node-title">{node.title}</div>
                  {(upstreamNode || downstreamNode) && <span className="node-relation">{upstreamNode ? "upstream" : "downstream"}</span>}
                </div>
                <div className="node-meta">{nodePrimaryLine(node, canvasDetailMode)}</div>
                <div className="node-chip-row">
                  {chips.map((chip) => (
                    <span key={chip}>{chip}</span>
                  ))}
                </div>
                <div
                  className={selectedNodeId === node.id || canvasDetailMode === "review" ? "node-note-wrap editable" : "node-note-wrap"}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  {selectedNodeId === node.id || canvasDetailMode === "review" ? (
                    <DraftTextArea
                      ariaLabel={`Canvas note for ${node.title}`}
                      className="node-note-input"
                      placeholder="Node note"
                      value={node.notes ?? ""}
                      onCommit={(value) => updateNode(node.id, (current) => ({ ...current, notes: value }), "Updated canvas note")}
                    />
                  ) : (
                    <div className="node-note-preview">{compactText(node.notes || "No node note", 64)}</div>
                  )}
                </div>
                <button
                  className="connector out"
                  title="Start dependency connector"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setConnectingFrom(connectingFrom === node.id ? null : node.id);
                  }}
                >
                  <Icon name="connector" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="minimap">
          {flow.nodes.map((node) => {
            const environment = project.environments.find((env) => env.id === node.environmentId);
            return (
              <span
                key={node.id}
                style={{
                  left: `${(node.position.x / CANVAS_WIDTH) * 100}%`,
                  top: `${(node.position.y / canvasHeight) * 100}%`,
                  background: environment?.color
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
