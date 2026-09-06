import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

/** Stable copy shown to a reviewer when a delivery cannot be proved remote. */
export const DELIVERY_UNVERIFIED_WARNING = "commit não encontrado no remoto";

export type DeliveryVerificationStatus = "verified" | "unverified" | null;

export type DeliveryVerificationResult = {
  status: DeliveryVerificationStatus;
  unverified: boolean;
  warning: string | null;
};

type JsonRecord = Record<string, unknown>;

type VerifyDependencies = {
  fetch?: typeof fetch;
  git?: (args: string[]) => Promise<string>;
};

const VERIFIED: DeliveryVerificationResult = {
  status: "verified",
  unverified: false,
  warning: null,
};

const NOT_CHECKED: DeliveryVerificationResult = {
  status: null,
  unverified: false,
  warning: null,
};

function unverified(): DeliveryVerificationResult {
  return {
    status: "unverified",
    unverified: true,
    warning: DELIVERY_UNVERIFIED_WARNING,
  };
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" ? (value as JsonRecord) : null;
}

function asSha(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;
}

function normalizedBranch(value: string): string {
  return value
    .trim()
    .replace(/^refs\/heads\//, "")
    .replace(/^refs\/remotes\/origin\//, "");
}

function matchesSha(actual: string | null, expected: string): boolean {
  if (!actual) return false;
  const wanted = expected.trim().toLowerCase();
  return actual === wanted || actual.startsWith(wanted);
}

function githubRepository(repoUrl: string): { owner: string; repo: string } | null {
  const ssh = /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i.exec(repoUrl.trim());
  if (ssh?.[1] && ssh[2]) return { owner: ssh[1], repo: ssh[2] };
  try {
    const parsed = new URL(repoUrl);
    if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "github.com") {
      return null;
    }
    // A credential embedded in a project URL is not sent to the GitHub API.
    if (parsed.username || parsed.password) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) return null;
    const owner = parts[0];
    const repo = parts[1]?.replace(/\.git$/, "");
    return owner && repo ? { owner, repo } : null;
  } catch {
    return null;
  }
}

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
  };
  // The token is read for the request only and is never part of a returned
  // error or diagnostic. Public repositories work without it.
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;
  return headers;
}

async function githubJson(
  url: string,
  fetchImpl: typeof fetch,
): Promise<JsonRecord | null> {
  try {
    const response = await fetchImpl(url, {
      headers: githubHeaders(),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    return asRecord(await response.json());
  } catch {
    return null;
  }
}

async function verifyGithub(
  repo: { owner: string; repo: string },
  commit: string,
  branch: string,
  fetchImpl: typeof fetch,
): Promise<DeliveryVerificationResult> {
  const root = `https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`;
  const commitRow = await githubJson(
    `${root}/commits/${encodeURIComponent(commit)}`,
    fetchImpl,
  );
  const commitSha = asSha(commitRow?.sha);
  if (!commitSha || !matchesSha(commitSha, commit)) return unverified();

  const branchName = normalizedBranch(branch);
  if (!branchName) return unverified();
  const branchRow = await githubJson(
    `${root}/branches/${encodeURIComponent(branchName)}`,
    fetchImpl,
  );
  const branchSha = asSha(asRecord(branchRow?.commit)?.sha ?? branchRow?.sha);
  if (matchesSha(branchSha, commitSha)) return VERIFIED;
  if (!branchSha) return unverified();

  // A branch may have moved on since the delivered commit. GitHub's compare
  // endpoint answers the ancestry question without cloning the repository.
  const comparison = await githubJson(
    `${root}/compare/${encodeURIComponent(commit)}...${encodeURIComponent(branchName)}`,
    fetchImpl,
  );
  const status = comparison?.status;
  return status === "ahead" || status === "identical" ? VERIFIED : unverified();
}

async function defaultGit(args: string[]): Promise<string> {
  const result = await execFile("git", args, {
    timeout: 15_000,
    maxBuffer: 512 * 1024,
    windowsHide: true,
  });
  return result.stdout;
}

function outputLines(raw: string): Array<{ sha: string; ref: string }> {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/, 2))
    .filter((parts): parts is [string, string] => parts.length === 2)
    .map(([sha, ref]) => ({ sha: sha.toLowerCase(), ref }));
}

async function verifyGeneric(
  repoUrl: string,
  commit: string,
  branch: string,
  git: (args: string[]) => Promise<string>,
): Promise<DeliveryVerificationResult> {
  const branchName = normalizedBranch(branch);
  if (!branchName) return unverified();

  try {
    const advertised = outputLines(
      await git(["ls-remote", "--refs", "--", repoUrl, `refs/heads/${branchName}`]),
    );
    const branchHead = advertised.find(
      (line) => line.ref === `refs/heads/${branchName}`,
    )?.sha;
    if (matchesSha(branchHead ?? null, commit)) return VERIFIED;

    // The branch can contain an older commit that is not its tip. Fetch only
    // the requested branch and omit blobs, then ask Git whether the commit is
    // an ancestor. A conservative failure remains an accepted, flagged handoff.
    const temp = await mkdtemp(join(tmpdir(), "pilotdeck-delivery-"));
    try {
      await git(["-C", temp, "init", "--quiet"]);
      try {
        await git([
          "-C",
          temp,
          "fetch",
          "--no-tags",
          "--filter=blob:none",
          "--",
          repoUrl,
          `refs/heads/${branchName}`,
        ]);
      } catch {
        await git([
          "-C",
          temp,
          "fetch",
          "--no-tags",
          "--depth=256",
          "--",
          repoUrl,
          `refs/heads/${branchName}`,
        ]);
      }
      await git(["-C", temp, "cat-file", "-e", "--", `${commit}^{commit}`]);
      await git([
        "-C",
        temp,
        "merge-base",
        "--is-ancestor",
        "--",
        commit,
        "FETCH_HEAD",
      ]);
      return VERIFIED;
    } finally {
      await rm(temp, { recursive: true, force: true }).catch(() => undefined);
    }
  } catch {
    return unverified();
  }
}

/**
 * Verifies a delivery when the project has a remote. A project without a
 * remote is deliberately not checked: there is no claim to make about where
 * its commit should be reachable. All remote failures are advisory so a
 * network outage never destroys an otherwise useful handoff.
 */
export async function verifyDelivery(
  input: {
    repoUrl?: string | null;
    commit?: string | null;
    branch?: string | null;
  },
  dependencies: VerifyDependencies = {},
): Promise<DeliveryVerificationResult> {
  const repoUrl = input.repoUrl?.trim();
  if (!repoUrl) return NOT_CHECKED;
  const commit = input.commit?.trim();
  const branch = input.branch?.trim();
  if (!commit || !branch) return unverified();

  const github = githubRepository(repoUrl);
  if (github) {
    return verifyGithub(github, commit, branch, dependencies.fetch ?? fetch);
  }
  return verifyGeneric(repoUrl, commit, branch, dependencies.git ?? defaultGit);
}
