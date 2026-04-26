import {
  downloadText,
  generateDesignReview,
  generateDiagramSvg,
  generateRunbookCsv,
  generateRunbookMarkdown,
  safeFilename,
  serializeProject
} from "../exporters";
import type { Flow, Project, Runbook } from "../types";

export function downloadProjectJson(project: Project): void {
  downloadText(`${safeFilename(project.name)}.json`, serializeProject(project), "application/json");
}

export function downloadRunbookMarkdown(project: Project, flow: Flow, runbook: Runbook): void {
  downloadText(`${safeFilename(project.name)}-runbook.md`, generateRunbookMarkdown(project, flow, runbook), "text/markdown");
}

export function downloadRunbookCsv(project: Project, flow: Flow, runbook: Runbook): void {
  downloadText(`${safeFilename(project.name)}-jobs.csv`, generateRunbookCsv(project, flow, runbook), "text/csv");
}

export function downloadDesignReview(project: Project, flow: Flow): void {
  downloadText(`${safeFilename(project.name)}-design-review.md`, generateDesignReview(project, flow), "text/markdown");
}

export function downloadDiagram(project: Project, flow: Flow): void {
  downloadText(`${safeFilename(project.name)}-diagram.svg`, generateDiagramSvg(project, flow), "image/svg+xml");
}

export function downloadBundle(project: Project, flow: Flow, runbook: Runbook): void {
  downloadProjectJson(project);
  downloadRunbookMarkdown(project, flow, runbook);
  downloadRunbookCsv(project, flow, runbook);
  downloadDesignReview(project, flow);
  downloadDiagram(project, flow);
}
