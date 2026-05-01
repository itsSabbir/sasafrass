import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { Icon } from "../components/Icon";
import { cleanSasCode } from "../cleaner";
import { downloadText, safeFilename } from "../exporters";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

export function CodeCleanerView() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const debounced = useDebouncedValue(input, 150);
  const result = useMemo(() => cleanSasCode(debounced), [debounced]);
  const { cleaned, stats } = result;

  const onInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    setCopied(false);
  };

  const onCopy = async () => {
    if (!cleaned) return;
    await navigator.clipboard.writeText(cleaned);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const onDownload = () => {
    if (!cleaned) return;
    downloadText(`${safeFilename("cleaned-sas")}.sas`, cleaned, "text/plain");
  };

  const onClear = () => {
    setInput("");
    setCopied(false);
  };

  return (
    <div className="view-scroll">
      <div className="view-header">
        <div>
          <h1>Code Cleaner</h1>
          <p>Strips SAS Data Integration Studio boilerplate (etls macros, perf wrappers, GUID banners) so the actual logic stands out.</p>
        </div>
      </div>

      <div className="cleaner-stats">
        <strong>{formatLines(stats.outputLines, stats.inputLines)}</strong>
        <span>{formatBytes(stats.outputBytes, stats.inputBytes)}</span>
        <span className={stats.percentReduction > 0 ? "stat-good" : ""}>{formatReduction(stats.percentReduction)}</span>
        <div className="cleaner-actions">
          <button className="text-button" onClick={onClear} disabled={input.length === 0}>
            <Icon name="trash" /> Clear
          </button>
          <button className="text-button" onClick={onDownload} disabled={cleaned.length === 0}>
            <Icon name="download" /> Download .sas
          </button>
          <button className="text-button primary" onClick={onCopy} disabled={cleaned.length === 0}>
            <Icon name={copied ? "check" : "copy"} /> {copied ? "Copied" : "Copy clean code"}
          </button>
        </div>
      </div>

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
    </div>
  );
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
