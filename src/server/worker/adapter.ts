import { uuidv7 } from "uuidv7";

import { getDb } from "@/server/db";
import { createOpenAIClient } from "@/server/llm/client";
import { createOpenAiLlmRunner } from "@/server/llm/runner";
import type {
  ExtractableAttachment,
  ExtractableThreadsPost,
} from "@/server/parser/extractor";
import type { InjectionDetectionResult } from "@/server/prompt-injection/detector";
import { ThreadsClient } from "@/server/threads/client";
import { createThreadsReplyPublisher } from "@/server/threads/reply";
import { getValidAccessToken } from "@/server/threads/token";
import type {
  QueuedRequest,
  WorkerAdapterModule,
  WorkerDependencies,
  WorkerHeartbeatRepository,
  WorkerLlmRunRepository,
  WorkerParseRepository,
  WorkerPromptInjectionRepository,
  WorkerRequestRepository,
  WorkerSourceResolver,
} from "@/server/worker/types";
import type { RepliesTable } from "@/types/db";
import type { LlmRunRecordInput } from "@/types/llm";
import type { ParseResult } from "@/types/parser";

type RequestStatusUpdate = Parameters<
  WorkerRequestRepository["updateStatus"]
>[2];

type UnknownRecord = Record<string, unknown>;

async function resolveThreadsAccount(targetThreadsUserId?: string | null) {
  const db = getDb();
  let query = db.selectFrom("threads_accounts").selectAll();

  if (targetThreadsUserId) {
    query = query
      .where("threads_user_id", "=", targetThreadsUserId)
      .orderBy("updated_at", "desc");
  } else {
    query = query.orderBy("updated_at", "desc");
  }

  const directMatch = await query.limit(1).executeTakeFirst();
  if (directMatch || targetThreadsUserId) {
    return directMatch ?? null;
  }

  return db
    .selectFrom("threads_accounts")
    .selectAll()
    .orderBy("updated_at", "desc")
    .limit(1)
    .executeTakeFirst();
}

const EXPANDED_THREADS_MEDIA_FIELDS = [
  "id",
  "media_type",
  "text",
  "quoted_post",
  "quoted_post{id,text,media_type}",
  "parent_post",
  "parent_post{id,text,media_type}",
  "reply_to",
  "reply_to{id,text,media_type}",
  "attachments",
  "attachments{type,text,media_type}",
].join(",");

const FALLBACK_THREADS_MEDIA_FIELDS = ["id", "media_type", "text"].join(",");

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function getFirstString(...values: unknown[]) {
  for (const value of values) {
    const normalized = getStringValue(value);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function getNestedText(
  source: UnknownRecord,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = source[key];
    if (!value) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (!isRecord(item)) {
          continue;
        }

        const nestedText = getFirstString(
          item.text,
          item.caption,
          item.body,
          item.message,
        );
        if (nestedText) {
          return nestedText;
        }
      }
      continue;
    }

    if (!isRecord(value)) {
      const directText = getStringValue(value);
      if (directText) {
        return directText;
      }
      continue;
    }

    const directText = getFirstString(
      value.text,
      value.caption,
      value.body,
      value.message,
    );
    if (directText) {
      return directText;
    }

    if (Array.isArray(value.data)) {
      for (const item of value.data) {
        if (!isRecord(item)) {
          continue;
        }

        const nestedArrayText = getFirstString(
          item.text,
          item.caption,
          item.body,
          item.message,
        );
        if (nestedArrayText) {
          return nestedArrayText;
        }
      }
    }
  }

  return null;
}

function normalizeAttachmentType(rawType: string | null | undefined) {
  switch (rawType?.toLowerCase()) {
    case "image":
    case "photo":
      return "image";
    case "video":
      return "video";
    case "text":
      return "text";
    case "link":
      return "link";
    default:
      return "unknown";
  }
}

function extractAttachments(
  source: UnknownRecord,
): ExtractableAttachment[] | undefined {
  const rawAttachments = [
    source.attachments,
    source.child_attachments,
    source.media,
  ].find(Boolean);

  const entries = Array.isArray(rawAttachments)
    ? rawAttachments
    : isRecord(rawAttachments) && Array.isArray(rawAttachments.data)
      ? rawAttachments.data
      : [];

  const attachments = entries.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const text = getFirstString(
      entry.text,
      entry.caption,
      entry.body,
      entry.message,
    );
    const rawType = getFirstString(
      entry.type,
      entry.media_type,
      entry.mediaType,
    );

    return [
      {
        type: normalizeAttachmentType(rawType),
        text,
      } satisfies ExtractableAttachment,
    ];
  });

  return attachments.length > 0 ? attachments : undefined;
}

