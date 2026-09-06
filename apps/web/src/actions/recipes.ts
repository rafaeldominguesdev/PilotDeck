"use server";

import { and, eq, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { factoryUsageRecipes, usageRecipe } from "@pilotdeck/db";
import type { ActionResult } from "../lib/action-result";
import { getSession } from "../lib/cookies";
import { db } from "../lib/db";

export type RecipeInput = {
  cli: string;
  label: string;
  instructions: string;
  command: string;
};

/**
 * Persists the usage collection recipes. Only rows that differ from what the
 * board ships are stored: a recipe edited back to the shipped text goes away
 * again, so "shipped with the board" never labels a human's words.
 */
export async function saveRecipesAction(
  rows: RecipeInput[],
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Session expired. Sign in again." };

  const ws = await db().query.workspace.findFirst();
  if (!ws) return { ok: false, error: "Workspace not found." };

  const factory = new Map(factoryUsageRecipes().map((row) => [row.cli, row]));
  const seen = new Set<string>();
  const custom: (RecipeInput & { yields: string })[] = [];

  for (const row of rows) {
    const cli = row.cli.trim();
    const seed = factory.get(cli);
    // Recipes are keyed by CLI: an id the board does not ship has nothing to
    // fall back to, so it is refused instead of stored where nobody reads it.
    if (!seed) {
      return { ok: false, error: `Unknown CLI '${cli || "(empty)"}' for a recipe.` };
    }
    if (seen.has(cli)) continue;
    seen.add(cli);
    const label = row.label.trim() || seed.label;
    const instructions = row.instructions.trim();
    if (!instructions) {
      return {
        ok: false,
        error: `The recipe for '${label}' needs instructions telling the agent what to do.`,
      };
    }
    const command = row.command.trim();
    const isFactory =
      label === seed.label &&
      instructions === seed.instructions.trim() &&
      command === seed.command.trim();
    if (!isFactory) {
      // A recipe with a command yields tokens per model; one without cannot.
      custom.push({
        cli,
        label,
        instructions,
        command,
        yields: command ? "tokens_per_model" : "no_tokens",
      });
    }
  }

  const keep = custom.map((row) => row.cli);
  await db()
    .delete(usageRecipe)
    .where(
      keep.length > 0
        ? and(eq(usageRecipe.workspaceId, ws.id), notInArray(usageRecipe.cli, keep))
        : eq(usageRecipe.workspaceId, ws.id),
    );

  for (const row of custom) {
    const values = {
      label: row.label,
      yields: row.yields,
      instructions: row.instructions,
      command: row.command,
      updatedBy: session.email,
      updatedAt: new Date(),
    };
    await db()
      .insert(usageRecipe)
      .values({ workspaceId: ws.id, cli: row.cli, ...values })
      .onConflictDoUpdate({
        target: [usageRecipe.workspaceId, usageRecipe.cli],
        set: values,
      });
  }

  revalidatePath("/settings");
  return { ok: true };
}
