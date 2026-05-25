import { useState } from "react";
import { Icon } from "./Icon";
import type { QueuedFile, QueueTotals } from "../hooks/useFileQueue";

interface CleanerFileListProps {
  files: readonly QueuedFile[];
  totals: QueueTotals;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onBatchDownload?: () => void;
}

export function CleanerFileList({ files, totals, onRename, onRemove, onClear, onBatchDownload }: CleanerFileListProps) {
  if (files.length === 0) return null;
  return (
    <section className="cleaner-queue">
      <header className="cleaner-queue-header">
        <div>
          <h2>Cleaner queue · {totals.fileCount} {totals.fileCount === 1 ? "file" : "files"}</h2>
          <p>
            <strong>{totals.outputLines.toLocaleString()}</strong>
            {" / "}
            <strong>{totals.inputLines.toLocaleString()}</strong> lines · {formatKb(totals.outputBytes)} / {formatKb(totals.inputBytes)} ·{" "}
            <span className="stat-good">{totals.percentReduction.toFixed(1)}% smaller</span>
          </p>
        </div>
        <div className="cleaner-queue-actions">
          {onBatchDownload && (
            <button className="text-button primary" onClick={onBatchDownload} title="Download all cleaned files">
              <Icon name="download" /> Download All
            </button>
          )}
          <button className="text-button" onClick={onClear} title="Remove all queued files">
            <Icon name="trash" /> Clear queue
          </button>
        </div>
      </header>
      <ol className="cleaner-queue-list">
        {files.map((f) => (
          <CleanerFileRow
            key={f.id}
            file={f}
            onRename={(name) => onRename(f.id, name)}
            onRemove={() => onRemove(f.id)}
          />
        ))}
      </ol>
    </section>
  );
}

interface CleanerFileRowProps {
  file: QueuedFile;
  onRename: (name: string) => void;
  onRemove: () => void;
}

function CleanerFileRow({ file, onRename, onRemove }: CleanerFileRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(file.name);

  const commit = () => {
    if (draftName.trim() && draftName.trim() !== file.name) onRename(draftName);
    setEditing(false);
  };

  return (
    <li className={`cleaner-file-row${expanded ? " expanded" : ""}`}>
      <div className="cleaner-file-summary">
        {editing ? (
          <input
            className="cleaner-file-name-input"
            autoFocus
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") {
                setDraftName(file.name);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button
            className="cleaner-file-name"
            onClick={() => setEditing(true)}
            title="Click to rename"
          >
            {file.name}
          </button>
        )}
        <span className="cleaner-file-stats">
          {file.stats.outputLines.toLocaleString()}
          <span className="muted"> / </span>
          {file.stats.inputLines.toLocaleString()} lines ·{" "}
          <span className="stat-good">{file.stats.percentReduction.toFixed(1)}% smaller</span>
        </span>
        <div className="cleaner-file-actions">
          <button className="text-button" onClick={() => setExpanded(!expanded)}>
            <Icon name={expanded ? "zoomOut" : "search"} /> {expanded ? "Hide" : "View"}
          </button>
          <button className="icon-button" onClick={onRemove} title="Remove from queue">
            <Icon name="trash" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="cleaner-file-output">
          <textarea
            className="cleaner-textarea"
            value={file.cleaned}
            readOnly
            spellCheck={false}
          />
        </div>
      )}
    </li>
  );
}

function formatKb(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
