import "@/server/lib/server-only";

import OpenAI from "openai";
import {
  getResolvedRuntimeSettings,
  isLocalBaseUrl,
} from "@/server/admin/settings";

export interface OpenAIClientConfig {
  apiKey: string;
  baseURL: string;
  modelName: string;
  timeoutMs?: number;
}

export interface OpenAIClientBundle {
  client: OpenAI;
  modelName: string;
  baseURL: string;
}

function requireSetting(name: string, value: string | null) {
  if (!value?.trim()) {
    throw new Error(`Missing required runtime setting: ${name}`);
  }

  return value.trim();
}

function resolveApiKey(baseURL: string, configuredKey: string | null) {
  if (configuredKey) {
    return configuredKey;
  }

  if (isLocalBaseUrl(baseURL)) {
    return "not-needed-for-local";
  }

  throw new Error("Missing required runtime setting: openAiApiKey");
}

export async function resolveOpenAIClientConfig(): Promise<OpenAIClientConfig> {
  const settings = await getResolvedRuntimeSettings();
  const baseURL = requireSetting("openAiBaseUrl", settings.openAiBaseUrl);
  const parsedTimeoutMs = settings.openAiTimeoutMs;

  return {
    apiKey: resolveApiKey(baseURL, settings.openAiApiKey),
    baseURL,
    modelName: requireSetting("openAiModelName", settings.openAiModelName),
    timeoutMs: parsedTimeoutMs,
  };
}

export async function createOpenAIClient(
  config?: OpenAIClientConfig,
): Promise<OpenAIClientBundle> {
  const resolvedConfig = config ?? (await resolveOpenAIClientConfig());

  return {
    client: new OpenAI({
      apiKey: resolvedConfig.apiKey,
      baseURL: resolvedConfig.baseURL,
      timeout: resolvedConfig.timeoutMs,
    }),
    baseURL: resolvedConfig.baseURL,
    modelName: resolvedConfig.modelName,
  };
}
