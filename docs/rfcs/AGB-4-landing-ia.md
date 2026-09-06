# RFC AGB-4: Public landing information architecture (as built)

- Card: AGB-4
- Status: as-built record, awaiting owner approval
- Date: 2026-08-16
- Artifact under discussion: `site/index.html`

## 1. Why this RFC reads the way it does

The card asked for a proposal "before the pixel". The pixels shipped first: the
landing already exists at `site/index.html`. Pretending otherwise would make
this document fiction. So this RFC does the honest version of the same job: it
records the information architecture the landing actually shipped with, the
order, the reasoning behind each section, and what was deliberately left out,
so the card contract ("read the RFC, approve or comment the sections") can
still be fulfilled by the owner against reality. Approving this RFC means
approving the shipped IA. Commenting it means opening follow-up cards to change
the page.

## 2. Positioning

One sentence, used consistently in the title tag, OG tags and hero:

> PilotDeck is the open source task board where AI agents do the work.

- Audience: developers already running agent CLIs (Claude Code, Codex, Gemini
  CLI and similar) who want a board their agents can claim work from.
- Stance: self-hosted, MIT, MCP-native, no tracking. The page sells ownership
  and the human-validation loop, not AI hype.
- Primary conversions, in order: star the GitHub repo, run the two-command
  self-host quickstart, connect an agent over MCP.

## 3. Shipped structure, in order

### 3.0 Atmosphere and nav

Fixed nav with wordmark, four anchor links (The loop, Features, vs traditional
PM tools, Open source) and a compact GitHub star button. Behind everything, a
canvas recreation of the product's Nebula background (dust band, stars,
parallax), paused on hidden tabs and frozen under reduced motion. A thin scroll
progress bar sits on top. Rationale: the landing should feel like the product
before a single screenshot, and the star CTA must be reachable from any scroll
position.

### 3.1 Hero

Eyebrow ("open source · mit · self-hosted · mcp-native"), H1 wordmark, tagline
("The open source task board: where AI agents do the work."), one subline that
splits the roles (humans decide and review, agents execute and report back),
then two CTAs: Star on GitHub (primary) and "Self-host in 2 commands" (anchor
to the quickstart). Directly below, the quickstart itself: a copy-button code
block with `git clone` + `docker compose up`. The hero closes with the board
recreated in pure HTML/CSS: four columns (Open, In progress, Done · review,
Validated) with realistic cards showing contracts, branch names and per-card
telemetry. Rationale: the two questions a developer asks first, "what is it"
and "how fast can I run it", are both answered before the first scroll, and
the board mock proves the product visually without a stale screenshot.

### 3.2 Section 01 · The loop

Four numbered steps: create a card (a contract: What, Why, How to confirm),
your agent claims it over MCP, handoff with evidence and real telemetry, only
a human validates. Footer line: "done ≠ validated: merge is the machine's
opinion, validation is yours". Rationale: the loop is the product's core
mental model, so it comes before any feature list. The kbd-style quotes ("grab
the next task from the board", a sample telemetry line) ground each step in
something concrete.

### 3.3 Section 02 · Features

Six cards in a bento grid, each one feature with a proof detail: cards are
contracts, harness policy instead of model roulette, three roles per card,
RFCs as cards, cost per card, git-convention native. Rationale: every feature
restates the same positioning from a different angle; nothing generic like
"collaboration" or "productivity" made the cut. Monospace micro-examples
(policy table, telemetry line, branch/commit/PR naming) carry the proof.

### 3.4 Section 03 · Comparison

"Same category. Different species." A six-row table against "Traditional PM
tools": hosting, data ownership, who executes, cost model, license, review
model. Rationale: visitors arrive with a PM-tool frame in their head, so the
page confronts it directly, but the visible copy names a category, not a
brand, and each PilotDeck cell states a verifiable fact rather than a
superlative.

### 3.5 Section 04 · Open source

"Free forever. Yours forever." Left: plain rows for License (MIT), Self-host
(free forever), Cloud (coming soon), Stack (next.js, postgres, drizzle, mcp
sdk). Right: the MCP surface panel listing the tool names, the real
`claude mcp add` connect command with placeholder host and token, and the
follow-up line "grab the next task from the board". A closing note says any
MCP-capable agent works and that the board is built to shine with Overclock.
Rationale: for this audience, showing the actual tool names and the actual
connect command is stronger than any promise; it doubles as minimal docs.

### 3.6 Section 05 · Roadmap / community

One statement: the roadmap lives on the project's own PilotDeck board, agents
build the board through the board. Three roadmap chips (onboarding wizard,
settings and insights, github app and webhooks) and two CTAs (watch the repo,
open an issue). Rationale: dogfooding is the strongest credibility claim the
project has, and it converts curiosity into repo engagement.

### 3.7 Footer

Wordmark, three links (GitHub, Docs, MIT License), motto: "your board · your
server · your data". Nothing else.

## 4. Why this order

The page runs one narrative arc: what it is and how to run it (hero), how it
works (loop), what it does (features), why it is different (comparison), proof
it is really open (open source), where it is going and how to join (roadmap).
Each section earns the next; a visitor can leave after any section with a
correct model of the product. All navigation is single-page anchors: no
subpages to maintain, and deep docs are linked out to the repo instead of
duplicated.

## 5. Deliberately left out

- Pricing section: there is nothing to price; self-host is free and cloud is a
  one-line "coming soon".
- Testimonials and logos: the project is too young; fake social proof would
  contradict the honesty positioning.
- Product screenshots: the board is recreated in HTML/CSS instead, so it never
  goes stale and matches the Nebula visual exactly.
- Email capture, newsletter, chat widget: the conversion is the repo, not a
  lead list.
- Analytics, tracking pixels, cookie banners: the page practices the "no
  phone-home" claim it makes.
- Multi-page IA (separate docs, blog, about): everything lives on one page;
  documentation stays in the repository where it is versioned with the code.
- Vendor-specific agent instructions per CLI: one generic MCP connect command
  covers them all.

## 6. Known deviations to review

1. The comparison table's HTML caption (visible to assistive tech) still names
   a specific competitor brand while the visible header deliberately does not.
   Scrubbing it to the generic category would make the page consistent with
   the no-brand rule.
2. The roadmap chip "settings & insights" is now partly shipped (settings
   exists; the insights page landed with AGB-6). The chip list should move
   forward when the landing is next touched.
3. The quickstart comment points to `http://localhost:3000` (docker compose
   default), while local development runs on another port. Correct for the
   audience the block targets; noted so nobody "fixes" it into the dev port.
4. The MCP panel says "12 tools" and lists 12, but the server now exposes 13:
   `mission_create` landed with AGB-21 after the landing shipped. The panel
   and its count need a refresh.

## 7. How to approve

Read this document against `site/index.html` (open it in a browser or at the
published site). Approve the card if the shipped IA and the reasoning above
stand; otherwise reopen with comments per section, and each requested change
becomes its own card.
