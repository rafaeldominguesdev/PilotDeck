ALTER TABLE "execution_attempt" ADD COLUMN "reported_cost_usd" numeric(12, 6);--> statement-breakpoint
ALTER TABLE "execution_attempt" ADD COLUMN "cost_source" text;--> statement-breakpoint
ALTER TABLE "execution_attempt" ADD COLUMN "cost_status" text;--> statement-breakpoint
ALTER TABLE "execution_attempt" ADD COLUMN "cost_unpriced_models" jsonb;--> statement-breakpoint
ALTER TABLE "execution_attempt" ADD COLUMN "cost_breakdown" jsonb;--> statement-breakpoint

-- Freeze the cost that Insights used to recalculate on every read. This is
-- deliberately rerunnable: reported_cost_usd preserves the executor's input,
-- while cost_usd is always replaced by the same price snapshot below.
WITH seed_price(model, input_rate, output_rate, cache_rate) AS (
  VALUES
    ('fable-5', 10::numeric, 50::numeric, 1::numeric),
    ('opus-5', 5, 25, 0.5),
    ('opus-4-8', 5, 25, 0.5),
    ('sonnet-5', 3, 15, 0.3),
    ('haiku-4-5', 1, 5, 0.1),
    ('gpt-5-6-sol', 1.75, 14, 0.175),
    ('gpt-5-6-terra', 1.25, 10, 0.125),
    ('gpt-5-6-luna', 0.5, 4, 0.05),
    ('gpt-5-5', 1.25, 10, 0.125),
    ('gpt-5-4', 2.5, 15, 0.25),
    ('gpt-5-4-mini', 0.25, 2, 0.025),
    ('gpt-5-3-codex-spark', 1.75, 14, 0.175),
    ('3-1-pro', 1.25, 10, 0.125),
    ('3-5-flash', 0.3, 2.5, 0.03),
    ('3-flash', 0.15, 0.6, 0.015),
    ('3-7-flash-high', 0.3, 2.5, 0.03),
    ('3-7-flash-medium', 0.3, 2.5, 0.03),
    ('3-7-flash-low', 0.3, 2.5, 0.03),
    ('k3', 0.6, 2.5, 0.06),
    ('k3-256k', 1.2, 5, 0.12),
    ('kimi-for-coding', 0.6, 2.5, 0.06),
    ('kimi-for-coding-highspeed', 1.2, 5, 0.12),
    ('grok-4-6', 3, 15, 0.75),
    ('grok-4-5', 3, 15, 0.75),
    ('grok-composer-2-5-fast', 1.5, 7.5, 0.375),
    ('deepseek-v4-flash-free', 0, 0, 0),
    ('mimo-v2-5-free', 0, 0, 0),
    ('hy3-free', 0, 0, 0),
    ('laguna-s-2-1-free', 0, 0, 0),
    ('nemotron-3-ultra-free', 0, 0, 0),
    ('nemotron-3-5-lightning-free', 0, 0, 0)
),
attempt_input AS (
  SELECT
    ea.id,
    p.workspace_id,
    ea.usage_estimated,
    ea.usage_suspect,
    CASE
      WHEN ea.cost_source IS NULL THEN ea.cost_usd
      ELSE ea.reported_cost_usd
    END AS agent_cost,
    CASE
      WHEN jsonb_array_length(COALESCE(ea.usage_segments, '[]'::jsonb)) > 0
        THEN ea.usage_segments
      WHEN ea.tokens_in IS NOT NULL OR ea.tokens_out IS NOT NULL OR ea.tokens_cache IS NOT NULL
        THEN jsonb_build_array(jsonb_build_object(
          'model', ea.model,
          'input', ea.tokens_in,
          'output', ea.tokens_out,
          'cache_read', ea.tokens_cache
        ))
      ELSE '[]'::jsonb
    END AS segments
  FROM execution_attempt ea
  JOIN task t ON t.id = ea.task_id
  JOIN project p ON p.id = t.project_id
  WHERE ea.finished_at IS NOT NULL
),
expanded AS (
  SELECT
    source.*,
    seg.value AS segment,
    COALESCE((seg.value->>'input')::numeric, 0) AS input_tokens,
    COALESCE((seg.value->>'output')::numeric, 0) AS output_tokens,
    COALESCE((seg.value->>'cache_read')::numeric, 0)
      + COALESCE((seg.value->>'cache_write')::numeric, 0) AS cache_tokens,
    regexp_replace(
      regexp_replace(
        replace(
          regexp_replace(lower(trim(COALESCE(seg.value->>'model', 'unknown'))), '^[a-z0-9_.-]+/', ''),
          '.', '-'
        ),
        '-[0-9]{8}$', ''
      ),
      '^claude-', ''
    ) AS canonical_model
  FROM attempt_input source
  LEFT JOIN LATERAL jsonb_array_elements(source.segments) seg(value) ON true
),
custom_price_candidate AS (
  SELECT
    workspace_id,
    regexp_replace(
      regexp_replace(
        replace(regexp_replace(lower(trim(model)), '^[a-z0-9_.-]+/', ''), '.', '-'),
        '-[0-9]{8}$', ''
      ),
      '^claude-', ''
    ) AS model,
    input_per_mtok::numeric AS input_rate,
    output_per_mtok::numeric AS output_rate,
    cache_per_mtok::numeric AS cache_rate,
    updated_at
  FROM model_price
),
custom_price AS (
  SELECT DISTINCT ON (workspace_id, model)
    workspace_id, model, input_rate, output_rate, cache_rate
  FROM custom_price_candidate
  ORDER BY workspace_id, model, updated_at DESC
),
priced AS (
  SELECT
    expanded.*,
    COALESCE(custom.input_rate, seed.input_rate) AS input_rate,
    COALESCE(custom.output_rate, seed.output_rate) AS output_rate,
    COALESCE(custom.cache_rate, seed.cache_rate) AS cache_rate
  FROM expanded
  LEFT JOIN custom_price custom
    ON custom.workspace_id = expanded.workspace_id
   AND custom.model = expanded.canonical_model
  LEFT JOIN seed_price seed
    ON seed.model = expanded.canonical_model
),
assessment AS (
  SELECT
    id,
    usage_estimated,
    usage_suspect,
    agent_cost,
    COUNT(segment) > 0 AS tokens_reported,
    COUNT(segment) FILTER (
      WHERE input_tokens + output_tokens + cache_tokens > 0
    ) AS spending_segments,
    COUNT(segment) FILTER (
      WHERE input_tokens + output_tokens + cache_tokens > 0
        AND input_rate IS NULL
    ) AS unpriced_segments,
    COALESCE(
      jsonb_agg(DISTINCT canonical_model) FILTER (
        WHERE input_tokens + output_tokens + cache_tokens > 0
          AND input_rate IS NULL
      ),
      '[]'::jsonb
    ) AS unpriced_models,
    COALESCE(
      jsonb_agg(jsonb_build_object(
        'model', canonical_model,
        'input', input_tokens,
        'output', output_tokens,
        'cache', cache_tokens,
        'cost_usd', CASE
          WHEN input_tokens + output_tokens + cache_tokens > 0 AND input_rate IS NOT NULL
            THEN round((
              input_tokens * input_rate
              + output_tokens * output_rate
              + cache_tokens * cache_rate
            ) / 1000000, 6)
          ELSE NULL
        END,
        'priced', input_tokens + output_tokens + cache_tokens > 0 AND input_rate IS NOT NULL
      )) FILTER (WHERE segment IS NOT NULL),
      '[]'::jsonb
    ) AS breakdown,
    round(SUM(CASE
      WHEN input_rate IS NOT NULL THEN (
        input_tokens * input_rate
        + output_tokens * output_rate
        + cache_tokens * cache_rate
      ) / 1000000
      ELSE 0
    END), 6) AS computed_cost
  FROM priced
  GROUP BY id, usage_estimated, usage_suspect, agent_cost
)
UPDATE execution_attempt ea
SET
  reported_cost_usd = assessment.agent_cost,
  cost_usd = CASE
    WHEN assessment.spending_segments > 0 AND assessment.unpriced_segments = 0
      THEN assessment.computed_cost
    ELSE assessment.agent_cost
  END,
  cost_source = CASE
    WHEN assessment.spending_segments > 0 AND assessment.unpriced_segments = 0
      THEN 'computed'
    WHEN assessment.agent_cost IS NOT NULL AND assessment.usage_estimated
      THEN 'estimated'
    WHEN assessment.agent_cost IS NOT NULL
      THEN 'reported'
    ELSE NULL
  END,
  cost_status = CASE
    WHEN assessment.usage_suspect THEN 'suspect'
    WHEN NOT assessment.tokens_reported THEN 'not_reported'
    WHEN assessment.spending_segments = 0 THEN 'zero_usage'
    WHEN assessment.unpriced_segments > 0 AND assessment.usage_estimated THEN 'estimated'
    WHEN assessment.unpriced_segments > 0 THEN 'unpriced'
    WHEN assessment.usage_estimated THEN 'estimated'
    ELSE 'computed'
  END,
  cost_unpriced_models = assessment.unpriced_models,
  cost_breakdown = assessment.breakdown
FROM assessment
WHERE ea.id = assessment.id;
