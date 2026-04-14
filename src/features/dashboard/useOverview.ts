"use client";

import { useDashboardQuery } from "@/features/dashboard/useDashboardQuery";

export interface OverviewData {
  uptime_seconds: number;
  recent_success_count: number;
  recent_failed_count: number;
  recent_ignored_count: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  worker_status: "online" | "offline" | "warning" | "unknown";
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

const EMPTY_OVERVIEW_DATA = null as OverviewData | null;

export function useOverview(refreshInterval = 30_000) {
  return useDashboardQuery<OverviewData | null>({
    initialData: EMPTY_OVERVIEW_DATA,
    pollIntervalMs: refreshInterval,
    deps: [refreshInterval],
    fetcher: async (signal) => {
      const res = await fetch("/api/dashboard/overview", { signal });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return (await res.json()) as OverviewData;
    },
  });
}

export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
