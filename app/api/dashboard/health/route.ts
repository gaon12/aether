import { statSync } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import { getDb } from "@/server/db";
import { ThreadsClient } from "@/server/threads/client";
import { getValidAccessToken } from "@/server/threads/token";

const DB_PATH = process.env.SQLITE_DB_PATH || "data/aether.db";

export async function GET() {
  const db = getDb();
  const now = new Date();

  try {
    // 1. Threads Connection & Token Status
    const account = await db
      .selectFrom("threads_accounts")
      .select([
        "threads_user_id",
        "username",
        "token_expires_at",
        "token_last_checked_at",
        "token_last_refreshed_at",
      ])
      .orderBy("updated_at", "desc")
      .executeTakeFirst();

    let tokenStatus: "valid" | "expiring" | "expired" | "missing" = "missing";
    let tokenExpiresAt = null;
    if (account) {
      tokenExpiresAt = account.token_expires_at;
      const expiresAt = new Date(tokenExpiresAt);
      const diff = expiresAt.getTime() - now.getTime();
      if (diff > 1000 * 60 * 60 * 24 * 7) {
        tokenStatus = "valid";
      } else if (diff > 0) {
        tokenStatus = "expiring";
      } else {
        tokenStatus = "expired";
      }
    }

    let apiConnectionStatus: "reachable" | "unreachable" | "not_checked" =
      "not_checked";
    let apiConnectionCheckedAt: string | null = null;
    let apiConnectionError: string | null = null;

    if (account?.threads_user_id) {
      apiConnectionCheckedAt = now.toISOString();

      try {
        const accessToken = await getValidAccessToken(account.threads_user_id);

        if (!accessToken) {
          apiConnectionStatus = "unreachable";
          apiConnectionError =
            "유효한 Threads 액세스 토큰을 확인하지 못했습니다.";
        } else {
          const client = new ThreadsClient({
            accessToken,
            userId: account.threads_user_id,
          });

          await client.getCurrentUserProfile();
          apiConnectionStatus = "reachable";
        }
      } catch (error) {
        apiConnectionStatus = "unreachable";
        apiConnectionError =
          error instanceof Error ? error.message : "Threads 연결 확인 실패";
      }
    }

    // 2. Webhook Status
    const lastWebhook = await db
      .selectFrom("webhook_events")
      .select(["received_at", "signature_valid"])
      .orderBy("received_at", "desc")
      .executeTakeFirst();

    // 3. Worker Heartbeat
    const lastHeartbeat = await db
      .selectFrom("worker_heartbeats")
      .select(["heartbeat_at", "hostname", "pid", "status"])
      .orderBy("heartbeat_at", "desc")
      .executeTakeFirst();

    // 4. DB Status & Size
    let dbSizeBytes = 0;
    let dbStatus: "ok" | "not_found" = "not_found";
    let pathMasked = DB_PATH;
    const dbDir = path.basename(path.dirname(DB_PATH));
    const dbFile = path.basename(DB_PATH);
    pathMasked = dbDir && dbDir !== "." ? `.../${dbDir}/${dbFile}` : dbFile;
    try {
      // Use static path prefix to avoid NFT tracing the whole project
      const resolvedPath = path.isAbsolute(DB_PATH)
        ? DB_PATH
        : path.join(/*turbopackIgnore: true*/ process.cwd(), DB_PATH);
      const stats = statSync(resolvedPath);
      dbSizeBytes = stats.size;
      dbStatus = "ok";
    } catch {
      // file may not exist yet during build
    }

    let workerStatus: "online" | "offline" | "warning" = "offline";
    if (lastHeartbeat) {
      const age =
        now.getTime() - new Date(lastHeartbeat.heartbeat_at).getTime();
      if (age < 60_000) {
        workerStatus = "online";
      } else if (age < 300_000) {
        workerStatus = "warning";
      }
    }

    const sizeHuman =
      dbSizeBytes < 1024
        ? `${dbSizeBytes} B`
        : dbSizeBytes < 1024 * 1024
          ? `${(dbSizeBytes / 1024).toFixed(1)} KB`
          : `${(dbSizeBytes / (1024 * 1024)).toFixed(1)} MB`;

    return NextResponse.json({
      threads: {
        status: tokenStatus,
        username: account?.username ?? null,
        token_expires_at: tokenExpiresAt,
        last_checked_at: account?.token_last_checked_at ?? null,
        last_refreshed_at: account?.token_last_refreshed_at ?? null,
        api_connection_status: apiConnectionStatus,
        api_connection_checked_at: apiConnectionCheckedAt,
        api_connection_error: apiConnectionError,
      },
      webhook: {
        last_received_at: lastWebhook?.received_at ?? null,
        last_signature_valid: lastWebhook?.signature_valid === 1,
      },
      worker: {
        status: workerStatus,
        last_heartbeat: lastHeartbeat?.heartbeat_at ?? null,
        hostname: lastHeartbeat?.hostname ?? null,
        pid: lastHeartbeat?.pid ?? null,
      },
      database: {
        path_masked: pathMasked,
        size_bytes: dbStatus === "ok" ? dbSizeBytes : null,
        size_human: dbStatus === "ok" ? sizeHuman : null,
        status: dbStatus,
      },
    });
  } catch (error) {
    console.error("Health API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown health error",
      },
      { status: 500 },
    );
  }
}
