import { Icon } from "../components/Icon";
import { IssuePanel } from "../components/IssuePanel";
import { nodeTypeLabels } from "../data";
import type { Flow, Project, ValidationIssue } from "../types";

interface DesignViewProps {
  project: Project;
  flow: Flow;
  issues: ValidationIssue[];
  exportDesignReview: () => void;
}

export function DesignView({ project, flow, issues, exportDesignReview }: DesignViewProps) {
  return (
    <div className="view-scroll">
      <div className="view-header">
        <div>
          <h1>Data Design</h1>
          <p>Parsed columns, joins, derivations, data quality checks, assumptions, and unresolved planning questions.</p>
        </div>
        <button className="text-button primary" onClick={exportDesignReview}>
          <Icon name="download" /> Export design review
        </button>
      </div>
      <IssuePanel issues={issues} />
      <div className="design-table-wrap">
        <table className="design-table">
          <thead>
            <tr>
              <th>Node</th>
              <th>Type</th>
              <th>Environment</th>
              <th>Inputs</th>
              <th>Join / derive</th>
              <th>Outputs</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {flow.nodes.map((node) => (
              <tr key={node.id}>
                <td>
                  <strong>{node.title}</strong>
                  <small>{node.metadata.jobName || node.schema.sourceName || "No job/source"}</small>
                </td>
                <td>{nodeTypeLabels[node.type]}</td>
                <td>{project.environments.find((env) => env.id === node.environmentId)?.name ?? node.environmentId}</td>
                <td>{[...node.metadata.requiredInputs, ...node.schema.selectedColumns].join(", ") || "-"}</td>
                <td>
                  {node.schema.joinKeys.map((key) => `${key.left} = ${key.right}`).join(", ") ||
                    node.schema.derivedColumns.map((column) => `${column.name} = ${column.expression}`).join(", ") ||
                    node.schema.filters.join(", ") ||
                    "-"}
                </td>
                <td>{[...node.metadata.producedOutputs, ...node.schema.outputColumns].join(", ") || "-"}</td>
                <td>{[...node.metadata.openQuestions, ...node.metadata.risks, ...node.schema.dataQualityChecks.map((a) => a.name)].join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
