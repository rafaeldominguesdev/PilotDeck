import { describe, expect, it } from "vitest";
import {
  ACTIVITY_HARNESS,
  CARDAPIO_TASK_TYPES,
  CardapioTaskTypeSchema,
  DEFAULT_CARDAPIO,
  effortOptionsForModel,
  effortSourceForModel,
  FACTORY_CARDAPIO_POLICY,
  lookupCardapioPolicy,
  policyChain,
  recommendHarness,
  type ConfiguredExecutor,
} from "../src/index.js";

const mixedExecutors: ConfiguredExecutor[] = [
  {
    id: "cli-overclock",
    cli: "overclock",
    models: ["opus-4-8", "sonnet-5", "haiku-4"],
  },
  {
    id: "cli-codex",
    cli: "codex",
    models: ["gpt-5"],
  },
];

describe("model-specific effort catalog", () => {
  it("seeds provider values and their evidence without collapsing them to one enum", () => {
    expect(effortOptionsForModel({ cli: "codex", model: "gpt-5.6-sol" })).toEqual([
      "minimal",
      "low",
      "medium",
      "high",
      "xhigh",
      "max",
    ]);
    expect(effortOptionsForModel({ cli: "codex", model: "gpt-reserve" })).toEqual([
      "minimal",
      "low",
      "medium",
      "high",
      "xhigh",
      "max",
    ]);
    expect(effortOptionsForModel({ cli: "kimi", model: "k3" })).toEqual(["max"]);
    expect(effortOptionsForModel({ cli: "kimi", model: "kimi-for-coding" })).toEqual([
      "off",
      "on",
    ]);
    expect(effortSourceForModel({ cli: "grok", model: "grok-4.5" })).toMatch(
      /^https:\/\//,
    );
  });
});

describe("the routing table", () => {
  it("covers every activity type, once, with a three-deep chain", () => {
    expect(Object.keys(ACTIVITY_HARNESS)).toEqual([...CARDAPIO_TASK_TYPES]);
    expect(new Set(CARDAPIO_TASK_TYPES).size).toBe(CARDAPIO_TASK_TYPES.length);
    for (const type of CARDAPIO_TASK_TYPES) {
      const row = ACTIVITY_HARNESS[type];
      expect(row.chain).toHaveLength(3);
      expect(new Set(row.chain).size).toBe(3);
      expect(row.hint.length).toBeGreaterThan(0);
    }
  });

  it("is the same list the MCP contract accepts", () => {
    expect(CardapioTaskTypeSchema.options).toEqual([...CARDAPIO_TASK_TYPES]);
  });

  it("routes the cheap lanes cheap and the irreversible ones to the top", () => {
    expect(DEFAULT_CARDAPIO.drone).toEqual({ model_tier: "cheap", effort: "low" });
    expect(DEFAULT_CARDAPIO.microcopy).toEqual({ model_tier: "cheap", effort: "low" });
    expect(DEFAULT_CARDAPIO.ship).toMatchObject({ model_tier: "top" });
    expect(DEFAULT_CARDAPIO.rfc).toEqual({ model_tier: "top", effort: "high" });
  });
});

