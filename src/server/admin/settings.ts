import "@/server/lib/server-only";

import { getDb } from "@/server/db";
import { decrypt, encrypt } from "@/server/lib/crypto";
import {
  DEFAULT_BASE_SYSTEM_PROMPT,
  DEFAULT_BASE_SYSTEM_PROMPT_NAME,
  DEFAULT_SUMMARY_SYSTEM_PROMPT,
  DEFAULT_TRANSLATE_SUMMARY_SYSTEM_PROMPT,
  DEFAULT_TRANSLATE_SYSTEM_PROMPT,
} from "@/server/llm/default-prompts";

export type TextAggregationMode = "combined" | "primary_only";
export type ReasoningEffort = "low" | "medium" | "high";

export interface AppSettings {
  botHandle: string | null;
  minSourceCharacters: number;
  maxSummaryLength: number;
  defaultSummaryLength: number;
  textAggregationMode: TextAggregationMode;
  privacyPolicy: string;
  termsOfService: string;
  userDataDeletion: string;
}

export interface RuntimeSettings extends AppSettings {
  nextPublicAppUrl: string | null;
  threadsAppId: string | null;
  threadsAppSecret: string | null;
  threadsWebhookVerifyToken: string | null;
  threadsWebhookSecret: string | null;
  cronSecret: string | null;
  openAiBaseUrl: string;
  openAiApiKey: string | null;
  openAiModelName: string;
  openAiTimeoutMs: number;
  openAiReasoningEnabled: boolean;
  openAiReasoningEffort: ReasoningEffort;
  workerAdapterModule: string;
  metricsAdapterModule: string;
  workerPollIntervalMs: number;
  workerHeartbeatIntervalMs: number;
  tokenCheckIntervalMs: number;
  baseSystemPromptName: string;
  baseSystemPrompt: string;
  translateSystemPrompt: string;
  summarySystemPrompt: string;
  translateSummarySystemPrompt: string;
}

export interface AppSettingsUpdateInput {
  botHandle: string | null;
  minSourceCharacters: number;
  maxSummaryLength: number;
  defaultSummaryLength: number;
  textAggregationMode: TextAggregationMode;
  privacyPolicy: string;
  termsOfService: string;
  userDataDeletion: string;
}

export interface RuntimeSettingsUpdateInput extends AppSettingsUpdateInput {
  nextPublicAppUrl: string | null;
  threadsAppId: string | null;
  threadsAppSecret: string | null;
  threadsWebhookVerifyToken: string | null;
  threadsWebhookSecret: string | null;
  cronSecret: string | null;
  openAiBaseUrl: string;
  openAiApiKey: string | null;
  openAiModelName: string;
  openAiTimeoutMs: number;
  openAiReasoningEnabled: boolean;
  openAiReasoningEffort: ReasoningEffort;
  workerAdapterModule: string;
  metricsAdapterModule: string;
  workerPollIntervalMs: number;
  workerHeartbeatIntervalMs: number;
  tokenCheckIntervalMs: number;
  baseSystemPromptName: string;
  baseSystemPrompt: string;
  translateSystemPrompt: string;
  summarySystemPrompt: string;
  translateSummarySystemPrompt: string;
}

type RuntimeSettingKey = keyof RuntimeSettingsUpdateInput;

const SECRET_SETTING_KEYS = new Set<RuntimeSettingKey>([
  "threadsAppSecret",
  "threadsWebhookVerifyToken",
  "threadsWebhookSecret",
  "cronSecret",
  "openAiApiKey",
]);

export const DEFAULT_PRIVACY_POLICY = `개인정보처리방침

1. 개인정보의 처리 목적
Aether(이하 '서비스')는 서비스 제공 및 고도화를 위해 최소한의 개인정보를 처리합니다.

2. 수집하는 개인정보의 항목
서비스는 Threads API를 통해 연동된 계정의 기본 프로필 정보 및 봇과 상호작용한 게시물 데이터를 수집합니다.

3. 개인정보의 보유 및 이용기간
서비스 제공 목적이 달성된 후 또는 사용자가 데이터 삭제를 요청할 경우 지체 없이 파기합니다.`;

