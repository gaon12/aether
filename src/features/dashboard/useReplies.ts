"use client";

import {
  buildSearchParams,
  useDashboardQuery,
} from "@/features/dashboard/useDashboardQuery";

export interface ReplyRow {
  reply_id: string;
  request_id: string;
  reply_text: string;
  publish_status: "pending" | "succeeded" | "failed";
  publish_error_code: string | null;
  published_at: string | null;
  created_at: string;
  source_text: string | null;
  command_raw: string;
  command_type: string | null;
  request_status: string;
  model_name: string | null;
}

export interface RepliesResponse {
  data: ReplyRow[];
  total: number;
  page: number;
  limit: number;
}

interface RepliesFilter {
  page?: number;
  limit?: number;
  request_id?: string;
  publish_status?: string;
  command_type?: string;
  search?: string;
  from?: string;
  to?: string;
}

const EMPTY_REPLIES_RESULT = null as RepliesResponse | null;

export function useReplies(filter: RepliesFilter = {}) {
  const queryState = useDashboardQuery<RepliesResponse | null>({
    initialData: EMPTY_REPLIES_RESULT,
    deps: [
      filter.page,
      filter.limit,
      filter.request_id,
      filter.publish_status,
      filter.command_type,
      filter.search,
      filter.from,
      filter.to,
    ],
    fetcher: async (signal) => {
      const params = buildSearchParams({
        page: filter.page,
        limit: filter.limit,
        request_id: filter.request_id,
        publish_status: filter.publish_status,
        command_type: filter.command_type,
        search: filter.search,
        from: filter.from,
        to: filter.to,
      });
      const query = params.toString();
      const res = await fetch(
        query ? `/api/dashboard/replies?${query}` : "/api/dashboard/replies",
        { signal },
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return (await res.json()) as RepliesResponse;
    },
  });

  return {
    result: queryState.data,
    loading: queryState.loading,
    error: queryState.error,
    refresh: queryState.refresh,
  };
}
