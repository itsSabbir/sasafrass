import type { ChangeEvent, RefObject } from "react";
import type { HistoryState, Mode } from "../app/appTypes";
import { Icon } from "./Icon";
import type { Project } from "../types";

interface TopBarProps {
  project: Project;
  mode: Mode;
  setMode: (mode: Mode) => void;
  history: HistoryState;
  fileInputRef: RefObject<HTMLInputElement | null>;
  importProject: (event: ChangeEvent<HTMLInputElement>) => void;
  undo: () => void;
  redo: () => void;
  createNewProject: () => void;
  exportBundle: () => void;
  openCommandPalette: () => void;
}

const modeLabels: Record<Mode, string> = {
  canvas: "Flow Plan",
  runbook: "SAS Jobs",
  design: "Data Design",
  review: "Review"
};

export function TopBar(props: TopBarProps) {
  const {
    project,
    mode,
    setMode,
    history,
    fileInputRef,
    importProject,
    undo,
    redo,
    createNewProject,
    exportBundle,
    openCommandPalette
  } = props;

  return (
    <header className="topbar">
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importProject} />
      <div className="brand-block">
        <div className="brand-mark">SF</div>
        <div>
          <div className="brand-title">SASDIS Flow Planner</div>
          <div className="brand-subtitle">{project.name}</div>
        </div>
      </div>
      <nav className="mode-tabs" aria-label="Workspace mode">
        {(Object.keys(modeLabels) as Mode[]).map((tab) => (
          <button key={tab} className={mode === tab ? "active" : ""} onClick={() => setMode(tab)}>
            {modeLabels[tab]}
          </button>
        ))}
      </nav>
      <div className="top-actions">
        <button className="icon-button" title="Command palette" onClick={openCommandPalette}>
          <Icon name="command" />
        </button>
        <button className="icon-button" title="Undo" disabled={history.past.length === 0} onClick={undo}>
          <Icon name="undo" />
        </button>
        <button className="icon-button" title="Redo" disabled={history.future.length === 0} onClick={redo}>
          <Icon name="redo" />
        </button>
        <button className="text-button" onClick={createNewProject}>
          <Icon name="plus" /> New
        </button>
        <button className="text-button" onClick={() => fileInputRef.current?.click()}>
          <Icon name="upload" /> Import
        </button>
        <button className="text-button primary" onClick={exportBundle}>
          <Icon name="download" /> Export bundle
        </button>
      </div>
    </header>
  );
}
