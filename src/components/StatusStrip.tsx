import { Icon } from "./Icon";
import type { Flow, Runbook } from "../types";

interface StatusStripProps {
  issueCounts: {
    error: number;
    warning: number;
    info: number;
  };
  runbook: Runbook;
  activeFlow: Flow;
}

export function StatusStrip({ issueCounts, runbook, activeFlow }: StatusStripProps) {
  return (
    <div className="status-strip">
      <div className={issueCounts.error > 0 ? "health-pill error" : "health-pill ok"}>
        {issueCounts.error > 0 ? <Icon name="warning" /> : <Icon name="check" />}
        {issueCounts.error} errors
      </div>
      <div className="health-pill warning">
        <Icon name="warning" />
        {issueCounts.warning} warnings
      </div>
      <div className="health-pill info">{runbook.jobs.length} runnable jobs</div>
      <div className="health-pill info">{activeFlow.nodes.length} planning nodes</div>
      <div className="status-spacer" />
      <div className="status-text">Autosaved locally - JSON remains the portable source of truth</div>
    </div>
  );
}
