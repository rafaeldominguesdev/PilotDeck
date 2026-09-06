import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scrypt(password, salt, KEYLEN)) as Buffer;
  return `scrypt:${salt}:${buf.toString("hex")}`;
}

/**
 * A well-formed record no password can match, for the branches where there
 * is no account to check against. Verifying against it costs the same scrypt
 * call a real account costs, so the answer takes the same time either way.
 *
 * It has to stay well formed: verifyPassword returns early on a record it
 * cannot parse, and an early return here would spend nothing and leave the
 * gap exactly where it was. The tests hold it to that shape.
 */
export const ABSENT_USER_HASH = `scrypt:${"0".repeat(32)}:${"0".repeat(
  KEYLEN * 2,
)}`;

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const buf = (await scrypt(password, salt, KEYLEN)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== buf.length) return false;
  return timingSafeEqual(expected, buf);
}
