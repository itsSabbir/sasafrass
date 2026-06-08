import { describe, expect, it } from "vitest";
import { parseStoredTool, resolveActiveFlowId } from "./storage";

describe("parseStoredTool", () => {
  it("defaults to the Code Compactor when nothing is stored", () => {
    expect(parseStoredTool(null)).toBe("compactor");
  });

  it("defaults to the Code Compactor for unknown or garbage values", () => {
    expect(parseStoredTool("")).toBe("compactor");
    expect(parseStoredTool("import")).toBe("compactor");
    expect(parseStoredTool("{}")).toBe("compactor");
  });

  it("round-trips known tool values", () => {
    expect(parseStoredTool("compactor")).toBe("compactor");
    expect(parseStoredTool("planner")).toBe("planner");
  });
});

describe("resolveActiveFlowId", () => {
  it("restores the stored flow id when it still exists in the project", () => {
    expect(resolveActiveFlowId("flow_2", ["flow_1", "flow_2"])).toBe("flow_2");
  });

  it("falls back to the first flow when the stored id is absent or stale", () => {
    expect(resolveActiveFlowId(null, ["flow_1", "flow_2"])).toBe("flow_1");
    expect(resolveActiveFlowId("deleted_flow", ["flow_1", "flow_2"])).toBe("flow_1");
  });

  it("returns an empty string when the project has no flows", () => {
    expect(resolveActiveFlowId("flow_1", [])).toBe("");
  });
});