export const DEFAULT_TERMS_OF_SERVICE = `서비스 이용약관

1. 서비스의 목적
본 서비스는 Threads 플랫폼에서 게시물을 번역하고 요약하는 기능을 제공합니다.

2. 이용자의 의무
이용자는 본 서비스를 불법적이거나 타인의 권리를 침해하는 용도로 사용해서는 안 됩니다.

3. 책임의 한계
서비스는 기술적 한계로 인해 번역이나 요약의 정확성을 100% 보장하지 않으며, 이로 인해 발생하는 손해에 대해 책임을 지지 않습니다.`;

export const DEFAULT_USER_DATA_DELETION = `사용자 데이터 삭제 안내

1. 데이터 삭제 요청 방법
서비스와 연결된 Threads 앱의 설정에서 앱 연동을 해제하거나, 관리자에게 문의하여 데이터 삭제를 요청할 수 있습니다.

2. 삭제되는 데이터
연동 해제 또는 요청 시, 해당 계정과 연동되어 저장된 모든 프로필 정보 및 캐시 데이터가 즉시 삭제됩니다.

3. 처리 기간
요청 즉시 또는 영업일 기준 5일 이내에 모든 처리가 완료됩니다.`;

const DEFAULT_SETTINGS: RuntimeSettings = {
  botHandle: null,
  minSourceCharacters: 24,
  maxSummaryLength: 5,
  defaultSummaryLength: 3,
  textAggregationMode: "combined",
  privacyPolicy: DEFAULT_PRIVACY_POLICY,
  termsOfService: DEFAULT_TERMS_OF_SERVICE,
  userDataDeletion: DEFAULT_USER_DATA_DELETION,
  nextPublicAppUrl: null,
  threadsAppId: null,
  threadsAppSecret: null,
  threadsWebhookVerifyToken: null,
  threadsWebhookSecret: null,
  cronSecret: null,
  openAiBaseUrl: "http://localhost:11434/v1",
  openAiApiKey: null,
  openAiModelName: "llama3",
  openAiTimeoutMs: 60_000,
  openAiReasoningEnabled: true,
  openAiReasoningEffort: "medium",
  workerAdapterModule: "./src/server/worker/adapter.ts",
  metricsAdapterModule: "./src/server/metrics/adapter.ts",
  workerPollIntervalMs: 5_000,
  workerHeartbeatIntervalMs: 15_000,
  tokenCheckIntervalMs: 1000 * 60 * 60 * 6,
  baseSystemPromptName: DEFAULT_BASE_SYSTEM_PROMPT_NAME,
  baseSystemPrompt: DEFAULT_BASE_SYSTEM_PROMPT,
  translateSystemPrompt: DEFAULT_TRANSLATE_SYSTEM_PROMPT,
  summarySystemPrompt: DEFAULT_SUMMARY_SYSTEM_PROMPT,
  translateSummarySystemPrompt: DEFAULT_TRANSLATE_SUMMARY_SYSTEM_PROMPT,
};

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeRequiredString(value: unknown, fallback: string) {
  return normalizeOptionalString(value) ?? fallback;
}

function normalizeOptionalUrl(value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function normalizeRequiredInteger(
  value: unknown,
  fallback: number,
  { min, max }: { min: number; max: number },
) {
  const numericValue =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(numericValue)));
}

function normalizeBotHandle(value: unknown) {
  const trimmed = normalizeOptionalString(value);
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function normalizeAggregationMode(value: unknown): TextAggregationMode {
  return value === "primary_only" ? "primary_only" : "combined";
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (value === "on" || value === "true" || value === "1" || value === 1)
    return true;
  if (value === "off" || value === "false" || value === "0" || value === 0)
    return false;
  return fallback;
}

function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}

