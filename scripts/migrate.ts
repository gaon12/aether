import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { ensureBootstrapEnv } from "@/server/env/bootstrap";
import {
  DEFAULT_BASE_SYSTEM_PROMPT,
  DEFAULT_BASE_SYSTEM_PROMPT_NAME,
  DEFAULT_SUMMARY_SYSTEM_PROMPT,
  DEFAULT_TRANSLATE_SUMMARY_SYSTEM_PROMPT,
  DEFAULT_TRANSLATE_SYSTEM_PROMPT,
  LEGACY_BASE_SYSTEM_PROMPT_NAMES,
  LEGACY_BASE_SYSTEM_PROMPTS,
  LEGACY_SUMMARY_SYSTEM_PROMPTS,
  LEGACY_TRANSLATE_SUMMARY_SYSTEM_PROMPTS,
  LEGACY_TRANSLATE_SYSTEM_PROMPTS,
} from "@/server/llm/default-prompts";

ensureBootstrapEnv();

const DB_PATH = process.env.SQLITE_DB_PATH || "data/aether.db";

const LEGACY_PROMPT_SETTING_MAP = {
  baseSystemPromptName: {
    legacyValues: new Set<string>(LEGACY_BASE_SYSTEM_PROMPT_NAMES),
    nextValue: DEFAULT_BASE_SYSTEM_PROMPT_NAME,
  },
  baseSystemPrompt: {
    legacyValues: new Set<string>(LEGACY_BASE_SYSTEM_PROMPTS),
    nextValue: DEFAULT_BASE_SYSTEM_PROMPT,
  },
  translateSystemPrompt: {
    legacyValues: new Set<string>(LEGACY_TRANSLATE_SYSTEM_PROMPTS),
    nextValue: DEFAULT_TRANSLATE_SYSTEM_PROMPT,
  },
  summarySystemPrompt: {
    legacyValues: new Set<string>(LEGACY_SUMMARY_SYSTEM_PROMPTS),
    nextValue: DEFAULT_SUMMARY_SYSTEM_PROMPT,
  },
  translateSummarySystemPrompt: {
    legacyValues: new Set<string>(LEGACY_TRANSLATE_SUMMARY_SYSTEM_PROMPTS),
    nextValue: DEFAULT_TRANSLATE_SUMMARY_SYSTEM_PROMPT,
  },
} as const;

function ensureDataDirectory() {
  const dataDirectory = path.join(process.cwd(), "data");
  if (!existsSync(dataDirectory)) {
    mkdirSync(dataDirectory, { recursive: true });
  }
}

function hasColumn(
  db: Database.Database,
  tableName: string,
  columnName: string,
) {
  const tableInfo = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{
    name: string;
  }>;

  return tableInfo.some((column) => column.name === columnName);
}

function upgradeLegacyPromptSettings(db: Database.Database) {
  const now = new Date().toISOString();
  const selectStatement = db.prepare(`
    SELECT value_json
    FROM app_settings
    WHERE setting_key = ?
  `);
  const updateStatement = db.prepare(`
    UPDATE app_settings
    SET value_json = ?, updated_at = ?
    WHERE setting_key = ?
  `);

  for (const [settingKey, config] of Object.entries(
    LEGACY_PROMPT_SETTING_MAP,
  )) {
    const row = selectStatement.get(settingKey) as
      | {
          value_json: string;
        }
      | undefined;

    if (!row) {
      continue;
    }

    let parsedValue: unknown;
    try {
      parsedValue = JSON.parse(row.value_json);
    } catch {
      continue;
    }

    if (
      typeof parsedValue === "string" &&
      config.legacyValues.has(parsedValue)
    ) {
      updateStatement.run(JSON.stringify(config.nextValue), now, settingKey);
    }
  }
}

