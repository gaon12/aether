import { sql } from "kysely";
import { type NextRequest, NextResponse } from "next/server";

import { getDb } from "@/server/db";
import { parsePositiveIntegerParam } from "@/server/http/params";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parsePositiveIntegerParam(searchParams.get("page"), 1);
  const limit = parsePositiveIntegerParam(searchParams.get("limit"), 50, {
    max: 100,
  });
  const offset = (page - 1) * limit;
  const status = searchParams.get("status") ?? "";
  const cmdType = searchParams.get("command_type") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  try {
    const db = getDb();

    // Paginated list
    let listQuery = db
      .selectFrom("requests")
      .selectAll()
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    if (status)
      listQuery = listQuery.where("request_status", "=", status as never);
    if (cmdType) listQuery = listQuery.where("command_type", "=", cmdType);
    if (from) listQuery = listQuery.where("created_at", ">=", from);
    if (to) listQuery = listQuery.where("created_at", "<=", to);

    const [
      rows,
      countRow,
      commandDist,
      targetLangDist,
      sourceLangDist,
      ignoredShort,
      ignoredImage,
    ] = await Promise.all([
      listQuery.execute(),

      db
        .selectFrom("requests")
        .select(sql<number>`COUNT(*)`.as("total"))
        .$if(!!status, (q) => q.where("request_status", "=", status as never))
        .$if(!!cmdType, (q) => q.where("command_type", "=", cmdType))
        .$if(!!from, (q) => q.where("created_at", ">=", from))
        .$if(!!to, (q) => q.where("created_at", "<=", to))
        .executeTakeFirstOrThrow(),

      // Command type distribution
      db
        .selectFrom("requests")
        .select(["command_type", sql<number>`COUNT(*)`.as("count")])
        .$if(!!status, (q) => q.where("request_status", "=", status as never))
        .$if(!!cmdType, (q) => q.where("command_type", "=", cmdType))
        .$if(!!from, (q) => q.where("created_at", ">=", from))
        .$if(!!to, (q) => q.where("created_at", "<=", to))
        .where("command_type", "is not", null)
        .groupBy("command_type")
        .execute(),

      // Target language distribution
      db
        .selectFrom("requests")
        .select(["target_language", sql<number>`COUNT(*)`.as("count")])
        .$if(!!status, (q) => q.where("request_status", "=", status as never))
        .$if(!!cmdType, (q) => q.where("command_type", "=", cmdType))
        .$if(!!from, (q) => q.where("created_at", ">=", from))
        .$if(!!to, (q) => q.where("created_at", "<=", to))
        .where("target_language", "is not", null)
        .groupBy("target_language")
        .orderBy("count", "desc")
        .limit(10)
        .execute(),

      // Source language distribution
      db
        .selectFrom("requests")
        .select(["source_language", sql<number>`COUNT(*)`.as("count")])
        .$if(!!status, (q) => q.where("request_status", "=", status as never))
        .$if(!!cmdType, (q) => q.where("command_type", "=", cmdType))
        .$if(!!from, (q) => q.where("created_at", ">=", from))
        .$if(!!to, (q) => q.where("created_at", "<=", to))
        .where("source_language", "is not", null)
        .groupBy("source_language")
        .orderBy("count", "desc")
        .limit(10)
        .execute(),

      // Ignored: text too short
      db
        .selectFrom("requests")
        .select(sql<number>`COUNT(*)`.as("count"))
        .$if(!!status, (q) => q.where("request_status", "=", status as never))
        .$if(!!cmdType, (q) => q.where("command_type", "=", cmdType))
        .$if(!!from, (q) => q.where("created_at", ">=", from))
        .$if(!!to, (q) => q.where("created_at", "<=", to))
        .where("request_status", "=", "ignored")
        .where("ignore_reason", "=", "text_too_short")
        .executeTakeFirst(),

      // Ignored: image only
      db
        .selectFrom("requests")
        .select(sql<number>`COUNT(*)`.as("count"))
        .$if(!!status, (q) => q.where("request_status", "=", status as never))
        .$if(!!cmdType, (q) => q.where("command_type", "=", cmdType))
        .$if(!!from, (q) => q.where("created_at", ">=", from))
        .$if(!!to, (q) => q.where("created_at", "<=", to))
        .where("request_status", "=", "ignored")
        .where("ignore_reason", "=", "unsupported_image_only")
        .executeTakeFirst(),
    ]);

    return NextResponse.json({
      data: rows,
      total: countRow.total,
      page,
      limit,
      stats: {
        command_distribution: commandDist,
        language_distribution: targetLangDist,
        source_language_distribution: sourceLangDist,
        ignored_short_text: ignoredShort?.count ?? 0,
        ignored_image_only: ignoredImage?.count ?? 0,
      },
    });
  } catch (err) {
    console.error("[/api/dashboard/requests]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
