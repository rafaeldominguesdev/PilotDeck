"use server";

import { project, projectContextAudit } from "@pilotdeck/db";
import {
  PROJECT_CONTEXT_MAX_CHARS,
  ProjectContextSourceSchema,
} from "@pilotdeck/mcp-core";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../lib/action-result";
import { getSession } from "../lib/cookies";
import { db } from "../lib/db";

export type ProjectContextInput = {
  projectId: string;
  context: string;
  currentVersion: string;
  contextSource?: {
    releasesRepo?: string;
    contextFile?: string;
    refresh: "on_release" | "daily" | "manual";
  } | null;
};

/** Saves the human-maintained project briefing shown to every future agent. */
export async function saveProjectContextAction(
  input: ProjectContextInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Session expired. Sign in again." };

  const ws = await db().query.workspace.findFirst();
  if (!ws) return { ok: false, error: "Workspace not found." };
  if (input.context.length > PROJECT_CONTEXT_MAX_CHARS) {
    return {
      ok: false,
      error: `Project context cannot exceed ${PROJECT_CONTEXT_MAX_CHARS} characters.`,
    };
  }

  const currentVersion = input.currentVersion.trim();
  if (currentVersion.length > 200) {
    return { ok: false, error: "Current version cannot exceed 200 characters." };
  }

  let contextSource: {
    releasesRepo?: string;
    contextFile?: string;
    refresh: "on_release" | "daily" | "manual";
  } | null | undefined;
  if (input.contextSource !== undefined) {
    if (!input.contextSource) {
      contextSource = null;
    } else {
      const parsed = ProjectContextSourceSchema.safeParse({
        releases_repo: input.contextSource.releasesRepo?.trim() || undefined,
        context_file: input.contextSource.contextFile?.trim() || undefined,
        refresh: input.contextSource.refresh,
      });
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid context source." };
      }
      contextSource = {
        ...(parsed.data.releases_repo
          ? { releasesRepo: parsed.data.releases_repo }
          : {}),
        ...(parsed.data.context_file
          ? { contextFile: parsed.data.context_file }
          : {}),
        refresh: parsed.data.refresh,
      };
    }
  }

  const sourceTouched = input.contextSource !== undefined;
  const contextTouched = true;

  const [updated] = await db()
    .update(project)
    .set({
      context: input.context.trim() ? input.context : null,
      currentVersion: currentVersion || null,
      ...(sourceTouched ? { contextSource } : {}),
      ...(contextTouched ? { contextUpdatedAt: new Date() } : {}),
    })
    .where(
      and(
        eq(project.id, input.projectId),
        eq(project.workspaceId, ws.id),
      ),
    )
    .returning({ id: project.id });
  if (!updated) return { ok: false, error: "Project not found." };

  if (contextTouched) {
    await db().insert(projectContextAudit).values({
      projectId: updated.id,
      source: "manual",
      sourceRef: `manual:${Date.now()}:${session.userId}`,
      version: currentVersion || null,
      prerelease: false,
      summary: "project context updated manually",
      actor: session.email,
    });
  }

  revalidatePath("/settings");
  revalidatePath("/home");
  return { ok: true };
}
