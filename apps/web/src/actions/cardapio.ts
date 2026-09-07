"use server";

import { cardapioEntry } from "@pilotdeck/db";
import { revalidatePath } from "next/cache";
import { getSession } from "../lib/cookies";
import { db } from "../lib/db";
import type { ActionResult } from "../lib/action-result";

export type CardapioInput = {
  activityType: string;
  cli: string | null;
  model: string | null;
  /** Line of succession, best first, `model` as its head. */
  chain?: string[] | null;
  effort: string;
};

const EFFORTS = new Set(["low", "medium", "high"]);

/** The declared line, best first, without repeats and without blanks. */
function declaredChain(entry: CardapioInput): string[] {
  const out: string[] = [];
  for (const name of [entry.model, ...(entry.chain ?? [])]) {
    const trimmed = name?.trim();
    if (!trimmed) continue;
    if (out.some((seen) => seen.toLowerCase() === trimmed.toLowerCase())) continue;
    out.push(trimmed);
  }
  return out;
}

/** Upsert of the real policy (cardapio_entry) by activity type. */
export async function saveCardapioAction(entries: CardapioInput[]): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Session expired. Sign in again." };

  const ws = await db().query.workspace.findFirst();
  if (!ws) return { ok: false, error: "Workspace not found." };

  for (const e of entries) {
    if (!e.activityType || !EFFORTS.has(e.effort)) {
      return { ok: false, error: "Invalid policy row." };
    }
  }

  // Same trail the MCP harness_set writes: whoever touched the line last, and
  // when. Settings shows it next to the row.
  const updatedAt = new Date();
  for (const e of entries) {
    const chain = declaredChain(e);
    // One model is not a chain: null keeps the column meaningful and the row
    // identical to what every pre-chain writer produced.
    const stored = chain.length > 1 ? chain : null;
    await db()
      .insert(cardapioEntry)
      .values({
        workspaceId: ws.id,
        activityType: e.activityType,
        cli: e.cli || null,
        model: chain[0] ?? null,
        chain: stored,
        effort: e.effort,
        updatedBy: session.email,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: [cardapioEntry.workspaceId, cardapioEntry.activityType],
        set: {
          cli: e.cli || null,
          model: chain[0] ?? null,
          chain: stored,
          effort: e.effort,
          updatedBy: session.email,
          updatedAt,
        },
      });
  }
  revalidatePath("/settings");
  return { ok: true };
}
