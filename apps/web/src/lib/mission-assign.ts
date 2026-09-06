/**
 * The rule that decides whether a mission move is allowed, kept away from the
 * database so both entry points agree: the mission field of the card detail
 * and the bulk bar the board uses to rescue a whole orphaned instance.
 *
 * A mission groups work inside one workspace, so a card only ever joins a
 * mission of its own workspace. Detaching (`null`) is always allowed, because
 * a card without a mission is the state every card was born in.
 */

export type MissionAssignCard = { id: string; workspaceId: string };

/** `null` detaches; "missing" is an id that resolved to no mission at all. */
export type MissionAssignTarget =
  | { id: string; workspaceId: string }
  | null
  | "missing";

export type MissionAssignPlan =
  | { ok: true; taskIds: string[]; missionId: string | null }
  | { ok: false; error: string };

export function planMissionAssignment(input: {
  requestedIds: string[];
  /** The cards the board could load, each with the workspace it belongs to. */
  cards: MissionAssignCard[];
  mission: MissionAssignTarget;
}): MissionAssignPlan {
  const requested = [...new Set(input.requestedIds.filter((id) => id.trim()))];
  if (requested.length === 0) {
    return { ok: false, error: "Select at least one card." };
  }
  if (input.mission === "missing") {
    return { ok: false, error: "Mission not found." };
  }

  const byId = new Map(input.cards.map((card) => [card.id, card]));
  const unknown = requested.filter((id) => !byId.has(id));
  if (unknown.length > 0) {
    return {
      ok: false,
      error:
        unknown.length === 1
          ? "Card not found."
          : `${unknown.length} of the selected cards no longer exist.`,
    };
  }

  const mission = input.mission;
  if (mission) {
    const foreign = requested.filter(
      (id) => byId.get(id)!.workspaceId !== mission.workspaceId,
    );
    if (foreign.length > 0) {
      return {
        ok: false,
        error: "That mission belongs to another workspace.",
      };
    }
  }

  return { ok: true, taskIds: requested, missionId: mission?.id ?? null };
}
