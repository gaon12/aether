import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";
import { getAdminSessionFromRequest, hasAdminUser } from "@/server/admin/auth";
import { readRuntimeSettingsForm } from "@/server/admin/runtimeSettingsForm";
import {
  getResolvedRuntimeSettings,
  updateRuntimeSettings,
} from "@/server/admin/settings";
import { resolvePublicAppUrlFromRequest } from "@/server/http/public-url";

function buildRedirect(request: Request, searchParams?: URLSearchParams) {
  const url = new URL("/admin/api", request.url);

  if (searchParams) {
    url.search = searchParams.toString();
  }

  return NextResponse.redirect(url, { status: 303 });
}

export async function GET(request: Request) {
  if (!(await hasAdminUser())) {
    return NextResponse.redirect(new URL("/setup", request.url), {
      status: 303,
    });
  }

  if (!(await getAdminSessionFromRequest(request))) {
    return NextResponse.redirect(new URL("/login", request.url), {
      status: 303,
    });
  }

  const settings = await getResolvedRuntimeSettings();

  return NextResponse.json({
    ...settings,
    threadsAppSecretConfigured: Boolean(settings.threadsAppSecret),
    threadsWebhookVerifyTokenConfigured: Boolean(
      settings.threadsWebhookVerifyToken,
    ),
    threadsWebhookSecretConfigured: Boolean(settings.threadsWebhookSecret),
    cronSecretConfigured: Boolean(settings.cronSecret),
    openAiApiKeyConfigured: Boolean(settings.openAiApiKey),
    threadsAppSecret: undefined,
    threadsWebhookVerifyToken: undefined,
    threadsWebhookSecret: undefined,
    cronSecret: undefined,
    openAiApiKey: undefined,
  });
}

export async function POST(request: Request) {
  if (!(await hasAdminUser())) {
    return NextResponse.redirect(new URL("/setup", request.url), {
      status: 303,
    });
  }

  if (!(await getAdminSessionFromRequest(request))) {
    return NextResponse.redirect(new URL("/login", request.url), {
      status: 303,
    });
  }

  const formData = await request.formData();

  try {
    const currentSettings = await getResolvedRuntimeSettings();
    const nextSettings = readRuntimeSettingsForm(formData, currentSettings);
    nextSettings.nextPublicAppUrl =
      resolvePublicAppUrlFromRequest(request, null) ??
      currentSettings.nextPublicAppUrl;

    // Webhook Verify Token: auto-generate a secure random token if one isn't stored yet.
    // Once generated it stays stable so Meta's subscription remains valid.
    if (!nextSettings.threadsWebhookVerifyToken) {
      nextSettings.threadsWebhookVerifyToken = randomBytes(32).toString("hex");
    }

    // Webhook Secret = App Secret (Meta signs webhook payloads with the App Secret).
    // Sync automatically so the admin only has to manage one value.
    if (nextSettings.threadsAppSecret) {
      nextSettings.threadsWebhookSecret = nextSettings.threadsAppSecret;
    }

    await updateRuntimeSettings(nextSettings);

    if (request.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({ saved: true });
    }
    return buildRedirect(request, new URLSearchParams({ saved: "1" }));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "연동 설정 저장 중 오류가 발생했습니다.";
    if (request.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return buildRedirect(request, new URLSearchParams({ error: message }));
  }
}
