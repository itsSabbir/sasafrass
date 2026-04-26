import { Icon } from "../components/Icon";
import { IssuePanel } from "../components/IssuePanel";
import type { Flow, Project, Runbook, ValidationIssue } from "../types";

interface ReviewerViewProps {
  project: Project;
  flow: Flow;
  runbook: Runbook;
  issues: ValidationIssue[];
  exportBundle: () => void;
}

export function ReviewerView({ project, flow, runbook, issues, exportBundle }: ReviewerViewProps) {
  return (
    <div className="reviewer">
      <div className="reviewer-hero">
        <div>
          <h1>{project.name}</h1>
          <p>
            {flow.name} - {runbook.jobs.length} runnable jobs across {Object.keys(runbook.byEnvironment).length} environments
          </p>
        </div>
        <button className="text-button primary" onClick={exportBundle}>
          <Icon name="download" /> Export handoff bundle
        </button>
      </div>
      <IssuePanel issues={issues} />
      <div className="review-columns">
        <section>
          <h2>SAS job order</h2>
          {runbook.jobs.map((job) => (
            <div key={job.nodeId} className="review-step">
              <span>{job.order}</span>
              <div>
                <strong>{job.jobName}</strong>
                <small>
                  {job.environment} - depends on {job.dependencies.join(", ") || "start"}
                </small>
              </div>
            </div>
          ))}
        </section>
        <section>
          <h2>Open Items</h2>
          {flow.nodes
            .filter((node) => node.metadata.openQuestions.length || node.metadata.risks.length || node.metadata.reviewerComments.length)
            .map((node) => (
              <div key={node.id} className="open-item">
                <strong>{node.title}</strong>
                {[...node.metadata.openQuestions, ...node.metadata.risks, ...node.metadata.reviewerComments].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            ))}
        </section>
      </div>
    </div>
  );
}
