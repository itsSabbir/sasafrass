import type { DerivedColumn, JoinKey } from "../types";

const SQL_KEYWORDS = new Set([
  "add",
  "alter",
  "and",
  "by",
  "case",
  "create",
  "distinct",
  "drop",
  "else",
  "end",
  "format",
  "from",
  "group",
  "having",
  "index",
  "informat",
  "inner",
  "join",
  "label",
  "left",
  "length",
  "not",
  "null",
  "on",
  "order",
  "outer",
  "proc",
  "quit",
  "rename",
  "right",
  "select",
  "table",
  "then",
  "type",
  "when",
  "where"
]);

export function listToText(values: string[]): string {
  return values.join("\n");
}

export function textToList(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTopLevelCommas(value: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let quote: string | null = null;

  for (const char of value) {
    if (quote) {
      current += char;
      if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(") {
      depth += 1;
    }
    if (char === ")") {
      depth = Math.max(0, depth - 1);
    }
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  parts.push(current);
  return parts;
}

function normalizeColumnCandidate(value: string): string {
  return value
    .replace(/\/\*.*?\*\//g, " ")
    .replace(/--.*$/g, " ")
    .replace(/^\s*[,()]+/, "")
    .replace(/[,;()]+\s*$/g, "")
    .trim();
}

function columnNameFromLine(line: string): string {
  const normalized = normalizeColumnCandidate(line);
  if (!normalized) {
    return "";
  }

  const lower = normalized.toLowerCase();
  if (lower.startsWith("/*") || lower.startsWith("--") || lower === "run" || lower === "quit") {
    return "";
  }
  if (/^(select|from|where|group\s+by|order\s+by|having|create\s+table|proc\s+sql|data\s+)/i.test(normalized)) {
    return "";
  }
  if (/^(column|name|variable|varname)\b/i.test(normalized) && /\b(type|format|length|label)\b/i.test(normalized)) {
    return "";
  }

  const aliasMatch = normalized.match(/\bas\s+((?:'[^']+'n)|(?:"[^"]+")|(?:[A-Za-z_][\w#$]*))\s*$/i);
  if (aliasMatch) {
    return cleanColumnToken(aliasMatch[1]);
  }

  const cleaned = normalized.replace(/^\d+\s+/, "");
  const firstToken = cleaned.match(/^('([^']+)'n|"([^"]+)"|[A-Za-z_][\w#$]*(?:\.[A-Za-z_][\w#$]*)?)/);
  if (!firstToken) {
    return "";
  }

  const token = cleanColumnToken(firstToken[1]);
  return SQL_KEYWORDS.has(token.toLowerCase()) ? "" : token;
}

function cleanColumnToken(value: string): string {
  const token = value.trim();
  const sasLiteral = token.match(/^'([^']+)'n$/i);
  if (sasLiteral) {
    return sasLiteral[1].trim();
  }
  const quoted = token.match(/^"([^"]+)"$/);
  if (quoted) {
    return quoted[1].trim();
  }
  return token.includes(".") ? token.split(".").at(-1)?.trim() ?? token : token;
}

export function textToColumnList(value: string): string[] {
  const withoutBlockComments = value.replace(/\/\*[\s\S]*?\*\//g, " ");
  const candidates = withoutBlockComments
    .split(/\r?\n/)
    .flatMap((line) => splitTopLevelCommas(line))
    .map(columnNameFromLine)
    .filter(Boolean);

  return [...new Set(candidates)];
}

export function derivedToText(values: DerivedColumn[]): string {
  return values.map((column) => `${column.name} = ${column.expression}`).join("\n");
}

export function textToDerived(value: string): DerivedColumn[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(/\s*=\s*|\s*:\s*/);
      return {
        name: name.trim(),
        expression: rest.join(" = ").trim() || "TBD"
      };
    })
    .filter((column) => column.name);
}

export function joinKeysToText(values: JoinKey[]): string {
  return values.map((key) => `${key.left} = ${key.right}`).join("\n");
}

export function textToJoinKeys(value: string): JoinKey[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [left, ...rest] = line.split(/\s*=\s*|\s*:\s*/);
      return { left: left.trim(), right: rest.join(" = ").trim() || "TBD", cardinality: "" as const, keyType: "" as const };
    })
    .filter((key) => key.left);
}
