"use client";

import { useDashboardQuery } from "@/features/dashboard/useDashboardQuery";

export interface HealthData {
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

export function useHealth(refreshInterval = 30_000) {
  return useDashboardQuery<HealthData | null>({
    initialData: null,
    pollIntervalMs: refreshInterval,
    deps: [refreshInterval],
    fetcher: async (signal) => {
      const res = await fetch("/api/dashboard/health", { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as HealthData;
    },
  });
}
