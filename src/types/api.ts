import type { RequestStatus, RequestsTable } from "./db";

export interface OverviewApiResponse {
  uptime_seconds: number;
  recent_success_count: number;
  recent_failed_count: number;
  recent_ignored_count: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  worker_status: "online" | "offline" | "warning";
  worker_last_heartbeat: string | null;
  reply_quota_used: number;
  reply_quota_total: number;
  recent_errors: {
    id: string;
    time: string;
    message: string;
    status: string;
  }[];
}

export interface RequestsApiResponse {
  data: RequestsTable[];
  total: number;
  page: number;
  limit: number;
  stats: {
    command_distribution: { command_type: string | null; count: number }[];
    language_distribution: { target_language: string | null; count: number }[];
    source_language_distribution: {
      source_language: string | null;
      count: number;
    }[];
    ignored_short_text: number;
    ignored_image_only: number;
  };
}

export interface RequestListItem {
  request_id: string;
  command_raw: string;
  request_status: RequestStatus;
  created_at: string;
  source_author_id: string;
}

export interface ReplyListItem {
  reply_id: string;
  request_id: string;
  publish_status: "pending" | "succeeded" | "failed";
  published_at: string | null;
  reply_text: string;
}

export interface PromptInjectionListItem {
  prompt_injection_event_id: string;
  request_id: string;
  score: number;
  reason: string;
  excerpt: string;
  created_at: string;
}

export interface PromptInjectionApiResponse {
  data: PromptInjectionListItem[];
  total: number;
  page: number;
  limit: number;
  stats: {
    total_count: number;
    high_risk: number;
    mid_risk: number;
    low_risk: number;
    top_patterns: { reason: string; count: number }[];
    score_distribution: {
      bucket: "low" | "medium" | "high";
      label: string;
      count: number;
    }[];
  };
}

export interface HealthStatus {
  threads: {
    status: "valid" | "expiring" | "expired" | "missing";
    username: string | null;
    token_expires_at: string | null;
    last_checked_at: string | null;
    last_refreshed_at: string | null;
    api_connection_status: "reachable" | "unreachable" | "not_checked";
    api_connection_checked_at: string | null;
    api_connection_error: string | null;
  };
  webhook: {
    last_received_at: string | null;
    last_signature_valid: boolean;
  };
  worker: {
    status: "online" | "offline" | "warning";
    last_heartbeat: string | null;
    hostname: string | null;
    pid: number | null;
  };
  database: {
    path_masked: string;
    size_bytes: number | null;
    size_human: string | null;
    status: "ok" | "not_found";
  };
}

export interface CommandQualityApiResponse {
  invalid_command_count: number;
  invalid_command_rate: number;
  parse_failure_reasons: { reason: string; count: number }[];
  duplicate_request_count: number;
  top_typo_patterns: { pattern: string; count: number }[];
  top_typos: { token: string; count: number }[];
}

export interface RequestDetailApiResponse {
  request: RequestsTable;
  llm_run: {
    llm_run_id: string;
    model_name: string;
    started_at: string;
    completed_at: string | null;
    duration_ms: number | null;
    first_token_latency_ms: number | null;
    input_token_count: number | null;
    output_token_count: number | null;
    output_tokens_per_second: number | null;
    stream_chunk_count: number | null;
  } | null;
}
