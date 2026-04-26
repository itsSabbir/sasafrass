import { GRID_SIZE, NODE_HEIGHT } from "../data";
import { LANE_HEIGHT } from "./constants";
import type { Project } from "../types";

export function snap(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function laneBaseY(environmentId: string, project: Project): number {
  const index = Math.max(0, project.environments.findIndex((environment) => environment.id === environmentId));
  return index * LANE_HEIGHT;
}

export function environmentForY(project: Project, y: number): string {
  const index = Math.max(0, Math.min(project.environments.length - 1, Math.floor(y / LANE_HEIGHT)));
  return project.environments[index]?.id ?? project.environments[0]?.id ?? "staging";
}

export function clampNodeYToLane(environmentId: string, project: Project, y: number): number {
  const laneTop = laneBaseY(environmentId, project);
  const minY = laneTop + 56;
  const maxY = Math.max(minY, laneTop + LANE_HEIGHT - NODE_HEIGHT - 32);
  return Math.min(maxY, Math.max(minY, y));
}
