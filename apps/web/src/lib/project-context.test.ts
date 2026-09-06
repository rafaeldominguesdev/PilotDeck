import { describe, expect, it } from "vitest";
import {
  FILE_CONTEXT_END_MARKER,
  FILE_CONTEXT_START_MARKER,
  RELEASE_CONTEXT_END_MARKER,
  RELEASE_CONTEXT_START_MARKER,
  appendReleaseContext,
  compareReleaseTags,
  mergeContextFile,
  replaceManagedContext,
  shouldAdvanceVersion,
} from "./project-context";

describe("project context source helpers", () => {
  it("keeps a prerelease out of the stable version and orders tags", () => {
    expect(shouldAdvanceVersion("v1.2.0", "v1.3.0-rc.1")).toBe(true);
    expect(shouldAdvanceVersion("v1.2.0", "v1.1.9")).toBe(false);
    expect(compareReleaseTags("v1.3.0", "v1.3.0-rc.1")).toBeGreaterThan(0);
  });

  it("appends release notes inside markers and preserves manual prose", () => {
    const first = appendReleaseContext(
      "# Manual context\n\nKeep this paragraph.",
      { tagName: "v1.4.0", body: "- Fixed the queue" },
    );
    expect(first.changed).toBe(true);
    expect(first.context).toContain("Keep this paragraph.");
    expect(first.context).toContain("O que a versão v1.4.0 corrigiu");
    expect(first.context).toContain(RELEASE_CONTEXT_START_MARKER);
    expect(first.context).toContain(RELEASE_CONTEXT_END_MARKER);

    const second = appendReleaseContext(first.context, {
      tagName: "v1.4.1",
      body: "Fixed the context refresh",
    });
    expect(second.context).toContain("O que a versão v1.4.0 corrigiu");
    expect(second.context).toContain("O que a versão v1.4.1 corrigiu");
    expect(appendReleaseContext(second.context, { tagName: "v1.4.1", body: "again" }).changed).toBe(false);
  });

  it("replaces only the managed context-file section", () => {
    const original = replaceManagedContext(
      "Manual before\n\nManual after",
      "# From the repository",
      { start: FILE_CONTEXT_START_MARKER, end: FILE_CONTEXT_END_MARKER },
    );
    const updated = mergeContextFile(original, "# New context");
    expect(updated.changed).toBe(true);
    expect(updated.context).toContain("Manual before");
    expect(updated.context).toContain("Manual after");
    expect(updated.context).toContain("# New context");
    expect(updated.context).not.toContain("# From the repository");
  });
});
