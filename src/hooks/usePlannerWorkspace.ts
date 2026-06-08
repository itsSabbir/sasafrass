import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { CommandAction, Mode, ProjectSnapshot } from "../app/appTypes";
import { createEmptyFlow } from "../app/flowFactories";
import { importSasFiles } from "../app/sasImporter";
import { loadActiveFlowId, persistActiveFlowId, resolveActiveFlowId } from "../app/storage";
import { createDefaultProject, createId, nowIso } from "../data";
import type { SasFileAnalysis } from "../cleaner/types";
import { parseProjectJson } from "../exporters";
import { buildRunbook, compareSchema } from "../graph";
import { useCanvasInteraction } from "./useCanvasInteraction";
import { useFlowLayout } from "./useFlowLayout";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useProjectDocument } from "./useProjectDocument";
import { useProjectExports } from "./useProjectExports";
import type { Flow, Project } from "../types";

export function usePlannerWorkspace() {
  const doc = useProjectDocument();
  const { project, projectRef, history, snapshots, commitProject, mutateProjectLive, replaceProject, commitLiveProject, undo, redo } = doc;

  const [activeFlowId, setActiveFlowId] = useState(() => resolveActiveFlowId(loadActiveFlowId(), project.flows.map((f) => f.id)));
  const [mode, setMode] = useState<Mode>("canvas");

  // Persist the active flow so it survives the planner unmount on tool switch; the
  // "Import to Flow" handoff remounts the planner and must target the same flow.
  useEffect(() => {
    if (activeFlowId) {
      persistActiveFlowId(activeFlowId);
    }
  }, [activeFlowId]);
  const [nodeSearch, setNodeSearch] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeFlow = useMemo(
    () => project.flows.find((f) => f.id === activeFlowId) ?? project.flows[0],
    [project.flows, activeFlowId]
  );

  const runbook = useMemo(() => (activeFlow ? buildRunbook(project, activeFlow) : null), [project, activeFlow]);
  const schemaIssues = useMemo(() => (activeFlow ? compareSchema(activeFlow) : []), [activeFlow]);
  const allIssues = useMemo(() => [...(runbook?.issues ?? []), ...schemaIssues], [runbook, schemaIssues]);
  const issueCounts = useMemo(
    () => ({
      error: allIssues.filter((i) => i.severity === "error").length,
      warning: allIssues.filter((i) => i.severity === "warning").length,
      info: allIssues.filter((i) => i.severity === "info").length
    }),
    [allIssues]
  );

  function updateActiveFlow(updater: (flow: Flow, currentProject: Project) => Flow, label: string): void {
    commitProject(
      (current) => ({ ...current, flows: current.flows.map((f) => (f.id === activeFlowId ? updater(f, current) : f)) }),
      label
    );
  }

  function updateActiveFlowLive(updater: (flow: Flow, currentProject: Project) => Flow): void {
    mutateProjectLive((current) => ({ ...current, flows: current.flows.map((f) => (f.id === activeFlowId ? updater(f, current) : f)) }));
  }

  const canvas = useCanvasInteraction({
    project,
    activeFlow,
    activeFlowId,
    projectRef,
    setMode,
    updateActiveFlow,
    updateActiveFlowLive,
    commitLiveProject
  });

  const layout = useFlowLayout({
    project,
    activeFlow,
    canvasRef: canvas.canvasRef,
    setViewport: canvas.setViewport,
    updateActiveFlow
  });

  const exports = useProjectExports({ project, activeFlow, runbook });

  useKeyboardShortcuts({
    openCommandPalette: () => setCommandOpen(true),
    undo,
    redo,
    saveProject: exports.exportProjectJson,
    deleteSelectedNode: canvas.deleteSelectedNode,
    clearConnecting: () => canvas.setConnectingFrom(null),
    closeCommandPalette: () => setCommandOpen(false)
  });

  const selectedNode = useMemo(
    () => activeFlow?.nodes.find((n) => n.id === canvas.selectedNodeId) ?? null,
    [activeFlow, canvas.selectedNodeId]
  );

  function createNewProject(): void {
    const next = createDefaultProject();
    next.id = createId("project");
    next.name = "Untitled SASDIS Plan";
    replaceProject(next, "New project");
    setActiveFlowId(next.flows[0]?.id ?? "");
    canvas.setSelectedNodeId(null);
  }

  function importSasToFlow(analyses: SasFileAnalysis[]): void {
    if (!activeFlow || analyses.length === 0) return;
    const result = importSasFiles(analyses, project);
    updateActiveFlow(
      (flow) => ({ ...flow, nodes: [...flow.nodes, ...result.nodes], edges: [...flow.edges, ...result.edges] }),
      `Imported ${analyses.length} SAS ${analyses.length === 1 ? "file" : "files"}`
    );
    setMode("canvas");
  }

  function createFlow(): void {
    const flow = createEmptyFlow(project.flows.length + 1);
    commitProject((current) => ({ ...current, flows: [...current.flows, flow] }), "Added flow");
    setActiveFlowId(flow.id);
    canvas.setSelectedNodeId(null);
  }

  function importProject(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = parseProjectJson(String(reader.result));
        const imported = { ...next, updatedAt: nowIso() };
        replaceProject(imported, `Imported ${file.name}`);
        setActiveFlowId(imported.flows[0]?.id ?? "");
        canvas.setSelectedNodeId(null);
      } catch (error) {
        alert(error instanceof Error ? error.message : "Import failed.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function restoreSnapshot(snapshot: ProjectSnapshot): void {
    replaceProject(snapshot.project, `Restored ${snapshot.label}`);
    setActiveFlowId(snapshot.project.flows[0]?.id ?? "");
    canvas.setSelectedNodeId(null);
  }

  const commands = useMemo<CommandAction[]>(
    () => [
      { id: "add-job", label: "Add SAS job", action: () => canvas.addNodeByType("job") },
      { id: "add-join", label: "Add join", action: () => canvas.addNodeByType("join") },
      { id: "add-output", label: "Add output", action: () => canvas.addNodeByType("output") },
      { id: "fit", label: "Fit canvas", action: layout.fitView },
      { id: "runbook", label: "Open SAS jobs", action: () => setMode("runbook") },
      { id: "review", label: "Open reviewer mode", action: () => setMode("review") },
      { id: "export", label: "Export runbook bundle", action: exports.exportBundle },
      { id: "align", label: "Arrange flow", action: layout.alignToLanes }
    ],
    [activeFlow, project]
  );

  const filteredNodes = (activeFlow?.nodes ?? []).filter((n) =>
    `${n.title} ${n.metadata.jobName} ${n.schema.sourceName}`.toLowerCase().includes(nodeSearch.toLowerCase())
  );

  return {
    project,
    activeFlow,
    activeFlowId,
    mode,
    selectedNodeId: canvas.selectedNodeId,
    selectedNode,
    connectingFrom: canvas.connectingFrom,
    history,
    snapshots,
    nodeSearch,
    canvasDetailMode: canvas.canvasDetailMode,
    commandOpen,
    commandQuery,
    copiedNode: canvas.copiedNode,
    snapToGrid: canvas.snapToGrid,
    runbook,
    allIssues,
    issueCounts,
    commands,
    filteredNodes,
    canvasRef: canvas.canvasRef,
    fileInputRef,
    setActiveFlowId,
    setMode,
    setSelectedNodeId: canvas.setSelectedNodeId,
    setConnectingFrom: canvas.setConnectingFrom,
    setNodeSearch,
    setCanvasDetailMode: canvas.setCanvasDetailMode,
    setCommandOpen,
    setCommandQuery,
    setSnapToGrid: canvas.setSnapToGrid,
    commitProject,
    updateNode: canvas.updateNode,
    addNodeFromTemplate: canvas.addNodeFromTemplate,
    addNodeByType: canvas.addNodeByType,
    addDependency: canvas.addDependency,
    removeDependency: canvas.removeDependency,
    deleteSelectedNode: canvas.deleteSelectedNode,
    duplicateSelectedNode: canvas.duplicateSelectedNode,
    copySelectedNode: canvas.copySelectedNode,
    pasteNode: canvas.pasteNode,
    fitView: layout.fitView,
    alignToLanes: layout.alignToLanes,
    setViewport: canvas.setViewport,
    createNewProject,
    createFlow,
    importProject,
    importSasToFlow,
    exportProjectJson: exports.exportProjectJson,
    exportRunbookMarkdown: exports.exportRunbookMarkdown,
    exportRunbookCsv: exports.exportRunbookCsv,
    exportDesignReview: exports.exportDesignReview,
    exportDiagram: exports.exportDiagram,
    exportBundle: exports.exportBundle,
    restoreSnapshot,
    undo,
    redo,
    onDropTemplate: canvas.onDropTemplate,
    onNodePointerDown: canvas.onNodePointerDown,
    onCanvasPointerDown: canvas.onCanvasPointerDown,
    onCanvasPointerMove: canvas.onCanvasPointerMove,
    onCanvasPointerUp: canvas.onCanvasPointerUp
  };
}
