import { sql } from "kysely";
import { type NextRequest, NextResponse } from "next/server";

import { getDb } from "@/server/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  try {
    const db = getDb();

    // 1. requests 테이블 기준 시간대별 집계
    let requestQuery = db
      .selectFrom("requests")
      .select([
        sql<string>`strftime('%Y-%m-%dT%H:00:00Z', created_at)`.as("time"),
        sql<number>`SUM(CASE WHEN request_status = 'succeeded' THEN 1 ELSE 0 END)`.as(
          "success",
        ),
        sql<number>`SUM(CASE WHEN request_status = 'failed' THEN 1 ELSE 0 END)`.as(
          "failed",
        ),
        sql<number>`SUM(CASE WHEN request_status = 'ignored' THEN 1 ELSE 0 END)`.as(
          "ignored",
        ),
        sql<number>`COUNT(*)`.as("total"),
      ])
      .groupBy(sql`strftime('%Y-%m-%dT%H:00:00Z', created_at)`)
      .orderBy("time", "asc");

    if (from) requestQuery = requestQuery.where("created_at", ">=", from);
    if (to) requestQuery = requestQuery.where("created_at", "<=", to);

    // 2. prompt_injection_events 시간대별 집계
    let injectionQuery = db
      .selectFrom("prompt_injection_events")
      .select([
        sql<string>`strftime('%Y-%m-%dT%H:00:00Z', created_at)`.as("time"),
        sql<number>`COUNT(*)`.as("count"),
      ])
      .groupBy(sql`strftime('%Y-%m-%dT%H:00:00Z', created_at)`);

    if (from) injectionQuery = injectionQuery.where("created_at", ">=", from);
    if (to) injectionQuery = injectionQuery.where("created_at", "<=", to);

    // 3. llm_runs 기준 시간대별 평균 latency
    let latencyQuery = db
      .selectFrom("llm_runs")
      .select([
        sql<string>`strftime('%Y-%m-%dT%H:00:00Z', started_at)`.as("time"),
        sql<number>`CAST(AVG(duration_ms) AS INTEGER)`.as("avg_ms"),
      ])
      .where("duration_ms", "is not", null)
      .groupBy(sql`strftime('%Y-%m-%dT%H:00:00Z', started_at)`);

    if (from) latencyQuery = latencyQuery.where("started_at", ">=", from);
    if (to) latencyQuery = latencyQuery.where("started_at", "<=", to);

    const [requestRows, injectionRows, latencyRows] = await Promise.all([
      requestQuery.execute(),
      injectionQuery.execute(),
      latencyQuery.execute(),
    ]);

    const injectionMap = new Map(injectionRows.map((r) => [r.time, r.count]));
    const latencyMap = new Map(latencyRows.map((r) => [r.time, r.avg_ms]));

    const rows = requestRows.map((r) => ({
      time: r.time,
      success: r.success,
      failed: r.failed,
      ignored: r.ignored,
      total: r.total,
      prompt_injection: injectionMap.get(r.time) ?? 0,
      avg_latency_ms: latencyMap.get(r.time) ?? 0,
      p95_latency_ms: 0,
    }));

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[/api/dashboard/metrics/hourly]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
