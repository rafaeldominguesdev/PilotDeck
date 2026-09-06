import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Icon, ICON_NAMES } from "./icon";

/**
 * The promises the set makes, checked on every glyph in it (AGB-73).
 *
 * A set is only a set while nobody adds the one icon that is heavier, larger
 * or fetched from somewhere. These are cheap tests precisely so that adding a
 * glyph that breaks the system fails here instead of on someone's screen.
 */

const render = (name: (typeof ICON_NAMES)[number], label: string | null) =>
  renderToStaticMarkup(Icon({ name, label }));

describe("the icon set", () => {
  it("draws every glyph in the same box, at the same weight", () => {
    for (const name of ICON_NAMES) {
      const markup = render(name, null);
      expect(markup, name).toContain('viewBox="0 0 24 24"');
      expect(markup, name).toContain('stroke-width="1.75"');
      expect(markup, name).toContain('stroke="currentColor"');
      expect(markup, name).toContain('fill="none"');
    }
  });

  it("takes its colour from the text it sits beside, never from a hex value", () => {
    for (const name of ICON_NAMES) {
      // A glyph that names a colour has left the palette behind, which is how
      // an icon set stops matching the product it ships in.
      expect(render(name, null), name).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it("ships every glyph with the page: nothing is fetched at runtime", () => {
    for (const name of ICON_NAMES) {
      const markup = render(name, null);
      expect(markup, name).not.toContain("http");
      expect(markup, name).not.toContain("url(");
      // <use> and <image> are the two ways an inline svg still reaches out.
      expect(markup, name).not.toContain("<use");
      expect(markup, name).not.toContain("<image");
    }
  });

  it("gives a named icon an accessible name and hides a silent one", () => {
    const named = render("close", "Close");
    expect(named).toContain('role="img"');
    expect(named).toContain('aria-label="Close"');
    expect(named).not.toContain("aria-hidden");

    // Silent is for the icon whose word is already on screen beside it: a
    // reader that hears the label twice is the bug this guards against.
    const silent = render("close", null);
    expect(silent).toContain('aria-hidden="true"');
    expect(silent).not.toContain('role="img"');
    expect(silent).not.toContain("aria-label");
  });

  it("gives each name art of its own", () => {
    const drawn = new Map<string, string>();
    for (const name of ICON_NAMES) {
      const art = render(name, null).replace(/^<svg[^>]*>/, "");
      const twin = drawn.get(art);
      expect(twin, `${name} is drawn exactly like ${twin}`).toBeUndefined();
      drawn.set(art, name);
    }
    expect(drawn.size).toBe(ICON_NAMES.length);
  });

  it("covers the affordances the app used to spell out in text", () => {
    // The list the card names. A rename that drops one of these breaks a
    // screen somewhere, so it is spelled out here rather than assumed.
    for (const required of [
      "close",
      "back",
      "copy",
      "search",
      "clear",
      "menu",
      "empty",
      "chevronDown",
      "chevronUp",
      "chevronLeft",
      "chevronRight",
      "columnOpen",
      "columnRunning",
      "columnDone",
      "columnValidated",
      "tabExecutors",
      "tabPolicy",
      "tabPrices",
      "tabRecipes",
      "tabTokens",
      "tabLanguage",
      "tabUpdates",
    ]) {
      expect(ICON_NAMES, required).toContain(required);
    }
  });
});
