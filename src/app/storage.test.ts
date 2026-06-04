import { describe, expect, it } from "vitest";
import { parseStoredTool } from "./storage";

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
