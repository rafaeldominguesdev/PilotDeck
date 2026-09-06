import { err, ok, type Result } from "../errors.js";
import { effortOptionsForModel } from "./efforts.js";

export const MODEL_TIERS = ["top", "mid", "cheap"] as const;
export type ModelTier = (typeof MODEL_TIERS)[number];

/** Common values shown by the built-in catalog. Providers may add others. */
export const EFFORT_LEVELS = [
  "minimal",
  "none",
  "off",
  "on",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;
export type EffortLevel = string;

/**
 * The activities a workspace routes, grouped by the question they answer:
 * build, debug, design, publish, decide, orchestrate, verify, ship, learn.
 *
 * These are shapes of work, not topics. Two requests share a type when the same
 * thing decides whether a model succeeds at them: a dictated one-line tweak and
 * a repo-wide migration are both "code", and belong nowhere near each other in
 * a routing table.
 */
export const CARDAPIO_TASK_TYPES = [
  // Build
  "feature",
  "tweak",
  "contract",
  "refactor",
  // Debug
  "bug",
  "deep_bug",
  "fleet_triage",
  // Design
  "showpiece",
  "visual_fix",
  "publish",
  // Words
  "page_copy",
  "docs",
  "microcopy",
  // Decide
  "rfc",
  // Orchestrate
  "fanout",
  "doctrine",
  // Verify
  "review",
  "drone",
  // Ship and learn
  "ship",
  "research",
] as const;
export type CardapioTaskType = (typeof CARDAPIO_TASK_TYPES)[number];

export type CardapioEntry = {
  model_tier: ModelTier;
  effort: EffortLevel;
};

export type Cardapio = Record<CardapioTaskType, CardapioEntry>;

export type ModelInfo = {
  id: string;
  tier: ModelTier;
  aliases?: readonly string[];
};

/**
 * One account/provider a CLI can run under (e.g. two Claude OAuth accounts
 * behind the same `claude-code` executor). Unset `accounts` on the parent
 * executor means the board does not track accounts for that CLI: any
 * `harness.account` a card names is passed through untouched, since
 * validating it is somebody else's job (usually Overclock itself).
 */
export type ConfiguredAccount = {
  id: string;
  label: string;
  enabled: boolean;
};

export type ConfiguredExecutor = {
  id: string;
  cli: string;
  models: string[];
  agents?: string[];
  /** Supported effort values keyed by model, when known. */
  efforts?: Readonly<Record<string, readonly string[]>>;
  /** Accounts this executor can run under. Absent/empty means untracked. */
  accounts?: readonly ConfiguredAccount[];
};

export type Harness = {
  cli: string | null;
  model: string | null;
  effort: EffortLevel;
  /**
   * Which account/provider of `cli` should run this. Optional and
   * retrocompatible: a harness with no account means any account of that
   * cli, exactly today's behavior.
   */
  account?: string | null;
};

export type MatchedExecutor = {
  id: string;
  cli: string;
  model: string;
};

export type RecommendInput = {
  type: CardapioTaskType;
  executors: readonly ConfiguredExecutor[];
  cardapio?: Cardapio;
  catalog?: readonly ModelInfo[];
  /** Stored workspace policy. When set, recommend is a lookup (factory fallback). */
  policy?: readonly CardapioPolicyEntry[];
  /**
   * Which try this is, zero-based. The chain walk starts here, so a card whose
   * delivery was rejected comes back on the next model down the line instead of
   * on the one that just failed review. Ignored by the explicit path: a harness
   * somebody pinned by hand is not the board's to escalate.
   */
  attempt?: number;
  explicit?: {
    cli?: string;
    model: string;
    effort: EffortLevel;
    /** Preferred account/provider; disabled or unknown falls back leniently. */
    account?: string | null;
  };
};

/**
 * One declared row of the workspace cardapio: activity type → CLI · chain · effort.
 *
 * The chain is the line of succession for that activity, best first. The board
 * claims the first model in it that the workspace can actually run, so a policy
 * survives an executor being switched off instead of falling back to a tier
 * guess. `model` is the head of the chain, kept as its own field because the
 * card, the DB column and the MCP contract all want one name to print.
 */
export type CardapioPolicyEntry = {
  type: string;
  cli: string | null;
  model: string | null;
  chain?: readonly string[];
  effort: EffortLevel;
  /** Preferred account/provider for this activity, when the CLI has more than one. */
  account?: string | null;
};

export type RecommendResult = {
  harness: Harness;
  model_tier: ModelTier;
  /**
   * `true` when the declared chain answered on its own; `false` when nothing
   * runs at all; `"fallback"` when no link in the chain is enabled but the
   * board found another executor to stand in. A fallback is a real, runnable
   * harness — never collapse it into `true`, or an orchestrator cannot tell a
   * board running its own policy from one running on borrowed executors.
   */
  available: boolean | "fallback";
  source: "cardapio" | "explicit";
  matched_executor: MatchedExecutor | null;
  /** The declared line of succession, best first, whether or not it was needed. */
  chain?: readonly string[];
  /** 0 when the first choice was free, 1 when the second answered, and so on. */
  chain_position?: number;
  divergence?: string;
};

/** One row of the shipped routing table: what the activity is, and who runs it. */
export type ActivityHarness = {
  /** One line, in the words someone would use to recognise their own request. */
  hint: string;
  /** Line of succession, best first. Three deep: first choice, escalation, floor. */
  chain: readonly [string, string, string];
  effort: EffortLevel;
  model_tier: ModelTier;
};

/**
 * The shipped routing table, one row per activity.
 *
 * Every chain reads the same way: the first model is the one that should answer,
 * the second is where the work goes when the first is off or out of its depth,
 * and the third is the floor that keeps the lane moving. A workspace that has
 * only some of these configured still routes, because the board claims the
 * first link it can actually run.
 *
 * The order is not a preference. It is what the public head-to-head boards say
 * about each shape of work: fable-5 leads text and instruction following, opus-5
 * leads agentic tool use and front-end, gpt-5.6-sol is the strongest non-Anthropic
 * second opinion, sonnet-5 is the mid-price lane and haiku-4-5 is the floor for
 * work with a checkable ground truth. Re-derive it when the boards move.
 */
export const ACTIVITY_HARNESS: Readonly<Record<CardapioTaskType, ActivityHarness>> = {
  feature: {
    hint: "build a new capability from a written contract",
    chain: ["opus-5", "fable-5", "gpt-5.6-sol"],
    effort: "high",
    model_tier: "top",
  },
  tweak: {
    hint: "one dictated change to the app already in front of you",
    chain: ["fable-5", "opus-5", "gpt-5.6-sol"],
    effort: "low",
    model_tier: "top",
  },
  contract: {
    hint: "spec, schema, migration and public surface moved together",
    chain: ["fable-5", "opus-5", "gpt-5.6-sol"],
    effort: "high",
    model_tier: "top",
  },
  refactor: {
    hint: "repo-wide rename, sweep or dead-code removal",
    chain: ["opus-5", "fable-5", "gpt-5.6-sol"],
    effort: "medium",
    model_tier: "top",
  },
  bug: {
    hint: "a symptom on a running app, usually with a screenshot",
    chain: ["fable-5", "opus-5", "gpt-5.6-sol"],
    effort: "medium",
    model_tier: "top",
  },
  deep_bug: {
    hint: "no reproduction, and the earlier fixes did not hold",
    chain: ["opus-5", "gpt-5.6-sol", "fable-5"],
    effort: "high",
    model_tier: "top",
  },
  fleet_triage: {
    hint: "a worker stalled, died, or reported work it did not do",
    chain: ["opus-5", "fable-5", "haiku-4-5"],
    effort: "medium",
    model_tier: "top",
  },
  showpiece: {
    hint: "a surface built from nothing where the taste is the deliverable",
    chain: ["opus-5", "fable-5", "gpt-5.6-sol"],
    effort: "high",
    model_tier: "top",
  },
  visual_fix: {
    hint: "surgical visual correction against a screenshot or a reference",
    chain: ["opus-5", "fable-5", "gpt-5.6-sol"],
    effort: "medium",
    model_tier: "top",
  },
  publish: {
    hint: "the public feed: posts, titles, thumbnails, scene prompts, cuts",
    chain: ["fable-5", "opus-5", "gpt-5.6-sol"],
    effort: "medium",
    model_tier: "top",
  },
  page_copy: {
    hint: "offer, landing copy and naming, shipped inside the markup",
    chain: ["opus-5", "fable-5", "gpt-5.6-sol"],
    effort: "high",
    model_tier: "top",
  },
  docs: {
    hint: "repo-grounded documentation and long form",
    chain: ["opus-5", "fable-5", "gpt-5.6-sol"],
    effort: "high",
    model_tier: "top",
  },
  microcopy: {
    hint: "hard-constraint compression: UI strings, card titles, exact counts",
    chain: ["haiku-4-5", "sonnet-5", "gpt-5.6-sol"],
    effort: "low",
    model_tier: "cheap",
  },
  rfc: {
    hint: "options, trade-offs, and the interrogation before anything is built",
    chain: ["opus-5", "fable-5", "gpt-5.6-sol"],
    effort: "high",
    model_tier: "top",
  },
  fanout: {
    hint: "spawn, route and drive a fleet of workers",
    chain: ["opus-5", "fable-5", "gpt-5.6-sol"],
    effort: "medium",
    model_tier: "top",
  },
  doctrine: {
    hint: "write the instructions other agents have to obey",
    chain: ["fable-5", "opus-5", "sonnet-5"],
    effort: "high",
    model_tier: "top",
  },
  review: {
    hint: "adversarial review of a claimed delivery, on screen or in the diff",
    chain: ["opus-5", "fable-5", "gpt-5.6-sol"],
    effort: "high",
    model_tier: "top",
  },
  drone: {
    hint: "identical slices and checkable probes, fanned out cheap",
    chain: ["haiku-4-5", "gpt-5.6-sol", "sonnet-5"],
    effort: "low",
    model_tier: "cheap",
  },
  ship: {
    hint: "the irreversible ones: release, merge, git surgery, production data",
    chain: ["opus-5", "gpt-5.6-sol", "fable-5"],
    effort: "medium",
    model_tier: "top",
  },
  research: {
    hint: "read the whole pile, or explain it back in plain language",
    chain: ["gpt-5.6-sol", "fable-5", "haiku-4-5"],
    effort: "medium",
    model_tier: "mid",
  },
};

/** Tier and effort per activity, projected out of the routing table. */
export const DEFAULT_CARDAPIO: Cardapio = Object.fromEntries(
  CARDAPIO_TASK_TYPES.map((type) => [
    type,
    { model_tier: ACTIVITY_HARNESS[type].model_tier, effort: ACTIVITY_HARNESS[type].effort },
  ]),
) as Cardapio;

/**
 * Every model the shipped routing table can name, plus the common neighbours.
 * Order matters: findByTier walks it, so the first entry of a tier is the one a
 * tier-only policy lands on.
 */
export const DEFAULT_MODEL_CATALOG: readonly ModelInfo[] = [
  {
    id: "fable-5",
    tier: "top",
    aliases: ["fable", "claude-fable", "claude-fable-5"],
  },
  {
    id: "opus-5",
    tier: "top",
    aliases: ["opus", "claude-opus", "claude-opus-5"],
  },
  {
    id: "opus-4-8",
    tier: "top",
    aliases: ["claude-opus-4-8", "claude-opus-4"],
  },
  {
    id: "sonnet-5",
    tier: "mid",
    aliases: ["sonnet", "claude-sonnet", "claude-sonnet-5"],
  },
  {
    id: "haiku-4-5",
    tier: "cheap",
    aliases: ["haiku", "claude-haiku", "claude-haiku-4-5", "haiku-4"],
  },
  {
    id: "gpt-5.6-sol",
    tier: "mid",
    aliases: ["sol", "gpt-5-6-sol"],
  },
  {
    id: "gpt-reserve",
    tier: "mid",
    aliases: [],
  },
  { id: "gpt-5.6-terra", tier: "mid", aliases: ["terra", "gpt-5-6-terra"] },
  { id: "gpt-5.6-luna", tier: "cheap", aliases: ["luna", "gpt-5-6-luna"] },
  { id: "gpt-5.5", tier: "mid", aliases: ["gpt-5-5"] },
  { id: "gpt-5", tier: "top", aliases: ["gpt5"] },
  { id: "kimi-k3", tier: "top", aliases: ["k3", "kimi-k3-max"] },
  { id: "grok-4.6", tier: "mid", aliases: ["grok-4-6"] },
  { id: "gemini-3.7-flash", tier: "mid", aliases: ["3-7-flash"] },
  { id: "gemini-3-flash", tier: "cheap", aliases: ["3-flash"] },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function sameEffort(left: string, right: string): boolean {
  return normalize(left) === normalize(right);
}

/**
 * An executor with no tracked accounts is always viable — the board is not
 * the source of truth for that CLI's accounts. One with a tracked list needs
 * at least one enabled entry, or every model behind it is effectively off,
 * the same way a switched-off CLI is.
 */
function hasEnabledAccount(executor: ConfiguredExecutor): boolean {
  if (!executor.accounts || executor.accounts.length === 0) return true;
  return executor.accounts.some((account) => account.enabled);
}

type AccountResolution = {
  account: string | null;
  /** True when the answer differs from what was asked for (or the default). */
  adjusted: boolean;
  /** The account id that was actually requested, named or by default. */
  requested: string | null;
};

/**
 * Resolves which account a matched executor should run under. `preferred` is
 * the card's or policy's declared account; with none given, the executor's
 * first account stands in for "no preference", same as `chain[0]`. Untracked
 * accounts (the common case today) pass the request through unchanged: the
 * board has no list to validate against.
 */
function resolveAccount(
  executor: ConfiguredExecutor | undefined,
  preferred: string | null | undefined,
): AccountResolution {
  const accounts = executor?.accounts;
  if (!accounts || accounts.length === 0) {
    return { account: preferred ?? null, adjusted: false, requested: preferred ?? null };
  }
  if (preferred) {
    const match = accounts.find((account) => normalize(account.id) === normalize(preferred));
    if (!match) {
      return { account: preferred, adjusted: false, requested: preferred };
    }
    if (match.enabled) {
      return { account: match.id, adjusted: false, requested: preferred };
    }
    const alternative = accounts.find((account) => account.enabled);
    return { account: alternative?.id ?? null, adjusted: true, requested: preferred };
  }
  const primary = accounts[0];
  const requested = primary?.id ?? null;
  if (primary?.enabled) {
    return { account: primary.id, adjusted: false, requested };
  }
  const alternative = accounts.find((account) => account.enabled);
  return { account: alternative?.id ?? null, adjusted: true, requested };
}

function accountDivergenceNote(resolution: AccountResolution): string | undefined {
  if (!resolution.adjusted) return undefined;
  return resolution.account
    ? `Account '${resolution.requested}' is disabled; using '${resolution.account}'.`
    : `Account '${resolution.requested}' is disabled and no other account is enabled for this executor.`;
}

export function effortOptionsForExecutor(
  executor: Pick<ConfiguredExecutor, "cli" | "models" | "efforts">,
  model: string,
): readonly string[] | undefined {
  return effortOptionsForModel({
    cli: executor.cli,
    model,
    efforts: executor.efforts,
  });
}

function resolveRecommendedEffort(
  executor: MatchedExecutor,
  requested: EffortLevel,
  source: ConfiguredExecutor,
): { effort: EffortLevel; adjusted: boolean } {
  const options = effortOptionsForExecutor(source, executor.model);
  // An unknown/legacy model has no verified list. Keep its historical value so
  // reading an old card remains non-breaking; known lists are strict.
  if (!options || options.length === 0) {
    return { effort: requested, adjusted: false };
  }
  if (options.some((value) => sameEffort(value, requested))) {
    return { effort: requested, adjusted: false };
  }
  return { effort: options[0] ?? requested, adjusted: true };
}

function effortValidationError(
  model: string,
  effort: EffortLevel,
  options: readonly string[],
): ReturnType<typeof err> {
  const valid = options.length > 0 ? options.join(", ") : "none";
  return err(
    "INVALID_ARGUMENT",
    `Effort '${effort}' is not supported by model '${model}'. Valid efforts: ${valid}.`,
  );
}

export function resolveModelTier(
  modelName: string,
  catalog: readonly ModelInfo[] = DEFAULT_MODEL_CATALOG,
): ModelTier | null {
  const needle = normalize(modelName);
  for (const model of catalog) {
    if (normalize(model.id) === needle) {
      return model.tier;
    }
    if (model.aliases?.some((alias) => normalize(alias) === needle)) {
      return model.tier;
    }
  }
  return null;
}

function findByTier(
  executors: readonly ConfiguredExecutor[],
  tier: ModelTier,
  catalog: readonly ModelInfo[],
): MatchedExecutor | null {
  for (const executor of executors) {
    if (!hasEnabledAccount(executor)) continue;
    for (const model of executor.models) {
      if (resolveModelTier(model, catalog) === tier) {
        return { id: executor.id, cli: executor.cli, model };
      }
    }
  }
  return null;
}

function findByModelName(
  executors: readonly ConfiguredExecutor[],
  modelName: string,
): MatchedExecutor | null {
  const needle = normalize(modelName);
  for (const executor of executors) {
    if (!hasEnabledAccount(executor)) continue;
    for (const model of executor.models) {
      if (normalize(model) === needle) {
        return { id: executor.id, cli: executor.cli, model };
      }
    }
  }
  return null;
}

function catalogModelForTier(
  tier: ModelTier,
  catalog: readonly ModelInfo[] = DEFAULT_MODEL_CATALOG,
): string | null {
  return catalog.find((model) => model.tier === tier)?.id ?? null;
}

/**
 * Factory seed of the explicit policy table, one row per activity, each born
 * with its whole line of succession. CLI stays null until the user picks an
 * executor: the chain names models, and any enabled CLI that offers one counts.
 */
export const FACTORY_CARDAPIO_POLICY: readonly CardapioPolicyEntry[] =
  CARDAPIO_TASK_TYPES.map((type) => {
    const entry = ACTIVITY_HARNESS[type];
    return {
      type,
      cli: null,
      model: entry.chain[0],
      chain: entry.chain,
      effort: entry.effort,
    };
  });

export function lookupCardapioPolicy(
  policy: readonly CardapioPolicyEntry[] | null | undefined,
  type: string,
): CardapioPolicyEntry {
  const stored = policy?.find((row) => row.type === type);
  if (stored) {
    return { ...stored };
  }
  const factory = FACTORY_CARDAPIO_POLICY.find((row) => row.type === type);
  if (factory) {
    return { ...factory };
  }
  const fallback = DEFAULT_CARDAPIO[type as CardapioTaskType] ?? DEFAULT_CARDAPIO.feature;
  return {
    type,
    cli: null,
    model: catalogModelForTier(fallback.model_tier),
    effort: fallback.effort,
  };
}

/**
 * The row's line of succession, best first and without repeats. A row that only
 * ever declared one model still reads as a chain of one, so every caller can
 * walk the same shape.
 */
export function policyChain(entry: CardapioPolicyEntry): readonly string[] {
  const out: string[] = [];
  for (const model of [entry.model, ...(entry.chain ?? [])]) {
    if (!model) continue;
    if (out.some((name) => normalize(name) === normalize(model))) continue;
    out.push(model);
  }
  return out;
}

function matchOneModel(
  executors: readonly ConfiguredExecutor[],
  cli: string | null,
  modelName: string,
): MatchedExecutor | null {
  if (cli) {
    const needleCli = normalize(cli);
    for (const executor of executors) {
      if (normalize(executor.cli) !== needleCli && normalize(executor.id) !== needleCli) {
        continue;
      }
      if (!hasEnabledAccount(executor)) continue;
      const model = executor.models.find((name) => normalize(name) === normalize(modelName));
      if (model) {
        return { id: executor.id, cli: executor.cli, model };
      }
    }
  }
  return findByModelName(executors, modelName);
}

/**
 * Walks the chain and stops at the first model the workspace can actually run.
 * The CLI pin only applies to the head: once the first choice is unavailable the
 * point of the fallback is to leave that CLI behind.
 *
 * `from` is where the walk starts. A card on its second try starts at 1, so a
 * rejected delivery does not go back to the model that just produced it. It is
 * clamped to the last link: the line runs out, it does not wrap.
 */
function matchPolicyExecutor(
  executors: readonly ConfiguredExecutor[],
  entry: CardapioPolicyEntry,
  from = 0,
): { matched: MatchedExecutor; position: number } | null {
  const chain = policyChain(entry);
  if (chain.length === 0) return null;
  const start = Math.min(Math.max(from, 0), chain.length - 1);
  for (let position = start; position < chain.length; position += 1) {
    const modelName = chain[position];
    if (!modelName) continue;
    const matched = matchOneModel(executors, position === 0 ? entry.cli : null, modelName);
    if (matched) {
      return { matched, position };
    }
  }
  return null;
}

export function recommendHarness(
  input: RecommendInput,
): Result<RecommendResult> {
  const catalog = input.catalog ?? DEFAULT_MODEL_CATALOG;

  if (input.explicit) {
    const explicit = input.explicit;
    const matched = findByModelName(input.executors, input.explicit.model);
    const available = matched !== null;
    const matchedSource = matched
      ? input.executors.find((executor) => executor.id === matched.id)
      : undefined;
    if (matched) {
      const options = matchedSource
        ? effortOptionsForExecutor(matchedSource, matched.model)
        : undefined;
      if (
        options &&
        !options.some((value) => sameEffort(value, explicit.effort))
      ) {
        return effortValidationError(explicit.model, explicit.effort, options);
      }
    }
    const tier =
      resolveModelTier(explicit.model, catalog) ??
      DEFAULT_CARDAPIO[input.type]?.model_tier ??
      "mid";
    const accountResolution = resolveAccount(matchedSource, explicit.account ?? null);
    const unavailableNote = available
      ? undefined
      : `Explicit model '${input.explicit.model}' is not among the configured executors.`;
    const divergence =
      [unavailableNote, accountDivergenceNote(accountResolution)].filter(Boolean).join(" ") ||
      undefined;
    return ok({
      harness: {
        cli: explicit.cli ?? matched?.cli ?? null,
        model: explicit.model,
        effort: explicit.effort,
        ...(accountResolution.account ? { account: accountResolution.account } : {}),
      },
      model_tier: tier,
      available,
      source: "explicit",
      matched_executor: matched,
      ...(divergence ? { divergence } : {}),
    });
  }

  if (input.policy) {
    const entry = lookupCardapioPolicy(input.policy, input.type);
    const chain = policyChain(entry);
    const retry = Math.min(Math.max(input.attempt ?? 0, 0), Math.max(chain.length - 1, 0));
    const hit = matchPolicyExecutor(input.executors, entry, retry);

    // A retry that walked off the end of the chain is not the same as the
    // chain being unavailable: fable-5 → opus-5 both ran and were rejected,
    // gpt-5.6-sol simply is not configured, and the card should hold at its
    // last position (escalatedHarnessForRetry's job), not cross to another
    // CLI as if nothing had ever worked. Fallback is for when the chain fails
    // from its very first link, retry or not.
    const chainRunsAtAll =
      retry > 0 && matchPolicyExecutor(input.executors, entry, 0) !== null;

    // Nothing in the declared chain runs, from the head down. Rather than
    // stall on a technically honest available:false, look for the best
    // executor the workspace still has switched on: same tier as the chain
    // first, since that is the closest stand-in, then progressively better
    // tiers. Never a tier below the chain's own: a silent downgrade would be
    // worse than admitting nothing ran.
    let fallback: MatchedExecutor | null = null;
    if (!hit && entry.model && !chainRunsAtAll) {
      const chainTier =
        resolveModelTier(chain[0] ?? entry.model, catalog) ??
        DEFAULT_CARDAPIO[input.type]?.model_tier ??
        "mid";
      const startIndex = MODEL_TIERS.indexOf(chainTier);
      for (let index = startIndex; index >= 0; index -= 1) {
        fallback = findByTier(input.executors, MODEL_TIERS[index] as ModelTier, catalog);
        if (fallback) break;
      }
    }

    // The harness prints the model that will actually run. When the first
    // choice is off, that is the one the chain reached (or the fallback), not
    // the one declared.
    const running = hit?.matched.model ?? fallback?.model ?? entry.model;
    const tier =
      (running ? resolveModelTier(running, catalog) : null) ??
      DEFAULT_CARDAPIO[input.type]?.model_tier ??
      "mid";
    // Two different reasons to be past the head, and a reader has to be able to
    // tell them apart: the retry moved on purpose, the fall-through had to.
    const matchedSource = hit
      ? input.executors.find((executor) => executor.id === hit.matched.id)
      : fallback
        ? input.executors.find((executor) => executor.id === fallback?.id)
        : undefined;
    const effort = (hit || fallback) && matchedSource
      ? resolveRecommendedEffort(hit?.matched ?? fallback!, entry.effort, matchedSource)
      : { effort: entry.effort, adjusted: false };
    const effortNote = effort.adjusted
      ? `Policy effort '${entry.effort}' is not supported by '${running}'; using '${effort.effort}'.`
      : undefined;
    const unavailableNote = !hit
      ? entry.model
        ? chain.length > 1
          ? `No model in the chain (${chain.join(" → ")}) is among the configured executors.`
          : `Policy model '${entry.model}' is not among the configured executors.`
        : undefined
      : hit.position > retry
        ? `'${chain[retry]}' is not among the configured executors; the chain fell through to '${hit.matched.model}'.`
        : hit.position > 0
          ? `Try ${retry + 1} for this card, so the chain starts at '${hit.matched.model}' instead of '${chain[0]}'.`
          : undefined;
    const fallbackNote = fallback
      ? `Recommending '${fallback.model}' (${fallback.cli}) as a cross-CLI fallback.`
      : undefined;
    // Account resolution runs after the model/CLI walk: hasEnabledAccount
    // already dropped an executor with every account disabled from `hit` and
    // `fallback`, so what is left here is picking among the ones still on.
    const accountResolution = (hit || fallback) && matchedSource
      ? resolveAccount(matchedSource, entry.account ?? null)
      : { account: entry.account ?? null, adjusted: false, requested: entry.account ?? null };
    const accountNote = accountDivergenceNote(accountResolution);
    const divergence =
      [unavailableNote, fallbackNote, effortNote, accountNote].filter(Boolean).join(" ") ||
      undefined;
    return ok({
      harness: {
        // A null cli is "no preference", and staying on the first choice does
        // not overrule it. Falling through, or crossing to a fallback, does:
        // the declared CLI is the one that just failed, so the harness names
        // the one actually answering.
        cli: hit && hit.position > 0 ? hit.matched.cli : fallback ? fallback.cli : entry.cli,
        model: running,
        effort: effort.effort,
        ...(accountResolution.account ? { account: accountResolution.account } : {}),
      },
      model_tier: tier,
      available: hit !== null ? Boolean(entry.model) : fallback ? "fallback" : false,
      source: "cardapio",
      matched_executor: hit?.matched ?? fallback ?? null,
      ...(chain.length > 0 ? { chain } : {}),
      ...(hit ? { chain_position: hit.position } : {}),
      ...(divergence ? { divergence } : {}),
    });
  }

  const cardapio = input.cardapio ?? DEFAULT_CARDAPIO;
  const entry = cardapio[input.type];
  if (!entry) {
    return err(
      "INVALID_ARGUMENT",
      `Unknown task type for the harness policy: ${String(input.type)}`,
    );
  }

  const matched = findByTier(input.executors, entry.model_tier, catalog);
  const matchedSource = matched
    ? input.executors.find((executor) => executor.id === matched.id)
    : undefined;
  const effort = matched && matchedSource
    ? resolveRecommendedEffort(matched, entry.effort, matchedSource).effort
    : entry.effort;
  return ok({
    harness: {
      cli: matched?.cli ?? null,
      model: matched?.model ?? null,
      effort,
    },
    model_tier: entry.model_tier,
    available: matched !== null,
    source: "cardapio",
    matched_executor: matched,
  });
}
