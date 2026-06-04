import type {
  EnvironmentLane,
  Flow,
  FlowEdge,
  FlowNode,
  NodeMetadata,
  NodeTemplate,
  NodeType,
  Project,
  ScheduleMetadata,
  SchemaMetadata
} from "./types";

export const STORAGE_KEY = "sasafrass.project.v1";
export const SNAPSHOT_KEY = "sasafrass.snapshots.v1";
export const TOOL_KEY = "sasafrass.activeTool.v1";

export const NODE_WIDTH = 296;
export const NODE_HEIGHT = 168;
export const GRID_SIZE = 20;

export const nodeTypeLabels: Record<NodeType, string> = {
  source: "Source",
  job: "SAS Job",
  transform: "Transform",
  join: "Join",
  output: "Output",
  validation: "Checkpoint",
  note: "Note"
};

export const nodeTypeDescriptions: Record<NodeType, string> = {
  source: "Input table, file, or external feed",
  job: "Deployable SAS job or program",
  transform: "Derive, filter, sort, append, or summarize",
  join: "Join, lookup, merge, or enrichment point",
  output: "Published table, file, or mart artifact",
  validation: "Control total, QA check, or approval gate",
  note: "Open item, assumption, or review note"
};

export const executableNodeTypes = new Set<NodeType>([
  "job",
  "transform",
  "join",
  "output",
  "validation"
]);

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function emptyMetadata(overrides: Partial<NodeMetadata> = {}): NodeMetadata {
  return {
    jobName: "",
    flowGroup: "",
    owner: "",
    requiredInputs: [],
    producedOutputs: [],
    dependencyRules: "",
    runNotes: "",
    restartNotes: "",
    validations: [],
    openQuestions: [],
    assumptions: [],
    risks: [],
    reviewerComments: [],
    businessRules: [],
    ...overrides
  };
}

export function emptySchema(overrides: Partial<SchemaMetadata> = {}): SchemaMetadata {
  return {
    sourceName: "",
    selectedColumns: [],
    derivedColumns: [],
    filters: [],
    joinType: "",
    joinKeys: [],
    outputColumns: [],
    dataQualityChecks: [],
    scdType: "",
    columnLineage: [],
    ...overrides
  };
}

export function emptySchedule(overrides: Partial<ScheduleMetadata> = {}): ScheduleMetadata {
  return {
    frequency: "",
    slaDeadline: "",
    parallelGroup: "",
    alertRecipients: [],
    restartStrategy: "",
    dependencyTimeout: "",
    ...overrides
  };
}

export function defaultEnvironments(): EnvironmentLane[] {
  return [
    { id: "staging", name: "staging", color: "#2f6fed" },
    { id: "jarvisdw", name: "JarvisDW", color: "#00a676" },
    { id: "analysis", name: "analysis", color: "#c0579d" }
  ];
}

export function defaultTemplates(): NodeTemplate[] {
  return [
    {
      id: "tpl_import",
      name: "Import",
      description: "Bring a staged table or file into the flow",
      nodeType: "source",
      schema: { dataQualityChecks: [{ id: "dq_tpl_1", name: "Confirm source row count", type: "row-count", column: "", expression: "row count >= expected", threshold: "", failureMode: "warn", remediation: "" }] }
    },
    {
      id: "tpl_sort",
      name: "Sort",
      description: "Sort by business keys before joins or outputs",
      nodeType: "transform",
      metadata: { validations: ["Verify sort keys are populated"] }
    },
    {
      id: "tpl_join",
      name: "Join",
      description: "Join or lookup with explicit keys",
      nodeType: "join",
      schema: { joinType: "left", dataQualityChecks: [{ id: "dq_tpl_2", name: "Check unmatched rows", type: "referential", column: "", expression: "no unmatched join keys", threshold: "", failureMode: "warn", remediation: "" }] }
    },
    {
      id: "tpl_append",
      name: "Append",
      description: "Stack compatible datasets",
      nodeType: "transform",
      metadata: { dependencyRules: "All append inputs complete before run" }
    },
    {
      id: "tpl_summarize",
      name: "Summarize",
      description: "Aggregate data for mart or reporting output",
      nodeType: "transform",
      schema: { dataQualityChecks: [{ id: "dq_tpl_3", name: "Reconcile totals to source", type: "row-count", column: "", expression: "output total matches source total", threshold: "", failureMode: "warn", remediation: "" }] }
    },
    {
      id: "tpl_derive",
      name: "Derive",
      description: "Create derived columns and business flags",
      nodeType: "transform"
    },
    {
      id: "tpl_lookup",
      name: "Lookup",
      description: "Reference table enrichment",
      nodeType: "join",
      schema: { joinType: "left" }
    },
    {
      id: "tpl_export",
      name: "Export",
      description: "Publish final table, file, or mart object",
      nodeType: "output",
      metadata: { validations: ["Confirm output is available to downstream users"] }
    }
  ];
}

