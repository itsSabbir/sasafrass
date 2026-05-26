import { createId, emptyMetadata, emptySchema, emptySchedule } from "../data";
import { snap } from "./canvasGeometry";
import type { SasFileAnalysis, SasTableRef } from "../cleaner/types";
import type { FlowEdge, FlowNode, Project } from "../types";

interface ImportResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/** Convert parsed SAS file analyses into flow nodes and dependency edges. */
export function importSasFiles(analyses: SasFileAnalysis[], project: Project): ImportResult {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const tableToProducer = new Map<string, string>();
  const envIds = project.environments.map((e) => e.id);
  const stagingEnv = envIds[0] ?? "staging";
  const dwEnv = envIds[1] ?? envIds[0] ?? "staging";
  const analysisEnv = envIds[2] ?? envIds[1] ?? envIds[0] ?? "staging";
  let xOffset = 80;
  let sourceYOffset = 80;

  for (const analysis of analyses) {
    // Create source nodes for input tables not already produced in this batch
    for (const src of analysis.sourceTables) {
      if (!tableToProducer.has(src.fullName)) {
        const node = createSourceNode(src, stagingEnv, xOffset, sourceYOffset);
        nodes.push(node);
        tableToProducer.set(src.fullName, node.id);
        sourceYOffset += 200; // space each source node vertically
      }
    }

    // Create the job node
    const jobNode = createJobNode(analysis, dwEnv, xOffset + 400, 80);
    nodes.push(jobNode);

    // Wire edges from source nodes to this job
    for (const src of analysis.sourceTables) {
      const producerId = tableToProducer.get(src.fullName);
      if (producerId && producerId !== jobNode.id) {
        edges.push(createEdge(producerId, jobNode.id, edges.length + 1));
      }
    }

    // Register this job as producer of its target tables
    for (const tgt of analysis.targetTables) {
      tableToProducer.set(tgt.fullName, jobNode.id);
    }

    // Create output nodes for final targets (tables in analysis/DW layer)
    for (const tgt of analysis.targetTables) {
      if (isOutputTable(tgt)) {
        const outNode = createOutputNode(tgt, analysisEnv, xOffset + 800, 80);
        nodes.push(outNode);
        edges.push(createEdge(jobNode.id, outNode.id, edges.length + 1));
        tableToProducer.set(tgt.fullName, outNode.id);
      }
    }

    xOffset += 120;
  }

  return { nodes, edges };
}

function createSourceNode(ref: SasTableRef, envId: string, x: number, y: number): FlowNode {
  return {
    id: createId("node"),
    type: "source",
    title: ref.table,
    environmentId: envId,
    position: { x: snap(x), y: snap(y) },
    metadata: emptyMetadata({ producedOutputs: [ref.fullName] }),
    schema: emptySchema({ sourceName: ref.fullName }),
    schedule: emptySchedule(),
    notes: ""
  };
}

function createJobNode(analysis: SasFileAnalysis, envId: string, x: number, y: number): FlowNode {
  return {
    id: createId("node"),
    type: "job",
    title: analysis.jobName || "Imported Job",
    environmentId: envId,
    position: { x: snap(x), y: snap(y) },
    metadata: emptyMetadata({
      jobName: analysis.jobName,
      requiredInputs: analysis.sourceTables.map((t) => t.fullName),
      producedOutputs: analysis.targetTables.map((t) => t.fullName)
    }),
    schema: emptySchema(),
    schedule: emptySchedule(),
    notes: analysis.description
  };
}

function createOutputNode(ref: SasTableRef, envId: string, x: number, y: number): FlowNode {
  return {
    id: createId("node"),
    type: "output",
    title: ref.table,
    environmentId: envId,
    position: { x: snap(x), y: snap(y) },
    metadata: emptyMetadata({ producedOutputs: [ref.fullName] }),
    schema: emptySchema({ outputColumns: [] }),
    schedule: emptySchedule(),
    notes: ""
  };
}

function createEdge(sourceId: string, targetId: string, orderHint: number): FlowEdge {
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

/** Tables in DW/analysis layers are output artifacts; WORK tables are intermediate. */
function isOutputTable(ref: SasTableRef): boolean {
  const outputLibrefs = new Set(["skydev", "skytdana", "dw", "analysis", "mart", "pub"]);
  return outputLibrefs.has(ref.libref);
}
