# OCL-103 — Claude Code's native marketplace: the ghost install, and how submission actually works

Status: level 1 fixed on this branch; level 2 is a prepared submission awaiting the
owner. Every claim below was produced hands-on; the command or file that produced it
is named inline.

## Level 1 — the ghost install

### What was believed

OCL-76 (2026-08-19) recorded that `claude plugin marketplace add rafaeldominguesdev/pilotdeck`
"aceita, marca enabledPlugins, mas NUNCA materializa o clone/cache", concluded that
Claude's `source: github` was broken, and built install.sh around a local directory
marketplace to route around it.

### That premise is wrong

On a clean profile (`CLAUDE_CONFIG_DIR` pointed at an empty directory), the github
path works end to end:

```
claude plugin marketplace add rafaeldominguesdev/pilotdeck
  → Cloning repository … Clone complete, validating marketplace…
  → ✔ Successfully added marketplace: pilotdeck
claude plugin install pilotdeck@pilotdeck
  → ✔ Successfully installed plugin: pilotdeck@pilotdeck (scope: user)
claude plugin details pilotdeck
  → Skills (6) board, card, claim, deliver, pilotdeck, release
  → Hooks (4) SessionStart, PostToolUse, Stop, PreToolUse
  → MCP servers (1) pilotdeck
```

The cache really is on disk at `plugins/cache/pilotdeck/pilotdeck/<version>` with
`PILOTDECK.md`, `skills/`, `commands/` and `hooks/` in it.

This was verified on **CLI 2.1.235 — the exact build in use when the ghost was
reported** (`~/.local/share/claude/versions/2.1.235`, installed 2026-08-18, still the
current binary when OCL-76 was filed at 2026-08-19 14:34 BRT) — and again on 2.1.237.
So there is no upstream bug to file and no issue to open: `source: github` was never
the problem.

### The real cause: manifest version drift

Claude resolves an installed plugin's version from `plugin.json`, **not** from the
marketplace entry, and keys the cache directory by that version. `claude plugin
validate` says so directly:

> `plugins[0].version`: Entry declares version "0.2.1" but
> `plugin/.claude-plugin/plugin.json` says "0.1.12". At install time, plugin.json wins
> (calculatePluginVersion precedence) — the entry version is silently ignored.

Commit `8b3ac70` (2026-08-19 14:29, ~5 minutes before the ghost was reported) bumped
the marketplace entry to 0.2.1 and left `plugin/.claude-plugin/plugin.json` at 0.1.12.
Every consequence follows from that:

1. The install resolves to **0.1.12**, not the 0.2.1 the entry advertises.
2. It lands in `cache/pilotdeck/pilotdeck/0.1.12` — the directory an earlier 0.1.12
   install already occupied. `claude plugin list` reports `Version: 0.1.12`, which is
   exactly OCL-76's "list mostra versão velha de cache anterior".
3. Worse, the version never changes, so the plugin can never update itself again.

Point 3 reproduced in isolation with a synthetic marketplace (entry 0.2.1 over a
`plugin.json` pinned at 0.1.12), publishing new content without touching the version:

```
claude plugin update reprox@reprox
  → ✔ reprox is already at the latest version (0.1.12).
cat …/cache/reprox/reprox/0.1.12/skills/demo/SKILL.md
  → OLD-V1          # the new content never arrived
```

That is the ghost: not an install that fetches nothing, but an install pinned to a
stale version that no later update can dislodge.

A second, unrelated artifact was found in `~/.claude/plugins/installed_plugins.json`:
`pilotdeck@pilotdeck` records `installPath` at
`~/.claude/plugins/cache/pilotdeck/pilotdeck/0.1.12`, and that directory does not
exist. It is a leftover from the 2026-08-19 debugging session, not the live state —
the profile this repository is worked from resolves a real, populated `installPath`.
Harmless, but it is another way "installed" can be reported over nothing.

### Where the fix landed

The version drift itself was corrected in parallel by two sibling cards that reached
`main` first, from the other end of the same problem:

