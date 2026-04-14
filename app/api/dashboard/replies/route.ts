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
  const requestId = searchParams.get("request_id") ?? "";
  const status = searchParams.get("publish_status") ?? "";
  const commandType = searchParams.get("command_type") ?? "";
  const search = searchParams.get("search")?.trim() ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  try {
    const db = getDb();

    let query = db
      .selectFrom("replies")
      .innerJoin("requests", "requests.request_id", "replies.request_id")
      .select([
        "replies.reply_id",
        "replies.request_id",
        "replies.reply_text",
        "replies.publish_status",
        "replies.publish_error_code",
        "replies.published_at",
        "replies.created_at",
        "requests.source_text",
        "requests.command_raw",
        "requests.command_type",
        "requests.request_status",
        sql<string | null>`(
          SELECT model_name FROM llm_runs
          WHERE llm_runs.request_id = replies.request_id
          ORDER BY started_at DESC LIMIT 1
        )`.as("model_name"),
      ])
      .orderBy("replies.created_at", "desc")
      .limit(limit)
      .offset(offset);

    if (requestId) query = query.where("replies.request_id", "=", requestId);
    if (status)
      query = query.where("replies.publish_status", "=", status as never);
    if (commandType)
      query = query.where("requests.command_type", "=", commandType);
    if (from) query = query.where("replies.created_at", ">=", from);
    if (to) query = query.where("replies.created_at", "<=", to);
    if (search) {
      const likeValue = `%${search}%`;
      query = query.where((eb) =>
        eb.or([
          eb("replies.request_id", "like", likeValue),
          eb("requests.source_text", "like", likeValue),
        ]),
      );
    }

    let countQuery = db
      .selectFrom("replies")
      .innerJoin("requests", "requests.request_id", "replies.request_id")
      .select(sql<number>`COUNT(*)`.as("total"));

    if (requestId)
      countQuery = countQuery.where("replies.request_id", "=", requestId);
    if (status)
      countQuery = countQuery.where(
        "replies.publish_status",
        "=",
        status as never,
      );
    if (commandType)
      countQuery = countQuery.where("requests.command_type", "=", commandType);
    if (from) countQuery = countQuery.where("replies.created_at", ">=", from);
    if (to) countQuery = countQuery.where("replies.created_at", "<=", to);
    if (search) {
      const likeValue = `%${search}%`;
      countQuery = countQuery.where((eb) =>
        eb.or([
          eb("replies.request_id", "like", likeValue),
          eb("requests.source_text", "like", likeValue),
        ]),
      );
    }

    const [rows, countRow] = await Promise.all([
      query.execute(),
      countQuery.executeTakeFirstOrThrow(),
    ]);

    return NextResponse.json({
      data: rows,
      total: countRow.total,
      page,
      limit,
    });
  } catch (err) {
    console.error("[/api/dashboard/replies]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
