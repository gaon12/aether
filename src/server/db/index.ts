import "@/server/lib/server-only";

import Database from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import { ensureBootstrapEnv } from "@/server/env/bootstrap";
import type { Database as DatabaseSchema } from "@/types/db";

function getDbPath() {
  ensureBootstrapEnv();
  return process.env.SQLITE_DB_PATH || "data/aether.db";
}

// Create a singleton instance of the database connection
let db: Kysely<DatabaseSchema> | null = null;

export function getDb(): Kysely<DatabaseSchema> {
  if (!db) {
    const nativeDb = new Database(getDbPath());
    // Enable WAL mode
    nativeDb.pragma("journal_mode = WAL");

    const dialect = new SqliteDialect({
      database: nativeDb,
    });

    db = new Kysely<DatabaseSchema>({
      dialect,
    });
  }
  return db;
}

// Helper for close connection (useful for scripts)
export async function closeDb() {
  if (db) {
    await db.destroy();
    db = null;
  }
}
