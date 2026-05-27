export type EnvironmentId = string;

export type NodeType =
  | "source"
  | "job"
  | "transform"
  | "join"
  | "output"
  | "validation"
  | "note";

export type EdgeType = "dependency" | "data" | "validation";

export interface EnvironmentLane {
  id: EnvironmentId;
  name: string;
  color: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface DerivedColumn {
  name: string;
  expression: string;
  type?: string;
}

export interface JoinKey {
  left: string;
  right: string;
  cardinality: "1:1" | "1:M" | "M:1" | "M:M" | "";
  keyType: "PK" | "FK" | "BK" | "SK" | "none" | "";
}

export type DQCheckType = "not-null" | "unique" | "referential" | "range" | "row-count" | "custom";

export interface DQAssertion {
  id: string;
  name: string;
  type: DQCheckType;
  column: string;
  expression: string;
  threshold: string;
  failureMode: "block" | "warn" | "log";
  remediation: string;
}

export interface CaseWhenCondition {
  when: string;
  then: string;
}

export interface CaseWhenRule {
  type: "case-when";
  column: string;
  conditions: CaseWhenCondition[];
  elseValue: string;
}

export interface LookupRule {
  type: "lookup";
  sourceColumn: string;
  lookupTable: string;
  lookupKey: string;
  returnColumn: string;
}

export interface ThresholdRule {
  type: "threshold";
  column: string;
  operator: ">" | "<" | ">=" | "<=" | "=" | "!=";
  value: string;
  action: string;
}

export type BusinessRule = CaseWhenRule | LookupRule | ThresholdRule;

export interface ColumnLineage {
  outputColumn: string;
  sourceNodeId: string;
  sourceColumn: string;
  transform: string;
}

export interface ScheduleMetadata {
  frequency: "daily" | "weekly" | "monthly" | "on-demand" | "event-driven" | "";
  slaDeadline: string;
  parallelGroup: string;
  alertRecipients: string[];
  restartStrategy: "safe-rerun" | "truncate-reload" | "manual" | "";
  dependencyTimeout: string;
}

export interface SchemaMetadata {
  sourceName: string;
  selectedColumns: string[];
  derivedColumns: DerivedColumn[];
  filters: string[];
  joinType: "inner" | "left" | "right" | "full" | "cross" | "";
  joinKeys: JoinKey[];
  outputColumns: string[];
  dataQualityChecks: DQAssertion[];
  scdType: "none" | "1" | "2" | "3" | "";
  columnLineage: ColumnLineage[];
}

export interface NodeMetadata {
  jobName: string;
  flowGroup: string;
  owner: string;
  requiredInputs: string[];
  producedOutputs: string[];
  dependencyRules: string;
  runNotes: string;
  restartNotes: string;
  validations: string[];
  openQuestions: string[];
  assumptions: string[];
  risks: string[];
  reviewerComments: string[];
  businessRules: BusinessRule[];
}

export interface FlowNode {
  id: string;
  type: NodeType;
  title: string;
  environmentId: EnvironmentId;
  position: Point;
  metadata: NodeMetadata;
  schema: SchemaMetadata;
  schedule: ScheduleMetadata;
  notes: string;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  orderHint: number;
  condition: string;
  notes: string;
}

export interface Flow {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: Viewport;
}

export interface NodeTemplate {
  id: string;
  name: string;
  description: string;
  nodeType: NodeType;
  metadata?: Partial<NodeMetadata>;
  schema?: Partial<SchemaMetadata>;
}

export interface ProjectMetadata {
  businessArea: string;
  release: string;
  jiraKey: string;
}

export interface Project {
  version: 1 | 2;
  id: string;
  name: string;
  description: string;
  owner: string;
  environments: EnvironmentLane[];
  flows: Flow[];
  templates: NodeTemplate[];
  metadata: ProjectMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationIssue {
  id: string;
  severity: "error" | "warning" | "info";
  nodeId?: string;
  edgeId?: string;
  message: string;
}

export interface RunbookJob {
  order: number;
  nodeId: string;
  title: string;
  jobName: string;
  environment: string;
  flowGroup: string;
  owner: string;
  requiredInputs: string[];
  producedOutputs: string[];
  dependencies: string[];
  runNotes: string;
  restartNotes: string;
  validations: string[];
}

export interface Runbook {
  jobs: RunbookJob[];
  byEnvironment: Record<string, RunbookJob[]>;
  issues: ValidationIssue[];
}
