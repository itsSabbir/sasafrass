import { useState } from "react";
import { DraftInput } from "../../components/DraftFields";
import { Icon } from "../../components/Icon";
import { createId } from "../../data";
import type { BusinessRule, CaseWhenRule, FlowNode, LookupRule, ThresholdRule } from "../../types";

interface BusinessRulesEditorProps {
  node: FlowNode;
  onUpdate: (nodeId: string, updater: (node: FlowNode) => FlowNode, label: string) => void;
}

export function BusinessRulesEditor({ node, onUpdate }: BusinessRulesEditorProps) {
  const [addingType, setAddingType] = useState<BusinessRule["type"] | null>(null);
  const rules = node.metadata.businessRules;

  function addRule(type: BusinessRule["type"]): void {
    const rule = createEmptyRule(type);
    onUpdate(node.id, (n) => ({ ...n, metadata: { ...n.metadata, businessRules: [...n.metadata.businessRules, rule] } }), "Added business rule");
    setAddingType(null);
  }

  function removeRule(index: number): void {
    onUpdate(node.id, (n) => ({
      ...n, metadata: { ...n.metadata, businessRules: n.metadata.businessRules.filter((_, i) => i !== index) }
    }), "Removed business rule");
  }

  function updateRule(index: number, updated: BusinessRule): void {
    onUpdate(node.id, (n) => ({
      ...n, metadata: { ...n.metadata, businessRules: n.metadata.businessRules.map((r, i) => i === index ? updated : r) }
    }), "Updated business rule");
  }

  return (
    <div className="business-rules-section">
      <div className="inspector-subhead">
        Business Rules
        <div className="rule-add-buttons">
          <button className="mini-button" title="Add CASE-WHEN rule" onClick={() => addRule("case-when")}>CASE</button>
          <button className="mini-button" title="Add Lookup rule" onClick={() => addRule("lookup")}>LKP</button>
          <button className="mini-button" title="Add Threshold rule" onClick={() => addRule("threshold")}>THR</button>
        </div>
      </div>
      {rules.length === 0 && <div className="empty-note">No business rules defined. Add CASE-WHEN, Lookup, or Threshold rules above.</div>}
      {rules.map((rule, i) => (
        <div key={i} className={`rule-card rule-${rule.type}`}>
          <div className="rule-header">
            <span className="rule-type-badge">{rule.type}</span>
            <button className="mini-button" title="Remove rule" onClick={() => removeRule(i)}><Icon name="trash" /></button>
          </div>
          {rule.type === "case-when" && <CaseWhenEditor rule={rule} onChange={(r) => updateRule(i, r)} />}
          {rule.type === "lookup" && <LookupEditor rule={rule} onChange={(r) => updateRule(i, r)} />}
          {rule.type === "threshold" && <ThresholdEditor rule={rule} onChange={(r) => updateRule(i, r)} />}
        </div>
      ))}
    </div>
  );
}

function CaseWhenEditor({ rule, onChange }: { rule: CaseWhenRule; onChange: (r: CaseWhenRule) => void }) {
  return (
    <div className="rule-body">
      <label>Column</label>
      <DraftInput value={rule.column} onCommit={(v) => onChange({ ...rule, column: v })} />
      <label>Conditions</label>
      {rule.conditions.map((cond, i) => (
        <div key={i} className="rule-condition-row">
          <DraftInput value={cond.when} onCommit={(v) => onChange({ ...rule, conditions: rule.conditions.map((c, j) => j === i ? { ...c, when: v } : c) })} />
          <span className="rule-arrow">→</span>
          <DraftInput value={cond.then} onCommit={(v) => onChange({ ...rule, conditions: rule.conditions.map((c, j) => j === i ? { ...c, then: v } : c) })} />
          <button className="mini-button" onClick={() => onChange({ ...rule, conditions: rule.conditions.filter((_, j) => j !== i) })}><Icon name="trash" /></button>
        </div>
      ))}
      <button className="mini-button" onClick={() => onChange({ ...rule, conditions: [...rule.conditions, { when: "", then: "" }] })}>+ condition</button>
      <label>Else</label>
      <DraftInput value={rule.elseValue} onCommit={(v) => onChange({ ...rule, elseValue: v })} />
    </div>
  );
}

function LookupEditor({ rule, onChange }: { rule: LookupRule; onChange: (r: LookupRule) => void }) {
  return (
    <div className="rule-body">
      <div className="field-grid two">
        <div><label>Source column</label><DraftInput value={rule.sourceColumn} onCommit={(v) => onChange({ ...rule, sourceColumn: v })} /></div>
        <div><label>Lookup table</label><DraftInput value={rule.lookupTable} onCommit={(v) => onChange({ ...rule, lookupTable: v })} /></div>
        <div><label>Lookup key</label><DraftInput value={rule.lookupKey} onCommit={(v) => onChange({ ...rule, lookupKey: v })} /></div>
        <div><label>Return column</label><DraftInput value={rule.returnColumn} onCommit={(v) => onChange({ ...rule, returnColumn: v })} /></div>
      </div>
    </div>
  );
}

function ThresholdEditor({ rule, onChange }: { rule: ThresholdRule; onChange: (r: ThresholdRule) => void }) {
  return (
    <div className="rule-body">
      <div className="field-grid two">
        <div><label>Column</label><DraftInput value={rule.column} onCommit={(v) => onChange({ ...rule, column: v })} /></div>
        <div>
          <label>Operator</label>
          <select value={rule.operator} onChange={(e) => onChange({ ...rule, operator: e.target.value as ThresholdRule["operator"] })}>
            <option value=">">&gt;</option>
            <option value="<">&lt;</option>
            <option value=">=">&gt;=</option>
            <option value="<=">&lt;=</option>
            <option value="=">=</option>
            <option value="!=">!=</option>
          </select>
        </div>
        <div><label>Value</label><DraftInput value={rule.value} onCommit={(v) => onChange({ ...rule, value: v })} /></div>
        <div><label>Action</label><DraftInput value={rule.action} onCommit={(v) => onChange({ ...rule, action: v })} /></div>
      </div>
    </div>
  );
}

function createEmptyRule(type: BusinessRule["type"]): BusinessRule {
  if (type === "case-when") return { type: "case-when", column: "", conditions: [{ when: "", then: "" }], elseValue: "" };
  if (type === "lookup") return { type: "lookup", sourceColumn: "", lookupTable: "", lookupKey: "", returnColumn: "" };
  return { type: "threshold", column: "", operator: ">", value: "", action: "" };
}
