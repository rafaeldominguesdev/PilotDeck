import { describe, expect, it } from "vitest";
import {
  needsBuild,
  needsInstall,
  planRestart,
  restartOptInFrom,
  runSourceUpdate,
  type Exec,
  type ExecResult,
  type SourceUpdateDeps,
} from "./source-update";

const ok = (stdout = ""): ExecResult => ({ code: 0, stdout, stderr: "" });
const fail = (stderr: string): ExecResult => ({ code: 1, stdout: "", stderr });

const HEAD_OLD = "1111111111111111111111111111111111111111";
const HEAD_NEW = "2222222222222222222222222222222222222222";

type Script = {
  /** Answers by "command arg arg", falling back to a clean success. */
  answers?: Record<string, ExecResult | ExecResult[]>;
  calls: string[];
  cwds: string[];
};

/**
 * A repository that answers whatever the test says, records every command and
 * treats anything unscripted as a clean success. Two HEAD reads are needed per
 * run, so an array answer is consumed in order.
 */
function repo(answers: Script["answers"] = {}): Script & { exec: Exec } {
  const script: Script = { answers, calls: [], cwds: [] };
  const remaining = new Map<string, ExecResult[]>(
    Object.entries(answers).map(([key, value]) => [
      key,
      Array.isArray(value) ? [...value] : [value],
    ]),
  );
  const exec: Exec = async (command, args, cwd) => {
    const key = [command, ...args].join(" ");
    script.calls.push(key);
    script.cwds.push(cwd);
    const queue = remaining.get(key);
    if (!queue?.length) return ok();
    return queue.length === 1 ? queue[0] : (queue.shift() as ExecResult);
  };
  return { ...script, exec, get calls() { return script.calls; }, get cwds() { return script.cwds; } };
}

function deps(exec: Exec, over: Partial<SourceUpdateDeps> = {}): SourceUpdateDeps {
  return {
    exec,
    cwd: "/srv/board/apps/web",
    mode: "dev",
    restartOptIn: false,
    ...over,
  };
}

const CLEAN_TOPLEVEL = { "git rev-parse --show-toplevel": ok("/srv/board\n") };

