import { useRef, useState } from "react";
import type { DragEvent, PointerEvent } from "react";
import { clampNodeYToLane, environmentForY, snap } from "../app/canvasGeometry";
import type { CanvasDetailMode, DragState, Mode, PanState } from "../app/appTypes";
import { createDependencyEdge, createNodeFromTemplate, duplicateNode, pasteNode as createPastedNode, templateForType } from "../app/flowFactories";
import { propagateDependencyInputs, removeDependencyAndPropagatedInputs } from "../app/flowConnections";
import { nowIso } from "../data";
import type { Flow, FlowNode, NodeTemplate, NodeType, Point, Project, Viewport } from "../types";

export interface CanvasInteractionState {
  selectedNodeId: string | null;
  connectingFrom: string | null;
  copiedNode: FlowNode | null;
  snapToGrid: boolean;
  canvasDetailMode: CanvasDetailMode;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  setSelectedNodeId: (id: string | null) => void;
  setConnectingFrom: (id: string | null) => void;
  setSnapToGrid: (value: boolean) => void;
  setCanvasDetailMode: (mode: CanvasDetailMode) => void;
}

export interface CanvasInteractionActions {
  addNodeFromTemplate: (template: NodeTemplate, position?: Point) => void;
  addNodeByType: (type: NodeType) => void;
  updateNode: (nodeId: string, updater: (node: FlowNode) => FlowNode, label: string) => void;
  duplicateSelectedNode: () => void;
  copySelectedNode: () => void;
  pasteNode: () => void;
  deleteSelectedNode: () => void;
  addDependency: (sourceId: string, targetId: string) => void;
  removeDependency: (edgeId: string) => void;
  setViewport: (updater: (viewport: Viewport) => Viewport) => void;
  onDropTemplate: (event: DragEvent<HTMLDivElement>) => void;
  onNodePointerDown: (event: PointerEvent<HTMLDivElement>, node: FlowNode) => void;
  onCanvasPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onCanvasPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onCanvasPointerUp: () => void;
}

interface UseCanvasInteractionInput {
  project: Project;
  activeFlow: Flow | undefined;
  activeFlowId: string;
  projectRef: React.RefObject<Project>;
  setMode: (mode: Mode) => void;
  updateActiveFlow: (updater: (flow: Flow, currentProject: Project) => Flow, label: string) => void;
  updateActiveFlowLive: (updater: (flow: Flow, currentProject: Project) => Flow) => void;
  commitLiveProject: (previous: Project, next: Project, label: string) => void;
}

