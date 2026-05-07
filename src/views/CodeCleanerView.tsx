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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const debounced = useDebouncedValue(input, 150);
  const result = useMemo(() => cleanSasCode(debounced), [debounced]);
  const { cleaned, stats, removed } = result;
  const suggestedName = useMemo(() => suggestNameFromCleaned(cleaned) ?? "", [cleaned]);
  const effectiveName = draftName.trim() || suggestedName;

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
      setStatusMessage(`Added "${file.name}" to the queue.`);
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

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
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

  return (
    <div
      className={`view-scroll cleaner-view${dragging ? " drag-active" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".sas,.txt"
        multiple
        className="hidden"
        onChange={onFileInputChange}
      />

      <div className="view-header">
        <div>
          <h1>Code Cleaner</h1>
          <p>
            Strips SAS Data Integration Studio boilerplate (etls macros, perf wrappers, GUID banners) so the actual logic stands out. Paste files
            below or drop <code>.sas</code> files anywhere on this view to queue them up.
          </p>
        </div>
        <button className="text-button" onClick={onPickFile}>
          <Icon name="upload" /> Add SAS files
        </button>
      </div>

      <div className="cleaner-stats">
        <strong>{formatLines(stats.outputLines, stats.inputLines)}</strong>
        <span>{formatBytes(stats.outputBytes, stats.inputBytes)}</span>
        <span className={stats.percentReduction > 0 ? "stat-good" : ""}>{formatReduction(stats.percentReduction)}</span>
        <div className="cleaner-actions">
          <button className="text-button" onClick={onClearInput} disabled={input.length === 0}>
            <Icon name="trash" /> Clear
          </button>
          <button className="text-button" onClick={onDownload} disabled={cleaned.length === 0}>
            <Icon name="download" /> Download .sas
          </button>
          <button className="text-button" onClick={onCopy} disabled={cleaned.length === 0}>
            <Icon name={copied ? "check" : "copy"} /> {copied ? "Copied" : "Copy clean"}
          </button>
          <button className="text-button primary" onClick={onAddToQueue} disabled={cleaned.length === 0}>
            <Icon name="plus" /> Add to queue
          </button>
        </div>
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
          <label htmlFor="cleaner-output">Cleaned</label>
          <textarea
            id="cleaner-output"
            className="cleaner-textarea"
            value={cleaned}
            readOnly
            spellCheck={false}
          />
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
        <span className="cleaner-name-hint">Press <kbd>Add to queue</kbd> above to save this paste with the name above.</span>
      </div>

      {removed.length > 0 && <RemovedAuditPanel removed={removed} />}

      <CleanerFileList
        files={queue.files}
        totals={queue.totals}
        onRename={queue.renameFile}
        onRemove={queue.removeFile}
        onClear={queue.clearQueue}
      />
    </div>
  );
}

interface RemovedAuditPanelProps {
  removed: readonly RemovedSegment[];
}

function RemovedAuditPanel({ removed }: RemovedAuditPanelProps) {
  const totalLines = removed.reduce(
    (sum, r) => sum + (r.inputLineEnd - r.inputLineStart + 1),
    0
  );
  return (
    <details className="cleaner-audit">
      <summary>
        <Icon name="search" />
        <span>
          Show what was removed — <strong>{removed.length}</strong> segments,{" "}
          <strong>{totalLines.toLocaleString()}</strong> lines
        </span>
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
    case "boilerplateMacro":
      return entry.name ? `Boilerplate macro · %macro ${entry.name}` : "Boilerplate macro";
    case "boilerplateInvocation":
      return "Boilerplate invocation";
    case "boilerplateLet":
      return "Boilerplate %let";
    case "stepEndComment":
      return "Step end marker";
  }
}

function formatRange(entry: RemovedSegment): string {
  if (entry.inputLineEnd > entry.inputLineStart) {
    return `L${entry.inputLineStart}–${entry.inputLineEnd}`;
  }
  return `L${entry.inputLineStart}`;
}

function formatLines(out: number, total: number): string {
  return `${out.toLocaleString()} / ${total.toLocaleString()} lines`;
}

function formatBytes(out: number, total: number): string {
  return `${formatKb(out)} / ${formatKb(total)}`;
}

function formatKb(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatReduction(percent: number): string {
  if (percent <= 0) return "no reduction yet";
  return `${percent.toFixed(1)}% smaller`;
}
