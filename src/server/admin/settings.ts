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

const DEFAULT_SETTINGS: RuntimeSettings = {
  botHandle: null,
  minSourceCharacters: 24,
  maxSummaryLength: 5,
  defaultSummaryLength: 3,
  textAggregationMode: "combined",
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
