import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * Lightning CSS coalesces the two backdrop-filter spellings. If the WebKit
 * fallback comes last, the standards declaration disappears from the built
 * chunk and current Chromium computes `none`.
 */
describe("backdrop filters survive Lightning CSS", () => {
  it("puts each WebKit fallback immediately before the standards declaration", () => {
    const css = stripComments(readFileSync(join(here, "nebula.css"), "utf8"));
    const declarations = [
      ...css.matchAll(/(?<![\w-])(-webkit-)?backdrop-filter\s*:\s*([^;]+);/g),
    ];

    expect(declarations.length).toBeGreaterThan(0);
    expect(declarations.length % 2).toBe(0);

    for (let i = 0; i < declarations.length; i += 2) {
      const prefixed = declarations[i];
      const standard = declarations[i + 1];
      const between = css.slice(
        prefixed.index! + prefixed[0].length,
        standard.index,
      );

      expect(prefixed[1], prefixed[0]).toBe("-webkit-");
      expect(standard[1], standard[0]).toBeUndefined();
      expect(standard[2].trim(), standard[0]).toBe(prefixed[2].trim());
      expect(
        between.trim(),
        `${prefixed[0]} must be followed by ${standard[0]}`,
      ).toBe("");
    }
  });
});
