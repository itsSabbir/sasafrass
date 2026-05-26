import { useMemo } from "react";
import type { DragEvent, PointerEvent, RefObject } from "react";
import { CANVAS_WIDTH, LANE_HEIGHT } from "../../app/constants";
import { NODE_HEIGHT, NODE_WIDTH } from "../../data";
import type { CanvasDetailMode } from "../../app/appTypes";
import type { Flow, FlowNode, Project, ValidationIssue, Viewport } from "../../types";
import { CanvasLane } from "./CanvasLane";
import { CanvasToolbar } from "./CanvasToolbar";
import { FlowEdge } from "./FlowEdge";
import { FlowNodeCard } from "./FlowNodeCard";

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

export function CanvasWorkspace(props: CanvasWorkspaceProps) {
  const {
    project, flow, selectedNodeId, connectingFrom, allIssues,
    canvasDetailMode, setCanvasDetailMode, snapToGrid, setSnapToGrid,
    setSelectedNodeId, setConnectingFrom, addDependency, removeDependency,
    deleteSelectedNode, duplicateSelectedNode, copySelectedNode, pasteNode,
    updateNode, copiedNode, fitView, alignToLanes, setViewport,
    canvasRef, onDropTemplate, onNodePointerDown, onCanvasPointerDown,
    onCanvasPointerMove, onCanvasPointerUp
  } = props;

  const nodeMap = useMemo(() => new Map(flow.nodes.map((n) => [n.id, n])), [flow.nodes]);
  const canvasHeight = Math.max(project.environments.length * LANE_HEIGHT, 900);

  const selectedEdgeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    return new Set(flow.edges.filter((e) => e.source === selectedNodeId || e.target === selectedNodeId).map((e) => e.id));
  }, [flow.edges, selectedNodeId]);

  const focusNeighborhood = selectedEdgeIds.size > 0;

  const relatedNodeIds = useMemo(() => {
    const ids = new Set<string>(selectedNodeId ? [selectedNodeId] : []);
    if (selectedNodeId) {
      for (const edge of flow.edges) {
        if (edge.source === selectedNodeId) ids.add(edge.target);
        if (edge.target === selectedNodeId) ids.add(edge.source);
      }
    }
    return ids;
  }, [flow.edges, selectedNodeId]);

  const emptyCanvas = flow.nodes.length === 0;

  return (
    <div className="canvas-shell">
      <CanvasToolbar
        zoom={flow.viewport.zoom}
        snapToGrid={snapToGrid}
        canvasDetailMode={canvasDetailMode}
        selectedNodeId={selectedNodeId}
        connectingFrom={connectingFrom}
        copiedNode={copiedNode}
        setSnapToGrid={setSnapToGrid}
        setCanvasDetailMode={setCanvasDetailMode}
        setConnectingFrom={setConnectingFrom}
        setViewport={setViewport}
        fitView={fitView}
        alignToLanes={alignToLanes}
        deleteSelectedNode={deleteSelectedNode}
        duplicateSelectedNode={duplicateSelectedNode}
        copySelectedNode={copySelectedNode}
        pasteNode={pasteNode}
      />

      <div
        ref={canvasRef}
        className="canvas-viewport"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropTemplate}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPointerCancel={onCanvasPointerUp}
        onWheel={(event) => {
          if (!event.ctrlKey && !event.metaKey) return;
          event.preventDefault();
          const delta = event.deltaY > 0 ? -0.08 : 0.08;
          setViewport((v) => ({ ...v, zoom: Math.max(0.35, Math.min(1.6, v.zoom + delta)) }));
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
          {project.environments.map((env, i) => (
            <CanvasLane key={env.id} environment={env} index={i} />
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
              if (!source || !target) return null;
              return (
                <FlowEdge
                  key={edge.id}
                  edge={edge}
                  source={source}
                  target={target}
                  selected={selectedEdgeIds.has(edge.id)}
                  dimmed={focusNeighborhood && !selectedEdgeIds.has(edge.id)}
                  onSelectTarget={setSelectedNodeId}
                  onRemove={removeDependency}
                />
              );
            })}
          </svg>

          {emptyCanvas && (
            <div className="canvas-empty-state">
              <div className="empty-card">
                <h3>Start your flow</h3>
                <p>Drag a node type from the left panel, or use <strong>Add Nodes</strong> to get started.</p>
              </div>
            </div>
          )}

          {flow.nodes.map((node) => (
            <FlowNodeCard
              key={node.id}
              node={node}
              environment={project.environments.find((env) => env.id === node.environmentId)}
              edges={flow.edges}
              allIssues={allIssues}
              selectedNodeId={selectedNodeId}
              connectingFrom={connectingFrom}
              canvasDetailMode={canvasDetailMode}
              focusNeighborhood={focusNeighborhood}
              relatedNodeIds={relatedNodeIds}
              onPointerDown={onNodePointerDown}
              onClick={setSelectedNodeId}
              onConnect={(targetId) => { if (connectingFrom) addDependency(connectingFrom, targetId); }}
              onStartConnect={setConnectingFrom}
              onUpdateNote={(nodeId, value) => updateNode(nodeId, (n) => ({ ...n, notes: value }), "Updated canvas note")}
            />
          ))}
        </div>

        <div className="minimap">
          {flow.nodes.map((node) => {
            const env = project.environments.find((e) => e.id === node.environmentId);
            return (
              <span
                key={node.id}
                style={{
                  left: `${(node.position.x / CANVAS_WIDTH) * 100}%`,
                  top: `${(node.position.y / canvasHeight) * 100}%`,
                  background: env?.color
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
