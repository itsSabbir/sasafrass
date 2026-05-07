import { describe, expect, it } from "vitest";
import { computeTotals, suggestNameFromCleaned } from "./useFileQueue";

describe("computeTotals", () => {
  it("returns zeros for an empty queue", () => {
    expect(computeTotals([])).toEqual({
      fileCount: 0,
      inputBytes: 0,
      outputBytes: 0,
      inputLines: 0,
      outputLines: 0,
      percentReduction: 0
    });
  });

  it("sums per-file stats and computes reduction across the queue", () => {
    const totals = computeTotals([
      makeQueueEntry({ inputBytes: 1000, outputBytes: 400, inputLines: 100, outputLines: 40 }),
      makeQueueEntry({ inputBytes: 500, outputBytes: 200, inputLines: 50, outputLines: 20 })
    ]);
    expect(totals.fileCount).toBe(2);
    expect(totals.inputBytes).toBe(1500);
    expect(totals.outputBytes).toBe(600);
    expect(totals.inputLines).toBe(150);
    expect(totals.outputLines).toBe(60);
    expect(totals.percentReduction).toBe(60);
  });
});

describe("suggestNameFromCleaned", () => {
  it("extracts job name from a Job header", () => {
    expect(suggestNameFromCleaned("/* Job: load_widget_orders — daily ETL */")).toBe("load_widget_orders");
  });

  it("returns null when there's no job header", () => {
    expect(suggestNameFromCleaned("proc sql; quit;")).toBeNull();
    expect(suggestNameFromCleaned("")).toBeNull();
  });

  it("only considers a job header at the start of the output", () => {
    expect(suggestNameFromCleaned("/* Step: foo */\n/* Job: not_first */")).toBeNull();
  });
});

interface QueueEntryStats {
  inputBytes: number;
  outputBytes: number;
  inputLines: number;
  outputLines: number;
}

function makeQueueEntry(stats: QueueEntryStats) {
  const percentReduction = stats.inputBytes === 0 ? 0 : (1 - stats.outputBytes / stats.inputBytes) * 100;
  return {
    id: "id",
    name: "name",
    input: "",
    cleaned: "",
    stats: { ...stats, percentReduction },
    removed: [],
    addedAt: "2026-05-07T00:00:00Z"
  };
}

// Storage round-trip and React-state behavior are covered by the dev-mode
// smoke test rather than a unit test, since they depend on browser globals
// (window.localStorage) that Vitest's default node environment doesn't expose.
