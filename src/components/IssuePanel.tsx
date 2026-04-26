import { Icon } from "./Icon";
import type { ValidationIssue } from "../types";

export function IssuePanel({ issues }: { issues: Pick<ValidationIssue, "id" | "severity" | "message">[] }) {
  if (issues.length === 0) {
    return (
      <div className="issue-panel clean">
        <Icon name="check" />
        No validation issues found for this view.
      </div>
    );
  }

  return (
    <div className="issue-panel">
      {issues.map((issue) => (
        <div key={issue.id} className={`issue ${issue.severity}`}>
          {issue.message}
        </div>
      ))}
    </div>
  );
}
