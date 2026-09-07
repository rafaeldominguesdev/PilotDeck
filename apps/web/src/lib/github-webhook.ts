import { createHmac, timingSafeEqual } from "node:crypto";

export const GITHUB_WEBHOOK_SECRET_ENV = "GITHUB_WEBHOOK_SECRET";

/** Verify GitHub's SHA-256 signature against the unparsed request body. */
export function hasValidGitHubSignature(
  rawBody: string,
  signature: string | null,
  secret = process.env[GITHUB_WEBHOOK_SECRET_ENV],
): boolean {
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = Buffer.from(
    `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`,
    "utf8",
  );
  const received = Buffer.from(signature, "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
