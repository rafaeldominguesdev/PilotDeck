/**
 * What counts as a release (OCL-128).
 *
 * `resolved_in` names the version a card shipped in. A card delivered with a
 * branch name there ("ovka-78-bug-...-f@68218bba") made that branch an option
 * on the board's RELEASE filter, sitting next to v0.2.2 with a count of zero.
 * The delivery already has a `branch` field and a `commit` field; this one is
 * for the release, so the shape is checked where it is written and where it
 * is offered.
 *
 * Deliberately a little wider than the tags this repo cuts: a two-part series
 * ("1.2") and a pre-release or build suffix ("v1.0.0-rc.1") are versions too.
 * What it refuses is everything that is not a numeric series — branches,
 * commit hashes and free text.
 */
export const RELEASE_VERSION_PATTERN =
  /^v?\d+\.\d+(\.\d+)*([-+][0-9A-Za-z.-]+)?$/;

export function isReleaseVersion(value: string | null | undefined): boolean {
  return typeof value === "string" && RELEASE_VERSION_PATTERN.test(value.trim());
}
