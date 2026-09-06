/**
 * Model-specific effort support shipped with the board.
 *
 * The board keeps effort as a string because the providers do not share one
 * enum. These are the values verified for the models the built-in catalog
 * names; an executor may override them through its workspace JSONB config.
 */
export type EffortCatalogSpec = {
  readonly efforts: readonly string[];
  readonly source: string;
};

const CODEX_56: EffortCatalogSpec = {
  efforts: ["minimal", "low", "medium", "high", "xhigh", "max"],
  source: "https://developers.openai.com/api/docs/models",
};

const CODEX_OLDER: EffortCatalogSpec = {
  efforts: ["minimal", "low", "medium", "high", "xhigh"],
  source: "https://developers.openai.com/api/docs/guides/latest-model",
};

const CLAUDE_FRONTIER: EffortCatalogSpec = {
  efforts: ["low", "medium", "high", "xhigh", "max"],
  source: "https://platform.claude.com/docs/en/build-with-claude/effort",
};

const CLAUDE_LEGACY: EffortCatalogSpec = {
  efforts: ["low", "medium", "high"],
  source: "https://platform.claude.com/docs/en/build-with-claude/effort",
};

const GEMINI_LEVELS: EffortCatalogSpec = {
  efforts: ["minimal", "low", "medium", "high"],
  source: "https://ai.google.dev/gemini-api/docs/thinking",
};

const GEMINI_LEVELS_WITHOUT_MINIMAL: EffortCatalogSpec = {
  efforts: ["low", "medium", "high"],
  source: "https://ai.google.dev/gemini-api/docs/thinking",
};

const KIMI_K3: EffortCatalogSpec = {
  efforts: ["max"],
  source: "https://moonshotai.github.io/kimi-code/en/configuration/config-files.html",
};

const KIMI_THINKING: EffortCatalogSpec = {
  efforts: ["off", "on"],
  source: "https://moonshotai.github.io/kimi-code/en/configuration/config-files.html",
};

const GROK_REASONING: EffortCatalogSpec = {
  efforts: ["low", "medium", "high"],
  source: "https://docs.x.ai/developers/model-capabilities/text/reasoning",
};

const MODEL_EFFORTS: Record<string, EffortCatalogSpec> = {
  // Codex's GPT-5.6 CLI family exposes the six levels below. The older
  // families stop at xhigh in the public model guidance.
  "gpt-5-6-sol": CODEX_56,
  "gpt-reserve": CODEX_56,
  "gpt-5-6-terra": CODEX_56,
  "gpt-5-6-luna": CODEX_56,
  "gpt-5-5": CODEX_OLDER,
  "gpt-5-4": CODEX_OLDER,
  "gpt-5-4-mini": CODEX_OLDER,
  "gpt-5-3-codex-spark": CODEX_OLDER,

  // Claude's current adaptive-effort models support all five named levels.
  "fable-5": CLAUDE_FRONTIER,
  "opus-5": CLAUDE_FRONTIER,
  "sonnet-5": CLAUDE_FRONTIER,
  "opus-4-8": CLAUDE_FRONTIER,
  "haiku-4-5": CLAUDE_LEGACY,

  // Gemini 3 models use thinking levels; the 2.5 models use a budget, with
  // these named levels being the board's portable mapping.
  "3-5-flash": GEMINI_LEVELS,
  "3-1-pro": GEMINI_LEVELS_WITHOUT_MINIMAL,
  "3-1-flash-lite": GEMINI_LEVELS,
  "3-pro": GEMINI_LEVELS,
  "3-flash": GEMINI_LEVELS,
  "2-5-pro": GEMINI_LEVELS_WITHOUT_MINIMAL,
  "2-5-flash": { ...GEMINI_LEVELS, efforts: ["none", ...GEMINI_LEVELS.efforts] },

  // K3 declares only max in Kimi Code's model registry. The other Kimi Code
  // entries expose thinking as a boolean, represented as the portable off/on
  // effort values rather than inventing numeric levels.
  "kimi-for-coding": KIMI_THINKING,
  "kimi-for-coding-highspeed": KIMI_THINKING,
  k3: KIMI_K3,
  "k3-256k": KIMI_K3,

  "grok-4-6": GROK_REASONING,
  "grok-4-5": GROK_REASONING,
};

const MODEL_ALIASES: Record<string, string> = {
  fable: "fable-5",
  opus: "opus-5",
  sonnet: "sonnet-5",
  haiku: "haiku-4-5",
  k3: "k3",
  "gpt-5-6": "gpt-5-6-sol",
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\./g, "-")
    .replace(/\s+/g, "-");
}

