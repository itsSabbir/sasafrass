import { DraftInput } from "../../components/DraftFields";
import { Field } from "../../components/Field";
import type { FlowNode, ScheduleMetadata } from "../../types";

interface SchedulingEditorProps {
  node: FlowNode;
  onUpdate: (nodeId: string, updater: (node: FlowNode) => FlowNode, label: string) => void;
}

export function SchedulingEditor({ node, onUpdate }: SchedulingEditorProps) {
  function updateSchedule(updates: Partial<ScheduleMetadata>): void {
    onUpdate(node.id, (n) => ({ ...n, schedule: { ...n.schedule, ...updates } }), "Updated schedule");
  }

  return (
    <>
      <div className="inspector-subhead">Scheduling</div>
      <div className="field-grid two">
        <Field label="Frequency">
          <select value={node.schedule.frequency} onChange={(e) => updateSchedule({ frequency: e.target.value as ScheduleMetadata["frequency"] })}>
            <option value="">Not set</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="on-demand">On-demand</option>
            <option value="event-driven">Event-driven</option>
          </select>
        </Field>
        <Field label="SLA deadline">
          <DraftInput value={node.schedule.slaDeadline} onCommit={(v) => updateSchedule({ slaDeadline: v })} />
        </Field>
        <Field label="Restart strategy">
          <select value={node.schedule.restartStrategy} onChange={(e) => updateSchedule({ restartStrategy: e.target.value as ScheduleMetadata["restartStrategy"] })}>
            <option value="">Not set</option>
            <option value="safe-rerun">Safe rerun</option>
            <option value="truncate-reload">Truncate + reload</option>
            <option value="manual">Manual</option>
          </select>
        </Field>
        <Field label="Parallel group">
          <DraftInput value={node.schedule.parallelGroup} onCommit={(v) => updateSchedule({ parallelGroup: v })} />
        </Field>
      </div>
    </>
  );
}
