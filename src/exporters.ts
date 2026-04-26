import { NODE_HEIGHT, NODE_WIDTH, nodeTypeLabels } from "./data";
import { buildRunbook, compareSchema } from "./graph";
import type { Flow, FlowNode, Project, Runbook } from "./types";

function escapeCsv(value: string): string {
  const normalized = value.replace(/\r?\n/g, " ").trim();
  if (/[",]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }
  return normalized;
}

function list(values: string[]): string {
  return values.filter(Boolean).join("; ");
}

function compactText(value: string, maxLength: number): string {
  const normalized = value.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}...`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function safeSvgColor(value: string | undefined): string {
  return value && /^#[0-9a-f]{3,8}$/i.test(value) ? value : "#5d6c83";
}

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function parseProjectJson(raw: string): Project {
  const parsed = JSON.parse(raw) as Project;
  if (parsed.version !== 1 || !Array.isArray(parsed.flows) || !Array.isArray(parsed.environments)) {
    throw new Error("This does not look like a SASDIS Flow Planner project file.");
  }
  return parsed;
}

export function generateRunbookMarkdown(project: Project, flow: Flow, runbook: Runbook = buildRunbook(project, flow)): string {
  const errors = runbook.issues.filter((issue) => issue.severity === "error");
  const warnings = runbook.issues.filter((issue) => issue.severity === "warning");

  const lines = [
    `# ${project.name} - DevOps Runbook`,
    "",
    `Flow: ${flow.name}`,
    `Owner: ${project.owner || "Unassigned"}`,
    `Release: ${project.metadata.release || "Draft"}`,
    project.metadata.jiraKey ? `Jira: ${project.metadata.jiraKey}` : "",
    "",
    "## Execution Order",
    "",
    "| Order | Environment | Job | Flow/Group | Depends On | Inputs | Outputs |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  ].filter((line) => line !== "");

  for (const job of runbook.jobs) {
    lines.push(
      `| ${job.order} | ${job.environment} | ${job.jobName} | ${job.flowGroup || "-"} | ${list(job.dependencies) || "-"} | ${list(job.requiredInputs) || "-"} | ${list(job.producedOutputs) || "-"} |`
    );
  }

  lines.push("", "## Run Notes", "");
  for (const job of runbook.jobs) {
    lines.push(`### ${job.order}. ${job.jobName}`);
    lines.push(`- Environment: ${job.environment}`);
    lines.push(`- Owner: ${job.owner || "Unassigned"}`);
    lines.push(`- Run notes: ${job.runNotes || "-"}`);
    lines.push(`- Restart notes: ${job.restartNotes || "-"}`);
    lines.push(`- Validations: ${list(job.validations) || "-"}`);
    lines.push("");
  }

  if (errors.length || warnings.length) {
    lines.push("## Handoff Warnings", "");
    for (const issue of [...errors, ...warnings]) {
      lines.push(`- ${issue.severity.toUpperCase()}: ${issue.message}`);
    }
    lines.push("");
  }

  lines.push("## Environment Groups", "");
  for (const [environment, jobs] of Object.entries(runbook.byEnvironment)) {
    lines.push(`### ${environment}`);
    for (const job of jobs) {
      lines.push(`- ${job.order}. ${job.jobName}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function generateRunbookCsv(project: Project, flow: Flow, runbook: Runbook = buildRunbook(project, flow)): string {
  void project;
  void flow;
  const header = [
    "order",
    "environment",
    "job_name",
    "title",
    "flow_group",
    "owner",
    "depends_on",
    "required_inputs",
    "produced_outputs",
    "run_notes",
    "restart_notes",
    "validations"
  ];

  const rows = runbook.jobs.map((job) =>
    [
      String(job.order),
      job.environment,
      job.jobName,
      job.title,
      job.flowGroup,
      job.owner,
      list(job.dependencies),
      list(job.requiredInputs),
      list(job.producedOutputs),
      job.runNotes,
      job.restartNotes,
      list(job.validations)
    ].map(escapeCsv).join(",")
  );

  return [header.join(","), ...rows].join("\n");
}

export function generateDesignReview(project: Project, flow: Flow): string {
  const runbook = buildRunbook(project, flow);
  const schemaIssues = compareSchema(flow);
  const lines = [
    `# ${project.name} - Design Review`,
    "",
    `Flow: ${flow.name}`,
    `Business area: ${project.metadata.businessArea || "-"}`,
    "",
    "## Architecture Nodes",
    ""
  ];

  for (const node of flow.nodes) {
    lines.push(`### ${node.title}`);
    lines.push(`- Type: ${nodeTypeLabels[node.type]}`);
    lines.push(`- Environment: ${project.environments.find((env) => env.id === node.environmentId)?.name ?? node.environmentId}`);
    lines.push(`- Job: ${node.metadata.jobName || "-"}`);
    lines.push(`- Source: ${node.schema.sourceName || "-"}`);
    lines.push(`- Selected columns: ${list(node.schema.selectedColumns) || "-"}`);
    lines.push(`- Derived columns: ${node.schema.derivedColumns.map((col) => `${col.name} = ${col.expression}`).join("; ") || "-"}`);
    lines.push(`- Filters: ${list(node.schema.filters) || "-"}`);
    lines.push(`- Join: ${node.schema.joinType || "-"} ${node.schema.joinKeys.map((key) => `${key.left} = ${key.right}`).join("; ")}`);
    lines.push(`- Output columns: ${list(node.schema.outputColumns) || "-"}`);
    lines.push(`- Data quality checks: ${list(node.schema.dataQualityChecks) || "-"}`);
    lines.push(`- Open questions: ${list(node.metadata.openQuestions) || "-"}`);
    lines.push(`- Assumptions: ${list(node.metadata.assumptions) || "-"}`);
    lines.push(`- Risks: ${list(node.metadata.risks) || "-"}`);
    lines.push(`- Reviewer comments: ${list(node.metadata.reviewerComments) || "-"}`);
    lines.push(`- Canvas notes: ${(node.notes ?? "").replace(/\r?\n/g, "; ") || "-"}`);
    lines.push("");
  }

  const issues = [...runbook.issues, ...schemaIssues];
  if (issues.length > 0) {
    lines.push("## Review Findings", "");
    for (const issue of issues) {
      const node = issue.nodeId ? flow.nodes.find((candidate) => candidate.id === issue.nodeId) : undefined;
      lines.push(`- ${issue.severity.toUpperCase()}: ${node ? `${node.title}: ` : ""}${issue.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function generateDiagramSvg(project: Project, flow: Flow): string {
  const padding = 80;
  const nodeWidth = NODE_WIDTH;
  const nodeHeight = NODE_HEIGHT;
  const minX = Math.min(...flow.nodes.map((node) => node.position.x), 0);
  const minY = Math.min(...flow.nodes.map((node) => node.position.y), 0);
  const maxX = Math.max(...flow.nodes.map((node) => node.position.x + nodeWidth), 1000);
  const maxY = Math.max(...flow.nodes.map((node) => node.position.y + nodeHeight), 600);
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  const offsetX = padding - minX;
  const offsetY = padding - minY;

  const envs = new Map(project.environments.map((env) => [env.id, env]));
  const nodeMap = new Map(flow.nodes.map((node) => [node.id, node]));

  const edgeMarkup = flow.edges
    .map((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) {
        return "";
      }
      const x1 = source.position.x + nodeWidth + offsetX;
      const y1 = source.position.y + nodeHeight / 2 + offsetY;
      const x2 = target.position.x + offsetX;
      const y2 = target.position.y + nodeHeight / 2 + offsetY;
      const mid = Math.max(36, Math.abs(x2 - x1) / 2);
      return `<path d="M ${x1} ${y1} C ${x1 + mid} ${y1}, ${x2 - mid} ${y2}, ${x2} ${y2}" fill="none" stroke="#5d6c83" stroke-width="2" marker-end="url(#arrow)" />`;
    })
    .join("\n");

  const nodeMarkup = flow.nodes
    .map((node: FlowNode) => {
      const env = envs.get(node.environmentId);
      const x = node.position.x + offsetX;
      const y = node.position.y + offsetY;
      const accent = safeSvgColor(env?.color);
      const title = escapeXml(compactText(node.title, 34));
      const subtitle = escapeXml(compactText(`${nodeTypeLabels[node.type]} - ${env?.name ?? node.environmentId}`, 44));
      const detail = escapeXml(compactText(node.metadata.jobName || node.schema.sourceName || node.metadata.producedOutputs[0] || "Planning node", 42));
      const note = compactText(node.notes ?? "", 76);
      return `<g transform="translate(${x}, ${y})">
  <rect width="${nodeWidth}" height="${nodeHeight}" rx="8" fill="#ffffff" stroke="#bcc6d4" />
  <rect width="6" height="${nodeHeight}" rx="3" fill="${accent}" />
  <text x="18" y="27" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#132033">${title}</text>
  <text x="18" y="50" font-family="Arial, sans-serif" font-size="11" fill="#5d6c83">${subtitle}</text>
  <text x="18" y="73" font-family="Arial, sans-serif" font-size="11" fill="#344257">${detail}</text>
  <rect x="18" y="91" width="${nodeWidth - 34}" height="42" rx="7" fill="#f8fafc" stroke="#d9e0ea" />
  <text x="28" y="116" font-family="Arial, sans-serif" font-size="11" fill="#46546a">${escapeXml(note || "Canvas note")}</text>
</g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#5d6c83" />
  </marker>
</defs>
<rect width="100%" height="100%" fill="#f5f7fb" />
<text x="40" y="42" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#132033">${escapeXml(project.name)} - ${escapeXml(flow.name)}</text>
${edgeMarkup}
${nodeMarkup}
</svg>`;
}

export function downloadText(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function safeFilename(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "sasdis-flow";
}
