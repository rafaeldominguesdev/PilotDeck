import { createDb, type Database } from "@pilotdeck/db";

let cached: ReturnType<typeof createDb> | null = null;

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  return url;
}

export function db(): Database {
  if (!cached) {
    cached = createDb(getDatabaseUrl());
  }
  return cached.db;
}
