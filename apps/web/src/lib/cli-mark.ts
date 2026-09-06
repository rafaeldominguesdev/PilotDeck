/**
 * The CLI behind a card, resolved to the brand mark the app already ships
 * (AGB-66).
 *
 * The board spelled every executor out as text while Settings had been
 * drawing the real marks all along. A mark is recognised faster than a
 * string and, on a phone row, costs a fraction of the width the word does.
 *
 * The decision lives here, out of the components, because it is the part
 * worth pinning with tests: what a raw executor name resolves to, which ids
 * actually have a mark, and what shows when none does.
 */

import { EXECUTOR_CATALOG, resolveCatalogCli } from "./executors";

/**
 * Catalog ids `CliLogo` draws a faithful mark for. Kept as data next to the
 * resolver so a CLI with no mark is an answer, not a generic glyph standing
 * in for a brand it is not.
 */
const MARKED: ReadonlySet<string> = new Set(EXECUTOR_CATALOG.map((def) => def.id));

/**
 * One CLI ready to render. `id` is what `CliLogo` draws, null when the CLI
 * has no mark and the name is what shows instead. `label` is the accessible
 * name either way, so nothing is lost to a screen reader or on hover.
 */
export type CliMarkView = { id: string | null; label: string };

/** How much of an unknown CLI name a row can afford to spell. */
const NAME_MAX = 12;

/**
 * The mark for an executor name as agents actually send it: a catalog id
 * ("claude-code"), the binary name ("claude"), or something this instance
 * has never seen. Null when there is no CLI to show at all.
 */
export function readCliMark(raw: string | null | undefined): CliMarkView | null {
  const name = (raw ?? "").trim();
  if (!name) return null;
  const id = resolveCatalogCli(name);
  if (id && MARKED.has(id)) {
    const def = EXECUTOR_CATALOG.find((entry) => entry.id === id);
    return { id, label: def?.label ?? id };
  }
  return { id: null, label: shortName(name) };
}

/**
 * True when the executor that ran is a different CLI from the one the card
 * planned. Alias-aware, so "claude" claiming a card planned for
 * "claude-code" is the same CLI and not a swap worth two marks.
 */
export function cliDiffers(
  planned: string | null | undefined,
  ran: string | null | undefined,
): boolean {
  const a = readCliMark(planned);
  const b = readCliMark(ran);
  if (!a || !b) return false;
  return (a.id ?? a.label.toLowerCase()) !== (b.id ?? b.label.toLowerCase());
}

/** A name that has to share a row with a title never takes more than its share. */
function shortName(name: string): string {
  return name.length <= NAME_MAX ? name : `${name.slice(0, NAME_MAX - 1)}…`;
}
