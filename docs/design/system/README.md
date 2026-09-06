# PilotDeck design system

> OCL-81. The canonical visual library of the board. The
> [doctrine](../ux-v2.md) decides *why* (direction, tokens, kill list); this
> directory decides *exactly how* every component looks and behaves, so the
> application cards (phase B/C) can apply it without making a single visual
> decision.

| File | What it owns |
|---|---|
| [`components.md`](./components.md) | The normative inventory: button, control, select/dropdown, form field, chip/badge, table, popover/menu, empty state, toast, loading. Exact tokens, sizes and states per component. |
| [`components.html`](./components.html) | The same inventory rendered against the real theme files. Open it in a browser to review every state. |
| [`composition.md`](./composition.md) | Grid, containers, spacing and typographic hierarchy by context. |
| [`microcopy.md`](./microcopy.md) | The default words for empty, error and loading states, in the product voice (direct, no enthusiasm, no em-dash), en + pt-BR. |
| [`decisions.md`](./decisions.md) | What the doctrine did not cover and what the system decided, with rationale. |

## Rules of use

1. **Tokens only.** No hex/rgba literal in any component rule (doctrine §5.1).
2. **The spec is the floor and the ceiling.** If a screen needs something the
   inventory does not cover, amend the system; do not improvise locally.
3. **States are not optional.** rest, hover, focus, active/open, disabled —
   a component ships all of them.
4. The exemplar page links the real theme files
   (`apps/web/src/styles/themes/*.css`) directly, so what it renders is what
   the board draws. If a token value changes, the page changes with it.
