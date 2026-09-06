# Composition — grid, air, hierarchy

> OCL-81. How components assemble into screens. Every rule is tied to tokens;
> the exemplar layouts in [`components.html`](./components.html) demonstrate them.

## Spacing

Only `--oc-space-*` steps: 4 / 8 / 12 / 16 / 24 / 32 / 48. No arbitrary margins.

- Inside a component: 1–2 (icon gaps, label-to-field).
- Between sibling components: 2–3.
- Between sections: 6–8.
- Page-level air (hero to content, block empty states): 9.

Density is bought with padding and type size, never by shrinking targets:
the 44px floor (`--oc-tap`) is law below 768px (doctrine §1).

## Containers

| Surface | Width | Padding |
|---|---|---|
| Board | fluid, column gutter `var(--oc-space-6)` (48px before the discarded group) | page padding `var(--oc-space-6)` |
| Data pages (Insights) | max 1320px | `var(--oc-space-6)` |
| Form pages (settings, editors) | max 720px | `var(--oc-space-6)` |
| Reading blocks (docs, about) | max 560px (`--oc-measure`) | — |
| Modal | doctrine §3: main 1fr / rail 300px, padding `var(--oc-space-6)` | — |

One container decision per page type, named here; a page never invents its own
max-width (today settings, insights and the context editor each picked one —
decision D6).

## Typographic hierarchy by context

Hierarchy is size and weight of one face; color never carries it
(doctrine §1). The named contexts:

| Context | Style |
|---|---|
| Page title (non-board pages) | display 22px/600, text-1 |
| Section title | title 16px/600, text-1 |
| Sub-section / panel heading | caption 11px/600 uppercase, text-3 |
| Body | body 13px/400, text-1 |
| Secondary body | body 13px/400, text-2 |
| Meta (ids, timestamps, counts) | data 11px/400, text-3, data face |
| Money | data face, 600, text-1 — the only number allowed to lead (doctrine §4) |
| Field label | label 12px/500, text-2 |

Two adjacent levels differ by exactly one step. A screen with three sizes in
the same band is a bug (today's chips alone span 8.5–11px in five steps).

## Alignment rules

- Numbers right-align to numbers; text left-aligns to text. A column never
  centers.
- Icons sit on the text baseline grid: 14px icons with 13px body, 20px with
  titles.
- One optical axis per region: in a bar, everything aligns to the 32px control
  row; in a card, to the 24px padding box.
- Dividers are `1px var(--oc-divider)`, used between sections, never inside a
  component.

## Responsive

The board's breakpoints are the doctrine's: 1100px (topbar folds), 768px
(sheets, one-column), and verification happens at 1440 / 1100 / 900 / 700px
(mission convention). Layout changes at breakpoints are reflows (stack,
collapse to sheet), never rescaled type and never hidden functionality. No
horizontal scroll at any width in any theme (doctrine §5.13).
