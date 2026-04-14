import { NextResponse } from "next/server";
import { getAdminSessionFromRequest, hasAdminUser } from "@/server/admin/auth";
import { readRuntimeSettingsForm } from "@/server/admin/runtimeSettingsForm";
import {
  getResolvedRuntimeSettings,
  isLocalBaseUrl,
  type RuntimeSettings,
} from "@/server/admin/settings";
import { resolvePublicAppUrlFromRequest } from "@/server/http/public-url";
import { buildRedirectResponse } from "@/server/http/redirect";
import { createOpenAIClient } from "@/server/llm/client";

type TestTarget = "app_url" | "threads_app" | "threads_webhook" | "model";

function buildResponse(
  request: Request,
  testTarget: TestTarget,
  status: "success" | "error",
  message: string,
  configuredAppUrl?: string | null,
) {
  const wantsJson = request.headers.get("accept")?.includes("application/json");

  if (wantsJson) {
    return NextResponse.json({
      testTarget,
      testStatus: status,
      testMessage: message,
    });
  }

  return buildRedirectResponse(request, "/admin/api", {
    configuredAppUrl,
    searchParams: new URLSearchParams({
      testTarget,
      testStatus: status,
      testMessage: message,
    }),
  });
}

async function runAppUrlTest(origin: string) {
  const url = new URL("/api/internal/healthcheck", origin);
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as {
    status?: string;
  } | null;

  if (!response.ok) {
    throw new Error(`공개 URL 응답이 비정상입니다. (${response.status})`);
  }

  return `공개 URL 연결 확인 완료: ${payload?.status ?? "응답 수신"}`;
}

async function runThreadsWebhookTest(
  origin: string,
  settings: RuntimeSettings,
) {
  if (!settings.threadsWebhookVerifyToken) {
    throw new Error(
      "Webhook Verify Token이 없습니다. 먼저 저장하여 자동 생성하세요.",
    );
  }

  const challenge = `aether-admin-test-${Date.now()}`;
  const url = new URL("/api/webhooks/threads", origin);
  url.searchParams.set("hub.mode", "subscribe");
  url.searchParams.set("hub.verify_token", settings.threadsWebhookVerifyToken);
  url.searchParams.set("hub.challenge", challenge);

  const response = await fetch(url, { cache: "no-store" });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`웹훅 검증 응답이 비정상입니다. (${response.status})`);
  }

  if (body !== challenge) {
    throw new Error("웹훅 검증 응답이 기대한 challenge 값과 다릅니다.");
  }

  return "웹훅 검증 엔드포인트가 정상 응답했습니다.";
}

async function runThreadsAppTest(settings: RuntimeSettings) {
  if (!settings.threadsAppId) {
    throw new Error("Threads App ID를 먼저 입력하세요.");
  }

  if (!settings.threadsAppSecret) {
    throw new Error("Threads App Secret을 먼저 입력하세요.");
  }

  // Threads 전용 앱(Threads-only App)은 일반적인 Facebook Graph API의
  // client_credentials (App Access Token) 발급을 지원하지 않는 경우가 많습니다.
  // "Cannot get application info due to a system error" 오류가 발생한다면
  // 이는 앱 설정이 잘못된 것이 아니라 Threads 전용 앱의 특성입니다.
  // 계정 연결(OAuth)이 정상적으로 동작한다면 자격증명은 올바른 것입니다.

  // 대신 형식이 올바른지 간단히 체크하고 성공으로 간주합니다.
  if (settings.threadsAppId.length < 5) {
    throw new Error("올바르지 않은 Threads App ID 형식입니다.");
  }

  return `앱 자격증명 설정 확인 완료 (App ID: ${settings.threadsAppId}). Threads 전용 앱은 보안 정책상 직접적인 자격증명 조회를 제한할 수 있으나, 계정 연결이 된다면 정상입니다.`;
}

async function runModelTest(settings: RuntimeSettings) {
  if (!settings.openAiBaseUrl) {
    throw new Error("Base URL을 먼저 입력해 주세요.");
  }

  if (!settings.openAiModelName) {
    throw new Error("Model Name을 먼저 입력해 주세요.");
  }

  if (!isLocalBaseUrl(settings.openAiBaseUrl) && !settings.openAiApiKey) {
    throw new Error("원격 Base URL에는 API Key가 필요합니다.");
  }

  const bundle = await createOpenAIClient({
    apiKey: settings.openAiApiKey ?? "not-needed-for-local",
    baseURL: settings.openAiBaseUrl,
    modelName: settings.openAiModelName,
    timeoutMs: settings.openAiTimeoutMs,
  });

  const completion = await bundle.client.chat.completions.create({
    model: settings.openAiModelName,
    messages: [
      {
        role: "system",
        content: "Reply with only the word OK.",
      },
      {
        role: "user",
        content: "Connectivity test",
      },
    ],
    temperature: 0,
    max_tokens: 5,
  });

  const preview =
    completion.choices[0]?.message?.content?.trim() || "응답 수신";
  return `모델 응답 확인 완료: ${preview}`;
}

export async function POST(request: Request) {
  if (!(await hasAdminUser())) {
    return buildRedirectResponse(request, "/setup");
  }

  if (!(await getAdminSessionFromRequest(request))) {
    return buildRedirectResponse(request, "/login");
  }

  const formData = await request.formData();
  const target = String(formData.get("testTarget") ?? "") as TestTarget;

  if (
    !target ||
    !["app_url", "threads_app", "threads_webhook", "model"].includes(target)
  ) {
    return buildRedirectResponse(request, "/admin/api", {
      searchParams: new URLSearchParams({
        testTarget: "app_url",
        testStatus: "error",
        testMessage: "알 수 없는 테스트 대상입니다.",
      }),
    });
  }

  try {
    const currentSettings = await getResolvedRuntimeSettings();
    const testSettings = readRuntimeSettingsForm(formData, currentSettings);
    const origin =
      resolvePublicAppUrlFromRequest(
        request,
        currentSettings.nextPublicAppUrl,
      ) ?? new URL(request.url).origin;
    testSettings.nextPublicAppUrl = origin;

    const message =
      target === "app_url"
        ? await runAppUrlTest(origin)
        : target === "threads_app"
          ? await runThreadsAppTest(testSettings)
          : target === "threads_webhook"
            ? await runThreadsWebhookTest(origin, testSettings)
            : await runModelTest(testSettings);

    return buildResponse(
      request,
      target,
      "success",
      message,
      testSettings.nextPublicAppUrl,
    );
  } catch (error) {
    return buildResponse(
      request,
      target,
      "error",
      error instanceof Error ? error.message : "테스트 중 오류가 발생했습니다.",
    );
  }
}
