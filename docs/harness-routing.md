# The routing table

Twenty activities, each with a line of succession three deep. This is the table the board
ships in `FACTORY_CARDAPIO_POLICY`, and the reasoning behind it.

## Why twenty and not five

The old table had five rows: `bug`, `feature`, `rfc`, `architecture`, `mechanical`. It
routed by topic. A dictated one-line tweak and a repo-wide schema migration both landed on
`feature`, and nothing about those two requests is alike: one needs a model that decodes a
half-typed sentence over a screenshot, the other needs one that holds ten files coherent at
once. Routing by topic sends both to the same model and one of them is always wrong.

These twenty route by **shape of work**: what actually decides whether a model succeeds.
Two requests share a type when they fail for the same reason.

## Why a chain and not a model

A single name is a policy that breaks the moment you turn an executor off. A chain
degrades instead: the board claims the first link the workspace can still run, and says
which one answered (`chain_position`) and what it skipped (`divergence`).

The three positions mean the same thing on every row:

1. **First choice.** What should answer.
2. **Escalation.** Where the work goes when the first is unavailable or out of its depth.
   Where it helps, this is a different vendor on purpose: a second opinion from the same
   family tends to repeat the first one's blind spot.
3. **Floor.** What keeps the lane moving rather than stalling it.

## The table

| Activity | Line of succession | Effort | What decides the winner |
|---|---|---|---|
| `feature` | opus-5 › fable-5 › gpt-5.6-sol | high | holding a multi-file contract coherent; tool use that does not hallucinate |
| `tweak` | fable-5 › opus-5 › gpt-5.6-sol | low | decoding a terse dictated ask over a screenshot; instruction following |
| `contract` | fable-5 › opus-5 › gpt-5.6-sol | high | precision and naming taste on an artifact that is expensive to reverse |
| `refactor` | opus-5 › fable-5 › gpt-5.6-sol | medium | repo-wide consistency; noticing that a rename is really an API change |
| `bug` | fable-5 › opus-5 › gpt-5.6-sol | medium | inferring intent from a one-line complaint plus an image |
| `deep_bug` | opus-5 › gpt-5.6-sol › fable-5 | high | log stamina, bash recovery, and a second vendor that fails differently |
| `fleet_triage` | opus-5 › fable-5 › haiku-4-5 | medium | reading tool output honestly; a fabricated status loses a whole lane |
| `showpiece` | opus-5 › fable-5 › gpt-5.6-sol | high | front-end judgment, where the deliverable is the taste |
| `visual_fix` | opus-5 › fable-5 › gpt-5.6-sol | medium | localizing from a screenshot and stopping there |
| `publish` | fable-5 › opus-5 › gpt-5.6-sol | medium | voice, and hard style constraints held under pressure |
| `page_copy` | opus-5 › fable-5 › gpt-5.6-sol | high | copy that has to ship inside markup, so both boards matter |
| `docs` | opus-5 › fable-5 › gpt-5.6-sol | high | staying grounded in the repo instead of inventing |
| `microcopy` | haiku-4-5 › sonnet-5 › gpt-5.6-sol | low | volume; the constraint is checkable, so buy the cheapest that holds it |
| `rfc` | opus-5 › fable-5 › gpt-5.6-sol | high | reasoning depth, and the willingness to disagree with you |
| `fanout` | opus-5 › fable-5 › gpt-5.6-sol | medium | tool-call reliability across many concurrent workers |
| `doctrine` | fable-5 › opus-5 › sonnet-5 | high | writing instructions another model must obey, exactly |
| `review` | opus-5 › fable-5 › gpt-5.6-sol | high | adversarial rigor; a review that rubber-stamps is worse than none |
| `drone` | haiku-4-5 › gpt-5.6-sol › sonnet-5 | low | price, because it multiplies by N and the answer is checkable |
| `ship` | opus-5 › gpt-5.6-sol › fable-5 | medium | judgment about irreversible commands, not raw capability |
| `research` | gpt-5.6-sol › fable-5 › haiku-4-5 | medium | reading stamina against cost, and refusing to force a match |

## Through an orchestrator

An orchestrator is not above the table, it is a row in it. A pane dispatching work runs on
`fanout`, and every worker it spawns resolves its own activity independently. The dispatcher's
model does not propagate: a `fanout` that fell through to its own second link must not drag
the whole fleet down with it.

So a run is a matrix, not a chain:

```
orchestrator  → fanout    → opus-5 › fable-5 › gpt-5.6-sol
   ├── worker → showpiece → opus-5 › fable-5 › gpt-5.6-sol
   ├── worker → microcopy → haiku-4-5 › sonnet-5 › gpt-5.6-sol
   └── review → review    → opus-5 › fable-5 › gpt-5.6-sol
```

The orchestrator calls `harness_recommend { type }` per lane and reads two fields back:
`harness.model` to spawn with, and `chain_position` to know what it is really getting.
Position `0` is the plan; anything higher means that lane started degraded, and `divergence`
says why.

**A rejected delivery does not go back to the model that produced it.** The chain walks on
two triggers, not one:

| Trigger | What moves | Message |
|---|---|---|
| The model is not on a configured executor | the walk skips it | "'X' is not among the configured executors" |
| A delivery was reviewed and reopened | the walk starts one link lower | "Try 2 for this card, so the chain starts at 'Y'" |

Only deliveries count. An attempt ended with `force` was a pane somebody killed, and paying
more for a restart would be a tax on restarting. A harness pinned by hand off the chain is
never escalated: that was a decision, and the board does not overrule it. When the line runs
out, the card holds at its last runnable link rather than wrapping back to the top.

The worker sees all of it. The claim briefing carries the whole line and which try this is,
so a model that stalls knows what it would escalate to without asking the board again.

## Where the order comes from

Public head-to-head boards, read per activity rather than as one ranking. The boards that
matter are not the same for every row: an agentic board with a tool-hallucination signal
decides `fanout`, a text board with an instruction-following category decides `doctrine`,
and a front-end board decides `showpiece`. A single "best model" number decides nothing.

The shape that fell out:

- **fable-5** leads text and instruction following. It wins the rows where the deliverable
  is words, or where a half-specified ask has to be read correctly the first time.
- **opus-5** leads agentic tool use and front-end. It wins the long multi-tool rows and
  anything where the deliverable is a working surface.
- **gpt-5.6-sol** is the strongest non-Anthropic option and earns the escalation slot
  wherever a genuinely independent second opinion is worth more than a stronger one.
- **sonnet-5** is the mid-price lane for work that fans out but still needs judgment.
- **haiku-4-5** is the floor, and only for work with a ground truth someone can check.

Two caveats worth keeping in view. Models outside this list currently score above parts of
it on the front-end and agentic boards, so a workspace with those executors enabled should
say so in its own policy rather than inherit this one. And every number behind this table
has a date on it: re-derive the order when the boards move, do not treat it as settled.

## Changing it

The shipped table is a default, not a verdict. Edit `ACTIVITY_HARNESS` in
`packages/mcp-core/src/harness/recommend.ts` to change what every new workspace gets, or
override one line for your own workspace in Settings › Harness policy, or over MCP:

```
harness_set { type: "review", chain: ["fable-5", "opus-5", "gpt-5.6-sol"], effort: "high" }
```
