# Components — the normative inventory

> OCL-81. One canonical spec per component. Application cards (phase B/C) implement
> these specs **to the letter**: every value below is either a token reference or an
> exact number, and nothing is left to taste. If a screen needs something this
> inventory does not cover, the answer is an amendment here, never a local
> improvisation.
>
> Doctrine first: [`../ux-v2.md`](../ux-v2.md) owns direction, tokens and the
> kill list. This file owns component anatomy. Where a spec restates the doctrine
> (the Control, focus, z-rungs), the doctrine wording wins.
>
> Live exemplar: open [`components.html`](./components.html) — every spec below
> renders there against the real theme files.

## Reading a spec

- `token` → use the custom property, never the literal (`var(--oc-border)`).
- `32px` → an exact value of the spec; it is the same in every theme.
- States are listed in the order they layer: rest → hover → focus → open/active →
  disabled. Every interactive element ships all of them; a component without a
  focus style is unfinished.
- Transitions are always `var(--oc-duration-micro)` (200ms) with
  `var(--oc-ease-atmosphere)`, on `background-color, border-color, color` only.
  No transforms on hover (doctrine §5.11).

## Type and space shorthand

The UI scale (decision D1 in [`decisions.md`](./decisions.md)):

| Name | Size / weight / face | Use |
|---|---|---|
| display | 22px / 600 / UI | page titles (non-board pages) |
| title | 16px / 600 / UI | section titles, modal titles |
| body | 13px / 400 / UI | default text, control labels |
| label | 12px / 500 / UI | field labels, meta lines |
| data | 11px / 400 / data face | ids, counts, money, timestamps, code |
| caption | 11px / 600 / UI, uppercase, tracking `var(--oc-tracking-wide)`, `--oc-text-3` | table headers, modal section titles, group labels |

Weights are 400/500/600 only (doctrine §2). Spacing is always a
`--oc-space-*` step: 4 / 8 / 12 / 16 / 24 / 32 / 48.

---

## 1. Button

One button anatomy, four variants, two sizes. Replaces today's `.btn-new`,
`.d-btn-pri`, `.btn-next`, `.btn-ghost`, `.d-btn-sec`, `.btn-back`, `.btn-rev`.

```
height 32px (lg: 40px) · padding 0 var(--oc-space-3) (lg: 0 var(--oc-space-4))
radius var(--oc-radius-control) · font body 13px/500 --oc-font-ui
gap var(--oc-space-2) between icon (14px SVG, stroke 1.5) and label
```

| Variant | bg | border | text |
|---|---|---|---|
| primary | `var(--oc-btn-light-bg)` | none | `var(--oc-btn-light-text)` |
| secondary | transparent | 1px `var(--oc-border)` | `--oc-text-2` |
| ghost | transparent | none | `--oc-text-3` |
| danger | transparent | 1px `rgb(var(--oc-danger-rgb) / 0.4)` | `var(--oc-danger)` |

States:

- **hover** — primary: `filter: brightness(0.92)`; secondary: bg
  `var(--oc-surface-hover)`, border `var(--oc-border-strong)`, text-1; ghost:
  text-1; danger: bg `rgb(var(--oc-danger-rgb) / 0.08)`, border
  `rgb(var(--oc-danger-rgb) / 0.6)`.
- **focus** — `box-shadow: var(--oc-focus-ring-offset)` on `:focus-visible`.
  Danger uses the same ring; the red focus ring of the old `.btn-rev` dies.
- **active (pressed)** — primary `brightness(0.85)`; others bg
  `var(--oc-surface-on)`.
- **disabled** — `opacity: 0.45`, `cursor: not-allowed`, no hover change.
- Touch: below 768px the hit area grows to `var(--oc-tap)` via padding; the
  visual height stays 32px.

Rules: primary is the only solid fill, and there is at most one per view. No
pills (xai kills `--oc-radius-pill`; nebula keeps it as theme value), no glow,
no translate.

## 2. The Control (bar trigger)

Adopted verbatim from doctrine §3: every trigger in the bars (project, mission,
Filtros, limpar, mover, account) is the same 32px control; the active-filter
count is the 18px accent count badge (§5.3 below). Nothing in a bar is bare
text. Minimum `--oc-space-4` between the wordmark block and the first control.

## 3. Select and dropdown

Two components, one look. The **select** is the native `<select>` for forms and
tables (fast, keyboard-complete). The **dropdown** is the custom popover
listbox for anything grouped, annotated or disabled-rich (harness pickers).

### 3.1 Select (native)

```
height 32px · padding 0 calc(var(--oc-space-3) + 14px) 0 var(--oc-space-3)
radius var(--oc-radius-control) · bg var(--oc-surface-input)
border 1px var(--oc-border) · font body 13px --oc-font-ui · color --oc-text-1
chevron: 14px SVG stroke 1.5, --oc-text-3, right var(--oc-space-3)
```

- hover → border `var(--oc-border-strong)`; focus → border-strong +
  `var(--oc-focus-ring-offset)`; disabled → text-3, `cursor: not-allowed`,
  bg `var(--oc-surface-subtle)`.
