import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../data";
import { propagateDependencyInputs, removeDependencyAndPropagatedInputs } from "./flowConnections";

describe("flow connection metadata", () => {
  it("propagates produced artifacts into target inputs when nodes connect", () => {
    const project = createDefaultProject();
    const flow = {
      ...project.flows[0],
      edges: project.flows[0].edges.filter((edge) => edge.id !== "edge_src_orders_job_clean_orders"),
      nodes: project.flows[0].nodes.map((node) =>
        node.id === "job_clean_orders" ? { ...node, metadata: { ...node.metadata, requiredInputs: [] } } : node
      )
    };

    const next = propagateDependencyInputs(flow, "src_orders", "job_clean_orders");

    expect(next.nodes.find((node) => node.id === "job_clean_orders")?.metadata.requiredInputs).toContain("stg.orders");
  });

  it("removes disconnected artifacts unless another upstream still provides them", () => {
    const project = createDefaultProject();
    const baseFlow = propagateDependencyInputs(project.flows[0], "src_orders", "job_clean_orders");
    const next = removeDependencyAndPropagatedInputs(baseFlow, "edge_src_orders_job_clean_orders");

    expect(next.edges.some((edge) => edge.id === "edge_src_orders_job_clean_orders")).toBe(false);
    expect(next.nodes.find((node) => node.id === "job_clean_orders")?.metadata.requiredInputs).not.toContain("stg.orders");
  });
});
