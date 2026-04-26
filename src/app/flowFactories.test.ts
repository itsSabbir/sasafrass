import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../data";
import { createDependencyEdge, createEmptyFlow, createNodeFromTemplate, duplicateNode, pasteNode, templateForType } from "./flowFactories";

describe("flow factories", () => {
  it("creates nodes from palette templates with project context", () => {
    const project = createDefaultProject();
    const flow = project.flows[0];
    const node = createNodeFromTemplate({
      template: templateForType("job"),
      project,
      activeFlow: flow,
      position: { x: 34, y: 470 },
      snapToGrid: true
    });

    expect(node.type).toBe("job");
    expect(node.environmentId).toBe("jarvisdw");
    expect(node.position).toEqual({ x: 40, y: 516 });
    expect(node.metadata.flowGroup).toBe(flow.name);
  });

  it("clones nodes and creates dependency edges", () => {
    const project = createDefaultProject();
    const node = project.flows[0].nodes[0];

    expect(duplicateNode(node).title).toContain("copy");
    expect(pasteNode(node).title).toContain("pasted");
    expect(createDependencyEdge("a", "b", 7)).toMatchObject({ source: "a", target: "b", orderHint: 7 });
  });

  it("creates empty flows with stable defaults", () => {
    expect(createEmptyFlow(3)).toMatchObject({
      name: "Flow 3",
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 0.92 }
    });
  });
});
