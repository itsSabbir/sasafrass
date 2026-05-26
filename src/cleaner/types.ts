export interface SegmentRange {
  // 1-indexed input line numbers, inclusive
  inputLineStart: number;
  inputLineEnd: number;
}

export type Segment = (
  | { kind: "jobHeader"; lines: string[] }
  | { kind: "stepHeader"; lines: string[] }
  | { kind: "boilerplateMacro"; name: string; lines: string[] }
  | { kind: "boilerplateInvocation"; lines: string[] }
  | { kind: "boilerplateLet"; lines: string[] }
  | { kind: "syslast"; line: string }
  | { kind: "stepEndComment"; line: string }
  | { kind: "code"; lines: string[] }
) & SegmentRange;

export type RemovedCategory =
  | "boilerplateMacro"
  | "boilerplateInvocation"
  | "boilerplateLet"
  | "stepEndComment";

export interface RemovedSegment extends SegmentRange {
  category: RemovedCategory;
  // Macro name for boilerplateMacro (e.g. "etls_recordCheck"); undefined otherwise.
  name?: string;
  text: string;
}

export interface ParsedJobHeader {
  job?: string;
  description?: string;
}

export interface ParsedStepHeader {
  step?: string;
  transform?: string;
  description?: string;
  quickNote?: string[];
  warnings?: string[];
  sourceTables?: string[];
  targetTables?: string[];
}

export interface SasTableRef {
  libref: string;
  table: string;
  fullName: string;
}

export interface SasStepInfo {
  stepName: string;
  transform: string;
  description: string;
  sourceTables: SasTableRef[];
  targetTables: SasTableRef[];
}

export interface SasFileAnalysis {
  jobName: string;
  description: string;
  steps: SasStepInfo[];
  sourceTables: SasTableRef[];
  targetTables: SasTableRef[];
}

export interface CleanStats {
  inputBytes: number;
  outputBytes: number;
  inputLines: number;
  outputLines: number;
  percentReduction: number;
}

export interface CleanResult {
  cleaned: string;
  stats: CleanStats;
  // Audit trail: every segment that was dropped, with its original input line range
  // and the verbatim text. Drives the "Show what was removed" panel in the UI.
  removed: RemovedSegment[];
}
