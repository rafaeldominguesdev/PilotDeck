/**
 * Pure helpers for project-context synchronization. Network and database
 * effects live in project-context-refresh.ts so release fixtures can exercise
 * the merge and stable/prerelease rules without a running server.
 */

export const RELEASE_CONTEXT_START_MARKER =
  "<!-- pilotdeck:release-context:start -->";
export const RELEASE_CONTEXT_END_MARKER =
  "<!-- pilotdeck:release-context:end -->";
export const FILE_CONTEXT_START_MARKER =
  "<!-- pilotdeck:context-file:start -->";
export const FILE_CONTEXT_END_MARKER =
  "<!-- pilotdeck:context-file:end -->";

/** Backwards-friendly aliases for callers that only have one managed block. */
export const MANAGED_CONTEXT_START_MARKER = RELEASE_CONTEXT_START_MARKER;
export const MANAGED_CONTEXT_END_MARKER = RELEASE_CONTEXT_END_MARKER;

export type ProjectRelease = {
  id?: string | number | null;
  repository: string;
  tagName: string;
  name?: string | null;
  body?: string | null;
  prerelease?: boolean;
  publishedAt?: string | null;
  url?: string | null;
};

export type ManagedMarkers = {
  start: string;
  end: string;
};

export const RELEASE_CONTEXT_MARKERS: ManagedMarkers = {
  start: RELEASE_CONTEXT_START_MARKER,
  end: RELEASE_CONTEXT_END_MARKER,
};

export const FILE_CONTEXT_MARKERS: ManagedMarkers = {
  start: FILE_CONTEXT_START_MARKER,
  end: FILE_CONTEXT_END_MARKER,
};

/** The `owner/repo` part of a GitHub source, or null for malformed input. */
export function parseGitHubRepo(value: string): { owner: string; repo: string } | null {
  const raw = value.trim().replace(/^https?:\/\/github\.com\//i, "");
  const parts = raw.replace(/\.git$/, "").split("/").filter(Boolean);
  if (parts.length !== 2 || parts.some((part) => /[\s:]/.test(part))) return null;
  const owner = parts[0];
  const repo = parts[1];
  return owner && repo ? { owner, repo } : null;
}
/** Parses `owner/repo:path/to/context.md`. */
export function parseGitHubContextFile(
  value: string,
): { owner: string; repo: string; path: string } | null {
  const separator = value.indexOf(":");
  if (separator <= 0) return null;
  const repo = parseGitHubRepo(value.slice(0, separator));
  const path = value.slice(separator + 1).trim().replace(/^\/+/, "");
  if (!repo || !path || path.includes("..")) return null;
  return { ...repo, path };
}

function managedBounds(text: string, markers: ManagedMarkers): [number, number] | null {
  const start = text.indexOf(markers.start);
  if (start < 0) return null;
  const contentStart = start + markers.start.length;
  const end = text.indexOf(markers.end, contentStart);
  return end < 0 ? [start, text.length] : [start, end + markers.end.length];
}

/**
 * Replaces only one marked section. Text outside the markers is never touched;
 * an unmarked document gets the managed block appended to its end.
 */
export function replaceManagedContext(
  existing: string | null | undefined,
  managed: string,
  markers: ManagedMarkers = RELEASE_CONTEXT_MARKERS,
): string {
  const current = existing ?? "";
  const block = [markers.start, managed.trim(), markers.end]
    .filter(Boolean)
    .join("\n");
  const bounds = managedBounds(current, markers);
  if (bounds) {
    const [start, end] = bounds;
    const before = current.slice(0, start).replace(/\s+$/, "");
    const after = current.slice(end).replace(/^\s+/, "");
    return [before, block, after].filter(Boolean).join("\n\n");
  }
  return current.trim()
    ? `${current.trimEnd()}\n\n${block}\n`
    : `${block}\n`;
}

function managedBody(
  existing: string | null | undefined,
  markers: ManagedMarkers,
): string {
  const current = existing ?? "";
  const bounds = managedBounds(current, markers);
  if (!bounds) return "";
  return current
    .slice(bounds[0] + markers.start.length, bounds[1] - markers.end.length)
    .trim();
}

/** Adds one release block while retaining prior generated release notes. */
export function appendReleaseContext(
  existing: string | null | undefined,
  release: Pick<ProjectRelease, "tagName" | "body" | "name">,
): { context: string; changed: boolean } {
  const tag = release.tagName.trim();
  const heading = `## O que a versão ${tag} corrigiu`;
  const body = summarizeReleaseNotes(release.body ?? "");
  const block = [heading, "", body].join("\n");
  const prior = managedBody(existing, RELEASE_CONTEXT_MARKERS);
  if (prior.split("\n").some((line) => line.trim() === heading)) {
    return { context: existing?.trimEnd() ? `${existing.trimEnd()}\n` : "", changed: false };
  }
  const next = prior ? `${prior}\n\n${block}` : block;
  return {
    context: replaceManagedContext(existing, next, RELEASE_CONTEXT_MARKERS),
    changed: true,
  };
}

/** Replaces the context-file section and leaves hand-written prose intact. */
export function mergeContextFile(
  existing: string | null | undefined,
  fileMarkdown: string,
): { context: string; changed: boolean } {
  const next = fileMarkdown.trim();
  const current = existing?.trim() ?? "";
  const previous = managedBody(current, FILE_CONTEXT_MARKERS);
  if (previous === next) return { context: current ? `${current}\n` : "", changed: false };
  return {
    context: replaceManagedContext(current, next, FILE_CONTEXT_MARKERS),
    changed: true,
  };
}

/** Keep raw release notes useful without requiring an LLM or changing facts. */
export function summarizeReleaseNotes(raw: string, maxChars = 4_000): string {
  const normalized = raw
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
  if (!normalized) return "Sem notas de release.";
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

type ParsedVersion = {
  core: [number, number, number];
  prerelease: string[];
};

function parsedVersion(value: string): ParsedVersion | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(value.trim());
  if (!match) return null;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]?.split(".") ?? [],
  };
}

/** Semver-ish comparison used to avoid moving stable state backwards. */
export function compareReleaseTags(left: string, right: string): number {
  const a = parsedVersion(left);
  const b = parsedVersion(right);
  if (!a || !b) return left.localeCompare(right);
  for (let index = 0; index < a.core.length; index += 1) {
    if (a.core[index] !== b.core[index]) {
      return a.core[index] > b.core[index] ? 1 : -1;
    }
  }
  if (a.prerelease.length === 0 && b.prerelease.length > 0) return 1;
  if (a.prerelease.length > 0 && b.prerelease.length === 0) return -1;
  for (let index = 0; index < Math.max(a.prerelease.length, b.prerelease.length); index += 1) {
    const av = a.prerelease[index];
    const bv = b.prerelease[index];
    if (av === undefined) return -1;
    if (bv === undefined) return 1;
    if (av === bv) continue;
    const an = /^\d+$/.test(av) ? Number(av) : null;
    const bn = /^\d+$/.test(bv) ? Number(bv) : null;
    if (an !== null && bn !== null) return an > bn ? 1 : -1;
    if (an !== null) return -1;
    if (bn !== null) return 1;
    return av.localeCompare(bv);
  }
  return 0;
}

export function shouldAdvanceVersion(
  current: string | null | undefined,
  candidate: string,
): boolean {
  if (!current?.trim()) return true;
  return compareReleaseTags(candidate, current) > 0;
}