describe("factory cardápio policy (explicit table)", () => {
  it("seeds one row per activity type, each born with its whole chain", () => {
    expect(FACTORY_CARDAPIO_POLICY.map((row) => row.type)).toEqual([
      ...CARDAPIO_TASK_TYPES,
    ]);
    expect(FACTORY_CARDAPIO_POLICY.find((row) => row.type === "bug")).toEqual({
      type: "bug",
      cli: null,
      model: "fable-5",
      chain: ["fable-5", "opus-5", "gpt-5.6-sol"],
      effort: "medium",
    });
    expect(FACTORY_CARDAPIO_POLICY[0]).not.toHaveProperty("skills");
    expect(FACTORY_CARDAPIO_POLICY.find((row) => row.type === "rfc")).toMatchObject({
      model: "opus-5",
      effort: "high",
      cli: null,
    });
    expect(FACTORY_CARDAPIO_POLICY.find((row) => row.type === "drone")).toMatchObject({
      model: "haiku-4-5",
      effort: "low",
    });
  });

  it("makes the head of every chain the model the row prints", () => {
    for (const row of FACTORY_CARDAPIO_POLICY) {
      expect(row.model).toBe(row.chain?.[0]);
    }
  });

  it("looks up a stored row and falls back to factory when the type is missing", () => {
    const edited = lookupCardapioPolicy(
      [
        {
          type: "bug",
          cli: "codex",
          model: "gpt-5",
          effort: "high",
        },
      ],
      "bug",
    );
    expect(edited).toEqual({
      type: "bug",
      cli: "codex",
      model: "gpt-5",
      effort: "high",
    });

    const fallback = lookupCardapioPolicy(
      [{ type: "bug", cli: null, model: "gpt-4.1", effort: "low" }],
      "drone",
    );
    expect(fallback).toEqual({
      type: "drone",
      cli: null,
      model: "haiku-4-5",
      chain: ["haiku-4-5", "gpt-5.6-sol", "sonnet-5"],
      effort: "low",
    });
  });
});

describe("policyChain", () => {
  it("reads a bare model as a chain of one", () => {
    expect(policyChain({ type: "bug", cli: null, model: "fable-5", effort: "low" })).toEqual([
      "fable-5",
    ]);
  });

  it("puts the model at the head and drops repeats, whatever their casing", () => {
    expect(
      policyChain({
        type: "bug",
        cli: null,
        model: "fable-5",
        chain: ["Fable-5", "opus-5", "opus-5"],
        effort: "low",
      }),
    ).toEqual(["fable-5", "opus-5"]);
  });

  it("is empty when nothing was declared", () => {
    expect(policyChain({ type: "bug", cli: null, model: null, effort: "low" })).toEqual([]);
  });
});

