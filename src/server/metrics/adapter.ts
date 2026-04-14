import { getDb } from "@/server/db";
import type {
  buildHourlyMetrics,
  MetricsBackfillDataset,
} from "@/server/metrics/hourly";
import type { MetricsHourlyTable } from "@/types/db";

export async function loadDataset(): Promise<MetricsBackfillDataset> {
  const db = getDb();

  const [llmRuns, promptInjectionEvents, replies, requests] = await Promise.all(
    [
      db.selectFrom("llm_runs").selectAll().execute(),
      db.selectFrom("prompt_injection_events").selectAll().execute(),
      db.selectFrom("replies").selectAll().execute(),
      db.selectFrom("requests").selectAll().execute(),
    ],
  );

  return {
    llmRuns,
    promptInjectionEvents,
    replies,
    requests,
  };
}

export async function saveMetrics(
  metrics: ReturnType<typeof buildHourlyMetrics>,
): Promise<void> {
  const db = getDb();

  for (const metric of metrics) {
    await upsertHourlyMetric(metric);
  }

  async function upsertHourlyMetric(metric: MetricsHourlyTable) {
    await db
      .insertInto("metrics_hourly")
      .values(metric)
      .onConflict((oc) =>
        oc.column("bucket_start").doUpdateSet({
          total_requests: metric.total_requests,
          valid_requests: metric.valid_requests,
          invalid_requests: metric.invalid_requests,
          ignored_requests: metric.ignored_requests,
          success_count: metric.success_count,
          failure_count: metric.failure_count,
          prompt_injection_count: metric.prompt_injection_count,
          avg_latency_ms: metric.avg_latency_ms,
          p95_latency_ms: metric.p95_latency_ms,
          updated_at: metric.updated_at,
        }),
      )
      .execute();
  }
}