- **OCL-105** (#24) found `.grok-plugin/marketplace.json` advertising the stale 0.2.1
  to the Grok catalog and bumped every plugin manifest, adding a guard in
  `scripts/test-plugin-package.sh` that pins them all to `package.json`'s version. That
  guard is stronger than the one drafted here — it anchors to the release version rather
  than to internal agreement — so this branch dropped its own and kept OCL-105's.
- **OCL-104** (#28) fixed the Codex path and added a `codex plugin list --json`
  materialization check to install.sh.

Same root cause, three cards, one fix. What this branch adds on top:

- **CI now runs `scripts/test-plugin-package.sh`.** It never did: the plugin package is
  not a pnpm workspace, so `pnpm test` never reached it and the suite only ever ran by
  hand. That is how the drift reached `main` in the first place — and why OCL-105's new
  guard would otherwise have sat there unexecuted.
- **The suite was red on `main`.** OCL-104's Codex materialization check has no
  counterpart in the test harness: `agent-stub` only ever answered
  `claude plugin list --json`, so Codex verification read empty output, install.sh
  exited 1, and the whole suite failed. The stub now answers per CLI, in each one's own
  shape — a flat array with `installPath` for Claude, `{installed: [...]}` with
  `source.path` for Codex.
- README documents the native two-command install with its verification step, since it
  is now the honest recommendation.
- `docs/design/plugin.md` and the install.sh comments no longer assert that
  `source: github` is broken. install.sh keeps its local directory marketplace, but for
  the reason that actually justifies it: it injects the user's instance URL and token
  into the package's `.mcp.json`, and only a private local copy can carry that.
- The Claude manifest and marketplace entry disclose the hooks and the network scope
  (see the self-review below). Grok, Codex and Kimi keep the descriptions their own
  cards chose; OCL-105 covers the same ground for the xAI review in `plugin/README.md`.

Verified on a clean profile: `Version: 0.2.1`, `installPath` exists, `PILOTDECK.md`
present, 6 skills / 4 hooks / 1 MCP server in the inventory.

## Level 2 — submitting to a public marketplace

### The card's plan does not exist

The card asks for a fork + PR to `anthropics/claude-plugins-official`. Two independent
sources say that cannot work.

The official documentation
([code.claude.com/docs/en/plugins](https://code.claude.com/docs/en/plugins)) is explicit:

> The official marketplace, `claude-plugins-official`, is curated separately. Anthropic
> decides which plugins to include at its discretion. **There is no application
> process, and the submission form does not add plugins to the official marketplace.**

And the repository auto-closes outside PRs. PR #5417 ("Add QECTOR QEC Toolkit"), closed
2026-08-18, got a bot reply:

> Thanks for your interest! This repo only accepts contributions from Anthropic team
> members. If you'd like to submit a plugin to the marketplace, please submit your
> plugin here.

Consistent with the PR history: every new-plugin PR that merged was authored by
`bryan-anthropic`; community "Add plugin" PRs are closed unmerged. Opening one would
be closed by a bot within a day.

### What does exist: `claude-plugins-community`

Third-party submissions land in `anthropics/claude-plugins-community` after review —
users add it with `/plugin marketplace add anthropics/claude-plugins-community` and
install from it as `@claude-community`. It currently carries 2281 plugins; `pilotdeck`
is not among them.

Submission is a form, not a PR:

- Console (individual authors): <https://platform.claude.com/plugins/submit>
- claude.ai (requires a Team/Enterprise org with directory-management access):
  <https://claude.ai/admin-settings/directory/submissions/plugins/new>

`clau.de/plugin-directory-submission` 302-redirects to the docs section above.

The catalog is a **read-only mirror** — its `marketplace.json` is generated by the
review pipeline, so there is no entry file for us to author or PR. Approved plugins are
pinned to a commit SHA and CI bumps the pin as new commits are pushed. The catalog
syncs nightly, so approval and appearance are not simultaneous.

### The gate we were failing until today

> Run `claude plugin validate ./your-plugin` locally before you submit. The review
> pipeline runs the same check on every submission, along with automated safety
> screening. […] add `--strict` to treat warnings as errors.

Before this branch, that check **failed**:

```
claude plugin validate . --strict
  → ⚠ plugins[0].version: Entry declares version "0.2.1" but … says "0.1.12"
  → ✘ Validation failed (--strict treats warnings as errors)
```

After the fix, both the marketplace and the plugin pass `--strict`. The level 1 bug and
the level 2 blocker were the same defect.

### The entry the pipeline would generate

`pilotdeck` lives in `plugin/`, not at the repo root. That is supported: 406 of the
2281 community entries use a `git-subdir` source. The expected shape, with the SHA
filled in by their CI:

```json
{
  "name": "pilotdeck",
  "description": "<the plugin.json description>",
  "category": "productivity",
  "source": {
    "source": "git-subdir",
    "url": "rafaeldominguesdev/pilotdeck",
    "path": "plugin",
    "ref": "main",
    "sha": "<pinned by the review pipeline>"
  },
  "homepage": "https://github.com/rafaeldominguesdev/pilotdeck"
}
```

`category` is optional (only 156 of 2281 entries set one); `productivity` is the
closest of the categories in use.

### Self-review against their published policy

The reviewer's rubric is public at `.github/policy/prompt.md` in the official repo.
Our hooks, in the format it asks for:

| Hook | Gated? | Network |
| --- | --- | --- |
| `SessionStart:hooks/session-start.sh` | ungated (`startup\|resume\|clear\|compact`) | yes — the user's own configured instance |
| `PostToolUse:hooks/claim-guard.sh` | gated to `task_claim/deliver/release` | no |
| `PostToolUse:hooks/post-deliver.sh` | gated to `task_deliver` | no (git fetch against the project's own remote) |
| `PreToolUse:hooks/pre-create.sh` | gated to `task_create` | yes when enabled; **default off** |
| `PreToolUse:hooks/claim-guard.sh` | **ungated** (`Edit\|Write\|Bash`) | yes when enabled; **default off** |
| `Stop:hooks/stop-guard.sh` | **ungated** (`*`) | yes when enabled; **default off** |

Where we stand well: `has_undisclosed_telemetry` is false — every outbound call goes to
the MCP host the user configures, there is no analytics, no usage ping, no third-party
endpoint. No credential is read from one service and sent to another.

**The one honest risk** is `has_broad_scope_hooks`. The rubric sets it true if "any
UserPromptSubmit/PreToolUse/PostToolUse hook runs without a project-relevance gate,"
and `passes=false` follows automatically. Our claim guard binds `PreToolUse` on
`Edit|Write|Bash` with no gate. It returns immediately unless the user sets
`enforce_claim=1`, but a reviewer reading `hooks/hooks.json` sees an ungated binding on
every edit in every project — and the rubric is applied to the registration, not to the
runtime early-exit.

Two options for the owner, neither taken here because both change the guard's design:

1. Gate the registration on project relevance — only bind when the project actually
   uses PilotDeck (for example, a `.pilotdeck/` directory present).
2. Ship the claim guard unregistered and have install.sh add the binding only when the
   user opts in, so the shipped `hooks.json` carries no ungated `PreToolUse`.

Option 2 preserves the guard exactly and is the smaller change; option 1 is more
self-contained. This is a design decision, so it is left for the owner.

Already addressed here: `description_matches_behavior`. The old description ("Run the
complete PilotDeck card workflow from Claude Code") would surprise a user who then
found a hook inspecting every `Edit`/`Write`/`Bash`. All six manifests now disclose the
hooks, the opt-in guards, and the network scope up front.

### Owner steps — the Claude submission is a form, not code

Nothing below is an engineering task; all of it is the owner's to do, and none of it can
be done from a branch.

1. **Decide the `has_broad_scope_hooks` question above.** As shipped, the submission
   fails the automated review on that one point. Land whichever mitigation you prefer
   before submitting if you want it to pass first time.
2. **Merge this branch.** The review pipeline pins a SHA from `main` and runs
   `claude plugin validate` against it, so `main` is what gets judged.
3. **Submit the form** at <https://platform.claude.com/plugins/submit> (Console, for
   individual authors) — repo `rafaeldominguesdev/pilotdeck`, path `plugin`, source `git-subdir`.
   The claude.ai form at
   <https://claude.ai/admin-settings/directory/submissions/plugins/new> is the same
   thing but needs a Team/Enterprise org with directory-management access.
4. **Then wait.** Approved plugins are pinned to a commit SHA in
   `anthropics/claude-plugins-community` and the catalog syncs nightly, so approval and
   appearance are not the same moment. Check by searching the plugin name in that
   repo's `marketplace.json`.

The target is **`claude-plugins-community`, reached by form** — not
`claude-plugins-official`, which takes no submissions at all, and not a pull request,
which its bot auto-closes. There is therefore no submission PR link to hand over: this
document is the submission package. Publication is outward-facing and stays the owner's
call.
