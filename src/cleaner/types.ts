export type Segment =
  | { kind: "jobHeader"; lines: string[] }
  | { kind: "stepHeader"; lines: string[] }
  | { kind: "boilerplateMacro"; name: string; lines: string[] }
  | { kind: "boilerplateInvocation"; lines: string[] }
  | { kind: "boilerplateLet"; lines: string[] }
  | { kind: "syslast"; line: string }
  | { kind: "stepEndComment"; line: string }
  | { kind: "code"; lines: string[] };

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
}
