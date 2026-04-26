import { describe, expect, it } from "vitest";
import { createDefaultProject } from "../data";
import { clampNodeYToLane, environmentForY, laneBaseY, snap } from "./canvasGeometry";

describe("canvas geometry", () => {
  it("snaps positions to the grid", () => {
    expect(snap(29)).toBe(20);
    expect(snap(31)).toBe(40);
  });

  it("maps y coordinates to environment lanes", () => {
    const project = createDefaultProject();
    expect(laneBaseY("jarvisdw", project)).toBe(460);
    expect(environmentForY(project, 940)).toBe("analysis");
  });

  it("keeps node tops inside their environment lanes", () => {
    const project = createDefaultProject();
    expect(clampNodeYToLane("staging", project, -20)).toBe(56);
    expect(clampNodeYToLane("staging", project, 420)).toBe(260);
    expect(clampNodeYToLane("analysis", project, 2000)).toBe(1180);
  });
});
