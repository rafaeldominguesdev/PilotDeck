import { describe, expect, it } from "vitest";
import type { UsageTotals } from "./insights";
import { isApproxTotal, toBoardTotals } from "./board-totals";

const totals: UsageTotals = {
  costUsd: 4.05,
  costComputed: 3,
  costReported: 1,
  costEstimated: 0,
  costUnpriced: 2,
  unpricedTokens: 400_000,
  tokens: 1_500_000,
  durationMs: 12_000_000,
  elapsedMs: 300_000,
  elapsedOnly: 1,
  attempts: 6,
  estimated: 2,
  missing: 1,
  zeroUsage: 1,
  suspect: 1,
  suspectTokens: 5_000_000,
  suspectDurationMs: 60_000,
  suspectCostUsd: 99,
  deliveryUnverified: 0,
};

describe("the total the topbar carries", () => {
  it("keeps the money out while the layer is off", () => {
    expect(toBoardTotals(totals, false).costUsd).toBeNull();
    expect(toBoardTotals(totals, true).costUsd).toBe(4.05);
  });

  it("says nothing rather than zero when nothing could be priced", () => {
    const unpriced = {
      ...totals,
      costUsd: 0,
      costComputed: 0,
      costReported: 0,
      costEstimated: 0,
    };
    expect(toBoardTotals(unpriced, true).costUsd).toBeNull();
  });

  it("carries the honesty counters instead of folding them in", () => {
    const view = toBoardTotals(totals, true);
    expect(view.estimated).toBe(2);
    expect(view.missing).toBe(1);
    expect(view.suspect).toBe(1);
    expect(view.suspectTokens).toBe(5_000_000);
    expect(view.costUnpriced).toBe(2);
    expect(isApproxTotal(view)).toBe(true);
    expect(isApproxTotal({ ...view, estimated: 0 })).toBe(false);
  });

  it("keeps the two clocks apart", () => {
    const view = toBoardTotals(totals, true);
    expect(view.durationMs).toBe(12_000_000);
    expect(view.elapsedMs).toBe(300_000);
    expect(view.elapsedOnly).toBe(1);
  });
});
