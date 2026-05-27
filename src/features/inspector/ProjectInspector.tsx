import { DraftInput, DraftTextArea } from "../../components/DraftFields";
import { Field } from "../../components/Field";
import { Icon } from "../../components/Icon";
import type { Flow, Project } from "../../types";

interface ProjectInspectorProps {
  project: Project;
  activeFlow: Flow;
  commitProject: (updater: (current: Project) => Project, label: string) => void;
  updateProject: (updates: Partial<Project>) => void;
  updateFlow: (updates: Partial<Flow>) => void;
  updateEnvironment: (environmentId: string, updates: { name?: string; color?: string }) => void;
  addEnvironment: () => void;
}

export function ProjectInspector(props: ProjectInspectorProps) {
  const { project, activeFlow, commitProject, updateProject, updateFlow, updateEnvironment, addEnvironment } = props;

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
