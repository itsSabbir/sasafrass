import type { Flow, FlowNode } from "../types";

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function producedArtifacts(node: FlowNode): string[] {
  const sourceArtifact = node.type === "source" ? node.schema.sourceName : "";
  return unique([...node.metadata.producedOutputs, sourceArtifact]);
}

export function propagateDependencyInputs(flow: Flow, sourceId: string, targetId: string): Flow {
  const source = flow.nodes.find((node) => node.id === sourceId);
  const artifacts = source ? producedArtifacts(source) : [];
  if (artifacts.length === 0) {
    return flow;
  }

  return {
    ...flow,
    nodes: flow.nodes.map((node) =>
      node.id === targetId
        ? {
            ...node,
            metadata: {
              ...node.metadata,
              requiredInputs: unique([...node.metadata.requiredInputs, ...artifacts])
            }
          }
        : node
    )
  };
}

export function removeDependencyAndPropagatedInputs(flow: Flow, edgeId: string): Flow {
  const removedEdge = flow.edges.find((edge) => edge.id === edgeId);
  if (!removedEdge) {
    return flow;
  }

  const removedSource = flow.nodes.find((node) => node.id === removedEdge.source);
  const removedArtifacts = new Set(removedSource ? producedArtifacts(removedSource) : []);
  const remainingEdges = flow.edges.filter((edge) => edge.id !== edgeId);

  if (removedArtifacts.size === 0) {
    return { ...flow, edges: remainingEdges };
  }

  const stillProvided = new Set<string>();
  for (const edge of remainingEdges.filter((edge) => edge.target === removedEdge.target)) {
    const upstream = flow.nodes.find((node) => node.id === edge.source);
    for (const artifact of upstream ? producedArtifacts(upstream) : []) {
      stillProvided.add(artifact);
    }
  }

  return {
    ...flow,
    edges: remainingEdges,
    nodes: flow.nodes.map((node) =>
      node.id === removedEdge.target
        ? {
            ...node,
            metadata: {
              ...node.metadata,
              requiredInputs: node.metadata.requiredInputs.filter((input) => !removedArtifacts.has(input) || stillProvided.has(input))
            }
          }
        : node
    )
  };
}
