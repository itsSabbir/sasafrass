import type { Point, Project, Viewport } from "../types";

export type Tool = "compactor" | "planner";
export type Mode = "canvas" | "design" | "runbook" | "review";
export type CanvasDetailMode = "handoff" | "architecture" | "review";

export interface ProjectSnapshot {
  id: string;
  label: string;
  createdAt: string;
  projectName: string;
  nodeCount: number;
  project: Project;
}

export interface HistoryState {
  past: Project[];
  future: Project[];
}

export interface DragState {
  nodeId: string;
  startClient: Point;
  startPosition: Point;
  snapshot: Project;
  moved: boolean;
}

export interface PanState {
  startClient: Point;
  startViewport: Viewport;
}

export interface CommandAction {
  id: string;
  label: string;
  action: () => void;
}
