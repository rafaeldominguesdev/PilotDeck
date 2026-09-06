/**
 * What the instance is allowed to do about a new release, and when.
 *
 * Three modes, and the conservative one is the default: off means no request
 * ever leaves this server, check means the owner is told and decides, and
 * automatic means the instance applies the update itself on the same interval
 * the check runs on. Automatic is not a different update: it is the very same
 * step runner the button uses, refusing a dirty tree exactly the same way.
 *
 * The decision and the doing are separate on purpose. An update takes minutes
 * and a page render cannot wait for it, so this answers with the release right
 * away and hands back an `apply` the caller starts without awaiting.
 */

import type { AutoUpdateRecord, UpdateMode } from "@pilotdeck/db";
import type { Runtime } from "./runtime";
import type { SourceUpdateReport } from "./source-update";
import type { ReleaseInfo } from "./updates";

/**
 * How long an automatic attempt holds the door shut. It matches the release
 * check's own cache, so a mode that checks hourly also tries at most hourly,
 * and a refusal the owner has not resolved yet does not run git every render.
 */
export const AUTO_RETRY_MS = 3_600_000;

export type ScheduledCheckDeps = {
  mode: UpdateMode;
  /** Only a source install can update itself in place. */
  runtime: Runtime;
  /** The single outbound request, made only when the mode allows one. */
  check: () => Promise<ReleaseInfo | null>;
  /** The step runner, already bound to this machine. */
  update: () => Promise<SourceUpdateReport>;
  /** What the last automatic attempt left behind, or null if none ever ran. */
  last: AutoUpdateRecord | null;
  nowMs: number;
};

export type ScheduledCheck = {
  /** The newer release, when the mode allowed looking and one exists. */
  release: ReleaseInfo | null;
  /**
   * The automatic update, ready to run, or null when nothing should happen.
   * Kept as a thunk so the caller decides whether to wait for it.
   */
  apply: (() => Promise<AutoUpdateRecord>) | null;
};

/** Turns a finished run into the row the panel reads. */
export function toRecord(
  report: SourceUpdateReport,
  version: string | null,
  at: string,
): AutoUpdateRecord {
  return {
    at,
    version,
    outcome: report.outcome,
    reason: report.reason ?? null,
    from: report.from,
    to: report.to,
    steps: report.steps.map((step) => ({
      id: step.id,
      status: step.status,
      ...(step.note ? { note: step.note } : {}),
    })),
  };
}

/** Whether enough time passed since the last automatic attempt to try again. */
export function mayRetry(
  last: AutoUpdateRecord | null,
  nowMs: number,
  intervalMs: number = AUTO_RETRY_MS,
): boolean {
  if (!last) return true;
  const at = Date.parse(last.at);
  if (Number.isNaN(at)) return true;
  // A record stamped in the future is a clock that moved, not permission to
  // run again: treat it as recent.
  return nowMs - at >= intervalMs;
}

/**
 * One pass of the release check, with whatever the mode entitles it to do.
 */
export async function runScheduledCheck(
  deps: ScheduledCheckDeps,
): Promise<ScheduledCheck> {
  // Off is silence, not a quiet check nobody reads. Nothing is called.
  if (deps.mode === "off") return { release: null, apply: null };

  const release = await deps.check();
  if (deps.mode !== "auto" || !release) return { release, apply: null };

  // A container updates itself by being replaced, which this process cannot do
  // to itself. Automatic degrades to telling the owner, honestly.
  if (deps.runtime !== "source") return { release, apply: null };

  if (!mayRetry(deps.last, deps.nowMs)) return { release, apply: null };

  return {
    release,
    apply: async () =>
      toRecord(await deps.update(), release.version, new Date(deps.nowMs).toISOString()),
  };
}
