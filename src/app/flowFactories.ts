import { clampNodeYToLane, environmentForY, laneBaseY, snap } from "./canvasGeometry";
import { createId, emptyMetadata, emptySchema, executableNodeTypes, nodeTypeDescriptions, nodeTypeLabels } from "../data";
import type { Flow, FlowEdge, FlowNode, NodeTemplate, NodeType, Point, Project } from "../types";

export function templateForType(type: NodeType): NodeTemplate {
  return {
    id: createId("template"),
    name: nodeTypeLabels[type],
    description: nodeTypeDescriptions[type],
    nodeType: type
  };
}

export function createNodeFromTemplate(args: {
  template: NodeTemplate;
  project: Project;
  activeFlow: Flow;
  position?: Point;
  snapToGrid: boolean;
}): FlowNode {
  const { template, project, activeFlow, position, snapToGrid } = args;
  const dropPosition = position ?? {
    x: 120 + activeFlow.nodes.length * 24,
    y: laneBaseY(project.environments[0]?.id ?? "staging", project) + 72
  };
  const environmentId = environmentForY(project, dropPosition.y);
  const snappedY = snapToGrid ? snap(dropPosition.y) : dropPosition.y;

  return {
    id: createId("node"),
    type: template.nodeType,
    title: template.name,
    environmentId,
    position: {
      x: snapToGrid ? snap(dropPosition.x) : dropPosition.x,
      y: clampNodeYToLane(environmentId, project, snappedY)
    },
    metadata: emptyMetadata({
      jobName: executableNodeTypes.has(template.nodeType) ? template.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") : "",
      flowGroup: activeFlow.name,
      owner: project.owner,
      ...template.metadata
    }),
    schema: emptySchema(template.schema),
    notes: ""
  };
}

export function duplicateNode(node: FlowNode): FlowNode {
  return {
    ...node,
    id: createId("node"),
    title: `${node.title} copy`,
    position: { x: node.position.x + 40, y: node.position.y + 40 }
  };
}

export function pasteNode(node: FlowNode): FlowNode {
  return {
    ...node,
    id: createId("node"),
    title: `${node.title} pasted`,
    position: { x: node.position.x + 60, y: node.position.y + 60 }
  };
}

export function createDependencyEdge(sourceId: string, targetId: string, orderHint: number): FlowEdge {
  return {
    id: createId("edge"),
    source: sourceId,
    target: targetId,
    type: "dependency",
    orderHint,
    condition: "",
    notes: ""
  };
}

export function createEmptyFlow(index: number): Flow {
  return {
    id: createId("flow"),
    name: `Flow ${index}`,
    description: "",
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 0.92 }
  };
}
