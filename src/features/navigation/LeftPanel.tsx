import { useState } from "react";
import type { Mode, ProjectSnapshot } from "../../app/appTypes";
import { nodeTypeDescriptions, nodeTypeLabels } from "../../data";
import { Icon } from "../../components/Icon";
import type { Flow, FlowNode, NodeTemplate, NodeType, Point, Project } from "../../types";

interface LeftPanelProps {
  project: Project;
  activeFlow: Flow;
  activeFlowId: string;
  setActiveFlowId: (id: string) => void;
  createFlow: () => void;
  addNodeFromTemplate: (template: NodeTemplate, position?: Point) => void;
  addNodeByType: (type: NodeType) => void;
  nodeSearch: string;
  setNodeSearch: (value: string) => void;
  filteredNodes: FlowNode[];
  setSelectedNodeId: (id: string | null) => void;
  setMode: (mode: Mode) => void;
  snapshots: ProjectSnapshot[];
  restoreSnapshot: (snapshot: ProjectSnapshot) => void;
}

type SectionId = "flows" | "nodes" | "search" | "history";

export function LeftPanel(props: LeftPanelProps) {
  const {
    project, activeFlowId, setActiveFlowId, createFlow,
    addNodeFromTemplate, addNodeByType,
    nodeSearch, setNodeSearch, filteredNodes,
    setSelectedNodeId, setMode, snapshots, restoreSnapshot
  } = props;

  const [expanded, setExpanded] = useState<Set<SectionId>>(() => new Set(["flows", "nodes"]));

  function toggle(id: SectionId): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <aside className="left-panel">
      <section className="panel-section">
        <button className="panel-heading accordion-toggle" onClick={() => toggle("flows")}>
          <span className={`accordion-arrow ${expanded.has("flows") ? "open" : ""}`}>&#9654;</span>
          <span>Flows</span>
          <button className="mini-button" title="Add flow" onClick={(e) => { e.stopPropagation(); createFlow(); }}>
            <Icon name="plus" />
          </button>
        </button>
        {expanded.has("flows") && (
          <div className="flow-list">
            {project.flows.map((flow) => (
              <button
                key={flow.id}
                className={flow.id === activeFlowId ? "active" : ""}
                onClick={() => { setActiveFlowId(flow.id); setSelectedNodeId(null); }}
              >
                <span>{flow.name}</span>
                <small>{flow.nodes.length} nodes</small>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="panel-section">
        <button className="panel-heading accordion-toggle" onClick={() => toggle("nodes")}>
          <span className={`accordion-arrow ${expanded.has("nodes") ? "open" : ""}`}>&#9654;</span>
          <span>Add Nodes</span>
        </button>
        {expanded.has("nodes") && (
          <>
            <div className="node-type-grid">
              {(Object.keys(nodeTypeLabels) as NodeType[]).map((type) => (
                <button
                  key={type}
                  draggable
                  title={nodeTypeDescriptions[type]}
                  onDragStart={(event) => event.dataTransfer.setData("application/sasafrass-type", type)}
                  onClick={() => addNodeByType(type)}
                >
                  <span className={`type-dot ${type}`} />
                  <span>{nodeTypeLabels[type]}</span>
                </button>
              ))}
            </div>
            <div className="panel-subheading">Templates</div>
            <div className="template-list">
              {project.templates.map((template) => (
                <button
                  key={template.id}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("application/sasafrass-template", template.id)}
                  onClick={() => addNodeFromTemplate(template)}
                >
                  <strong>{template.name}</strong>
                  <span>{template.description}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="panel-section">
        <button className="panel-heading accordion-toggle" onClick={() => toggle("search")}>
          <span className={`accordion-arrow ${expanded.has("search") ? "open" : ""}`}>&#9654;</span>
          <span>Search</span>
        </button>
        {expanded.has("search") && (
          <>
            <div className="search-box">
              <Icon name="search" />
              <input value={nodeSearch} onChange={(event) => setNodeSearch(event.target.value)} placeholder="Job, table, note" />
            </div>
            <div className="search-results">
              {filteredNodes.slice(0, 8).map((node) => (
                <button
                  key={node.id}
                  onClick={() => { setSelectedNodeId(node.id); setMode("canvas"); }}
                >
                  <span>{node.title}</span>
                  <small>{node.metadata.jobName || node.schema.sourceName || nodeTypeLabels[node.type]}</small>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="panel-section">
        <button className="panel-heading accordion-toggle" onClick={() => toggle("history")}>
          <span className={`accordion-arrow ${expanded.has("history") ? "open" : ""}`}>&#9654;</span>
          <span>History</span>
        </button>
        {expanded.has("history") && (
          <div className="snapshot-list">
            {snapshots.length === 0 && <div className="empty-note">Snapshots appear after edits.</div>}
            {snapshots.slice(0, 4).map((snapshot) => (
              <button key={snapshot.id} onClick={() => restoreSnapshot(snapshot)}>
                <span>{snapshot.label}</span>
                <small>{snapshot.nodeCount} nodes - {new Date(snapshot.createdAt).toLocaleTimeString()}</small>
              </button>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
