import { describe, expect, it } from "vitest";
import { detectDeployModeFrom } from "./deploy-mode";

describe("detecting how this instance was deployed", () => {
  it("calls it hosted only when the hosted compose file said so", () => {
    expect(detectDeployModeFrom("hosted")).toBe("hosted");
    expect(detectDeployModeFrom(" Hosted ")).toBe("hosted");
  });

  it("defaults to quickstart for the quickstart value, unset, or anything else", () => {
    expect(detectDeployModeFrom("quickstart")).toBe("quickstart");
    expect(detectDeployModeFrom(undefined)).toBe("quickstart");
    expect(detectDeployModeFrom(null)).toBe("quickstart");
    expect(detectDeployModeFrom("")).toBe("quickstart");
    expect(detectDeployModeFrom("whatever")).toBe("quickstart");
  });
});
