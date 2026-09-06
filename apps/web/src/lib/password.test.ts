import { describe, expect, it } from "vitest";
import { ABSENT_USER_HASH, hashPassword, verifyPassword } from "./password";

describe("local password hash", () => {
  it("verifies the same password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct-horse");
    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(await verifyPassword("correct-horse", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("rejects a malformed stored value without throwing", async () => {
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  });
describe("the decoy for an address with no account", () => {
    // The login verifies against this when it finds no user, and when the
    // user it finds is inactive, so those answers cost the same scrypt call
    // a real account costs. The shape is the whole point: verifyPassword
    // bails before hashing on a record it cannot parse, and a decoy that
    // bailed early would spend nothing and leave the timing gap where it was.
    it("is shaped like a record verifyPassword hashes rather than rejects", () => {
      const [algo, salt, hash] = ABSENT_USER_HASH.split(":");
      expect(algo).toBe("scrypt");
      expect(salt).toBeTruthy();
      expect(hash).toBeTruthy();
      // The key length is the check standing between the parse and the
      // compare; get it wrong and verifyPassword returns before hashing.
      expect(Buffer.from(hash as string, "hex")).toHaveLength(64);
    });

    it("matches no password", async () => {
      expect(await verifyPassword("", ABSENT_USER_HASH)).toBe(false);
      expect(await verifyPassword("hunter2", ABSENT_USER_HASH)).toBe(false);
    });

    it("costs about what a real verification costs", async () => {
      // Loose on purpose: a smoke check that the decoy path hashes at all,
      // not a benchmark. A decoy that returned early would land orders of
      // magnitude below a real hash, nowhere near this ratio. Timing is not
      // asserted tightly anywhere, because a wall-clock assertion on a shared
      // runner is a flaky test, and a flaky test in an auth path is worse
      // than none.
      const real = await hashPassword("some-password");
      const t0 = performance.now();
      await verifyPassword("some-password", real);
      const knownCost = performance.now() - t0;
      const t1 = performance.now();
      await verifyPassword("some-password", ABSENT_USER_HASH);
      const unknownCost = performance.now() - t1;
      expect(unknownCost).toBeGreaterThan(knownCost / 10);
    });
  });
});