function buildSourceContext(
  sourceMediaId: string,
  source: UnknownRecord,
): ExtractableThreadsPost {
  return {
    sourceMediaId: getFirstString(source.id, sourceMediaId) ?? sourceMediaId,
    mediaType: getFirstString(source.media_type, source.mediaType),
    text: getFirstString(
      source.text,
      source.caption,
      source.body,
      source.message,
    ),
    quotedText:
      getNestedText(source, [
        "quoted_post",
        "quotedPost",
        "quote_post",
        "quotePost",
        "quoted",
      ]) ?? getFirstString(source.quoted_text, source.quotedText),
    parentText:
      getNestedText(source, [
        "parent_post",
        "parentPost",
        "reply_to",
        "replyTo",
        "replied_to",
        "parent",
      ]) ?? getFirstString(source.parent_text, source.parentText),
    attachments: extractAttachments(source),
  };
}

function mergeSourceContext(
  base: ExtractableThreadsPost,
  overlay: Partial<ExtractableThreadsPost>,
): ExtractableThreadsPost {
  return {
    sourceMediaId: overlay.sourceMediaId ?? base.sourceMediaId,
    mediaType: overlay.mediaType ?? base.mediaType,
    text: overlay.text ?? base.text,
    quotedText: overlay.quotedText ?? base.quotedText,
    parentText: overlay.parentText ?? base.parentText,
    attachments: overlay.attachments ?? base.attachments,
    isDeleted: overlay.isDeleted ?? base.isDeleted,
    isPrivate: overlay.isPrivate ?? base.isPrivate,
  };
}

function hasTextCandidate(source: ExtractableThreadsPost) {
  if (getStringValue(source.text)) {
    return true;
  }

  if (getStringValue(source.quotedText) || getStringValue(source.parentText)) {
    return true;
  }

  return (
    source.attachments?.some((attachment) =>
      getStringValue(attachment.text),
    ) === true
  );
}

class KyselyWorkerRequestRepository implements WorkerRequestRepository {
  async claimNextQueuedRequest(): Promise<QueuedRequest | null> {
    const db = getDb();

    return db.transaction().execute(async (trx) => {
      const nextRequest = await trx
        .selectFrom("requests")
        .selectAll()
        .where("request_status", "=", "queued")
        .orderBy("created_at", "asc")
        .limit(1)
        .executeTakeFirst();

      if (!nextRequest) {
        return null;
      }

      await trx
        .updateTable("requests")
        .set({
          request_status: "parsing",
          updated_at: new Date().toISOString(),
        })
        .where("request_id", "=", nextRequest.request_id)
        .execute();

      return nextRequest as QueuedRequest;
    });
  }

  async updateStatus(
    requestId: string,
    status: QueuedRequest["request_status"],
    options?: RequestStatusUpdate,
  ): Promise<void> {
    const db = getDb();

    const updatePayload: {
      request_status: QueuedRequest["request_status"];
      updated_at: string;
      processed_at?: string | null;
      ignore_reason?: string | null;
      source_text?: string | null;
      source_language?: string | null;
      command_type?: string | null;
      target_language?: string | null;
      summary_length?: number | null;
      retry_count?: number;
    } = {
      request_status: status,
      updated_at: new Date().toISOString(),
    };

    if (options && "processedAt" in options) {
      updatePayload.processed_at = options.processedAt ?? null;
    }
    if (options && "ignoreReason" in options) {
      updatePayload.ignore_reason = options.ignoreReason ?? null;
    }
    if (options && "sourceText" in options) {
      updatePayload.source_text = options.sourceText ?? null;
    }
    if (options && "sourceLanguage" in options) {
      updatePayload.source_language = options.sourceLanguage ?? null;
    }
    if (options && "commandType" in options) {
      updatePayload.command_type = options.commandType ?? null;
    }
    if (options && "targetLanguage" in options) {
      updatePayload.target_language = options.targetLanguage ?? null;
    }
    if (options && "summaryLength" in options) {
      updatePayload.summary_length = options.summaryLength ?? null;
    }

    if (options?.incrementRetryCount) {
      const currentRequest = await db
        .selectFrom("requests")
        .select("retry_count")
        .where("request_id", "=", requestId)
        .executeTakeFirst();

      updatePayload.retry_count = (currentRequest?.retry_count ?? 0) + 1;
    }

    await db
      .updateTable("requests")
      .set(updatePayload)
      .where("request_id", "=", requestId)
      .execute();
  }
}

