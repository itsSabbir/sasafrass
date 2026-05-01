import { findMacroEnd } from "./macroBalancer";
import type { Segment } from "./types";

const BOILERPLATE_MACROS = new Set([
  "etls_startPerformanceStats",
  "etls_setArmagent",
  "etls_setPerfInit",
  "rcSet",
  "rcSetDS",
  "etls_setDebug",
  "etls_recordCheck"
]);

const BOILERPLATE_LET_NAMES = new Set([
  "transformID",
  "trans_rc",
  "etls_stepStartTime",
  "etls_recCheckExist",
  "etls_recnt",
  "etls_sql_pushDown",
  "jobID",
  "etls_jobName",
  "etls_userID",
  "etls_startTime",
  "etls_endTime",
  "etls_recordsBefore",
  "etls_recordsAfter",
  "etls_lib",
  "etls_table",
  "IOMServer",
  "metaPort",
  "metaServer",
  "sysrc",
  "job_rc",
  "sqlrc",
  "syscc"
]);

const STRIPPABLE_NOISE_PREFIXES = [
  "/* Runtime statistics macros",
  "/*---- Map the columns",
  "/* Generate the process id for job",
  "/* General macro variables",
  "/* Performance Statistics require ARM_PROC sub-system",
  "/* Setup to capture return codes",
  "/* Create metadata macro variables",
  "/* Setup for capturing job status",
  "/* initialize syserr to 0",
  "/* Turn off performance statistics collection",
  "/* Access the data for ",
  "%put Process ID:",
  "%put %str(NOTE: Mapping columns"
];

interface Detection {
  segment: Segment;
  consumed: number;
}

export function segment(input: string): Segment[] {
  const lines = input.split(/\r?\n/);
  const raw: Segment[] = [];
  let i = 0;
  while (i < lines.length) {
    const detected = detectAt(lines, i);
    if (detected) {
      raw.push(detected.segment);
      i += detected.consumed;
      continue;
    }
    raw.push({ kind: "code", lines: [lines[i]] });
    i++;
  }
  return mergeAdjacentCode(raw);
}

function detectAt(lines: readonly string[], i: number): Detection | null {
  return (
    detectJobHeader(lines, i) ||
    detectStepHeader(lines, i) ||
    detectBoilerplateMacro(lines, i) ||
    detectUserMacro(lines, i) ||
    detectSyslast(lines, i) ||
    detectBoilerplateLet(lines, i) ||
    detectBoilerplateGlobal(lines, i) ||
    detectStepEndComment(lines, i) ||
    detectStrippableNoise(lines, i) ||
    detectInitDataNull(lines, i) ||
    detectBoilerplateInvocation(lines, i) ||
    detectPreStepCleanup(lines, i) ||
    detectJobDataNullBlock(lines, i)
  );
}

function detectJobHeader(lines: readonly string[], i: number): Detection | null {
  if (!/^\/\*\*\*+/.test(lines[i].trim())) return null;
  if (!hasMarker(lines, i, /^\s*\*\s*Job:/i)) return null;
  const end = findCommentEnd(lines, i);
  return {
    segment: { kind: "jobHeader", lines: lines.slice(i, end + 1) },
    consumed: end - i + 1
  };
}

function detectStepHeader(lines: readonly string[], i: number): Detection | null {
  if (!/^\/\*==+/.test(lines[i].trim())) return null;
  if (!hasMarker(lines, i, /^\s*\*\s*Step:/i)) return null;
  const end = findCommentEnd(lines, i);
  return {
    segment: { kind: "stepHeader", lines: lines.slice(i, end + 1) },
    consumed: end - i + 1
  };
}

function detectBoilerplateMacro(lines: readonly string[], i: number): Detection | null {
  const m = lines[i].trim().match(/^%macro\s+([A-Za-z_]\w*)/i);
  if (!m || !BOILERPLATE_MACROS.has(m[1])) return null;
  const end = findMacroEnd(lines, i);
  if (end === -1) return null;
  return {
    segment: { kind: "boilerplateMacro", name: m[1], lines: lines.slice(i, end + 1) },
    consumed: end - i + 1
  };
}

function detectUserMacro(lines: readonly string[], i: number): Detection | null {
  const m = lines[i].trim().match(/^%macro\s+([A-Za-z_]\w*)/i);
  if (!m || BOILERPLATE_MACROS.has(m[1])) return null;
  const end = findMacroEnd(lines, i);
  if (end === -1) return null;
  return {
    segment: { kind: "code", lines: lines.slice(i, end + 1) },
    consumed: end - i + 1
  };
}

function detectSyslast(lines: readonly string[], i: number): Detection | null {
  if (!/^%let\s+SYSLAST\s*=/i.test(lines[i].trim())) return null;
  return { segment: { kind: "syslast", line: lines[i] }, consumed: 1 };
}

function detectBoilerplateLet(lines: readonly string[], i: number): Detection | null {
  const m = lines[i].trim().match(/^%let\s+([A-Za-z_]\w*)\s*=/i);
  if (!m || !BOILERPLATE_LET_NAMES.has(m[1])) return null;
  return { segment: { kind: "boilerplateLet", lines: [lines[i]] }, consumed: 1 };
}

