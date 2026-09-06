/** A short enough window for MCP changes to feel live without hammering the DB. */
export const BOARD_REFRESH_INTERVAL_MS = 5_000;

type RefreshDocument = Pick<
  Document,
  "visibilityState" | "addEventListener" | "removeEventListener"
>;

type RefreshClock = {
  setInterval(callback: () => void, delay: number): number;
  clearInterval(id: number): void;
};

/**
 * Keep the server-rendered board in step with writes made outside the browser.
 * Hidden tabs do no work; returning to one refreshes immediately before the
 * regular cadence resumes.
 */
export function subscribeToBoardRefresh(
  refresh: () => void,
  doc: RefreshDocument = document,
  clock: RefreshClock = window,
): () => void {
  let interval: number | null = null;

  const stop = () => {
    if (interval === null) return;
    clock.clearInterval(interval);
    interval = null;
  };

  const start = () => {
    if (interval !== null || doc.visibilityState !== "visible") return;
    interval = clock.setInterval(refresh, BOARD_REFRESH_INTERVAL_MS);
  };

  const onVisibilityChange = () => {
    if (doc.visibilityState === "visible") {
      refresh();
      start();
    } else {
      stop();
    }
  };

  start();
  doc.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    doc.removeEventListener("visibilitychange", onVisibilityChange);
    stop();
  };
}
