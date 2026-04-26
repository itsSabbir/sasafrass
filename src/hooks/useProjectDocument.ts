import { useEffect, useRef, useState } from "react";
import { MAX_HISTORY } from "../app/constants";
import type { HistoryState, ProjectSnapshot } from "../app/appTypes";
import { loadInitialProject, loadSnapshots, persistProject, saveSnapshots } from "../app/storage";
import { createId, nowIso } from "../data";
import type { Project } from "../types";

export function useProjectDocument() {
  const [project, setProjectState] = useState<Project>(loadInitialProject);
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>(loadSnapshots);
  const projectRef = useRef(project);

  useEffect(() => {
    projectRef.current = project;
    persistProject(project);
  }, [project]);

  function setProject(next: Project): void {
    projectRef.current = next;
    setProjectState(next);
  }

  function createSnapshot(nextProject: Project, label: string): void {
    const snapshot: ProjectSnapshot = {
      id: createId("snapshot"),
      label,
      createdAt: nowIso(),
      projectName: nextProject.name,
      nodeCount: nextProject.flows.reduce((count, flow) => count + flow.nodes.length, 0),
      project: nextProject
    };
    saveSnapshots([snapshot, ...loadSnapshots()]);
    setSnapshots(loadSnapshots());
  }

  function commitLiveProject(previous: Project, next: Project, label: string): void {
    setHistory((current) => ({
      past: [...current.past.slice(-(MAX_HISTORY - 1)), previous],
      future: []
    }));
    setProject(next);
    createSnapshot(next, label);
  }

  function commitProject(updater: (current: Project) => Project, label: string): void {
    const previous = projectRef.current;
    const next = { ...updater(previous), updatedAt: nowIso() };
    commitLiveProject(previous, next, label);
  }

  function mutateProjectLive(updater: (current: Project) => Project): void {
    setProject(updater(projectRef.current));
  }

  function replaceProject(next: Project, label: string): void {
    commitLiveProject(projectRef.current, { ...next, updatedAt: nowIso() }, label);
  }

  function undo(): void {
    setHistory((current) => {
      if (current.past.length === 0) {
        return current;
      }
      const previous = current.past[current.past.length - 1];
      const futureProject = projectRef.current;
      setProject(previous);
      return {
        past: current.past.slice(0, -1),
        future: [futureProject, ...current.future]
      };
    });
  }

  function redo(): void {
    setHistory((current) => {
      if (current.future.length === 0) {
        return current;
      }
      const next = current.future[0];
      const previous = projectRef.current;
      setProject(next);
      return {
        past: [...current.past, previous],
        future: current.future.slice(1)
      };
    });
  }

  return {
    project,
    projectRef,
    history,
    snapshots,
    commitProject,
    mutateProjectLive,
    replaceProject,
    commitLiveProject,
    undo,
    redo
  };
}
