import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { dict } from "../lib/i18n";
import { PluginInstall, type PluginPairing } from "./plugin-install";

const ORIGIN = "https://board.example";

function render(pairing: PluginPairing | null, lang = "en"): string {
  return renderToStaticMarkup(
    createElement(PluginInstall, {
      origin: ORIGIN,
      t: dict(lang),
      label: "Claude Code on this machine",
      onLabelChange: () => {},
      pairing,
      onGenerate: () => {},
      pending: false,
    }),
  );
}

/** A code that is alive for the whole of this test run. */
function livePairing(): PluginPairing {
  return {
    id: "pair-1",
    code: "482913",
    expiresAt: new Date(Date.now() + 9 * 60_000).toISOString(),
  };
}

describe("the plugin offer", () => {
  it("leads with the installer command, not with an MCP entry", () => {
    const html = render(livePairing());
    expect(html).toContain("/install.sh?code=482913");
    expect(html).toContain("curl -fsSL");
    expect(html).not.toContain("mcp add");
    expect(html).not.toContain("Authorization: Bearer");
  });

  it("says in one line what the command installs, and on which CLIs", () => {
    const html = render(null);
    for (const word of ["MCP", "skill", "hooks", "Claude Code", "Codex", "Grok", "Kimi"]) {
      expect(html).toContain(word);
    }
  });

  it("shows the shape of the command before a code exists, with no code", () => {
    const html = render(null);
    expect(html).toContain("/install.sh?code=");
    expect(html).not.toMatch(/code=\d/);
  });

  it("offers a fresh command once one exists", () => {
    expect(render(livePairing())).toContain(dict("en").plugin.regenerate);
    expect(render(null)).toContain(dict("en").plugin.generate);
  });

  it("says the code expired instead of offering a dead command", () => {
    const expired: PluginPairing = {
      id: "pair-1",
      code: "482913",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    const html = render(expired);
    expect(html).toContain(dict("en").plugin.codeExpired);
    expect(html).not.toContain("code=482913");
  });

  it("puts no bearer token on screen in either language", () => {
    for (const lang of ["en", "pt-BR"]) {
      const html = render(livePairing(), lang);
      expect(html).not.toContain("ocb_");
      expect(html).not.toContain("Bearer");
    }
  });

  it("keeps the copy free of the em dash the house style refuses", () => {
    const t = dict("pt-BR").plugin;
    for (const line of Object.values(t)) {
      expect(line).not.toContain("—");
    }
  });
});
