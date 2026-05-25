import {
  downloadBundle,
  downloadDesignReview,
  downloadDiagram,
  downloadProjectJson,
  downloadRunbookCsv,
  downloadRunbookMarkdown
} from "../app/downloads";
import type { Flow, Project, Runbook } from "../types";

export interface ProjectExports {
  exportProjectJson: () => void;
  exportRunbookMarkdown: () => void;
  exportRunbookCsv: () => void;
  exportDesignReview: () => void;
  exportDiagram: () => void;
  exportBundle: () => void;
}

interface UseProjectExportsInput {
  project: Project;
  activeFlow: Flow | undefined;
  runbook: Runbook | null;
}

export function useProjectExports({ project, activeFlow, runbook }: UseProjectExportsInput): ProjectExports {
  function exportProjectJson(): void {
    downloadProjectJson(project);
  }

  function exportRunbookMarkdown(): void {
    if (!activeFlow || !runbook) return;
    downloadRunbookMarkdown(project, activeFlow, runbook);
  }

  function exportRunbookCsv(): void {
    if (!activeFlow || !runbook) return;
    downloadRunbookCsv(project, activeFlow, runbook);
  }

  function exportDesignReview(): void {
    if (!activeFlow) return;
    downloadDesignReview(project, activeFlow);
  }

  function exportDiagram(): void {
    if (!activeFlow) return;
    downloadDiagram(project, activeFlow);
  }

  function exportBundle(): void {
    if (!activeFlow || !runbook) return;
    downloadBundle(project, activeFlow, runbook);
  }

  return {
    exportProjectJson,
    exportRunbookMarkdown,
    exportRunbookCsv,
    exportDesignReview,
    exportDiagram,
    exportBundle
  };
}
