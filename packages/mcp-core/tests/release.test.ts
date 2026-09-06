import { describe, expect, it } from "vitest";
import { isReleaseVersion } from "../src/release.js";

/**
 * OCL-128: a card delivered with a branch name in `resolved_in` put
 * "ovka-78-bug-...-f@68218bba" on the board's RELEASE filter, next to real
 * releases. `resolved_in` names a release; the branch has its own field.
 */
describe("isReleaseVersion", () => {
  it("accepts the release tags this repo cuts", () => {
    for (const value of ["v0.2.2", "0.2.2", "v1.0.0", "1.4.0", "v10.20.30"]) {
      expect(isReleaseVersion(value), value).toBe(true);
    }
  });

  it("accepts a two-part series and a pre-release or build suffix", () => {
    for (const value of ["v1.2", "1.2", "v1.0.0-rc.1", "v1.0.0+build.5"]) {
      expect(isReleaseVersion(value), value).toBe(true);
    }
  });

  it("refuses the branch name from the bug report", () => {
    expect(
      isReleaseVersion("ovka-78-bug-selecao-de-texto-no-pane-anda-com-o-scroll-f@68218bba"),
    ).toBe(false);
  });

  it("refuses branches, commits and free text", () => {
    for (const value of [
      "main",
      "feature/ocl-128",
      "68218bba",
      "68218bba1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
      "sprint 12",
      "",
      "   ",
      "v",
      "v1",
    ]) {
      expect(isReleaseVersion(value), value).toBe(false);
    }
  });

  it("ignores surrounding whitespace", () => {
    expect(isReleaseVersion("  v1.2.3  ")).toBe(true);
  });
});