function migrate() {
  console.log(`Starting migration... DB_PATH: ${DB_PATH}`);

  ensureDataDirectory();

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS threads_accounts (
      account_id TEXT PRIMARY KEY,
      threads_user_id TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      access_token_encrypted TEXT NOT NULL,
      token_expires_at TEXT NOT NULL,
      token_last_checked_at TEXT NOT NULL,
      token_last_refreshed_at TEXT NOT NULL,
      scopes_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      webhook_event_id TEXT PRIMARY KEY,
      provider_event_key TEXT UNIQUE NOT NULL,
      raw_payload_json TEXT NOT NULL,
      signature_valid INTEGER NOT NULL DEFAULT 0,
      received_at TEXT NOT NULL,
      processed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS requests (
      request_id TEXT PRIMARY KEY,
      webhook_event_id TEXT NOT NULL,
      target_threads_user_id TEXT,
      source_media_id TEXT NOT NULL,
      source_author_id TEXT NOT NULL,
      source_text TEXT,
      source_language TEXT,
      command_raw TEXT NOT NULL,
      command_type TEXT,
      target_language TEXT,
      summary_length INTEGER,
      request_status TEXT NOT NULL,
      ignore_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      processed_at TEXT,
      FOREIGN KEY (webhook_event_id) REFERENCES webhook_events (webhook_event_id)
    );

    CREATE TABLE IF NOT EXISTS replies (
      reply_id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      reply_to_id TEXT NOT NULL,
      reply_container_id TEXT,
      reply_media_id TEXT,
      reply_text TEXT NOT NULL,
      publish_status TEXT NOT NULL,
      publish_error_code TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES requests (request_id)
    );

    CREATE TABLE IF NOT EXISTS prompt_injection_events (
      prompt_injection_event_id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      score REAL NOT NULL,
      reason TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES requests (request_id)
    );

    CREATE TABLE IF NOT EXISTS llm_runs (
      llm_run_id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      model_name TEXT NOT NULL,
      prompt_kind TEXT,
      prompt_profile_name TEXT,
      system_prompt_token_count INTEGER,
      base_prompt_token_count INTEGER,
      task_prompt_token_count INTEGER,
      started_at TEXT NOT NULL,
      first_token_at TEXT,
      completed_at TEXT,
      duration_ms INTEGER,
      first_token_latency_ms INTEGER,
      input_token_count INTEGER,
      output_token_count INTEGER,
      output_tokens_per_second REAL,
      stream_chunk_count INTEGER,
      reasoning_token_count INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (request_id) REFERENCES requests (request_id)
    );

    CREATE TABLE IF NOT EXISTS worker_heartbeats (
      worker_run_id TEXT PRIMARY KEY,
      hostname TEXT NOT NULL,
      pid INTEGER NOT NULL,
      status TEXT NOT NULL,
      heartbeat_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS metrics_hourly (
      bucket_start TEXT PRIMARY KEY,
      total_requests INTEGER NOT NULL DEFAULT 0,
      valid_requests INTEGER NOT NULL DEFAULT 0,
      invalid_requests INTEGER NOT NULL DEFAULT 0,
      ignored_requests INTEGER NOT NULL DEFAULT 0,
      success_count INTEGER NOT NULL DEFAULT 0,
      failure_count INTEGER NOT NULL DEFAULT 0,
      prompt_injection_count INTEGER NOT NULL DEFAULT 0,
      avg_latency_ms REAL NOT NULL DEFAULT 0,
      p95_latency_ms REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      admin_user_id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS token_refresh_events (
      token_refresh_event_id TEXT PRIMARY KEY,
      threads_user_id TEXT NOT NULL,
      result TEXT NOT NULL,
      error_message TEXT,
      old_expires_at TEXT,
      new_expires_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (threads_user_id) REFERENCES threads_accounts (threads_user_id)
    );
  `);

  if (!hasColumn(db, "requests", "retry_count")) {
    db.exec(`
      ALTER TABLE requests
      ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
    `);
  }

  if (!hasColumn(db, "requests", "reply_to_id")) {
    db.exec(`
      ALTER TABLE requests
      ADD COLUMN reply_to_id TEXT;
    `);
  }

  if (!hasColumn(db, "requests", "target_threads_user_id")) {
    db.exec(`
      ALTER TABLE requests
      ADD COLUMN target_threads_user_id TEXT;
    `);
  }

  if (!hasColumn(db, "llm_runs", "reasoning_token_count")) {
    db.exec(`
      ALTER TABLE llm_runs
      ADD COLUMN reasoning_token_count INTEGER;
    `);
  }

  if (!hasColumn(db, "llm_runs", "prompt_kind")) {
    db.exec(`
      ALTER TABLE llm_runs
      ADD COLUMN prompt_kind TEXT;
    `);
  }

  if (!hasColumn(db, "llm_runs", "prompt_profile_name")) {
    db.exec(`
      ALTER TABLE llm_runs
      ADD COLUMN prompt_profile_name TEXT;
    `);
  }

  if (!hasColumn(db, "llm_runs", "system_prompt_token_count")) {
    db.exec(`
      ALTER TABLE llm_runs
      ADD COLUMN system_prompt_token_count INTEGER;
    `);
  }

  if (!hasColumn(db, "llm_runs", "base_prompt_token_count")) {
    db.exec(`
      ALTER TABLE llm_runs
      ADD COLUMN base_prompt_token_count INTEGER;
    `);
  }

  if (!hasColumn(db, "llm_runs", "task_prompt_token_count")) {
    db.exec(`
      ALTER TABLE llm_runs
      ADD COLUMN task_prompt_token_count INTEGER;
    `);
  }

  db.exec(`
    UPDATE llm_runs
    SET prompt_kind = COALESCE(
      prompt_kind,
      (
        SELECT command_type
        FROM requests
        WHERE requests.request_id = llm_runs.request_id
      )
    )
    WHERE prompt_kind IS NULL;

    UPDATE llm_runs
    SET prompt_profile_name = 'legacy'
    WHERE prompt_profile_name IS NULL;
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests (request_status);
    CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests (created_at);
    CREATE INDEX IF NOT EXISTS idx_requests_command_type ON requests (command_type);
    CREATE INDEX IF NOT EXISTS idx_requests_source_media ON requests (source_media_id);
    CREATE INDEX IF NOT EXISTS idx_requests_target_threads_user_id ON requests (target_threads_user_id);
    CREATE INDEX IF NOT EXISTS idx_requests_processed_at ON requests (processed_at);
    CREATE INDEX IF NOT EXISTS idx_llm_runs_request_id ON llm_runs (request_id);
    CREATE INDEX IF NOT EXISTS idx_llm_runs_prompt_kind ON llm_runs (prompt_kind);
    CREATE INDEX IF NOT EXISTS idx_llm_runs_prompt_profile_name ON llm_runs (prompt_profile_name);
    CREATE INDEX IF NOT EXISTS idx_replies_request_id ON replies (request_id);
    CREATE INDEX IF NOT EXISTS idx_pie_request_id ON prompt_injection_events (request_id);
    CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users (username);
    CREATE INDEX IF NOT EXISTS idx_token_refresh_events_user ON token_refresh_events (threads_user_id);
    CREATE INDEX IF NOT EXISTS idx_token_refresh_events_created ON token_refresh_events (created_at);
  `);

  upgradeLegacyPromptSettings(db);

  console.log("Migration completed successfully.");
  db.close();
}

migrate();
