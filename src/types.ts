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
}

export interface SchemaMetadata {
  sourceName: string;
  selectedColumns: string[];
  derivedColumns: DerivedColumn[];
  filters: string[];
  joinType: "inner" | "left" | "right" | "full" | "cross" | "";
  joinKeys: JoinKey[];
  outputColumns: string[];
  dataQualityChecks: string[];
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
}

export interface FlowNode {
  id: string;
  type: NodeType;
  title: string;
  environmentId: EnvironmentId;
  position: Point;
  metadata: NodeMetadata;
  schema: SchemaMetadata;
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
  version: 1;
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
