import { afterEach, describe, expect, it } from "vitest";
import { handleMcpRequest } from "./http";
import { closeTestWorld, createTestWorld, type TestWorld } from "./test-db";

/**
 * The tool descriptions are the prompt a connected agent reads to choose a
 * tool, and they are written by hand, one line per tool. Most of them were
 * Portuguese while the newer ones were English, and the split reappeared
 * twice while that was being closed, because every new tool is a fresh line
 * somebody types.
 *
 * This reads them the way an agent does, over tools/list, instead of reading
 * the constant: what ships is what matters.
 */

/**
 * Accented letters Portuguese uses and English does not.
 *
 * Two things this deliberately is not:
 *
 * - not "any non-ASCII". The surface already carries em dashes, and a test
 *   that complains about punctuation is a test everyone learns to skip.
 * - not a word list. "cardapio" is the name of the routing table, in the
 *   schema, in the domain module and in the tool descriptions; it is a
 *   proper noun here, not untranslated prose, and matching on it would fail
 *   an English sentence for using the project's own vocabulary.
 *
 * Accents are the honest signal: every description that was Portuguese
 * carried them, because whoever writes Portuguese types it properly.
 */
const PORTUGUESE_LETTERS = /[ãõçáàâéêíóôúü]/i;

describe("the MCP surface speaks one language", () => {
  let world: TestWorld;

  afterEach(async () => {
    if (world) await closeTestWorld(world);
  });

  it("publishes every tool description in English", async () => {
    world = await createTestWorld();
    const response = await handleMcpRequest(
      new Request("http://board.local/mcp", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${world.secret}`,
          Accept: "application/json, text/event-stream",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        }),
      }),
      { db: world.db },
    );

    const json = (await response.json()) as {
      result: { tools: { name: string; description: string }[] };
    };
    const tools = json.result.tools;
    expect(tools.length).toBeGreaterThan(0);

    // Name the offenders: "a description is Portuguese" is not actionable on
    // a surface this size.
    const offenders = tools
      .filter((tool) => PORTUGUESE_LETTERS.test(tool.description))
      .map((tool) => tool.name);

    expect(offenders).toEqual([]);
  });
});
