import { MAX_SNAPSHOTS } from "./constants";
import type { ProjectSnapshot, Tool } from "./appTypes";
import { ACTIVE_FLOW_KEY, SNAPSHOT_KEY, STORAGE_KEY, TOOL_KEY, createDefaultProject } from "../data";
import { parseProjectJson, serializeProject } from "../exporters";
import type { Project } from "../types";

export function loadInitialProject(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return parseProjectJson(raw);
    }
  } catch {
    // Fall back to the starter project when local storage is unavailable or corrupt.
  }
  return createDefaultProject();
}

export function persistProject(project: Project): void {
  localStorage.setItem(STORAGE_KEY, serializeProject(project));
}

export function loadSnapshots(): ProjectSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw) as ProjectSnapshot[];
  } catch {
    return [];
  }
}

export function saveSnapshots(snapshots: ProjectSnapshot[]): void {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots.slice(0, MAX_SNAPSHOTS)));
}

/** Pure: maps a stored raw value to a known tool, defaulting to the Code Compactor. */
export function parseStoredTool(raw: string | null): Tool {
  if (raw === "compactor" || raw === "planner") {
    return raw;
  }
  return "compactor";
}

export function loadInitialTool(): Tool {
  try {
    return parseStoredTool(localStorage.getItem(TOOL_KEY));
  } catch {
    // Fall back to the default tool when local storage is unavailable.
    return "compactor";
  }
}

export function persistTool(tool: Tool): void {
  localStorage.setItem(TOOL_KEY, tool);
}

/**
 * Pure: restore the stored active flow id if it still exists in the project, else the
 * first flow. The planner unmounts on tool switch, so the active flow must survive in
 * storage — otherwise an "Import to Flow" handoff would target the wrong flow.
 */
export function resolveActiveFlowId(storedId: string | null, flowIds: readonly string[]): string {
  if (storedId && flowIds.includes(storedId)) {
    return storedId;
  }
  return flowIds[0] ?? "";
}

export function loadActiveFlowId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_FLOW_KEY);
  } catch {
    // Local storage may be unavailable; fall back to the default flow selection.
    return null;
  }
}

export function persistActiveFlowId(flowId: string): void {
  localStorage.setItem(ACTIVE_FLOW_KEY, flowId);
}
