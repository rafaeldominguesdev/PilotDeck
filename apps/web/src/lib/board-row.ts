/**
 * What a card keeps when it is reduced to one row (AGB-64).
 *
 * On a phone the board is for scanning what exists, so a row spends its width
 * on the title and gives the rest away: one letter for the type, the short id,
 * and a single number at the edge. Everything the card used to spell out on
 * its second and third lines, the harness, the reviewer, the whole telemetry,
 * is one tap away in the detail panel.
 *
 * Both decisions live here, out of the component, because they are the part
 * worth pinning with tests: which number survives, and which letter stands for
 * the type.
 */

export type RowNumberKind = "cost" | "tokens" | "duration";

export type RowNumber = { kind: RowNumberKind; text: string };

/** The shape the board's telemetry line already has, taken structurally. */
type Segment = { kind: string; text: string };

// Money first, then volume, then time. A row has space for exactly one number,
// and the one people scan a delivered card for is what it cost; without a
// price the honest second best is how much it burned, and the clock last.
const ORDER: RowNumberKind[] = ["cost", "tokens", "duration"];

/**
 * The one number a row shows, or null when the card has none.
 *
 * `elapsed` is the running card's clock, which never reaches the telemetry
 * line: while a card is still executing, how long it has been at it is the
 * only number there is.
 */
export function pickRowNumber(
  segments: Segment[],
  elapsed: string | null,
): RowNumber | null {
  for (const kind of ORDER) {
    const hit = segments.find((segment) => segment.kind === kind);
    if (hit) return { kind, text: hit.text };
  }
  if (elapsed) return { kind: "duration", text: elapsed };
  return null;
}

/**
 * The type as a single letter: F, B, R. The full chip costs a fifth of a
 * narrow screen and says what one character already says, and the letter is
 * the first of the type's own name, so it needs no translation of its own.
 */
export function typeInitial(tipo: string): string {
  return tipo.slice(0, 1).toUpperCase();
}
