"use client";

import { useDashboardQuery } from "@/features/dashboard/useDashboardQuery";
import type { RequestsTable } from "@/types/db";

export interface ModelBreakdown {
  model_name: string;
  runs: number;
  avg_ms: number;
  avg_tps: number;
}

export interface HourlyTrendPoint {
  time: string;
  avg_ms: number;
  count: number;
}

export interface PromptKindBreakdown {
  prompt_kind: string;
  runs: number;
  avg_ms: number;
  avg_input_tokens: number;
}

export interface PromptProfileBreakdown {
  prompt_profile_name: string;
  runs: number;
  avg_ms: number;
  avg_system_prompt_tokens: number;
}

export interface LlmStatsData {
  total_runs: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
  avg_tokens_per_second: number;
  avg_ttft_ms: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_reasoning_tokens: number;
  avg_reasoning_tokens: number;
  avg_system_prompt_tokens: number;
  avg_base_prompt_tokens: number;
  avg_task_prompt_tokens: number;
  by_model: ModelBreakdown[];
  by_prompt_kind: PromptKindBreakdown[];
  by_prompt_profile: PromptProfileBreakdown[];
  hourly_trend: HourlyTrendPoint[];
}

export interface RequestDetailLlmRun {
  llm_run_id: string;
  model_name: string;
  prompt_kind: string | null;
  prompt_profile_name: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  first_token_latency_ms: number | null;
  input_token_count: number | null;
  output_token_count: number | null;
  output_tokens_per_second: number | null;
  stream_chunk_count: number | null;
  reasoning_token_count: number | null;
  system_prompt_token_count: number | null;
  base_prompt_token_count: number | null;
  task_prompt_token_count: number | null;
}

export interface RequestDetailInjection {
  prompt_injection_event_id: string;
  score: number;
  reason: string;
  excerpt: string;
  created_at: string;
}

export interface RequestDetailResponse {
  request: RequestsTable;
  llm_run: RequestDetailLlmRun | null;
  prompt_injections: RequestDetailInjection[];
}

const EMPTY_LLM_STATS_DATA = null as LlmStatsData | null;
const EMPTY_REQUEST_DETAIL = null as RequestDetailResponse | null;

export function useLlmStats(refreshMs = 60_000) {
  return useDashboardQuery<LlmStatsData | null>({
    initialData: EMPTY_LLM_STATS_DATA,
    pollIntervalMs: refreshMs,
    deps: [refreshMs],
    fetcher: async (signal) => {
      const res = await fetch("/api/dashboard/llm-stats", { signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return (await res.json()) as LlmStatsData;
    },
  });
}

export function useRequestDetail(requestId: string | null) {
  const queryState = useDashboardQuery<RequestDetailResponse | null>({
    enabled: !!requestId,
    initialData: EMPTY_REQUEST_DETAIL,
    deps: [requestId],
    fetcher: async (signal) => {
      const res = await fetch(`/api/dashboard/requests/${requestId}`, {
        signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return (await res.json()) as RequestDetailResponse;
    },
  });

  return { data: queryState.data, loading: queryState.loading };
}
