"use client";

import {
  buildSearchParams,
  useDashboardQuery,
} from "@/features/dashboard/useDashboardQuery";

export interface ParseFailureReason {
  reason: string;
  count: number;
}

export interface CommandQualityData {
  invalid_command_count: number;
  invalid_command_rate: number;
  parse_failure_reasons: ParseFailureReason[];
  duplicate_request_count: number;
  top_typo_patterns: { pattern: string; count: number }[];
  top_typos: { token: string; count: number }[];
}

interface Filter {
  from?: string;
  to?: string;
}

const EMPTY_COMMAND_QUALITY_DATA = null as CommandQualityData | null;

export function useCommandQuality(filter: Filter = {}) {
  return useDashboardQuery<CommandQualityData | null>({
    initialData: EMPTY_COMMAND_QUALITY_DATA,
    deps: [filter.from, filter.to],
    fetcher: async (signal) => {
      const params = buildSearchParams({
        from: filter.from,
        to: filter.to,
      });
      const query = params.toString();
      const res = await fetch(
        query
          ? `/api/dashboard/command-quality?${query}`
          : "/api/dashboard/command-quality",
        { signal },
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return (await res.json()) as CommandQualityData;
    },
  });
}
