import { getDb } from "@/server/db";
import type { QueueItem } from "@/server/queue/types";
import type { RequestStatus } from "@/types/db";

/**
 * Fetches the next available job from the requests table.
 * Marks it as 'parsing' (or next state) to prevent other workers from picking it up.
 */
export async function fetchNextJob(): Promise<QueueItem | null> {
  const db = getDb();

  return await db.transaction().execute(async (trx) => {
    const nextJob = await trx
      .selectFrom("requests")
      .selectAll()
      .where("request_status", "=", "queued")
      .orderBy("created_at", "asc")
      .limit(1)
      .executeTakeFirst();

    if (!nextJob) return null;

    // Update status to 'parsing' to "lock" it
    await trx
      .updateTable("requests")
      .set({
        request_status: "parsing",
        updated_at: new Date().toISOString(),
      })
      .where("request_id", "=", nextJob.request_id)
      .execute();

    return {
      request_id: nextJob.request_id,
      webhook_event_id: nextJob.webhook_event_id,
      source_media_id: nextJob.source_media_id,
      source_author_id: nextJob.source_author_id,
      source_text: nextJob.source_text,
      command_raw: nextJob.command_raw,
      created_at: nextJob.created_at,
    };
  });
}

/**
 * Updates the status of a request.
 */
export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
  extraFields: Record<string, unknown> = {},
) {
  const db = getDb();
  await db
    .updateTable("requests")
    .set({
      request_status: status,
      updated_at: new Date().toISOString(),
      ...extraFields,
    })
    .where("request_id", "=", requestId)
    .execute();
}

export async function enqueueRequest(requestId: string) {
  await updateRequestStatus(requestId, "queued");
}
