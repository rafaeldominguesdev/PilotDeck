/**
 * Where the release check actually happens on this server.
 *
 * The board render is the only clock a self-hosted instance is guaranteed to
 * have, so the check rides on it, cached for an hour by the fetch itself. In
 * automatic mode the same pass starts the update, without the render waiting
 * for it: the page answers now, the update finishes in the background and
 * leaves its record on the workspace for the panel to show.
 */

import type { AutoUpdateRecord, UpdateMode } from "@pilotdeck/db";
import { runScheduledCheck, toRecord } from "./auto-update";
import { detectRuntime } from "./runtime";
import { recordUpdate, runHostSourceUpdate, scheduleExit } from "./source-update-host";
import { checkForUpdate, type ReleaseInfo } from "./updates";

/**
 * One automatic update at a time in this process. The persisted record already
 * keeps the hourly gate; this stops two renders that arrive together from both
 * starting a pull before either has written anything.
 */
let inFlight = false;

export type WorkspaceUpdateSettings = {
  id: string;
  updateMode: UpdateMode;
  updateLog: AutoUpdateRecord | null;
};

/**
 * The release to tell the owner about, if the mode allows looking at all.
 * Starts the automatic update as a side effect when the mode calls for one.
 */
export async function scheduledUpdateCheck(
  ws: WorkspaceUpdateSettings,
): Promise<ReleaseInfo | null> {
  const { release, apply } = await runScheduledCheck({
    mode: ws.updateMode,
    runtime: detectRuntime(),
    check: checkForUpdate,
    update: () => runHostSourceUpdate(),
    last: ws.updateLog,
    nowMs: Date.now(),
  });

  if (apply && !inFlight) {
    inFlight = true;
    // Deliberately not awaited: the board is not held open for a pull.
    void apply()
      .then(async (record) => {
        await recordUpdate(ws.id, record);
        // The automatic path obeys the same restart rule as the button: it
        // only ends the process where the owner opted a supervisor in, never
        // under a dev server that reloads itself.
        if (record.outcome === "updated" && record.steps.some(isSupervisedExit)) {
          scheduleExit();
        }
      })
      .catch(() => {
        // An update that crashes must not take the render path with it. The
        // record simply stays as it was, and the next interval tries again.
      })
      .finally(() => {
        inFlight = false;
      });
  }

  return release;
}

function isSupervisedExit(step: { id: string; note?: string }): boolean {
  return step.id === "restart" && step.note === "restart-exit";
}

/** Exposed for tests: forgets that a background update is running. */
export function resetInFlightForTests(): void {
  inFlight = false;
}

export { toRecord };
