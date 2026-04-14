import { sql } from "kysely";
import { type NextRequest, NextResponse } from "next/server";

import { getDb } from "@/server/db";
import { parsePositiveIntegerParam } from "@/server/http/params";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parsePositiveIntegerParam(searchParams.get("page"), 1);
  const limit = parsePositiveIntegerParam(searchParams.get("limit"), 20, {
    max: 50,
  });
  const offset = (page - 1) * limit;

  try {
    const db = getDb();

    const [rows, countRow] = await Promise.all([
      db
        .selectFrom("replies")
        .innerJoin("requests", "requests.request_id", "replies.request_id")
        .select([
          "replies.reply_id",
          "replies.reply_text",
          "replies.published_at",
          "requests.command_type",
          "requests.source_language",
          "requests.target_language",
          "requests.source_text",
        ])
        .where("replies.publish_status", "=", "succeeded")
        .where("replies.published_at", "is not", null)
        .orderBy("replies.published_at", "desc")
        .limit(limit)
        .offset(offset)
        .execute(),
      db
        .selectFrom("replies")
        .select(sql<number>`COUNT(*)`.as("total"))
        .where("publish_status", "=", "succeeded")
        .where("published_at", "is not", null)
        .executeTakeFirstOrThrow(),
    ]);

    const safeRows = rows.map((row) => ({
      reply_id: row.reply_id,
      reply_text:
        row.reply_text.length > 280
          ? `${row.reply_text.slice(0, 280)}...`
          : row.reply_text,
      published_at: row.published_at,
      command_type: row.command_type,
      source_language: row.source_language,
      target_language: row.target_language,
      source_text: row.source_text
        ? row.source_text.length > 200
          ? `${row.source_text.slice(0, 200)}...`
          : row.source_text
        : null,
    }));

    return NextResponse.json({
      data: safeRows,
      total: countRow.total,
      page,
      limit,
    });
  } catch (err) {
    console.error("[/api/public/feed]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
