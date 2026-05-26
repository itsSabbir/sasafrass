import { parseJobHeader, parseStepHeader } from "./headerParser";
import { segment } from "./segmenter";
import type { SasFileAnalysis, SasStepInfo, SasTableRef } from "./types";

/** Parse a SAS DIS export and extract structured metadata for flow import. */
export function analyzeSasFile(input: string): SasFileAnalysis {
  const segments = segment(input);
  let jobName = "";
  let description = "";
  const steps: SasStepInfo[] = [];
  const allSources = new Map<string, SasTableRef>();
  const allTargets = new Map<string, SasTableRef>();

  for (const seg of segments) {
    if (seg.kind === "jobHeader") {
      const header = parseJobHeader(seg.lines);
      jobName = header.job ?? "";
      description = header.description ?? "";
    }

    if (seg.kind === "stepHeader") {
      const header = parseStepHeader(seg.lines);
      const stepSources = (header.sourceTables ?? []).map(parseTableRef);
      const stepTargets = (header.targetTables ?? []).map(parseTableRef);
      steps.push({
        stepName: header.step ?? "",
        transform: header.transform ?? "",
        description: header.description ?? "",
        sourceTables: stepSources,
        targetTables: stepTargets
      });
      for (const ref of stepSources) allSources.set(ref.fullName, ref);
      for (const ref of stepTargets) allTargets.set(ref.fullName, ref);
    }

    // Extract table references from code segments (DATA steps, PROC SQL)
    if (seg.kind === "code") {
      const codeRefs = extractCodeTableRefs(seg.lines);
      for (const ref of codeRefs.sources) allSources.set(ref.fullName, ref);
      for (const ref of codeRefs.targets) allTargets.set(ref.fullName, ref);
    }
  }

  return {
    jobName,
    description,
    steps,
    sourceTables: [...allSources.values()],
    targetTables: [...allTargets.values()]
  };
}

/** Parse "lib.table" or "table" into a SasTableRef. */
export function parseTableRef(raw: string): SasTableRef {
  const cleaned = raw.trim().replace(/['"]/g, "");
  const dotIdx = cleaned.indexOf(".");
  if (dotIdx >= 0) {
    const libref = cleaned.slice(0, dotIdx).toLowerCase();
    const table = cleaned.slice(dotIdx + 1).toLowerCase();
    return { libref, table, fullName: `${libref}.${table}` };
  }
  return { libref: "work", table: cleaned.toLowerCase(), fullName: `work.${cleaned.toLowerCase()}` };
}

interface CodeTableRefs {
  sources: SasTableRef[];
  targets: SasTableRef[];
}

/** Extract table references from SAS code lines (DATA steps, PROC SQL). */
function extractCodeTableRefs(lines: readonly string[]): CodeTableRefs {
  const sources: SasTableRef[] = [];
  const targets: SasTableRef[] = [];
  const joined = lines.join("\n");

  // DATA step targets: "data lib.table;" or "data table;"
  for (const match of joined.matchAll(/\bdata\s+([\w.]+)\s*[;(]/gi)) {
    targets.push(parseTableRef(match[1]));
  }

  // SET/MERGE sources: "set lib.table;" or "merge lib.table"
  for (const match of joined.matchAll(/\b(?:set|merge)\s+([\w.]+)\s*[;(]/gi)) {
    sources.push(parseTableRef(match[1]));
  }

  // PROC SQL: "from lib.table" or "FROM lib.table AS"
  for (const match of joined.matchAll(/\bfrom\s+([\w.]+)/gi)) {
    const ref = parseTableRef(match[1]);
    // skip SQL keywords that look like table names
    if (!["dual", "dictionary", "sashelp"].includes(ref.libref)) {
      sources.push(ref);
    }
  }

  // PROC SQL: "create table lib.table as"
  for (const match of joined.matchAll(/\bcreate\s+table\s+([\w.]+)/gi)) {
    targets.push(parseTableRef(match[1]));
  }

  return { sources, targets };
}
