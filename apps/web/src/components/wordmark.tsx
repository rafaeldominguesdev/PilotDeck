import { BRAND_ART } from "./__generated__/brandArt";

/**
 * The board's wordmark, for every header that carries one.
 *
 * It used to be an inert div: the most obvious thing to click when you want to
 * get back was the one thing that did nothing, so from Insights or Settings you
 * had to hunt for the back button. It is an anchor now, which is where the
 * pointer, the focus ring and Enter come from, instead of three behaviours
 * simulated on a div. On the board it points at the board, the least surprising
 * thing it can do there, and says so with aria-current.
 *
 * OCL-37 made the letters themselves drawn rather than typed. Styled text put
 * the identity at the mercy of whatever font the machine happened to have, and
 * it spent a second colour — `over` white, `click` mist — on a hierarchy that
 * then had to be re-picked for every theme. The mark is now one path in
 * `currentColor` at one stroke weight, so it inherits the theme's text colour
 * and reads the same in devterm and overclock; the `click` half steps back
 * on alpha alone. The art is generated (`scripts/brand-icons.mjs`) from the same
 * geometry as the favicon, so the two cannot drift.
 *
 * Nothing is fetched. Like the icon set, the mark ships inline with the page:
 * a self-hosted board behind a firewall does not ask the internet for its own
 * logo, and there is no frame where the header is missing its name.
 */
export function Wordmark({
  label,
  current = false,
  size = 24,
}: {
  /** Accessible name, which has to say where the link goes. */
  label: string;
  /** True on the board itself, where the link is already where it leads. */
  current?: boolean;
  /** Rendered font size in px. Width follows the text. */
  size?: number;
}) {
  const { trailOpacity } = BRAND_ART.wordmark;
  // The fork renders the name as text rather than the upstream's generated
  // letterforms, which still drew "overclick". `lead` carries the theme's text
  // colour; `trail` steps back on alpha alone, matching the auth screens.
  return (
    <a
      className="logo"
      href="/home"
      aria-label={label}
      aria-current={current ? "page" : undefined}
    >
      <span
        aria-hidden="true"
        style={{
          fontSize: `${size}px`,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        <span className="wordmark-lead">pilot</span>
        <span className="wordmark-trail" style={{ opacity: trailOpacity }}>
          deck
        </span>
      </span>
    </a>
  );
}

/**
 * The reduced mark, for the places a wordmark does not fit.
 *
 * It is the `o` of pilotdeck with its centre struck: a ring and a target, the
 * name said in one glyph, drawn at the wordmark's own stroke-to-diameter ratio
 * so the two are visibly the same alphabet. This is the shape the favicon set
 * is rasterised from (`apps/web/public/brand/`), which is why a tab and a
 * collapsed header show the same mark and not two cousins.
 */
export function Monogram({
  label = null,
  size = 20,
}: {
  /** Accessible name, or null where a word beside it already says this. */
  label?: string | null;
  /** Rendered height in px. The mark is square. */
  size?: number;
}) {
  const { viewBox, stroke, d, dots } = BRAND_ART.monogram;
  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : "true"}
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
      {dots.map((dot) => (
        <circle
          key={`${dot.cx},${dot.cy}`}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.r}
          fill="currentColor"
          stroke="none"
        />
      ))}
    </svg>
  );
}
