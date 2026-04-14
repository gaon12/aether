"use client";

import {
  buildSearchParams,
  useDashboardQuery,
} from "@/features/dashboard/useDashboardQuery";
import type { PromptInjectionEventsTable } from "@/types/db";

interface InjectionPattern {
  reason: string;
  count: number;
}

interface InjectionScoreDistributionItem {
  bucket: "low" | "medium" | "high";
  label: string;
  count: number;
}

interface InjectionStats {
  total_count: number;
  high_risk: number;
  mid_risk: number;
  low_risk: number;
  top_patterns: InjectionPattern[];
  score_distribution: InjectionScoreDistributionItem[];
}

export interface InjectionResponse {
  data: PromptInjectionEventsTable[];
  total: number;
  page: number;
  limit: number;
  stats: InjectionStats;
}

interface InjectionFilter {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

const EMPTY_INJECTION_RESULT = null as InjectionResponse | null;

export function usePromptInjections(filter: InjectionFilter = {}) {
  const queryState = useDashboardQuery<InjectionResponse | null>({
    initialData: EMPTY_INJECTION_RESULT,
    deps: [filter.page, filter.limit, filter.from, filter.to],
    fetcher: async (signal) => {
      const params = buildSearchParams({
        page: filter.page,
        limit: filter.limit,
        from: filter.from,
        to: filter.to,
      });
      const query = params.toString();
      const res = await fetch(
        query
          ? `/api/dashboard/prompt-injections?${query}`
          : "/api/dashboard/prompt-injections",
        { signal },
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return (await res.json()) as InjectionResponse;
    },
  });

  return {
    result: queryState.data,
    loading: queryState.loading,
    error: queryState.error,
    refresh: queryState.refresh,
  };
}
