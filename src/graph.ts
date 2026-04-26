import { executableNodeTypes } from "./data";
import type { Flow, FlowEdge, FlowNode, Project, Runbook, RunbookJob, ValidationIssue } from "./types";

function nodeLabel(node: FlowNode): string {
  return node.metadata.jobName || node.title;
}

function edgeDependsOn(edge: FlowEdge): boolean {
  return edge.type === "dependency" || edge.type === "data";
}

function sortNodes(nodes: FlowNode[]): FlowNode[] {
  return [...nodes].sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y || a.title.localeCompare(b.title));
}

export function getIncomingEdges(flow: Flow, nodeId: string): FlowEdge[] {
  return flow.edges.filter((edge) => edge.target === nodeId && edgeDependsOn(edge));
}

export function getOutgoingEdges(flow: Flow, nodeId: string): FlowEdge[] {
  return flow.edges.filter((edge) => edge.source === nodeId && edgeDependsOn(edge));
}

export function topologicalSort(flow: Flow): { ordered: FlowNode[]; cycleNodeIds: string[] } {
  const nodes = sortNodes(flow.nodes);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, FlowEdge[]>();

  for (const node of nodes) {
    incoming.set(node.id, 0);
    outgoing.set(node.id, []);
  }

  for (const edge of flow.edges.filter(edgeDependsOn)) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      continue;
    }
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.get(edge.source)?.push(edge);
  }

  const queue = nodes.filter((node) => incoming.get(node.id) === 0);
  const ordered: FlowNode[] = [];

  while (queue.length > 0) {
    queue.sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y || a.title.localeCompare(b.title));
    const node = queue.shift();
    if (!node) {
      break;
    }
    ordered.push(node);

    const edges = [...(outgoing.get(node.id) ?? [])].sort((a, b) => a.orderHint - b.orderHint);
    for (const edge of edges) {
      const nextCount = (incoming.get(edge.target) ?? 0) - 1;
      incoming.set(edge.target, nextCount);
      if (nextCount === 0) {
        const target = nodes.find((candidate) => candidate.id === edge.target);
        if (target) {
          queue.push(target);
        }
      }
    }
  }

  const orderedIds = new Set(ordered.map((node) => node.id));
  return {
    ordered,
    cycleNodeIds: nodes.filter((node) => !orderedIds.has(node.id)).map((node) => node.id)
  };
}

export function validateFlow(project: Project, flow: Flow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(flow.nodes.map((node) => node.id));
  const envIds = new Set(project.environments.map((env) => env.id));

  for (const edge of flow.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({
        id: `edge_missing_${edge.id}`,
        edgeId: edge.id,
        severity: "error",
        message: "Connector references a node that no longer exists."
      });
    }
  }

  for (const node of flow.nodes) {
    if (!envIds.has(node.environmentId)) {
      issues.push({
        id: `env_missing_${node.id}`,
        nodeId: node.id,
        severity: "error",
        message: `${node.title} is assigned to an unknown environment.`
      });
    }

    if (executableNodeTypes.has(node.type) && !node.metadata.jobName.trim()) {
      issues.push({
        id: `job_name_${node.id}`,
        nodeId: node.id,
        severity: "error",
        message: `${node.title} needs a DevOps job name.`
      });
    }

    if (executableNodeTypes.has(node.type) && !node.metadata.owner.trim() && !project.owner.trim()) {
      issues.push({
        id: `owner_${node.id}`,
        nodeId: node.id,
        severity: "warning",
        message: `${node.title} needs an owner before handoff.`
      });
    }

    if (node.type === "join" && node.schema.joinKeys.length === 0) {
      issues.push({
        id: `join_keys_${node.id}`,
        nodeId: node.id,
        severity: "warning",
        message: `${node.title} should list join keys for architecture review.`
      });
    }

    if (node.type === "source" && !node.schema.sourceName.trim()) {
      issues.push({
        id: `source_name_${node.id}`,
        nodeId: node.id,
        severity: "warning",
        message: `${node.title} should identify the source table or file.`
      });
    }

    if (node.type === "output" && node.metadata.producedOutputs.length === 0 && node.schema.outputColumns.length === 0) {
      issues.push({
        id: `output_contract_${node.id}`,
        nodeId: node.id,
        severity: "warning",
        message: `${node.title} should define its produced output or output schema.`
      });
    }

    if (executableNodeTypes.has(node.type)) {
      const incoming = getIncomingEdges(flow, node.id);
      const outgoing = getOutgoingEdges(flow, node.id);
      if (incoming.length === 0 && outgoing.length === 0 && flow.nodes.length > 1) {
        issues.push({
          id: `orphan_${node.id}`,
          nodeId: node.id,
          severity: "warning",
          message: `${node.title} is orphaned and will be ambiguous in the run plan.`
        });
      }
    }
  }

  const { cycleNodeIds } = topologicalSort(flow);
  if (cycleNodeIds.length > 0) {
    issues.push({
      id: "cycle_detected",
      severity: "error",
      message: `Cycle detected across ${cycleNodeIds.length} node${cycleNodeIds.length === 1 ? "" : "s"}. Break the dependency loop before handoff.`
    });
  }

  const rootExecutableNodes = flow.nodes.filter(
    (node) => executableNodeTypes.has(node.type) && getIncomingEdges(flow, node.id).length === 0
  );
  if (rootExecutableNodes.length > 1) {
    issues.push({
      id: "ambiguous_roots",
      severity: "warning",
      message: `${rootExecutableNodes.length} executable jobs have no upstream dependency. Confirm whether they can run in parallel.`
    });
  }

  return issues;
}

