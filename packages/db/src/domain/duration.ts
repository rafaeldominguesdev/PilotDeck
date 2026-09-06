/**
 * Two clocks run on every card and they are not the same number.
 *
 * The agent reports how long it worked: that is execution time. The server
 * measures claim to deliver: that is elapsed time, and it keeps counting while
 * an orphaned claim sits open over a weekend. Presenting the second one as if
 * it were the first turns an afternoon of nothing into "41h03" printed next to
 * the model, which is technically true and completely misleading.
 *
 * Everything here is pure so the board, the insights page and the tests share
 * one answer about which clock is being read.
 */

/** Which clock produced a duration. */
export type DurationSource = "reported" | "elapsed";

/** The two raw measurements an attempt carries. */
export type AttemptDurations = {
  /** What the agent reported as its own execution time. */
  durationMs?: number | null;
  /** What the server measured from claim to deliver. */
  serverDurationMs?: number | null;
};

/** The duration a reader should see, and where it came from. */
export type ResolvedDuration = {
  /** The value to show. */
  ms: number;
  source: DurationSource;
  /** The agent's own execution time. Null when it never reported one. */
  executionMs: number | null;
  /** Claim to deliver as the server measured it. Null when never measured. */
  elapsedMs: number | null;
};

function measured(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

/**
 * The clock the card should show. The agent's own number wins and is execution
 * time; without it the server measurement stands in, and it is elapsed time,
 * never work. Null when neither clock ran, so the caller shows no duration at
 * all instead of a zero that reads as an instant run.
 */
export function resolveDuration(
  attempt: AttemptDurations | null | undefined,
): ResolvedDuration | null {
  if (!attempt) return null;
  const executionMs = measured(attempt.durationMs);
  const elapsedMs = measured(attempt.serverDurationMs);
  if (executionMs != null) {
    return { ms: executionMs, source: "reported", executionMs, elapsedMs };
  }
  if (elapsedMs != null) {
    return { ms: elapsedMs, source: "elapsed", executionMs, elapsedMs };
  }
  return null;
}

/**
 * Execution time only: the sum an aggregate is allowed to call work. An
 * attempt that reported no duration adds nothing here, and its elapsed time is
 * counted apart by `elapsedOnlyMs` instead of being folded in silently.
 */
export function executionOnlyMs(attempt: AttemptDurations): number {
  const resolved = resolveDuration(attempt);
  return resolved?.source === "reported" ? resolved.ms : 0;
}

/**
 * The elapsed time of attempts that never reported execution time. The
 * companion of `executionOnlyMs`: the two never count the same attempt, so a
 * total can show both without double counting one run.
 */
export function elapsedOnlyMs(attempt: AttemptDurations): number {
  const resolved = resolveDuration(attempt);
  return resolved?.source === "elapsed" ? resolved.ms : 0;
}
