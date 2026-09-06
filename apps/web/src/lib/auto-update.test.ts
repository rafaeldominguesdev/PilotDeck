import type { AutoUpdateRecord } from "@pilotdeck/db";
import { describe, expect, it, vi } from "vitest";
import {
  AUTO_RETRY_MS,
  mayRetry,
  runScheduledCheck,
  toRecord,
  type ScheduledCheckDeps,
} from "./auto-update";
import type { SourceUpdateReport } from "./source-update";
import type { ReleaseInfo } from "./updates";

const RELEASE: ReleaseInfo = {
  version: "v0.2.0",
  changelog: "",
  url: "https://example.invalid/releases/v0.2.0",
};

const NOW = Date.parse("2026-08-17T12:00:00.000Z");

const UPDATED: SourceUpdateReport = {
  outcome: "updated",
  steps: [
    { id: "pull", status: "ok", detail: "aaa → bbb" },
    { id: "install", status: "skipped", detail: "", note: "install-unchanged" },
    { id: "build", status: "ok", detail: "" },
    { id: "migrate", status: "ok", detail: "" },
    { id: "restart", status: "ok", detail: "", note: "restart-dev" },
  ],
  from: "aaa",
  to: "bbb",
  restart: "reload",
};

const REFUSED: SourceUpdateReport = {
  outcome: "refused",
  reason: "dirty-tree",
  detail: " M apps/web/src/lib/updates.ts",
  steps: [],
  from: null,
  to: null,
  restart: null,
};

function deps(over: Partial<ScheduledCheckDeps> = {}): ScheduledCheckDeps {
  return {
    mode: "auto",
    runtime: "source",
    check: vi.fn(async () => RELEASE),
    update: vi.fn(async () => UPDATED),
    last: null,
    nowMs: NOW,
    ...over,
  };
}

describe("what each update mode is allowed to do", () => {
  it("makes no request at all when the mode is off", async () => {
    const d = deps({ mode: "off" });

    const result = await runScheduledCheck(d);

    expect(result).toEqual({ release: null, apply: null });
    expect(d.check).not.toHaveBeenCalled();
    expect(d.update).not.toHaveBeenCalled();
  });

  it("checks and tells, without ever applying, in check-only", async () => {
    const d = deps({ mode: "check" });

    const result = await runScheduledCheck(d);

    expect(result.release).toEqual(RELEASE);
    expect(result.apply).toBeNull();
    expect(d.check).toHaveBeenCalledOnce();
    expect(d.update).not.toHaveBeenCalled();
  });

  it("offers the update itself in automatic, and only once asked to run", async () => {
    const d = deps();

    const result = await runScheduledCheck(d);

    expect(result.release).toEqual(RELEASE);
    expect(result.apply).toBeTypeOf("function");
    // Deciding is not doing: a page render must not wait on a pull.
    expect(d.update).not.toHaveBeenCalled();

    const record = await result.apply!();
    expect(d.update).toHaveBeenCalledOnce();
    expect(record).toEqual({
      at: "2026-08-17T12:00:00.000Z",
      version: "v0.2.0",
      outcome: "updated",
      reason: null,
      from: "aaa",
      to: "bbb",
      steps: [
        { id: "pull", status: "ok" },
        { id: "install", status: "skipped", note: "install-unchanged" },
        { id: "build", status: "ok" },
        { id: "migrate", status: "ok" },
        // The note is kept: it is how the panel says the restart already
        // happened instead of still being owed.
        { id: "restart", status: "ok", note: "restart-dev" },
      ],
    });
  });

  it("does nothing in automatic when there is no newer release", async () => {
    const d = deps({ check: vi.fn(async () => null) });

    const result = await runScheduledCheck(d);

    expect(result.release).toBeNull();
    expect(result.apply).toBeNull();
  });

  it("degrades to telling the owner when the instance runs in a container", async () => {
    const d = deps({ runtime: "container" });

    const result = await runScheduledCheck(d);

    // A container is replaced, not pulled into: this process cannot do that
    // to itself, so it says a release exists and stops there.
    expect(result.release).toEqual(RELEASE);
    expect(result.apply).toBeNull();
    expect(d.update).not.toHaveBeenCalled();
  });
});

describe("automatic against a dirty tree", () => {
  it("refuses exactly like the manual path and records why", async () => {
    const d = deps({ update: vi.fn(async () => REFUSED) });

    const result = await runScheduledCheck(d);
    const record = await result.apply!();

    expect(record.outcome).toBe("refused");
    expect(record.reason).toBe("dirty-tree");
    expect(record.steps).toEqual([]);
    expect(record.from).toBeNull();
    expect(record.to).toBeNull();
    expect(record.version).toBe("v0.2.0");
    expect(record.at).toBe("2026-08-17T12:00:00.000Z");
  });

  it("does not try again before the interval, so a refusal does not loop", async () => {
    const refusedJustNow: AutoUpdateRecord = {
      at: new Date(NOW - 60_000).toISOString(),
      version: "v0.2.0",
      outcome: "refused",
      reason: "dirty-tree",
      from: null,
      to: null,
      steps: [],
    };
    const d = deps({ last: refusedJustNow });

    const result = await runScheduledCheck(d);

    expect(result.release).toEqual(RELEASE);
    expect(result.apply).toBeNull();
  });

  it("tries again once the interval has passed", async () => {
    const stale: AutoUpdateRecord = {
      at: new Date(NOW - AUTO_RETRY_MS - 1000).toISOString(),
      version: "v0.2.0",
      outcome: "refused",
      reason: "dirty-tree",
      from: null,
      to: null,
      steps: [],
    };

    const result = await runScheduledCheck(deps({ last: stale }));

    expect(result.apply).toBeTypeOf("function");
  });
});

describe("the retry gate", () => {
  it("lets the first attempt through", () => {
    expect(mayRetry(null, NOW)).toBe(true);
  });

  it("treats an unreadable stamp as no record at all", () => {
    const broken = { at: "not a date" } as AutoUpdateRecord;
    expect(mayRetry(broken, NOW)).toBe(true);
  });

  it("treats a record from the future as recent, not as permission", () => {
    const ahead = { at: new Date(NOW + 60_000).toISOString() } as AutoUpdateRecord;
    expect(mayRetry(ahead, NOW)).toBe(false);
  });
});

describe("the record the panel reads", () => {
  it("keeps step results and drops their output", () => {
    const record = toRecord(UPDATED, "v0.2.0", "2026-08-17T12:00:00.000Z");
    expect(record.steps).toHaveLength(5);
    expect(JSON.stringify(record)).not.toContain("aaa → bbb");
  });

  it("records a run no release triggered, which is what force does", () => {
    const record = toRecord(UPDATED, null, "2026-08-17T12:00:00.000Z");
    expect(record.version).toBeNull();
    expect(record.outcome).toBe("updated");
  });
});
