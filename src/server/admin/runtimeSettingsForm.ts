import "@/server/lib/server-only";

import type {
  RuntimeSettings,
  RuntimeSettingsUpdateInput,
} from "@/server/admin/settings";

function readOptionalText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readOptionalSecret(
  formData: FormData,
  key: "threadsAppSecret" | "cronSecret" | "openAiApiKey",
  currentValue: string | null,
) {
  const value = readOptionalText(formData, key);
  return value ? value : currentValue;
}

export function readRuntimeSettingsForm(
  formData: FormData,
  currentSettings: RuntimeSettings,
): RuntimeSettingsUpdateInput {
  return {
    ...currentSettings,
    // nextPublicAppUrl은 UI에서 입력받지 않고 request.url에서 자동 파생
    threadsAppId: readOptionalText(formData, "threadsAppId"),
    threadsAppSecret: readOptionalSecret(
      formData,
      "threadsAppSecret",
      currentSettings.threadsAppSecret,
    ),
    // threadsWebhookVerifyToken: auto-generated server-side if absent
    // threadsWebhookSecret: auto-derived from threadsAppSecret server-side
    cronSecret: readOptionalSecret(
      formData,
      "cronSecret",
      currentSettings.cronSecret,
    ),
    openAiBaseUrl: readOptionalText(formData, "openAiBaseUrl"),
    openAiApiKey: readOptionalSecret(
      formData,
      "openAiApiKey",
      currentSettings.openAiApiKey,
    ),
    openAiModelName: readOptionalText(formData, "openAiModelName"),
    openAiTimeoutMs: Number.parseInt(
      String(formData.get("openAiTimeoutMs") ?? ""),
      10,
    ),
    openAiReasoningEnabled: formData.get("openAiReasoningEnabled") === "on",
    openAiReasoningEffort: String(
      formData.get("openAiReasoningEffort") ?? "medium",
    ) as import("@/server/admin/settings").ReasoningEffort,
    workerAdapterModule: readOptionalText(formData, "workerAdapterModule"),
    metricsAdapterModule: readOptionalText(formData, "metricsAdapterModule"),
    workerPollIntervalMs: Number.parseInt(
      String(formData.get("workerPollIntervalMs") ?? ""),
      10,
    ),
    workerHeartbeatIntervalMs: Number.parseInt(
      String(formData.get("workerHeartbeatIntervalMs") ?? ""),
      10,
    ),
    tokenCheckIntervalMs: Number.parseInt(
      String(formData.get("tokenCheckIntervalMs") ?? ""),
      10,
    ),
  };
}
