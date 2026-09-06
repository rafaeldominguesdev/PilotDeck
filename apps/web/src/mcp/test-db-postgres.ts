import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, workspace } from "@pilotdeck/db";
import type { McpDatabase } from "./types";

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(here, "../../../../packages/db/drizzle");

export type RealPostgresWorld = {
  db: McpDatabase;
  workspaceId: string;
};

/**
 * The one thing PGlite cannot stand in for: whether postgres-js — what
 * production actually runs — accepts a query. OCL-109 shipped because the
 * whole integration suite ran on PGlite, which tolerates a `Date` bound
 * into `sql`; postgres-js refuses it and every real pairing answered 500
 * while this suite stayed green (see pairing.ts and pairing.integration.test.ts).
 *
 * Migrations hardcode the "public" schema (drizzle-kit always emits it), so
 * a search_path swap cannot isolate one test's tables from another's the
 * way PGlite's one-process-per-world does. A fresh database per world is
 * what actually isolates them here.
 */
function adminUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required to run against real Postgres. Point it at a " +
        "throwaway server (see .github/workflows/ci.yml) — never at a database " +
        "with data worth keeping, since worlds are created and dropped freely.",
    );
  }
  return url;
}

function withDatabaseName(base: string, name: string): string {
  const url = new URL(base);
  url.pathname = `/${name}`;
  return url.toString();
}

export async function createRealPostgresWorld(): Promise<
  RealPostgresWorld & { close: () => Promise<void> }
> {
  const base = adminUrl();
  const dbName = `test_${randomUUID().replace(/-/g, "")}`;

  const admin = createDb(base);
  try {
    await admin.sql.unsafe(`CREATE DATABASE "${dbName}"`);
  } finally {
    await admin.sql.end();
  }

  const { db: fullDb, sql } = createDb(withDatabaseName(base, dbName));

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const content = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
    for (const statement of content.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) await sql.unsafe(trimmed);
    }
  }

  const db = fullDb as unknown as McpDatabase;

  const [ws] = await fullDb
    .insert(workspace)
    .values({ name: "PilotDeck Real Postgres Test" })
    .returning({ id: workspace.id });
  if (!ws) throw new Error("failed to insert workspace");

  const close = async () => {
    await sql.end();
    const cleanup = createDb(base);
    try {
      await cleanup.sql.unsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    } finally {
      await cleanup.sql.end();
    }
  };

  return { db, workspaceId: ws.id, close };
}