function detectBoilerplateGlobal(lines: readonly string[], i: number): Detection | null {
  if (!/^%global\s+(etls_|applName|job_rc|trans_rc|sqlrc|_armexec)/i.test(lines[i].trim())) return null;
  return { segment: { kind: "boilerplateInvocation", lines: [lines[i]] }, consumed: 1 };
}

function detectStepEndComment(lines: readonly string[], i: number): Detection | null {
  if (!/^\/\*\*\s*Step end .*\*\*\//.test(lines[i].trim())) return null;
  return { segment: { kind: "stepEndComment", line: lines[i] }, consumed: 1 };
}

function detectStrippableNoise(lines: readonly string[], i: number): Detection | null {
  const trimmed = lines[i].trim();
  if (!STRIPPABLE_NOISE_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return null;
  return { segment: { kind: "boilerplateInvocation", lines: [lines[i]] }, consumed: 1 };
}

function detectInitDataNull(lines: readonly string[], i: number): Detection | null {
  if (!/^data\s+_null_\s*;\s*run\s*;\s*$/i.test(lines[i].trim())) return null;
  return { segment: { kind: "boilerplateInvocation", lines: [lines[i]] }, consumed: 1 };
}

function detectBoilerplateInvocation(lines: readonly string[], i: number): Detection | null {
  const trimmed = lines[i].trim();
  const matches =
    /^%etls_(recordCheck|setPerfInit|setDebug|startPerformanceStats|setArmagent)\b/i.test(trimmed) ||
    /^%perfstrt\b/i.test(trimmed) ||
    /^%perfstop\b/i.test(trimmed) ||
    /^%perfend\b/i.test(trimmed) ||
    /^%perfinit\b/i.test(trimmed) ||
    /^%rcSet\b/i.test(trimmed) ||
    /^%rcSetDS\b/i.test(trimmed) ||
    /^option\s+DBIDIRECTEXEC\b/i.test(trimmed) ||
    /^%log4sas/i.test(trimmed);
  if (!matches) return null;
  const end = findStatementEnd(lines, i);
  return {
    segment: { kind: "boilerplateInvocation", lines: lines.slice(i, end + 1) },
    consumed: end - i + 1
  };
}

function detectPreStepCleanup(lines: readonly string[], i: number): Detection | null {
  if (!/^proc\s+datasets\s+lib\s*=\s*work\s+nolist\s+nowarn\s+memtype\s*=\s*\(\s*data\s+view\s*\)/i.test(lines[i].trim())) {
    return null;
  }
  let end = -1;
  for (let k = i; k < Math.min(i + 6, lines.length); k++) {
    if (/^\s*quit\s*;/i.test(lines[k])) {
      end = k;
      break;
    }
  }
  if (end === -1) return null;
  const body = lines.slice(i + 1, end).join("\n");
  if (!/^\s*delete\s+[A-Za-z_]\w*\s*;\s*$/m.test(body)) return null;
  return {
    segment: { kind: "boilerplateInvocation", lines: lines.slice(i, end + 1) },
    consumed: end - i + 1
  };
}

function detectJobDataNullBlock(lines: readonly string[], i: number): Detection | null {
  if (!/^data\s+_null_\s*;/i.test(lines[i].trim())) return null;
  const lookAhead = lines.slice(i, Math.min(i + 8, lines.length)).join("\n");
  const isApplName = /applName\s*=\s*"SAS Data Integration Studio"/i.test(lookAhead);
  const isPerfEnd = /if\s+"&_perfinit"\s+eq\s+"1"/i.test(lookAhead);
  if (!isApplName && !isPerfEnd) return null;
  let end = -1;
  for (let k = i; k < Math.min(i + 10, lines.length); k++) {
    if (/^\s*run\s*;/i.test(lines[k])) {
      end = k;
      break;
    }
  }
  if (end === -1) return null;
  return {
    segment: { kind: "boilerplateInvocation", lines: lines.slice(i, end + 1) },
    consumed: end - i + 1
  };
}

function hasMarker(lines: readonly string[], i: number, pattern: RegExp): boolean {
  for (let k = i + 1; k < Math.min(i + 6, lines.length); k++) {
    if (pattern.test(lines[k])) return true;
  }
  return false;
}

function findCommentEnd(lines: readonly string[], startIdx: number): number {
  for (let k = startIdx; k < lines.length; k++) {
    if (lines[k].includes("*/")) return k;
  }
  return lines.length - 1;
}

function findStatementEnd(lines: readonly string[], startIdx: number): number {
  for (let k = startIdx; k < lines.length; k++) {
    if (lines[k].includes(";")) return k;
  }
  return lines.length - 1;
}

function mergeAdjacentCode(segments: Segment[]): Segment[] {
  const merged: Segment[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (seg.kind === "code" && last?.kind === "code") {
      last.lines.push(...seg.lines);
      continue;
    }
    merged.push(seg);
  }
  return merged;
}
