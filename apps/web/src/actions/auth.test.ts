import { user } from "@pilotdeck/db";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ABSENT_USER_HASH, hashPassword, verifyPassword } from "../lib/password";
import { createTestWorld, type TestWorld } from "../mcp/test-db";

let world: TestWorld;
let storedHash: string;

vi.mock("../lib/db", () => ({
  db: () => world.db,
  getDatabaseUrl: () => "pglite://test",
}));

vi.mock("../lib/password", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/password")>();
  return { ...actual, verifyPassword: vi.fn(actual.verifyPassword) };
});

const { loginAction } = await import("./auth");

const PASSWORD = "correct-horse-battery";

function credentials(email: string, password: string): FormData {
  const form = new FormData();
  form.set("email", email);
  form.set("password", password);
  return form;
}

/**
 * GHSA-rrc7-jvcm-35r5: loginAction used to short-circuit on `found` and on
 * `found.active`, so an address with no account and an address whose account
 * is switched off both answered without ever calling scrypt — about 0.4ms
 * against about 20ms for a real account on this machine. The message was
 * already generic; the clock was not, and the gap enumerated which addresses
 * have an account here and which of those are disabled.
 *
 * These assert the invariant structurally — exactly one verification per
 * failing path, and the decoy standing in when there is no hash to check
 * against — rather than by wall clock. A timing assertion on a shared CI
 * runner is flaky, and a flaky test on an auth path is worse than none; the
 * measurements live in the advisory. What a structural check buys is the
 * thing a wall-clock check would miss anyway: it fails the moment someone
 * reintroduces a `return` above the verification.
 */
describe("loginAction costs one password verification on every failing path", () => {
  beforeAll(async () => {
    world = await createTestWorld();
    storedHash = await hashPassword(PASSWORD);
    await world.db.insert(user).values([
      { email: "active@local.test", passwordHash: storedHash },
      { email: "off@local.test", passwordHash: storedHash, active: false },
    ]);
  });

  beforeEach(() => {
    vi.mocked(verifyPassword).mockClear();
  });

  it("verifies against the decoy when the address has no account", async () => {
    const result = await loginAction(
      null,
      credentials("ghost@local.test", PASSWORD),
    );

    expect(result?.error).toBeTruthy();
    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(vi.mocked(verifyPassword).mock.calls[0]?.[1]).toBe(ABSENT_USER_HASH);
  });

  it("verifies against the stored hash when the account is switched off", async () => {
    const result = await loginAction(
      null,
      credentials("off@local.test", PASSWORD),
    );

    // The password is the right one: only `active` turns this away, and it
    // has to turn it away *after* paying for the verification.
    expect(result?.error).toBeTruthy();
    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(vi.mocked(verifyPassword).mock.calls[0]?.[1]).toBe(storedHash);
  });

  it("verifies against the stored hash when the password is wrong", async () => {
    const result = await loginAction(
      null,
      credentials("active@local.test", "not-the-password"),
    );

    expect(result?.error).toBeTruthy();
    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(vi.mocked(verifyPassword).mock.calls[0]?.[1]).toBe(storedHash);
  });

  it("answers all three with the same words", async () => {
    const answers = await Promise.all([
      loginAction(null, credentials("ghost@local.test", PASSWORD)),
      loginAction(null, credentials("off@local.test", PASSWORD)),
      loginAction(null, credentials("active@local.test", "not-the-password")),
    ]);

    expect(new Set(answers.map((answer) => answer?.error)).size).toBe(1);
  });
});
