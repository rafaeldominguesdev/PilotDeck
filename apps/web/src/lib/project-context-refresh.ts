import { createHash } from "node:crypto";
import {
  project,
  projectContextAudit,
  workspace,
  type Database,
  type ProjectContextSource,
} from "@pilotdeck/db";
import { and, asc, eq } from "drizzle-orm";
import {
  appendReleaseContext,
  compareReleaseTags,
  mergeContextFile,
  parseGitHubContextFile,
  parseGitHubRepo,
  shouldAdvanceVersion,
  type ProjectRelease,
} from "./project-context";

const GITHUB_API_ROOT = "https://api.github.com";
const REQUEST_TIMEOUT_MS = 8_000;

type ContextDb = Pick<Database, "select" | "insert" | "update">;
type ProjectRow = typeof project.$inferSelect;

export type ProjectContextRefreshDependencies = {
  fetch?: typeof fetch;
  now?: () => Date;
  actor?: string;
  githubToken?: string | null;
};

export type ProjectContextRefreshResult = {
  project: ProjectRow;
  updated: boolean;
  updates: number;
};

type GithubReleasePayload = {
  id?: unknown;
  tag_name?: unknown;
  name?: unknown;
  body?: unknown;
  prerelease?: unknown;
  published_at?: unknown;
  html_url?: unknown;
};

function requestHeaders(token: string | null | undefined): HeadersInit {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
  };
  if (token?.trim()) headers.authorization = `Bearer ${token.trim()}`;
  return headers;
}

async function githubJson(
  url: string,
  token: string | null | undefined,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  try {
    const response = await fetchImpl(url, {
      headers: requestHeaders(token),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const body = await response.text();
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body;
    }
  } catch {
    return null;
  }
}

function releaseFromPayload(
  value: unknown,
  repository: string,
): ProjectRelease | null {
  if (!value || typeof value !== "object") return null;
  const row = value as GithubReleasePayload;
  const tagName = typeof row.tag_name === "string" ? row.tag_name.trim() : "";
  if (!tagName) return null;
  return {
    id:
      typeof row.id === "string" || typeof row.id === "number" ? row.id : null,
    repository,
    tagName,
    name: typeof row.name === "string" ? row.name : null,
    body: typeof row.body === "string" ? row.body : null,
    prerelease: row.prerelease === true,
    publishedAt: typeof row.published_at === "string" ? row.published_at : null,
    url: typeof row.html_url === "string" ? row.html_url : null,
  };
}

async function fetchReleases(
  source: ProjectContextSource,
  token: string | null | undefined,
  fetchImpl: typeof fetch,
): Promise<ProjectRelease[]> {
  if (!source.releasesRepo) return [];
  const repo = parseGitHubRepo(source.releasesRepo);
  if (!repo) return [];
  const raw = await githubJson(
    `${GITHUB_API_ROOT}/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/releases?per_page=50`,
    token,
    fetchImpl,
  );
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => releaseFromPayload(item, `${repo.owner}/${repo.repo}`))
    .filter((item): item is ProjectRelease => Boolean(item))
    .sort((left, right) => {
      const a = left.publishedAt ?? "";
      const b = right.publishedAt ?? "";
      return a.localeCompare(b) || compareReleaseTags(left.tagName, right.tagName);
    });
}

