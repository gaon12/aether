"use client";

import type { TimeseriesDataPoint } from "@/components/ui/TimeseriesChart";
import {
  buildSearchParams,
  useDashboardQuery,
} from "@/features/dashboard/useDashboardQuery";

interface HourlyMetricRow {
  time: string;
  success: number;
  failed: number;
  ignored: number;
  prompt_injection: number;
  total: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
}

interface MetricsFilter {
  from?: string;
  to?: string;
}

const EMPTY_TIMESERIES_DATA: TimeseriesDataPoint[] = [];

function formatBucketLabel(isoStr: string): string {
  const d = new Date(isoStr);
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  return `${mo}-${dd} ${hh}:00`;
}

export function useHourlyMetrics(filter: MetricsFilter = {}) {
  return useDashboardQuery<TimeseriesDataPoint[]>({
    initialData: EMPTY_TIMESERIES_DATA,
    deps: [filter.from, filter.to],
    fetcher: async (signal) => {
      const params = buildSearchParams({
        from: filter.from,
        to: filter.to,
      });
      const query = params.toString();
      const res = await fetch(
        query
          ? `/api/dashboard/metrics/hourly?${query}`
          : "/api/dashboard/metrics/hourly",
        { signal },
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = (await res.json()) as { data: HourlyMetricRow[] };
      return json.data.map((r) => ({
        time: formatBucketLabel(r.time),
        success: r.success,
        failed: r.failed,
        ignored: r.ignored,
        prompt_injection: r.prompt_injection,
        total: r.total,
      }));
    },
  });
}