function normalizeSettings(
  input: RuntimeSettingsUpdateInput,
  fallbackSettings = DEFAULT_SETTINGS,
): RuntimeSettings {
  const maxSummaryLength = normalizeRequiredInteger(
    input.maxSummaryLength,
    fallbackSettings.maxSummaryLength,
    { min: 1, max: 10 },
  );

  return {
    botHandle: normalizeBotHandle(input.botHandle),
    minSourceCharacters: normalizeRequiredInteger(
      input.minSourceCharacters,
      fallbackSettings.minSourceCharacters,
      { min: 1, max: 5000 },
    ),
    maxSummaryLength,
    defaultSummaryLength: normalizeRequiredInteger(
      input.defaultSummaryLength,
      Math.min(maxSummaryLength, fallbackSettings.defaultSummaryLength),
      { min: 1, max: maxSummaryLength },
    ),
    textAggregationMode: normalizeAggregationMode(input.textAggregationMode),
    privacyPolicy: normalizeRequiredString(
      input.privacyPolicy,
      fallbackSettings.privacyPolicy,
    ),
    termsOfService: normalizeRequiredString(
      input.termsOfService,
      fallbackSettings.termsOfService,
    ),
    userDataDeletion: normalizeRequiredString(
      input.userDataDeletion,
      fallbackSettings.userDataDeletion,
    ),
    nextPublicAppUrl: normalizeOptionalUrl(input.nextPublicAppUrl),
    threadsAppId: normalizeOptionalString(input.threadsAppId),
    threadsAppSecret: normalizeOptionalString(input.threadsAppSecret),
    threadsWebhookVerifyToken: normalizeOptionalString(
      input.threadsWebhookVerifyToken,
    ),
    threadsWebhookSecret: normalizeOptionalString(input.threadsWebhookSecret),
    cronSecret: normalizeOptionalString(input.cronSecret),
    openAiBaseUrl: normalizeRequiredString(
      input.openAiBaseUrl,
      fallbackSettings.openAiBaseUrl,
    ),
    openAiApiKey: normalizeOptionalString(input.openAiApiKey),
    openAiModelName: normalizeRequiredString(
      input.openAiModelName,
      fallbackSettings.openAiModelName,
    ),
    openAiTimeoutMs: normalizeRequiredInteger(
      input.openAiTimeoutMs,
      fallbackSettings.openAiTimeoutMs,
      { min: 1_000, max: 600_000 },
    ),
    openAiReasoningEnabled: normalizeBoolean(
      input.openAiReasoningEnabled,
      fallbackSettings.openAiReasoningEnabled,
    ),
    openAiReasoningEffort: normalizeReasoningEffort(
      input.openAiReasoningEffort,
    ),
    workerAdapterModule: normalizeRequiredString(
      input.workerAdapterModule,
      fallbackSettings.workerAdapterModule,
    ),
    metricsAdapterModule: normalizeRequiredString(
      input.metricsAdapterModule,
      fallbackSettings.metricsAdapterModule,
    ),
    workerPollIntervalMs: normalizeRequiredInteger(
      input.workerPollIntervalMs,
      fallbackSettings.workerPollIntervalMs,
      { min: 100, max: 600_000 },
    ),
    workerHeartbeatIntervalMs: normalizeRequiredInteger(
      input.workerHeartbeatIntervalMs,
      fallbackSettings.workerHeartbeatIntervalMs,
      { min: 100, max: 600_000 },
    ),
    tokenCheckIntervalMs: normalizeRequiredInteger(
      input.tokenCheckIntervalMs,
      fallbackSettings.tokenCheckIntervalMs,
      { min: 1_000, max: 1000 * 60 * 60 * 24 * 30 },
    ),
    baseSystemPromptName: normalizeRequiredString(
      input.baseSystemPromptName,
      fallbackSettings.baseSystemPromptName,
    ),
    baseSystemPrompt: normalizeRequiredString(
      input.baseSystemPrompt,
      fallbackSettings.baseSystemPrompt,
    ),
    translateSystemPrompt: normalizeRequiredString(
      input.translateSystemPrompt,
      fallbackSettings.translateSystemPrompt,
    ),
    summarySystemPrompt: normalizeRequiredString(
      input.summarySystemPrompt,
      fallbackSettings.summarySystemPrompt,
    ),
    translateSummarySystemPrompt: normalizeRequiredString(
      input.translateSummarySystemPrompt,
      fallbackSettings.translateSummarySystemPrompt,
    ),
  };
}

