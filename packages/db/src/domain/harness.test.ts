import { describe, expect, it } from "vitest";
import { harnessChain } from "./harness";

describe("harnessChain", () => {
  it("shows a single value when the run honoured the plan", () => {
    expect(harnessChain("sonnet-5", ["sonnet-5"])).toBe("sonnet-5");
  });

  it("shows plan and reality when the executor differed", () => {
    expect(harnessChain("sonnet-5", ["fable-5"])).toBe("sonnet-5 → fable-5");
  });

  it("reads the many spellings of one model as the same model", () => {
    expect(harnessChain("opus-5", ["claude-opus-5"])).toBe("opus-5");
    expect(harnessChain("sonnet-5", ["claude-fable-5"])).toBe("sonnet-5 → fable-5");
  });

  it("keeps every model a run walked through, in order", () => {
    expect(harnessChain("sonnet-5", ["sonnet-5", "opus-5", "opus-5"])).toBe(
      "sonnet-5 → opus-5",
    );
  });

  it("falls back to whichever side the board knows", () => {
    expect(harnessChain("sonnet-5", [])).toBe("sonnet-5");
    expect(harnessChain(null, ["claude-fable-5"])).toBe("fable-5");
    expect(harnessChain(null, [null])).toBeNull();
    expect(harnessChain(undefined, [])).toBeNull();
  });
});
