import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const world = vi.hoisted(() => ({
  host: "localhost:3000" as string | null,
  signedOut: false,
  users: [] as Array<{
    id: string;
    email: string;
    active: boolean;
    sessionVersion: number;
  }>,
}));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: () => world.host }),
  cookies: async () => ({
    get: () => (world.signedOut ? { value: "1" } : undefined),
  }),
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
import { NO_LOGIN_ENV, hostIsLoopback, localSession } from "./local-session";

const ONLY_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "eu@local.invalid",
  active: true,
  sessionVersion: 1,
};

describe("hostIsLoopback", () => {
  it("accepts the addresses that mean this machine", () => {
    for (const host of [
      "localhost",
      "localhost:3000",
      "127.0.0.1:3000",
      "[::1]:3000",
      "LOCALHOST:3000",
    ]) {
      expect(hostIsLoopback(host), host).toBe(true);
    }
  });

  it("refuses anything a second machine could have typed", () => {
    for (const host of [
      "192.168.0.10:3000",
      "board.example.com",
      "10.0.0.4",
      "localhost.evil.com",
      "",
      null,
    ]) {
      expect(hostIsLoopback(host), String(host)).toBe(false);
    }
  });
});

describe("localSession", () => {
  beforeEach(() => {
    world.host = "localhost:3000";
    world.signedOut = false;
    world.users = [ONLY_USER];
    process.env[NO_LOGIN_ENV] = "1";
    delete process.env[DEPLOY_MODE_ENV];
  });
  afterEach(() => {
    delete process.env[NO_LOGIN_ENV];
    delete process.env[DEPLOY_MODE_ENV];
  });

  it("signs in the only local user when everything holds", async () => {
    await expect(localSession()).resolves.toEqual({
      userId: ONLY_USER.id,
      email: ONLY_USER.email,
      sessionVersion: 1,
    });
  });

  it("does nothing unless the operator asked for it", async () => {
    delete process.env[NO_LOGIN_ENV];
    await expect(localSession()).resolves.toBeNull();
  });

  it("never applies to the hosted deployment", async () => {
    process.env[DEPLOY_MODE_ENV] = "hosted";
    await expect(localSession()).resolves.toBeNull();
  });

  it("refuses a request that did not come over loopback", async () => {
    world.host = "192.168.0.10:3000";
    await expect(localSession()).resolves.toBeNull();
  });

  it("refuses when the board has more than one person in it", async () => {
    world.users = [ONLY_USER, { ...ONLY_USER, id: "outro" }];
    await expect(localSession()).resolves.toBeNull();
  });

  it("sends a board with no users to the setup flow instead", async () => {
    world.users = [];
    await expect(localSession()).resolves.toBeNull();
  });

  it("respects a browser that signed out on purpose", async () => {
    world.signedOut = true;
    await expect(localSession()).resolves.toBeNull();
  });
});
