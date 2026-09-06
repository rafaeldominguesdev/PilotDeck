"use server";

import { workspace, type ExecutorConfig } from "@pilotdeck/db";
import { seededEffortSpec } from "@pilotdeck/mcp-core";
import { eq } from "drizzle-orm";
import type { ActionResult } from "../lib/action-result";
import { getSession } from "../lib/cookies";
import { db } from "../lib/db";
import { revalidatePath } from "next/cache";
import {
  CUSTOM_EXECUTOR_ID,
  EXECUTOR_CATALOG,
  resolveCatalogCli,
  type ExecutorSelection,
} from "../lib/executors";

/** Persists the executor selection into the workspace config (jsonb). */
export async function saveExecutorsAction(
  sel: ExecutorSelection,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Session expired. Sign in again." };

  const ws = await db().query.workspace.findFirst();
  if (!ws) return { ok: false, error: "Workspace not found." };

  const config: ExecutorConfig[] = EXECUTOR_CATALOG.map((d) => {
    const catalog = [
      ...new Set(
        (sel.models?.[d.id] ?? d.models).map((m) => m.trim()).filter(Boolean),
      ),
    ];
    const efforts = Object.fromEntries(
      Object.entries(sel.efforts ?? {}).filter(([model]) =>
        catalog.some(
          (candidate) =>
            candidate.trim().toLowerCase().replace(/\./g, "-") ===
            model.trim().toLowerCase().replace(/\./g, "-"),
        ),
      ),
    );
    const effortSources = Object.fromEntries(
      Object.entries(sel.effortSources ?? {}).filter(([model]) =>
        Object.keys(efforts).some(
          (candidate) =>
            candidate.trim().toLowerCase().replace(/\./g, "-") ===
            model.trim().toLowerCase().replace(/\./g, "-"),
        ),
      ),
    );
    return {
      id: d.id,
      label: d.label,
      enabled: d.id in sel.enabled,
      models: (sel.enabled[d.id] ?? []).filter((m) => catalog.includes(m)),
      catalog,
      ...(Object.keys(efforts).length > 0 ? { efforts } : {}),
      ...(Object.keys(effortSources).length > 0
        ? { effortSources }
        : {}),
    };
  });
  // Executors learned from real connections live outside the built-in
  // catalog; a save from the grid must not erase them.
  for (const id of Object.keys(sel.labels ?? {})) {
    if (EXECUTOR_CATALOG.some((d) => d.id === id) || id === CUSTOM_EXECUTOR_ID) {
      continue;
    }
    const catalog = [
      ...new Set((sel.models?.[id] ?? []).map((m) => m.trim()).filter(Boolean)),
    ];
    config.push({
      id,
      label: sel.labels[id] ?? id,
      enabled: id in sel.enabled,
      models: (sel.enabled[id] ?? []).filter((m) => catalog.includes(m)),
      catalog,
      ...(Object.keys(sel.efforts ?? {}).length > 0
        ? { efforts: { ...sel.efforts } }
        : {}),
      ...(Object.keys(sel.effortSources ?? {}).length > 0
        ? { effortSources: { ...sel.effortSources } }
        : {}),
    });
  }
  config.push({
    id: CUSTOM_EXECUTOR_ID,
    label: sel.customName.trim() || "Custom",
    enabled: sel.customEnabled,
    models: [],
  });

  await db().update(workspace).set({ executors: config }).where(eq(workspace.id, ws.id));
  return { ok: true };
}

/**
 * One click on a "seen in real connections" suggestion: adds the cli/model
 * pair to the executor config (enabling it) and clears the suggestion.
 */
export async function addSeenExecutorAction(
  cli: string,
  model: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Session expired. Sign in again." };

  const ws = await db().query.workspace.findFirst();
  if (!ws) return { ok: false, error: "Workspace not found." };

  const cleanCli = cli.trim();
  const cleanModel = model.trim();
  if (!cleanCli || !cleanModel) {
    return { ok: false, error: "Suggestion is missing the cli or the model." };
  }

  const targetId = resolveCatalogCli(cleanCli) ?? cleanCli.toLowerCase();
  const config: ExecutorConfig[] = ws.executors.map((row) => ({
    ...row,
    models: [...row.models],
    ...(row.catalog ? { catalog: [...row.catalog] } : {}),
    ...(row.efforts
      ? {
          efforts: Object.fromEntries(
            Object.entries(row.efforts).map(([key, values]) => [key, [...values]]),
          ),
        }
      : {}),
    ...(row.effortSources ? { effortSources: { ...row.effortSources } } : {}),
  }));
  const existing = config.find((row) => row.id === targetId);
  if (existing) {
    existing.enabled = true;
    const catalog = existing.catalog ?? [
      ...new Set([
        ...(EXECUTOR_CATALOG.find((d) => d.id === targetId)?.models ?? []),
        ...existing.models,
      ]),
    ];
    if (!catalog.includes(cleanModel)) catalog.push(cleanModel);
    existing.catalog = catalog;
    if (!existing.models.includes(cleanModel)) existing.models.push(cleanModel);
    const spec = seededEffortSpec(targetId, cleanModel);
    const existingEffort = Object.keys(existing.efforts ?? {}).find(
      (key) => key.trim().toLowerCase().replace(/\./g, "-") === cleanModel.toLowerCase().replace(/\./g, "-"),
    );
    if (!existingEffort && spec) {
      existing.efforts ??= {};
      existing.efforts[cleanModel] = [...spec.efforts];
      existing.effortSources ??= {};
      existing.effortSources[cleanModel] = spec.source;
    }
  } else {
    const spec = seededEffortSpec(targetId, cleanModel);
    config.push({
      id: targetId,
      label: EXECUTOR_CATALOG.find((d) => d.id === targetId)?.label ?? cleanCli,
      enabled: true,
      models: [cleanModel],
      catalog: [cleanModel],
      ...(spec
        ? {
            efforts: { [cleanModel]: [...spec.efforts] },
            effortSources: { [cleanModel]: spec.source },
          }
        : {}),
    });
  }

  const seen = ws.seenExecutors.filter(
    (s) =>
      !(
        s.cli.trim().toLowerCase() === cleanCli.toLowerCase() &&
        s.model.trim().toLowerCase() === cleanModel.toLowerCase()
      ),
  );

  await db()
    .update(workspace)
    .set({ executors: config, seenExecutors: seen })
    .where(eq(workspace.id, ws.id));
  revalidatePath("/settings");
  return { ok: true };
}
