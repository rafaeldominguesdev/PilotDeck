import { describe, expect, it } from "vitest";
import { COMPONENT_SHEETS } from "./audited-sheets";
import {
  classSpecificity,
  parseDeclarations,
  parseRules,
  splitSelectorList,
} from "./css-rules";

/**
 * OCL-83 / OCL-128: a filter option is one row — box, then name — read from
 * the left.
 *
 * The bug this guards against is a cascade trap, not a typo. `globals.css:75`
 * still declares `label { flex-direction: column }` on a bare element (it is
 * a known, frozen finding in `naked-element-selectors.test.ts`, with its own
 * card in the OCL-89 mission). `.ff-opt` is a `<label>`, so the day it stops
 * declaring `flex-direction` itself, every option in TIPO, PRIORIDADE and
 * RELEASE stacks its box above its name and centres the pair — which is what
 * the OCL-128 screenshot showed, taken against the v0.2.2 deploy, cut before
 * OCL-83 landed.
 *
 * Same simplifications as `control-anatomy.test.ts`: class specificity and
 * source order only, `@media` skipped.
 */
function resolveFlexDirection(cls: string): string | null {
  let winner: { value: string; specificity: number } | null = null;
  for (const css of Object.values(COMPONENT_SHEETS)) {
    for (const rule of parseRules(css)) {
      if (rule.insideAtRule) continue;
      for (const simple of splitSelectorList(rule.selector)) {
        if (!new RegExp(`\\.${cls}\\b(?![-\\w])`).test(simple)) continue;
        for (const decl of parseDeclarations(rule.body)) {
          if (decl.prop !== "flex-direction") continue;
          const specificity = classSpecificity(simple);
          if (!winner || specificity >= winner.specificity) {
            winner = { value: decl.value.trim(), specificity };
          }
        }
      }
    }
  }
  return winner?.value ?? null;
}

describe("a filter option reads as one row (OCL-83)", () => {
  it(".ff-opt declares flex-direction: row itself", () => {
    // Declaring it is the point: the bare `label` rule wins by default.
    expect(resolveFlexDirection("ff-opt")).toBe("row");
  });

  it("the option list stays a column, so the options stack, not their parts", () => {
    expect(resolveFlexDirection("ff-list")).toBe("column");
  });
});
