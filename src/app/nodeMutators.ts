import type { FlowNode, NodeMetadata, SchemaMetadata } from "../types";

export function updateNodeMetadata(node: FlowNode, updates: Partial<NodeMetadata>): FlowNode {
  return { ...node, metadata: { ...node.metadata, ...updates } };
}

export function updateNodeSchema(node: FlowNode, updates: Partial<SchemaMetadata>): FlowNode {
  return { ...node, schema: { ...node.schema, ...updates } };
}
