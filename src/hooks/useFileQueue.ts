import { useCallback, useEffect, useMemo, useState } from "react";
import { cleanSasCode } from "../cleaner";
import type { CleanStats, RemovedSegment } from "../cleaner";

export interface QueuedFile {
  id: string;
  name: string;
  input: string;
  cleaned: string;
  stats: CleanStats;
  removed: RemovedSegment[];
  addedAt: string;
}

export interface QueueTotals extends CleanStats {
  fileCount: number;
}

export const QUEUE_STORAGE_KEY = "sasafrass.cleanerQueue.v1";
export const MAX_QUEUED_FILES = 20;

export function useFileQueue() {
  const [files, setFiles] = useState<QueuedFile[]>(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(files);
  }, [files]);

  const addFile = useCallback((input: string, suggestedName?: string): QueuedFile | null => {
    if (input.trim().length === 0) return null;
    const result = cleanSasCode(input);
    const id = newId();
    const name = pickName(suggestedName, result.cleaned);
    const file: QueuedFile = {
      id,
      name,
      input,
      cleaned: result.cleaned,
      stats: result.stats,
      removed: result.removed,
      addedAt: new Date().toISOString()
    };
    setFiles((prev) => {
      const next = [...prev, file];
      return next.length > MAX_QUEUED_FILES ? next.slice(next.length - MAX_QUEUED_FILES) : next;
    });
    return file;
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const renameFile = useCallback((id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f)));
  }, []);

  const clearQueue = useCallback(() => setFiles([]), []);

  const totals = useMemo(() => computeTotals(files), [files]);

  return { files, totals, addFile, removeFile, renameFile, clearQueue };
}

export function computeTotals(files: readonly QueuedFile[]): QueueTotals {
  let inputBytes = 0;
  let outputBytes = 0;
  let inputLines = 0;
  let outputLines = 0;
  for (const f of files) {
    inputBytes += f.stats.inputBytes;
    outputBytes += f.stats.outputBytes;
    inputLines += f.stats.inputLines;
    outputLines += f.stats.outputLines;
  }
  const percentReduction =
    inputBytes === 0 ? 0 : Math.round((1 - outputBytes / inputBytes) * 1000) / 10;
  return { fileCount: files.length, inputBytes, outputBytes, inputLines, outputLines, percentReduction };
}

export function suggestNameFromCleaned(cleaned: string): string | null {
  const match = cleaned.match(/^\/\*\s*Job:\s*([A-Za-z_][\w-]*)/);
  return match ? match[1] : null;
}

function pickName(suggested: string | undefined, cleaned: string): string {
  const trimmed = suggested?.trim();
  if (trimmed) return trimmed;
  const fromHeader = suggestNameFromCleaned(cleaned);
  if (fromHeader) return fromHeader;
  return `Pasted at ${new Date().toLocaleTimeString()}`;
}

function newId(): string {
  return `file_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadFromStorage(): QueuedFile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQueuedFileShape) as QueuedFile[];
  } catch {
    return [];
  }
}

function saveToStorage(files: readonly QueuedFile[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(files));
  } catch {
    // Likely quota exceeded — drop oldest half and retry once
    if (files.length > 1) {
      try {
        window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(files.slice(Math.floor(files.length / 2))));
      } catch {
        // Give up; UI surface will handle the warning state
      }
    }
  }
}

function isQueuedFileShape(value: unknown): value is QueuedFile {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.input === "string" &&
    typeof v.cleaned === "string" &&
    typeof v.stats === "object" &&
    Array.isArray(v.removed) &&
    typeof v.addedAt === "string"
  );
}
