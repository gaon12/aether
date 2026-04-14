import { sql } from "kysely";
import { type NextRequest, NextResponse } from "next/server";

import { getDb } from "@/server/db";

const SUPPORTED_COMMANDS = new Set(["translate", "summary"]);

function extractLikelyTypoToken(rawCommand: string) {
  const normalized = rawCommand.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  const tokens = normalized.split(" ");
  const commandToken = tokens[0]?.startsWith("@") ? tokens[1] : tokens[0];
  if (!commandToken) {
    return null;
  }

  const normalizedCommand = commandToken.toLowerCase();
  if (SUPPORTED_COMMANDS.has(normalizedCommand)) {
    return null;
  }

  return normalizedCommand;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  try {
    const db = getDb();

    // Total requests in range
    let totalQuery = db
      .selectFrom("requests")
      .select(sql<number>`COUNT(*)`.as("count"));
    if (from) totalQuery = totalQuery.where("created_at", ">=", from);
    if (to) totalQuery = totalQuery.where("created_at", "<=", to);

    // Invalid (ignored/failed) requests
    let invalidQuery = db
      .selectFrom("requests")
      .select(sql<number>`COUNT(*)`.as("count"))
      .where("request_status", "in", ["ignored", "failed"]);
    if (from) invalidQuery = invalidQuery.where("created_at", ">=", from);
    if (to) invalidQuery = invalidQuery.where("created_at", "<=", to);

    // Parse failure reasons (ignore_reason breakdown)
    let reasonQuery = db
      .selectFrom("requests")
      .select(["ignore_reason", sql<number>`COUNT(*)`.as("count")])
      .where("ignore_reason", "is not", null)
      .groupBy("ignore_reason")
      .orderBy("count", "desc")
      .limit(20);
    if (from) reasonQuery = reasonQuery.where("created_at", ">=", from);
    if (to) reasonQuery = reasonQuery.where("created_at", "<=", to);

    // Duplicate requests (same source_media_id appearing more than once)
    let dupQuery = db
      .selectFrom("requests")
      .select(sql<number>`COUNT(*)`.as("count"))
      .where(
        "source_media_id",
        "in",
        db
          .selectFrom("requests")
          .select("source_media_id")
          .groupBy("source_media_id")
          .having(sql`COUNT(*)`, ">", 1),
      );
    if (from) dupQuery = dupQuery.where("created_at", ">=", from);
    if (to) dupQuery = dupQuery.where("created_at", "<=", to);

    // Common invalid command_raw patterns (first token after @mention)
    let patternQuery = db
      .selectFrom("requests")
      .select(["command_raw", sql<number>`COUNT(*)`.as("count")])
      .where("request_status", "in", ["ignored", "failed"])
      .where("command_raw", "!=", "")
      .groupBy("command_raw")
      .orderBy("count", "desc")
      .limit(10);
    if (from) patternQuery = patternQuery.where("created_at", ">=", from);
    if (to) patternQuery = patternQuery.where("created_at", "<=", to);

    const [totalRow, invalidRow, reasonRows, dupRow, patternRows] =
      await Promise.all([
        totalQuery.executeTakeFirstOrThrow(),
        invalidQuery.executeTakeFirstOrThrow(),
        reasonQuery.execute(),
        dupQuery.executeTakeFirst(),
        patternQuery.execute(),
      ]);

    const total = totalRow.count;
    const invalid = invalidRow.count;
    const rate = total > 0 ? Math.round((invalid / total) * 10000) / 10000 : 0;
    const typoCounts = new Map<string, number>();

    for (const row of patternRows) {
      const typoToken = extractLikelyTypoToken(row.command_raw);
      if (!typoToken) {
        continue;
      }

      typoCounts.set(typoToken, (typoCounts.get(typoToken) ?? 0) + row.count);
    }

    return NextResponse.json({
      invalid_command_count: invalid,
      invalid_command_rate: rate,
      parse_failure_reasons: reasonRows.map((r) => ({
        reason: r.ignore_reason ?? "(알 수 없음)",
        count: r.count,
      })),
      duplicate_request_count: dupRow?.count ?? 0,
      top_typo_patterns: patternRows.map((r) => ({
        pattern: r.command_raw,
        count: r.count,
      })),
      top_typos: Array.from(typoCounts.entries())
        .map(([token, count]) => ({ token, count }))
        .sort((a, b) => b.count - a.count || a.token.localeCompare(b.token))
        .slice(0, 10),
    });
  } catch (err) {
    console.error("[/api/dashboard/command-quality]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