describe("the update a source install runs on itself", () => {
  it("refuses to touch a dirty tree and says which files are in the way", async () => {
    const r = repo({
      ...CLEAN_TOPLEVEL,
      "git status --porcelain": ok(" M apps/web/src/app/page.tsx\n?? notes.md\n"),
    });

    const report = await runSourceUpdate(deps(r.exec));

    expect(report.outcome).toBe("refused");
    expect(report.reason).toBe("dirty-tree");
    expect(report.detail).toContain("apps/web/src/app/page.tsx");
    expect(report.steps).toEqual([]);
    expect(report.restart).toBeNull();
    // Nothing was pulled, installed, built or migrated.
    expect(r.calls).toEqual([
      "git rev-parse --show-toplevel",
      "git status --porcelain",
    ]);
  });

  it("refuses when the install is not a checkout at all", async () => {
    const r = repo({
      "git rev-parse --show-toplevel": fail("fatal: not a git repository"),
    });

    const report = await runSourceUpdate(deps(r.exec));

    expect(report.outcome).toBe("refused");
    expect(report.reason).toBe("not-a-checkout");
    expect(report.detail).toContain("not a git repository");
  });

  it("reports the instance is already current and changes nothing", async () => {
    const r = repo({
      ...CLEAN_TOPLEVEL,
      "git status --porcelain": ok(""),
      "git rev-parse HEAD": ok(`${HEAD_OLD}\n`),
      "git pull --ff-only": ok("Already up to date.\n"),
    });

    const report = await runSourceUpdate(deps(r.exec));

    expect(report.outcome).toBe("current");
    expect(report.steps).toEqual([
      { id: "pull", status: "skipped", detail: "", note: "pull-current" },
    ]);
    expect(report.restart).toBeNull();
    expect(r.calls).not.toContain("pnpm install --frozen-lockfile");
    expect(r.calls).not.toContain("pnpm --filter @pilotdeck/db migrate");
  });

  it("runs every step from the repository root when the pull moved HEAD", async () => {
    const r = repo({
      ...CLEAN_TOPLEVEL,
      "git status --porcelain": ok(""),
      "git rev-parse HEAD": [ok(`${HEAD_OLD}\n`), ok(`${HEAD_NEW}\n`)],
      [`git diff --name-only ${HEAD_OLD} ${HEAD_NEW}`]: ok(
        "pnpm-lock.yaml\npackages/mcp-core/src/tools.ts\n",
      ),
    });

    const report = await runSourceUpdate(deps(r.exec));

    expect(report.outcome).toBe("updated");
    expect(report.from).toBe(HEAD_OLD);
    expect(report.to).toBe(HEAD_NEW);
    expect(report.steps.map((s) => [s.id, s.status])).toEqual([
      ["pull", "ok"],
      ["install", "ok"],
      ["build", "ok"],
      ["migrate", "ok"],
      ["restart", "ok"],
    ]);
    expect(r.calls).toContain("pnpm install --frozen-lockfile");
    expect(r.calls).toContain("pnpm --filter @pilotdeck/mcp-core build");
    expect(r.calls).toContain("pnpm --filter @pilotdeck/db migrate");
    // Everything after the root lookup runs in the root, not in apps/web.
    expect(new Set(r.cwds.slice(1))).toEqual(new Set(["/srv/board"]));
  });

  it("skips install and build when the pull touched neither", async () => {
    const r = repo({
      ...CLEAN_TOPLEVEL,
      "git rev-parse HEAD": [ok(`${HEAD_OLD}\n`), ok(`${HEAD_NEW}\n`)],
      [`git diff --name-only ${HEAD_OLD} ${HEAD_NEW}`]: ok(
        "apps/web/src/app/home/page.tsx\ndocs/getting-started.md\n",
      ),
    });

    const report = await runSourceUpdate(deps(r.exec));

    expect(report.outcome).toBe("updated");
    expect(report.steps.find((s) => s.id === "install")).toEqual({
      id: "install",
      status: "skipped",
      detail: "",
      note: "install-unchanged",
    });
    expect(report.steps.find((s) => s.id === "build")?.status).toBe("skipped");
    expect(r.calls).not.toContain("pnpm install --frozen-lockfile");
    // Migrations are still offered: the migrator decides what is pending.
    expect(r.calls).toContain("pnpm --filter @pilotdeck/db migrate");
  });

  it("stops at the first failed step and carries its output back", async () => {
    const r = repo({
      ...CLEAN_TOPLEVEL,
      "git rev-parse HEAD": [ok(`${HEAD_OLD}\n`), ok(`${HEAD_NEW}\n`)],
      [`git diff --name-only ${HEAD_OLD} ${HEAD_NEW}`]: ok("pnpm-lock.yaml\n"),
      "pnpm install --frozen-lockfile": fail("ERR_PNPM_OUTDATED_LOCKFILE"),
    });

    const report = await runSourceUpdate(deps(r.exec));

    expect(report.outcome).toBe("failed");
    expect(report.steps.at(-1)).toMatchObject({
      id: "install",
      status: "failed",
    });
    expect(report.steps.at(-1)?.detail).toContain("ERR_PNPM_OUTDATED_LOCKFILE");
    expect(report.restart).toBeNull();
    expect(r.calls).not.toContain("pnpm --filter @pilotdeck/db migrate");
  });

  it("stops when the pull itself fails and never runs anything after it", async () => {
    const r = repo({
      ...CLEAN_TOPLEVEL,
      "git rev-parse HEAD": ok(`${HEAD_OLD}\n`),
      "git pull --ff-only": fail("fatal: Not possible to fast-forward"),
    });

    const report = await runSourceUpdate(deps(r.exec));

    expect(report.outcome).toBe("failed");
    expect(report.steps).toHaveLength(1);
    expect(report.steps[0]).toMatchObject({ id: "pull", status: "failed" });
    expect(report.steps[0].detail).toContain("fast-forward");
  });

  it("runs the whole pipeline when forced, even with HEAD already current", async () => {
    const r = repo({
      ...CLEAN_TOPLEVEL,
      "git rev-parse HEAD": ok(`${HEAD_OLD}\n`),
      "git pull --ff-only": ok("Already up to date.\n"),
    });

    const report = await runSourceUpdate(deps(r.exec, { force: true }));

    expect(report.outcome).toBe("updated");
    // The pull is honest about having moved nothing, the rest still runs.
    expect(report.steps[0]).toMatchObject({ status: "skipped", note: "pull-current" });
    expect(report.steps.map((s) => [s.id, s.status])).toEqual([
      ["pull", "skipped"],
      ["install", "ok"],
      ["build", "ok"],
      ["migrate", "ok"],
      ["restart", "ok"],
    ]);
  });

  it("still refuses a dirty tree when forced", async () => {
    const r = repo({
      ...CLEAN_TOPLEVEL,
      "git status --porcelain": ok(" M packages/db/src/schema/index.ts\n"),
    });

    const report = await runSourceUpdate(deps(r.exec, { force: true }));

    expect(report.outcome).toBe("refused");
    expect(report.reason).toBe("dirty-tree");
  });
});

