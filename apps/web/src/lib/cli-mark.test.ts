import { describe, expect, it } from "vitest";
import { cliDiffers, readCliMark } from "./cli-mark";

describe("the CLI of a card, resolved to a brand mark", () => {
  it("takes the binary name agents send and answers with the catalog mark", () => {
    expect(readCliMark("claude")).toEqual({ id: "claude-code", label: "Claude Code" });
    expect(readCliMark("gemini")).toEqual({ id: "gemini-cli", label: "Gemini" });
    expect(readCliMark("copilot")).toEqual({
      id: "github-copilot",
      label: "GitHub Copilot",
    });
  });

  it("takes a catalog id as it is, whatever case it arrives in", () => {
    expect(readCliMark("codex")).toEqual({ id: "codex", label: "Codex" });
    expect(readCliMark("  Claude-Code ")).toEqual({
      id: "claude-code",
      label: "Claude Code",
    });
  });

  it("falls back to the name for a CLI with no mark, and never to a stand-in glyph", () => {
    expect(readCliMark("generic-mcp")).toEqual({ id: null, label: "generic-mcp" });
    expect(readCliMark("my-own-runner-2")).toEqual({ id: null, label: "my-own-runn…" });
  });

  it("says nothing when there is no CLI to say", () => {
    expect(readCliMark(null)).toBeNull();
    expect(readCliMark(undefined)).toBeNull();
    expect(readCliMark("   ")).toBeNull();
  });
});

describe("planned CLI against the one that ran", () => {
  it("is the same CLI when the executor sent the binary name of the plan", () => {
    expect(cliDiffers("claude-code", "claude")).toBe(false);
  });

  it("is a swap when another CLI took the card", () => {
    expect(cliDiffers("claude-code", "codex")).toBe(true);
  });

  it("stays quiet when either side is missing: one mark is not a comparison", () => {
    expect(cliDiffers(null, "codex")).toBe(false);
    expect(cliDiffers("codex", null)).toBe(false);
  });
});
