import type { UsageTotals } from "./insights";

/**
 * What the work on screen consumed, for the one line the topbar can spend on
 * it. Every number here comes from the aggregation the Insights page runs, on
 * the same rows narrowed by the same filter, so the two can only agree.
 */
export type BoardTotals = {
  attempts: number;
  tokens: number;
  /** Execution time the agents reported. */
  durationMs: number;
  /** Claim to deliver, on the attempts that reported no execution time. */
  elapsedMs: number;
  elapsedOnly: number;
  /** null when the money layer is off, or when nothing here could be priced. */
  costUsd: number | null;
  costComputed: number;
  costReported: number;
  costEstimated: number;
  costUnpriced: number;
  /** Attempts whose usage the executor flagged as an estimate. */
  estimated: number;
  /** Attempts that finished reporting no usage at all. */
  missing: number;
  suspect: number;
  suspectTokens: number;
};

export const EMPTY_BOARD_TOTALS: BoardTotals = {
  attempts: 0,
  tokens: 0,
  durationMs: 0,
  elapsedMs: 0,
  elapsedOnly: 0,
  costUsd: null,
  costComputed: 0,
  costReported: 0,
  costEstimated: 0,
  costUnpriced: 0,
  estimated: 0,
  missing: 0,
  suspect: 0,
  suspectTokens: 0,
};

/**
 * The fields of the Insights aggregation this line actually reads. Naming
 * them keeps the topbar out of the way while that aggregation grows: a new
 * counter on the page is not a break here.
 */
export type TotalsInput = Pick<
  UsageTotals,
  | "attempts"
  | "tokens"
  | "durationMs"
  | "elapsedMs"
  | "elapsedOnly"
  | "costUsd"
  | "costComputed"
  | "costReported"
  | "costEstimated"
  | "costUnpriced"
  | "estimated"
  | "missing"
  | "suspect"
  | "suspectTokens"
>;

export function toBoardTotals(
  totals: TotalsInput,
  pricingEnabled: boolean,
): BoardTotals {
  const priced =
    totals.costComputed + totals.costReported + totals.costEstimated;
  return {
    attempts: totals.attempts,
    tokens: totals.tokens,
    durationMs: totals.durationMs,
    elapsedMs: totals.elapsedMs,
    elapsedOnly: totals.elapsedOnly,
    // Money is opt-in, and a workspace with the layer on but nothing priced
    // has no figure either. Neither case is a real zero, so neither prints one.
    costUsd: pricingEnabled && priced > 0 ? totals.costUsd : null,
    costComputed: totals.costComputed,
    costReported: totals.costReported,
    costEstimated: totals.costEstimated,
    costUnpriced: totals.costUnpriced,
    estimated: totals.estimated,
    missing: totals.missing,
    suspect: totals.suspect,
    suspectTokens: totals.suspectTokens,
  };
}

/** True while any number on the line is an estimate rather than a measurement. */
export function isApproxTotal(totals: BoardTotals): boolean {
  return totals.estimated > 0;
}
