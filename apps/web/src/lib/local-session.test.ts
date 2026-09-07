import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const world = vi.hoisted(() => ({
  users: [] as Array<{
    id: string;
    email: string;
    active: boolean;
    sessionVersion: number;
  }>,
}));

vi.mock("./db", () => ({
  db: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => world.users,
        }),
      }),
    }),
  }),
}));

import { DEPLOY_MODE_ENV } from "./deploy-mode";
import { OPEN_ENV, isOpenInstance, localSession } from "./local-session";

const OWNER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "eu@local.invalid",
  active: true,
  sessionVersion: 1,
};

describe("isOpenInstance", () => {
  afterEach(() => {
    delete process.env[OPEN_ENV];
    delete process.env[DEPLOY_MODE_ENV];
  });

  it("is off until the operator turns it on", () => {
    expect(isOpenInstance()).toBe(false);
    process.env[OPEN_ENV] = "0";
    expect(isOpenInstance()).toBe(false);
    process.env[OPEN_ENV] = "1";
    expect(isOpenInstance()).toBe(true);
  });

  it("never applies to the hosted deployment", () => {
    process.env[OPEN_ENV] = "1";
    process.env[DEPLOY_MODE_ENV] = "hosted";
    expect(isOpenInstance()).toBe(false);
  });
});

describe("localSession", () => {
  beforeEach(() => {
    world.users = [OWNER];
    process.env[OPEN_ENV] = "1";
    delete process.env[DEPLOY_MODE_ENV];
  });
  afterEach(() => {
    delete process.env[OPEN_ENV];
    delete process.env[DEPLOY_MODE_ENV];
  });

  it("signs in the owner with no login at all", async () => {
    await expect(localSession()).resolves.toEqual({
      userId: OWNER.id,
      email: OWNER.email,
      sessionVersion: 1,
    });
  });

  it("does nothing on an instance that was not opened", async () => {
    delete process.env[OPEN_ENV];
    await expect(localSession()).resolves.toBeNull();
  });

  it("does nothing on the hosted deployment", async () => {
    process.env[DEPLOY_MODE_ENV] = "hosted";
    await expect(localSession()).resolves.toBeNull();
  });

  it("sends a board with no account yet to the setup flow", async () => {
    world.users = [];
    await expect(localSession()).resolves.toBeNull();
  });
});
