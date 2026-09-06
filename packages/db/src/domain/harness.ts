/**
 * The harness a card planned against the one that actually ran.
 *
 * A board card has room for one value, not two lines. This folds both into a
 * single string that is short when there is nothing to report and only grows
 * when the plan and the run disagree.
 */

import { normalizeModelKey } from "./pricing";

/**
 * "sonnet-5" when the claim honoured the plan, "sonnet-5 → fable-5" when it
 * did not, and the whole path when a run switched models more than once.
 *
 * Models are printed by their normalized key, so the binary's name
 * ("claude-fable-5") and the catalog's ("fable-5") read the same and never
 * pretend to be two different models.
 */
export function harnessChain(
  planned: string | null | undefined,
  ran: readonly (string | null | undefined)[] = [],
): string | null {
  const shown: string[] = [];
  for (const model of [planned, ...ran]) {
    if (!model) continue;
    const key = normalizeModelKey(model);
    if (!key || shown.includes(key)) continue;
    shown.push(key);
  }
  return shown.length > 0 ? shown.join(" → ") : null;
}
