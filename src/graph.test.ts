import { describe, expect, it } from "vitest";
import { createDefaultProject, emptyMetadata, emptySchema } from "./data";
import { buildRunbook, topologicalSort, validateFlow } from "./graph";
import type { FlowNode } from "./types";

describe("graph planning", () => {
  it("orders jobs by dependencies and excludes source/note nodes from the runbook", () => {
    const project = createDefaultProject();
    const flow = project.flows[0];
    const runbook = buildRunbook(project, flow);

    expect(runbook.jobs.map((job) => job.jobName)).toEqual([
      "di_clean_orders",
      "di_join_account_lookup",
      "di_derive_customer_flags",
      "qa_customer_order_totals",
      "di_publish_customer_mart"
    ]);
  });

  it("detects dependency cycles", () => {
    const project = createDefaultProject();
    const flow = {
      ...project.flows[0],
      edges: [
        ...project.flows[0].edges,
        {
          id: "edge_cycle",
          source: "out_customer_mart",
          target: "job_clean_orders",
          type: "dependency" as const,
          orderHint: 99,
          condition: "",
          notes: ""
        }
      ]
    };

    expect(topologicalSort(flow).cycleNodeIds.length).toBeGreaterThan(0);
    expect(validateFlow(project, flow).some((issue) => issue.id === "cycle_detected")).toBe(true);
  });

  it("flags executable nodes with missing job names", () => {
    const project = createDefaultProject();
    const node: FlowNode = {
      id: "bad_job",
      type: "job",
      title: "Unnamed Job",
      environmentId: "staging",
      position: { x: 20, y: 20 },
      metadata: emptyMetadata(),
      schema: emptySchema(),
      notes: ""
    };
    const flow = { ...project.flows[0], nodes: [node], edges: [] };

    expect(validateFlow(project, flow).some((issue) => issue.id === "job_name_bad_job")).toBe(true);
  });
});
