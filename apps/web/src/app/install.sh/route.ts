import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isPairingCode } from "../../lib/plugin-install";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readInstaller() {
  return readFile(
    /* turbopackIgnore: true */ resolve(process.cwd(), "../../install.sh"),
    "utf8",
  );
}

/**
 * A host we are willing to write into a shell script. Everything here ends up
 * inside double quotes in bash, so the danger is not an odd hostname, it is a
 * quote or a `$` or a backtick in one. The set below is what a host can
 * legally contain (name, port, bracketed IPv6) and nothing that can end a
 * string or start a substitution; anything else means we serve the plain
 * installer and let it ask.
 */
const SAFE_HOST = /^[A-Za-z0-9.\-_:[\]]+$/;

function instanceUrl(request: Request): string | null {
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (!SAFE_HOST.test(host)) return null;
  // A TLS instance sits behind a proxy that terminates it, so the scheme comes
  // from the forwarded header; the local case is the only one that is http.
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const proto =
    forwarded === "http" || forwarded === "https"
      ? forwarded
      : host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https";
  return `${proto}://${host}`;
}

/**
 * The installer, with the instance and a one-time pairing code already
 * answered.
 *
 * The two values go in as defaults, not as assignments: an operator who
 * exports PILOTDECK_INSTANCE_URL or PILOTDECK_TOKEN still wins, and the
 * script's own prompts still run when neither exists. They are inserted after
 * the shebang rather than before it, so a saved copy stays executable.
 */
function withPairing(script: string, url: string, code: string): string {
  const preamble = [
    "",
    "# pilotdeck: this copy was served with a one-time pairing code.",
    "# The code is six digits, single use, and expires in ten minutes. It is not",
    "# a token: install.sh trades it on /api/pair for the real one and never",
    "# prints either. An exported PILOTDECK_TOKEN still takes precedence.",
    `PILOTDECK_INSTANCE_URL="\${PILOTDECK_INSTANCE_URL:-${url}}"`,
    `PILOTDECK_PAIRING_CODE="\${PILOTDECK_PAIRING_CODE:-${code}}"`,
    "export PILOTDECK_INSTANCE_URL PILOTDECK_PAIRING_CODE",
  ];
  const lines = script.split("\n");
  const at = lines[0]?.startsWith("#!") ? 1 : 0;
  return [...lines.slice(0, at), ...preamble, ...lines.slice(at)].join("\n");
}

export async function GET(request: Request) {
  const script = await readInstaller();
  const code = new URL(request.url).searchParams.get("code");
  const url = isPairingCode(code) ? instanceUrl(request) : null;
  const body = url === null || !isPairingCode(code)
    ? script
    : withPairing(script, url, code);

  return new Response(body, {
    headers: {
      // A pairing code is single use: a proxy holding this response for five
      // minutes would serve a spent code to the next person who asks.
      "Cache-Control": url === null ? "public, max-age=300" : "no-store, private",
      "Content-Disposition": 'inline; filename="install.sh"',
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