class ThreadsSourceResolver implements WorkerSourceResolver {
  private async loadWebhookSourceContext(request: QueuedRequest) {
    const db = getDb();
    const webhookEvent = await db
      .selectFrom("webhook_events")
      .select("raw_payload_json")
      .where("webhook_event_id", "=", request.webhook_event_id)
      .executeTakeFirst();

    if (!webhookEvent?.raw_payload_json) {
      return null;
    }

    try {
      const payload = JSON.parse(webhookEvent.raw_payload_json) as {
        entry?: Array<{
          changes?: Array<{
            value?: Record<string, unknown>;
          }>;
        }>;
      };

      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const value = change.value;
          if (!isRecord(value)) {
            continue;
          }

          if (value.media_id !== request.source_media_id) {
            continue;
          }

          return buildSourceContext(request.source_media_id, value);
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  private async fetchSourceMedia(
    sourceMediaId: string,
    token: string,
  ): Promise<ExtractableThreadsPost> {
    let lastError: Error | null = null;

    for (const fields of [
      EXPANDED_THREADS_MEDIA_FIELDS,
      FALLBACK_THREADS_MEDIA_FIELDS,
    ]) {
      const searchParams = new URLSearchParams({
        fields,
        access_token: token,
      });
      const response = await fetch(
        `https://graph.threads.net/v1.0/${sourceMediaId}?${searchParams.toString()}`,
      );

      if (!response.ok) {
        lastError = new Error(
          `Failed to fetch source media ${sourceMediaId}: ${await response.text()}`,
        );
        continue;
      }

      const media = (await response.json()) as unknown;
      if (!isRecord(media)) {
        break;
      }

      return buildSourceContext(sourceMediaId, media);
    }

    throw (
      lastError ?? new Error(`Failed to fetch source media ${sourceMediaId}.`)
    );
  }

  async resolve(request: QueuedRequest): Promise<ExtractableThreadsPost> {
    let sourceContext: ExtractableThreadsPost = {
      sourceMediaId: request.source_media_id,
      text: getStringValue(request.source_text),
    };
    const webhookContext = await this.loadWebhookSourceContext(request);

    if (webhookContext) {
      sourceContext = mergeSourceContext(sourceContext, webhookContext);
    }

    // When this is a reply to another post (reply_to_id is set), the source_media_id
    // is the command post and the content to translate is in the parent post.
    // The webhook payload only has the command text, not the parent post content,
    // so we must always fetch from the API to get parent_post.text.
    const needsParentContent =
      !!request.reply_to_id && !getStringValue(sourceContext.parentText);

    if (hasTextCandidate(sourceContext) && !needsParentContent) {
      return sourceContext;
    }

    const account = await resolveThreadsAccount(request.target_threads_user_id);

    if (!account) {
      return {
        ...sourceContext,
        sourceMediaId: request.source_media_id,
        isPrivate: true,
      };
    }

    const token = await getValidAccessToken(account.threads_user_id);
    if (!token) {
      return {
        ...sourceContext,
        sourceMediaId: request.source_media_id,
        isPrivate: true,
      };
    }

    const fetchedContext = await this.fetchSourceMedia(
      request.source_media_id,
      token,
    );

    return mergeSourceContext(sourceContext, fetchedContext);
  }
}

class KyselyWorkerParseRepository implements WorkerParseRepository {
  async saveParseResult(requestId: string, result: ParseResult): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    if (!result.valid) {
      await db
        .updateTable("requests")
        .set({
          updated_at: now,
          command_type: null,
          target_language: null,
          summary_length: null,
        })
        .where("request_id", "=", requestId)
        .execute();
      return;
    }

    await db
      .updateTable("requests")
      .set({
        updated_at: now,
        command_type: result.command,
        target_language:
          result.command === "translate" ||
          result.command === "translate_summary"
            ? result.targetLang
            : (result.lang ?? null),
        summary_length: "length" in result ? (result.length ?? null) : null,
      })
      .where("request_id", "=", requestId)
      .execute();
  }
}

class KyselyWorkerPromptInjectionRepository
  implements WorkerPromptInjectionRepository
{
  async saveDetection(
    requestId: string,
    detection: InjectionDetectionResult,
  ): Promise<void> {
    const db = getDb();

    await db
      .insertInto("prompt_injection_events")
      .values({
        prompt_injection_event_id: uuidv7(),
        request_id: requestId,
        score: detection.prompt_injection_score,
        reason: detection.prompt_injection_reason,
        excerpt: detection.prompt_injection_excerpt,
        created_at: new Date().toISOString(),
      })
      .execute();
  }
}

class KyselyWorkerLlmRunRepository implements WorkerLlmRunRepository {
  async saveRun(record: LlmRunRecordInput): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    await db
      .insertInto("llm_runs")
      .values({
        llm_run_id: record.llmRunId,
        request_id: record.requestId,
        model_name: record.modelName,
        prompt_kind: record.promptMetadata.kind,
        prompt_profile_name: record.promptMetadata.basePromptName,
        system_prompt_token_count: record.promptMetadata.systemPromptTokenCount,
        base_prompt_token_count: record.promptMetadata.basePromptTokenCount,
        task_prompt_token_count: record.promptMetadata.taskPromptTokenCount,
        started_at: record.metrics.startedAt,
        first_token_at: record.metrics.firstTokenAt,
        completed_at: record.metrics.completedAt,
        duration_ms: record.metrics.durationMs,
        first_token_latency_ms: record.metrics.firstTokenLatencyMs,
        input_token_count: record.metrics.inputTokenCount,
        output_token_count: record.metrics.outputTokenCount,
        output_tokens_per_second: record.metrics.outputTokensPerSecond,
        stream_chunk_count: record.metrics.streamChunkCount,
        reasoning_token_count: record.metrics.reasoningTokenCount ?? null,
        created_at: now,
        updated_at: now,
      })
      .execute();
  }
}

