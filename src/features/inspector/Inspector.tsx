import { clampNodeYToLane, laneBaseY } from "../../app/canvasGeometry";
import { updateNodeMetadata, updateNodeSchema } from "../../app/nodeMutators";
import { derivedToText, joinKeysToText, listToText, textToColumnList, textToDerived, textToJoinKeys, textToList } from "../../app/textFields";
import { DraftInput, DraftTextArea } from "../../components/DraftFields";
import { Field } from "../../components/Field";
import { Icon } from "../../components/Icon";
import { createId, nodeTypeLabels } from "../../data";
import { getNodeIssues } from "../../graph";
import type { Flow, FlowNode, Project, SchemaMetadata, ValidationIssue } from "../../types";

interface InspectorProps {
  project: Project;
  activeFlow: Flow;
  selectedNode: FlowNode | null;
  allIssues: ValidationIssue[];
  commitProject: (updater: (current: Project) => Project, label: string) => void;
  updateNode: (nodeId: string, updater: (node: FlowNode) => FlowNode, label: string) => void;
  removeDependency: (edgeId: string) => void;
  setSelectedNodeId: (id: string | null) => void;
}

export function Inspector(props: InspectorProps) {
  const { project, activeFlow, selectedNode, allIssues, commitProject, updateNode, removeDependency, setSelectedNodeId } = props;

  function updateProject(updates: Partial<Project>): void {
    commitProject((current) => ({ ...current, ...updates }), "Updated project");
  }

  function updateFlow(updates: Partial<Flow>): void {
    commitProject(
      (current) => ({
        ...current,
        flows: current.flows.map((flow) => (flow.id === activeFlow.id ? { ...flow, ...updates } : flow))
      }),
      "Updated flow"
    );
  }

  function updateEnvironment(environmentId: string, updates: { name?: string; color?: string }): void {
    commitProject(
      (current) => ({
        ...current,
        environments: current.environments.map((environment) => (environment.id === environmentId ? { ...environment, ...updates } : environment))
      }),
      "Updated environment"
    );
  }

  function addEnvironment(): void {
    const id = createId("env");
    commitProject(
      (current) => ({
        ...current,
        environments: [...current.environments, { id, name: `environment ${current.environments.length + 1}`, color: "#7a5cff" }]
      }),
      "Added environment"
    );
  }

  if (!selectedNode) {
    return (
      <aside className="inspector">
        <div className="inspector-header">
          <div>
            <h2>Project Settings</h2>
            <p>Click a node on the canvas to edit its details</p>
          </div>
        </div>
        <Field label="Project name">
          <DraftInput value={project.name} onCommit={(value) => updateProject({ name: value })} />
        </Field>
        <Field label="Owner">
          <DraftInput value={project.owner} onCommit={(value) => updateProject({ owner: value })} />
        </Field>
        <Field label="Description">
          <DraftTextArea value={project.description} onCommit={(value) => updateProject({ description: value })} />
        </Field>
        <div className="field-grid two">
          <Field label="Business area">
            <DraftInput
              value={project.metadata.businessArea}
              onCommit={(value) => commitProject((current) => ({ ...current, metadata: { ...current.metadata, businessArea: value } }), "Updated business area")}
            />
          </Field>
          <Field label="Release">
            <DraftInput
              value={project.metadata.release}
              onCommit={(value) => commitProject((current) => ({ ...current, metadata: { ...current.metadata, release: value } }), "Updated release")}
            />
          </Field>
        </div>
        <Field label="Jira key">
          <DraftInput
            value={project.metadata.jiraKey}
            onCommit={(value) => commitProject((current) => ({ ...current, metadata: { ...current.metadata, jiraKey: value } }), "Updated Jira key")}
          />
        </Field>
        <div className="inspector-subhead">Active flow</div>
        <Field label="Flow name">
          <DraftInput value={activeFlow.name} onCommit={(value) => updateFlow({ name: value })} />
        </Field>
        <Field label="Flow description">
          <DraftTextArea value={activeFlow.description} onCommit={(value) => updateFlow({ description: value })} />
        </Field>
        <div className="inspector-subhead with-action">
          <span>Environment lanes</span>
          <button className="mini-button" onClick={addEnvironment}>
            <Icon name="plus" />
          </button>
        </div>
        <div className="environment-editor">
          {project.environments.map((environment) => (
            <div key={environment.id} className="environment-row">
              <input type="color" value={environment.color} onChange={(event) => updateEnvironment(environment.id, { color: event.target.value })} />
              <DraftInput value={environment.name} onCommit={(value) => updateEnvironment(environment.id, { name: value })} />
            </div>
          ))}
        </div>
      </aside>
    );
  }

  const nodeIssues = getNodeIssues(allIssues, selectedNode.id);
  const incomingDependencies = activeFlow.edges.flatMap((edge) => {
    if (edge.target !== selectedNode.id) {
      return [];
    }
    const node = activeFlow.nodes.find((candidate) => candidate.id === edge.source);
    return node ? [{ edge, node }] : [];
  });
  const outgoingDependencies = activeFlow.edges.flatMap((edge) => {
    if (edge.source !== selectedNode.id) {
      return [];
    }
    const node = activeFlow.nodes.find((candidate) => candidate.id === edge.target);
    return node ? [{ edge, node }] : [];
  });

  return (
    <aside className="inspector">
      <div className="inspector-header">
        <div>
          <h2>{selectedNode.title}</h2>
          <p>{nodeTypeLabels[selectedNode.type]}</p>
        </div>
        <button className="mini-button close-inspector" title="Deselect node — return to project settings" onClick={() => setSelectedNodeId(null)}>
          ✕
        </button>
      </div>

      {nodeIssues.length > 0 && (
        <div className="issue-stack">
          {nodeIssues.map((issue) => (
            <div key={issue.id} className={`issue ${issue.severity}`}>
              {issue.message}
            </div>
          ))}
        </div>
      )}

      <Field label="Title">
        <DraftInput value={selectedNode.title} onCommit={(value) => updateNode(selectedNode.id, (node) => ({ ...node, title: value }), "Updated node title")} />
      </Field>
      <Field label="Environment">
        <select
          value={selectedNode.environmentId}
          onChange={(event) => {
            const environmentId = event.target.value;
            updateNode(
              selectedNode.id,
              (node) => ({
                ...node,
                environmentId,
                position: { ...node.position, y: clampNodeYToLane(environmentId, project, laneBaseY(environmentId, project) + 72) }
              }),
              "Changed node environment"
            );
          }}
        >
          {project.environments.map((environment) => (
            <option key={environment.id} value={environment.id}>
              {environment.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="inspector-subhead">Dependencies</div>
      <div className="dependency-editor">
        <div className="dependency-group">
          <span>Upstream</span>
          {incomingDependencies.length === 0 && <small>No upstream dependency</small>}
          {incomingDependencies.map(({ edge, node }) => (
            <button key={edge.id} className="dependency-row" onClick={() => setSelectedNodeId(node.id)}>
              <span>{node.title}</span>
              <small>{node.metadata.producedOutputs[0] || node.schema.sourceName || node.metadata.jobName || nodeTypeLabels[node.type]}</small>
              <i
                role="button"
                aria-label={`Disconnect ${node.title}`}
                title="Disconnect"
                onClick={(event) => {
                  event.stopPropagation();
                  removeDependency(edge.id);
                }}
              >
                x
              </i>
            </button>
          ))}
        </div>
        <div className="dependency-group">
          <span>Downstream</span>
          {outgoingDependencies.length === 0 && <small>No downstream dependency</small>}
          {outgoingDependencies.map(({ edge, node }) => (
            <button key={edge.id} className="dependency-row" onClick={() => setSelectedNodeId(node.id)}>
              <span>{node.title}</span>
              <small>{node.metadata.requiredInputs[0] || node.metadata.jobName || nodeTypeLabels[node.type]}</small>
              <i
                role="button"
                aria-label={`Disconnect ${node.title}`}
                title="Disconnect"
                onClick={(event) => {
                  event.stopPropagation();
                  removeDependency(edge.id);
                }}
              >
                x
              </i>
            </button>
          ))}
        </div>
      </div>

      <div className="inspector-subhead">DevOps handoff</div>
      <Field label="Job name">
        <DraftInput value={selectedNode.metadata.jobName} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeMetadata(node, { jobName: value }), "Updated job name")} />
      </Field>
      <div className="field-grid two">
        <Field label="Flow/group">
          <DraftInput value={selectedNode.metadata.flowGroup} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeMetadata(node, { flowGroup: value }), "Updated flow group")} />
        </Field>
        <Field label="Owner">
          <DraftInput value={selectedNode.metadata.owner} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeMetadata(node, { owner: value }), "Updated owner")} />
        </Field>
      </div>
      <Field label="Required inputs">
        <DraftTextArea value={listToText(selectedNode.metadata.requiredInputs)} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeMetadata(node, { requiredInputs: textToList(value) }), "Updated inputs")} />
      </Field>
      <Field label="Produced outputs">
        <DraftTextArea value={listToText(selectedNode.metadata.producedOutputs)} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeMetadata(node, { producedOutputs: textToList(value) }), "Updated outputs")} />
      </Field>
      <Field label="Dependency rules">
        <DraftTextArea value={selectedNode.metadata.dependencyRules} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeMetadata(node, { dependencyRules: value }), "Updated dependency rules")} />
      </Field>
      <Field label="Run notes">
        <DraftTextArea value={selectedNode.metadata.runNotes} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeMetadata(node, { runNotes: value }), "Updated run notes")} />
      </Field>
      <Field label="Restart notes">
        <DraftTextArea value={selectedNode.metadata.restartNotes} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeMetadata(node, { restartNotes: value }), "Updated restart notes")} />
      </Field>
      <Field label="Validation checks">
        <DraftTextArea value={listToText(selectedNode.metadata.validations)} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeMetadata(node, { validations: textToList(value) }), "Updated validations")} />
      </Field>

      <div className="inspector-subhead">Architecture metadata</div>
      <Field label="Source table/file">
        <DraftInput value={selectedNode.schema.sourceName} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeSchema(node, { sourceName: value }), "Updated source")} />
      </Field>
      <Field label="Selected columns">
        <DraftTextArea
          placeholder={"ACCOUNT_ID num 8\nCUSTOMER_NM varchar(60)"}
          value={listToText(selectedNode.schema.selectedColumns)}
          onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeSchema(node, { selectedColumns: textToColumnList(value) }), "Updated selected columns")}
        />
      </Field>
      <Field label="Derived columns">
        <DraftTextArea value={derivedToText(selectedNode.schema.derivedColumns)} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeSchema(node, { derivedColumns: textToDerived(value) }), "Updated derived columns")} />
      </Field>
      <Field label="Filters">
        <DraftTextArea value={listToText(selectedNode.schema.filters)} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeSchema(node, { filters: textToList(value) }), "Updated filters")} />
      </Field>
      <div className="field-grid two">
        <Field label="Join type">
          <select
            value={selectedNode.schema.joinType}
            onChange={(event) => updateNode(selectedNode.id, (node) => updateNodeSchema(node, { joinType: event.target.value as SchemaMetadata["joinType"] }), "Updated join type")}
          >
            <option value="">N/A</option>
            <option value="inner">inner</option>
            <option value="left">left</option>
            <option value="right">right</option>
            <option value="full">full</option>
            <option value="cross">cross</option>
          </select>
        </Field>
        <Field label="Join keys">
          <DraftTextArea value={joinKeysToText(selectedNode.schema.joinKeys)} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeSchema(node, { joinKeys: textToJoinKeys(value) }), "Updated join keys")} />
        </Field>
      </div>
      <Field label="Output columns">
        <DraftTextArea
          placeholder="account_id integer, revenue_amt decimal(12,2)"
          value={listToText(selectedNode.schema.outputColumns)}
          onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeSchema(node, { outputColumns: textToColumnList(value) }), "Updated output columns")}
        />
      </Field>
      <Field label="Data quality checks">
        <DraftTextArea
          value={selectedNode.schema.dataQualityChecks.map((a) => a.name).join("\n")}
          onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeSchema(node, {
            dataQualityChecks: value.split("\n").filter((l) => l.trim()).map((name, i) => ({
              id: `dq_${Date.now()}_${i}`, name: name.trim(), type: "custom" as const, column: "", expression: name.trim(), threshold: "", failureMode: "warn" as const, remediation: ""
            }))
          }), "Updated DQ checks")}
        />
      </Field>

      <div className="inspector-subhead">Review annotations</div>
      <Field label="Open questions">
        <DraftTextArea value={listToText(selectedNode.metadata.openQuestions)} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeMetadata(node, { openQuestions: textToList(value) }), "Updated questions")} />
      </Field>
      <Field label="Assumptions">
        <DraftTextArea value={listToText(selectedNode.metadata.assumptions)} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeMetadata(node, { assumptions: textToList(value) }), "Updated assumptions")} />
      </Field>
      <Field label="Risks">
        <DraftTextArea value={listToText(selectedNode.metadata.risks)} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeMetadata(node, { risks: textToList(value) }), "Updated risks")} />
      </Field>
      <Field label="Reviewer comments">
        <DraftTextArea value={listToText(selectedNode.metadata.reviewerComments)} onCommit={(value) => updateNode(selectedNode.id, (node) => updateNodeMetadata(node, { reviewerComments: textToList(value) }), "Updated comments")} />
      </Field>
      <Field label="Notes">
        <DraftTextArea value={selectedNode.notes} onCommit={(value) => updateNode(selectedNode.id, (node) => ({ ...node, notes: value }), "Updated notes")} />
      </Field>
    </aside>
  );
}
