# References and anatomy — what an elite design system has, and what ours has to have

> OCL-120, research front 3 of the *Design System v2* mission. This document does
> not decide anything. It collects **evidence**: who is worth stealing from, what a
> complete design system contains, what the terminal/multi-pane case adds on top of
> that, and how systems that serve more than one surface split the shared from the
> specific.
>
> **Sibling fronts, not touched here:** motion is OCL-118, foundations
> (typography, color, tokens, glass/depth) is OCL-119. Where this document names a
> color or a duration it is as *evidence of how someone else structured it*, never
> as our value.

## Method and evidence quality

Every claim below is either a **primary source** (the system's own documentation,
its own blog, its own source files) or is marked **[secondary]** and treated as a
lead, not a fact. Three things could not be verified and are recorded as such
rather than filled in:

- **Adobe Spectrum's token tiers.** `spectrum.adobe.com/page/design-tokens/`
  renders client-side and returned no body text. The global → alias → component
  tiering attributed to it is **[secondary]** and is carried here only because
  Primer's own docs describe the same three-tier shape first-hand.
- **x.ai has no published design system.** `ux-v2.md` names "the x.ai school" as
  our direction, and it is a fine *visual* reference, but what circulates as
  "x.ai's design system" are third-party reverse-engineered `DESIGN.md` files
  (e.g. `VoltAgent/awesome-design-md`). Treat x.ai as a mood board with a very
  disciplined owner; do not cite it as a systems reference.
- **Polaris moved.** `polaris.shopify.com` and `polaris-react.shopify.com` both
  301 to `shopify.dev/docs/api/polaris`, and the surviving structure is organized
  by *surface*, not by component. That relocation is itself the interesting fact —
  see §4.

Also note the name collision: **Warp the terminal** (`warp.dev`) is not
**Warp the design system** (`warp-ds.github.io`, Schibsted/FINN). Only the first
is relevant to us.

---

## 1. The shortlist — who is worth stealing from, and exactly what to steal