function modelKey(model: string): string {
  const leaf = normalize(model).split("/").at(-1) ?? "";
  return MODEL_ALIASES[leaf] ?? leaf;
}

function sameModel(left: string, right: string): boolean {
  return modelKey(left) === modelKey(right);
}

/** Returns the shipped effort spec, or undefined for an open/custom model. */
export function seededEffortSpec(
  cli: string | null | undefined,
  model: string,
): EffortCatalogSpec | undefined {
  const key = modelKey(model);
  const direct = MODEL_EFFORTS[key];
  if (direct) return direct;

  const executor = normalize(cli ?? "").split("/").at(-1) ?? "";
  if (executor === "codex" && key.startsWith("gpt-5-6-")) return CODEX_56;
  if (executor === "codex" && key.startsWith("gpt-5-")) return CODEX_OLDER;
  if (executor === "claude" || executor === "claude-code") {
    if (/^(fable|opus|sonnet)-5$/.test(key)) return CLAUDE_FRONTIER;
    if (key === "opus-4-8") return CLAUDE_FRONTIER;
    if (key === "haiku-4-5") return CLAUDE_LEGACY;
  }
  if (executor === "gemini" || executor === "gemini-cli") {
    if (/^3-/.test(key)) return GEMINI_LEVELS;
    if (/^2-5-/.test(key)) return GEMINI_LEVELS_WITHOUT_MINIMAL;
  }
  if (executor === "grok" && /^grok-4-/.test(key)) return GROK_REASONING;
  if (executor === "kimi" && (key === "k3" || key === "k3-256k")) return KIMI_K3;
  return undefined;
}

export function seededEffortsForModel(
  cli: string | null | undefined,
  model: string,
): readonly string[] | undefined {
  return seededEffortSpec(cli, model)?.efforts;
}

export function seededEffortSourceForModel(
  cli: string | null | undefined,
  model: string,
): string | undefined {
  return seededEffortSpec(cli, model)?.source;
}

function configuredValue<T>(
  values: Readonly<Record<string, T>> | undefined,
  model: string,
): T | undefined {
  if (!values) return undefined;
  const key = Object.keys(values).find((candidate) => sameModel(candidate, model));
  return key === undefined ? undefined : values[key];
}

/**
 * Resolves an explicit workspace override before falling back to the shipped
 * model catalog. An empty array remains explicit: it means the model has no
 * named effort values, while undefined means the model is unknown/legacy.
 */
export function effortOptionsForModel(input: {
  cli?: string | null;
  model: string;
  efforts?: Readonly<Record<string, readonly string[]>>;
}): readonly string[] | undefined {
  const configured = configuredValue(input.efforts, input.model);
  if (configured !== undefined) return configured;
  return seededEffortsForModel(input.cli, input.model);
}

export function effortSourceForModel(input: {
  cli?: string | null;
  model: string;
  efforts?: Readonly<Record<string, readonly string[]>>;
  effortSources?: Readonly<Record<string, string>>;
}): string | undefined {
  const configured = configuredValue(input.effortSources, input.model);
  if (configured !== undefined) return configured;
  if (configuredValue(input.efforts, input.model) !== undefined) return "custom";
  return seededEffortSourceForModel(input.cli, input.model);
}

/**
 * Builds the public per-model catalog while preserving explicit workspace
 * overrides and filling known legacy rows from the shipped seed.
 */
export function mergeExecutorEffortCatalog(input: {
  cli?: string | null;
  models: readonly string[];
  catalog?: readonly string[];
  efforts?: Readonly<Record<string, readonly string[]>>;
  effortSources?: Readonly<Record<string, string>>;
}): { efforts: Record<string, string[]>; effort_sources: Record<string, string> } {
  const efforts: Record<string, string[]> = {};
  const effort_sources: Record<string, string> = {};
  const models = [...new Set([...(input.catalog ?? []), ...input.models])];
  for (const model of models) {
    const options = effortOptionsForModel({
      cli: input.cli,
      model,
      efforts: input.efforts,
    });
    if (options !== undefined) efforts[model] = [...options];
    const source = effortSourceForModel({
      cli: input.cli,
      model,
      efforts: input.efforts,
      effortSources: input.effortSources,
    });
    if (source) effort_sources[model] = source;
  }
  return { efforts, effort_sources };
}
