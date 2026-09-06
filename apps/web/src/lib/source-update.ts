/**
 * The update a source install can actually perform on itself.
 *
 * A checkout has no image to pull and no container to recreate, but the
 * process already owns the repository and the rights to change it, so the
 * button does not have to print commands: it can run them. This module is the
 * whole decision tree, with every command it runs injected, so the rules the
 * panel promises (refuse a dirty tree, skip an install nothing changed, say
 * honestly what happens to the process) are testable without touching a real
 * repository or a real server.
 *
 * Nothing here imports node: the action wires the real `git` and `pnpm`.
 */

export type ExecResult = { code: number; stdout: string; stderr: string };

/** Runs one command and resolves with its result, never throwing. */
export type Exec = (
  command: string,
  args: readonly string[],
  cwd: string,
) => Promise<ExecResult>;

/** How the server process was started, which decides the restart step. */
export type ProcessMode = "dev" | "production";

export type StepId = "pull" | "install" | "build" | "migrate" | "restart";

export type StepStatus = "ok" | "skipped" | "failed";

/**
 * Prose results the panel translates. Command output stays raw in `detail`;
 * anything the runner concludes on its own gets a key instead, so the log
 * reads in the owner's language.
 */
export type StepNote =
  | "pull-current"
  | "install-unchanged"
  | "build-unchanged"
  | "restart-dev"
  | "restart-exit"
  | "restart-manual";

export type UpdateStep = {
  id: StepId;
  status: StepStatus;
  /** Tail of what the command printed. Empty when the step ran none. */
  detail: string;
  note?: StepNote;
};

/** Why the runner would not start. Each one is shown as its own sentence. */
export type RefusalReason = "not-a-checkout" | "dirty-tree";

/** What the caller has to do with the process once the steps are done. */
export type RestartPlan =
  /** `next dev` picks the new code up by itself. */
  | "reload"
  /** Opt-in is on: exit cleanly and let the supervisor bring it back. */
  | "exit"
  /** Nobody here may restart this process: ask its owner. */
  | "manual";

export type SourceUpdateReport = {
  outcome: "updated" | "current" | "refused" | "failed";
  steps: UpdateStep[];
  /** Set only when the outcome is `refused`. */
  reason?: RefusalReason;
  /** Raw context for a refusal: the dirty paths, or git's own error. */
  detail?: string;
  /** Commit the instance was on, and the one it ended on. */
  from: string | null;
  to: string | null;
  /** Null when no step ran, so the caller never exits on a refusal. */
  restart: RestartPlan | null;
};

export type SourceUpdateDeps = {
  exec: Exec;
  /** Where to start looking for the repository, usually the process cwd. */
  cwd: string;
  mode: ProcessMode;
  /** PILOTDECK_RESTART_ON_UPDATE is set: exiting for a supervisor is allowed. */
  restartOptIn: boolean;
  /**
   * Run every step even when the pull moved nothing. This is how an instance
   * that is broken, or ahead of the tag it reports, is repaired.
   */
  force?: boolean;
};

/**
 * Opt-in that lets the update end a production process so whatever supervises
 * it starts it again. Without a supervisor that is a board that never comes
 * back, which is why it is off unless the owner says otherwise.
 */
export const RESTART_ENV = "PILOTDECK_RESTART_ON_UPDATE";

const OFF_WORDS = new Set(["", "0", "false", "off", "no"]);

/** Reads the opt-in, treating the usual ways of writing "no" as no. */
export function restartOptInFrom(raw: string | undefined | null): boolean {
  return !OFF_WORDS.has((raw ?? "").trim().toLowerCase());
}

/** Package whose build output the app imports from dist instead of source. */
const BUILT_PACKAGE = "packages/mcp-core/";

/** How much command output the panel is willing to carry back. */
const MAX_DETAIL_LINES = 12;
const MAX_DETAIL_CHARS = 2000;

/**
 * Last lines of a command's output, stderr included, because git and pnpm put
 * the sentence that explains a failure there.
 */
export function tail(result: ExecResult): string {
  const merged = [result.stdout, result.stderr]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n");
  const lines = merged.split("\n").slice(-MAX_DETAIL_LINES).join("\n");
  return lines.length > MAX_DETAIL_CHARS
    ? `${lines.slice(-MAX_DETAIL_CHARS)}`
    : lines;
}

function short(ref: string): string {
  return ref.trim().slice(0, 12);
}

/**
 * Whether a pull that touched these paths needs dependencies installed again.
 * The lockfile is the honest signal, but a manifest edited without relocking
 * still changes what has to be linked, so both count.
 */
export function needsInstall(changed: readonly string[]): boolean {
  return changed.some(
    (path) =>
      path === "pnpm-lock.yaml" ||
      path === "package.json" ||
      path.endsWith("/package.json"),
  );
}

/** Whether the package the app imports from dist changed and must be rebuilt. */
export function needsBuild(changed: readonly string[]): boolean {
  return changed.some((path) => path.startsWith(BUILT_PACKAGE));
}

function refuse(
  reason: RefusalReason,
  detail: string,
): SourceUpdateReport {
  return {
    outcome: "refused",
    reason,
    detail,
    steps: [],
    from: null,
    to: null,
    restart: null,
  };
}