export function buildRunbook(project: Project, flow: Flow): Runbook {
  const issues = validateFlow(project, flow);
  const { ordered } = topologicalSort(flow);
  const environments = new Map(project.environments.map((env) => [env.id, env.name]));
  const jobs: RunbookJob[] = [];

  for (const node of ordered.filter((candidate) => executableNodeTypes.has(candidate.type))) {
    const dependencies = getIncomingEdges(flow, node.id)
      .map((edge) => flow.nodes.find((candidate) => candidate.id === edge.source))
      .filter((candidate): candidate is FlowNode => Boolean(candidate))
      .map(nodeLabel);

    jobs.push({
      order: jobs.length + 1,
      nodeId: node.id,
      title: node.title,
      jobName: node.metadata.jobName || node.title,
      environment: environments.get(node.environmentId) ?? node.environmentId,
      flowGroup: node.metadata.flowGroup,
      owner: node.metadata.owner || project.owner,
      requiredInputs: node.metadata.requiredInputs,
      producedOutputs: node.metadata.producedOutputs,
      dependencies,
      runNotes: node.metadata.runNotes,
      restartNotes: node.metadata.restartNotes,
      validations: node.metadata.validations
    });
  }

  const byEnvironment = jobs.reduce<Record<string, RunbookJob[]>>((groups, job) => {
    groups[job.environment] ??= [];
    groups[job.environment].push(job);
    return groups;
  }, {});

  return { jobs, byEnvironment, issues };
}

export function getNodeIssues(issues: ValidationIssue[], nodeId: string): ValidationIssue[] {
  return issues.filter((issue) => issue.nodeId === nodeId);
}

export function compareSchema(flow: Flow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const node of flow.nodes) {
    if (!executableNodeTypes.has(node.type)) {
      continue;
    }
    const producedByUpstream = new Set<string>();
    for (const edge of getIncomingEdges(flow, node.id)) {
      const source = flow.nodes.find((candidate) => candidate.id === edge.source);
      for (const output of source?.metadata.producedOutputs ?? []) {
        producedByUpstream.add(output);
      }
    }

    for (const requiredInput of node.metadata.requiredInputs) {
      if (producedByUpstream.size > 0 && !producedByUpstream.has(requiredInput)) {
        issues.push({
          id: `schema_${node.id}_${requiredInput}`,
          nodeId: node.id,
          severity: "info",
          message: `${node.title} requires ${requiredInput}, which is not listed as an upstream produced output.`
        });
      }
    }
  }

  return issues;
}
