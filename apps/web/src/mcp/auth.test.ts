import { afterEach, describe, expect, it } from "vitest";
import { authenticateBearer } from "./auth";
import { closeTestWorld, createTestWorld, type TestWorld } from "./test-db";

describe("MCP bearer auth", () => {
  let world: TestWorld;

  afterEach(async () => {
    if (world) await closeTestWorld(world);
  });

  it("resolves workspace from a live token hash", async () => {
    world = await createTestWorld();
    const result = await authenticateBearer(world.db, `Bearer ${world.secret}`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ctx.workspaceId).toBe(world.workspaceId);
    expect(result.ctx.tokenId).toBe(world.tokenId);
    // A plain worker token cannot write the workspace config.
    expect(result.ctx.canManage).toBe(false);
  });

  it("carries the manage flag of a token that has it", async () => {
    world = await createTestWorld();
    const result = await authenticateBearer(
      world.db,
      `Bearer ${world.manageSecret}`,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ctx.tokenId).toBe(world.manageTokenId);
    expect(result.ctx.canManage).toBe(true);
  });

  it("rejects a missing Authorization header", async () => {
    world = await createTestWorld();
    const result = await authenticateBearer(world.db, null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("TOKEN_MISSING");
    expect(result.status).toBe(401);
  });

  it("rejects an unknown token", async () => {
    world = await createTestWorld();
    const result = await authenticateBearer(world.db, "Bearer ocb_no_such_token");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UNAUTHORIZED");
    expect(result.status).toBe(401);
  });

  it("rejects a revoked token with 401", async () => {
    world = await createTestWorld();
    const result = await authenticateBearer(
      world.db,
      `Bearer ${world.revokedSecret}`,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("TOKEN_REVOKED");
    expect(result.status).toBe(401);
  });
});
