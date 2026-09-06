import { CARDAPIO_TASK_TYPES } from "@pilotdeck/mcp-core";
import { describe, expect, it } from "vitest";
import { factoryCardapioPolicy } from "./cardapio";

describe("factory cardápio policy seed", () => {
  it("seeds every factory type as CLI · chain · effort with no skills", () => {
    const rows = factoryCardapioPolicy();
    expect(rows.map((row) => row.type)).toEqual([...CARDAPIO_TASK_TYPES]);
    expect(rows[0]).toMatchObject({
      type: "feature",
      cli: null,
      model: "opus-5",
      chain: ["opus-5", "fable-5", "gpt-5.6-sol"],
      effort: "high",
    });
    for (const row of rows) {
      expect(row).not.toHaveProperty("skills");
      // A row copied out of the factory owns its array: editing the workspace
      // policy must never reach back into the shipped table.
      expect(row.chain).not.toBe(null);
      expect(row.model).toBe(row.chain?.[0]);
    }
  });
});
