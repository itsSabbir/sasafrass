import { describe, expect, it } from "vitest";
import { createDefaultProject } from "./data";
import { buildRunbook } from "./graph";
import { generateDesignReview, generateDiagramSvg, generateRunbookCsv, generateRunbookMarkdown, parseProjectJson, serializeProject } from "./exporters";

describe("exporters", () => {
  it("round trips project JSON", () => {
    const project = createDefaultProject();
    expect(parseProjectJson(serializeProject(project)).name).toBe(project.name);
  });

  it("generates Markdown and CSV handoff artifacts", () => {
    const project = createDefaultProject();
    const flow = project.flows[0];
    const runbook = buildRunbook(project, flow);

    expect(generateRunbookMarkdown(project, flow, runbook)).toContain("DevOps Runbook");
    expect(generateRunbookCsv(project, flow, runbook)).toContain("di_clean_orders");
  });

  it("generates a design review artifact", () => {
    const project = createDefaultProject();
    const flow = {
      ...project.flows[0],
      nodes: project.flows[0].nodes.map((node) => (node.id === "note_release" ? { ...node, notes: "Confirm release label" } : node))
    };
    const review = generateDesignReview(project, flow);

    expect(review).toContain("Architecture Nodes");
    expect(review).toContain("Canvas notes: Confirm release label");
  });

  it("generates an SVG diagram with escaped canvas notes", () => {
    const project = createDefaultProject();
    const flow = {
      ...project.flows[0],
      nodes: project.flows[0].nodes.map((node) => (node.id === "note_release" ? { ...node, notes: "Check <release> & owner" } : node))
    };

    expect(generateDiagramSvg(project, flow)).toContain("Check &lt;release&gt; &amp; owner");
  });
});