export function useCanvasInteraction(input: UseCanvasInteractionInput): CanvasInteractionState & CanvasInteractionActions {
  const { project, activeFlow, activeFlowId, projectRef, setMode, updateActiveFlow, updateActiveFlowLive, commitLiveProject } = input;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [copiedNode, setCopiedNode] = useState<FlowNode | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [canvasDetailMode, setCanvasDetailMode] = useState<CanvasDetailMode>("handoff");

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<PanState | null>(null);

  function screenToCanvas(clientX: number, clientY: number): Point {
    const rect = canvasRef.current?.getBoundingClientRect();
    const viewport = activeFlow?.viewport ?? { x: 0, y: 0, zoom: 1 };
    if (!rect) return { x: 100, y: 100 };
    return {
      x: (clientX - rect.left - viewport.x) / viewport.zoom,
      y: (clientY - rect.top - viewport.y) / viewport.zoom
    };
  }

  function setViewport(updater: (viewport: Viewport) => Viewport): void {
    updateActiveFlowLive((flow) => ({ ...flow, viewport: updater(flow.viewport) }));
  }

  function addNodeFromTemplate(template: NodeTemplate, position?: Point): void {
    if (!activeFlow) return;
    const node = createNodeFromTemplate({ template, project, activeFlow, position, snapToGrid });
    updateActiveFlow((flow) => ({ ...flow, nodes: [...flow.nodes, node] }), `Added ${template.name}`);
    setSelectedNodeId(node.id);
    setMode("canvas");
  }

  function addNodeByType(type: NodeType): void {
    addNodeFromTemplate(templateForType(type));
  }

  function updateNode(nodeId: string, updater: (node: FlowNode) => FlowNode, label: string): void {
    updateActiveFlow(
      (flow) => ({ ...flow, nodes: flow.nodes.map((n) => (n.id === nodeId ? updater(n) : n)) }),
      label
    );
  }

  function duplicateSelectedNode(): void {
    if (!selectedNodeId || !activeFlow) return;
    const node = activeFlow.nodes.find((n) => n.id === selectedNodeId);
    if (!node) return;
    const duplicate = duplicateNode(node);
    updateActiveFlow((flow) => ({ ...flow, nodes: [...flow.nodes, duplicate] }), "Duplicated node");
    setSelectedNodeId(duplicate.id);
  }

  function copySelectedNode(): void {
    if (!activeFlow) return;
    const node = activeFlow.nodes.find((n) => n.id === selectedNodeId);
    if (node) setCopiedNode(node);
  }

  function pasteNode(): void {
    if (!copiedNode) return;
    const pasted = createPastedNode(copiedNode);
    updateActiveFlow((flow) => ({ ...flow, nodes: [...flow.nodes, pasted] }), "Pasted node");
    setSelectedNodeId(pasted.id);
  }

  function deleteSelectedNode(): void {
    if (!selectedNodeId) return;
    updateActiveFlow(
      (flow) => ({
        ...flow,
        nodes: flow.nodes.filter((n) => n.id !== selectedNodeId),
        edges: flow.edges.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId)
      }),
      "Deleted node"
    );
    setSelectedNodeId(null);
  }

  function addDependency(sourceId: string, targetId: string): void {
    if (sourceId === targetId || !activeFlow) {
      setConnectingFrom(null);
      return;
    }
    if (activeFlow.edges.some((e) => e.source === sourceId && e.target === targetId)) {
      setConnectingFrom(null);
      return;
    }
    const edge = createDependencyEdge(sourceId, targetId, activeFlow.edges.length + 1);
    updateActiveFlow((flow) => propagateDependencyInputs({ ...flow, edges: [...flow.edges, edge] }, sourceId, targetId), "Added dependency");
    setConnectingFrom(null);
  }

  function removeDependency(edgeId: string): void {
    updateActiveFlow((flow) => removeDependencyAndPropagatedInputs(flow, edgeId), "Removed dependency");
  }

  function onDropTemplate(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    const templateId = event.dataTransfer.getData("application/sasafrass-template");
    const type = event.dataTransfer.getData("application/sasafrass-type") as NodeType;
    const template = project.templates.find((t) => t.id === templateId) ?? (type ? templateForType(type) : null);
    if (template) addNodeFromTemplate(template, screenToCanvas(event.clientX, event.clientY));
  }

  function onNodePointerDown(event: PointerEvent<HTMLDivElement>, node: FlowNode): void {
    event.stopPropagation();
    setSelectedNodeId(node.id);
    dragRef.current = {
      nodeId: node.id,
      startClient: { x: event.clientX, y: event.clientY },
      startPosition: node.position,
      snapshot: projectRef.current,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onCanvasPointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (event.target !== event.currentTarget) return;
    setSelectedNodeId(null);
    panRef.current = {
      startClient: { x: event.clientX, y: event.clientY },
      startViewport: activeFlow?.viewport ?? { x: 0, y: 0, zoom: 1 }
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onCanvasPointerMove(event: PointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (drag && activeFlow) {
      const viewport = activeFlow.viewport;
      const nextX = drag.startPosition.x + (event.clientX - drag.startClient.x) / viewport.zoom;
      const nextY = drag.startPosition.y + (event.clientY - drag.startClient.y) / viewport.zoom;
      const nextPosition = {
        x: snapToGrid ? snap(nextX) : nextX,
        y: snapToGrid ? snap(nextY) : nextY
      };
      drag.moved = true;
      updateActiveFlowLive((flow, currentProject) => ({
        ...flow,
        nodes: flow.nodes.map((n) => {
          if (n.id !== drag.nodeId) return n;
          const environmentId = environmentForY(currentProject, nextPosition.y);
          return { ...n, environmentId, position: { ...nextPosition, y: clampNodeYToLane(environmentId, currentProject, nextPosition.y) } };
        })
      }));
      return;
    }

    const pan = panRef.current;
    if (pan) {
      setViewport(() => ({
        ...pan.startViewport,
        x: pan.startViewport.x + event.clientX - pan.startClient.x,
        y: pan.startViewport.y + event.clientY - pan.startClient.y
      }));
    }
  }

  function onCanvasPointerUp(): void {
    const drag = dragRef.current;
    if (drag?.moved) {
      const finalProject = { ...projectRef.current, updatedAt: nowIso() };
      commitLiveProject(drag.snapshot, finalProject, "Moved node");
    }
    dragRef.current = null;
    panRef.current = null;
  }

  return {
    selectedNodeId,
    connectingFrom,
    copiedNode,
    snapToGrid,
    canvasDetailMode,
    canvasRef,
    setSelectedNodeId,
    setConnectingFrom,
    setSnapToGrid,
    setCanvasDetailMode,
    addNodeFromTemplate,
    addNodeByType,
    updateNode,
    duplicateSelectedNode,
    copySelectedNode,
    pasteNode,
    deleteSelectedNode,
    addDependency,
    removeDependency,
    setViewport,
    onDropTemplate,
    onNodePointerDown,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp
  };
}
