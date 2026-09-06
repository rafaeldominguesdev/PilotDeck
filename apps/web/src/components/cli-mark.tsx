import { readCliMark } from "../lib/cli-mark";
import { CliLogo } from "./cli-logos";

/**
 * One CLI on the board, as the mark Settings has been drawing all along
 * (AGB-66).
 *
 * The mark is the label: it carries the CLI's name as its accessible name
 * and on hover, so a screen reader reads "Claude Code" where an eye reads
 * the glyph. A CLI the app ships no mark for falls back to its short name
 * instead of a stand-in glyph, because a wrong logo says something false
 * and a name only says less.
 */
export function CliMark({ cli }: { cli: string | null | undefined }) {
  const mark = readCliMark(cli);
  if (!mark) return null;
  if (!mark.id) {
    return (
      <span className="cli-name" title={mark.label}>
        {mark.label}
      </span>
    );
  }
  return (
    <span className="cli-mark" role="img" aria-label={mark.label} title={mark.label}>
      <CliLogo id={mark.id} />
    </span>
  );
}