- Options render on `var(--oc-surface-3)` (the UA menu inherits dark paint; the
  old per-option background override stays).
- Replaces `.sel`, `.filter-chip select`, `.ml-status`, `.d-mission`,
  `.mission-editor select` — four heights and three radii die.

### 3.2 Dropdown (custom, groupable)

Trigger: the Control (§2). Panel: the popover anatomy (§7) with
`role="listbox"`, options `role="option"`.

- **Option row**: height 32px, padding `0 var(--oc-space-3)`, body 13px
  text-2, radius `var(--oc-radius-control)`. Hover/keyboard-active: bg
  `var(--oc-surface-hover)`, text-1. Selected: text-1, 14px check icon left,
  and the label column indents so text aligns with unselected rows.
- **Group header** (the CLI grouping — owner's finding): caption style, height
  28px, padding `0 var(--oc-space-3)`, `display: flex; align-items: end`, a
  1px `var(--oc-divider)` above every group except the first, with
  `var(--oc-space-2)` of air around it. Groups are `<optgroup>` in the native
  select and a presentational row (`aria-hidden` + `aria-labelledby` on the
  group) in the custom one.
- **Disabled option** (model fell off the catalog, CLI not enabled): label in
  `--oc-text-3` at full opacity, reason suffix in data 11px text-3 after an
  interpunct (`gpt-5.5 · not installed`), `aria-disabled="true"`, no hover
  fill, `cursor: default`. A disabled option is **shown, annotated and
  unselectable** — never silently removed, never the old `.sel.orphan`
  warn-border selectable state (decision D4).
- A selected value that later becomes disabled keeps showing in the trigger
  with the same annotation; the trigger itself never lies about what is
  configured.

## 4. Form field

```
field: display grid · gap var(--oc-space-2)
label: label 12px/500 --oc-text-2 · optional marker "optional" in data 11px --oc-text-3
input: height 36px · padding 0 var(--oc-space-3) · radius var(--oc-radius-control)
       bg var(--oc-surface-input) · border 1px var(--oc-border)
       font body 13px --oc-text-1 · placeholder --oc-text-3
hint:  label 12px --oc-text-3
error: label 12px var(--oc-danger) · input border rgb(var(--oc-danger-rgb) / 0.4)
```

- focus → border `var(--oc-border-strong)` + `var(--oc-focus-ring-offset)`.
- disabled → text-3, bg `var(--oc-surface-subtle)`.
- `textarea`: same box, padding `var(--oc-space-2) var(--oc-space-3)`,
  `min-height` 3 lines of 1.5em.
- Code/id fields add `font-family: var(--oc-font-data)` at data 11px (the
  `.input.mono` role survives; mono stays a data voice).
- Inline validation lives under the field as hint/error text with
  `role="status"`; there is no toast for form errors.
- Replaces the per-context reinventions (`mf-create`, `mission-editor`,
  `policy`, `exec-add`, `project-context .editor`).

## 5. Chip, tag, badge

One container, three roles, plus the death of colored type badges.

### 5.1 Chip (filter/status token)

```
height 22px · padding 0 var(--oc-space-2) · radius var(--oc-radius-control)
border 1px var(--oc-border) · bg transparent · font label 12px/500 --oc-text-2
gap var(--oc-space-1) · icon or 7px status dot 14px/7px
```

- hover (when clickable) → bg `var(--oc-surface-hover)`, border-strong, text-1.
- active/applied → text-1, border-strong, count badge attached (5.3).
- **disabled chip**: border `1px dashed var(--oc-border)`, text-3, no hover,
  `cursor: default`. Dashed is the one border style reserved for "present but
  not operative" (it is also the empty-state border; both mean "nothing here
  yet").
- Status chips use the 7px dot in `var(--oc-ok)` / `var(--oc-danger)` and
  neutral text; the dot is the only colored element.

### 5.2 Type as a word

`bug` / `feature` / `rfc` are **plain text words** in the meta line (data 11px
text-3), never a colored chip (doctrine kill list). The one scanning aid is
the 3px left border in `rgb(var(--oc-danger-rgb) / 0.4)` on bug cards.

### 5.3 Count badge

```
min-width 18px · height 18px · padding 0 5px · radius 9px
bg var(--oc-accent) · color var(--oc-accent-contrast)
font data 11px/600 · tabular-nums
```

The inverted badge exists only for counts riding on a control. Everything else
that wants to say "N" says it as a text-3 data word next to the label.

## 6. Table

One table for Insights and settings policy.

```
container: horizontal scroll with edge shadows below 700px, no page-level scroll
th: caption style · text-align left · padding 0 var(--oc-space-3) var(--oc-space-2) 0
td: body 13px --oc-text-1 · padding var(--oc-space-2) var(--oc-space-3) var(--oc-space-2) 0
row: border-top 1px var(--oc-divider) · no zebra
numbers: data 11px, tabular-nums, text-align right
```

- hover row → bg `var(--oc-surface-hover)` (200ms).
- Sortable header → the caption becomes a button, same style, with a 10px
  caret in text-3 that flips on direction; active sort column is text-2.
- Truncation: `ellipsis` + full text in `title`; a table never grows a
  horizontal page scrollbar.
- Editable cells (policy): the control inside a cell is the 32px select (§3.1)
  or a 32px ghost button; the row height does not change when the control
  mounts.
- Sticky header when the table scrolls: th on `var(--oc-bg)` with the divider
  under it.

## 7. Popover and menu

One floating anatomy for dropdowns, menus and filter panels.

```
panel: bg var(--oc-panel-bg) · border 1px var(--oc-border)
       radius var(--oc-radius-panel) · box-shadow var(--oc-shadow-panel)
       padding var(--oc-space-2) · offset 6px below the trigger
       min-width 240px · max-width min(320px, calc(100vw - var(--oc-space-8)))
item: height 32px · padding 0 var(--oc-space-3) · radius var(--oc-radius-control)
      body 13px --oc-text-2 · gap var(--oc-space-2)
section title: caption style · padding var(--oc-space-2) var(--oc-space-3) var(--oc-space-1)
separator: 1px var(--oc-divider) · margin var(--oc-space-2) 0
```

- item hover/active → bg `var(--oc-surface-hover)`, text-1; selected → check
  14px + text-1 (listbox) or bg `var(--oc-surface-on)` (single-choice menus).
- destructive item → `var(--oc-danger)` text, hover bg
  `rgb(var(--oc-danger-rgb) / 0.08)`.
- z-rung: a panel hanging off a bar control is `--oc-z-panel`; a detached menu
  (account, overflow) is `--oc-z-menu` (doctrine §2 layers; rule 1 applies:
  the bar states `--oc-z-chrome` in its base rule).
- Role by content: actions → `role="menu"`/`menuitem`; choosing a value →
  `role="listbox"`/`option`; a panel with forms → `role="dialog"` with a
  labelled heading. One shared close behavior (Escape + click-away + focus
  return to the trigger) — today each popover re-implements it; phase B
  extracts one hook.
- Panels that flip open on phone become the sheet: full-width,
  `--oc-z-backdrop` scrim under `--oc-z-sheet`.

## 8. Empty state

Two sizes; copy comes from [`microcopy.md`](./microcopy.md).

### 8.1 Inline (a column, a list section)

```
border 1px dashed var(--oc-border-dashed) · radius var(--oc-radius-panel)
padding var(--oc-space-6) var(--oc-space-4) · text-align center
icon: 20px SVG, --oc-text-3, margin-bottom var(--oc-space-2)
text: label 12px --oc-text-3 · full sentence in title when truncated
```

### 8.2 Block (a whole page or panel)

```
padding var(--oc-space-9) var(--oc-space-6) · text-align center · max-width 560px
icon: 28px SVG, --oc-text-3
title: title 16px/600 --oc-text-1
body: body 13px --oc-text-2 · line-height 1.55
action (optional): one secondary button, margin-top var(--oc-space-4)
```

Rules: the empty state names what the region is for and how it fills, never
just "nothing here". One action at most. No illustration, no color.

## 9. Toast

New component (the board has none today; feedback is inline text). For
transient confirmation of an action that happened elsewhere (card created,
mission moved, copy succeeded).

```
position: fixed bottom var(--oc-space-6) right var(--oc-space-6) · width 320px
stack: newest on top, gap var(--oc-space-2)
box: bg var(--oc-panel-bg) · border 1px var(--oc-border)
     radius var(--oc-radius-panel) · box-shadow var(--oc-shadow-panel)
     padding var(--oc-space-3) var(--oc-space-4)
icon: 14px SVG — check (ok), alert (danger), info (text-3)
title: body 13px/500 --oc-text-1 · body: label 12px --oc-text-2
action (optional): text button, body 13px/500 --oc-text-1, underline on hover
```

- Status color appears only on the icon: `var(--oc-ok)` / `var(--oc-danger)`.
- Auto-dismiss 5s, pauses on hover; error toasts persist until dismissed.
- `role="status"` (`role="alert"` for errors), one polite live region.
- z-rung: above the sheet — proposed `--oc-z-toast: 70`, pending the doctrine
  amendment recorded as decision D7. Until then the exemplar uses a local var.
- Never for form validation (inline error, §4) and never for loading (§10).

## 10. Loading

- **Region loading** (a table, a column, a detail panel): skeleton rows —
  bars of `var(--oc-surface-subtle)`, radius `var(--oc-radius-control-sm)`,
  heights matching the content they replace (13px text line, 18px badge),
  pulsing opacity 1 → 0.5 on `var(--oc-duration-blink)`. Under
  `prefers-reduced-motion` the pulse is off and the bars sit still.
- **Inline loading** (a button, a stat): the label stays and gets
  `opacity: 0.5` + `aria-busy="true"`; no spinners. The one exception is a
  blocking action longer than ~1s, which swaps the label for the loading
  microcopy.
- No spinner component exists in the system. If a screen wants one, that is
  an amendment conversation, not a local `<div class="spinner">`.