async function fetchContextFile(
  source: ProjectContextSource,
  token: string | null | undefined,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  if (!source.contextFile) return null;
  const ref = parseGitHubContextFile(source.contextFile);
  if (!ref) return null;
  const raw = await githubJson(
    `${GITHUB_API_ROOT}/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/contents/${ref.path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    token,
    fetchImpl,
  );
  if (typeof raw === "string") return raw;
  if (!raw || typeof raw !== "object") return null;
  const content = (raw as { content?: unknown }).content;
  if (typeof content !== "string") return null;
  try {
    return Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf8");
  } catch {
    return null;
  }
}

function sourceRefForRelease(release: ProjectRelease): string {
  const identity = release.id == null ? release.tagName : String(release.id);
  return `${release.repository}:${identity}`;
}

function sourceRefForFile(source: ProjectContextSource, markdown: string): string {
  const digest = createHash("sha256").update(markdown).digest("hex");
  return `${source.contextFile ?? "context-file"}:${digest}`;
}

async function workspaceToken(
  db: ContextDb,
  workspaceId: string,
  override?: string | null,
): Promise<string | null> {
  if (override !== undefined) return override;
  const [row] = await db
    .select({ githubToken: workspace.githubToken })
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1);
  return row?.githubToken ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? null;
}

async function findProject(
  db: ContextDb,
  workspaceId: string,
  projectId: string,
): Promise<ProjectRow | null> {
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.workspaceId, workspaceId)))
    .limit(1);
  return row ?? null;
}

async function audited(
  db: ContextDb,
  projectId: string,
  source: string,
  sourceRef: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: projectContextAudit.id })
    .from(projectContextAudit)
    .where(
      and(
        eq(projectContextAudit.projectId, projectId),
        eq(projectContextAudit.source, source),
        eq(projectContextAudit.sourceRef, sourceRef),
      ),
    )
    .limit(1);
  return Boolean(row);
}

async function applyRelease(
  db: ContextDb,
  row: ProjectRow,
  release: ProjectRelease,
  deps: Required<Pick<ProjectContextRefreshDependencies, "now" | "actor">>,
): Promise<boolean> {
  const sourceRef = sourceRefForRelease(release);
  if (await audited(db, row.id, "github_release", sourceRef)) return false;

  const generated = appendReleaseContext(row.context, release);
  const prerelease = release.prerelease === true;
  const patch: Partial<typeof project.$inferInsert> = {
    contextUpdatedAt: deps.now(),
  };
  if (generated.changed) patch.context = generated.context;

  if (prerelease) {
    if (shouldAdvanceVersion(row.latestPrerelease, release.tagName)) {
      patch.latestPrerelease = release.tagName;
    }
  } else if (shouldAdvanceVersion(row.currentVersion, release.tagName)) {
    patch.currentVersion = release.tagName;
  }

  const [updated] = await db
    .update(project)
    .set(patch)
    .where(eq(project.id, row.id))
    .returning();
  if (!updated) return false;

  await db.insert(projectContextAudit).values({
    projectId: row.id,
    source: "github_release",
    sourceRef,
    version: release.tagName,
    prerelease,
    summary: release.body?.trim() || null,
    actor: deps.actor,
  });
  Object.assign(row, updated);
  return true;
}

async function applyContextFile(
  db: ContextDb,
  row: ProjectRow,
  source: ProjectContextSource,
  markdown: string,
  deps: Required<Pick<ProjectContextRefreshDependencies, "now" | "actor">>,
): Promise<boolean> {
  const merged = mergeContextFile(row.context, markdown);
  if (!merged.changed) return false;
  const sourceRef = sourceRefForFile(source, markdown);
  if (await audited(db, row.id, "context_file", sourceRef)) return false;
  const [updated] = await db
    .update(project)
    .set({ context: merged.context, contextUpdatedAt: deps.now() })
    .where(eq(project.id, row.id))
    .returning();
  if (!updated) return false;
  await db.insert(projectContextAudit).values({
    projectId: row.id,
    source: "context_file",
    sourceRef,
    version: null,
    prerelease: false,
    summary: "project context file refreshed",
    actor: deps.actor,
  });
  Object.assign(row, updated);
  return true;
}

/** Applies one webhook release to a project, idempotently. */
export async function applyProjectRelease(
  db: ContextDb,
  row: ProjectRow,
  release: ProjectRelease,
  deps: ProjectContextRefreshDependencies = {},
): Promise<ProjectContextRefreshResult> {
  const now = deps.now ?? (() => new Date());
  const actor = deps.actor ?? "github";
  const updated = await applyRelease(db, row, release, { now, actor });
  return { project: row, updated, updates: updated ? 1 : 0 };
}

/** Pulls all configured GitHub sources once and records every unseen change. */
export async function refreshProjectContext(
  db: ContextDb,
  workspaceId: string,
  projectId: string,
  deps: ProjectContextRefreshDependencies = {},
): Promise<ProjectContextRefreshResult | null> {
  const row = await findProject(db, workspaceId, projectId);
  if (!row) return null;
  const source = row.contextSource;
  if (!source) return { project: row, updated: false, updates: 0 };

  const fetchImpl = deps.fetch ?? fetch;
  const token = await workspaceToken(db, workspaceId, deps.githubToken);
  const now = deps.now ?? (() => new Date());
  const actor = deps.actor ?? "github";
  let updates = 0;

  for (const release of await fetchReleases(source, token, fetchImpl)) {
    if (await applyRelease(db, row, release, { now, actor })) updates += 1;
  }

  const file = await fetchContextFile(source, token, fetchImpl);
  if (file !== null && (await applyContextFile(db, row, source, file, { now, actor }))) {
    updates += 1;
  }

  const [fresh] = await db
    .select()
    .from(project)
    .where(eq(project.id, row.id))
    .limit(1);
  return {
    project: fresh ?? row,
    updated: updates > 0,
    updates,
  };
}

/** Projects with a daily source are refreshed by the board's daily pass. */
export async function refreshDailyProjectContexts(
  db: ContextDb,
  workspaceId: string,
  deps: ProjectContextRefreshDependencies = {},
): Promise<ProjectContextRefreshResult[]> {
  const rows = await db
    .select()
    .from(project)
    .where(eq(project.workspaceId, workspaceId))
    .orderBy(asc(project.createdAt));
  const now = (deps.now ?? (() => new Date()))();
  const due = rows.filter((row) => {
    if (row.contextSource?.refresh !== "daily") return false;
    return !row.contextUpdatedAt || now.getTime() - row.contextUpdatedAt.getTime() >= 86_400_000;
  });
  const results: ProjectContextRefreshResult[] = [];
  for (const row of due) {
    const result = await refreshProjectContext(db, workspaceId, row.id, { ...deps, now: () => now });
    if (result) results.push(result);
  }
  return results;
}
