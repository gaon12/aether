/**
 * Database Type Definitions
 * Following Doc.md Section 10
 */

export interface Database {
  threads_accounts: ThreadsAccountsTable;
  webhook_events: WebhookEventsTable;
  requests: RequestsTable;
  replies: RepliesTable;
  prompt_injection_events: PromptInjectionEventsTable;
  llm_runs: LlmRunsTable;
  worker_heartbeats: WorkerHeartbeatsTable;
  metrics_hourly: MetricsHourlyTable;
  token_refresh_events: TokenRefreshEventsTable;
  admin_users: AdminUsersTable;
  app_settings: AppSettingsTable;
}

export interface ThreadsAccountsTable {
  account_id: string; // UUIDv7
  threads_user_id: string;
  username: string;
  access_token_encrypted: string;
  token_expires_at: string; // ISO 8601
  token_last_checked_at: string; // ISO 8601
  token_last_refreshed_at: string; // ISO 8601
  scopes_json: string; // JSON string
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface WebhookEventsTable {
  webhook_event_id: string; // UUIDv7
  provider_event_key: string;
  raw_payload_json: string; // JSON string
  signature_valid: number; // 0 or 1
  received_at: string; // ISO 8601
  processed_at: string | null; // ISO 8601
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export type RequestStatus =
  | "received"
  | "queued"
  | "parsing"
  | "ignored"
  | "ready"
  | "running_llm"
  | "publishing_reply"
  | "succeeded"
  | "failed";

export interface RequestsTable {
  request_id: string; // UUIDv7
  webhook_event_id: string; // UUIDv7
  target_threads_user_id: string | null;
  source_media_id: string;
  source_author_id: string;
  source_text: string | null;
  source_language: string | null;
  command_raw: string;
  command_type: string | null;
  target_language: string | null;
  summary_length: number | null;
  retry_count: number;
  reply_to_id: string | null;
  request_status: RequestStatus;
  ignore_reason: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  processed_at: string | null; // ISO 8601
}

export interface RepliesTable {
  reply_id: string; // UUIDv7
  request_id: string; // UUIDv7
  reply_to_id: string;
  reply_container_id: string | null;
  reply_media_id: string | null;
  reply_text: string;
  publish_status: "pending" | "succeeded" | "failed";
  publish_error_code: string | null;
  published_at: string | null; // ISO 8601
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface PromptInjectionEventsTable {
  prompt_injection_event_id: string; // UUIDv7
  request_id: string; // UUIDv7
  score: number;
  reason: string;
  excerpt: string;
  created_at: string; // ISO 8601
}

export interface LlmRunsTable {
  llm_run_id: string; // UUIDv7
  request_id: string; // UUIDv7
  model_name: string;
  prompt_kind: string | null;
  prompt_profile_name: string | null;
  system_prompt_token_count: number | null;
  base_prompt_token_count: number | null;
  task_prompt_token_count: number | null;
  started_at: string; // ISO 8601
  first_token_at: string | null; // ISO 8601
  completed_at: string | null; // ISO 8601
  duration_ms: number | null;
  first_token_latency_ms: number | null;
  input_token_count: number | null;
  output_token_count: number | null;
  output_tokens_per_second: number | null;
  stream_chunk_count: number | null;
  reasoning_token_count: number | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface WorkerHeartbeatsTable {
  worker_run_id: string; // UUIDv7
  hostname: string;
  pid: number;
  status: string;
  heartbeat_at: string; // ISO 8601
  created_at: string; // ISO 8601
}

export interface MetricsHourlyTable {
  bucket_start: string; // ISO 8601 (truncated to hour)
  total_requests: number;
  valid_requests: number;
  invalid_requests: number;
  ignored_requests: number;
  success_count: number;
  failure_count: number;
  prompt_injection_count: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface TokenRefreshEventsTable {
  token_refresh_event_id: string; // UUIDv7
  threads_user_id: string;
  result: "success" | "failed";
  error_message: string | null;
  old_expires_at: string | null; // ISO 8601
  new_expires_at: string | null; // ISO 8601
  created_at: string; // ISO 8601
}

export interface AdminUsersTable {
  admin_user_id: string; // UUID
  username: string;
  password_hash: string;
  password_salt: string;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  last_login_at: string | null; // ISO 8601
}

export interface AppSettingsTable {
  setting_key: string;
  value_json: string; // JSON string
  updated_at: string; // ISO 8601
}
