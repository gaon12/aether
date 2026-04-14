import { sql } from "kysely";
import { NextResponse } from "next/server";

import { getDb } from "@/server/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const db = getDb();

  try {
    let query = db.selectFrom("llm_runs").where("duration_ms", "is not", null);

    if (from) query = query.where("started_at", ">=", from);
    if (to) query = query.where("started_at", "<=", to);

    // Aggregate stats
    const aggRows = await query
      .select(({ fn }) => [
        fn.count<number>("llm_run_id").as("total_runs"),
        fn.avg<number>("duration_ms").as("avg_duration_ms"),
        fn.avg<number>("input_token_count").as("avg_input_tokens"),
        fn.avg<number>("output_token_count").as("avg_output_tokens"),
        fn.avg<number>("output_tokens_per_second").as("avg_tokens_per_second"),
        fn.avg<number>("first_token_latency_ms").as("avg_ttft_ms"),
        fn
          .avg<number>("system_prompt_token_count")
          .as("avg_system_prompt_tokens"),
        fn.avg<number>("base_prompt_token_count").as("avg_base_prompt_tokens"),
        fn.avg<number>("task_prompt_token_count").as("avg_task_prompt_tokens"),
        sql<number>`SUM(output_token_count)`.as("total_output_tokens"),
        sql<number>`SUM(input_token_count)`.as("total_input_tokens"),
        sql<number>`SUM(reasoning_token_count)`.as("total_reasoning_tokens"),
        fn.avg<number>("reasoning_token_count").as("avg_reasoning_tokens"),
      ])
      .executeTakeFirst();

    // p95 duration
    const durationRows = await query
      .select("duration_ms")
      .orderBy("duration_ms", "asc")
      .execute();

    let p95DurationMs = 0;
    if (durationRows.length > 0) {
      const idx = Math.min(
        Math.floor(durationRows.length * 0.95),
        durationRows.length - 1,
      );
      p95DurationMs = durationRows[idx].duration_ms ?? 0;
    }

    // Model breakdown
    const byModel = await query
      .select(({ fn }) => [
        "model_name",
        fn.count<number>("llm_run_id").as("runs"),
        fn.avg<number>("duration_ms").as("avg_ms"),
        fn.avg<number>("output_tokens_per_second").as("avg_tps"),
      ])
      .groupBy("model_name")
      .orderBy("runs", "desc")
      .execute();

    const byPromptKind = await query
      .select(({ fn }) => [
        sql<string>`COALESCE(prompt_kind, 'legacy')`.as("prompt_kind"),
        fn.count<number>("llm_run_id").as("runs"),
        fn.avg<number>("duration_ms").as("avg_ms"),
        fn.avg<number>("input_token_count").as("avg_input_tokens"),
      ])
      .groupBy(sql`COALESCE(prompt_kind, 'legacy')`)
      .orderBy("runs", "desc")
      .execute();

    const byPromptProfile = await query
      .select(({ fn }) => [
        sql<string>`COALESCE(prompt_profile_name, 'legacy')`.as(
          "prompt_profile_name",
        ),
        fn.count<number>("llm_run_id").as("runs"),
        fn.avg<number>("duration_ms").as("avg_ms"),
        fn
          .avg<number>("system_prompt_token_count")
          .as("avg_system_prompt_tokens"),
      ])
      .groupBy(sql`COALESCE(prompt_profile_name, 'legacy')`)
      .orderBy("runs", "desc")
      .execute();

    // Recent 24 data points (hourly buckets)
    const recentTrend = await db
      .selectFrom("llm_runs")
      .select([
        sql<string>`strftime('%Y-%m-%dT%H:00:00Z', started_at)`.as("hour"),
        sql<number>`AVG(duration_ms)`.as("avg_ms"),
        sql<number>`COUNT(*)`.as("count"),
      ])
      .where("duration_ms", "is not", null)
      .where(
        "started_at",
        ">=",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .groupBy(sql`strftime('%Y-%m-%dT%H:00:00Z', started_at)`)
      .orderBy("hour", "asc")
      .execute();

    return NextResponse.json({
      total_runs: aggRows?.total_runs ?? 0,
      avg_duration_ms: Math.round(aggRows?.avg_duration_ms ?? 0),
      p95_duration_ms: Math.round(p95DurationMs),
      avg_input_tokens: Math.round(aggRows?.avg_input_tokens ?? 0),
      avg_output_tokens: Math.round(aggRows?.avg_output_tokens ?? 0),
      avg_tokens_per_second: Number(
        (aggRows?.avg_tokens_per_second ?? 0).toFixed(1),
      ),
      avg_ttft_ms: Math.round(aggRows?.avg_ttft_ms ?? 0),
      avg_system_prompt_tokens: Math.round(
        aggRows?.avg_system_prompt_tokens ?? 0,
      ),
      avg_base_prompt_tokens: Math.round(aggRows?.avg_base_prompt_tokens ?? 0),
      avg_task_prompt_tokens: Math.round(aggRows?.avg_task_prompt_tokens ?? 0),
      total_input_tokens: aggRows?.total_input_tokens ?? 0,
      total_output_tokens: aggRows?.total_output_tokens ?? 0,
      total_reasoning_tokens: aggRows?.total_reasoning_tokens ?? 0,
      avg_reasoning_tokens: Math.round(aggRows?.avg_reasoning_tokens ?? 0),
      by_model: byModel,
      by_prompt_kind: byPromptKind.map((row) => ({
        prompt_kind: row.prompt_kind,
        runs: row.runs,
        avg_ms: Math.round(row.avg_ms ?? 0),
        avg_input_tokens: Math.round(row.avg_input_tokens ?? 0),
      })),
      by_prompt_profile: byPromptProfile.map((row) => ({
        prompt_profile_name: row.prompt_profile_name,
        runs: row.runs,
        avg_ms: Math.round(row.avg_ms ?? 0),
        avg_system_prompt_tokens: Math.round(row.avg_system_prompt_tokens ?? 0),
      })),
      hourly_trend: recentTrend.map((r) => ({
        time: r.hour,
        avg_ms: Math.round(r.avg_ms ?? 0),
        count: r.count,
      })),
    });
  } catch (err) {
    console.error("[/api/dashboard/llm-stats]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
