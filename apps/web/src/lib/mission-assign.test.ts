import { describe, expect, it } from "vitest";
import { planMissionAssignment } from "./mission-assign";

const cards = [
  { id: "a", workspaceId: "w1" },
  { id: "b", workspaceId: "w1" },
  { id: "foreign", workspaceId: "w2" },
];
const mission = { id: "m1", workspaceId: "w1" };

describe("mission assignment", () => {
  it("attaches several cards to a mission of the same workspace", () => {
    expect(
      planMissionAssignment({ requestedIds: ["a", "b"], cards, mission }),
    ).toEqual({ ok: true, taskIds: ["a", "b"], missionId: "m1" });
  });

  it("detaches without asking anything of the mission", () => {
    expect(
      planMissionAssignment({ requestedIds: ["a"], cards, mission: null }),
    ).toEqual({ ok: true, taskIds: ["a"], missionId: null });
  });

  it("refuses a mission from another workspace", () => {
    const plan = planMissionAssignment({
      requestedIds: ["foreign"],
      cards,
      mission,
    });
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.error).toContain("another workspace");
  });

  it("refuses a mission the board could not resolve", () => {
    const plan = planMissionAssignment({
      requestedIds: ["a"],
      cards,
      mission: "missing",
    });
    expect(plan).toEqual({ ok: false, error: "Mission not found." });
  });

  it("refuses a selection with cards that no longer exist", () => {
    const plan = planMissionAssignment({
      requestedIds: ["a", "gone"],
      cards,
      mission: null,
    });
    expect(plan).toEqual({ ok: false, error: "Card not found." });
  });

  it("refuses an empty selection and dedupes the rest", () => {
    expect(planMissionAssignment({ requestedIds: [], cards, mission })).toEqual({
      ok: false,
      error: "Select at least one card.",
    });
    expect(
      planMissionAssignment({ requestedIds: ["a", "a"], cards, mission }),
    ).toEqual({ ok: true, taskIds: ["a"], missionId: "m1" });
  });
});
