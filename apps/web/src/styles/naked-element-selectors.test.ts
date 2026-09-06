import { describe, expect, it } from "vitest";
import { COMPONENT_SHEETS } from "./audited-sheets";
import { parseDeclarations, parseRules, splitSelectorList } from "./css-rules";

/**
 * ux-v2 §2, item 3's other half: a bare ELEMENT selector (`label`, `button`,
 * `input`, ...) that declares layout is a cascade trap. Nothing that reuses
 * that element redeclares the property, so it inherits the layout in
 * silence — which is exactly how `label { flex-direction: column }` in
 * `globals.css:75` broke the Filtros panel (OCL-89's motivating bug).
 *
 * `html` and `body` are exempt: there is exactly one of each in the whole
 * app, so a layout rule on them cannot leak into an unrelated component the
 * way one on a reusable form control can.
 */
const RISKY_ELEMENTS = ["label", "button", "input", "select", "textarea", "form", "a"];
const RISKY_PROPS = ["display", "flex-direction", "gap"];

interface Finding {
  file: string;
  selector: string;
  prop: string;
}

/**
 * Known cascade traps, frozen at OCL-89. `globals.css` is the shared
 * auth/login shell; `label` (line 75, the bug that motivated this card) and
 * `form` (line 64–73, the same pattern) both declare layout on a bare
 * element. Fixing them (scoping to a class, or documenting why the global
 * rule is safe) is its own card in this mission — this list only shrinks as
 * that lands; see the stale-entry check below.
 */
const KNOWN_NAKED_SELECTOR_FINDINGS: Finding[] = [
  { file: "app/globals.css", selector: "label", prop: "display" },
  { file: "app/globals.css", selector: "label", prop: "flex-direction" },
  { file: "app/globals.css", selector: "label", prop: "gap" },
  { file: "app/globals.css", selector: "form", prop: "display" },
  { file: "app/globals.css", selector: "form", prop: "flex-direction" },
  { file: "app/globals.css", selector: "form", prop: "gap" },
];

function findingKey(f: Finding): string {
  return `${f.file}::${f.selector}::${f.prop}`;
}

function bareElementName(simpleSelector: string): string | null {
  const trimmed = simpleSelector.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(trimmed)) return null;
  const name = trimmed.toLowerCase();
  if (name === "html" || name === "body") return null;
  return name;
}

function findNakedElementFindings(file: string, css: string): Finding[] {
  const findings: Finding[] = [];
  for (const rule of parseRules(css)) {
    for (const simple of splitSelectorList(rule.selector)) {
      const element = bareElementName(simple);
      if (!element || !RISKY_ELEMENTS.includes(element)) continue;
      for (const decl of parseDeclarations(rule.body)) {
        if (RISKY_PROPS.includes(decl.prop)) {
          findings.push({ file, selector: element, prop: decl.prop });
        }
      }
    }
  }
  return findings;
}

describe("no bare element selector lays out the board from underneath it (ux-v2 §2)", () => {
  const known = new Set(KNOWN_NAKED_SELECTOR_FINDINGS.map(findingKey));

  const allFindings = Object.entries(COMPONENT_SHEETS).flatMap(([file, css]) =>
    findNakedElementFindings(file, css),
  );

  it("declares layout on a bare element only where explicitly allowlisted", () => {
    const undeclared = allFindings.filter((f) => !known.has(findingKey(f)));
    expect(
      undeclared,
      undeclared
        .map((f) => `${f.file}: bare "${f.selector}" selector declares ${f.prop}`)
        .join("\n"),
    ).toEqual([]);
  });

  it("does not carry allowlist entries the CSS no longer has (keep the escape list honest)", () => {
    const present = new Set(allFindings.map(findingKey));
    const stale = KNOWN_NAKED_SELECTOR_FINDINGS.filter((f) => !present.has(findingKey(f)));
    expect(
      stale,
      stale.map((f) => `${f.file} "${f.selector}" ${f.prop} — fixed, remove from the allowlist`).join("\n"),
    ).toEqual([]);
  });
});