function sampleNode(node: Partial<FlowNode> & Pick<FlowNode, "id" | "type" | "title">): FlowNode {
  const environmentId = node.environmentId ?? "staging";
  return {
    id: node.id,
    type: node.type,
    title: node.title,
    environmentId,
    position: node.position ?? { x: 80, y: 90 },
    metadata: emptyMetadata({
      jobName: node.type === "source" || node.type === "note" ? "" : node.title.replaceAll(" ", "_").toLowerCase(),
      flowGroup: "Customer build",
      owner: "SAS Dev",
      ...node.metadata
    }),
    schema: emptySchema(node.schema),
    schedule: emptySchedule(),
    notes: node.notes ?? ""
  };
}

function sampleEdge(source: string, target: string, orderHint: number): FlowEdge {
  return {
    id: `edge_${source}_${target}`,
    source,
    target,
    type: "dependency",
    orderHint,
    condition: "",
    notes: ""
  };
}

export function createDefaultProject(): Project {
  const createdAt = nowIso();
  const nodes: FlowNode[] = [
    sampleNode({
      id: "src_orders",
      type: "source",
      title: "Stage ORDERS",
      environmentId: "staging",
      position: { x: 80, y: 70 },
      metadata: emptyMetadata({ producedOutputs: ["stg.orders"] }),
      schema: emptySchema({
        sourceName: "stg.orders",
        selectedColumns: ["account_id", "order_id", "order_dt", "revenue_amt"],
        outputColumns: ["account_id", "order_id", "order_dt", "revenue_amt"]
      })
    }),
    sampleNode({
      id: "src_accounts",
      type: "source",
      title: "Stage ACCOUNTS",
      environmentId: "staging",
      position: { x: 80, y: 250 },
      metadata: emptyMetadata({ producedOutputs: ["stg.accounts"] }),
      schema: emptySchema({
        sourceName: "stg.accounts",
        selectedColumns: ["account_id", "segment_cd", "status_cd"],
        outputColumns: ["account_id", "segment_cd", "status_cd"]
      })
    }),
    sampleNode({
      id: "job_clean_orders",
      type: "transform",
      title: "Clean Orders",
      environmentId: "staging",
      position: { x: 460, y: 70 },
      metadata: emptyMetadata({
        jobName: "di_clean_orders",
        flowGroup: "Customer build",
        requiredInputs: ["stg.orders"],
        producedOutputs: ["wrk.orders_clean"],
        validations: ["Reject rows with missing account_id"]
      }),
      schema: emptySchema({
        filters: ["order_dt >= release start date"],
        outputColumns: ["account_id", "order_id", "order_dt", "revenue_amt"]
      })
    }),
    sampleNode({
      id: "job_account_lookup",
      type: "join",
      title: "Join Account Lookup",
      environmentId: "jarvisdw",
      position: { x: 840, y: 576 },
      metadata: emptyMetadata({
        jobName: "di_join_account_lookup",
        flowGroup: "Customer build",
        requiredInputs: ["wrk.orders_clean", "stg.accounts"],
        producedOutputs: ["dw.customer_orders_base"],
        validations: ["Check unmatched account_id count"]
      }),
      schema: emptySchema({
        joinType: "left",
        joinKeys: [{ left: "orders_clean.account_id", right: "accounts.account_id", cardinality: "M:1", keyType: "FK" }],
        selectedColumns: ["account_id", "order_id", "order_dt", "revenue_amt", "segment_cd"],
        outputColumns: ["account_id", "order_id", "order_dt", "revenue_amt", "segment_cd"]
      })
    }),
    sampleNode({
      id: "job_derive_flags",
      type: "transform",
      title: "Derive Flags",
      environmentId: "analysis",
      position: { x: 1220, y: 1000 },
      metadata: emptyMetadata({
        jobName: "di_derive_customer_flags",
        flowGroup: "Customer build",
        requiredInputs: ["dw.customer_orders_base"],
        producedOutputs: ["ana.customer_order_flags"],
        validations: ["Reconcile account counts by segment"]
      }),
      schema: emptySchema({
        derivedColumns: [
          { name: "is_active", expression: "status_cd = 'A'" },
          { name: "high_value", expression: "revenue_amt >= 1000" }
        ],
        outputColumns: ["account_id", "order_id", "segment_cd", "is_active", "high_value"]
      })
    }),
    sampleNode({
      id: "chk_control_totals",
      type: "validation",
      title: "Control Totals",
      environmentId: "analysis",
      position: { x: 1580, y: 1000 },
      metadata: emptyMetadata({
        jobName: "qa_customer_order_totals",
        flowGroup: "Customer build",
        requiredInputs: ["ana.customer_order_flags"],
        producedOutputs: ["qa.customer_order_totals"],
        validations: ["Compare row count and revenue totals to source extract"]
      })
    }),
    sampleNode({
      id: "out_customer_mart",
      type: "output",
      title: "Publish Customer Mart",
      environmentId: "analysis",
      position: { x: 1940, y: 1000 },
      metadata: emptyMetadata({
        jobName: "di_publish_customer_mart",
        flowGroup: "Customer build",
        requiredInputs: ["qa.customer_order_totals"],
        producedOutputs: ["mart.customer_orders"],
        restartNotes: "Safe to rerun after truncating current release partition",
        validations: ["Confirm mart.customer_orders is visible to reporting users"]
      }),
      schema: emptySchema({
        outputColumns: ["account_id", "order_id", "segment_cd", "is_active", "high_value"]
      })
    }),
    sampleNode({
      id: "note_release",
      type: "note",
      title: "Release Question",
      environmentId: "analysis",
      position: { x: 1220, y: 1188 },
      metadata: emptyMetadata({
        openQuestions: ["Confirm exact release partition naming with DevOps"]
      }),
      notes: "Capture unresolved handoff details here before exporting the runbook."
    })
  ];

  const flow: Flow = {
    id: "flow_customer_build",
    name: "Customer Orders Build",
    description: "Example SASDIS-style planning flow for DevOps handoff and architecture review.",
    nodes,
    edges: [
      sampleEdge("src_orders", "job_clean_orders", 1),
      sampleEdge("job_clean_orders", "job_account_lookup", 2),
      sampleEdge("src_accounts", "job_account_lookup", 3),
      sampleEdge("job_account_lookup", "job_derive_flags", 4),
      sampleEdge("job_derive_flags", "chk_control_totals", 5),
      sampleEdge("chk_control_totals", "out_customer_mart", 6)
    ],
    viewport: { x: 20, y: 0, zoom: 0.74 }
  };

  return {
    version: 2,
    id: "project_default",
    name: "SASDIS Flow Planner",
    description: "Local-first planning workspace for SAS job flows and DevOps handoffs.",
    owner: "Bell SAS Team",
    environments: defaultEnvironments(),
    flows: [flow],
    templates: defaultTemplates(),
    metadata: {
      businessArea: "SASDIS",
      release: "Draft",
      jiraKey: ""
    },
    createdAt,
    updatedAt: createdAt
  };
}