| System | The one thing it does better than anyone | Where it lives |
|---|---|---|
| **Linear** | Themes are *generated*, not authored. 3 inputs, not 98 variables. | [redesign part II](https://linear.app/now/how-we-redesigned-the-linear-ui) · [design refresh](https://linear.app/now/behind-the-latest-design-refresh) |
| **Vercel Geist** | Every step of every scale has a declared *job*; the docs are machine-readable by construction. | [geist](https://vercel.com/geist/introduction) · [colors](https://vercel.com/geist/colors) |
| **Radix** | Behaviour and skin are two different products. | [Themes](https://www.radix-ui.com/themes/docs/overview/getting-started) |
| **Stripe** | A contrast *rule* a human can apply from memory, with no tool open. | [accessible color systems](https://stripe.com/blog/accessible-color-systems) |
| **GitHub Primer** | A token naming grammar with a state segment, shared across platforms. | [token names](https://primer.style/product/primitives/token-names/) · [primitives](https://github.com/primer/primitives) |
| **Shopify Polaris** | Documentation organized by *where the UI runs*. | [polaris](https://shopify.dev/docs/api/polaris) |
| **Atlassian** | The design system as a **context engine for agents**, shipped over MCP. | [ADS](https://atlassian.design/) · [Rovo AI patterns](https://atlassian.design/patterns/rovo-ai) · [the argument](https://www.atlassian.com/blog/ai-at-work/atlassian-design-system-building-the-context-engine-for-the-ai-era) |

### 1.1 Linear — the theme is a function, not a file

Linear rebuilt theming on **LCH instead of HSL**, because LCH is perceptually
uniform: "a red and a yellow color with lightness 50 will appear roughly equally
light to the human eye." The payoff is structural, not aesthetic — instead of
defining **98 specific variables per theme**, a theme is now **three inputs: base
color, accent color, contrast**. High-contrast accessible themes fall out of the
same generator for free. They then used that generator for the *product's own*
light and dark themes, not just user themes.

Their two stated principles are worth copying verbatim into our doctrine:

1. **"Don't compete for attention you haven't earned"** — chrome recedes so the
   content area leads. Concretely: sidebar dimmed "a few notches", tabs made
   compact instead of full-width, fewer icons, colored team-icon backgrounds
   removed.
2. **"Structure should be felt not seen"** — borders softened, separators cut,
   after noticing dividing lines had "quietly proliferated… sometimes appearing
   without clear reason."

Typography: **Inter Display for headings, regular Inter for everything else.**
Palette moved off a "cool, blue-ish hue" toward "a warmer gray that still feels
crisp, but less saturated."

> **Steal:** the generator. We ship three themes as three hand-written CSS files
> (`nebula.css`, `xai.css`, `overclock.css`) — that *is* the 98-variable problem,
> one file per theme, drift guaranteed. And steal principle #1 as literal doctrine
> text; it is the sharpest one-line statement of what `ux-v2.md` §1 is reaching for.

### 1.2 Vercel Geist — every step has a job, and the docs are a machine format

Geist ships **10 color scales** (backgrounds, gray, gray-alpha, blue, red, amber,
green, teal, purple, pink). Non-background scales have **10 steps (100–1000)**,
and the step number *is* the contract:

| Steps | Job |
|---|---|
| 100–300 | backgrounds: default, hover, active |
| 400–600 | borders: default, hover, active |
| 700–800 | high-contrast (solid) backgrounds |
| 900–1000 | text and icons — the accessible end |

With a composition rule stated in the docs: if a component's default background is
Background 1, "you can use Color 1 as your hover background and Color 2 as your
active background." P3 is used where the display supports it. The system is scoped
openly at developer tools rather than at UI in general.

Two structural details beyond color. First, **the documentation is available as
Markdown by appending `.md` to any URL** (and via content negotiation) — the docs
are a machine format, not only a website. Second, Geist includes its **own
typefaces** (Geist Sans, Geist Mono, later Geist Pixel), designed with
[basement.studio](https://basement.studio/showcase/geist-strengthening-vercels-visual-identity)
and released open source; Geist Mono is explicitly aimed at "code editors,
diagrams, terminals". Our app already runs on Geist Mono.

> **Steal:** the step→role contract (a designer never asks "which gray?" again),
> and `.md` docs — cheap for us, and it is the same move Atlassian made at §1.7.

### 1.3 Radix — behaviour is not skin

Radix ships two products: **Primitives** (unstyled, accessible, behaviour and
keyboard semantics) and **Themes** (a styled layer configured by tokens — color
scale, radius, scaling, spacing — through a `Theme` wrapper, with a `ThemePanel`
for live preview).

> **Steal:** the split, as a gap statement. `docs/design/system/components.md` is a
> *skin* spec (tokens, sizes, states per component); it carries no behaviour layer,
> so keyboard semantics get re-decided per screen. Whichever library we land on,
> the system needs to say which half it owns.

### 1.4 Stripe — a contrast rule you can hold in your head

Stripe rebuilt their palette in **CIELAB**, a perceptually uniform space, because
"none of the default text colors we were using for small text (except for black)
met the contrast threshold" (WCAG: 4.5:1 small text, 3.0:1 large). Darkening
colors until they passed made them "dark and muddy". The tool let designers see
the effect of every change in Lab space and find what was physically achievable.

The output that matters is not the palette, it is the **rule**:

> Any two colors have sufficient contrast for small text if they are **at least
> five levels apart**, and **at least four levels apart** for icons and large text.

> **Steal:** exactly this shape of rule. `ux-v2.md` bans decorative hue but has no
> arithmetic that tells someone whether `text-2` on `surface-2` is legal. A ladder
> with a "N steps apart" law is enforceable in review and in a lint rule.

### 1.5 Primer — the naming grammar, including state

Primer's tokens come in three categories — **base → functional →
component/pattern** — and functional tokens are described as the ones "most
commonly used… throughout all of Primer and GitHub UI". The name itself is a
grammar of up to six segments: **prefix · namespace · pattern · variant ·
property · scale**, where *property* is the only required one. Dashes in CSS,
dots in JS.

```
base-size-4                        base
base-color-green-5                 base
bgColor-inset                      functional
borderColor-default                functional
button-primary-bgColor-hover       component/pattern
control-danger-borderColor-rest    component/pattern
```

Primitives are distributed as an npm package (`@primer/primitives`) and mirror
into the Figma libraries, and the base→functional→component architecture was
extended to motion as well.

> **Steal:** the **state segment** (`-rest`, `-hover`). Our tokens
> (`--oc-radius-control`, `--nebula-tap`) have property and pattern but no state,
> so every hover value in the board is a literal or a one-off. Steal the tiering
> vocabulary too — it is the same three tiers attributed to Spectrum **[secondary]**,
> which makes it the industry's de-facto shape.

### 1.6 Polaris — documentation organized by surface

The current Polaris docs are structured around **where an app's UI runs**: App
Home (iframe), App Home (UI extension), Admin UI extensions, Checkout UI
extensions, Customer account UI extensions, POS UI extensions. The component
inventory sits under those surfaces rather than above them.

> **Steal:** the axis, for §4. When one system serves surfaces with genuinely
> different constraints, "which surface" is a better top-level split than "which
> component".

### 1.7 Atlassian — the design system as a context engine for agents

This is the closest published work to our actual problem, and it has two halves.

**AI patterns are first-class citizens of the system.** Rovo/AI experiences use
distinct branding and labels so it is always visible when AI is at work: a **Rovo
logo / AI icon** vocabulary, a **telepointer** that shows Rovo is working on the
page, an **AI generation** component for AI-created content in context, and an
**AI footer** carrying a consistent disclaimer. Agent actions are attributed to
the **user who triggered them**, not to a service account, so changes trace back
to a person.

**The system is built to be read by machines.** Atlassian describes the design
system as a "context engine for the AI era" and ships: an **ADS MCP server** that
plugs into agents, **structured context files that guide decision-making**,
semantic layers on tokens (they cite five motion groups — slide, fade, scale,
rotate, content — encoded so both humans and agents grasp intent), and
code-generation templates. Their reported effect, vendor-measured: **+52%
accuracy, −34% task time, −26% AI tool calls.**

> **Steal:** all of it, and note the irony — we are an MCP company whose design
> system is not exposed over MCP. The desktop app is already halfway there
> (`docs/design-system/SKILL.md`, `_ds_manifest.json`, `_adherence.oxlintrc.json`);
> the board has nothing equivalent.

---

## 2. The checklist — what a complete design system contains

The most complete open inventory is
[designsystemchecklist.com](https://www.designsystemchecklist.com/)
([source](https://github.com/ardakaracizmeli/design-system-checklist)). Its four
top-level categories, verbatim from the repo's English content files:

**Design language** — *Brand*: vision · design principles · tone of voice ·
terminology · brand assets. *Guidelines*: accessibility · writing guidelines ·
microcopy guidelines · terminology · internationalisation.

**Foundations** — *Color*: accessibility · semantic colors · dark mode ·
guidelines. *Layout*: units · grid · breakpoints · spacing. *Typography*:
responsiveness · grid relation · readability · performance · guidelines.
*Elevation*: shadows · background colors · z-index. *Motion*: easing · duration ·
accessibility. *Iconography*: accessibility · style · naming · relation with grid ·
keywords · reserved icons · guidelines.

**Core components** — an alphabetical inventory (accordion, alert, avatar, badge,
button, breadcrumbs, calendar, card, carousel, checkbox, …), each expanded into
its own state and behaviour checklist: colors, variants, sizes, icon support,
hover state, active state, loading state, disabled state, accessibility role,
focus indicator.

**Maintenance** — *Documentation*: design system principles · getting started ·
design best practices · development best practices · component anatomy · component
properties · composition examples · sandbox product example · browser/OS support ·
release cycle. *Local libraries*: when to build · horizontal and vertical
libraries · library expectations · release cycle alignment. *Team processes*:
decision-making log · roadmap · stakeholder mapping · analytics · ongoing support
"shifts" · SLA. *Community support*: support channels · templates · regular
updates · open hours. *Contribution*: house rules · contribution guidelines ·
feature proposal template · engagement.

The independent write-ups converge on the same layering — "principles + tokens +
components + guidelines + tooling + governance", with semantic versioning and
migration guides for breaking changes **[secondary]**.

### 2.1 Our checklist, with where we actually stand

Scored against this repo (`docs/design/`) and the desktop app
(`overclock-app/docs/design-system/`). This is the "TEM que ter" list.

| # | Must have | Status | Evidence / gap |
|---|---|---|---|
| 1 | Design principles, written and quotable | **have (board)** | `ux-v2.md` §1 "what it is / what it is not / what goes". The app states them as an aesthetic in `README.md`, not as rules. |
| 2 | Brand: mark, usage, regeneration | **have** | `docs/design/brand.md` + `scripts/brand-icons.mjs`; `wordmark.test.ts` fails a hand-edited SVG. Best-governed artefact we own. |
| 3 | Voice and tone | **split** | Board: "direct, no enthusiasm, no em-dash", en + pt-BR (`system/microcopy.md`). App: PT-BR "tu", confessional, hostile-to-establishment (`README.md`). Two different products speaking. |
| 4 | Color: semantic layer + dark mode + contrast law | **partial** | Three theme files exist; there is no ladder arithmetic (see §1.4) and no generator (see §1.1). |
| 5 | Typography: named ramp as tokens | **partial** | `decisions.md` D1 names the ramp and admits ten literal sizes are scattered through `nebula.css`. |
| 6 | Layout: grid, spacing, breakpoints, containers | **have (board)** | `system/composition.md`; `decisions.md` D6 names the containers. |
| 7 | Elevation: surfaces, shadows, z-index | **partial** | Board: depth from lightness, no glow. App: translucency over a wallpaper + "brand emission" glow. Contradictory (§4). `decisions.md` D7 opens a new z-rung for toasts. |
| 8 | Motion: easing, duration, reduced-motion | **partial → OCL-118** | `ux-v2.md` keeps one ease and 150–300ms; no reduced-motion rule found. |
| 9 | Iconography: style, stroke, grid, naming, reserved icons | **partial** | App fixes Lucide at stroke 1.5; board has no icon spec, only an inlining rule. |
| 10 | Component inventory with **all** states | **have (board)** | `system/components.md` (10 components) + `components.html` rendered against the real theme files. Rule 3: "States are not optional." |
| 11 | Component **behaviour**/a11y layer | **missing** | See §1.3 — the inventory is a skin spec. |
| 12 | Microcopy defaults for empty/error/loading | **have (board)** | `system/microcopy.md`. |
| 13 | Accessibility floors, stated and enforced | **partial** | 44px tap floor and a focus-ring pattern are law in `ux-v2.md`; no contrast law, no keyboard matrix. |
| 14 | Decision log with rationale | **have (board)** | `system/decisions.md`, D1–D9, `[doctrine]` marks amendments. Rare and good. |
| 15 | Getting started / how to consume | **have (board)** | `system/README.md` "Rules of use". |
| 16 | Release cycle, versioning, deprecation, migration | **missing** | Nothing versions the design system in either repo. |
| 17 | Contribution model, house rules, proposal template | **missing** | Amendment happens by whoever holds the card. |
| 18 | Automated adherence (lint/test gate) | **split** | App: `_adherence.oxlintrc.json`. Board: `ux-v2.md` §5 is a human checklist; only the brand has a real test. |
| 19 | Cross-surface contract (web ↔ app) | **missing** | §4 is entirely about this. |
| 20 | **Terminal-aware layer** | **missing** | §3. Not in any generic checklist — it is ours to write. |
| 21 | **Live-agent / multi-pane state vocabulary** | **partial (app only)** | `components-pane-header.md` is a *closed* badge vocabulary — genuinely ahead of the field. Not shared with the board. |
| 22 | **Machine-readable for agents** (skill / MCP / `.md` docs) | **partial (app only)** | `SKILL.md` + `_ds_manifest.json`. Board: nothing. See §1.7. |

Rows 20–22 are the ones no off-the-shelf checklist will give us, and they are the
reason this system cannot be a copy of Polaris with our colors in it.

---

## 3. The terminal / multi-pane cut

Overclock lives in a terminal, inside a grid of panes, with live agents writing
into them. Nine things follow that a web design system never has to solve.

### 3.1 You do not own the palette

The 16 ANSI colors have no standard: "terminal emulators just choose colours and
it's not very consistent" ([Julia Evans, *Terminal colours are
tricky*](https://jvns.ca/blog/2024/10/01/terminal-colours/)). Users remap them for
taste or for accessibility, so blue-on-black and bright-yellow-on-white are real
failures in the wild. The three regimes — 16 ANSI, the 256-color palette (16 + a
6×6×6 RGB cube + 24 grays), and 24-bit truecolor — do not degrade into each other
gracefully.

Rules for program authors, from the same source: support arbitrary custom themes;
honour `NO_COLOR` and `--color=always/never`; prefer the ANSI defaults so the
user's terminal config decides legibility; **do not set background colors**.

> **For us:** the token file cannot be the only source of truth for anything the
> TTY renders. Anything drawn *by* our chrome is ours; anything drawn *in* the
> stream is the user's. That boundary needs a name in the system.

### 3.2 Contrast is computed at runtime, not designed

Modern terminals ship a **minimum-contrast** feature. Ghostty states it plainly:
"The minimum contrast ratio between the foreground and background colors. The
contrast ratio is a value between 1 and 21", WCAG 2.0, where 1.1 merely prevents
invisible text and ≥3 makes hard text readable; it does not affect emoji or
images ([config reference](https://ghostty.org/docs/config/reference)). iTerm2,
tabby, kitty, Ghostty and Windows Terminal all have some form of it.

[Textual](https://textual.textualize.io/guide/design/) solves the same problem in
the app layer, and its solution is the most directly copyable thing in this
document. Eleven base colors (`$primary`, `$secondary`, `$foreground`,
`$background`, `$surface`, `$panel`, `$accent`, `$warning`, `$error`, `$success`,
`$boost`), of which only `$primary` is required — the rest are generated. Each one
auto-generates a ladder (`-lighten-1..3`, `-darken-1..3`). And then the part that
matters:

- `$text`, `$text-muted`, `$text-disabled` resolve to whichever option **has
  better contrast against the background**.
- `$text-primary`, `$text-secondary` … are **guaranteed legible** against
  `$background`, `$surface` *and* `$panel`.
- muted backgrounds are the base color blended into `$background` at 70%, so
  `$text-primary` stays legible on `$primary-muted`.

> **For us:** "legible against any of our three surfaces" should be a *token
> guarantee*, not a designer's memory. That plus Stripe's N-steps-apart rule (§1.4)
> is the whole contrast story.

### 3.3 One theme has to span chrome, content and stream

**Warp** started from the 16 ANSI standard for compatibility with existing themes,
then added what a terminal-shaped *app* needs on top: an **accent** attribute
driving UI elements like tab indicators and block selection ("a wider range of
customization just from one color change"), and a **UI surface** system built from
the theme background plus an overlay (white for dark themes, black for light) plus
an outline — so layering adapts to the theme's mode instead of being redrawn per
theme ([how we designed
themes](https://www.warp.dev/blog/how-we-designed-themes-for-the-terminal-a-peek-into-our-process)).

**Zed** proves the same point in one file. `assets/themes/one/one.json` carries
**141 style keys**, of which **28 are `terminal.*`** — `terminal.background`,
`terminal.foreground`, `terminal.bright_foreground`, `terminal.dim_foreground`,
and every ANSI color in three intensities (`terminal.ansi.red`,
`terminal.ansi.bright_red`, `terminal.ansi.dim_red`). The remaining keys are
ordinary product chrome: `surface.background`, `elevated_surface.background`,
`border.focused`, `text.muted`, `element.hover`, `tab.active_background`,
`panel.background`. One theme, one namespace, chrome and TTY.

> **For us:** the app's `colors_and_type.css` has no `terminal.*` namespace at all.
> The pane is the product; the colors inside it are currently out of scope for the
> design system. That is the single biggest hole.

### 3.4 Density is a stated position, not an accident

Warp is characterised as density-first — a pro tool whose users tolerate small
targets — with layered surfaces (`bg → surface → surface-2`) doing the work
shadows do elsewhere **[secondary]**. Raycast is the opposite reading of the same
audience: three principles, **"fast, simple, and delightful"**, and a refresh that
*enlarged* the search bar and the icons "to reflect its importance, grab the
user's attention and set it apart from the search results below", added a bottom
action bar because ⌘K "was hidden behind a small button and is easy for new users
to miss", and shipped a separate **Compact Mode** for the users who want density
([a fresh look and feel](https://www.raycast.com/blog/a-fresh-look-and-feel)).

> **For us:** Raycast's answer is the honest one — density is a *mode*, not a
> global constant. `ux-v2.md` makes the 44px tap floor law while the app packs
> 9–11px meta rows into pane chrome. Both are right for their surface; the system
> has to say so explicitly and give each surface a density budget.

### 3.5 Structure the stream: the Block

Warp's central idea: every command and its output is grouped into a single
**Block** you can "copy, search, filter, bookmark, share, and navigate
independently — replacing the endless scroll of traditional terminals with
structured, actionable output". State is carried visually: a block that exits
non-zero gets **a red background and a red sidebar**
([docs](https://docs.warp.dev/terminal/blocks/)).

> **For us:** our stream is not commands, it is agent turns and tool calls — but
> the unit is the same shape (start, output, exit status, duration, copyable,
> referenceable). Overclock has no block. Panes are scroll. This is the highest-
> leverage new *component* the DS v2 could define.

### 3.6 Multi-pane: attention is the scarce resource

Ghostty gives the mechanism directly: **`unfocused-split-opacity`** (0.15–1.0,
dimming inactive panes) and **`split-divider-color`**. Linear gives the principle:
**"don't compete for attention you haven't earned."** Put together: in a grid of N
live panes, exactly one has focus, and everything else is dimmed by token — not by
being smaller, not by being grayer by hand.

> **For us:** we run *more* live surfaces than a terminal multiplexer does, and
> each one can emit at any time. Focus, dim level, and the right of a background
> pane to interrupt (a badge? a pulse? nothing?) are token-and-rule decisions the
> DS must own, or every feature re-decides them.

### 3.7 Presence and role colors are a token category

Zed's theme carries a **`players` array of 8 entries** — the collaborator cursor
colors, versioned with the theme like any other token. Charm's Lip Gloss solves
the adjacent problem for TUIs: an `AdaptiveColor` that picks between a light and a
dark value by **detecting the terminal's background at runtime**
(`lipgloss.HasDarkBackground`), made explicit and opt-in in v2 rather than global
and implicit ([lipgloss](https://github.com/charmbracelet/lipgloss)).

We already have this category and did not name it. `overclock-app`'s
`colors_and_type.css` carries an approved role spectrum (C-107 r6): scout cyan,
builder lime, reviewer violet, piloto amber, torre magenta — with **green and red
deliberately reserved for status/error**. That reservation is exactly the kind of
rule a design system exists to hold.

> **For us:** promote "identity/presence" to a first-class token tier next to
> surface, text, border and status. It is the tier that makes a 12-pane grid
> readable, and it is the tier `ux-v2.md`'s "one accent: white" doctrine currently
> has no room for.

### 3.8 The ASCII ↔ UI dialogue

Our chrome is React wrapped around a TTY, so the two languages meet on every
pixel. The app has already made one correct call here, worth generalising:
`cleanSessionPreview` strips TUI chrome (`Shift+Tab:mode | Ctrl+x:shortcuts`,
`? for shortcuts`) out of session previews, because "a keyboard hint is not a
session identity" — while the CLI *detector* still reads the raw preview. Display
is filtered; inference is not.

> **Candidate rules for the system:** (a) our chrome never imitates TTY styling
> (no fake box-drawing, no ANSI-colored badges) and the TTY is never restyled by
> our chrome; (b) content that crosses the boundary is filtered for *display* and
> preserved for *inference*; (c) any monospace outside a pane is a data voice, not
> a terminal impression.

### 3.9 Live agent state needs a closed vocabulary

The generic agentic-UX literature converges on four requirements — show what the
agent is doing, explain why it chose an action, allow override at any point,
recover gracefully — with run-lifecycle and tool-call events surfaced inline so
users can audit the basis of an output **[secondary]**. Atlassian's shipped answer
is §1.7's: AI icon, telepointer, AI generation component, AI footer, and
attribution to the triggering human.

Our app's answer is stricter than either and should survive into v2:
`components-pane-header.md` defines a **closed** badge vocabulary — `Principal`,
`SSH <alias>`, `EXTERNO`, squad role — with a single resolver
(`resolvePaneHeaderBadges`), a stated rule that "nothing outside this table becomes
a vocabulary chip", and a kill list of badges that were removed for competing with
each other. Status, CLI mark, pane id and tokens are declared *chrome*, not
badges.

> **For us:** that document is the strongest design-system artefact either repo
> has, and it is invisible to the board. Generalise the pattern — closed
> vocabulary + single resolver + explicit "why this is not a badge" — into the
> system layer.

---

## 4. Web ↔ app: what is shared and what is not

### 4.1 The actual divergence, measured

Both systems are written down, and they contradict each other. Sources:
`docs/design/ux-v2.md` + `docs/design/system/` (board) and
`overclock-app/docs/design-system/` (desktop).

| Axis | PilotDeck (board / web) | Overclock (desktop app) | Reconcilable? |
|---|---|---|---|
| Canvas | `#000` void, surfaces a step above | `#000000`, "pure black, never near-black" | **Agreed** |
| Type family | Inter for UI; mono demoted to a *data voice* | **Geist Mono only. No sans, no serif** | **Head-on conflict** |
| Accent | White. "There is no brand blue." | Red `#ef4444` — "THE accent"; the `*` is always red | **Head-on conflict** |
| Color as meaning | Semantic red/green only, as status | Full role spectrum (5 hues) + status + brand | Conflict — resolvable by tiering (§3.7) |
| Depth | Lightness steps; glow shadows explicitly killed | Translucent surfaces over a wallpaper + "brand emission" glow | Conflict — surface-scoped |
| Radii | control 8px, panel 12px, "pills die" | `--r-lg: 8px` default, `--r-xl: 12px`, **`--r-pill: 999px` exists** | **Nearly agreed** — kill the pill |
| Density | 44px tap floor is law | 9–11px meta rows in pane chrome | Surface-scoped budget (§3.4) |
| Voice | Direct, no enthusiasm, no em-dash; en + pt-BR | PT-BR "tu", confessional, blunt | Product vs marketing — needs a stated split |
| Machine-readable | none | `SKILL.md`, `_ds_manifest.json`, `_adherence.oxlintrc.json` | App is ahead |
| Enforcement | human checklist; one real test (`wordmark.test.ts`) | oxlint adherence config | Both partial |

Two of these are genuine identity decisions (type family, accent) and the rest are
surface parameters. That ratio is the good news: **most of the divergence is
tokenisable; only two things need a person to decide.**

### 4.2 How systems that serve many surfaces are structured

- **Tiering.** base → functional → component/pattern, with the *functional* tier
  as the one everything consumes (Primer, §1.5); the same three tiers are
  attributed to Spectrum **[secondary]**. Brand differences live in base +
  functional; component tokens and component code stay identical **[secondary]**.
- **Surface as an axis of documentation**, not a fork of the system (Polaris,
  §1.6).
- **A neutral interchange format.** The W3C
  [Design Tokens Format Module](https://www.designtokens.org/TR/drafts/format/):
  "An object with a `$value` property is a token"; `$type` is required (explicit or
  inherited) and "tools MUST NOT attempt to guess the type… by inspecting the
  contents of its value"; aliases are `{group.token}`, plus JSON-Pointer `$ref`;
  groups nest and support `$extends`; vendor data goes under `$extensions` with a
  reverse-domain key, and tools must preserve extension data they do not
  understand. `$deprecated` exists, which is checklist row 16 for free.
- **Distribution as a package, not a copy.** `@primer/primitives` on npm, mirrored
  into Figma.

### 4.3 The shape this suggests for us

Nothing here is a decision — it is the option the evidence supports.

**One token source, three outputs.** A DTCG JSON is the source; `nebula.css`,
`xai.css`, `overclock.css` and the app's `colors_and_type.css` become *generated*
artefacts. Surface differences ride as `$extensions` under a vendor key
(`sh.overclock.*`) or as separate functional layers over one base — never as a
second hand-maintained file. This is Linear's lesson (§1.1) applied across
surfaces instead of across themes.

**Split the layers by who they serve.**

| Layer | Shared across web + app | Per surface |
|---|---|---|
| Naming grammar and tiering | ✅ everything | — |
| Base scale values (gray ladder, spacing, radii) | ✅ | — |
| Semantics (what `text-muted` *means*, what a status color is allowed to mean) | ✅ | — |
| State vocabulary (`-rest`, `-hover`, `-active`, `-disabled`) | ✅ | — |
| Accessibility floors (contrast law, focus ring, keyboard) | ✅ | tap target size |
| Component behaviour + a11y roles | ✅ | — |
| Closed vocabularies (badges, agent roles, status) | ✅ | which subset is rendered |
| Voice: rules and register | ✅ | product vs marketing tone |
| **Type family** | grammar (weight/size ramp) | family per surface — *if* we decide to |
| **Accent** | the rule "exactly one" | which one |
| Density | the ladder | the budget per surface |
| Depth/atmosphere | z-index rungs | wallpaper, glow, translucency |
| Terminal namespace (§3.3) | ✅ definition | app-only rendering |

**Two extra things because both repos are separate git repos:** the shared part
has to be *publishable or vendored* (a package, not a paste), and there must be a
**drift test**. We already have the pattern — `wordmark.test.ts` fails when a
hand-edited SVG forks the identity. Point the same idea at tokens.

**Ship it machine-readable.** Geist's `.md` docs (§1.2) and Atlassian's MCP server
plus structured context files (§1.7) are the two proven forms. We build MCP
servers for a living, our agents write our UI, and the app already has a
`SKILL.md` and a manifest. The board having none is the asymmetry to close.

---

## 5. "Absurd" without empty decoration

The card asks for references that are genuinely advanced rather than decorative.
The honest finding is that for our category the two are the same people:

- **[basement.studio](https://basement.studio/)** — the studio that designed
  **Geist with Vercel**, with Awwwards Developer Awards and Sites of the Day
  including their own site and Next.js Conf. Their positioning — "we make cool
  shit that performs" — is the exact brief: award-grade craft delivered inside a
  developer-tool restraint budget. Reading:
  [the birth of Geist](https://basement.studio/post/the-birth-of-geist-a-typeface-crafted-for-the-web),
  [scaling Vercel](https://basement.studio/post/scaling-vercel-years-of-building-refining-and-elevating),
  [Codrops profile](https://tympanus.net/codrops/2025/12/15/from-basement-to-breakthroughs-inside-the-studio-powering-the-internets-boldest-brands/).
- **Awwwards as a browsing surface, by category rather than by winner** (winner
  lists rot; category pages do not):
  [sites of the year](https://www.awwwards.com/websites/sites_of_the_year/) ·
  [design agencies](https://www.awwwards.com/websites/design-agencies/) ·
  [websites using Geist](https://www.awwwards.com/websites/Geist/) — the last one
  is the most useful to us: it is a gallery of sites built on the type stack our
  app already runs.
- **The dev-tool canon itself** — [linear.app](https://linear.app),
  [vercel.com](https://vercel.com), [zed.dev](https://zed.dev),
  [warp.dev](https://www.warp.dev), [raycast.com](https://www.raycast.com),
  [ghostty.org](https://ghostty.org). None of them are decorated. All of them are
  more advanced than a site that is.

**The rule this suggests**, consistent with what we already wrote: the board's
decoration budget is zero, and atmosphere is a *marketing-surface* privilege.
`decisions.md` D1 already drew that line when it renamed the hero clamp to
`--oc-text-hero` and scoped it to "atmosphere/marketing surfaces only… not part of
the UI ramp". Keep that line and make it explicit in v2.

---

## 6. What this front recommends carrying into the DS v2

Ten items, in the order they unblock each other. Each cites its evidence above.

1. **Generate themes; stop authoring them.** Three inputs, not three files. (§1.1)
2. **Give every scale step a declared job**, and write a contrast law of the form
   "N steps apart". (§1.2, §1.4)
3. **Adopt a naming grammar with a state segment** — base → functional →
   component, `property` required, `-rest`/`-hover` real. (§1.5)
4. **Add the terminal namespace.** `terminal.*` including ANSI × normal/bright/dim
   belongs in the theme, and the boundary between "our chrome" and "the user's
   stream" needs a name. (§3.1, §3.3)
5. **Make legibility a token guarantee**, generated, not a designer's memory —
   Textual's `$text-*` model plus runtime minimum-contrast. (§3.2)
6. **Define the Block.** A structured, addressable unit for agent output, with
   state carried visually. Highest-leverage new component. (§3.5)
7. **Promote identity/presence to a token tier**, and make the focus/dim rule for
   a grid of live panes a system decision, not a feature decision. (§3.6, §3.7)
8. **Generalise the closed-vocabulary pattern** — table + single resolver +
   explicit non-badges — from the app's pane header into the system. (§3.9)
9. **One token source, surface-scoped outputs**, in DTCG JSON, published or
   vendored, with a drift test modelled on `wordmark.test.ts`. (§4.2, §4.3)
10. **Ship the system machine-readable** — `.md` docs, a skill, and an MCP server —
    because our own agents are the heaviest consumers of our own design system.
    (§1.2, §1.7)

Two questions this front cannot answer and hands back to the humans: **which type
family** and **which accent** the unified system uses. Everything else in §4.1 is
a token.

---

## Sources

**Design systems.**
[Linear — how we redesigned the Linear UI (II)](https://linear.app/now/how-we-redesigned-the-linear-ui) ·
[Linear — a calmer interface](https://linear.app/now/behind-the-latest-design-refresh) ·
[Vercel Geist](https://vercel.com/geist/introduction) ·
[Geist colors](https://vercel.com/geist/colors) ·
[Geist font](https://vercel.com/font) ·
[Radix Themes](https://www.radix-ui.com/themes/docs/overview/getting-started) ·
[Stripe — accessible color systems](https://stripe.com/blog/accessible-color-systems) ·
[Primer token names](https://primer.style/product/primitives/token-names/) ·
[primer/primitives](https://github.com/primer/primitives) ·
[Primer color overview](https://primer.style/foundations/color/overview/) ·
[Polaris](https://shopify.dev/docs/api/polaris) ·
[Atlassian Design System](https://atlassian.design/) ·
[Rovo AI patterns](https://atlassian.design/patterns/rovo-ai) ·
[Atlassian — context engine for the AI era](https://www.atlassian.com/blog/ai-at-work/atlassian-design-system-building-the-context-engine-for-the-ai-era)

**Anatomy and format.**
[Design System Checklist](https://www.designsystemchecklist.com/) ·
[its source](https://github.com/ardakaracizmeli/design-system-checklist) ·
[W3C Design Tokens Format Module](https://www.designtokens.org/TR/drafts/format/)

**Terminal and multi-pane.**
[Julia Evans — terminal colours are tricky](https://jvns.ca/blog/2024/10/01/terminal-colours/) ·
[Ghostty config reference](https://ghostty.org/docs/config/reference) ·
[Textual — design system](https://textual.textualize.io/guide/design/) ·
[Warp — how we designed themes](https://www.warp.dev/blog/how-we-designed-themes-for-the-terminal-a-peek-into-our-process) ·
[Warp Blocks](https://docs.warp.dev/terminal/blocks/) ·
[Zed themes](https://zed.dev/docs/themes) ·
[Zed One theme source](https://github.com/zed-industries/zed/blob/main/assets/themes/one/one.json) ·
[Lip Gloss](https://github.com/charmbracelet/lipgloss) ·
[Raycast — a fresh look and feel](https://www.raycast.com/blog/a-fresh-look-and-feel)

**Craft references.**
[basement.studio](https://basement.studio/) ·
[Geist showcase](https://basement.studio/showcase/geist-strengthening-vercels-visual-identity) ·
[Codrops on basement](https://tympanus.net/codrops/2025/12/15/from-basement-to-breakthroughs-inside-the-studio-powering-the-internets-boldest-brands/) ·
[Awwwards — sites of the year](https://www.awwwards.com/websites/sites_of_the_year/) ·
[Awwwards — design agencies](https://www.awwwards.com/websites/design-agencies/) ·
[Awwwards — websites using Geist](https://www.awwwards.com/websites/Geist/)

**Internal (evidence for §2.1 and §4.1).**
`docs/design/ux-v2.md` · `docs/design/brand.md` · `docs/design/system/{README,components,composition,microcopy,decisions}.md` ·
`overclock-app/docs/design-system/{README.md,SKILL.md,colors_and_type.css,_ds_manifest.json,_adherence.oxlintrc.json,components-pane-header.md,components-session-card.md}`
