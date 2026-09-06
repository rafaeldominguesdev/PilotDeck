import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  executionAttempt,
  task,
  taskComment,
  user,
  workspace,
} from "@pilotdeck/db";
import { closeTestWorld, createTestWorld, type TestWorld } from "../mcp/test-db";
import {
  computeInsights,
  loadInsightAttemptRows,
  loadReopenRows,
} from "./insights";

/**
 * Runs the real Drizzle queries against a migrated PGlite database, then the
 * aggregation on top, so the page's whole data path is covered.
 */
describe("insights queries", () => {
  let world: TestWorld;
  let taskAId: string;
  let taskBId: string;

  beforeAll(async () => {
    world = await createTestWorld();

    const [reviewer] = await world.db
      .insert(user)
      .values({ email: "owner@local.test", passwordHash: "x" })
      .returning({ id: user.id });
    if (!reviewer) throw new Error("failed to insert user");

    const [taskA] = await world.db
      .insert(task)
      .values({
        projectId: world.projectId,
        missionId: world.missionId,
        shortId: "OC-1",
        title: "Card with full usage",
        status: "feito",
      })
      .returning({ id: task.id });
    const [taskB] = await world.db
      .insert(task)
      .values({
        projectId: world.projectId,
        shortId: "OC-2",
        title: "Card with estimated usage",
        status: "aberto",
      })
      .returning({ id: task.id });
    if (!taskA || !taskB) throw new Error("failed to insert tasks");
    taskAId = taskA.id;
    taskBId = taskB.id;

    await world.db.insert(executionAttempt).values([
      {
        taskId: taskA.id,
        model: "sonnet-5",
        result: "success",
        startedAt: new Date("2026-08-10T10:00:00Z"),
        finishedAt: new Date("2026-08-10T11:00:00Z"),
        tokensIn: 1000,
        tokensOut: 500,
        tokensCache: 0,
        costUsd: "2.00",
        durationMs: 3_600_000,
        turns: 12,
        usageEstimated: false,
      },
      {
        taskId: taskB.id,
        model: "opus-4-8",
        result: "success",
        startedAt: new Date("2026-08-11T10:00:00Z"),
        finishedAt: new Date("2026-08-11T10:30:00Z"),
        tokensIn: 400,
        tokensOut: 100,
        costUsd: "0.50",
        durationMs: 1_800_000,
        turns: 5,
        usageEstimated: true,
      },
      // Still running: must stay out of every aggregate.
      {
        taskId: taskB.id,
        model: "opus-4-8",
        startedAt: new Date("2026-08-12T10:00:00Z"),
      },
    ]);

    // Human reopen comment after task B's delivery.
    await world.db.insert(taskComment).values({
      taskId: taskB.id,
      authorUserId: reviewer.id,
      body: "The totals do not match, run it again.",
      createdAt: new Date("2026-08-11T12:00:00Z"),
    });
    // Agent progress comment: must never count as a reopen.
    await world.db.insert(taskComment).values({
      taskId: taskA.id,
      authorAgentRef: "claude · sonnet-5",
      body: "halfway there",
      createdAt: new Date("2026-08-10T12:00:00Z"),
    });
  });

  afterAll(async () => {
    await closeTestWorld(world);
  });

  it("joins attempts to card, project and mission for the workspace", async () => {
    const rows = await loadInsightAttemptRows(world.db, world.workspaceId);
    expect(rows).toHaveLength(3);

    const rowA = rows.find((r) => r.taskId === taskAId && r.finishedAt);
    expect(rowA?.taskShortId).toBe("OC-1");
    expect(rowA?.projectName).toBe("PilotDeck");
    expect(rowA?.missionTitle).toBe("Norte do board");
    expect(rowA?.model).toBe("sonnet-5");
    expect(Number(rowA?.costUsd)).toBeCloseTo(2);

    const rowB = rows.find((r) => r.taskId === taskBId && r.finishedAt);
    expect(rowB?.missionId).toBeNull();
    expect(rowB?.missionTitle).toBeNull();
    expect(rowB?.usageEstimated).toBe(true);
  });

  it("returns only human comments as reopen signals", async () => {
    const reopens = await loadReopenRows(world.db, world.workspaceId);
    expect(reopens).toHaveLength(1);
    expect(reopens[0]?.taskId).toBe(taskBId);
  });

  it("ignores attempts from other workspaces", async () => {
    const [otherWs] = await world.db
      .insert(workspace)
      .values({ name: "Elsewhere" })
      .returning({ id: workspace.id });
    if (!otherWs) throw new Error("failed to insert workspace");
    const rows = await loadInsightAttemptRows(world.db, otherWs.id);
    expect(rows).toHaveLength(0);
  });

  it("feeds computeInsights with totals that match the seeded numbers", async () => {
    const [rows, reopens] = await Promise.all([
      loadInsightAttemptRows(world.db, world.workspaceId),
      loadReopenRows(world.db, world.workspaceId),
    ]);
    const insights = computeInsights(rows, reopens);

    expect(insights.totals.attempts).toBe(2);
    expect(insights.totals.costUsd).toBeCloseTo(2.5);
    expect(insights.totals.tokens).toBe(2000);
    expect(insights.totals.durationMs).toBe(5_400_000);
    expect(insights.totals.estimated).toBe(1);

    expect(insights.byMission).toHaveLength(2);
    const opus = insights.reopensByModel.find((m) => m.model === "opus-4-8");
    expect(opus).toEqual({ model: "opus-4-8", deliveries: 1, reopened: 1, rate: 1 });
    const sonnet = insights.reopensByModel.find((m) => m.model === "sonnet-5");
    expect(sonnet?.reopened).toBe(0);
  });
});
