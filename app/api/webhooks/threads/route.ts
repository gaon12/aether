import crypto from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";
import { uuidv7 } from "uuidv7";

import { getResolvedRuntimeSettings } from "@/server/admin/settings";
import { getDb } from "@/server/db";
import { constantTimeEqual } from "@/server/lib/secure-compare";

interface ThreadsWebhookChangeValue {
  media_id?: string;
  text?: string;
  replied_to_media_id?: string;
  from?: {
    id?: string;
  };
}

interface ThreadsWebhookChange {
  field?: string;
  value?: ThreadsWebhookChangeValue;
}

interface ThreadsWebhookEntry {
  id?: string;
  changes?: ThreadsWebhookChange[];
}

interface ThreadsWebhookPayload {
  entry?: ThreadsWebhookEntry[];
}

function isValidWebhookSignature(
  body: string,
  signature: string,
  webhookSecret: string | null,
) {
  if (!webhookSecret) {
    throw new Error("THREADS_WEBHOOK_SECRET is not configured");
  }

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex")}`;

  return constantTimeEqual(expectedSignature, signature);
}

/**
 * Threads Webhook Endpoint
 * https://developers.facebook.com/docs/threads/webhooks
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const settings = await getResolvedRuntimeSettings();

  if (!signature) {
    return new NextResponse("Missing signature", { status: 401 });
  }

  try {
    if (
      !isValidWebhookSignature(body, signature, settings.threadsWebhookSecret)
    ) {
      console.warn("Invalid webhook signature");
      return new NextResponse("Invalid signature", { status: 401 });
    }
  } catch (error) {
    console.error("Webhook secret configuration error:", error);
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  let payload: ThreadsWebhookPayload;
  try {
    payload = JSON.parse(body) as ThreadsWebhookPayload;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const providerEventKey = crypto.createHash("md5").update(body).digest("hex");

  try {
    const webhookEventId = uuidv7();
    const result = await db
      .insertInto("webhook_events")
      .values({
        webhook_event_id: webhookEventId,
        provider_event_key: providerEventKey,
        raw_payload_json: body,
        signature_valid: 1,
        received_at: now,
        created_at: now,
        updated_at: now,
      })
      .onConflict((oc) => oc.column("provider_event_key").doNothing())
      .executeTakeFirst();

    if (!result.numInsertedOrUpdatedRows) {
      console.log(`Duplicate webhook event ignored: ${providerEventKey}`);
      return NextResponse.json({ status: "ignored", reason: "duplicate" });
    }

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "mentions" && change.field !== "replies") {
          continue;
        }

        const targetThreadsUserId = entry.id ?? null;
        const sourceMediaId = change.value?.media_id;
        const sourceAuthorId = change.value?.from?.id;
        const sourceText = change.value?.text;
        const replyToId = change.value?.replied_to_media_id ?? null;

        if (!sourceMediaId || !sourceAuthorId) {
          continue;
        }

        await db
          .insertInto("requests")
          .values({
            request_id: uuidv7(),
            webhook_event_id: webhookEventId,
            target_threads_user_id: targetThreadsUserId,
            source_media_id: sourceMediaId,
            source_author_id: sourceAuthorId,
            source_text: sourceText || null,
            command_raw: sourceText || "",
            retry_count: 0,
            reply_to_id: replyToId,
            request_status: "queued",
            created_at: now,
            updated_at: now,
          })
          .execute();
      }
    }

    await db
      .updateTable("webhook_events")
      .set({
        processed_at: now,
        updated_at: now,
      })
      .where("webhook_event_id", "=", webhookEventId)
      .execute();

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown webhook error",
      },
      { status: 500 },
    );
  }
}

/**
 * Threads Webhook Verification (GET request for initial setup)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const { threadsWebhookVerifyToken } = await getResolvedRuntimeSettings();

  if (
    mode === "subscribe" &&
    constantTimeEqual(token, threadsWebhookVerifyToken)
  ) {
    console.log("Webhook verified");
    return new NextResponse(challenge);
  }

  return new NextResponse("Forbidden", { status: 403 });
}
