import { describe, expect, it } from "vitest";
import { canNestUnder } from "./subtask";

describe("subtasks (spec §3.1 — 1 level)", () => {
  it("allows nesting under a root card", () => {
    expect(canNestUnder({ parentId: null })).toBe(true);
  });

  it("rejects a grandchild (parent already has a parent)", () => {
    expect(canNestUnder({ parentId: "some-parent" })).toBe(false);
  });
});
