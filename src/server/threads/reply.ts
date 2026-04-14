import type { ThreadsClient } from "@/server/threads/client";
import type { RepliesTable } from "@/types/db";

export interface ReplyPublishInput {
  replyId: string;
  requestId: string;
  replyToId: string;
  replyText: string;
}

export interface RepliesRepository {
  saveReply(record: RepliesTable): Promise<void>;
}

export function createThreadsReplyPublisher(
  client: ThreadsClient,
  repository: RepliesRepository,
) {
  return {
    async publish(input: ReplyPublishInput) {
      await publishReplyWithPersistence(client, repository, input);
    },
  };
}

export async function publishReplyWithPersistence(
  client: ThreadsClient,
  repository: RepliesRepository,
  input: ReplyPublishInput,
) {
  const now = new Date().toISOString();

  try {
    const publishedReply = await client.publishReply({
      replyToId: input.replyToId,
      text: input.replyText,
    });

    const persistedRecord: RepliesTable = {
      reply_id: input.replyId,
      request_id: input.requestId,
      reply_to_id: input.replyToId,
      reply_container_id: publishedReply.containerId,
      reply_media_id: publishedReply.mediaId,
      reply_text: input.replyText,
      publish_status: "succeeded",
      publish_error_code: null,
      published_at: now,
      created_at: now,
      updated_at: now,
    };

    await repository.saveReply(persistedRecord);

    return persistedRecord;
  } catch (error) {
    const persistedRecord: RepliesTable = {
      reply_id: input.replyId,
      request_id: input.requestId,
      reply_to_id: input.replyToId,
      reply_container_id: null,
      reply_media_id: null,
      reply_text: input.replyText,
      publish_status: "failed",
      publish_error_code:
        error instanceof Error ? error.message : "unknown_threads_error",
      published_at: null,
      created_at: now,
      updated_at: now,
    };

    await repository.saveReply(persistedRecord);
    throw error;
  }
}
