/**
 * A minimal CSS rule splitter shared by the style guards (OCL-89).
 *
 * It is not a full CSS parser: it only tells a leaf rule (a selector plus its
 * flat declaration body) apart from a container (`@media`, `@supports`,
 * `@keyframes`) and recurses into containers so their nested rules come out
 * as leaves too. `insideAtRule` tells a caller whether a leaf lived inside
 * such a container, which matters when a guard cares only about the
 * unconditional (non-responsive) cascade.
 */

export interface CssRule {
  selector: string;
  body: string;
  insideAtRule: boolean;
}

export interface CssDeclaration {
  prop: string;
  value: string;
}

function splitRules(css: string, insideAtRule: boolean): CssRule[] {
  const rules: CssRule[] = [];
  const stack: { selector: string; bodyStart: number }[] = [];
  let selectorStart = 0;

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") {
      stack.push({ selector: css.slice(selectorStart, i).trim(), bodyStart: i + 1 });
      selectorStart = i + 1;
    } else if (ch === "}") {
      const top = stack.pop();
      if (!top) continue;
      selectorStart = i + 1;
      // A block nested inside another unclosed block (e.g. a rule inside an
      // still-open @media) is handled once, when the outer block closes and
      // recurses over its whole body — deciding here too would double-count it.
      if (stack.length > 0) continue;
      const body = css.slice(top.bodyStart, i);
      if (body.includes("{")) {
        rules.push(...splitRules(body, insideAtRule || top.selector.startsWith("@")));
      } else if (!top.selector.startsWith("@") && top.selector.length > 0) {
        rules.push({ selector: top.selector, body, insideAtRule });
      }
    }
  }
  return rules;
}

/** Comments hold examples and old values; only real CSS is under test. */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

export function parseRules(css: string): CssRule[] {
  return splitRules(stripComments(css), false);
}

export function parseDeclarations(body: string): CssDeclaration[] {
  return body
    .split(";")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return null;
      return { prop: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
    })
    .filter((d): d is CssDeclaration => d !== null);
}

/** Individual selectors of a (possibly grouped, comma-separated) rule. */
export function splitSelectorList(selector: string): string[] {
  return selector
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Approximate CSS specificity: this codebase uses only class selectors. */
export function classSpecificity(selector: string): number {
  return (selector.match(/\.[a-zA-Z0-9_-]+/g) ?? []).length;
}
