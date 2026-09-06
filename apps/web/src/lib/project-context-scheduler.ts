import type { Database } from "@pilotdeck/db";
import { refreshDailyProjectContexts } from "./project-context-refresh";

let inFlight = false;

/**
 * The board render is the instance's reliable clock. A daily source is checked
 * in the background so a slow GitHub request never holds the board open.
 */
export function scheduledProjectContextRefresh(
  database: Database,
  workspaceId: string,
): void {
  if (inFlight) return;
  inFlight = true;
  void refreshDailyProjectContexts(database, workspaceId, { actor: "daily-sync" })
    .catch(() => {
      // A failed source remains eligible for the next daily pass.
    })
    .finally(() => {
      inFlight = false;
    });
}
export function resetProjectContextRefreshForTests(): void {
  inFlight = false;
}