/**
 * The whole update, step by step. It stops at the first failure and never
 * leaves the caller guessing what to do with the process: `restart` says it.
 */
export async function runSourceUpdate(
  deps: SourceUpdateDeps,
): Promise<SourceUpdateReport> {
  const { exec, cwd, force = false } = deps;

  // Where the repository actually is. The web app runs from apps/web, so the
  // root has to be asked for rather than assumed, and a non-zero answer means
  // this install was copied out of git and cannot be pulled at all.
  const top = await exec("git", ["rev-parse", "--show-toplevel"], cwd);
  if (top.code !== 0) return refuse("not-a-checkout", tail(top));
  const root = top.stdout.trim();
  if (!root) return refuse("not-a-checkout", tail(top));

  // A dirty tree is refused rather than merged over: local edits are somebody's
  // work, and a pull that stashes or discards them is a worse outcome than a
  // button that declines and says which files are in the way.
  const status = await exec("git", ["status", "--porcelain"], root);
  if (status.code !== 0) return refuse("not-a-checkout", tail(status));
  const dirty = status.stdout.trim();
  if (dirty) return refuse("dirty-tree", tail(status));

  const steps: UpdateStep[] = [];
  const headBefore = await exec("git", ["rev-parse", "HEAD"], root);
  const from = headBefore.code === 0 ? headBefore.stdout.trim() : null;

  const pull = await exec("git", ["pull", "--ff-only"], root);
  if (pull.code !== 0) {
    steps.push({ id: "pull", status: "failed", detail: tail(pull) });
    return { outcome: "failed", steps, from, to: from, restart: null };
  }

  const headAfter = await exec("git", ["rev-parse", "HEAD"], root);
  const to = headAfter.code === 0 ? headAfter.stdout.trim() : null;
  const moved = Boolean(from && to && from !== to);

  if (!moved && !force) {
    steps.push({ id: "pull", status: "skipped", detail: "", note: "pull-current" });
    return { outcome: "current", steps, from, to, restart: null };
  }

  steps.push(
    moved
      ? {
          id: "pull",
          status: "ok",
          detail: from && to ? `${short(from)} → ${short(to)}` : tail(pull),
        }
      : { id: "pull", status: "skipped", detail: "", note: "pull-current" },
  );

  // What the pull brought decides the next two steps. A forced run that moved
  // nothing has no diff to read, so it rebuilds everything on purpose: that is
  // the point of forcing.
  let changed: string[] = [];
  if (moved && from && to) {
    const diff = await exec("git", ["diff", "--name-only", from, to], root);
    changed = diff.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  const runEverything = force && !moved;

  if (runEverything || needsInstall(changed)) {
    const install = await exec("pnpm", ["install", "--frozen-lockfile"], root);
    steps.push({
      id: "install",
      status: install.code === 0 ? "ok" : "failed",
      detail: tail(install),
    });
    if (install.code !== 0) {
      return { outcome: "failed", steps, from, to, restart: null };
    }
  } else {
    steps.push({
      id: "install",
      status: "skipped",
      detail: "",
      note: "install-unchanged",
    });
  }

  if (runEverything || needsBuild(changed)) {
    const build = await exec(
      "pnpm",
      ["--filter", "@pilotdeck/mcp-core", "build"],
      root,
    );
    steps.push({
      id: "build",
      status: build.code === 0 ? "ok" : "failed",
      detail: tail(build),
    });
    if (build.code !== 0) {
      return { outcome: "failed", steps, from, to, restart: null };
    }
  } else {
    steps.push({
      id: "build",
      status: "skipped",
      detail: "",
      note: "build-unchanged",
    });
  }

  // Migrations are always offered to the migrator, never guessed at from the
  // diff: it keeps its own journal and applies exactly what is pending, which
  // also repairs an instance that missed one on an earlier update.
  const migrate = await exec(
    "pnpm",
    ["--filter", "@pilotdeck/db", "migrate"],
    root,
  );
  steps.push({
    id: "migrate",
    status: migrate.code === 0 ? "ok" : "failed",
    detail: tail(migrate),
  });
  if (migrate.code !== 0) {
    return { outcome: "failed", steps, from, to, restart: null };
  }

  const restart = planRestart(deps.mode, deps.restartOptIn);
  steps.push({
    id: "restart",
    // Only the manual plan leaves something undone, so only it is a skip.
    status: restart === "manual" ? "skipped" : "ok",
    detail: "",
    note:
      restart === "reload"
        ? "restart-dev"
        : restart === "exit"
          ? "restart-exit"
          : "restart-manual",
  });

  return { outcome: "updated", steps, from, to, restart };
}

/**
 * What happens to the process after the code changed. Killing a production
 * server is only safe where something is watching to bring it back, and this
 * cannot be inferred, so it stays an explicit opt-in and the honest default is
 * to ask.
 */
export function planRestart(
  mode: ProcessMode,
  restartOptIn: boolean,
): RestartPlan {
  if (mode === "dev") return "reload";
  return restartOptIn ? "exit" : "manual";
}
