# Motion — research for design system v2

> **OCL-118 · Frente 1 of 3.** This document is *research*, not implementation: it
> establishes what elite product interfaces actually do with motion, with sources
> and verbatim values, and turns that into a proposed motion layer for the unified
> Overclock design system (the PilotDeck board + the Overclock IDE).
>
> **Scope.** Motion only — timing, easing, choreography, state-through-movement,
> and the techniques that make it cheap. Typography, colour, glass/depth and the
> token architecture belong to **OCL-119**; the reference sweep and the anatomy of
> an elite design system belong to **OCL-120**. Where this document names a colour
> or a size it is because motion needs a subject, never to decide it.
>
> Nothing here changes product code. Every code block is an illustration.

---

## 0. TL;DR — the twelve findings

1. **The first motion decision is "no".** Elite systems gate animation by *frequency*,
   not by taste: anything a user triggers 100+ times a day gets zero animation.
   Overclock's most-repeated gestures — focus a pane, send a prompt, switch tab —
   are in that bucket. ([Emil Kowalski standards](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md), [Rauno](https://github.com/raunofreiberg/interfaces))
2. **One curve is not a motion system.** We ship exactly one easing
   (`--oc-ease-atmosphere`) and one micro duration (200ms). Every serious system
   ships at minimum *enter / exit / move* curves and a 5–6 step duration ladder
   (Carbon: 6 durations, 6 curves; Material 3: 16 durations, 10 curves).
3. **`ease-in` is banned on UI.** Entering/exiting → `ease-out`; on-screen movement
   → `ease-in-out`; hover/colour → `ease`; only progress is `linear`.
4. **Duration scales with distance and size.** A fixed 200ms for both a hover tint
   and a pane being born is wrong in both directions. Carbon states it as doctrine;
   Emil states it as "larger elements animate slower".
5. **Exits are ~20% faster than entrances.** Leaving is not a moment the user is
   deciding in.
6. **Transitions are interruptible; keyframes are not.** Anything driven by live
   agent state (which is everything in Overclock) must be a `transition` or a spring,
   never an `@keyframes` that restarts from zero.
7. **Springs earn their place only where there is velocity** — drag, gesture,
   arrival "pop". For a dense instrument panel the *Standard* spring scheme
   (damping 0.9) is right; the *Expressive* one (damping 0.6, visible overshoot) is not.
8. **Motion is the wrong channel for state, alone.** Response-time research gives
   the thresholds (0.1s / 1s / 10s); accessibility gives the rule that status must be
   redundantly encoded. Motion says *alive*; the label says *what*.
9. **N panes animating independently read as noise; N panes animating on one clock
   read as one instrument.** Phase-locking ambient loops is the single highest-value
   idea for our multi-pane case, and it is one WAAPI property (`Animation.startTime`).
10. **Exactly one attention-seeking motion may exist at a time**: "needs you".
    Everything else — running, booting, waking — is ambient and must be ignorable.
11. **Never animate over a live terminal.** Animate the pane *frame*, never the
    xterm surface, and never `backdrop-filter` above a streaming terminal.
12. **We can do enter/exit and grid reflow with zero new dependencies.**
    `@starting-style` + `transition-behavior: allow-discrete` (Baseline since Aug 2024)
    and the View Transitions API cover pane birth, death and grid reflow natively.

---

## 1. Where we actually are today (the baseline this must beat)

Evidence read out of the repo, not assumed.

**Shipped motion tokens** — `apps/web/src/styles/themes/nebula.css:294–302`, under
`:root, [data-theme="nebula"]`:

```css
--oc-duration-micro: 200ms;
--oc-duration-blink: 1s;
--oc-duration-drift: 12s;
--oc-duration-flow: 26s;
--oc-ease-atmosphere: cubic-bezier(0.22, 0.61, 0.36, 1);
--oc-ease-cursor: steps(1, end);
--oc-lerp-mouse: 0.08;
```

Four observations:

- **Motion is already theme-invariant, by accident.** `themes/xai.css` and
  `themes/overclock.css` redefine colour and nothing else; the motion tokens live in
  the `:root` half of the nebula selector, so every theme inherits them. This is the
  right behaviour — it should become *stated doctrine*, not a side effect.
- **`--oc-ease-atmosphere` is a legitimate ease-out.** `cubic-bezier(0.22, 0.61, 0.36, 1)`
  is `ease-out-cubic` (`cubic-bezier(0.215, 0.61, 0.355, 1)`) to three decimals. It is
  keepable — but it is the *weak* end of the ease-out family, and there is nothing
  else next to it for exits or for on-screen movement.
- **The four durations are not a ladder**: 200ms, then a jump to 1s / 12s / 26s
  (atmosphere loops). Everything between a hover and a background drift — menus,
  modals, sheets, arrivals — has no token and is hardcoded.
- **Nine `@keyframes` exist in `nebula.css`** (`nb-d-in`, `nb-sheet-in`, `nb-step-in`,
  `nb-ov-in`, `nebula-exec-pulse`, `nb-pulse`, …), i.e. the entrances are keyframe-based
  and therefore **not interruptible** (§3.6).

**What `docs/design/ux-v2.md` says about motion** — all of it:

| Where | What it says |
|---|---|
| §1 "what stays" | `Motion ease cubic-bezier(0.22,0.61,0.36,1)`, `150–300ms micro` — "Keep" |
| §2 token table | `--oc-duration` / `--oc-ease` → "micro-motion · 150–300ms / atmosphere curve" · `overclock` column **TODO** |
| §3 Control | `hover → bg surface-3 · border-strong · text-1 · 200ms` |
| §3 Board card | "Hover: border-strong + surface-3, **no scale transform**" |
| §5.11 | "No hover scale transforms; hover = surface/border/text change in 150–300ms" |
| §5.15 | "`prefers-reduced-motion` disables non-essential animation" |

**What `docs/design/system/` adds** — `components.md:23–25` ("transitions are always
`--oc-duration-micro` (200ms) with `--oc-ease-atmosphere`, on `background-color,
border-color, color` only"), and `components.md:300–312` / `decisions.md` D8: skeleton
rows pulsing `opacity 1 → 0.5` on `--oc-duration-blink`, no spinner component, inline
loading = dimmed label + `aria-busy`.

**Gap, in one line:** we have a *hover policy*, not a motion system — and the product
whose motion matters most (a grid of live agents) is not in the doctrine at all.
Full gap table in §8.

---

## 2. Principle 0 — should this animate at all?

The most quoted-out-of-context part of motion craft is easing. The part that actually
separates elite interfaces is the decision *not* to animate. The rule everyone converged
on is frequency-based:

| Frequency | Decision |
|---|---|
| 100+ times/day (keyboard shortcuts, command palette, focus change) | **No animation. Ever.** |
| Tens of times/day (hover, list navigation) | Remove or drastically reduce |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare / first-time (onboarding, arrival, celebration) | Delight is licensed |

> "Never animate keyboard-initiated actions — they repeat hundreds of times daily;
> animation makes them feel slow and disconnected."
> — [Animation Standards, Emil Kowalski](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)

Raycast is the canonical proof: it has no open/close animation, because it is opened
hundreds of times a day. Rauno states the same rule from the other side: *"Actions that
are frequent and low in novelty should avoid extraneous animations."*
([raunofreiberg/interfaces](https://github.com/raunofreiberg/interfaces))

Family inverts it into a design tool — the **Delight-Impact Curve**: impact rises as
usage frequency falls, so the *rarest* moments get the most crafted motion
([benji.org/family-values](https://benji.org/family-values)).

**Applied to Overclock — the frequency audit:**

| Gesture | Frequency | Verdict |
|---|---|---|
| Focus / switch pane (click, ⌘-number) | 100+ /day | **No motion.** Border + surface change in `--oc-duration-tap`, nothing moves. |
| Submit a prompt into a pane | 100+ /day | **No motion.** The response *is* the feedback. |
| Hover a card / control | 100+ /day | Colour-only, `--oc-duration-micro`, `ease` |
| Open a menu / filter panel | tens /day | Standard: 240ms `ease-out` from trigger origin |
| Open card detail modal | tens /day | Standard: 320ms |
| **Pane born / pane dies** | ~10–40 /day | Standard, and this is our signature moment |
| **Agent delivered (handoff)** | ~10–30 /day | Rare enough to be *the* delight moment |
| Mission complete / first run | rare | Delight licensed |

This table is the reason a "showpiece" motion system for Overclock is mostly about
**panes and agent state**, and almost not at all about chrome. Chrome should get
*quieter* than it is today, not louder.

---

## 3. The state of the art, with values

### 3.1 Easing — the decision order

```
entering or exiting the screen  → ease-out      (starts fast = feels responsive)
moving / morphing on screen     → ease-in-out   (accelerate, then brake)
hover / colour change           → ease
constant motion (progress)      → linear
default                         → ease-out
ease-in on UI                   → never
```

> "Never `ease-in` on UI. It starts slow, delaying the exact moment the user is
> watching. `ease-out` at 200ms *feels* faster than `ease-in` at 200ms."
> — [Animation Standards](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md)

The browser's built-in keywords are deliberately weak. Real systems ship stronger
curves. Verbatim values from the primary sources:

**IBM Carbon** — [`packages/motion/src/dtcg/motion.json`](https://github.com/carbon-design-system/carbon/blob/main/packages/motion/src/dtcg/motion.json):

| Curve | Productive | Expressive |
|---|---|---|
| standard | `cubic-bezier(0.2, 0, 0.38, 0.9)` | `cubic-bezier(0.4, 0.14, 0.3, 1)` |
| entrance | `cubic-bezier(0, 0, 0.38, 0.9)` | `cubic-bezier(0, 0, 0.3, 1)` |
| exit | `cubic-bezier(0.2, 0, 1, 0.9)` | `cubic-bezier(0.4, 0.14, 1, 1)` |

**Material 3** — [`_md-sys-motion.scss` v0.192](https://github.com/material-components/material-web/blob/main/tokens/versions/v0_192/_md-sys-motion.scss):

```
easing-emphasized             cubic-bezier(0.2, 0, 0, 1)
easing-emphasized-accelerate  cubic-bezier(0.3, 0, 0.8, 0.15)
easing-emphasized-decelerate  cubic-bezier(0.05, 0.7, 0.1, 1)
easing-standard               cubic-bezier(0.2, 0, 0, 1)
easing-standard-accelerate    cubic-bezier(0.3, 0, 1, 1)
easing-standard-decelerate    cubic-bezier(0, 0, 0, 1)
easing-legacy                 cubic-bezier(0.4, 0, 0.2, 1)
```

**Observed values from contemporary elite products.** These products do not
publish full motion specs, but teardowns and third-party audits give us enough
verified values and principles to compare against the published systems above.

| Product | Evidence | What it shows |
|---|---|---|
| **Linear** | A documented reconstruction of Linear's motion tokens gives: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`; `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`; `--duration-fast: 100ms`; `--duration-normal: 150ms`; `--duration-slow: 250ms`. ([Blake Crosley — Linear: The New Standard for Software Design](https://blakecrosley.com/guides/design/linear)) | Linear's curve is stronger than Carbon/M3 standard exits (0.16 → 1 vs. 0.2 → 1), and its ladder is tighter: 100/150/250ms. Speed is the feature. |
| **Arc** | Reviews describe Arc Search transitions as *"fluid and snappy"* ([MacStories](https://www.macstories.net/reviews/arc-search-for-iphone/)); the redesign case-study lists animation, storyboarding and prototyping as core skills ([Nikhil Ville](https://www.nikhilville.com/arc)). | Arc treats motion as a storytelling layer, not decoration. The browser's spatial model (tabs as spaces, splits, peek) depends on directional transitions. |
| **x.ai / Grok** | Grok's composer UX is built on *"radical calm"*: an almost empty dark canvas, model tier visible before the first keystroke, inline feature education at the point of ask ([AI UX Playground](https://aiuxplayground.com/teardowns/grok/composer)). Motion is rare and soft: a tool-connected state uses a *"soft, dark radial glow"* that pulses outward, then confirmation text and a button *slide up and fade in with a subtle stagger* ([60fps.design](https://60fps.design/shots/grok-tool-connected-pulse-animation)). | For an AI product, motion is confidence and confirmation, not entertainment. The dark radial glow and upward stagger are exactly the kind of low-amplitude "it worked" language our agent-state table should speak. |

**The design-engineering family** (Emil Kowalski's course, distilled in
[vercel-labs/open-agents · web-animation-design](https://github.com/vercel-labs/open-agents/blob/main/.agents/skills/web-animation-design/SKILL.md)),
sorted weak → strong:

```css
/* ease-out */
--ease-out-quad:  cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1);   /* ← what we ship today */
--ease-out-quart: cubic-bezier(0.165, 0.84, 0.44, 1);
--ease-out-quint: cubic-bezier(0.23, 1, 0.32, 1);        /* the "strong" UI default */
--ease-out-expo:  cubic-bezier(0.19, 1, 0.22, 1);
/* ease-in-out */
--ease-in-out-quart: cubic-bezier(0.77, 0, 0.175, 1);    /* on-screen movement */
/* iOS-like drawer curve (Ionic) */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

**Paired-elements rule.** Elements that move as a unit share easing *and* duration:
modal + overlay, tooltip + arrow, drawer + backdrop, and for us **pane + its frame +
its status seal**.

### 3.2 Duration — the ladder, and the two rules

Carbon's shipped durations, with their stated purpose
([overview](https://v10.carbondesignsystem.com/guidelines/motion/overview/), values from
`motion.json`):

| Token | Value | For |
|---|---|---|
| `fast-01` | **70ms** | micro-interactions such as button and toggle |
| `fast-02` | **110ms** | micro-interactions such as fade |
| `moderate-01` | **150ms** | small expansion, short-distance movement |
| `moderate-02` | **240ms** | expansion, system communication, toast |
| `slow-01` | **400ms** | large expansion, important system notifications |
| `slow-02` | **700ms** | background dimming |

Material 3's ladder: `short1–4` = 50/100/150/200ms, `medium1–4` = 250/300/350/400ms,
`long1–4` = 450/500/550/600ms, `extra-long1–4` = 700/800/900/1000ms.

The design-engineering ladder, by element:

| Element | Duration |
|---|---|
| Button press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects | 150–250ms |
| Modals, drawers | 200–500ms |

And the two rules that a flat token can't express:

- **Duration scales with distance and size.** *"Motion's duration should be dynamic
  based on the size of the animation; the larger the change in distance (traveled) or
  size (scaling) of the element, the longer the animation takes."* — Carbon. IBM even
  ships a calculator for it ([ibm.github.io/motion](https://ibm.github.io/motion/)).
- **Exit ≈ 0.8 × enter.** *"Exit animations can be ~20% faster than entrance."*
- **Ceiling: UI animation stays under 300ms.** *"A 180ms dropdown feels more responsive
  than a 400ms one."* Above 300ms is reserved for rare, explanatory, or marketing motion.

Rauno's version is harder still: *"Animation duration should not be more than 200ms for
interactions to feel immediate"* and *"animation values should be proportional to the
trigger size."*

### 3.3 Springs — where they belong, and which scheme

A spring has no duration; it settles. That is exactly why it is right for anything the
user can grab and reverse — it carries velocity through the interruption — and wrong for
everything else in a dense instrument panel.

Two ways to specify one:

```js
// Apple-style, duration + bounce — easier to reason about, can be emitted as pure CSS
{ type: "spring", duration: 0.5, bounce: 0.2 }

// Physics — more control, carries gesture velocity
{ type: "spring", mass: 1, stiffness: 100, damping: 10 }
```

Motion's defaults, for reference: `bounce: 0.25`, `damping: 10`, `mass: 1`,
`restSpeed: 0.1`, `restDelta: 0.01`; `visualDuration` overrides `duration` and means
"seconds until it *visually appears* to reach its target"
([motion.dev/docs/react-transitions](https://motion.dev/docs/react-transitions)).
Guidance: keep `bounce` in **0.1–0.3**, and avoid bounce in most UI — reserve it for
drag-to-dismiss and playful moments.

Material 3 ships springs as *tokens*, split by what they animate — and the split is the
useful idea. Verbatim from
[`StandardMotionTokens.kt`](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/StandardMotionTokens.kt)
and [`ExpressiveMotionTokens.kt`](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ExpressiveMotionTokens.kt):

| Token | Standard (damping / stiffness) | Expressive (damping / stiffness) |
|---|---|---|
| Fast **spatial** | 0.9 / 1400 | 0.6 / 800 |
| Default **spatial** | 0.9 / 700 | 0.8 / 380 |
| Slow **spatial** | 0.9 / 300 | 0.8 / 200 |
| Fast **effects** | 1.0 / 3800 | 1.0 / 3800 |
| Default **effects** | 1.0 / 1600 | 1.0 / 1600 |
| Slow **effects** | 1.0 / 800 | 1.0 / 800 |

- **Spatial** = position, size, shape. Allowed to overshoot.
- **Effects** = opacity and colour. Damping is **1.0 in every scheme** — critically
  damped, *no* overshoot, because a colour that overshoots is just a wrong colour.

**Recommendation for Overclock: the Standard scheme, spatial only, three tokens.**
Expressive (damping 0.6 → visible bounce) contradicts "dark instrument panel". Note that
effects springs are identical in both schemes — one more argument that opacity is not
where personality lives.

### 3.4 Physicality — the small rules that separate craft from motion-for-motion

- **Never `scale(0)`.** Enter from `scale(0.9–0.97)` + `opacity: 0`. *"Nothing in the
  real world appears from nothing."* Rauno: *"Don't animate dialog scale in from 0 → 1,
  fade opacity and scale from ~0.8."*
- **Press feedback**: `transform: scale(0.97)` on `:active`, 160ms `ease-out`. Rauno:
  *"Don't scale buttons on press from 1 → 0.8, but ~0.96, ~0.9, or so."*
- **Origin-aware.** *"Correct `transform-origin` (motion starts where it 'physically'
  should)"* — [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines).
  A popover scales from its trigger; a modal, which appears centred, keeps
  `transform-origin: center`. **For us: a pane scales from wherever it was spawned.**
- **`translate` in percentages**, not pixels — `translateY(100%)` is the element's own
  height whatever its size (how Sonner and Vaul position toasts and drawers).
- **Asymmetric timing**: slow where the user is deciding, fast where the system responds.

### 3.5 Choreography and stagger

> "When used properly, motion design should feel like a well choreographed dance, with
> all of the elements acting and reacting to one another in sync." — [Carbon](https://carbondesignsystem.com/elements/motion/choreography/)

Concrete numbers:

- **Carbon**: staggering the entrance of table content by **20ms** measurably reduces
  cognitive load; *"depending on the number of staggered elements, the delay should be
  adjusted to ensure that total time is still within 500ms."*
- **Design-engineering practice**: **30–80ms** between items; *"longer delays feel slow.
  Stagger is decorative — never block interaction while it plays."*
- **Sequencing order** (Carbon): start with the most stable content (static, header),
  end with the most important (the primary button, the result) so attention lands there.
- **Grid movement** (Carbon): when an element moves both horizontally and vertically,
  stagger the two axes so the path has a rounded corner instead of a diagonal.

Family's version of the same idea, from the product side: components **persist across
screens** rather than disappearing and reappearing; motion is directional (a tab switch
moves left or right depending on which tab was tapped); *"each animation serves a purpose
from an architectural perspective, aiding users in understanding their path from A → B."*

### 3.6 Interruptibility — the property that matters most for a live UI

> "CSS **transitions** can be interrupted and retargeted mid-animation; **keyframes**
> restart from zero. For anything triggered rapidly (toasts being added, toggles),
> transitions are smoother."

This is the single most important technical fact for Overclock, because *every* piece of
our UI is driven by asynchronous agent state that can change again 200ms later. A pane
that goes `running → waiting → running` inside a second must not restart its animation
twice; it must retarget.

**Rule to adopt: agent-state motion is expressed with `transition` (or a spring), never
with `@keyframes` — except for genuinely periodic ambient loops, which have no target
to retarget to.** Our nine existing `@keyframes` entrances (§1) are all interruption
candidates.

### 3.7 Cohesion

Match the motion to the product's personality. Sonner (the toast library) feels right
partly because it is *slightly slower* and uses `ease` rather than `ease-out` — elegance
over urgency. Overclock is the opposite personality: **crisp, fast, quiet**. Our motion
should read as an instrument responding, not as an app performing.

---

## 4. Motion that communicates state

### 4.1 The thresholds are not opinions

Jakob Nielsen's three limits, unchanged since 1993 and still the basis of every loading
guideline ([NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/)):

| Limit | Meaning | What the UI must do |
|---|---|---|
| **0.1s** | the user feels they are *directly* manipulating the thing | nothing. Any indicator here is noise |
| **1s** | flow of thought stays uninterrupted, but the delay is noticed | indicate the system is working |
| **10s** | limit of attention on this dialogue | show progress *and* an expectation of when it ends; the user will go do something else |

Agent work lives almost entirely **past 10 seconds** — which is the regime NN/g says
needs a percent-done indicator. We cannot produce a percent for an LLM run. The honest
substitutes are **elapsed time** and **last observable action**, both of which the panes
already have. Motion's job in this regime is only to answer *"is it alive?"* — a question
that must be answerable in one glance across twelve panes.

### 4.2 The flicker rules

> "**Minimum loading-state duration.** If you show a spinner/skeleton, add a short
> show-delay (~150–300 ms) & a minimum visible time (~300–500 ms) to avoid flicker on
> fast responses." — [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)

Two tokens, not one heuristic per component: a **show-delay** and a **minimum visible
time**. Without them, fast responses produce a flash that reads as a glitch — which in
an agent UI is worse than a slow response, because it looks like a crash.

Related, same source: *"Loading buttons show a spinner and keep the original label"*, and
*"loading/processing states e.g. 'Loading…', 'Saving…', 'Generating…' end with an
ellipsis"* — the `…` character, not three dots.

### 4.3 Skeleton, shimmer, and the "thinking" idiom

The current AI-interface convention, and where it comes from:

- **Skeletons over spinners for regions.** *"Skeletons mirror final content to avoid
  layout shift"* (Vercel). Our own design system already decided this: D8 — "a spinner
  says 'wait' without shape; a skeleton says what is coming"
  (`docs/design/system/decisions.md:103`). That decision holds; it needs motion values.
- **Shimmer means "active processing", not "waiting".** A moving gradient implies work;
  a static grey block implies a stall.
- **Shimmering *text* is now the standard "thinking" idiom.** shadcn/ui shipped a
  `shimmer` CSS utility in June 2026 described as *"a text shimmer for live status"* for
  exactly `Thinking…`, `Generating response…`, running tools, and streaming markers
  ([changelog](https://ui.shadcn.com/docs/changelog/2026-06-chat-components)) — alongside
  a `Marker` component for *"streaming state, tool activity"*.

**The trap for us:** shimmering text is a *chat* idiom, designed for one focused
conversation. Twelve simultaneously shimmering pane headers is a slot machine. See §5.

### 4.4 Motion may never be the only carrier of state

Two hard constraints, both non-negotiable:

- **Redundant cues.** *"Redundant status cues (not color-only); icons have text labels"*
  (Vercel guidelines) — the same logic applies to motion: a state that is only legible
  because it is moving is invisible to a user with reduced motion enabled, to a
  screenshot, and to anyone glancing at a 25% -scale pane.
- **WCAG 2.3.3 Animation from Interactions**: motion animations triggered by interaction
  must be disable-able unless essential
  ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)),
  and **WCAG 2.2.2 Pause, Stop, Hide**: automatically-playing motion lasting **>5s**
  alongside other content needs pause/stop/hide
  ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)). Our "running"
  loop runs for minutes. It is therefore *only* legal as a low-amplitude ambient signal
  with a static redundant encoding, and it must be switchable off.

And the correct interpretation of reduced motion:

> "Reduced motion means fewer and gentler animations, not zero — keep transitions that
> aid comprehension, remove movement/position changes."

Practically: under `prefers-reduced-motion: reduce`, **opacity and colour survive,
transform does not**. A breathing dot becomes a dimming dot; a pane that slides in
fades in; a grid that reflows jumps.

---

## 5. The Overclock case — a motion language for live agents in panes

This is the part no external design system has solved, because no external design system
has a grid of twelve autonomous processes each with its own lifecycle.

### 5.1 The real states (read from the code, not invented)

These states come from the Overclock IDE repo (canonical worktree
`/Users/laschuk/vibe-coding/overclock-app`, mirror at
`/Users/laschuk/Developer/overclock/overclock-app`), which the design system must
unify with the PilotDeck board.

`overclock-app/packages/shell/src/renderer/store/panes.ts:101` —

```ts
status: 'booting' | 'running' | 'idle' | 'closing' | 'done' | 'error' | 'hibernated' | 'waking'
```

`overclock-app/packages/remote-client/src/types/protocol.ts:1` —

```ts
export type PaneStatus = 'running' | 'idle' | 'blocked' | 'error' | 'done' | 'waiting';
```

Plus two side-channels the shell already subscribes to
(`overclock-app/packages/shell/src/renderer/utils/ptyOutputBus.ts`): `pane:soft` —
*"selo 'precisa de você'"*, C-158 — and `subscribePaneClarify`. And the board's own
vocabulary: `aberto`, `em_execucao`, `revisado`, `descartado`.

Note today's remote-client `StatusDot` re-introduces exactly what ux-v2 killed:
`boxShadow: 0 0 6px` on `running`
(`overclock-app/packages/remote-client/src/components/StatusDot.tsx:30`).
The v2 language must replace that halo, not inherit it.

### 5.2 Three doctrines before any values

**D-1 · One pane, one moving thing — "the seal".** Each pane carries exactly one
motion-bearing element: the status seal in its header (the 7px dot ux-v2 §1 already
specifies, flat, no halo). Nothing else inside a pane moves while an agent works. The
terminal is already the busiest surface in the product; competing with it is how you get
a casino.

**D-2 · The amplitude ladder — amplitude encodes *urgency*, not identity.**

| Level | Amplitude | Who is allowed | Loop? |
|---|---|---|---|
| **0 — still** | none | `idle`, `done`, `hibernated`, `blocked` | no |
| **1 — ambient** | opacity delta ≤ 0.55, no transform | `booting`, `running`, `waking` | yes, ignorable |
| **2 — event** | one shot: scale ≤ 1.35 on the seal, or one border flash | arrival of `done` / `error` | no, exactly once |
| **3 — attention** | opacity delta to 1.0 + a pane-border ring | **only** `waiting` / `clarify` / soft "precisa de você" | yes, and it must decay |

The point of the ladder: *running* is the most common state in the product and therefore
must be the *least* noticeable one that is still legible. The state that needs a human is
the only one licensed to interrupt.

**D-3 · Phase lock.** All level-1 loops share one clock, so twelve breathing panes read
as one instrument breathing, not as twelve unrelated blinkers. CSS animations started at
different times drift; the Web Animations API lets you set a common `startTime` against
`document.timeline`:

```js
// One clock for every ambient loop in the grid.
const BREATH = [{ opacity: 0.45 }, { opacity: 1 }, { opacity: 0.45 }];
const OPTS = { duration: 1600, iterations: Infinity,
               easing: 'cubic-bezier(0.4, 0, 0.6, 1)' };

function attachSeal(el) {
  const a = el.animate(BREATH, OPTS);
  a.startTime = 0;          // phase-locked to the document timeline, not to mount time
  return a;                 // a.pause() / a.cancel() when the pane leaves level 1
}
```

This is one line of difference between "noisy" and "alive", and it costs nothing.

**D-4 · Motion budget.** Loops are paused when they cannot inform anyone:

- pane not visible (scrolled out, other workspace, `hibernated`) → `animation-play-state:
  paused` / `Animation.pause()`. Rauno: *"Looping animations should pause when not
  visible on the screen to offload CPU and GPU."*
- more than **8** panes simultaneously at level 1 → the individual seals go static-dim and
  a single grid-level heartbeat carries "work is happening". Twelve ambient loops is not
  more information than one; it is the same information twelve times.

### 5.3 The state → motion table (proposed spec)

Durations reference the tokens proposed in §7.

| State | What the user must read | Motion | Values | `prefers-reduced-motion` | Redundant (static) cue |
|---|---|---|---|---|---|
| `booting` | "it is coming up" | seal: ambient breath, shallow | `opacity .25 → .60`, `--oc-duration-boot` (1400ms), `--oc-ease-breath`, phase-locked | dim seal, no loop | `⋯` glyph (Grid.tsx already uses it) + label "subindo" |
| `running` | "alive, working" | seal: ambient breath | `opacity .45 → 1`, `--oc-duration-breath` (1600ms), `--oc-ease-breath`, phase-locked | seal static at `.7` | `▸` glyph + elapsed time |
| `waking` | "coming back" | same as `booting`, one cycle then → `running` | 1400ms ×1 | none | label |
| `waiting` / `clarify` / soft | **"needs you"** | seal at level 3 **+** 1px pane-border ring at the same phase | `opacity .30 → 1`, `--oc-duration-attention` (900ms); ring `border-color` transition, same clock; **decays after 30s to static high-contrast** | no loop; static high-contrast seal + ring | `?` glyph + label "precisa de você"; pane sorts to front of the "needs you" rail |
| `blocked` | "stuck, not on me" | none | still | — | glyph + reason text |
| `idle` | "alive, nothing to do" | none | seal at `opacity .45`, still | — | label |
| `done` | **"it delivered"** | level 2, one shot: seal `scale 1 → 1.35 → 1` + pane border flashes to accent and back | `--oc-duration-event` (480ms), spring `duration .48 / bounce .2` (or `--oc-spring-default`); border flash uses the same 480ms so pane and seal are a unit | opacity-only flash, no scale | `✓` glyph + summary line |
| `error` | "it broke" | level 2, one shot, faster, **no bounce** | `--oc-duration-panel` (240ms) ×1, `--oc-ease-out-strong` | opacity-only | `✕` glyph + error text |
| `closing` | "it is leaving" | pane exit (§6.2) | 200ms | fade only | — |
| `hibernated` | "parked" | none, loops cancelled | seal `.25`, chrome desaturated | — | label |

Two deliberate asymmetries worth defending:

- **`done` is the only place a spring and an overshoot are licensed.** It happens ~10–30
  times a day (rare enough per §2), it is the moment the product exists for, and Family's
  delight curve says this is exactly where to spend. `bounce: 0.2`, at the top of the
  "subtle" band.
- **`waiting` decays.** A loop that pulses forever stops being a signal and becomes
  wallpaper, and past 5s of unattended looping we are also arguing with WCAG 2.2.2. After
  30s it holds a static high-contrast state — still unmistakable, no longer moving.

### 5.4 Illustration — the seal, in CSS

```css
/* One element carries motion per pane. Transitions, not keyframes, so a state
   change mid-loop retargets instead of restarting (§3.6). */
.pane-seal {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--oc-text-3);
  opacity: .45;
  transition: opacity var(--oc-duration-tap) var(--oc-ease-out),
              background-color var(--oc-duration-tap) var(--oc-ease-out);
  /* no box-shadow: ux-v2 §1 kills status-dot halos */
}

.pane[data-status="running"]   .pane-seal { background: var(--oc-ok); }
.pane[data-status="waiting"]   .pane-seal { background: var(--oc-warn); }
.pane[data-status="error"]     .pane-seal { background: var(--oc-danger); }
.pane[data-status="done"]      .pane-seal { background: var(--oc-accent); opacity: 1; }

/* Ambient loops are the one legitimate use of @keyframes: periodic, no target
   to retarget to. They are attached/detached by state and phase-locked in JS. */
@keyframes oc-breath { 0%, 100% { opacity: .45 } 50% { opacity: 1 } }

.pane[data-status="running"] .pane-seal {
  animation: oc-breath var(--oc-duration-breath) var(--oc-ease-breath) infinite;
}
.pane[data-hidden="true"] .pane-seal { animation-play-state: paused; }

@media (prefers-reduced-motion: reduce) {
  .pane-seal { animation: none !important; opacity: .7; }
}
```

### 5.5 The "thinking" label — one at a time

Shimmering text is licensed **only in the focused pane's header**, never in the grid.
Elsewhere the same information is a static verb plus elapsed time
(`pensando · 00:42`) — which is more information, in less motion.

```css
/* Focused pane only. Text-shaped shimmer, not a bar. */
.pane[data-focused="true"] .pane-activity {
  background: linear-gradient(90deg,
      var(--oc-text-3) 0%, var(--oc-text-1) 50%, var(--oc-text-3) 100%)
    0 0 / 200% 100%;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: oc-shimmer 2s linear infinite;
}
@keyframes oc-shimmer { to { background-position: -200% 0 } }

@media (prefers-reduced-motion: reduce) {
  .pane-activity { animation: none; background: none; color: var(--oc-text-2); }
}
```

Copy rule, from the Vercel guidelines: the label ends in the `…` character —
`Pensando…`, `Rodando…`, `Entregando…` — never `...`.

---

## 6. Choreographing the grid — panes are born, work, and die

### 6.1 What is being choreographed

A pane's arrival is not one animation, it is **two** that must not collide: the newcomer
appearing, and its siblings giving up space. Doing both at once, at the same weight, is
the "circus" the brief warns about. Carbon's sequencing rule resolves it: **stable content
first, the important thing last.**

### 6.2 The proposed sequences

**Birth** — total ≤ 400ms:

```
t=0     siblings reflow to their new rects   320ms  --oc-ease-in-out   (FLIP or View Transition)
t=80    newcomer: opacity 0→1, scale .96→1   240ms  --oc-ease-out-strong
        transform-origin = the point it was spawned from
        (the ⌘-N button, the parent pane's edge, the mission rail)
t=320   both settled; the seal starts its ambient loop, phase-locked
```

The 80ms offset is the sequencing rule made concrete: the space opens *before* the thing
that fills it arrives, so the eye follows one causal chain instead of two events.

**Death** — total ≤ 320ms, and faster than birth (§3.2):

```
t=0     pane: opacity 1→0, scale 1→.98        200ms  --oc-ease-accelerate
        terminal surface frozen (no reflow of dying content)
t=120   siblings close the gap                320ms  --oc-ease-in-out
```

**Drag-resize of the split** — **0ms, no transition, ever.** Direct manipulation must
track the finger 1:1; a transition on a dragged edge is latency you added on purpose.
(Rauno: frequent, low-novelty actions get no animation; Vercel: *"during drag, disable
text selection and set `inert` on dragged elements"*.)

**Focus change between panes** — border and surface only, `--oc-duration-tap` (100ms),
nothing moves. 100+ times/day (§2).

**Stagger on first paint of a workspace** — `--oc-stagger` (24ms) per pane, capped: never
more than 12 staggered items and never more than ~300ms total (Carbon's "total within
500ms", tightened for an instrument panel). Restoring a saved workspace with 9 panes
should feel like a machine powering on in one sweep, not like a list loading.

### 6.3 The three techniques, and when each is right

**(a) `@starting-style` + `transition-behavior: allow-discrete`** — entry/exit with zero
JS and full interruptibility. Baseline "newly available" since **August 2024**
([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style)); the companion
`transition-behavior: allow-discrete` (for `display`) and `overlay` (to keep top-layer
elements in the top layer while they leave) landed Chrome 117 / Firefox 129 / Safari 17.5
([Chrome for Developers](https://developer.chrome.com/blog/entry-exit-animations),
[web.dev](https://web.dev/blog/baseline-entry-animations)). Caveat: Firefox does not
animate *from* `display: none`.

```css
.pane {
  opacity: 1; transform: scale(1);
  transition: opacity var(--oc-duration-panel) var(--oc-ease-out-strong),
              transform var(--oc-duration-panel) var(--oc-ease-out-strong),
              display var(--oc-duration-panel) allow-discrete;
}
@starting-style {
  .pane { opacity: 0; transform: scale(.96); }
}
.pane[data-closing] { opacity: 0; transform: scale(.98); display: none; }
```

**(b) FLIP** for the siblings' reflow — First, Last, Invert, Play: measure both rects,
apply the inverse transform, then let it play. It converts an expensive layout change
into a `transform` animation ([Paul Lewis](https://aerotwist.com/blog/flip-your-animations/)).
This is what makes a 12-pane regrid free instead of a reflow storm.

```js
// Sibling reflow, compositor-only.
const first = el.getBoundingClientRect();
applyNewGrid();                             // layout changes here
const last  = el.getBoundingClientRect();
el.animate(
  [{ transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)
                 scale(${first.width / last.width}, ${first.height / last.height})` },
   { transform: 'none' }],
  { duration: 320, easing: 'cubic-bezier(0.77, 0, 0.175, 1)' }
);
```

**(c) View Transitions API** for whole-layout changes — `document.startViewTransition()`
snapshots old and new, and any element with a `view-transition-name` is animated as a
matched pair through `::view-transition-group / -image-pair / -old / -new`
([MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)).
Same-document transitions are supported in Chrome 111+, Edge 111+, Safari 18+ and
Firefox 133+; cross-document is Chromium + Safari 18.2+, still behind a flag in Firefox.
React 19.2 exposes `<ViewTransition>` and `addTransitionType` (experimental, opt-in), and
Next.js 16.2 wires it into `<Link transitionTypes>` behind `experimental.viewTransition` —
relevant because the board is Next 16 / React 19.

**The caveat that decides where we can use it:** during a view transition **the DOM is
snapshotted and effectively frozen**. A snapshot of a live terminal is a still frame. So:

> **View Transitions are for the board (card → detail, column reorder, filter changes)
> and for pane *layout* changes. They are not for anything that must keep rendering —
> a running xterm surface.** Pane birth/death uses (a) + (b), which never freeze content.

### 6.4 The terminal constraint

The Overclock IDE is a Tauri app: WRY picks the platform webview — **WKWebView on macOS,
WebView2/Chromium on Windows, WebKitGTK on Linux**
([wry](https://github.com/tauri-apps/wry)) — and the terminal is
`@xterm/xterm` 5.5, whose fast path is the WebGL renderer (shader-based, uploads a
`Float32Array` to the GPU, "scales much better with really large viewports";
canvas is the fallback, DOM the slowest —
[xterm.js#1790](https://github.com/xtermjs/xterm.js/pull/1790)). Consequences for motion:

1. **Animate the frame, never the surface.** Transforming an element that contains a
   WebGL canvas forces re-composition of that canvas every frame while the terminal is
   also streaming. Move the pane's border/header/backdrop; leave the terminal box alone,
   or freeze it (snapshot to an image) for the duration of a move.
2. **No `backdrop-filter` above a live terminal.** Blur is expensive, and *"keep blur
   < 20px (heavy blur is especially expensive in Safari)"* — and on macOS we *are* Safari.
   Glass belongs over static chrome (menus, modals), which is also what ux-v2 §1 already
   says: *"blur is an optical tool for panels that float over content, not the personality
   of the product."*
3. **Feature-test, don't assume Chromium.** Cross-browser floors differ:
   `@starting-style` from Safari 17.5, same-document View Transitions from Safari 18. The
   board (a normal browser) and the app (three different webviews) share tokens but not
   guarantees.
4. **Pause every loop for hibernated and off-screen panes** — a hibernated pane that keeps
   a WAAPI animation alive is paying GPU for a pane no one is looking at.

---

## 7. Proposed motion tokens (values)

Naming continues the shipped `--oc-duration-*` / `--oc-ease-*` convention so the
migration is additive. **Motion is theme-invariant**: these live in `:root`, and a theme
file may not redefine them (today's accidental behaviour, promoted to a rule — a theme
switch must change zero timing, the same way ux-v2 §5.14 says it changes zero layout).

```css
:root {
  /* ---------- durations: the ladder ---------- */
  --oc-duration-tap:       100ms;  /* press feedback, focus ring, seal colour swap   */
  --oc-duration-micro:     160ms;  /* hover: bg / border / colour  (was 200ms)       */
  --oc-duration-pop:       200ms;  /* tooltip, chip, inline reveal                   */
  --oc-duration-panel:     240ms;  /* dropdown, menu, popover, card enter, pane enter*/
  --oc-duration-modal:     320ms;  /* modal, sheet, grid reflow, pane birth          */
  --oc-duration-event:     480ms;  /* one-shot arrival (`done`). The ceiling.        */

  /* ---------- ambient loops ---------- */
  --oc-duration-attention: 900ms;  /* level 3 — "needs you"                          */
  --oc-duration-blink:     1s;     /* kept — cursor                                  */
  --oc-duration-boot:      1400ms; /* level 1 — booting / waking                     */
  --oc-duration-breath:    1600ms; /* level 1 — running                              */
  --oc-duration-shimmer:   2s;     /* focused pane's activity label only             */
  --oc-duration-drift:     12s;    /* kept — atmosphere                              */
  --oc-duration-flow:      26s;    /* kept — atmosphere                              */

  /* ---------- easings ---------- */
  --oc-ease-out:        cubic-bezier(0.22, 0.61, 0.36, 1);  /* kept: today's --oc-ease-atmosphere */
  --oc-ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);     /* entrances that must read as instant */
  --oc-ease-in-out:     cubic-bezier(0.77, 0, 0.175, 1);    /* on-screen movement, grid reflow     */
  --oc-ease-accelerate: cubic-bezier(0.3, 0, 1, 1);         /* exits leaving the viewport (M3)     */
  --oc-ease-hover:      ease;                                /* hover + colour, per §3.1           */
  --oc-ease-breath:     cubic-bezier(0.4, 0, 0.6, 1);        /* symmetric — loops only             */
  --oc-ease-linear:     linear;                              /* progress / marquee only            */
  --oc-ease-cursor:     steps(1, end);                       /* kept                               */

  /* ---------- choreography ---------- */
  --oc-stagger:          24ms;   /* between siblings                                  */
  --oc-stagger-max:      12;     /* items; beyond this, no stagger                    */
  --oc-sequence-gap:     80ms;   /* between the two halves of a choreographed change  */
  --oc-exit-ratio:       0.8;    /* exit duration = enter × this                      */

  /* ---------- loading thresholds ---------- */
  --oc-delay-indicator:  200ms;  /* show-delay before any loading state appears       */
  --oc-min-visible:      400ms;  /* minimum time it stays once shown                  */
  --oc-attention-decay:  30s;    /* level 3 loop → static after this                  */
}
```

**Springs** are not CSS custom properties (a spring is two numbers plus a solver), so they
are a token table consumed by WAAPI/JS. Three, all from Material 3's **Standard** scheme,
spatial only:

| Token | damping | stiffness | Use |
|---|---|---|---|
| `--oc-spring-fast` | 0.9 | 1400 | press, seal pop |
| `--oc-spring-default` | 0.9 | 700 | `done` arrival, drag release |
| `--oc-spring-slow` | 0.9 | 300 | pane drag settle |

Duration-first equivalent for anything that must coordinate with a CSS transition:
`{ duration: 0.48, bounce: 0.2 }` for `done`; `bounce: 0` everywhere else.

**Rules that are not tokens** (they belong in the doctrine text):

1. Exit duration = enter × `--oc-exit-ratio`, rounded to 10ms.
2. Duration scales with travel: a change crossing more than ~40% of the viewport steps up
   one rung on the ladder.
3. `transition: all` is forbidden. List properties.
4. Only `transform`, `opacity`, and colour properties may be transitioned. Never
   `width`, `height`, `top`, `left`, `padding`, `margin`.
5. Paired elements share duration *and* easing.
6. Agent-state motion uses transitions/springs; `@keyframes` only for periodic loops.
7. Motion tokens are theme-invariant.

---

## 8. Gap analysis — ux-v2 vs. what a v2 motion layer needs

| # | What the doctrine has today | What is missing | Severity |
|---|---|---|---|
| 1 | One curve (`--oc-ease-atmosphere`) | enter / exit / move / hover / loop curves — 6 more | **P0** |
| 2 | One micro duration (200ms) + three atmosphere loops | a 6-step duration ladder between 100ms and 480ms | **P0** |
| 3 | "150–300ms micro" as a band | the rule that duration follows distance and size | P1 |
| 4 | — | exit ≈ 0.8 × enter | P1 |
| 5 | — | **the frequency gate** (what must *not* animate) | **P0** |
| 6 | — | interruptibility: transitions over keyframes for state-driven motion | **P0** |
| 7 | — | any spring at all, and the choice of Standard over Expressive | P1 |
| 8 | — | stagger / sequencing values, and a cap | P1 |
| 9 | §5.11 "no hover scale transforms" | where transform *is* allowed (enter/exit, press, arrival) | P1 |
| 10 | — | `transform-origin` doctrine (motion starts where it physically starts) | P1 |
| 11 | §5.15 "reduced motion disables non-essential animation" | *which* animation is essential, and the opacity-survives / transform-dies rule | **P0** |
| 12 | — | performance law: compositor properties only, never `transition: all` | **P0** |
| 13 | D8: skeleton pulses on `--oc-duration-blink`; no spinner | show-delay + minimum-visible tokens; the >1s / >10s thresholds | **P0** |
| 14 | — | **agent-state motion language** (the whole of §5) | **P0** |
| 15 | — | **pane lifecycle choreography** (the whole of §6) — ux-v2 is board-only | **P0** |
| 16 | — | phase-locking and a motion budget for N simultaneous loops | **P0** |
| 17 | — | the terminal/webview constraints (§6.4) | P1 |
| 18 | Motion tokens live in `:root` by accident | stated rule: motion is theme-invariant | P2 |
| 19 | Checklist has 2 motion items (11, 15) | ~8 binary motion items (§10) | P1 |
| 20 | `--oc-duration`/`--oc-ease` marked **TODO** in the `overclock` column | resolved by #18: there is no per-theme motion column | P2 |

Two contradictions to settle explicitly when the doctrine is amended:

- **`--oc-duration-micro: 200ms` vs. "immediate ≤ 200ms" / "micro 100–160ms".** Proposal:
  **160ms**, which is inside ux-v2's own 150–300ms band and measurably snappier on a
  control the user hovers hundreds of times a day.
- **`StatusDot`'s `box-shadow: 0 0 6px` in the remote client vs. ux-v2 §1's
  "flat 7px dot, no halo".** The glow must go; the v2 language replaces it with the
  amplitude ladder, which carries more information than a halo ever did.

---

## 9. Priority list — what our design system *has* to have

**P0 — without these there is no motion system**

1. **The frequency gate**, written as doctrine: the table in §2 plus the named list of
   Overclock gestures that get zero motion (focus pane, submit prompt, drag split).
2. **The easing set** — 7 tokens (§7), with the decision order (enter → `ease-out`,
   move → `ease-in-out`, hover → `ease`, progress → `linear`, never `ease-in`).
3. **The duration ladder** — 6 interaction durations + 5 loop durations (§7), plus the
   scale-with-distance and exit-×0.8 rules.
4. **The performance law** — `transform` / `opacity` / colour only; no `transition: all`;
   no layout properties; `transform-origin` always deliberate.
5. **Interruptibility** — state-driven motion is transitions or springs; `@keyframes`
   only for periodic loops. (Includes migrating the nine existing keyframe entrances.)
6. **The agent-state motion language** — the amplitude ladder (D-2) and the state table
   (§5.3), with a redundant static cue for every state.
7. **Phase-locked ambient loops + motion budget** (D-3, D-4): one clock, pause when
   invisible, degrade past 8 concurrent loops.
8. **Pane lifecycle choreography** — birth (320 + 80 + 240), death (200 → 120 → 320),
   drag = 0ms (§6.2).
9. **Reduced-motion semantics** — opacity/colour survive, transform dies, loops stop,
   and every state stays legible with zero motion.
10. **Loading thresholds as tokens** — `--oc-delay-indicator` 200ms, `--oc-min-visible`
    400ms, applied to the existing skeleton spec.

**P1 — what makes it feel expensive rather than merely correct**

11. Springs: three Standard-scheme tokens, spatial only, `bounce ≤ 0.2`.
12. The `done` arrival as *the* signature moment (the only licensed overshoot).
13. Stagger + sequencing: 24ms, ≤12 items, ≤300ms total, stable-content-first.
14. Origin-aware entrances: pane and popover scale from where they were spawned.
15. Press feedback (`scale(0.97)`, 160ms) as a system-wide primitive.
16. The "thinking" idiom: shimmer only in the focused pane; static verb + elapsed
    elsewhere; `…` in every progressive label.
17. Terminal-safe motion: animate the frame, freeze the surface, no blur over a live
    terminal, feature-test per webview.
18. The paired-elements rule (pane + frame + seal move as one unit).

**P2 — later, once the above is real**

19. View Transitions for board-level navigation (card → detail, column reorder) behind a
    feature test, using `view-transition-name` on the card's identity.
20. Directional motion as meaning (Family): a pane opened from the rail enters from the
    rail; a card that moves right in the board reads as forward.
21. `clip-path` reveals for hold-to-confirm on destructive pane actions (kill/close all),
    with the asymmetric timing rule — slow to press, instant to release.
22. A rendered motion exemplar (`docs/design/system/motion.html`) showing every token and
    every agent state side by side, the way `components.html` does for components.

**Explicitly out of scope / rejected**

- Material 3's **Expressive** spring scheme (damping 0.6, visible bounce) — wrong
  personality for an instrument panel.
- A general-purpose animation dependency (Motion, GSAP). Both apps ship React 19 with no
  animation library today; CSS + WAAPI covers everything in P0/P1. Motion's own docs note
  that only CSS and WAAPI can run off the main JS thread, and that shorthand `x`/`scale`
  props go through CSS variables and lose acceleration
  ([motion.dev/docs/performance](https://motion.dev/docs/performance)) — the exact failure
  mode we cannot afford next to a streaming terminal.
- Glow halos on status dots (already killed by ux-v2 §1; must also be removed from the
  remote client).
- Any looping motion that carries information *only* through motion.

---

## 10. Proposed acceptance checklist (binary, for the implementation cards)

Extending ux-v2 §5, in its style:

```
[ ] M1  No component rule uses `transition: all`; properties are listed explicitly.
[ ] M2  Only transform, opacity and colour properties are transitioned. No width,
        height, top, left, padding, margin anywhere.
[ ] M3  Every duration and easing comes from a token; no literal ms or cubic-bezier
        in a component rule.
[ ] M4  No animation on: pane focus change, prompt submit, split drag.
[ ] M5  Every agent state is legible with motion fully disabled (glyph + label),
        verified with `prefers-reduced-motion: reduce` forced on.
[ ] M6  Under reduced motion no transform-based motion runs and no loop runs;
        opacity/colour transitions still do.
[ ] M7  Ambient loops across all visible panes are phase-locked (same clock) and
        paused for hidden/hibernated panes.
[ ] M8  Exactly one pane state is allowed to loop at attention amplitude, and it
        decays to static after --oc-attention-decay.
[ ] M9  Loading states never appear before --oc-delay-indicator and never vanish
        before --oc-min-visible.
[ ] M10 No animation transforms an element containing a live terminal surface;
        no backdrop-filter is layered over one.
[ ] M11 Pane birth and death play at 60fps with 12 panes open, verified in the
        DevTools performance panel with 4× CPU throttling.
[ ] M12 Theme switch changes zero timing (motion tokens are :root-only).
```

---

## 11. Open questions for the design-system decision

1. **Does the board inherit the pane motion language, or only the tokens?** Cards in the
   board also have "live" states (`em_execucao`). The amplitude ladder generalises; the
   pane-specific choreography does not.
2. **Is `done` allowed to be audible?** The delight curve argues yes for the rarest event;
   this document takes no position on sound.
3. **Does the "needs you" state get to promote a pane in the grid** (reflow to front), or
   only to change colour and pulse? Reflow is far louder, and the decay rule interacts
   with it.
4. **What is the motion budget threshold in practice?** §5.2 proposes 8 concurrent loops
   from reasoning, not measurement. It should be set by profiling on the WKWebView build
   with real terminals streaming.

---

## 12. Sources

**Design-engineering practice**
- Emil Kowalski — [Great animations](https://emilkowal.ski/ui/great-animations)
- Emil Kowalski — [Animation Standards Reference](https://github.com/emilkowalski/skills/blob/main/skills/review-animations/STANDARDS.md) (durations, curves, springs, stagger, perf — the densest single source used here)
- Vercel — [web-animation-design skill](https://github.com/vercel-labs/open-agents/blob/main/.agents/skills/web-animation-design/SKILL.md) (the easing families, verbatim)
- Vercel — [Web Interface Guidelines](https://vercel.com/design/guidelines) · [source](https://github.com/vercel-labs/web-interface-guidelines)
- Rauno Freiberg — [interfaces](https://github.com/raunofreiberg/interfaces) · [Invisible Details of Interaction Design](https://rauno.me/craft/interaction-design)
- Benji Taylor — [Family Values](https://benji.org/family-values) (fluidity, delight-impact curve) · [Family, frame by frame](https://60fps.design/apps/family)

**Design systems with published motion tokens**
- IBM Carbon — [Motion overview](https://carbondesignsystem.com/elements/motion/overview/) · [Choreography](https://carbondesignsystem.com/elements/motion/choreography/) · [token source](https://github.com/carbon-design-system/carbon/blob/main/packages/motion/src/dtcg/motion.json) · [Motion generator](https://ibm.github.io/motion/)
- Material Design 3 — [Motion](https://m3.material.io/styles/motion/) · [easing & duration tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs) · [token source](https://github.com/material-components/material-web/blob/main/tokens/versions/v0_192/_md-sys-motion.scss) · springs: [StandardMotionTokens.kt](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/StandardMotionTokens.kt), [ExpressiveMotionTokens.kt](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ExpressiveMotionTokens.kt)

**Timing, loading and state**
- Jakob Nielsen — [Response Time Limits](https://www.nngroup.com/articles/response-times-3-important-limits/) · [Powers of 10: Time Scales in UX](https://www.nngroup.com/articles/powers-of-10-time-scales-in-ux/)
- shadcn/ui — [Chat components, June 2026](https://ui.shadcn.com/docs/changelog/2026-06-chat-components) (the `shimmer` status utility, `Marker` for streaming state)

**Platform capability**
- MDN — [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) · [`transition-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/transition-behavior) · [View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) · [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- Chrome for Developers — [Four new CSS features for smooth entry and exit animations](https://developer.chrome.com/blog/entry-exit-animations) · web.dev — [Baseline: animating entry effects](https://web.dev/blog/baseline-entry-animations)
- Paul Lewis — [FLIP Your Animations](https://aerotwist.com/blog/flip-your-animations/)
- Motion — [Performance](https://motion.dev/docs/performance) · [Transitions & springs](https://motion.dev/docs/react-transitions)

**Accessibility**
- W3C — [WCAG 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) · [WCAG 2.2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)

**Our own runtime**
- `apps/web/src/styles/themes/nebula.css:294–302` — the shipped motion tokens
- `apps/web/src/styles/nebula.css` — nine `@keyframes`, four `prefers-reduced-motion` blocks
- `docs/design/ux-v2.md` §1, §2, §3, §5.11, §5.15 · `docs/design/system/components.md:23–25, 300–312` · `docs/design/system/decisions.md` D8
- overclock-app: `packages/shell/src/renderer/store/panes.ts:101` (pane lifecycle), `packages/remote-client/src/types/protocol.ts:1` (remote statuses), `packages/remote-client/src/components/StatusDot.tsx` (today's glow), `packages/shell/src/renderer/utils/ptyOutputBus.ts` (`pane:soft`, clarify channels)
- [tauri-apps/wry](https://github.com/tauri-apps/wry) (WKWebView / WebView2 / WebKitGTK) · [xterm.js WebGL renderer](https://github.com/xtermjs/xterm.js/pull/1790)