class KyselyRepliesRepository {
  async saveReply(record: RepliesTable): Promise<void> {
    const db = getDb();

    await db
      .insertInto("replies")
      .values(record)
      .onConflict((oc) =>
        oc.column("reply_id").doUpdateSet({
          reply_container_id: record.reply_container_id,
          reply_media_id: record.reply_media_id,
          reply_text: record.reply_text,
          publish_status: record.publish_status,
          publish_error_code: record.publish_error_code,
          published_at: record.published_at,
          updated_at: record.updated_at,
        }),
      )
      .execute();
  }
}

class KyselyWorkerHeartbeatRepository implements WorkerHeartbeatRepository {
  async saveHeartbeat(record: {
    worker_run_id: string;
    hostname: string;
    pid: number;
    status: string;
    heartbeat_at: string;
    created_at: string;
  }): Promise<void> {
    const db = getDb();

    await db
      .insertInto("worker_heartbeats")
      .values(record)
      .onConflict((oc) =>
        oc.column("worker_run_id").doUpdateSet({
          status: record.status,
          heartbeat_at: record.heartbeat_at,
        }),
      )
      .execute();
  }
}

function createReplyPublisher() {
  return {
    async publish(input: {
      requestId: string;
      replyText: string;
      replyToId: string;
    }) {
      const db = getDb();
      const request = await db
        .selectFrom("requests")
        .select("target_threads_user_id")
        .where("request_id", "=", input.requestId)
        .executeTakeFirst();
      const account = await resolveThreadsAccount(
        request?.target_threads_user_id ?? null,
      );

      if (!account) {
        throw new Error("No Threads account available for publishing replies.");
      }

      const token = await getValidAccessToken(account.threads_user_id);
      if (!token) {
        throw new Error("Failed to resolve a valid Threads access token.");
      }

      const client = new ThreadsClient({
        accessToken: token,
        userId: account.threads_user_id,
      });

      const publisher = createThreadsReplyPublisher(
        client,
        new KyselyRepliesRepository(),
      );

      await publisher.publish({
        replyId: uuidv7(),
        requestId: input.requestId,
        replyText: input.replyText,
        replyToId: input.replyToId,
      });
    },
  };
}

export async function createWorkerDependencies(): Promise<WorkerDependencies> {
  const openAiBundle = await createOpenAIClient();

  return {
    requestRepository: new KyselyWorkerRequestRepository(),
    sourceResolver: new ThreadsSourceResolver(),
    parseRepository: new KyselyWorkerParseRepository(),
    promptInjectionRepository: new KyselyWorkerPromptInjectionRepository(),
    llmRunRepository: new KyselyWorkerLlmRunRepository(),
    replyPublisher: createReplyPublisher(),
    llmRunner: createOpenAiLlmRunner(openAiBundle),
    heartbeatRepository: new KyselyWorkerHeartbeatRepository(),
  };
}

const adapter: WorkerAdapterModule = {
  createWorkerDependencies,
};

export default adapter;
