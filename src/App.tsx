import { CommandPalette } from "./components/CommandPalette";
import { StatusStrip } from "./components/StatusStrip";
import { TopBar } from "./components/TopBar";
import { CanvasWorkspace } from "./features/canvas/CanvasWorkspace";
import { Inspector } from "./features/inspector/Inspector";
import { LeftPanel } from "./features/navigation/LeftPanel";
import { usePlannerWorkspace } from "./hooks/usePlannerWorkspace";
import { CodeCleanerView } from "./views/CodeCleanerView";
import { DesignView } from "./views/DesignView";
import { ReviewerView } from "./views/ReviewerView";
import { RunPlanView } from "./views/RunPlanView";

export default function App() {
  const workspace = usePlannerWorkspace();
  const { activeFlow, runbook } = workspace;

  if (!activeFlow || !runbook) {
    return <div className="empty-app">No active flow available.</div>;
  }

  return (
    <div className="app-shell">
      <TopBar
        project={workspace.project}
        mode={workspace.mode}
        setMode={workspace.setMode}
        history={workspace.history}
        fileInputRef={workspace.fileInputRef}
        importProject={workspace.importProject}
        undo={workspace.undo}
        redo={workspace.redo}
        createNewProject={workspace.createNewProject}
        exportBundle={workspace.exportBundle}
        openCommandPalette={() => workspace.setCommandOpen(true)}
      />

      <StatusStrip issueCounts={workspace.issueCounts} runbook={runbook} activeFlow={activeFlow} allIssues={workspace.allIssues} onSelectNode={(nodeId) => { workspace.setSelectedNodeId(nodeId); workspace.setMode("canvas"); }} />

      <main className="app-main">
        <LeftPanel
          project={workspace.project}
          activeFlow={activeFlow}
          activeFlowId={workspace.activeFlowId}
          setActiveFlowId={workspace.setActiveFlowId}
          createFlow={workspace.createFlow}
          addNodeFromTemplate={workspace.addNodeFromTemplate}
          addNodeByType={workspace.addNodeByType}
          nodeSearch={workspace.nodeSearch}
          setNodeSearch={workspace.setNodeSearch}
          filteredNodes={workspace.filteredNodes}
          setSelectedNodeId={workspace.setSelectedNodeId}
          setMode={workspace.setMode}
          snapshots={workspace.snapshots}
          restoreSnapshot={workspace.restoreSnapshot}
        />

        <section className="workspace">
          {workspace.mode === "canvas" && (
            <CanvasWorkspace
              project={workspace.project}
              flow={activeFlow}
              selectedNodeId={workspace.selectedNodeId}
              connectingFrom={workspace.connectingFrom}
              allIssues={workspace.allIssues}
              canvasDetailMode={workspace.canvasDetailMode}
              setCanvasDetailMode={workspace.setCanvasDetailMode}
              snapToGrid={workspace.snapToGrid}
              setSnapToGrid={workspace.setSnapToGrid}
              setSelectedNodeId={workspace.setSelectedNodeId}
              setConnectingFrom={workspace.setConnectingFrom}
              addDependency={workspace.addDependency}
              removeDependency={workspace.removeDependency}
              deleteSelectedNode={workspace.deleteSelectedNode}
              duplicateSelectedNode={workspace.duplicateSelectedNode}
              copySelectedNode={workspace.copySelectedNode}
              pasteNode={workspace.pasteNode}
              updateNode={workspace.updateNode}
              copiedNode={workspace.copiedNode}
              fitView={workspace.fitView}
              alignToLanes={workspace.alignToLanes}
              setViewport={workspace.setViewport}
              canvasRef={workspace.canvasRef}
              onDropTemplate={workspace.onDropTemplate}
              onNodePointerDown={workspace.onNodePointerDown}
              onCanvasPointerDown={workspace.onCanvasPointerDown}
              onCanvasPointerMove={workspace.onCanvasPointerMove}
              onCanvasPointerUp={workspace.onCanvasPointerUp}
            />
          )}
          {workspace.mode === "runbook" && (
            <RunPlanView
              project={workspace.project}
              flow={activeFlow}
              runbook={runbook}
              exportRunbookMarkdown={workspace.exportRunbookMarkdown}
              exportRunbookCsv={workspace.exportRunbookCsv}
              exportDiagram={workspace.exportDiagram}
              exportProjectJson={workspace.exportProjectJson}
            />
          )}
          {workspace.mode === "design" && (
            <DesignView project={workspace.project} flow={activeFlow} issues={workspace.allIssues} exportDesignReview={workspace.exportDesignReview} />
          )}
          {workspace.mode === "review" && (
            <ReviewerView project={workspace.project} flow={activeFlow} runbook={runbook} issues={workspace.allIssues} exportBundle={workspace.exportBundle} />
          )}
          {workspace.mode === "import" && <CodeCleanerView onImportToFlow={workspace.importSasToFlow} />}
        </section>

        <Inspector
          project={workspace.project}
          activeFlow={activeFlow}
          selectedNode={workspace.selectedNode}
          allIssues={workspace.allIssues}
          commitProject={workspace.commitProject}
          updateNode={workspace.updateNode}
          removeDependency={workspace.removeDependency}
          setSelectedNodeId={workspace.setSelectedNodeId}
        />
      </main>

      {workspace.commandOpen && (
        <CommandPalette
          commands={workspace.commands}
          query={workspace.commandQuery}
          setQuery={workspace.setCommandQuery}
          close={() => {
            workspace.setCommandOpen(false);
            workspace.setCommandQuery("");
          }}
        />
      )}
    </div>
  );
}
