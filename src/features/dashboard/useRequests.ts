"use client";

import { useState } from "react";

import {
  buildSearchParams,
  useDashboardQuery,
} from "@/features/dashboard/useDashboardQuery";
import type { RequestsTable } from "@/types/db";

interface CommandDist {
  command_type: string;
  count: number;
}
interface LangDist {
  target_language: string;
  count: number;
}
interface SourceLangDist {
  source_language: string;
  count: number;
}

interface RequestsStats {
  command_distribution: CommandDist[];
  language_distribution: LangDist[];
  source_language_distribution: SourceLangDist[];
  ignored_short_text: number;
  ignored_image_only: number;
}

export interface RequestsResponse {
  data: RequestsTable[];
  total: number;
  page: number;
  limit: number;
  stats: RequestsStats;
}

interface RequestsFilter {
  page?: number;
  limit?: number;
  status?: string;
  command_type?: string;
  from?: string;
  to?: string;
}

const EMPTY_REQUESTS_RESULT = null as RequestsResponse | null;

export function useRequests(filter: RequestsFilter = {}) {
  const [lastUpdatedAt, setLastUpdated] = useState<Date | null>(null);
  const queryState = useDashboardQuery<RequestsResponse | null>({
    initialData: EMPTY_REQUESTS_RESULT,
    deps: [
      filter.page,
      filter.limit,
      filter.status,
      filter.command_type,
      filter.from,
      filter.to,
    ],
    fetcher: async (signal) => {
      const params = buildSearchParams({
        page: filter.page,
        limit: filter.limit,
        status: filter.status,
        command_type: filter.command_type,
        from: filter.from,
        to: filter.to,
      });
      const query = params.toString();
      const res = await fetch(
        query ? `/api/dashboard/requests?${query}` : "/api/dashboard/requests",
        { signal },
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const nextResult = (await res.json()) as RequestsResponse;
      setLastUpdated(new Date());
      return nextResult;
    },
  });

  return {
    result: queryState.data,
    loading: queryState.loading,
    error: queryState.error,
    refresh: queryState.refresh,
    lastUpdatedAt,
  };
}
