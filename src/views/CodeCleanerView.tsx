import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { CleanerFileList } from "../components/CleanerFileList";
import { Icon } from "../components/Icon";
import { cleanSasCode } from "../cleaner";
import type { RemovedSegment } from "../cleaner";
import { downloadText, safeFilename } from "../exporters";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { suggestNameFromCleaned, useFileQueue } from "../hooks/useFileQueue";

export function CodeCleanerView() {
  const queue = useFileQueue();
  const [input, setInput] = useState("");
  const [draftName, setDraftName] = useState("");
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const debounced = useDebouncedValue(input, 150);
  const result = useMemo(() => cleanSasCode(debounced), [debounced]);
  const { cleaned, stats, removed } = result;
  const suggestedName = useMemo(() => suggestNameFromCleaned(cleaned) ?? "", [cleaned]);
  const effectiveName = draftName.trim() || suggestedName;

  const diffOutput = useMemo(() => {
    if (!showRemoved || removed.length === 0) return null;
    return buildDiffView(input, removed);
  }, [showRemoved, input, removed]);

  const onInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    setCopied(false);
    setStatusMessage(null);
  };

  const onCopy = async () => {
    if (!cleaned) return;
    await navigator.clipboard.writeText(cleaned);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const onDownload = () => {
    if (!cleaned) return;
    downloadText(`${safeFilename(effectiveName || "cleaned-sas")}.sas`, cleaned, "text/plain");
  };

  const onClearInput = () => {
    setInput("");
    setDraftName("");
    setCopied(false);
    setStatusMessage(null);
  };

  const onAddToQueue = () => {
    if (input.trim().length === 0) return;
    const file = queue.addFile(input, effectiveName);
    if (file) {
      setStatusMessage(`Added "${file.name}" to queue (${queue.files.length + 1}/20 files)`);
      setInput("");
      setDraftName("");
    }
  };

  const onPickFile = () => fileInputRef.current?.click();

  const onFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;
    if (!list || list.length === 0) return;
    await ingestFiles(Array.from(list));
    event.target.value = "";
  };

  const onDropZone = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const list = event.dataTransfer?.files;
    if (!list || list.length === 0) return;
    await ingestFiles(Array.from(list));
  };

  const ingestFiles = async (fileList: File[]) => {
    let added = 0;
    for (const file of fileList) {
      const text = await file.text();
      const baseName = file.name.replace(/\.sas$/i, "");
      const queued = queue.addFile(text, baseName);
      if (queued) added++;
    }
    if (added > 0) setStatusMessage(`Added ${added} ${added === 1 ? "file" : "files"} to the queue.`);
  };

  const onBatchDownload = () => {
    for (const file of queue.files) {
      downloadText(`${safeFilename(file.name)}.sas`, file.cleaned, "text/plain");
    }
  };

  return (
    <div className="view-scroll cleaner-view">
      <input ref={fileInputRef} type="file" accept=".sas,.txt" multiple className="hidden" onChange={onFileInputChange} />

      <div className="view-header">
        <div>
          <h1>Code Cleaner</h1>
          <p>
            Strips SAS Data Integration Studio boilerplate so the actual logic stands out.
          </p>
        </div>
        <button className="text-button" onClick={onPickFile}>
          <Icon name="upload" /> Add SAS files
        </button>
      </div>

      <div
        className={`cleaner-dropzone${dragging ? " drop-active" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDropZone}
        onClick={onPickFile}
      >
        <Icon name="upload" />
        <span>Drop .sas files here or click to browse</span>
      </div>

      <div className="cleaner-stats-bar">
        <span className="cleaner-stats-summary">
          {stats.inputLines > 0
            ? `Removed ${stats.inputLines - stats.outputLines} lines (${removed.length} segments) — ${formatReduction(stats.percentReduction)}`
            : "Paste or drop SAS code above to start cleaning"
          }
        </span>
        <label className="cleaner-toggle">
          <input type="checkbox" checked={showRemoved} onChange={(e) => setShowRemoved(e.target.checked)} />
          Show removed
        </label>
      </div>

      <div className="cleaner-actions-bar">
        <button className="text-button" onClick={onClearInput} disabled={input.length === 0}>
          <Icon name="trash" /> Clear
        </button>
        <button className="text-button" onClick={onDownload} disabled={cleaned.length === 0}>
          <Icon name="download" /> Download .sas
        </button>
        <button className="text-button" onClick={onCopy} disabled={cleaned.length === 0}>
          <Icon name={copied ? "check" : "copy"} /> {copied ? "Copied" : "Copy clean"}
        </button>
        <button className="text-button primary" onClick={onAddToQueue} disabled={input.trim().length === 0}>
          <Icon name="plus" /> Add to queue
        </button>
      </div>

      {statusMessage && (
        <div className="cleaner-status" role="status">
          <Icon name="check" /> {statusMessage}
        </div>
      )}

      <div className="cleaner-grid">
        <div className="cleaner-pane">
          <label htmlFor="cleaner-input">Paste SAS DIS code</label>
          <textarea
            id="cleaner-input"
            className="cleaner-textarea"
            value={input}
            onChange={onInput}
            placeholder="Paste SAS Data Integration Studio output here…"
            spellCheck={false}
          />
        </div>
        <div className="cleaner-pane">
          <label htmlFor="cleaner-output">Cleaned{showRemoved ? " (diff view)" : ""}</label>
          {showRemoved && diffOutput ? (
            <div className="cleaner-diff" id="cleaner-output">
              {diffOutput.map((line, i) => (
                <div key={i} className={line.removed ? "diff-line removed" : "diff-line kept"}>
                  <span className="diff-gutter">{line.lineNo}</span>
                  <span className="diff-text">{line.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <textarea
              id="cleaner-output"
              className="cleaner-textarea"
              value={cleaned}
              readOnly
              spellCheck={false}
            />
          )}
        </div>
      </div>

      <div className="cleaner-name-row">
        <label htmlFor="cleaner-name">Save as</label>
        <input
          id="cleaner-name"
          type="text"
          value={effectiveName}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder={suggestedName || "auto-suggest from job header"}
          spellCheck={false}
        />
      </div>

      {removed.length > 0 && <RemovedAuditPanel removed={removed} />}

      <CleanerFileList
        files={queue.files}
        totals={queue.totals}
        onRename={queue.renameFile}
        onRemove={queue.removeFile}
        onClear={queue.clearQueue}
        onBatchDownload={queue.files.length > 0 ? onBatchDownload : undefined}
      />
    </div>
  );
}

interface DiffLine {
  lineNo: number;
  text: string;
  removed: boolean;
}

function buildDiffView(input: string, removed: readonly RemovedSegment[]): DiffLine[] {
  const lines = input.split("\n");
  const removedLines = new Set<number>();
  for (const segment of removed) {
    for (let i = segment.inputLineStart; i <= segment.inputLineEnd; i++) {
      removedLines.add(i);
    }
  }
  return lines.map((text, i) => ({
    lineNo: i + 1,
    text,
    removed: removedLines.has(i + 1)
  }));
}

interface RemovedAuditPanelProps {
  removed: readonly RemovedSegment[];
}

function RemovedAuditPanel({ removed }: RemovedAuditPanelProps) {
  const totalLines = removed.reduce((sum, r) => sum + (r.inputLineEnd - r.inputLineStart + 1), 0);
  return (
    <details className="cleaner-audit">
      <summary>
        <Icon name="search" />
        <span>Show what was removed — <strong>{removed.length}</strong> segments, <strong>{totalLines.toLocaleString()}</strong> lines</span>
      </summary>
      <ol className="cleaner-audit-list">
        {removed.map((entry, idx) => (
          <li key={idx} className={`cleaner-audit-item kind-${entry.category}`}>
            <header>
              <span className="audit-line">{formatRange(entry)}</span>
              <span className="audit-kind">{categoryLabel(entry)}</span>
            </header>
            <pre>{entry.text}</pre>
          </li>
        ))}
      </ol>
    </details>
  );
}

function categoryLabel(entry: RemovedSegment): string {
  switch (entry.category) {
    case "boilerplateMacro": return entry.name ? `Boilerplate macro · %macro ${entry.name}` : "Boilerplate macro";
    case "boilerplateInvocation": return "Boilerplate invocation";
    case "boilerplateLet": return "Boilerplate %let";
    case "stepEndComment": return "Step end marker";
  }
}

function formatRange(entry: RemovedSegment): string {
  return entry.inputLineEnd > entry.inputLineStart ? `L${entry.inputLineStart}–${entry.inputLineEnd}` : `L${entry.inputLineStart}`;
}

function formatReduction(percent: number): string {
  if (percent <= 0) return "no reduction yet";
  return `${percent.toFixed(1)}% smaller`;
}