function serializeStoredValue(key: RuntimeSettingKey, value: unknown) {
  if (!SECRET_SETTING_KEYS.has(key)) {
    return JSON.stringify(value);
  }

  const normalizedSecret = normalizeOptionalString(value);
  if (!normalizedSecret) {
    return JSON.stringify(null);
  }

  return JSON.stringify({ encrypted: encrypt(normalizedSecret) });
}

function deserializeStoredValue(key: RuntimeSettingKey, rawValueJson: string) {
  const parsed = JSON.parse(rawValueJson) as unknown;

  if (!SECRET_SETTING_KEYS.has(key)) {
    return parsed;
  }

  if (parsed === null) {
    return null;
  }

  if (typeof parsed === "string") {
    return normalizeOptionalString(parsed);
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "encrypted" in parsed &&
    typeof parsed.encrypted === "string"
  ) {
    try {
      return normalizeOptionalString(decrypt(parsed.encrypted));
    } catch (error) {
      throw new Error(
        `저장된 설정 "${key}"를 복호화하지 못했습니다. TOKEN_ENCRYPTION_KEY를 확인해 주세요.`,
        { cause: error },
      );
    }
  }

  return null;
}

async function loadStoredSettings() {
  const db = getDb();
  const rows = await db
    .selectFrom("app_settings")
    .select(["setting_key", "value_json"])
    .execute();

  const settings = new Map<RuntimeSettingKey, unknown>();

  for (const row of rows) {
    const key = row.setting_key as RuntimeSettingKey;
    settings.set(key, deserializeStoredValue(key, row.value_json));
  }

  return settings;
}

function buildRuntimeSettingsFromStoredValues(
  storedSettings: Map<RuntimeSettingKey, unknown>,
) {
  const getStoredValue = <T>(key: RuntimeSettingKey, fallback: T) =>
    (storedSettings.get(key) as T | undefined) ?? fallback;

  return normalizeSettings({
    botHandle: getStoredValue("botHandle", DEFAULT_SETTINGS.botHandle),
    minSourceCharacters: getStoredValue(
      "minSourceCharacters",
      DEFAULT_SETTINGS.minSourceCharacters,
    ),
    maxSummaryLength: getStoredValue(
      "maxSummaryLength",
      DEFAULT_SETTINGS.maxSummaryLength,
    ),
    defaultSummaryLength: getStoredValue(
      "defaultSummaryLength",
      DEFAULT_SETTINGS.defaultSummaryLength,
    ),
    textAggregationMode: getStoredValue(
      "textAggregationMode",
      DEFAULT_SETTINGS.textAggregationMode,
    ),
    privacyPolicy: getStoredValue(
      "privacyPolicy",
      DEFAULT_SETTINGS.privacyPolicy,
    ),
    termsOfService: getStoredValue(
      "termsOfService",
      DEFAULT_SETTINGS.termsOfService,
    ),
    userDataDeletion: getStoredValue(
      "userDataDeletion",
      DEFAULT_SETTINGS.userDataDeletion,
    ),
    nextPublicAppUrl: getStoredValue(
      "nextPublicAppUrl",
      DEFAULT_SETTINGS.nextPublicAppUrl,
    ),
    threadsAppId: getStoredValue("threadsAppId", DEFAULT_SETTINGS.threadsAppId),
    threadsAppSecret: getStoredValue(
      "threadsAppSecret",
      DEFAULT_SETTINGS.threadsAppSecret,
    ),
    threadsWebhookVerifyToken: getStoredValue(
      "threadsWebhookVerifyToken",
      DEFAULT_SETTINGS.threadsWebhookVerifyToken,
    ),
    threadsWebhookSecret: getStoredValue(
      "threadsWebhookSecret",
      DEFAULT_SETTINGS.threadsWebhookSecret,
    ),
    cronSecret: getStoredValue("cronSecret", DEFAULT_SETTINGS.cronSecret),
    openAiBaseUrl: getStoredValue(
      "openAiBaseUrl",
      DEFAULT_SETTINGS.openAiBaseUrl,
    ),
    openAiApiKey: getStoredValue("openAiApiKey", DEFAULT_SETTINGS.openAiApiKey),
    openAiModelName: getStoredValue(
      "openAiModelName",
      DEFAULT_SETTINGS.openAiModelName,
    ),
    openAiTimeoutMs: getStoredValue(
      "openAiTimeoutMs",
      DEFAULT_SETTINGS.openAiTimeoutMs,
    ),
    openAiReasoningEnabled: getStoredValue(
      "openAiReasoningEnabled",
      DEFAULT_SETTINGS.openAiReasoningEnabled,
    ),
    openAiReasoningEffort: getStoredValue(
      "openAiReasoningEffort",
      DEFAULT_SETTINGS.openAiReasoningEffort,
    ),
    workerAdapterModule: getStoredValue(
      "workerAdapterModule",
      DEFAULT_SETTINGS.workerAdapterModule,
    ),
    metricsAdapterModule: getStoredValue(
      "metricsAdapterModule",
      DEFAULT_SETTINGS.metricsAdapterModule,
    ),
    workerPollIntervalMs: getStoredValue(
      "workerPollIntervalMs",
      DEFAULT_SETTINGS.workerPollIntervalMs,
    ),
    workerHeartbeatIntervalMs: getStoredValue(
      "workerHeartbeatIntervalMs",
      DEFAULT_SETTINGS.workerHeartbeatIntervalMs,
    ),
    tokenCheckIntervalMs: getStoredValue(
      "tokenCheckIntervalMs",
      DEFAULT_SETTINGS.tokenCheckIntervalMs,
    ),
    baseSystemPromptName: getStoredValue(
      "baseSystemPromptName",
      DEFAULT_SETTINGS.baseSystemPromptName,
    ),
    baseSystemPrompt: getStoredValue(
      "baseSystemPrompt",
      DEFAULT_SETTINGS.baseSystemPrompt,
    ),
    translateSystemPrompt: getStoredValue(
      "translateSystemPrompt",
      DEFAULT_SETTINGS.translateSystemPrompt,
    ),
    summarySystemPrompt: getStoredValue(
      "summarySystemPrompt",
      DEFAULT_SETTINGS.summarySystemPrompt,
    ),
    translateSummarySystemPrompt: getStoredValue(
      "translateSummarySystemPrompt",
      DEFAULT_SETTINGS.translateSummarySystemPrompt,
    ),
  });
}

