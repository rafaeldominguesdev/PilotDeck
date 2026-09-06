import { describe, expect, it } from "vitest";
import { generateTokenSecret, hashToken } from "./token";

describe("MCP token hashing", () => {
  it("hashes a bearer secret with sha256 hex", () => {
    const secret = "ocb_test_secret";
    const hash = hashToken(secret);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashToken(secret));
    expect(hash).not.toBe(hashToken("ocb_other"));
  });

  it("generates an ocb_ secret that is not the stored hash", () => {
    const secret = generateTokenSecret();
    expect(secret.startsWith("ocb_")).toBe(true);
    expect(hashToken(secret)).not.toBe(secret);
    expect(generateTokenSecret()).not.toBe(secret);
  });
});
