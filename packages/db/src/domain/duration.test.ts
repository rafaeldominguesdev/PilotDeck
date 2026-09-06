import { describe, expect, it } from "vitest";
import { elapsedOnlyMs, executionOnlyMs, resolveDuration } from "./duration";

const HOUR = 3_600_000;

describe("resolveDuration", () => {
  it("reads the agent's own number as execution time", () => {
    expect(
      resolveDuration({ durationMs: 12 * 60_000, serverDurationMs: 41 * HOUR }),
    ).toEqual({
      ms: 12 * 60_000,
      source: "reported",
      executionMs: 12 * 60_000,
      elapsedMs: 41 * HOUR,
    });
  });

  it("calls the server measurement elapsed, never work", () => {
    expect(resolveDuration({ serverDurationMs: 41 * HOUR })).toEqual({
      ms: 41 * HOUR,
      source: "elapsed",
      executionMs: null,
      elapsedMs: 41 * HOUR,
    });
  });

  it("keeps a short server measurement elapsed too", () => {
    // The claim to deliver clock is elapsed whatever it reads: a small number
    // is not evidence that an agent was working the whole time.
    expect(resolveDuration({ serverDurationMs: 4 * 60_000 })?.source).toBe(
      "elapsed",
    );
  });

  it("shows nothing when no clock ran", () => {
    expect(resolveDuration({})).toBeNull();
    expect(resolveDuration(null)).toBeNull();
    expect(
      resolveDuration({ durationMs: null, serverDurationMs: null }),
    ).toBeNull();
  });

  it("ignores a broken measurement instead of trusting it", () => {
    expect(
      resolveDuration({ durationMs: Number.NaN, serverDurationMs: 90_000 }),
    ).toEqual({
      ms: 90_000,
      source: "elapsed",
      executionMs: null,
      elapsedMs: 90_000,
    });
    expect(resolveDuration({ durationMs: -5 })).toBeNull();
  });

  it("keeps a reported zero as a run that reported zero", () => {
    expect(resolveDuration({ durationMs: 0, serverDurationMs: HOUR })).toEqual({
      ms: 0,
      source: "reported",
      executionMs: 0,
      elapsedMs: HOUR,
    });
  });
});

describe("executionOnlyMs and elapsedOnlyMs", () => {
  it("never count the same attempt twice", () => {
    const reported = { durationMs: 60_000, serverDurationMs: 41 * HOUR };
    expect(executionOnlyMs(reported)).toBe(60_000);
    expect(elapsedOnlyMs(reported)).toBe(0);

    const orphaned = { serverDurationMs: 41 * HOUR };
    expect(executionOnlyMs(orphaned)).toBe(0);
    expect(elapsedOnlyMs(orphaned)).toBe(41 * HOUR);
  });

  it("adds nothing for an attempt with no clock at all", () => {
    expect(executionOnlyMs({})).toBe(0);
    expect(elapsedOnlyMs({})).toBe(0);
  });
});
