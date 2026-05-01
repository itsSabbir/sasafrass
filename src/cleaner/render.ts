import { parseJobHeader, parseStepHeader } from "./headerParser";
import type { CleanResult, CleanStats, ParsedStepHeader, Segment } from "./types";

export function render(input: string, segments: readonly Segment[]): CleanResult {
  const blocks: string[] = [];
  for (const seg of segments) {
    const rendered = renderSegment(seg);
    if (rendered !== null) blocks.push(rendered);
  }
  const cleaned = blocks.join("\n\n").replace(/\s+$/, "");
  return { cleaned, stats: computeStats(input, cleaned) };
}

function renderSegment(seg: Segment): string | null {
  switch (seg.kind) {
    case "jobHeader":
      return renderJobHeader(seg.lines);
    case "stepHeader":
      return renderStepHeader(seg.lines);
    case "syslast":
      return seg.line.replace(/\s+$/, "");
    case "code":
      return renderCode(seg.lines);
    case "boilerplateMacro":
    case "boilerplateInvocation":
    case "boilerplateLet":
    case "stepEndComment":
      return null;
  }
}

function renderJobHeader(lines: readonly string[]): string | null {
  const parsed = parseJobHeader(lines);
  if (!parsed.job && !parsed.description) return null;
  const title = parsed.job ?? "(unnamed job)";
  const inner = parsed.description ? `${title} — ${parsed.description}` : title;
  return `/* Job: ${inner} */`;
}

function renderStepHeader(lines: readonly string[]): string | null {
  const parsed = parseStepHeader(lines);
  if (!parsed.step) return null;
  const titleLine = buildStepTitle(parsed);
  const extras = buildStepExtras(parsed);
  if (extras.length === 0) return `/* ${titleLine} */`;
  return `/* ${titleLine}\n${extras.join("\n")} */`;
}

function buildStepTitle(parsed: ParsedStepHeader): string {
  let title = `Step: ${parsed.step ?? ""}`;
  if (parsed.transform) title += ` (${parsed.transform})`;
  if (parsed.description) title += ` — ${parsed.description}`;
  return title;
}

function buildStepExtras(parsed: ParsedStepHeader): string[] {
  const out: string[] = [];
  if (parsed.quickNote && parsed.quickNote.length > 0) {
    out.push(`   Note: ${parsed.quickNote[0]}`);
    for (const note of parsed.quickNote.slice(1)) out.push(`   ${note}`);
  }
  if (parsed.warnings && parsed.warnings.length > 0) {
    out.push(`   Warning: ${parsed.warnings[0]}`);
    for (const w of parsed.warnings.slice(1)) out.push(`   ${w}`);
  }
  return out;
}

function renderCode(lines: readonly string[]): string | null {
  const trimmed = trimBlankEdges(lines);
  if (trimmed.length === 0) return null;
  return trimmed.join("\n").replace(/\s+$/, "");
}

function trimBlankEdges(lines: readonly string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start++;
  while (end > start && lines[end - 1].trim() === "") end--;
  return lines.slice(start, end);
}

function computeStats(input: string, output: string): CleanStats {
  const inputBytes = input.length;
  const outputBytes = output.length;
  const inputLines = input.length === 0 ? 0 : input.split(/\r?\n/).length;
  const outputLines = output.length === 0 ? 0 : output.split(/\r?\n/).length;
  const percentReduction =
    inputBytes === 0 ? 0 : Math.round((1 - outputBytes / inputBytes) * 1000) / 10;
  return { inputBytes, outputBytes, inputLines, outputLines, percentReduction };
}