async function upsertSettingsEntries(settings: RuntimeSettings) {
  const db = getDb();
  const now = new Date().toISOString();
  const entries = Object.entries(settings) as Array<
    [RuntimeSettingKey, unknown]
  >;

  await db.transaction().execute(async (trx) => {
    for (const [settingKey, value] of entries) {
      const valueJson = serializeStoredValue(settingKey, value);

      await trx
        .insertInto("app_settings")
        .values({
          setting_key: settingKey,
          value_json: valueJson,
          updated_at: now,
        })
        .onConflict((oc) =>
          oc.column("setting_key").doUpdateSet({
            value_json: valueJson,
            updated_at: now,
          }),
        )
        .execute();
    }
  });
}

export async function getResolvedRuntimeSettings(): Promise<RuntimeSettings> {
  const storedSettings = await loadStoredSettings();
  return buildRuntimeSettingsFromStoredValues(storedSettings);
}

export async function getResolvedAppSettings(): Promise<AppSettings> {
  const settings = await getResolvedRuntimeSettings();

  return {
    botHandle: settings.botHandle,
    minSourceCharacters: settings.minSourceCharacters,
    maxSummaryLength: settings.maxSummaryLength,
    defaultSummaryLength: settings.defaultSummaryLength,
    textAggregationMode: settings.textAggregationMode,
    privacyPolicy: settings.privacyPolicy,
    termsOfService: settings.termsOfService,
    userDataDeletion: settings.userDataDeletion,
  };
}

export async function updateRuntimeSettings(input: RuntimeSettingsUpdateInput) {
  const settings = normalizeSettings(input);
  await upsertSettingsEntries(settings);
  return settings;
}

export async function updateAppSettings(input: AppSettingsUpdateInput) {
  const currentSettings = await getResolvedRuntimeSettings();

  return updateRuntimeSettings({
    ...currentSettings,
    ...input,
  });
}

export function isLocalBaseUrl(baseURL: string) {
  try {
    const url = new URL(baseURL);
    return ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}