describe("what happens to the process once the code changed", () => {
  it("lets next dev reload itself", () => {
    expect(planRestart("dev", false)).toBe("reload");
    expect(planRestart("dev", true)).toBe("reload");
  });

  it("only exits a production process when the owner opted in", () => {
    expect(planRestart("production", false)).toBe("manual");
    expect(planRestart("production", true)).toBe("exit");
  });

  it("marks the manual restart as the one thing left undone", async () => {
    const r = repo({
      ...CLEAN_TOPLEVEL,
      "git rev-parse HEAD": [ok(`${HEAD_OLD}\n`), ok(`${HEAD_NEW}\n`)],
    });

    const report = await runSourceUpdate(
      deps(r.exec, { mode: "production", restartOptIn: false }),
    );

    expect(report.restart).toBe("manual");
    expect(report.steps.at(-1)).toMatchObject({
      id: "restart",
      status: "skipped",
      note: "restart-manual",
    });
  });

  it("asks the caller to exit when the supervisor opt-in is set", async () => {
    const r = repo({
      ...CLEAN_TOPLEVEL,
      "git rev-parse HEAD": [ok(`${HEAD_OLD}\n`), ok(`${HEAD_NEW}\n`)],
    });

    const report = await runSourceUpdate(
      deps(r.exec, { mode: "production", restartOptIn: true }),
    );

    expect(report.restart).toBe("exit");
    expect(report.steps.at(-1)).toMatchObject({ id: "restart", note: "restart-exit" });
  });
});

describe("the supervisor opt-in", () => {
  it("stays off when unset or written as any plain no", () => {
    for (const raw of [undefined, null, "", "  ", "0", "false", "OFF", "no"]) {
      expect(restartOptInFrom(raw)).toBe(false);
    }
  });

  it("turns on for anything the owner actually typed", () => {
    for (const raw of ["1", "true", "yes", "systemd"]) {
      expect(restartOptInFrom(raw)).toBe(true);
    }
  });
});

describe("reading what a pull brought", () => {
  it("installs again when the lockfile or any manifest moved", () => {
    expect(needsInstall(["pnpm-lock.yaml"])).toBe(true);
    expect(needsInstall(["package.json"])).toBe(true);
    expect(needsInstall(["packages/db/package.json"])).toBe(true);
    expect(needsInstall(["apps/web/src/app/page.tsx"])).toBe(false);
    expect(needsInstall([])).toBe(false);
  });

  it("rebuilds only the package the app imports from dist", () => {
    expect(needsBuild(["packages/mcp-core/src/index.ts"])).toBe(true);
    expect(needsBuild(["packages/db/src/schema/index.ts"])).toBe(false);
    expect(needsBuild([])).toBe(false);
  });
});
