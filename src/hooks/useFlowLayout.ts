import type { RefObject } from "react";
import { clampNodeYToLane, laneBaseY, snap } from "../app/canvasGeometry";
import { LANE_HEIGHT } from "../app/constants";
import { NODE_HEIGHT, NODE_WIDTH } from "../data";
import { topologicalSort } from "../graph";
import type { Flow, Point, Project, Viewport } from "../types";

export interface FlowLayoutActions {
  fitView: () => void;
  alignToLanes: () => void;
}

interface UseFlowLayoutInput {
  project: Project;
  activeFlow: Flow | undefined;
  canvasRef: RefObject<HTMLDivElement | null>;
  setViewport: (updater: (viewport: Viewport) => Viewport) => void;
  updateActiveFlow: (updater: (flow: Flow, currentProject: Project) => Flow, label: string) => void;
}

export function useFlowLayout({ project, activeFlow, canvasRef, setViewport, updateActiveFlow }: UseFlowLayoutInput): FlowLayoutActions {
  function fitView(): void {
    if (!activeFlow || activeFlow.nodes.length === 0 || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const minX = Math.min(...activeFlow.nodes.map((n) => n.position.x));
    const maxX = Math.max(...activeFlow.nodes.map((n) => n.position.x + NODE_WIDTH));
    const minY = Math.min(...activeFlow.nodes.map((n) => n.position.y));
    const maxY = Math.max(...activeFlow.nodes.map((n) => n.position.y + NODE_HEIGHT));
    const zoom = Math.max(0.38, Math.min(1.1, Math.min((rect.width - 120) / (maxX - minX), (rect.height - 120) / (maxY - minY))));
    setViewport(() => ({ zoom, x: 60 - minX * zoom, y: 60 - minY * zoom }));
  }

  // function > 60 LOC because: layout algorithm is a single coherent flow (topo-sort → level assignment → column packing → position calculation → viewport fit) that would fragment into confusing pieces if split
  function alignToLanes(): void {
    updateActiveFlow(
      (flow, currentProject) => {
        const { ordered } = topologicalSort(flow);
        const orderedIds = new Set(ordered.map((n) => n.id));
        const layoutNodes = [...ordered, ...flow.nodes.filter((n) => !orderedIds.has(n.id))];
        const levels = new Map<string, number>();

        for (const node of layoutNodes) {
          const incomingLevels = flow.edges
            .filter((e) => e.target === node.id)
            .map((e) => levels.get(e.source))
            .filter((l): l is number => typeof l === "number");
          levels.set(node.id, incomingLevels.length ? Math.max(...incomingLevels) + 1 : 0);
        }

        const rowGap = 32;
        const maxRowsPerLane = Math.max(1, Math.floor((LANE_HEIGHT - 56 - 32 - NODE_HEIGHT) / (NODE_HEIGHT + rowGap)) + 1);
        const levelSlotCounts = new Map<string, number>();
        const levelColumnWidths = new Map<number, number>();

        for (const node of layoutNodes) {
          const level = levels.get(node.id) ?? 0;
          const key = `${node.environmentId}:${level}`;
          const nextCount = (levelSlotCounts.get(key) ?? 0) + 1;
          levelSlotCounts.set(key, nextCount);
          levelColumnWidths.set(level, Math.max(levelColumnWidths.get(level) ?? 1, Math.ceil(nextCount / maxRowsPerLane)));
        }

        const sortedLevels = [...new Set(layoutNodes.map((n) => levels.get(n.id) ?? 0))].sort((a, b) => a - b);
        const levelStartColumns = new Map<number, number>();
        let nextStartColumn = 0;
        for (const level of sortedLevels) {
          levelStartColumns.set(level, nextStartColumn);
          nextStartColumn += levelColumnWidths.get(level) ?? 1;
        }

        const laneLevelSlots = new Map<string, number>();
        const positions = new Map<string, Point>();
        for (const node of layoutNodes) {
          const level = levels.get(node.id) ?? 0;
          const slotKey = `${node.environmentId}:${level}`;
          const slot = laneLevelSlots.get(slotKey) ?? 0;
          laneLevelSlots.set(slotKey, slot + 1);
          const row = slot % maxRowsPerLane;
          const collisionColumn = Math.floor(slot / maxRowsPerLane);
          const column = (levelStartColumns.get(level) ?? level) + collisionColumn;
          positions.set(node.id, {
            x: snap(80 + column * (NODE_WIDTH + 88)),
            y: clampNodeYToLane(node.environmentId, currentProject, snap(laneBaseY(node.environmentId, currentProject) + 62 + row * (NODE_HEIGHT + rowGap)))
          });
        }

        const arrangedPositions = [...positions.values()];
        const rect = canvasRef.current?.getBoundingClientRect();
        const minX = arrangedPositions.length ? Math.min(...arrangedPositions.map((p) => p.x)) : 0;
        const maxX = arrangedPositions.length ? Math.max(...arrangedPositions.map((p) => p.x + NODE_WIDTH)) : 1000;
        const minY = arrangedPositions.length ? Math.min(...arrangedPositions.map((p) => p.y)) : 0;
        const maxY = arrangedPositions.length ? Math.max(...arrangedPositions.map((p) => p.y + NODE_HEIGHT)) : 800;
        const zoom = rect
          ? Math.max(0.5, Math.min(0.9, Math.min((rect.width - 140) / Math.max(1, maxX - minX), (rect.height - 110) / Math.max(1, maxY - minY))))
          : 0.68;

        return {
          ...flow,
          viewport: { x: 70 - minX * zoom, y: 48 - minY * zoom, zoom },
          nodes: flow.nodes.map((node) => ({ ...node, position: positions.get(node.id) ?? node.position }))
        };
      },
      "Arranged flow"
    );
  }

  return { fitView, alignToLanes };
}
