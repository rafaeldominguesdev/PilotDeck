import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hasValidGitHubSignature } from "./github-webhook";

const body = JSON.stringify({ action: "published" });
const secret = "test-webhook-secret";
const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

describe("GitHub webhook signature", () => {
  it("accepts a valid signature", () => {
    expect(hasValidGitHubSignature(body, signature, secret)).toBe(true);
  });

  it("rejects an invalid signature", () => {
    expect(hasValidGitHubSignature(body, "sha256=invalid", secret)).toBe(false);
  });

  it("rejects when the secret is not configured", () => {
    expect(hasValidGitHubSignature(body, signature, undefined)).toBe(false);
  });
});
