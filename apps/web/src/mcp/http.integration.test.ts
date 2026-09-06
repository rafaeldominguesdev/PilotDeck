import { afterEach, describe, expect, it } from "vitest";
import { project } from "@pilotdeck/db";
import { eq } from "drizzle-orm";
import { handleMcpRequest } from "./http";
import { closeTestWorld, createTestWorld, type TestWorld } from "./test-db";

function initializeBody() {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "pilotdeck-test", version: "0.0.0" },
    },
  };
}

describe("HTTP /mcp auth", () => {
  let world: TestWorld;

  afterEach(async () => {
    if (world) await closeTestWorld(world);
  });

  it("returns 401 when the bearer token was revoked", async () => {
    world = await createTestWorld();
    const response = await handleMcpRequest(
      new Request("http://board.local/mcp", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${world.revokedSecret}`,
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(initializeBody()),
      }),
      { db: world.db },
    );
    expect(response.status).toBe(401);
    const json = (await response.json()) as { error: { code: string } };
    expect(json.error.code).toBe("TOKEN_REVOKED");
  });

  it("returns 401 when the token is missing", async () => {
    world = await createTestWorld();
    const response = await handleMcpRequest(
      new Request("http://board.local/mcp", {
        method: "POST",
        headers: {
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(initializeBody()),
      }),
      { db: world.db },
    );
    expect(response.status).toBe(401);
  });

  it("initializes over streamable HTTP with a live token", async () => {
    world = await createTestWorld();
    const response = await handleMcpRequest(
      new Request("http://board.local/mcp", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${world.secret}`,
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(initializeBody()),
      }),
      { db: world.db },
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      result?: { serverInfo?: { name: string } };
    };
    expect(json.result?.serverInfo?.name).toBe("pilotdeck");
  });

  it("allows stateless hook clients to call task_list directly", async () => {
    world = await createTestWorld();
    const response = await handleMcpRequest(
      new Request("about:blank", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${world.secret}`,
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "hook-test",
          method: "tools/call",
          params: { name: "task_list", arguments: { status: "aberto" } },
        }),
      }),
      { db: world.db },
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      result?: {
        structuredContent?: { tasks?: unknown[] };
        content?: Array<{ text?: string }>;
      };
    };
    const payload =
      json.result?.structuredContent ??
      JSON.parse(json.result?.content?.[0]?.text ?? "{}");
    expect(Array.isArray(payload.tasks)).toBe(true);
  });

  it("ships instructions that open with the board identity", async () => {
    world = await createTestWorld();
    const response = await handleMcpRequest(
      new Request("http://board.local/mcp", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${world.secret}`,
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(initializeBody()),
      }),
      { db: world.db },
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      result?: { instructions?: string };
    };
    const instructions = json.result?.instructions ?? "";
    // A fresh agent must learn, before any tool call, where it is and what
    // registering an activity means.
    expect(
      instructions.startsWith(
        "PilotDeck is the task board where agents claim and deliver cards (not Overclock the IDE); registering activities means task_create here.",
      ),
    ).toBe(true);
  });

  it("summarizes documented projects in initialize instructions", async () => {
    world = await createTestWorld();
    await world.db
      .update(project)
      .set({ context: "# Architecture\n\nThe web app owns the MCP endpoint." })
      .where(eq(project.id, world.projectId));

    const response = await handleMcpRequest(
      new Request("http://board.local/mcp", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${world.secret}`,
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(initializeBody()),
      }),
      { db: world.db },
    );
    const json = (await response.json()) as {
      result?: { instructions?: string };
    };
    const instructions = json.result?.instructions ?? "";
    expect(instructions).toContain("PilotDeck (OC)");
    expect(instructions).toContain("Architecture");
    expect(instructions).toContain("Use project_get");
  });
});
