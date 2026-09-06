import { workspace } from "@pilotdeck/db";
import {
  ExecutorsUpdateFullOutputSchema as ExecutorsUpdateOutputSchema,
  HarnessListOutputSchema,
  HarnessRecommendOutputSchema,
  TaskClaimOutputSchema,
  TaskCreateFullOutputSchema as TaskCreateOutputSchema,
  TaskSearchOutputSchema,
  toolContracts,
} from "@pilotdeck/mcp-core";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { selectionFromConfig } from "../lib/executors";
import { closeTestWorld, createTestWorld, type TestWorld } from "./test-db";
import { invokeToolForTests as invokeTool } from "./test-tools";

describe("executors_update manages the executor config over MCP", () => {
  let world: TestWorld;

  afterEach(async () => {
    if (world) await closeTestWorld(world);
  });

  function worker() {
    return {
      tokenId: world.tokenId,
      workspaceId: world.workspaceId,
      tokenLabel: "test-agent",
      canManage: false,
    };
  }

  function manager() {
    return {
      tokenId: world.manageTokenId,
      workspaceId: world.workspaceId,
      tokenLabel: "owner-console",
      canManage: true,
    };
  }

  async function storedConfig() {
    const [ws] = await world.db
      .select()
      .from(workspace)
      .where(eq(workspace.id, world.workspaceId))
      .limit(1);
    return ws?.executors ?? [];
  }

  it("adds a model that Settings, the policy selects and a card harness all see", async () => {
    world = await createTestWorld();
    const updated = await invokeTool(world.db, manager(), "executors_update", {
      cli: "claude-code",
      add_models: ["opus-5"],
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    const out = ExecutorsUpdateOutputSchema.parse(updated.value);
    expect(out.updated).toBe("claude-code");
    expect(out.removed).toBe(false);
    const row = out.executors.find((item) => item.id === "claude-code");
    expect(row?.models).toContain("opus-5");
    expect(row?.catalog).toContain("opus-5");
    expect(row?.enabled).toBe(true);

    // What Settings renders comes from selectionFromConfig over the stored
    // config: the model has to be in the editable list and checked.
    const sel = selectionFromConfig(await storedConfig());
    expect(sel.models["claude-code"]).toContain("opus-5");
    expect(sel.enabled["claude-code"]).toContain("opus-5");

    // And harness_list, which is what an agent reads, offers it too.
    const listed = await invokeTool(world.db, worker(), "harness_list", {});
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    const executors = HarnessListOutputSchema.parse(listed.value).executors;
    expect(
      executors.find((item) => item.id === "claude-code")?.models,
    ).toContain("opus-5");

    // Selectable as a card harness: task_update validates against this config.
    const created = await invokeTool(world.db, worker(), "task_create", {
      project_id: world.projectId,
      title: "Card on the new model",
      type: "feature",
      o_que: "x",
      por_que: "y",
      como_confirmo: [{ step: "a", expected: "b" }],
      origem: { cli: "claude-code" },
      harness: { cli: "claude-code", model: "opus-5", effort: "high" },
    });
    expect(created.ok).toBe(true);
  });

  it("publishes per-model efforts and validates harness writes against the override", async () => {
    world = await createTestWorld();
    const updated = await invokeTool(world.db, manager(), "executors_update", {
      cli: "codex",
      label: "Codex",
      add_models: ["gpt-5.6-sol"],
      efforts: { "gpt-5.6-sol": ["low", "high"] },
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    const listed = await invokeTool(world.db, worker(), "harness_list", {});
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    const row = HarnessListOutputSchema.parse(listed.value).executors.find(
      (item) => item.id === "codex",
    );
    expect(row?.efforts["gpt-5.6-sol"]).toEqual(["low", "high"]);
    expect(row?.effort_sources?.["gpt-5.6-sol"]).toBe("custom");

    const invalidSet = await invokeTool(world.db, manager(), "harness_set", {
      type: "bug",
      cli: "codex",
      model: "gpt-5.6-sol",
      effort: "turbo",
    });
    expect(invalidSet.ok).toBe(false);
    if (invalidSet.ok) return;
    expect(invalidSet.error.code).toBe("INVALID_ARGUMENT");
    expect(invalidSet.error.message).toContain("low, high");

    const validSet = await invokeTool(world.db, manager(), "harness_set", {
      type: "bug",
      cli: "codex",
      model: "gpt-5.6-sol",
      effort: "high",
    });
    expect(validSet.ok).toBe(true);

    const invalidCreate = await invokeTool(world.db, worker(), "task_create", {
      project_id: world.projectId,
      title: "Reject unsupported effort",
      type: "feature",
      o_que: "x",
      por_que: "y",
      como_confirmo: [{ step: "a", expected: "b" }],
      origem: { cli: "codex" },
      harness: { cli: "codex", model: "gpt-5.6-sol", effort: "turbo" },
    });
    expect(invalidCreate.ok).toBe(false);
    if (invalidCreate.ok) return;
    expect(invalidCreate.error.message).toContain("low, high");

    const created = await invokeTool(world.db, worker(), "task_create", {
      project_id: world.projectId,
      title: "Record effort divergence",
      type: "feature",
      o_que: "x",
      por_que: "y",
      como_confirmo: [{ step: "a", expected: "b" }],
      origem: { cli: "codex" },
      harness: { cli: "codex", model: "gpt-5.6-sol", effort: "low" },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const createdOut = TaskCreateOutputSchema.parse(created.value);

    const invalidUpdate = await invokeTool(world.db, worker(), "task_update", {
      task_id: createdOut.task.short_id,
      harness: { cli: "codex", model: "gpt-5.6-sol", effort: "turbo" },
    });
    expect(invalidUpdate.ok).toBe(false);
    if (invalidUpdate.ok) return;
    expect(invalidUpdate.error.message).toContain("low, high");

    const claimed = await invokeTool(world.db, worker(), "task_claim", {
      task_id: createdOut.task.short_id,
      executor: { cli: "codex", model: "gpt-5.6-sol", effort: "max" },
    });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    const claimedOut = TaskClaimOutputSchema.parse(claimed.value);
    expect(claimedOut.harness_divergence?.actual.effort).toBe("max");
    expect(claimedOut.harness_divergence?.warning).toContain("low");
  });

  it("refuses a worker token and leaves the config untouched", async () => {
    world = await createTestWorld();
    const before = JSON.stringify(await storedConfig());

    const denied = await invokeTool(world.db, worker(), "executors_update", {
      cli: "codex",
      add_models: ["gpt-5.6-sol"],
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.error.code).toBe("PERMISSION_DENIED");
    expect(JSON.stringify(await storedConfig())).toBe(before);
  });

  it("adds a CLI that was not configured and resolves the agent's binary name", async () => {
    world = await createTestWorld();
    const added = await invokeTool(world.db, manager(), "executors_update", {
      cli: "codex",
      label: "Codex",
      add_models: ["gpt-5.6-sol"],
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(
      ExecutorsUpdateOutputSchema.parse(added.value).executors.find(
        (item) => item.id === "codex",
      ),
    ).toMatchObject({ label: "Codex", enabled: true, models: ["gpt-5.6-sol"] });

    // "claude" is what the CLI actually reports; it must not create a twin.
    const aliased = await invokeTool(world.db, manager(), "executors_update", {
      cli: "claude",
      add_models: ["haiku-4-5"],
    });
    expect(aliased.ok).toBe(true);
    if (!aliased.ok) return;
    const out = ExecutorsUpdateOutputSchema.parse(aliased.value);
    expect(out.updated).toBe("claude-code");
    expect(out.executors.filter((item) => item.id === "claude-code")).toHaveLength(1);
  });

  it("stays quiet while a policy line still has a successor to fall back on", async () => {
    world = await createTestWorld();
    // microcopy runs haiku-4-5 → sonnet-5 → gpt-5.6-sol. Losing the head costs
    // the line nothing, because the successor is still configured.
    const removed = await invokeTool(world.db, manager(), "executors_update", {
      cli: "claude-code",
      remove_models: ["haiku-4-5"],
    });
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    const out = ExecutorsUpdateOutputSchema.parse(removed.value);
    expect(
      out.executors.find((item) => item.id === "claude-code")?.models,
    ).not.toContain("haiku-4-5");
    expect(out.policy_warnings).toBeUndefined();

    const rec = await invokeTool(world.db, worker(), "harness_recommend", {
      type: "microcopy",
    });
    expect(rec.ok).toBe(true);
    if (!rec.ok) return;
    const recommended = HarnessRecommendOutputSchema.parse(rec.value);
    expect(recommended.available).toBe(true);
    expect(recommended.harness.model).toBe("sonnet-5");
    expect(recommended.chain_position).toBe(1);
  });

  it("removes a model and warns about the policy line it orphans", async () => {
    world = await createTestWorld();
    const removed = await invokeTool(world.db, manager(), "executors_update", {
      cli: "claude-code",
      remove_models: ["haiku-4-5", "sonnet-5"],
    });
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    const out = ExecutorsUpdateOutputSchema.parse(removed.value);
    expect(
      out.executors.find((item) => item.id === "claude-code")?.models,
    ).not.toContain("sonnet-5");
    // microcopy and drone are the two lines with no link left standing.
    expect(out.policy_warnings?.join(" ")).toContain("microcopy");
    expect(out.policy_warnings?.join(" ")).toContain("harness_set");

    // The cheap chain is gone, but claude-code is still on with top-tier
    // models: harness_recommend crosses to one of those rather than stalling,
    // and says so with available:"fallback" instead of hiding behind a bare
    // true or a useless false.
    const rec = await invokeTool(world.db, worker(), "harness_recommend", {
      type: "microcopy",
    });
    expect(rec.ok).toBe(true);
    if (!rec.ok) return;
    const recommended = HarnessRecommendOutputSchema.parse(rec.value);
    expect(recommended.available).toBe("fallback");
    expect(recommended.harness.model).toBe("fable-5");
    expect(recommended.matched_executor?.cli).toBe("claude-code");
    expect(recommended.divergence).toContain("fallback");
  });

  it("warns only about what this call broke, not about orphans it inherited", async () => {
    world = await createTestWorld();
    // Leave the board already broken: the cheap lines lose every link.
    const first = await invokeTool(world.db, manager(), "executors_update", {
      cli: "claude-code",
      remove_models: ["haiku-4-5", "sonnet-5"],
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const broke = ExecutorsUpdateOutputSchema.parse(first.value).policy_warnings ?? [];
    expect(broke).toHaveLength(2);
    expect(broke.join(" ")).toContain("'microcopy'");
    expect(broke.join(" ")).toContain("'drone'");

    // An unrelated add must not re-report the orphan that was already there.
    const second = await invokeTool(world.db, manager(), "executors_update", {
      cli: "codex",
      add_models: ["gpt-5.6-sol"],
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(
      ExecutorsUpdateOutputSchema.parse(second.value).policy_warnings,
    ).toBeUndefined();
  });

  it("drops a whole CLI and reports an unknown one as NOT_FOUND", async () => {
    world = await createTestWorld();
    const dropped = await invokeTool(world.db, manager(), "executors_update", {
      cli: "claude-code",
      remove: true,
    });
    expect(dropped.ok).toBe(true);
    if (!dropped.ok) return;
    const out = ExecutorsUpdateOutputSchema.parse(dropped.value);
    expect(out.removed).toBe(true);
    expect(out.executors.map((item) => item.id)).not.toContain("claude-code");
    expect(await storedConfig()).toHaveLength(0);

    const missing = await invokeTool(world.db, manager(), "executors_update", {
      cli: "nothing-here",
      remove: true,
    });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.error.code).toBe("NOT_FOUND");
    expect(missing.error.message).toContain("harness_list");
  });

  it("rejects a call that asks for nothing and one that mixes remove with edits", async () => {
    world = await createTestWorld();
    const empty = await invokeTool(world.db, manager(), "executors_update", {
      cli: "claude-code",
    });
    expect(empty.ok).toBe(false);
    if (empty.ok) return;
    expect(empty.error.code).toBe("INVALID_ARGUMENT");

    const mixed = await invokeTool(world.db, manager(), "executors_update", {
      cli: "claude-code",
      remove: true,
      add_models: ["opus-5"],
    });
    expect(mixed.ok).toBe(false);
    if (mixed.ok) return;
    expect(mixed.error.code).toBe("INVALID_ARGUMENT");
  });

  it("turns a CLI off without losing its models", async () => {
    world = await createTestWorld();
    const off = await invokeTool(world.db, manager(), "executors_update", {
      cli: "claude-code",
      enabled: false,
    });
    expect(off.ok).toBe(true);
    if (!off.ok) return;
    const row = ExecutorsUpdateOutputSchema.parse(off.value).executors.find(
      (item) => item.id === "claude-code",
    );
    expect(row?.enabled).toBe(false);
    expect(row?.models).toEqual([
      "fable-5",
      "opus-5",
      "opus-4-8",
      "sonnet-5",
      "haiku-4-5",
    ]);

    // harness_list only reports what is on, so the policy has nothing left.
    const listed = await invokeTool(world.db, worker(), "harness_list", {});
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(
      HarnessListOutputSchema.parse(listed.value).executors.find(
        (item) => item.id === "claude-code",
      )?.enabled,
    ).toBe(false);
  });

  it("returns a compact ack that matches its own output schema (OCL-75 regression: removed used to sit inside changed, failing ExecutorsWriteAckSchema)", async () => {
    world = await createTestWorld();
    const off = await invokeTool(world.db, manager(), "executors_update", {
      cli: "claude-code",
      enabled: false,
      return: "ack",
    });
    expect(off.ok).toBe(true);
    if (!off.ok) return;
    // The real bug: this call site validates the tool's own output schema,
    // the same check the MCP server runs on every response. It used to throw
    // "invalid response from executors_update: Invalid input" here.
    const parsed = toolContracts.executors_update.output.parse(off.value);
    expect(parsed).toMatchObject({ id: "claude-code", removed: false });
  });
});

describe("harness_recommend falls back across CLIs when a policy's own executor is off (OCL-75)", () => {
  let world: TestWorld;

  afterEach(async () => {
    if (world) await closeTestWorld(world);
  });

  function worker() {
    return {
      tokenId: world.tokenId,
      workspaceId: world.workspaceId,
      tokenLabel: "test-agent",
      canManage: false,
    };
  }

  function manager() {
    return {
      tokenId: world.manageTokenId,
      workspaceId: world.workspaceId,
      tokenLabel: "owner-console",
      canManage: true,
    };
  }

  it("recommends the best available cross-CLI model with divergence, then returns to full policy on re-enable", async () => {
    world = await createTestWorld();

    // Real-world case (2026-08-19): the owner ran out of GPT limit and wants
    // Codex off temporarily, without the cardápio turning into a dead end.
    const addedCodex = await invokeTool(world.db, manager(), "executors_update", {
      cli: "codex",
      label: "Codex",
      add_models: ["gpt-5.6-sol", "gpt-5.6-terra"],
    });
    expect(addedCodex.ok).toBe(true);

    const policySet = await invokeTool(world.db, manager(), "harness_set", {
      type: "feature",
      cli: "codex",
      model: "gpt-5.6-sol",
      chain: ["gpt-5.6-sol", "gpt-5.6-terra"],
      effort: "high",
    });
    expect(policySet.ok).toBe(true);

    const fullPolicy = await invokeTool(world.db, worker(), "harness_recommend", {
      type: "feature",
    });
    expect(fullPolicy.ok).toBe(true);
    if (!fullPolicy.ok) return;
    expect(HarnessRecommendOutputSchema.parse(fullPolicy.value)).toMatchObject({
      available: true,
      harness: { cli: "codex", model: "gpt-5.6-sol" },
    });

    // 1. executors_update {cli: codex, enabled: false} -> a valid ack.
    const disabled = await invokeTool(world.db, manager(), "executors_update", {
      cli: "codex",
      enabled: false,
      return: "ack",
    });
    expect(disabled.ok).toBe(true);
    if (!disabled.ok) return;
    toolContracts.executors_update.output.parse(disabled.value);

    // 2. harness_recommend(feature) with codex off -> cross-CLI fallback,
    // never a silent tier below, with a divergence explaining both halves.
    const withFallback = await invokeTool(world.db, worker(), "harness_recommend", {
      type: "feature",
    });
    expect(withFallback.ok).toBe(true);
    if (!withFallback.ok) return;
    const fallback = HarnessRecommendOutputSchema.parse(withFallback.value);
    expect(fallback.available).toBe("fallback");
    expect(fallback.harness.cli).toBe("claude-code");
    expect(fallback.harness.model).toBe("sonnet-5");
    expect(fallback.matched_executor).toMatchObject({
      cli: "claude-code",
      model: "sonnet-5",
    });
    expect(fallback.divergence).toContain("gpt-5.6-sol");
    expect(fallback.divergence).toContain("fallback");

    // 3. executors_update {cli: codex, enabled: true} + recommend -> full
    // policy is back, no residue from the fallback detour.
    const reenabled = await invokeTool(world.db, manager(), "executors_update", {
      cli: "codex",
      enabled: true,
      return: "ack",
    });
    expect(reenabled.ok).toBe(true);
    if (!reenabled.ok) return;
    toolContracts.executors_update.output.parse(reenabled.value);

    const backToPolicy = await invokeTool(world.db, worker(), "harness_recommend", {
      type: "feature",
    });
    expect(backToPolicy.ok).toBe(true);
    if (!backToPolicy.ok) return;
    expect(HarnessRecommendOutputSchema.parse(backToPolicy.value)).toMatchObject({
      available: true,
      harness: { cli: "codex", model: "gpt-5.6-sol", effort: "high" },
      chain_position: 0,
    });
  });

  it("rejects task_create/task_update citing a disabled executor's model, with the fallback in the error (OCL-77)", async () => {
    world = await createTestWorld();
    const addedCodex = await invokeTool(world.db, manager(), "executors_update", {
      cli: "codex",
      label: "Codex",
      add_models: ["gpt-5.6-sol"],
    });
    expect(addedCodex.ok).toBe(true);
    const disabled = await invokeTool(world.db, manager(), "executors_update", {
      cli: "codex",
      enabled: false,
    });
    expect(disabled.ok).toBe(true);

    // 4. task_create with a harness citing a disabled executor is a typed
    // rejection, never a silent accept, and the error already carries the
    // fallback harness_recommend would give for this activity type.
    const rejected = await invokeTool(world.db, worker(), "task_create", {
      project_id: world.projectId,
      title: "Card pinned to a disabled executor",
      type: "feature",
      o_que: "x",
      por_que: "y",
      como_confirmo: [{ step: "a", expected: "b" }],
      origem: { cli: "codex" },
      harness: { cli: "codex", model: "gpt-5.6-sol", effort: "high" },
    });
    expect(rejected.ok).toBe(false);
    if (rejected.ok) return;
    expect(rejected.error.code).toBe("INVALID_ARGUMENT");
    expect(rejected.error.message).toContain("codex");
    expect(rejected.error.message).toContain("disabled");
    expect(rejected.error.message).toContain("opus-5");

    // No half-created card left behind by the rejected write.
    const search = await invokeTool(world.db, worker(), "task_search", {
      q: "Card pinned to a disabled executor",
    });
    expect(search.ok).toBe(true);
    if (search.ok) expect(TaskSearchOutputSchema.parse(search.value).tasks).toHaveLength(0);

    // task_update citing the same disabled executor is rejected the same
    // way; other fields on an existing card stay editable (OCL-77 item 4).
    const created = await invokeTool(world.db, worker(), "task_create", {
      project_id: world.projectId,
      title: "Card without a pinned harness",
      type: "feature",
      o_que: "x",
      por_que: "y",
      como_confirmo: [{ step: "a", expected: "b" }],
      origem: { cli: "codex" },
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const card = TaskCreateOutputSchema.parse(created.value).task;

    const rejectedUpdate = await invokeTool(world.db, worker(), "task_update", {
      task_id: card.short_id,
      harness: { cli: "codex", model: "gpt-5.6-sol", effort: "high" },
    });
    expect(rejectedUpdate.ok).toBe(false);
    if (rejectedUpdate.ok) return;
    expect(rejectedUpdate.error.code).toBe("INVALID_ARGUMENT");
    expect(rejectedUpdate.error.message).toContain("disabled");

    const commented = await invokeTool(world.db, worker(), "task_update", {
      task_id: card.short_id,
      comment: "still editable without touching the harness",
    });
    expect(commented.ok).toBe(true);

    // 5. Re-enabling codex makes the same explicit harness a normal accept
    // again, on both task_create and task_update.
    const reenabled = await invokeTool(world.db, manager(), "executors_update", {
      cli: "codex",
      enabled: true,
    });
    expect(reenabled.ok).toBe(true);

    const acceptedCreate = await invokeTool(world.db, worker(), "task_create", {
      project_id: world.projectId,
      title: "Card pinned to a re-enabled executor",
      type: "feature",
      o_que: "x",
      por_que: "y",
      como_confirmo: [{ step: "a", expected: "b" }],
      origem: { cli: "codex" },
      harness: { cli: "codex", model: "gpt-5.6-sol", effort: "high" },
    });
    expect(acceptedCreate.ok).toBe(true);
    if (!acceptedCreate.ok) return;
    expect(TaskCreateOutputSchema.parse(acceptedCreate.value).task.harness).toMatchObject({
      cli: "codex",
      model: "gpt-5.6-sol",
    });

    const acceptedUpdate = await invokeTool(world.db, worker(), "task_update", {
      task_id: card.short_id,
      harness: { cli: "codex", model: "gpt-5.6-sol", effort: "high" },
    });
    expect(acceptedUpdate.ok).toBe(true);
  });
});
