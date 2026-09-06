import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  THEMES,
  THEME_BOOT_SCRIPT,
  THEME_COOKIE,
  isTheme,
  resolveTheme,
  themeCookieValue,
  themeFromCookieHeader,
} from "./theme";

describe("themes", () => {
  it("ships exactly the two the fork names", () => {
    expect([...THEMES]).toEqual(["devterm", "overclock"]);
  });

  it("defaults to devterm, the fork's own look", () => {
    expect(DEFAULT_THEME).toBe("devterm");
  });

  it("recognises the two and nothing else", () => {
    for (const theme of THEMES) expect(isTheme(theme)).toBe(true);
    expect(isTheme("DevTerm")).toBe(false);
    expect(isTheme("nebula")).toBe(false);
    expect(isTheme("")).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(42)).toBe(false);
  });

  it("falls back to the default for an unknown, missing or tampered value", () => {
    expect(resolveTheme("devterm")).toBe("devterm");
    expect(resolveTheme("overclock")).toBe("overclock");
    expect(resolveTheme("nebula")).toBe(DEFAULT_THEME);
    expect(resolveTheme("xai")).toBe(DEFAULT_THEME);
    expect(resolveTheme("whatever")).toBe(DEFAULT_THEME);
    expect(resolveTheme("")).toBe(DEFAULT_THEME);
    expect(resolveTheme(null)).toBe(DEFAULT_THEME);
    expect(resolveTheme(undefined)).toBe(DEFAULT_THEME);
  });
});

describe("the cookie the choice lives in", () => {
  it("reads its own value out of a cookie string that carries others", () => {
    expect(themeFromCookieHeader(`ab_session=x; ${THEME_COOKIE}=devterm; other=1`)).toBe("devterm");
    expect(themeFromCookieHeader(`${THEME_COOKIE}=overclock`)).toBe("overclock");
  });

  it("answers the default when there is no cookie at all", () => {
    expect(themeFromCookieHeader("")).toBe(DEFAULT_THEME);
    expect(themeFromCookieHeader(null)).toBe(DEFAULT_THEME);
    expect(themeFromCookieHeader("ab_session=x")).toBe(DEFAULT_THEME);
  });

  it("answers the default when the value is not a theme, however it got there", () => {
    expect(themeFromCookieHeader(`${THEME_COOKIE}=dracula`)).toBe(DEFAULT_THEME);
    expect(themeFromCookieHeader(`${THEME_COOKIE}=%E0%A4%A`)).toBe(DEFAULT_THEME);
  });

  it("writes a year-long, path-wide, same-site cookie", () => {
    const value = themeCookieValue("overclock");
    expect(value).toContain(`${THEME_COOKIE}=overclock`);
    expect(value).toContain("Path=/");
    expect(value).toContain("Max-Age=31536000");
    expect(value).toContain("SameSite=Lax");
  });
});

describe("the no-flash boot script", () => {
  it("names every theme it must accept, so the list cannot drift", () => {
    for (const theme of THEMES) expect(THEME_BOOT_SCRIPT).toContain(`"${theme}"`);
    expect(THEME_BOOT_SCRIPT).toContain(THEME_COOKIE);
  });

  /**
   * Running it is the only way to know it does what it claims before a
   * browser paints. A minimal document stand-in is enough: it reads one
   * cookie string and writes one attribute.
   */
  function runBoot(cookie: string): string | null {
    let written: string | null = null;
    const document = {
      cookie,
      documentElement: {
        setAttribute(name: string, value: string) {
          if (name === "data-theme") written = value;
        },
      },
    };
    new Function("document", THEME_BOOT_SCRIPT)(document);
    return written;
  }

  it("puts the stored theme on the root element", () => {
    expect(runBoot(`${THEME_COOKIE}=devterm`)).toBe("devterm");
    expect(runBoot(`ab_session=x; ${THEME_COOKIE}=overclock; k=v`)).toBe("overclock");
  });

  it("puts the default there when nothing is stored or the value is unknown", () => {
    expect(runBoot("")).toBe(DEFAULT_THEME);
    expect(runBoot("ab_session=x")).toBe(DEFAULT_THEME);
    expect(runBoot(`${THEME_COOKIE}=dracula`)).toBe(DEFAULT_THEME);
  });

  it("never throws, so a browser without cookies still renders", () => {
    expect(() =>
      new Function("document", THEME_BOOT_SCRIPT)({
        get cookie(): string {
          throw new Error("cookies are disabled");
        },
        documentElement: { setAttribute() {} },
      }),
    ).not.toThrow();
  });
});
