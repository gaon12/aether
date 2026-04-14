import { sql } from "kysely";
import { NextResponse } from "next/server";

import { getAdminSessionFromRequest } from "@/server/admin/auth";
import { getDb } from "@/server/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getAdminSessionFromRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing request id" }, { status: 400 });
  }

  const db = getDb();

  const request = await db
    .selectFrom("requests")
    .select(["request_id", "request_status", "ignore_reason"])
    .where("request_id", "=", id)
    .executeTakeFirst();

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (request.request_status !== "failed") {
    return NextResponse.json(
      { error: "Only failed requests can be retried" },
      { status: 422 },
    );
  }

  // Parsing-failed requests cannot be retried (the input itself is invalid)
  if (request.ignore_reason?.startsWith("parsing_failed:")) {
    return NextResponse.json(
      { error: "Parsing-failed requests cannot be retried" },
      { status: 422 },
    );
  }

  await db
    .updateTable("requests")
    .set({
      request_status: "queued",
      ignore_reason: null,
      retry_count: sql<number>`retry_count + 1`,
      updated_at: new Date().toISOString(),
    })
    .where("request_id", "=", id)
    .execute();

  return NextResponse.json({ ok: true, request_id: id });
}
