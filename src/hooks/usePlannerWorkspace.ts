import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, PointerEvent } from "react";
import { clampNodeYToLane, environmentForY, laneBaseY, snap } from "../app/canvasGeometry";
import { LANE_HEIGHT } from "../app/constants";
import {
  downloadBundle,
  downloadDesignReview,
  downloadDiagram,
  downloadProjectJson,
  downloadRunbookCsv,
  downloadRunbookMarkdown
} from "../app/downloads";
import { propagateDependencyInputs, removeDependencyAndPropagatedInputs } from "../app/flowConnections";
import { createDependencyEdge, createEmptyFlow, createNodeFromTemplate, duplicateNode, pasteNode as createPastedNode, templateForType } from "../app/flowFactories";
import type { CanvasDetailMode, CommandAction, DragState, Mode, PanState, ProjectSnapshot } from "../app/appTypes";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  createDefaultProject,
  createId,
  nowIso
} from "../data";
import { parseProjectJson } from "../exporters";
import { buildRunbook, compareSchema, topologicalSort } from "../graph";
import { useProjectDocument } from "./useProjectDocument";
import type { Flow, FlowNode, NodeTemplate, NodeType, Point, Project, Viewport } from "../types";

export function usePlannerWorkspace() {
  const {
    project,
    projectRef,
    history,
    snapshots,
    commitProject,
    mutateProjectLive,
    replaceProject,
    commitLiveProject,
    undo,
    redo
  } = useProjectDocument();
  const [activeFlowId, setActiveFlowId] = useState(() => project.flows[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("canvas");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [nodeSearch, setNodeSearch] = useState("");
  const [canvasDetailMode, setCanvasDetailMode] = useState<CanvasDetailMode>("handoff");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [copiedNode, setCopiedNode] = useState<FlowNode | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<PanState | null>(null);

  const activeFlow = useMemo(
    () => project.flows.find((flow) => flow.id === activeFlowId) ?? project.flows[0],
    [project.flows, activeFlowId]
  );

  const selectedNode = useMemo(
    () => activeFlow?.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [activeFlow, selectedNodeId]
  );

  const runbook = useMemo(() => (activeFlow ? buildRunbook(project, activeFlow) : null), [project, activeFlow]);
  const schemaIssues = useMemo(() => (activeFlow ? compareSchema(activeFlow) : []), [activeFlow]);
  const allIssues = useMemo(() => [...(runbook?.issues ?? []), ...schemaIssues], [runbook, schemaIssues]);
  const issueCounts = useMemo(
    () => ({
      error: allIssues.filter((issue) => issue.severity === "error").length,
      warning: allIssues.filter((issue) => issue.severity === "warning").length,
      info: allIssues.filter((issue) => issue.severity === "info").length
    }),
    [allIssues]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        exportProjectJson();
        return;
      }
      if (!editing && event.key === "Delete") {
        event.preventDefault();
        deleteSelectedNode();
      }
      if (!editing && event.key === "Escape") {
        setConnectingFrom(null);
        setCommandOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function updateActiveFlow(updater: (flow: Flow, currentProject: Project) => Flow, label: string): void {
    commitProject(
      (current) => ({
        ...current,
        flows: current.flows.map((flow) => (flow.id === activeFlowId ? updater(flow, current) : flow))
      }),
      label
    );
  }

  function updateActiveFlowLive(updater: (flow: Flow, currentProject: Project) => Flow): void {
    mutateProjectLive((current) => ({
      ...current,
      flows: current.flows.map((flow) => (flow.id === activeFlowId ? updater(flow, current) : flow))
    }));
  }

  function screenToCanvas(clientX: number, clientY: number): Point {
    const rect = canvasRef.current?.getBoundingClientRect();
    const viewport = activeFlow?.viewport ?? { x: 0, y: 0, zoom: 1 };
    if (!rect) {
      return { x: 100, y: 100 };
    }
    return {
      x: (clientX - rect.left - viewport.x) / viewport.zoom,
      y: (clientY - rect.top - viewport.y) / viewport.zoom
    };
  }

  function addNodeFromTemplate(template: NodeTemplate, position?: Point): void {
    if (!activeFlow) {
      return;
    }
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
      (flow) => ({
        ...flow,
        nodes: flow.nodes.map((node) => (node.id === nodeId ? updater(node) : node))
      }),
      label
    );
  }

  function duplicateSelectedNode(): void {
    if (!selectedNode) {
      return;
    }
    const duplicate = duplicateNode(selectedNode);
    updateActiveFlow((flow) => ({ ...flow, nodes: [...flow.nodes, duplicate] }), "Duplicated node");
    setSelectedNodeId(duplicate.id);
  }

  function copySelectedNode(): void {
    if (selectedNode) {
      setCopiedNode(selectedNode);
    }
  }

  function pasteNode(): void {
    if (!copiedNode) {
      return;
    }
    const pasted = createPastedNode(copiedNode);
    updateActiveFlow((flow) => ({ ...flow, nodes: [...flow.nodes, pasted] }), "Pasted node");
    setSelectedNodeId(pasted.id);
  }

  function deleteSelectedNode(): void {
    if (!selectedNodeId) {
      return;
    }
    updateActiveFlow(
      (flow) => ({
        ...flow,
        nodes: flow.nodes.filter((node) => node.id !== selectedNodeId),
        edges: flow.edges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId)
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
    const exists = activeFlow.edges.some((edge) => edge.source === sourceId && edge.target === targetId);
    if (exists) {
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

  function setViewport(updater: (viewport: Viewport) => Viewport): void {
    updateActiveFlowLive((flow) => ({ ...flow, viewport: updater(flow.viewport) }));
  }

  function fitView(): void {
    if (!activeFlow || activeFlow.nodes.length === 0 || !canvasRef.current) {
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const minX = Math.min(...activeFlow.nodes.map((node) => node.position.x));
    const maxX = Math.max(...activeFlow.nodes.map((node) => node.position.x + NODE_WIDTH));
    const minY = Math.min(...activeFlow.nodes.map((node) => node.position.y));
    const maxY = Math.max(...activeFlow.nodes.map((node) => node.position.y + NODE_HEIGHT));
    const zoom = Math.max(0.38, Math.min(1.1, Math.min((rect.width - 120) / (maxX - minX), (rect.height - 120) / (maxY - minY))));
    setViewport(() => ({
      zoom,
      x: 60 - minX * zoom,
      y: 60 - minY * zoom
    }));
  }

  function alignToLanes(): void {
    updateActiveFlow(
      (flow, currentProject) => {
        const { ordered } = topologicalSort(flow);
        const orderedIds = new Set(ordered.map((node) => node.id));
        const layoutNodes = [...ordered, ...flow.nodes.filter((node) => !orderedIds.has(node.id))];
        const levels = new Map<string, number>();

        for (const node of layoutNodes) {
          const incomingLevels = flow.edges
            .filter((edge) => edge.target === node.id)
            .map((edge) => levels.get(edge.source))
            .filter((level): level is number => typeof level === "number");
          levels.set(node.id, incomingLevels.length ? Math.max(...incomingLevels) + 1 : 0);
        }

        const rowGap = 32;
        const maxRowsPerLane = Math.max(1, Math.floor((LANE_HEIGHT - 56 - 32 - NODE_HEIGHT) / (NODE_HEIGHT + rowGap)) + 1);
        const levelSlotCounts = new Map<string, number>();
        const levelColumnWidths = new Map<number, number>();

        for (const node of layoutNodes) {
          const level = levels.get(node.id) ?? 0;
          const key = `${node.environmentId}:${level}`;
          const nextCount = (levelSlotCounts.get(key) ?? 0) + 1;
          levelSlotCounts.set(key, nextCount);
          levelColumnWidths.set(level, Math.max(levelColumnWidths.get(level) ?? 1, Math.ceil(nextCount / maxRowsPerLane)));
        }

        const sortedLevels = [...new Set(layoutNodes.map((node) => levels.get(node.id) ?? 0))].sort((a, b) => a - b);
        const levelStartColumns = new Map<number, number>();
        let nextStartColumn = 0;
        for (const level of sortedLevels) {
          levelStartColumns.set(level, nextStartColumn);
          nextStartColumn += levelColumnWidths.get(level) ?? 1;
        }

        const laneLevelSlots = new Map<string, number>();
        const positions = new Map<string, Point>();
        for (const node of layoutNodes) {
          const level = levels.get(node.id) ?? 0;
          const slotKey = `${node.environmentId}:${level}`;
          const slot = laneLevelSlots.get(slotKey) ?? 0;
          laneLevelSlots.set(slotKey, slot + 1);
          const row = slot % maxRowsPerLane;
          const collisionColumn = Math.floor(slot / maxRowsPerLane);
          const column = (levelStartColumns.get(level) ?? level) + collisionColumn;
          positions.set(node.id, {
            x: snap(80 + column * (NODE_WIDTH + 88)),
            y: clampNodeYToLane(node.environmentId, currentProject, snap(laneBaseY(node.environmentId, currentProject) + 62 + row * (NODE_HEIGHT + rowGap)))
          });
        }

        const arrangedPositions = [...positions.values()];
        const rect = canvasRef.current?.getBoundingClientRect();
        const minX = arrangedPositions.length ? Math.min(...arrangedPositions.map((position) => position.x)) : 0;
        const maxX = arrangedPositions.length ? Math.max(...arrangedPositions.map((position) => position.x + NODE_WIDTH)) : 1000;
        const minY = arrangedPositions.length ? Math.min(...arrangedPositions.map((position) => position.y)) : 0;
        const maxY = arrangedPositions.length ? Math.max(...arrangedPositions.map((position) => position.y + NODE_HEIGHT)) : 800;
        const zoom = rect
          ? Math.max(0.5, Math.min(0.9, Math.min((rect.width - 140) / Math.max(1, maxX - minX), (rect.height - 110) / Math.max(1, maxY - minY))))
          : 0.68;

        return {
          ...flow,
          viewport: {
            x: 70 - minX * zoom,
            y: 48 - minY * zoom,
            zoom
          },
          nodes: flow.nodes.map((node) => {
            return {
              ...node,
              position: positions.get(node.id) ?? node.position
            };
          })
        };
      },
      "Arranged flow"
    );
  }

  function createNewProject(): void {
    const next = createDefaultProject();
    next.id = createId("project");
    next.name = "Untitled SASDIS Plan";
    replaceProject(next, "New project");
    setActiveFlowId(next.flows[0]?.id ?? "");
    setSelectedNodeId(null);
  }

  function createFlow(): void {
    const flow = createEmptyFlow(project.flows.length + 1);
    commitProject((current) => ({ ...current, flows: [...current.flows, flow] }), "Added flow");
    setActiveFlowId(flow.id);
    setSelectedNodeId(null);
  }

  function importProject(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = parseProjectJson(String(reader.result));
        const imported = { ...next, updatedAt: nowIso() };
        replaceProject(imported, `Imported ${file.name}`);
        setActiveFlowId(imported.flows[0]?.id ?? "");
        setSelectedNodeId(null);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Import failed.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function exportProjectJson(): void {
    downloadProjectJson(project);
  }

  function exportRunbookMarkdown(): void {
    if (!activeFlow || !runbook) {
      return;
    }
    downloadRunbookMarkdown(project, activeFlow, runbook);
  }

  function exportRunbookCsv(): void {
    if (!activeFlow || !runbook) {
      return;
    }
    downloadRunbookCsv(project, activeFlow, runbook);
  }

  function exportDesignReview(): void {
    if (!activeFlow) {
      return;
    }
    downloadDesignReview(project, activeFlow);
  }

  function exportDiagram(): void {
    if (!activeFlow) {
      return;
    }
    downloadDiagram(project, activeFlow);
  }

  function exportBundle(): void {
    if (!activeFlow || !runbook) {
      return;
    }
    downloadBundle(project, activeFlow, runbook);
  }

  function onDropTemplate(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    const templateId = event.dataTransfer.getData("application/sasafrass-template");
    const type = event.dataTransfer.getData("application/sasafrass-type") as NodeType;
    const template =
      project.templates.find((candidate) => candidate.id === templateId) ??
      (type ? templateForType(type) : null);
    if (template) {
      addNodeFromTemplate(template, screenToCanvas(event.clientX, event.clientY));
    }
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
    if (event.target !== event.currentTarget) {
      return;
    }
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
        nodes: flow.nodes.map((node) => {
          if (node.id !== drag.nodeId) {
            return node;
          }
          const environmentId = environmentForY(currentProject, nextPosition.y);
          return {
            ...node,
            environmentId,
            position: {
              ...nextPosition,
              y: clampNodeYToLane(environmentId, currentProject, nextPosition.y)
            }
          };
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

  function restoreSnapshot(snapshot: ProjectSnapshot): void {
    replaceProject(snapshot.project, `Restored ${snapshot.label}`);
    setActiveFlowId(snapshot.project.flows[0]?.id ?? "");
    setSelectedNodeId(null);
  }

  const commands = useMemo<CommandAction[]>(
    () => [
      { id: "add-job", label: "Add SAS job", action: () => addNodeByType("job") },
      { id: "add-join", label: "Add join", action: () => addNodeByType("join") },
      { id: "add-output", label: "Add output", action: () => addNodeByType("output") },
      { id: "fit", label: "Fit canvas", action: fitView },
      { id: "runbook", label: "Open SAS jobs", action: () => setMode("runbook") },
      { id: "review", label: "Open reviewer mode", action: () => setMode("review") },
      { id: "export", label: "Export runbook bundle", action: exportBundle },
      { id: "align", label: "Arrange flow", action: alignToLanes }
    ],
    [activeFlow, project, copiedNode, selectedNode]
  );

  const filteredNodes = (activeFlow?.nodes ?? []).filter((node) =>
    `${node.title} ${node.metadata.jobName} ${node.schema.sourceName}`.toLowerCase().includes(nodeSearch.toLowerCase())
  );

  return {
    project,
    activeFlow,
    activeFlowId,
    mode,
    selectedNodeId,
    selectedNode,
    connectingFrom,
    history,
    snapshots,
    nodeSearch,
    canvasDetailMode,
    commandOpen,
    commandQuery,
    copiedNode,
    snapToGrid,
    runbook,
    allIssues,
    issueCounts,
    commands,
    filteredNodes,
    canvasRef,
    fileInputRef,
    setActiveFlowId,
    setMode,
    setSelectedNodeId,
    setConnectingFrom,
    setNodeSearch,
    setCanvasDetailMode,
    setCommandOpen,
    setCommandQuery,
    setSnapToGrid,
    commitProject,
    updateNode,
    addNodeFromTemplate,
    addNodeByType,
    addDependency,
    removeDependency,
    deleteSelectedNode,
    duplicateSelectedNode,
    copySelectedNode,
    pasteNode,
    fitView,
    alignToLanes,
    setViewport,
    createNewProject,
    createFlow,
    importProject,
    exportProjectJson,
    exportRunbookMarkdown,
    exportRunbookCsv,
    exportDesignReview,
    exportDiagram,
    exportBundle,
    restoreSnapshot,
    undo,
    redo,
    onDropTemplate,
    onNodePointerDown,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp
  };
}
