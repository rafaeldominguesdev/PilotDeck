import { describe, expect, it } from "vitest";
import { createPairingCode, exchangePairingCode } from "../lib/pairing";
import { createRealPostgresWorld } from "./test-db-postgres";

/**
 * The regression pairing.integration.test.ts could not catch on its own
 * (OCL-109): that suite runs on PGlite, which accepts a `Date` bound into
 * `sql`. Production runs postgres-js, which refuses it, so every real
 * pairing answered 500 while the PGlite suite stayed green. This file runs
 * the same exchange against the driver production actually uses, which is
 * the only thing that can catch this class of bug again.
 *
 * Skipped without DATABASE_URL (no real Postgres to talk to) — the CI job
 * sets it against the postgres service; nothing local changes.
 */
describe.skipIf(!process.env.DATABASE_URL)(
  "one-time token pairing against real postgres-js (OCL-109 regression)",
  () => {
    it("exchanges a 6-digit code for a working bearer token without a driver error", async () => {
      const world = await createRealPostgresWorld();
      try {
        const created = await createPairingCode(world.db, {
          workspaceId: world.workspaceId,
          label: "paired via code",
        });

        // Before the OCL-109 fix this threw inside postgres-js — the driver
        // rejected the Date bound into spendAttemptStatement's sql — and the
        // route answered 500 instead of ever reaching this result.
        const exchanged = await exchangePairingCode(world.db, created.code);
        expect(exchanged.ok).toBe(true);
        if (!exchanged.ok) return;
        expect(exchanged.label).toBe("paired via code");
      } finally {
        await world.close();
      }
    }, 60_000);

    it("spends the failure budget on real postgres-js without a driver error", async () => {
      const world = await createRealPostgresWorld();
      try {
        const created = await createPairingCode(world.db, {
          workspaceId: world.workspaceId,
          label: "paired via code",
        });

        // A wrong guess also runs spendAttemptStatement — the exact path
        // that crashed the driver pre-fix — so this must not throw either.
        const wrong = await exchangePairingCode(world.db, "000000");
        expect(wrong.ok).toBe(false);

        const right = await exchangePairingCode(world.db, created.code);
        expect(right.ok).toBe(true);
      } finally {
        await world.close();
      }
    }, 60_000);
  },
);
