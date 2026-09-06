import {
  MissionAttemptStartOutputSchema,
  MissionReportUsageOutputSchema,
} from "@pilotdeck/mcp-core";
import {
  executionAttempt,
  missionAttempt,
  task,
} from "@pilotdeck/db";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { closeTestWorld, createTestWorld, type TestWorld } from "./test-db";
import { invokeTool } from "./tools";

describe("mission orchestration attempt tools", () => {
  let world: TestWorld;

  afterEach(async () => {
    if (world) await closeTestWorld(world);
  });

  const ctx = () => ({
    tokenId: world.tokenId,
    workspaceId: world.workspaceId,
    tokenLabel: "orchestrator",
  });

  it("opens one attempt, applies cumulative reports idempotently, and closes on final", async () => {
    world = await createTestWorld();
    const started = await invokeTool(world.db, ctx(), "mission_attempt_start", {
      mission_id: world.missionId,
      executor: {
        cli: "claude-code",
        model: "fable-5",
        session_id: "mission-session-1",
      },
    });
    if (!started.ok) throw new Error(`${started.error.code}: ${started.error.message} ${JSON.stringify(started.error.details)}`);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const start = MissionAttemptStartOutputSchema.parse(started.value);
    expect(start.sequence).toBe(0);
    expect(start.attempt.status).toBe("aberto");

    const duplicateStart = await invokeTool(
      world.db,
      ctx(),
      "mission_attempt_start",
      {
        mission_id: world.missionId,
        executor: { session_id: "mission-session-2" },
      },
    );
    expect(duplicateStart.ok).toBe(false);
    if (!duplicateStart.ok) {
      expect(duplicateStart.error.code).toBe("MISSION_ATTEMPT_ALREADY_OPEN");
    }

    const first = await invokeTool(world.db, ctx(), "mission_report_usage", {
      mission_id: world.missionId,
      attempt_id: start.attempt_id,
      sequence: 1,
      checkpoint: "rodada",
      usage: {
        segments: [{ model: "fable-5", input: 100, output: 10 }],
        duration_ms: 1_000,
        turns: 1,
      },
    });
    expect(first.ok).toBe(true);

    const second = await invokeTool(world.db, ctx(), "mission_report_usage", {
      mission_id: world.missionId,
      attempt_id: start.attempt_id,
      sequence: 2,
      checkpoint: "rodada",
      usage: {
        segments: [{ model: "fable-5", input: 200, output: 20 }],
        duration_ms: 2_000,
        turns: 2,
      },
    });
    expect(second.ok).toBe(true);

    const replay = await invokeTool(world.db, ctx(), "mission_report_usage", {
      mission_id: world.missionId,
      attempt_id: start.attempt_id,
      sequence: 2,
      checkpoint: "rodada",
      usage: {
        segments: [{ model: "fable-5", input: 200, output: 20 }],
        duration_ms: 2_000,
        turns: 2,
      },
    });
    expect(replay.ok).toBe(true);
    if (replay.ok) {
      const out = MissionReportUsageOutputSchema.parse(replay.value);
      expect(out.idempotent).toBe(true);
      expect(out.attempt.last_report_sequence).toBe(2);
    }

    const conflict = await invokeTool(world.db, ctx(), "mission_report_usage", {
      mission_id: world.missionId,
      attempt_id: start.attempt_id,
      sequence: 2,
      checkpoint: "rodada",
      usage: {
        segments: [{ model: "fable-5", input: 201, output: 20 }],
        duration_ms: 2_000,
        turns: 2,
      },
    });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.error.code).toBe("INVALID_SEQUENCE");

    const regression = await invokeTool(world.db, ctx(), "mission_report_usage", {
      mission_id: world.missionId,
      attempt_id: start.attempt_id,
      sequence: 1,
      checkpoint: "rodada",
      usage: {
        segments: [{ model: "fable-5", input: 100, output: 10 }],
        duration_ms: 1_000,
        turns: 1,
      },
    });
    expect(regression.ok).toBe(false);
    if (!regression.ok) expect(regression.error.code).toBe("INVALID_SEQUENCE");

    const final = await invokeTool(world.db, ctx(), "mission_report_usage", {
      mission_id: world.missionId,
      attempt_id: start.attempt_id,
      sequence: 3,
      checkpoint: "final",
      result: "success",
      usage: {
        segments: [{ model: "fable-5", input: 300, output: 30 }],
        duration_ms: 3_000,
        turns: 3,
      },
    });
    expect(final.ok).toBe(true);
    if (!final.ok) return;
    const finalOut = MissionReportUsageOutputSchema.parse(final.value);
    expect(finalOut.attempt.status).toBe("sucesso");
    expect(finalOut.attempt.last_report_sequence).toBe(3);
    expect(finalOut.attempt.usage?.tokens_in).toBe(300);
    expect(finalOut.attempt.cost_status).toBe("computed");

    const finalReplay = await invokeTool(world.db, ctx(), "mission_report_usage", {
      mission_id: world.missionId,
      attempt_id: start.attempt_id,
      sequence: 3,
      checkpoint: "final",
      result: "success",
      usage: {
        segments: [{ model: "fable-5", input: 300, output: 30 }],
        duration_ms: 3_000,
        turns: 3,
      },
    });
    expect(finalReplay.ok).toBe(true);
    if (finalReplay.ok) {
      expect(MissionReportUsageOutputSchema.parse(finalReplay.value).idempotent).toBe(
        true,
      );
    }

    const postFinal = await invokeTool(world.db, ctx(), "mission_report_usage", {
      mission_id: world.missionId,
      attempt_id: start.attempt_id,
      sequence: 4,
      checkpoint: "final",
      result: "success",
      usage: {},
    });
    expect(postFinal.ok).toBe(false);
    if (!postFinal.ok) expect(postFinal.error.code).toBe("INVALID_ARGUMENT");

    const reports = await world.db
      .select()
      .from(missionAttempt)
      .where(eq(missionAttempt.id, start.attempt_id));
    expect(reports[0]?.lastReportSequence).toBe(3);
  });

  it("abandons an expired attempt and opens a replacement", async () => {
    world = await createTestWorld();
    const started = await invokeTool(world.db, ctx(), "mission_attempt_start", {
      mission_id: world.missionId,
      executor: { session_id: "stale-session" },
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const old = MissionAttemptStartOutputSchema.parse(started.value);
    await world.db
      .update(missionAttempt)
      .set({ lastActivityAt: new Date(Date.now() - 61 * 60_000) })
      .where(eq(missionAttempt.id, old.attempt_id));

    const replacement = await invokeTool(
      world.db,
      ctx(),
      "mission_attempt_start",
      {
        mission_id: world.missionId,
        executor: { session_id: "replacement-session" },
      },
    );
    expect(replacement.ok).toBe(true);
    if (!replacement.ok) return;
    const next = MissionAttemptStartOutputSchema.parse(replacement.value);
    expect(next.attempt_id).not.toBe(old.attempt_id);

    const attempts = await world.db
      .select()
      .from(missionAttempt)
      .where(eq(missionAttempt.missionId, world.missionId));
    expect(attempts.find((row) => row.id === old.attempt_id)?.status).toBe(
      "abandonado",
    );
    expect(attempts.find((row) => row.id === next.attempt_id)?.status).toBe(
      "aberto",
    );
  });

  it("marks card and mission usage suspect when a session is shared", async () => {
    world = await createTestWorld();
    const started = await invokeTool(world.db, ctx(), "mission_attempt_start", {
      mission_id: world.missionId,
      executor: { cli: "claude-code", model: "fable-5", session_id: "shared" },
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const missionRun = MissionAttemptStartOutputSchema.parse(started.value);

    const [card] = await world.db
      .insert(task)
      .values({
        projectId: world.projectId,
        missionId: world.missionId,
        shortId: "OC-900",
        title: "Shared session card",
      })
      .returning();
    if (!card) throw new Error("failed to insert card");
    const claimed = await invokeTool(world.db, ctx(), "task_claim", {
      task_id: card.id,
      executor: { cli: "claude-code", model: "fable-5", session_id: "shared" },
    });
    expect(claimed.ok).toBe(true);

    const [cardAttempt] = await world.db
      .select()
      .from(executionAttempt)
      .where(eq(executionAttempt.taskId, card.id));
    const [orchestrationAttempt] = await world.db
      .select()
      .from(missionAttempt)
      .where(eq(missionAttempt.id, missionRun.attempt_id));
    expect(cardAttempt?.usageSuspect).toBe(true);
    expect(cardAttempt?.usageSuspectReason).toContain(
      "session_reused_orchestration",
    );
    expect(orchestrationAttempt?.usageSuspect).toBe(true);
  });

  it("requires the final checkpoint before a mission can be concluded", async () => {
    world = await createTestWorld();
    const started = await invokeTool(world.db, ctx(), "mission_attempt_start", {
      mission_id: world.missionId,
      executor: { session_id: "finish-session" },
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const attempt = MissionAttemptStartOutputSchema.parse(started.value);

    const blocked = await invokeTool(world.db, ctx(), "mission_update", {
      mission_id: world.missionId,
      status: "concluida",
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error.code).toBe("MISSION_ATTEMPT_ALREADY_OPEN");

    const final = await invokeTool(world.db, ctx(), "mission_report_usage", {
      mission_id: world.missionId,
      attempt_id: attempt.attempt_id,
      sequence: 1,
      checkpoint: "final",
      result: "success",
      usage: {},
    });
    expect(final.ok).toBe(true);
    const concluded = await invokeTool(world.db, ctx(), "mission_update", {
      mission_id: world.missionId,
      status: "concluida",
    });
    expect(concluded.ok).toBe(true);
  });
});
