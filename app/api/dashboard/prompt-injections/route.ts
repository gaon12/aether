import { sql } from "kysely";
import { type NextRequest, NextResponse } from "next/server";

import { getDb } from "@/server/db";
import { parsePositiveIntegerParam } from "@/server/http/params";

type ScoreBucket = "low" | "medium" | "high";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parsePositiveIntegerParam(searchParams.get("page"), 1);
  const limit = parsePositiveIntegerParam(searchParams.get("limit"), 50, {
    max: 100,
  });
  const offset = (page - 1) * limit;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  try {
    const db = getDb();

    let listQuery = db
      .selectFrom("prompt_injection_events")
      .selectAll()
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    if (from) listQuery = listQuery.where("created_at", ">=", from);
    if (to) listQuery = listQuery.where("created_at", "<=", to);

    const [
      rows,
      countRow,
      totalCount,
      highRisk,
      midRisk,
      lowRisk,
      patternRows,
    ] = await Promise.all([
      listQuery.execute(),

      db
        .selectFrom("prompt_injection_events")
        .select(sql<number>`COUNT(*)`.as("total"))
        .$if(!!from, (q) => q.where("created_at", ">=", from))
        .$if(!!to, (q) => q.where("created_at", "<=", to))
        .executeTakeFirstOrThrow(),

      // Filtered totals for KPI cards
      db
        .selectFrom("prompt_injection_events")
        .select(sql<number>`COUNT(*)`.as("count"))
        .$if(!!from, (q) => q.where("created_at", ">=", from))
        .$if(!!to, (q) => q.where("created_at", "<=", to))
        .executeTakeFirst(),

      // High risk (≥ 0.8)
      db
        .selectFrom("prompt_injection_events")
        .select(sql<number>`COUNT(*)`.as("count"))
        .where("score", ">=", 0.8)
        .$if(!!from, (q) => q.where("created_at", ">=", from))
        .$if(!!to, (q) => q.where("created_at", "<=", to))
        .executeTakeFirst(),

      // Mid risk (0.5–0.8)
      db
        .selectFrom("prompt_injection_events")
        .select(sql<number>`COUNT(*)`.as("count"))
        .where("score", ">=", 0.5)
        .where("score", "<", 0.8)
        .$if(!!from, (q) => q.where("created_at", ">=", from))
        .$if(!!to, (q) => q.where("created_at", "<=", to))
        .executeTakeFirst(),

      // Low risk (< 0.5)
      db
        .selectFrom("prompt_injection_events")
        .select(sql<number>`COUNT(*)`.as("count"))
        .where("score", "<", 0.5)
        .$if(!!from, (q) => q.where("created_at", ">=", from))
        .$if(!!to, (q) => q.where("created_at", "<=", to))
        .executeTakeFirst(),

      // Frequent patterns (group by reason)
      db
        .selectFrom("prompt_injection_events")
        .select(["reason", sql<number>`COUNT(*)`.as("count")])
        .$if(!!from, (q) => q.where("created_at", ">=", from))
        .$if(!!to, (q) => q.where("created_at", "<=", to))
        .groupBy("reason")
        .orderBy("count", "desc")
        .limit(10)
        .execute(),
    ]);

    const scoreDistribution: Array<{
      bucket: ScoreBucket;
      label: string;
      count: number;
    }> = [
      { bucket: "high", label: "고위험 (≥0.8)", count: highRisk?.count ?? 0 },
      {
        bucket: "medium",
        label: "중위험 (0.5~0.8)",
        count: midRisk?.count ?? 0,
      },
      { bucket: "low", label: "저위험 (<0.5)", count: lowRisk?.count ?? 0 },
    ];

    return NextResponse.json({
      data: rows,
      total: countRow.total,
      page,
      limit,
      stats: {
        total_count: totalCount?.count ?? 0,
        high_risk: highRisk?.count ?? 0,
        mid_risk: midRisk?.count ?? 0,
        low_risk: lowRisk?.count ?? 0,
        top_patterns: patternRows,
        score_distribution: scoreDistribution,
      },
    });
  } catch (err) {
    console.error("[/api/dashboard/prompt-injections]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
