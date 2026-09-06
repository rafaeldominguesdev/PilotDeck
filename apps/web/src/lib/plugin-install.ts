/**
 * The one command that installs the PilotDeck plugin (OCL-102).
 *
 * The product built the plugin and then never offered it: onboarding and the
 * MCP tokens tab handed out the manual MCP configuration, which is the worse
 * of the two paths, and the installer stayed a thing you had to already know
 * about. These helpers are the other half of the fix, the half worth testing:
 * the exact command string the UI shows, and the arithmetic of the code that
 * makes it work without a token on screen.
 *
 * Why a pairing code and not the token: the command has to be paste-ready, and
 * a bearer token in a copy block is a bearer token on a screen that is being
 * shared. A pairing code is six digits, single use, and dead in ten minutes
 * (see lib/pairing.ts, hardened by OCL-101), so leaking it costs nothing. The
 * installer exchanges it on /api/pair and the real token never appears.
 */

/** A pairing code is six digits and nothing else. */
export const PAIRING_CODE_PATTERN = /^\d{6}$/;

export function isPairingCode(value: unknown): value is string {
  return typeof value === "string" && PAIRING_CODE_PATTERN.test(value);
}

/**
 * The command before a code exists. Same shape, same width, no code: the
 * reader learns what they are about to get instead of watching the block
 * appear from nothing.
 */
export const PAIRING_CODE_PLACEHOLDER = "••••••";

/**
 * The URL is quoted because `?` is a glob character: unquoted, a shell with a
 * matching file in the working directory would expand the argument out from
 * under the command.
 */
export function pluginInstallCommand(origin: string, code: string): string {
  return `curl -fsSL "${originBase(origin)}/install.sh?code=${code}" | sh`;
}

/** The command with the placeholder in the code's place. */
export function pluginInstallPreview(origin: string): string {
  return pluginInstallCommand(origin, PAIRING_CODE_PLACEHOLDER);
}

function originBase(origin: string): string {
  return origin.replace(/\/+$/, "");
}

/**
 * Whole seconds left on a code, never negative. `expiresAt` is the ISO string
 * the server sent; an unparseable one is treated as already gone, because the
 * failure a stale command produces is a confusing 404 in a terminal.
 */
export function pairingSecondsLeft(expiresAt: string, now: number): number {
  const at = Date.parse(expiresAt);
  if (Number.isNaN(at)) return 0;
  return Math.max(0, Math.ceil((at - now) / 1000));
}

/** `9:58`, the shape of a countdown people already read on a timer. */
export function formatPairingCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, "0")}`;
}
