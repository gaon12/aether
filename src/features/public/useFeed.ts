"use client";

import { useDashboardQuery } from "@/features/dashboard/useDashboardQuery";

export interface FeedEntry {
  reply_id: string;
  reply_text: string;
  published_at: string | null;
  command_type: string | null;
  source_language: string | null;
  target_language: string | null;
  source_text: string | null;
}

export interface FeedResponse {
  data: FeedEntry[];
  total: number;
  page: number;
  limit: number;
}

export function useFeed(page = 1, refreshInterval = 30_000) {
  return useDashboardQuery<FeedResponse | null>({
    initialData: null,
    pollIntervalMs: refreshInterval,
    deps: [page, refreshInterval],
    fetcher: async (signal) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      const res = await fetch(`/api/public/feed?${params}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as FeedResponse;
    },
  });
}
