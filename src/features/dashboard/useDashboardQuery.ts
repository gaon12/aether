"use client";

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

export function buildSearchParams(
  params: Record<string, string | number | null | undefined>,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  return searchParams;
}

interface UseDashboardQueryOptions<TData> {
  deps?: ReadonlyArray<unknown>;
  enabled?: boolean;
  fetcher: (signal: AbortSignal) => Promise<TData>;
  initialData: TData;
  pollIntervalMs?: number;
}

export function useDashboardQuery<TData>({
  deps = [],
  enabled = true,
  fetcher,
  initialData,
  pollIntervalMs,
}: UseDashboardQueryOptions<TData>) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);
  const initialDataRef = useRef(initialData);
  const mountedRef = useRef(true);

  initialDataRef.current = initialData;

  const runQuery = useEffectEvent(async (showLoading: boolean) => {
    if (!enabled) {
      return;
    }

    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;

    if (showLoading) {
      setLoading(true);
    }

    try {
      const nextData = await fetcher(controller.signal);
      if (controller.signal.aborted || !mountedRef.current) {
        return;
      }

      startTransition(() => {
        setData(nextData);
        setError(null);
      });
    } catch (error) {
      if (controller.signal.aborted || !mountedRef.current) {
        return;
      }

      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      if (mountedRef.current && !controller.signal.aborted && showLoading) {
        setLoading(false);
      }

      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
      }
    }
  });

  async function refresh() {
    await runQuery(true);
  }

  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      activeControllerRef.current?.abort();
      setData(initialDataRef.current);
      setError(null);
      setLoading(false);
      return;
    }

    void runQuery(true);

    if (!pollIntervalMs) {
      return () => {
        activeControllerRef.current?.abort();
      };
    }

    const intervalId = window.setInterval(() => {
      void runQuery(false);
    }, pollIntervalMs);

    return () => {
      window.clearInterval(intervalId);
      activeControllerRef.current?.abort();
    };
  }, [enabled, pollIntervalMs, ...deps, runQuery]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      activeControllerRef.current?.abort();
    };
  }, []);

  return { data, loading, error, refresh };
}
