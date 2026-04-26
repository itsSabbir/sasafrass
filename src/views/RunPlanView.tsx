import { Icon } from "../components/Icon";
import { IssuePanel } from "../components/IssuePanel";
import type { Flow, Project, Runbook } from "../types";

interface RunPlanViewProps {
  project: Project;
  flow: Flow;
  runbook: Runbook;
  exportRunbookMarkdown: () => void;
  exportRunbookCsv: () => void;
  exportDiagram: () => void;
  exportProjectJson: () => void;
}

export function RunPlanView(props: RunPlanViewProps) {
  const { runbook, exportRunbookMarkdown, exportRunbookCsv, exportDiagram, exportProjectJson } = props;

  return (
    <div className="view-scroll">
      <div className="view-header">
        <div>
          <h1>SAS Jobs</h1>
          <p>Generated job order for DevOps handoff, restart notes, dependencies, and validation checks.</p>
        </div>
        <div className="view-actions">
          <button className="text-button" onClick={exportRunbookMarkdown}>
            <Icon name="download" /> Markdown
          </button>
          <button className="text-button" onClick={exportRunbookCsv}>
            <Icon name="download" /> CSV
          </button>
          <button className="text-button" onClick={exportDiagram}>
            <Icon name="download" /> Diagram
          </button>
          <button className="text-button" onClick={exportProjectJson}>
            <Icon name="save" /> JSON
          </button>
        </div>
      </div>

      <IssuePanel issues={runbook.issues} />

      <div className="run-grid">
        {runbook.jobs.map((job) => (
          <article key={job.nodeId} className="run-card">
            <div className="run-order">{job.order}</div>
            <div className="run-main">
              <div className="run-title">{job.jobName}</div>
              <div className="run-meta">
                {job.environment} - {job.flowGroup || "No group"} - {job.owner || "Unassigned"}
              </div>
              <div className="run-tags">
                {job.dependencies.map((dependency) => (
                  <span key={dependency}>depends: {dependency}</span>
                ))}
                {job.requiredInputs.map((input) => (
                  <span key={input}>in: {input}</span>
                ))}
                {job.producedOutputs.map((output) => (
                  <span key={output}>out: {output}</span>
                ))}
              </div>
              <div className="run-notes">
                <strong>Run:</strong> {job.runNotes || "No special run notes."}
                <br />
                <strong>Restart:</strong> {job.restartNotes || "Not specified."}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
