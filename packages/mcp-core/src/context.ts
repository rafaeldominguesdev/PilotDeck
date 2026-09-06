import type { ContextOp } from "./schemas/tools.js";

export type { ContextOp } from "./schemas/tools.js";

type HeadingMatch = {
  start: number;
  end: number;
  level: number;
};

/**
 * Applies a small, markdown-aware patch to a context blob.
 *
 * The section heading stays in place when a section is replaced. Sections are
 * ATX headings (`#` through `######`) and end at the next heading of the same
 * or a higher level. Line operations use exact line content after trimming
 * surrounding whitespace, which makes them useful for markdown lists while
 * preserving the indentation already stored in the blob.
 */
export function applyContextOps(
  source: string | null | undefined,
  operations: readonly ContextOp[],
): string {
  const normalized = normalizeLineEndings(source ?? "");
  const hadTrailingNewline = normalized.endsWith("\n");
  let lines = normalized.split("\n");

  for (const operation of operations) {
    const heading = normalizeHeading(operation.heading);
    const section = findSection(lines, heading);

    if (operation.op === "append_section") {
      if (!section) {
        lines = appendMissingSection(lines, heading, operation.text);
      } else {
        const insertAt = sectionBodyEnd(lines, section);
        lines.splice(insertAt, 0, ...appendBlock(lines, section, operation.text));
      }
      continue;
    }

    if (operation.op === "append_line") {
      if (!section) {
        lines = appendMissingSection(lines, heading, operation.text);
      } else {
        const insertAt = sectionBodyEnd(lines, section);
        lines.splice(insertAt, 0, operation.text);
      }
      continue;
    }

    if (!section) {
      throw new Error(
        `Markdown section "${heading}" was not found for ${operation.op}. Use append_section or append_line to create it.`,
      );
    }

    if (operation.op === "replace_section") {
      lines.splice(section.start + 1, section.end - section.start - 1, ...splitText(operation.text));
      continue;
    }

    if (operation.op === "delete_section") {
      lines.splice(section.start, section.end - section.start);
      continue;
    }

    const lineIndex = lines.findIndex(
      (line, index) =>
        index > section.start &&
        index < section.end &&
        line.trim() === operation.line.trim(),
    );
    if (lineIndex === -1) {
      throw new Error(
        `Line "${operation.line}" was not found in markdown section "${heading}".`,
      );
    }
    lines[lineIndex] = operation.text;
  }

  const result = lines.join("\n");
  return hadTrailingNewline && result.length > 0 && !result.endsWith("\n")
    ? `${result}\n`
    : result;
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function normalizeHeading(value: string): string {
  return value.trim().replace(/^#{1,6}\s+/, "").trim();
}

function headingLine(line: string): { level: number; heading: string } | null {
  const match = /^(#{1,6})[ \t]+(.+?)[ \t]*$/.exec(line);
  if (!match) return null;
  const hashes = match[1] ?? "";
  const heading = match[2] ?? "";
  return { level: hashes.length, heading: normalizeHeading(heading) };
}

function findSection(lines: readonly string[], heading: string): HeadingMatch | null {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined) continue;
    const parsed = headingLine(line);
    if (!parsed || parsed.heading !== heading) continue;

    let end = index + 1;
    while (end < lines.length) {
      const nextLine = lines[end];
      if (nextLine === undefined) break;
      const next = headingLine(nextLine);
      if (next && next.level <= parsed.level) break;
      end += 1;
    }
    return { start: index, end, level: parsed.level };
  }
  return null;
}

function splitText(value: string): string[] {
  return normalizeLineEndings(value).split("\n");
}

function appendMissingSection(
  lines: string[],
  heading: string,
  text: string,
): string[] {
  const next = [...lines];
  while (next.length > 0 && next[next.length - 1] === "") next.pop();
  if (next.length > 0) next.push("");
  next.push(`## ${heading}`, "", ...splitText(text));
  return next;
}

function sectionBodyEnd(lines: readonly string[], section: HeadingMatch): number {
  let end = section.end;
  while (end > section.start + 1 && lines[end - 1] === "") end -= 1;
  return end;
}

function appendBlock(
  lines: readonly string[],
  section: HeadingMatch,
  text: string,
): string[] {
  const bodyEnd = sectionBodyEnd(lines, section);
  const needsSeparator = bodyEnd > section.start + 1 && lines[bodyEnd - 1] !== "";
  return [...(needsSeparator ? [""] : []), ...splitText(text)];
}
