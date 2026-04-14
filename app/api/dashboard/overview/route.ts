import { sql } from "kysely";
import { NextResponse } from "next/server";

import { getDb } from "@/server/db";
import { ThreadsClient } from "@/server/threads/client";
import { getValidAccessToken } from "@/server/threads/token";

export async function GET() {
  const db = getDb();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  try {
    // Recent counts (last 1h)
    const recentStats = await db
      .selectFrom("requests")
      .select(({ fn }) => [
        fn.count<number>("request_id").as("total"),
        sql<number>`SUM(CASE WHEN request_status = 'succeeded' THEN 1 ELSE 0 END)`.as(
          "success",
        ),
        sql<number>`SUM(CASE WHEN request_status = 'failed'    THEN 1 ELSE 0 END)`.as(
          "failed",
        ),
        sql<number>`SUM(CASE WHEN request_status = 'ignored'   THEN 1 ELSE 0 END)`.as(
          "ignored",
        ),
      ])
      .where("created_at", ">", oneHourAgo)
      .executeTakeFirst();

    // Average latency (last 1h)
    const latencyStats = await db
      .selectFrom("llm_runs")
      .select(({ fn }) => [fn.avg<number>("duration_ms").as("avg_latency")])
      .where("started_at", ">", oneHourAgo)
      .where("duration_ms", "is not", null)
      .executeTakeFirst();

    // p95 latency
    const latencyRows = await db
      .selectFrom("llm_runs")
      .select("duration_ms")
      .where("started_at", ">", oneHourAgo)
      .where("duration_ms", "is not", null)
      .orderBy("duration_ms", "asc")
      .execute();

    let p95Ms = 0;
    if (latencyRows.length > 0) {
      const idx = Math.min(
        Math.floor(latencyRows.length * 0.95),
        latencyRows.length - 1,
      );
      p95Ms = latencyRows[idx].duration_ms ?? 0;
    }

    // Worker status
    const lastHeartbeat = await db
      .selectFrom("worker_heartbeats")
      .select(["heartbeat_at", "status", "hostname", "pid"])
      .orderBy("heartbeat_at", "desc")
      .limit(1)
      .executeTakeFirst();

    let workerStatus: "online" | "offline" | "warning" = "offline";
    if (lastHeartbeat) {
      const age =
        now.getTime() - new Date(lastHeartbeat.heartbeat_at).getTime();
      if (age < 60_000) workerStatus = "online";
      else if (age < 300_000) workerStatus = "warning";
    }

    // Recent errors
    const recentErrors = await db
      .selectFrom("requests")
      .select(["request_id", "ignore_reason", "created_at"])
      .where("request_status", "=", "failed")
      .orderBy("created_at", "desc")
      .limit(10)
      .execute();

    // Reply quota: try Threads API first, fall back to DB count
    const replyQuota = await db
      .selectFrom("replies")
      .select(sql<number>`COUNT(*)`.as("used"))
      .where("published_at", ">=", oneDayAgo)
      .where("publish_status", "=", "succeeded")
      .executeTakeFirst();

    let replyQuotaUsed = replyQuota?.used ?? 0;
    let replyQuotaTotal = 1000;

    try {
      const threadsAccount = await db
        .selectFrom("threads_accounts")
        .select("threads_user_id")
        .orderBy("updated_at", "desc")
        .limit(1)
        .executeTakeFirst();

      if (threadsAccount) {
        const token = await getValidAccessToken(
          threadsAccount.threads_user_id,
        );
        if (token) {
          const client = new ThreadsClient({
            accessToken: token,
            userId: threadsAccount.threads_user_id,
          });
          const quota = await client.getReplyPublishingLimit();
          replyQuotaUsed = quota.quota_usage;
          replyQuotaTotal = quota.quota_total;
        }
      }
    } catch {
      // Fall through — DB-counted values remain
    }

    return NextResponse.json({
      uptime_seconds: Math.floor(process.uptime()),
      recent_success_count: recentStats?.success ?? 0,
      recent_failed_count: recentStats?.failed ?? 0,
      recent_ignored_count: recentStats?.ignored ?? 0,
      avg_latency_ms: Math.round(latencyStats?.avg_latency ?? 0),
      p95_latency_ms: Math.round(p95Ms),
      worker_status: workerStatus,
      worker_last_heartbeat: lastHeartbeat?.heartbeat_at ?? null,
      reply_quota_used: replyQuotaUsed,
      reply_quota_total: replyQuotaTotal,
      recent_errors: recentErrors.map((r) => ({
        id: r.request_id,
        time: r.created_at,
        message: r.ignore_reason ?? "알 수 없는 오류",
        status: "failed",
      })),
    });
  } catch (err) {
    console.error("[/api/dashboard/overview]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
