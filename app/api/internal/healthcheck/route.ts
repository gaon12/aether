import { NextResponse } from "next/server";
import {
  getResolvedRuntimeSettings,
  isLocalBaseUrl,
} from "@/server/admin/settings";
import { getDb } from "@/server/db";

const REQUIRED_ENV_VARS = ["TOKEN_ENCRYPTION_KEY"];

export async function GET() {
  const startedAt = Date.now();
  const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  let dbReachable = false;
  try {
    const db = getDb();
    await db
      .selectFrom("worker_heartbeats")
      .select("worker_run_id")
      .limit(1)
      .execute();
    dbReachable = true;
  } catch {
    dbReachable = false;
  }

  let missingRuntimeSettings: string[] = [];
  let configurationError: string | null = null;

  try {
    const settings = await getResolvedRuntimeSettings();
    const requiresRemoteApiKey = !isLocalBaseUrl(settings.openAiBaseUrl);

    missingRuntimeSettings = [
      settings.nextPublicAppUrl ? null : "nextPublicAppUrl",
      settings.threadsAppId ? null : "threadsAppId",
      settings.threadsAppSecret ? null : "threadsAppSecret",
      settings.threadsWebhookVerifyToken ? null : "threadsWebhookVerifyToken",
      settings.threadsWebhookSecret ? null : "threadsWebhookSecret",
      settings.cronSecret ? null : "cronSecret",
      settings.openAiBaseUrl ? null : "openAiBaseUrl",
      settings.openAiModelName ? null : "openAiModelName",
      requiresRemoteApiKey && !settings.openAiApiKey ? "openAiApiKey" : null,
    ].filter((value): value is string => Boolean(value));
  } catch (error) {
    configurationError =
      error instanceof Error ? error.message : "Unknown runtime settings error";
  }

  const uptimeSeconds = Math.floor(process.uptime());
  const status =
    dbReachable &&
    missingEnvVars.length === 0 &&
    missingRuntimeSettings.length === 0 &&
    !configurationError
      ? "ok"
      : "degraded";

  return NextResponse.json(
    {
      status,
      uptime_seconds: uptimeSeconds,
      db_reachable: dbReachable,
      missing_env_vars: missingEnvVars,
      missing_runtime_settings: missingRuntimeSettings,
      configuration_error: configurationError,
      checked_at: new Date().toISOString(),
      response_time_ms: Date.now() - startedAt,
    },
    { status: status === "ok" ? 200 : 503 },
  );
}
