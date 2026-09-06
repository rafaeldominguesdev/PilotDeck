import { project, projectContextAudit } from "@pilotdeck/db";
import { and, eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { refreshProjectContext } from "./project-context-refresh";
import { closeTestWorld, createTestWorld, type TestWorld } from "../mcp/test-db";

describe("project context refresh", () => {
  let world: TestWorld;

  afterEach(async () => {
    if (world) await closeTestWorld(world);
  });

  it("keeps stable and prerelease versions separate and is idempotent", async () => {
    world = await createTestWorld();
    await world.db
      .update(project)
      .set({
        context: "# Manual\n\nDo not delete this.",
        contextSource: {
          releasesRepo: "owner/releases",
          refresh: "on_release",
        },
      })
      .where(eq(project.id, world.projectId));

    const fetchImpl: typeof fetch = async () =>
      Response.json([
        {
          id: 1,
          tag_name: "v2.0.0",
          name: "Stable",
          body: "- Stable fix",
          prerelease: false,
          published_at: "2026-08-19T09:00:00.000Z",
        },
        {
          id: 2,
          tag_name: "v2.1.0-rc.1",
          name: "Candidate",
          body: "- Candidate fix",
          prerelease: true,
          published_at: "2026-08-19T10:00:00.000Z",
        },
      ]);

    const first = await refreshProjectContext(world.db, world.workspaceId, world.projectId, {
      fetch: fetchImpl,
      now: () => new Date("2026-08-19T11:00:00.000Z"),
      actor: "test",
    });
    expect(first?.updated).toBe(true);
    expect(first?.updates).toBe(2);
    expect(first?.project.currentVersion).toBe("v2.0.0");
    expect(first?.project.latestPrerelease).toBe("v2.1.0-rc.1");
    expect(first?.project.context).toContain("Do not delete this.");
    expect(first?.project.context).toContain("O que a versão v2.0.0 corrigiu");
    expect(first?.project.context).toContain("O que a versão v2.1.0-rc.1 corrigiu");

    const second = await refreshProjectContext(world.db, world.workspaceId, world.projectId, {
      fetch: fetchImpl,
    });
    expect(second?.updated).toBe(false);
    expect(second?.updates).toBe(0);

    const audits = await world.db
      .select({ source: projectContextAudit.source, version: projectContextAudit.version })
      .from(projectContextAudit)
      .where(and(eq(projectContextAudit.projectId, world.projectId), eq(projectContextAudit.source, "github_release")));
    expect(audits).toHaveLength(2);
  });
});
