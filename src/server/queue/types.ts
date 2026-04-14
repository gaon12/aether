import type { RequestStatus } from "@/types/db";

export interface QueueItem {
  request_id: string;
  webhook_event_id: string;
  source_media_id: string;
  source_author_id: string;
  source_text: string | null;
  source_language?: string | null;
  command_raw: string;
  created_at: string;
}

export interface QueueProcessor {
  process(item: QueueItem): Promise<void>;
}

export interface QueueRepository {
  fetchNextQueued(): Promise<QueueItem | null>;
  updateRequestStatus(
    requestId: string,
    status: RequestStatus,
    extraFields?: Record<string, unknown>,
  ): Promise<void>;
}
