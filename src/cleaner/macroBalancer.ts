export function findMacroEnd(lines: readonly string[], startIdx: number): number {
  let depth = 0;
  for (let i = startIdx; i < lines.length; i++) {
    const stripped = stripStringLiterals(lines[i]);
    depth += countMatches(stripped, /%macro\b/gi);
    depth -= countMatches(stripped, /%mend\b/gi);
    if (depth === 0) return i;
  }
  return -1;
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function stripStringLiterals(line: string): string {
  let result = "";
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"' || ch === "'") {
      i = skipString(line, i + 1, ch);
      continue;
    }
    result += ch;
    i++;
  }
  return result;
}

function skipString(line: string, start: number, quote: string): number {
  let i = start;
  while (i < line.length && line[i] !== quote) i++;
  return i < line.length ? i + 1 : i;
}
