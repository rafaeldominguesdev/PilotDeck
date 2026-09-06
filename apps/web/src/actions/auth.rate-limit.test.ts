import { loginFailure, user } from "@pilotdeck/db";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_LOGIN_FAILURES } from "../lib/login-rate-limit";
import { hashPassword, verifyPassword } from "../lib/password";
import { closeTestWorld, createTestWorld, type TestWorld } from "../mcp/test-db";

let world: TestWorld;

vi.mock("../lib/db", () => ({
  db: () => world.db,
  getDatabaseUrl: () => "pglite://test",
}));

vi.mock("../lib/password", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/password")>();
  return { ...actual, verifyPassword: vi.fn(actual.verifyPassword) };
});

const redirectSpy = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectSpy(url),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: async () => new Headers(),
}));

const { loginAction } = await import("./auth");

const PASSWORD = "correct-horse-battery";

function credentials(email: string, password: string): FormData {
  const form = new FormData();
  form.set("email", email);
  form.set("password", password);
  return form;
}

/**
 * OCL-100: closing the rate limit gap left after OCL-99. Each `it` uses its
 * own email so one test's spent budget cannot bleed into the next; the
 * fixture rows are seeded once and never touched by the guessing itself.
 */
describe("loginAction rate limits failed attempts per identifier", () => {
  let storedHash: string;

  beforeEach(async () => {
    process.env.AUTH_SECRET = "s".repeat(32);
    world = await createTestWorld();
    storedHash = await hashPassword(PASSWORD);
    await world.db.insert(user).values([
      { email: "exists@local.test", passwordHash: storedHash },
    ]);
    vi.mocked(verifyPassword).mockClear();
    redirectSpy.mockClear();
  });

  afterEach(async () => {
    if (world) await closeTestWorld(world);
    delete process.env.AUTH_SECRET;
  });

  it("refuses the attempt past the budget for an email that has an account, without paying for scrypt", async () => {
    for (let i = 0; i < MAX_LOGIN_FAILURES; i++) {
      const result = await loginAction(
        null,
        credentials("exists@local.test", "wrong-password"),
      );
      expect(result?.error).toBeTruthy();
    }
    expect(verifyPassword).toHaveBeenCalledTimes(MAX_LOGIN_FAILURES);

    const overBudget = await loginAction(
      null,
      credentials("exists@local.test", "wrong-password"),
    );
    expect(overBudget?.error).toBeTruthy();
    // The refusal happened before scrypt ran again: the call count from the
    // budgeted attempts above did not grow.
    expect(verifyPassword).toHaveBeenCalledTimes(MAX_LOGIN_FAILURES);
  });

  it("refuses the same way for an email with no account at all, without paying for scrypt on the overflow attempt either", async () => {
    for (let i = 0; i < MAX_LOGIN_FAILURES; i++) {
      const result = await loginAction(
        null,
        credentials("ghost@local.test", "whatever"),
      );
      expect(result?.error).toBeTruthy();
    }
    expect(verifyPassword).toHaveBeenCalledTimes(MAX_LOGIN_FAILURES);

    const overBudget = await loginAction(
      null,
      credentials("ghost@local.test", "whatever"),
    );
    expect(overBudget?.error).toBeTruthy();
    expect(verifyPassword).toHaveBeenCalledTimes(MAX_LOGIN_FAILURES);
  });

  it("answers a real account over budget and a fake account over budget with the exact same words", async () => {
    for (let i = 0; i < MAX_LOGIN_FAILURES; i++) {
      await loginAction(null, credentials("exists@local.test", "wrong-password"));
      await loginAction(null, credentials("nobody@local.test", "whatever"));
    }

    const [realOverBudget, fakeOverBudget] = await Promise.all([
      loginAction(null, credentials("exists@local.test", "wrong-password")),
      loginAction(null, credentials("nobody@local.test", "whatever")),
    ]);

    expect(realOverBudget?.error).toBeTruthy();
    expect(fakeOverBudget?.error).toBeTruthy();
    expect(realOverBudget?.error).toBe(fakeOverBudget?.error);
  });

  it("lets a correct login through while still under budget, and clears the counter on success", async () => {
    for (let i = 0; i < MAX_LOGIN_FAILURES - 1; i++) {
      const result = await loginAction(
        null,
        credentials("exists@local.test", "wrong-password"),
      );
      expect(result?.error).toBeTruthy();
    }

    // The correct password, still inside the budget, redirects home.
    await loginAction(null, credentials("exists@local.test", PASSWORD));
    expect(redirectSpy).toHaveBeenCalledWith("/home");

    const [row] = await world.db
      .select()
      .from(loginFailure)
      .where(eq(loginFailure.id, "login-email:exists@local.test"));
    expect(row).toBeUndefined();
  });

  it("keeps one identifier's budget from blocking another's login", async () => {
    for (let i = 0; i < MAX_LOGIN_FAILURES; i++) {
      await loginAction(null, credentials("exists@local.test", "wrong-password"));
    }

    const [otherFound] = await world.db
      .select()
      .from(user)
      .where(eq(user.email, "exists@local.test"));
    expect(otherFound).toBeDefined();

    await world.db.insert(user).values({
      email: "neighbour@local.test",
      passwordHash: await hashPassword(PASSWORD),
    });

    await loginAction(null, credentials("neighbour@local.test", PASSWORD));
    expect(redirectSpy).toHaveBeenCalledWith("/home");
  });
});
