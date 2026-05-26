import { useState } from "react";
import { Icon } from "./Icon";
import type { Flow, Runbook, ValidationIssue } from "../types";

interface StatusStripProps {
  issueCounts: { error: number; warning: number; info: number };
  runbook: Runbook;
  activeFlow: Flow;
  allIssues: ValidationIssue[];
  onSelectNode: (nodeId: string) => void;
}

export function StatusStrip({ issueCounts, runbook, activeFlow, allIssues, onSelectNode }: StatusStripProps) {
  const [expandedSeverity, setExpandedSeverity] = useState<string | null>(null);

  function toggleSeverity(severity: string): void {
    setExpandedSeverity((prev) => (prev === severity ? null : severity));
  }

  const filteredIssues = expandedSeverity ? allIssues.filter((i) => i.severity === expandedSeverity) : [];

  return (
    <div className="status-strip-wrap">
      <div className="status-strip">
        <button
          className={issueCounts.error > 0 ? "health-pill error clickable" : "health-pill ok"}
          onClick={() => issueCounts.error > 0 && toggleSeverity("error")}
        >
          {issueCounts.error > 0 ? <Icon name="warning" /> : <Icon name="check" />}
          {issueCounts.error} errors
        </button>
        <button
          className={issueCounts.warning > 0 ? "health-pill warning clickable" : "health-pill ok"}
          onClick={() => issueCounts.warning > 0 && toggleSeverity("warning")}
        >
          {issueCounts.warning > 0 ? <Icon name="warning" /> : <Icon name="check" />}
          {issueCounts.warning} warnings
        </button>
        <div className="health-pill info">{runbook.jobs.length} runnable jobs</div>
        <div className="health-pill info">{activeFlow.nodes.length} planning nodes</div>
        <div className="status-spacer" />
        <div className="status-text">Autosaved locally - JSON remains the portable source of truth</div>
      </div>
      {expandedSeverity && filteredIssues.length > 0 && (
        <div className="status-issue-list">
          {filteredIssues.map((issue) => (
            <button key={issue.id} className={`status-issue ${issue.severity}`} onClick={() => { if (issue.nodeId) onSelectNode(issue.nodeId); }}>
              <span className="status-issue-msg">{issue.message}</span>
              {issue.nodeId && <span className="status-issue-node">→ go to node</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
