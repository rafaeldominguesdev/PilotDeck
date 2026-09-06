import { describe, expect, it } from "vitest";
import { applyContextOps, ContextOpSchema } from "../src/index.js";

describe("granular markdown context operations", () => {
  it("replaces one section and preserves the surrounding document", () => {
    const source = [
      "# Board",
      "",
      "## Architecture",
      "old architecture",
      "",
      "## Runtime",
      "keep runtime",
    ].join("\n");

    const result = applyContextOps(source, [
      { op: "replace_section", heading: "Architecture", text: "new architecture" },
    ]);

    expect(result).toContain("## Architecture\nnew architecture");
    expect(result).toContain("## Runtime\nkeep runtime");
    expect(result).not.toContain("old architecture");
  });

  it("creates a missing section when appending a section or a line", () => {
    const section = applyContextOps("# Board\nintro", [
      { op: "append_section", heading: "Missing", text: "created" },
    ]);
    expect(section).toBe("# Board\nintro\n\n## Missing\n\ncreated");

    const line = applyContextOps("# Board", [
      { op: "append_line", heading: "Checklist", text: "- first" },
    ]);
    expect(line).toBe("# Board\n\n## Checklist\n\n- first");
  });

  it("supports list-line append and replacement without touching other sections", () => {
    const source = [
      "## Checklist",
      "- first",
      "## Other",
      "leave this alone",
    ].join("\n");

    const result = applyContextOps(source, [
      { op: "append_line", heading: "Checklist", text: "- second" },
      {
        op: "replace_line",
        heading: "Checklist",
        line: "- first",
        text: "- updated",
      },
    ]);

    expect(result).toContain("## Checklist\n- updated\n- second");
    expect(result).toContain("## Other\nleave this alone");
  });

  it("deletes a complete section and rejects an unknown replace target", () => {
    const result = applyContextOps("## A\na\n## B\nb", [
      { op: "delete_section", heading: "A" },
    ]);
    expect(result).toBe("## B\nb");

    expect(() =>
      applyContextOps("## A\na", [
        { op: "replace_section", heading: "Missing", text: "x" },
      ]),
    ).toThrow(/append_section/);
  });

  it("validates the public operation shapes", () => {
    expect(
      ContextOpSchema.parse({
        op: "replace_line",
        heading: "Checklist",
        line: "- old",
        text: "- new",
      }),
    ).toEqual({
      op: "replace_line",
      heading: "Checklist",
      line: "- old",
      text: "- new",
    });
    expect(
      ContextOpSchema.safeParse({
        op: "replace_line",
        heading: "Checklist",
        text: "- new",
      }).success,
    ).toBe(false);
  });
});
