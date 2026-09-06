# pilotdeck — the mark

> The identity half of [`ux-v2.md`](./ux-v2.md). That document owns the interface;
> this one owns the logo. Where they disagree, the doctrine wins.

The mark is **monochrome by construction**. There is no brand colour, no colour
variant, and no second file for dark mode: the wordmark takes `currentColor`, so
it is whatever colour the text around it is, in `nebula`, in `xai`, in
`overclock`, and in any theme that comes after them.

---

## The set

| File | What it is | Where it is used |
|---|---|---|
| `apps/web/public/brand/wordmark.svg` | The full lockup, "pilotdeck" | Headers, docs, anywhere with room |
| `apps/web/public/brand/monogram.svg` | The reduced mark, ring + centre | Tight spaces, avatars, collapsed bars |
| `apps/web/public/brand/favicon.svg` | The monogram, with the two values a browser tab needs | `<link rel="icon">` |
| `apps/web/public/brand/icon-32.png` | 32px raster fallback, white on the near-black tile | `<link rel="icon">` for clients that refuse SVG |
| `apps/web/public/brand/apple-touch-icon-180.png` | 180px square, no rounding — iOS masks it itself | `<link rel="apple-touch-icon">` |

In the app you do not reach for these files. Use the components:

```tsx
import { Monogram, Wordmark } from "@/components/wordmark";

<Wordmark label={t.board.homeLink} current />   // the lockup, a link home
<Wordmark label="…" size={22} />                // size = rendered height in px
<Monogram size={20} />                          // the reduced mark
```

They inline the art, like the icon set does: a self-hosted board behind a
firewall never asks the internet for its own logo, and there is no first frame
where the header has no name in it.

---

## How it is built

Monoline geometric lowercase on a 20-unit ink height: one stroke weight (2
units), round caps and joins, round letters built from the same 12-unit circle.
Ascenders reach 18, the x-height is 12. Nothing in the alphabet is heavier than
anything else in it — hierarchy in this system comes from weight and size, never
from hue, and the wordmark obeys the same rule the interface does.

**"over" leads, "click" follows, and the only difference between them is alpha**
(0.55). The old wordmark spent a second colour on that hierarchy — `over` white,
`click` mist — which is exactly the thing that has to be re-picked every time a
theme changes. Alpha survives the theme.

The reduced mark is the `o` of pilotdeck with its centre struck: a ring and a
target, at the wordmark's own 1:6 stroke-to-diameter ratio, so the two read as
the same alphabet rather than as a logo and its unrelated cousin.

### Regenerating

Everything above comes out of one generator, from one set of coordinates:

```bash
node scripts/brand-icons.mjs              # rewrite every brand asset
node scripts/brand-icons.mjs --preview    # + large proof sheets in /tmp
```

It writes the SVG sources, both PNGs, and
`apps/web/src/components/__generated__/brandArt.ts` — the path data the React
components inline. It has no dependencies: the rasteriser is analytic and the
PNG is written on `node:zlib`, because a brand pipeline that needs a toolchain
installed is a brand pipeline that stops being run.

**Edit the geometry in the script, never an output.** `wordmark.test.ts` asserts
that the components and the files on disk carry the same curves, so a hand-edited
SVG fails the suite instead of quietly forking the identity.

---

## Do

- **Let it inherit.** Put the mark inside something with the colour you want and
  leave it alone. That is the whole colour system.
- **Size it by height.** `size` is the rendered height in px; the width follows
  the ratio. 16px in a bar, 22–28px on a title screen.
- **Give it air.** Minimum clear space on every side is the height of the `o` —
  half the mark's own height. The doctrine sets the specific floor in a bar:
  ≥16px between the wordmark and the first control (`ux-v2.md` §5, item 4).
- **Drop to the monogram when the lockup does not fit.** A cramped wordmark is
  worse than no wordmark; the reduced mark exists for exactly that.
- **Use the PNGs only where a raster is required** — the tab fallback and the
  touch icon. Everywhere else the SVG is smaller and sharper.

## Don't

- **Never colour it.** No brand blue, no gradient, no accent fill, no second
  colour inside the mark. If you are reaching for a hex value on the logo, the
  answer is a different `currentColor` on its container.
- **Never stretch it.** Set one dimension and let the other follow. Never set
  `width` and `height` independently, never `transform: scale()` on one axis.
- **Never rebuild the hierarchy with colour.** `over`/`click` differ by alpha.
  Do not re-introduce two text colours, two weights, or two fonts.
- **Never re-type it.** "pilotdeck" written in whatever font is at hand is not
  the wordmark; it is a different logo that happens to say the same word.
- **Never re-space, re-kern or rearrange the letters.** The sidebearings are
  hand-set optical corrections, not a formula to redo.
- **Never add effects.** No glow, no drop shadow, no outline, no bevel. The
  doctrine took coloured glows out of the interface; the mark does not get to
  keep them.
- **Never put it on a busy or mid-tone background.** It needs contrast, not a
  plate behind it. The one exception is the PNG set, which carries the near-black
  tile because a browser tab paints on a background we do not control.
- **Never hand-edit `public/brand/*` or `__generated__/brandArt.ts`.** Change
  `scripts/brand-icons.mjs` and regenerate.