describe("harness recommendation (cardápio × executors)", () => {
  it("intersects research with a mid-tier model from the configured executors", () => {
    const result = recommendHarness({
      type: "research",
      executors: mixedExecutors,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.available).toBe(true);
    expect(result.value.harness.model).toBe("sonnet-5");
    expect(result.value.harness.effort).toBe("medium");
    expect(result.value.harness).not.toHaveProperty("skills");
    expect(result.value.model_tier).toBe("mid");
    expect(result.value.matched_executor).toEqual({
      id: "cli-overclock",
      cli: "overclock",
      model: "sonnet-5",
    });
  });

  it("picks a top-tier model for rfc, not the cheaper ones also configured", () => {
    const result = recommendHarness({
      type: "rfc",
      executors: mixedExecutors,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.harness.model).toBe("opus-4-8");
    expect(result.value.harness.effort).toBe("high");
    expect(result.value.model_tier).toBe("top");
  });

  it("picks a cheap model for drone work", () => {
    const result = recommendHarness({
      type: "drone",
      executors: mixedExecutors,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.harness.model).toBe("haiku-4");
    expect(result.value.harness.effort).toBe("low");
    expect(result.value.model_tier).toBe("cheap");
  });

  it("returns available:false when no executor has a matching-tier model", () => {
    const result = recommendHarness({
      type: "rfc",
      executors: [
        { id: "only-cheap", cli: "other", models: ["haiku-4"] },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.available).toBe(false);
    expect(result.value.harness.model).toBeNull();
    expect(result.value.model_tier).toBe("top");
    expect(result.value.harness.effort).toBe("high");
    expect(result.value.matched_executor).toBeNull();
  });

  it("returns available:false when no executors are configured", () => {
    const result = recommendHarness({ type: "research", executors: [] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.available).toBe(false);
    expect(result.value.model_tier).toBe("mid");
  });

  it("uses an explicit harness when the creator declares one", () => {
    const result = recommendHarness({
      type: "bug",
      executors: mixedExecutors,
      explicit: {
        model: "opus-4-8",
        effort: "high",
        cli: "overclock",
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.source).toBe("explicit");
    expect(result.value.harness.model).toBe("opus-4-8");
    expect(result.value.harness.effort).toBe("high");
    expect(result.value.available).toBe(true);
    expect(result.value.divergence).toBeUndefined();
  });

  it("warns when the explicit model is not in the configured executors", () => {
    const result = recommendHarness({
      type: "bug",
      executors: mixedExecutors,
      explicit: { model: "mystery-model", effort: "medium" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.source).toBe("explicit");
    expect(result.value.available).toBe(false);
    expect(result.value.divergence).toMatch(/mystery-model/);
  });

  it("rejects an explicit effort that the configured model does not support", () => {
    const result = recommendHarness({
      type: "bug",
      executors: [
        {
          id: "codex",
          cli: "codex",
          models: ["gpt-5.6-sol"],
          efforts: { "gpt-5.6-sol": ["low", "high"] },
        },
      ],
      explicit: {
        model: "gpt-5.6-sol",
        effort: "turbo",
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_ARGUMENT");
    expect(result.error.message).toContain("low, high");
  });

  it("lets a workspace override the default cardápio matrix", () => {
    const result = recommendHarness({
      type: "research",
      executors: mixedExecutors,
      cardapio: {
        ...DEFAULT_CARDAPIO,
        research: { model_tier: "top", effort: "high" },
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.harness.model).toBe("opus-4-8");
    expect(result.value.harness.effort).toBe("high");
  });

  it("matches models by alias (sonnet → sonnet-5)", () => {
    const result = recommendHarness({
      type: "research",
      executors: [{ id: "cc", cli: "claude-code", models: ["sonnet"] }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.available).toBe(true);
    expect(result.value.harness.model).toBe("sonnet");
  });
});

describe("harness recommendation as stored-policy lookup", () => {
  it("returns the stored policy row, not a tier heuristic", () => {
    const result = recommendHarness({
      type: "bug",
      executors: mixedExecutors,
      policy: [
        {
          type: "bug",
          cli: "codex",
          model: "gpt-5",
          effort: "high",
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.source).toBe("cardapio");
    expect(result.value.harness).toEqual({
      cli: "codex",
      model: "gpt-5",
      effort: "high",
    });
    expect(result.value.harness).not.toHaveProperty("skills");
    expect(result.value.chain).toEqual(["gpt-5"]);
    expect(result.value.chain_position).toBe(0);
    expect(result.value.matched_executor).toEqual({
      id: "cli-codex",
      cli: "codex",
      model: "gpt-5",
    });
  });

  it("adjusts a legacy policy effort to the first supported model value", () => {
    const result = recommendHarness({
      type: "bug",
      executors: [
        {
          id: "codex",
          cli: "codex",
          models: ["gpt-5.6-sol"],
          efforts: { "gpt-5.6-sol": ["low", "high"] },
        },
      ],
      policy: [
        {
          type: "bug",
          cli: "codex",
          model: "gpt-5.6-sol",
          effort: "turbo",
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.harness.effort).toBe("low");
    expect(result.value.divergence).toContain("turbo");
  });

  it("falls back to factory defaults when the type is missing from the stored policy", () => {
    const result = recommendHarness({
      type: "drone",
      executors: [{ id: "cc", cli: "claude-code", models: ["haiku-4-5"] }],
      policy: [
        {
          type: "bug",
          cli: "codex",
          model: "gpt-5",
          effort: "low",
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.harness.model).toBe("haiku-4-5");
    expect(result.value.harness.effort).toBe("low");
    expect(result.value.harness).not.toHaveProperty("skills");
  });
});

describe("the line of succession", () => {
  const policy = [
    {
      type: "bug",
      cli: "claude-code",
      model: "fable-5",
      chain: ["fable-5", "opus-5", "gpt-5.6-sol"],
      effort: "medium" as const,
    },
  ];

  it("claims the first choice when the workspace can run it", () => {
    const result = recommendHarness({
      type: "bug",
      executors: [{ id: "cc", cli: "claude-code", models: ["fable-5", "opus-5"] }],
      policy,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.harness.model).toBe("fable-5");
    expect(result.value.chain_position).toBe(0);
    expect(result.value.available).toBe(true);
    expect(result.value.divergence).toBeUndefined();
  });

  it("falls through to the successor when the first choice is switched off", () => {
    const result = recommendHarness({
      type: "bug",
      executors: [{ id: "cc", cli: "claude-code", models: ["opus-5"] }],
      policy,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.harness.model).toBe("opus-5");
    expect(result.value.chain_position).toBe(1);
    expect(result.value.available).toBe(true);
    expect(result.value.divergence).toMatch(/fable-5/);
  });

  it("crosses to another CLI rather than stall, because only the head is pinned", () => {
    const result = recommendHarness({
      type: "bug",
      executors: [{ id: "codex", cli: "codex", models: ["gpt-5.6-sol"] }],
      policy,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.harness).toEqual({
      cli: "codex",
      model: "gpt-5.6-sol",
      effort: "medium",
    });
    expect(result.value.chain_position).toBe(2);
    expect(result.value.model_tier).toBe("mid");
  });

  it("starts the second try one link down, off the model that was rejected", () => {
    const result = recommendHarness({
      type: "bug",
      executors: [{ id: "cc", cli: "claude-code", models: ["fable-5", "opus-5"] }],
      policy,
      attempt: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.harness.model).toBe("opus-5");
    expect(result.value.chain_position).toBe(1);
    expect(result.value.divergence).toMatch(/Try 2/);
  });

  it("tells a retry apart from a fall-through in what it says", () => {
    // Same landing spot, two different reasons, and the message names which.
    const fellThrough = recommendHarness({
      type: "bug",
      executors: [{ id: "cc", cli: "claude-code", models: ["opus-5"] }],
      policy,
    });
    const retried = recommendHarness({
      type: "bug",
      executors: [{ id: "cc", cli: "claude-code", models: ["fable-5", "opus-5"] }],
      policy,
      attempt: 1,
    });
    expect(fellThrough.ok && retried.ok).toBe(true);
    if (!fellThrough.ok || !retried.ok) return;
    expect(fellThrough.value.harness.model).toBe(retried.value.harness.model);
    expect(fellThrough.value.divergence).toMatch(/not among the configured executors/);
    expect(retried.value.divergence).not.toMatch(/not among the configured executors/);
  });

  it("runs out at the last link rather than wrapping back to the top", () => {
    const result = recommendHarness({
      type: "bug",
      executors: [
        { id: "cc", cli: "claude-code", models: ["fable-5", "opus-5"] },
        { id: "codex", cli: "codex", models: ["gpt-5.6-sol"] },
      ],
      policy,
      attempt: 9,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.harness.model).toBe("gpt-5.6-sol");
    expect(result.value.chain_position).toBe(2);
  });

  it("keeps climbing past a retry link the workspace cannot run", () => {
    const result = recommendHarness({
      type: "bug",
      executors: [
        { id: "cc", cli: "claude-code", models: ["fable-5"] },
        { id: "codex", cli: "codex", models: ["gpt-5.6-sol"] },
      ],
      policy,
      attempt: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // opus-5 is the retry link and it is not configured, so the walk goes on
    // rather than dropping back to fable-5, which is the model that failed.
    expect(result.value.harness.model).toBe("gpt-5.6-sol");
    expect(result.value.chain_position).toBe(2);
    expect(result.value.divergence).toMatch(/opus-5/);
  });

  it("is unavailable only when every link is gone, and says so once", () => {
    const result = recommendHarness({
      type: "bug",
      executors: [{ id: "cc", cli: "claude-code", models: ["haiku-4-5"] }],
      policy,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.available).toBe(false);
    expect(result.value.chain_position).toBeUndefined();
    expect(result.value.divergence).toBe(
      "No model in the chain (fable-5 → opus-5 → gpt-5.6-sol) is among the configured executors.",
    );
  });
});

describe("cross-CLI fallback when a whole chain's executor is disabled (OCL-75)", () => {
  // A policy pinned to codex alone: disabling codex leaves nothing in the
  // chain, exactly the shape harness_set produces for an owner who wants one
  // CLI in charge of an activity type.
  const codexOnlyPolicy = [
    {
      type: "feature",
      cli: "codex",
      model: "gpt-5.6-sol",
      chain: ["gpt-5.6-sol", "gpt-5.6-terra"],
      effort: "high" as const,
    },
  ];

  it("recommends the best same-tier executor still enabled, and marks it as a fallback", () => {
    const result = recommendHarness({
      type: "feature",
      // codex is not configured at all here, standing in for "disabled":
      // executorsFromWorkspace already filters those out before this ever runs.
      executors: [
        { id: "claude-code", cli: "claude-code", models: ["sonnet-5", "haiku-4-5"] },
      ],
      policy: codexOnlyPolicy,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // gpt-5.6-sol / gpt-5.6-terra are mid tier, and so is sonnet-5: the
    // fallback lands on the closest stand-in, not just anything enabled.
    expect(result.value.available).toBe("fallback");
    expect(result.value.harness).toEqual({
      cli: "claude-code",
      model: "sonnet-5",
      effort: "high",
    });
    expect(result.value.matched_executor).toEqual({
      id: "claude-code",
      cli: "claude-code",
      model: "sonnet-5",
    });
    expect(result.value.divergence).toContain("gpt-5.6-sol");
    expect(result.value.divergence).toContain("fallback");
  });

  it("climbs to a better tier rather than ever falling to a cheaper one", () => {
    const result = recommendHarness({
      type: "feature",
      // No mid-tier model anywhere, only haiku-4-5 (cheap) and opus-5 (top).
      // The rule is same tier, else better tier, never a silent downgrade.
      executors: [{ id: "claude-code", cli: "claude-code", models: ["haiku-4-5", "opus-5"] }],
      policy: codexOnlyPolicy,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.available).toBe("fallback");
    expect(result.value.harness.model).toBe("opus-5");
    expect(result.value.model_tier).toBe("top");
  });

  it("stays genuinely unavailable when nothing at or above the chain's tier runs", () => {
    const result = recommendHarness({
      type: "feature",
      executors: [{ id: "claude-code", cli: "claude-code", models: ["haiku-4-5"] }],
      policy: codexOnlyPolicy,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.available).toBe(false);
    expect(result.value.matched_executor).toBeNull();
  });

  it("does not fall back when the chain resolved earlier and this retry simply ran out of links", () => {
    // fable-5 and opus-5 both ran (and were rejected); gpt-5.6-sol is not
    // configured. This is the ordinary "line ran out" case from the section
    // above, not a disabled executor: no cross-CLI fallback should fire.
    const result = recommendHarness({
      type: "bug",
      executors: [{ id: "cc", cli: "claude-code", models: ["fable-5", "opus-5"] }],
      policy: [
        {
          type: "bug",
          cli: "claude-code",
          model: "fable-5",
          chain: ["fable-5", "opus-5", "gpt-5.6-sol"],
          effort: "medium" as const,
        },
      ],
      attempt: 2,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.available).toBe(false);
    expect(result.value.harness.model).toBe("fable-5");
    expect(result.value.divergence).toBe(
      "No model in the chain (fable-5 → opus-5 → gpt-5.6-sol) is among the configured executors.",
    );
  });
});

describe("harness account/provider (OCL-108)", () => {
  const twoAccountPolicy = [
    {
      type: "feature",
      cli: "claude-code",
      model: "sonnet-5",
      effort: "high" as const,
    },
  ];

  it("stays untouched, retrocompatible, when nobody names an account", () => {
    const result = recommendHarness({
      type: "feature",
      executors: [{ id: "claude-code", cli: "claude-code", models: ["sonnet-5"] }],
      policy: twoAccountPolicy,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.harness).toEqual({
      cli: "claude-code",
      model: "sonnet-5",
      effort: "high",
    });
    expect(result.value.harness).not.toHaveProperty("account");
    expect(result.value.divergence).toBeUndefined();
  });

  it("passes an account through untouched when the executor tracks none", () => {
    const result = recommendHarness({
      type: "feature",
      executors: [{ id: "claude-code", cli: "claude-code", models: ["sonnet-5"] }],
      policy: [{ ...twoAccountPolicy[0], account: "claude-oauth-acc-2" }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.harness.account).toBe("claude-oauth-acc-2");
    expect(result.value.divergence).toBeUndefined();
  });

  it("resolves the enabled preferred account with no divergence", () => {
    const result = recommendHarness({
      type: "feature",
      executors: [
        {
          id: "claude-code",
          cli: "claude-code",
          models: ["sonnet-5"],
          accounts: [
            { id: "claude-oauth", label: "Conta 1", enabled: true },
            { id: "claude-oauth-acc-2", label: "Conta 2", enabled: true },
          ],
        },
      ],
      policy: [{ ...twoAccountPolicy[0], account: "claude-oauth-acc-2" }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.harness.account).toBe("claude-oauth-acc-2");
    expect(result.value.divergence).toBeUndefined();
  });

  it("skips a disabled account for another one on the same cli, and says so", () => {
    const result = recommendHarness({
      type: "feature",
      executors: [
        {
          id: "claude-code",
          cli: "claude-code",
          models: ["sonnet-5"],
          accounts: [
            { id: "claude-oauth", label: "Conta 1", enabled: false },
            { id: "claude-oauth-acc-2", label: "Conta 2", enabled: true },
          ],
        },
      ],
      policy: twoAccountPolicy,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.available).toBe(true);
    expect(result.value.harness.cli).toBe("claude-code");
    expect(result.value.harness.account).toBe("claude-oauth-acc-2");
    expect(result.value.divergence).toMatch(/claude-oauth.*disabled/);
    expect(result.value.divergence).toMatch(/claude-oauth-acc-2/);
  });

  it("falls back cross-CLI only once every account of the chain's executor is disabled", () => {
    const result = recommendHarness({
      type: "feature",
      executors: [
        {
          id: "claude-code",
          cli: "claude-code",
          models: ["sonnet-5"],
          accounts: [{ id: "claude-oauth", label: "Conta 1", enabled: false }],
        },
        { id: "codex", cli: "codex", models: ["gpt-5.6-sol"] },
      ],
      policy: twoAccountPolicy,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.available).toBe("fallback");
    expect(result.value.harness.cli).toBe("codex");
    expect(result.value.harness).not.toHaveProperty("account");
  });

  it("accepts an unknown account id leniently, since the board does not own the list", () => {
    const result = recommendHarness({
      type: "feature",
      executors: [
        {
          id: "claude-code",
          cli: "claude-code",
          models: ["sonnet-5"],
          accounts: [{ id: "claude-oauth", label: "Conta 1", enabled: true }],
        },
      ],
      policy: [{ ...twoAccountPolicy[0], account: "some-other-account" }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.harness.account).toBe("some-other-account");
    expect(result.value.divergence).toBeUndefined();
  });

  it("resolves the explicit path's account the same way", () => {
    const result = recommendHarness({
      type: "feature",
      executors: [
        {
          id: "claude-code",
          cli: "claude-code",
          models: ["sonnet-5"],
          accounts: [
            { id: "claude-oauth", label: "Conta 1", enabled: false },
            { id: "claude-oauth-acc-2", label: "Conta 2", enabled: true },
          ],
        },
      ],
      explicit: { model: "sonnet-5", effort: "high", account: "claude-oauth" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.source).toBe("explicit");
    expect(result.value.harness.account).toBe("claude-oauth-acc-2");
    expect(result.value.divergence).toMatch(/claude-oauth.*disabled/);
  });
});
