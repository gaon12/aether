import type {
  LlmRunsTable,
  MetricsHourlyTable,
  PromptInjectionEventsTable,
  RepliesTable,
  RequestsTable,
} from "@/types/db";

export interface MetricsBackfillDataset {
  llmRuns: LlmRunsTable[];
  promptInjectionEvents: PromptInjectionEventsTable[];
  replies: RepliesTable[];
  requests: RequestsTable[];
}

function truncateToHour(isoString: string) {
  const date = new Date(isoString);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function calculateP95(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sortedValues.length - 1,
    Math.ceil(sortedValues.length * 0.95) - 1,
  );
  return sortedValues[index] ?? 0;
}

export function buildHourlyMetrics(
  dataset: MetricsBackfillDataset,
): MetricsHourlyTable[] {
  const grouped = new Map<string, MetricsHourlyTable>();

  const getOrCreateBucket = (bucketStart: string) => {
    const existing = grouped.get(bucketStart);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const nextBucket: MetricsHourlyTable = {
      bucket_start: bucketStart,
      total_requests: 0,
      valid_requests: 0,
      invalid_requests: 0,
      ignored_requests: 0,
      success_count: 0,
      failure_count: 0,
      prompt_injection_count: 0,
      avg_latency_ms: 0,
      p95_latency_ms: 0,
      created_at: now,
      updated_at: now,
    };
    grouped.set(bucketStart, nextBucket);
    return nextBucket;
  };

  for (const request of dataset.requests) {
    const bucket = getOrCreateBucket(truncateToHour(request.created_at));
    bucket.total_requests += 1;

    if (request.request_status === "ignored") {
      bucket.ignored_requests += 1;
    }

    if (request.command_type) {
      bucket.valid_requests += 1;
    } else {
      bucket.invalid_requests += 1;
    }
  }

  for (const reply of dataset.replies) {
    const bucket = getOrCreateBucket(truncateToHour(reply.created_at));
    if (reply.publish_status === "succeeded") {
      bucket.success_count += 1;
    } else if (reply.publish_status === "failed") {
      bucket.failure_count += 1;
    }
  }

  for (const event of dataset.promptInjectionEvents) {
    const bucket = getOrCreateBucket(truncateToHour(event.created_at));
    bucket.prompt_injection_count += 1;
  }

  const llmRunsByBucket = new Map<string, number[]>();
  for (const run of dataset.llmRuns) {
    if (run.duration_ms === null) {
      continue;
    }

    const bucketStart = truncateToHour(run.started_at);
    const durations = llmRunsByBucket.get(bucketStart) ?? [];
    durations.push(run.duration_ms);
    llmRunsByBucket.set(bucketStart, durations);
  }

  for (const [bucketStart, durations] of llmRunsByBucket) {
    const bucket = getOrCreateBucket(bucketStart);
    const totalDuration = durations.reduce(
      (sum, duration) => sum + duration,
      0,
    );
    bucket.avg_latency_ms = Number(
      (totalDuration / durations.length).toFixed(2),
    );
    bucket.p95_latency_ms = calculateP95(durations);
    bucket.updated_at = new Date().toISOString();
  }

  return Array.from(grouped.values()).sort((left, right) =>
    left.bucket_start.localeCompare(right.bucket_start),
  );
}
