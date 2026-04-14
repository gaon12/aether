import { NextResponse } from "next/server";
import { getDb } from "@/server/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing request id" }, { status: 400 });
  }

  const db = getDb();

  const request = await db
    .selectFrom("requests")
    .selectAll()
    .where("request_id", "=", id)
    .executeTakeFirst();

  if (!request) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [llmRun, injectionEvents] = await Promise.all([
    db
      .selectFrom("llm_runs")
      .select([
        "llm_run_id",
        "model_name",
        "prompt_kind",
        "prompt_profile_name",
        "started_at",
        "completed_at",
        "duration_ms",
        "first_token_latency_ms",
        "input_token_count",
        "output_token_count",
        "output_tokens_per_second",
        "stream_chunk_count",
        "reasoning_token_count",
        "system_prompt_token_count",
        "base_prompt_token_count",
        "task_prompt_token_count",
      ])
      .where("request_id", "=", id)
      .orderBy("started_at", "desc")
      .limit(1)
      .executeTakeFirst(),
    db
      .selectFrom("prompt_injection_events")
      .select([
        "prompt_injection_event_id",
        "score",
        "reason",
        "excerpt",
        "created_at",
      ])
      .where("request_id", "=", id)
      .orderBy("score", "desc")
      .execute(),
  ]);

  return NextResponse.json({
    request,
    llm_run: llmRun ?? null,
    prompt_injections: injectionEvents,
  });
}
