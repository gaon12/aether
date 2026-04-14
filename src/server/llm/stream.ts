import type OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { estimateMessageTokens, estimateTokenCount } from "@/server/llm/tokens";
import type { LlmStreamResult } from "@/types/llm";

type RawLlmStreamResult = Omit<LlmStreamResult, "promptMetadata"> & {
  rawText: string;
  thinkingContent: string;
};

export interface StreamCompletionInput {
  client: OpenAI;
  baseURL?: string;
  modelName: string;
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  reasoningEnabled?: boolean;
  reasoningEffort?: string;
}

function nowIsoString(timestamp = Date.now()) {
  return new Date(timestamp).toISOString();
}

type ReasoningProvider =
  | "anthropic"
  | "deepseek"
  | "google"
  | "groq"
  | "openai"
  | "openrouter"
  | "xai"
  | "zai"
  | "unknown";

interface ReasoningRequestConfig {
  params: Record<string, unknown>;
  strictDisable: boolean;
}

function detectReasoningProvider(
  baseURL: string | undefined,
): ReasoningProvider {
  if (!baseURL) {
    return "unknown";
  }

  try {
    const hostname = new URL(baseURL).hostname.toLowerCase();

    if (hostname === "api.openai.com" || hostname.endsWith(".openai.com")) {
      return "openai";
    }
    if (
      hostname === "api.anthropic.com" ||
      hostname.endsWith(".anthropic.com")
    ) {
      return "anthropic";
    }
    if (hostname === "generativelanguage.googleapis.com") {
      return "google";
    }
    if (hostname === "api.x.ai" || hostname.endsWith(".x.ai")) {
      return "xai";
    }
    if (hostname === "api.groq.com" || hostname.endsWith(".groq.com")) {
      return "groq";
    }
    if (hostname === "openrouter.ai" || hostname.endsWith(".openrouter.ai")) {
      return "openrouter";
    }
    if (
      hostname === "api.z.ai" ||
      hostname === "open.bigmodel.cn" ||
      hostname.endsWith(".z.ai")
    ) {
      return "zai";
    }
    if (hostname === "api.deepseek.com" || hostname.endsWith(".deepseek.com")) {
      return "deepseek";
    }
  } catch {
    return "unknown";
  }

  return "unknown";
}

function mapThinkingBudget(reasoningEffort: string) {
  switch (reasoningEffort) {
    case "low":
      return 1024;
    case "high":
      return 8192;
    default:
      return 4096;
  }
}

function buildReasoningRequestConfig(input: {
  baseURL?: string;
  reasoningEnabled: boolean;
  reasoningEffort: string;
}): ReasoningRequestConfig {
  const provider = detectReasoningProvider(input.baseURL);

  switch (provider) {
    case "google":
      return {
        params: {
          reasoning_effort: input.reasoningEnabled
            ? input.reasoningEffort
            : "none",
        },
        strictDisable: !input.reasoningEnabled,
      };
    case "anthropic":
      return {
        params: input.reasoningEnabled
          ? {
              thinking: {
                type: "enabled",
                budget_tokens: mapThinkingBudget(input.reasoningEffort),
              },
            }
          : {},
        strictDisable: false,
      };
    case "openrouter":
      return {
        params: {
          reasoning: input.reasoningEnabled
            ? {
                enabled: true,
                effort: input.reasoningEffort,
              }
            : {
                enabled: false,
              },
        },
        strictDisable: false,
      };
    case "zai":
    case "deepseek":
      return {
        params: {
          thinking: {
            type: input.reasoningEnabled ? "enabled" : "disabled",
          },
        },
        strictDisable: !input.reasoningEnabled,
      };
    case "openai":
    case "groq":
      return {
        params: {
          reasoning_effort: input.reasoningEnabled
            ? input.reasoningEffort
            : "none",
        },
        strictDisable: !input.reasoningEnabled,
      };
    case "xai":
      return {
        params: input.reasoningEnabled
          ? {
              reasoning: {
                effort: input.reasoningEffort,
              },
            }
          : {},
        strictDisable: false,
      };
    default:
      return {
        params: input.reasoningEnabled
          ? {
              reasoning_effort: input.reasoningEffort,
            }
          : {},
        strictDisable: false,
      };
  }
}

function shouldRetryWithoutReasoningEffort(error: unknown) {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return (
    message.includes("reasoning") ||
    message.includes("reasoning_effort") ||
    message.includes("unsupported") ||
    message.includes("unknown parameter") ||
    message.includes("extra inputs") ||
    message.includes("invalid argument")
  );
}

function shouldSurfaceReasoningDisableFailure(error: unknown) {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return (
    message.includes("cannot be turned off") ||
    message.includes("reasoning cannot be turned off") ||
    message.includes("thinking cannot be turned off") ||
    message.includes("does not support disabling") ||
    message.includes("not supported for this model")
  );
}

/** Extract and strip <think>/<thinking> blocks. Returns { cleaned, thinking }. */
export function extractThinkingContent(text: string): {
  cleaned: string;
  thinking: string;
} {
  const thinkingParts: string[] = [];
  const cleaned = text
    .replace(/<think>([\s\S]*?)<\/think>/gi, (_, inner: string) => {
      thinkingParts.push(inner.trim());
      return "";
    })
    .replace(/<thinking>([\s\S]*?)<\/thinking>/gi, (_, inner: string) => {
      thinkingParts.push(inner.trim());
      return "";
    })
    .trim();
  return { cleaned, thinking: thinkingParts.join("\n\n") };
}

export async function streamChatCompletion({
  client,
  baseURL,
  messages,
  modelName,
  temperature = 0.2,
  reasoningEnabled = false,
  reasoningEffort = "medium",
}: StreamCompletionInput): Promise<RawLlmStreamResult> {
  const startedAtMs = Date.now();
  const startedAt = nowIsoString(startedAtMs);

  let firstTokenAtMs: number | null = null;
  let finishReason: string | null = null;
  let outputText = "";
  let streamChunkCount = 0;
  let usage:
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        completion_tokens_details?: { reasoning_tokens?: number };
      }
    | undefined;

  const requestInput: Record<string, unknown> = {
    model: modelName,
    messages,
    stream: true,
    stream_options: { include_usage: true },
    temperature,
  };
  const createCompletion = client.chat.completions.create.bind(
    client.chat.completions,
  ) as unknown as (
    input: Record<string, unknown>,
  ) => Promise<
    AsyncIterable<
      import("openai/resources/chat/completions").ChatCompletionChunk
    >
  >;
  const reasoningRequest = buildReasoningRequestConfig({
    baseURL,
    reasoningEnabled,
    reasoningEffort,
  });

  Object.assign(requestInput, reasoningRequest.params);

  let responseStream: AsyncIterable<
    import("openai/resources/chat/completions").ChatCompletionChunk
  >;

  try {
    responseStream = await createCompletion(requestInput);
  } catch (error) {
    if (
      reasoningRequest.strictDisable &&
      shouldSurfaceReasoningDisableFailure(error)
    ) {
      throw new Error(
        `현재 모델 "${modelName}"은 이 엔드포인트에서 추론 모드를 끌 수 없습니다.`,
        { cause: error instanceof Error ? error : undefined },
      );
    }

    if (!reasoningEnabled || !shouldRetryWithoutReasoningEffort(error)) {
      throw error;
    }

    const fallbackInput = {
      ...requestInput,
    };
    delete fallbackInput.reasoning_effort;
    delete fallbackInput.reasoning;
    delete fallbackInput.thinking;

    responseStream = await createCompletion(fallbackInput);
  }

  for await (const chunk of responseStream) {
    streamChunkCount += 1;
    finishReason = chunk.choices[0]?.finish_reason ?? finishReason;
    if (chunk.usage) usage = chunk.usage as typeof usage;

    const delta = chunk.choices[0]?.delta?.content;
    if (!delta) continue;

    if (firstTokenAtMs === null) {
      firstTokenAtMs = Date.now();
    }
    outputText += delta;
  }

  const completedAtMs = Date.now();
  const completedAt = nowIsoString(completedAtMs);
  const durationMs = completedAtMs - startedAtMs;

  // Always extract <think> blocks so they're never posted, regardless of reasoning mode.
  const { cleaned: cleanedText, thinking: thinkingContent } =
    extractThinkingContent(outputText);

  const outputTokenCount =
    usage?.completion_tokens ?? estimateTokenCount(cleanedText);
  const inputTokenCount =
    usage?.prompt_tokens ?? estimateMessageTokens(messages);
  const reasoningTokenCount =
    usage?.completion_tokens_details?.reasoning_tokens ?? null;
  const streamDurationSeconds =
    firstTokenAtMs === null
      ? durationMs / 1_000
      : Math.max(0.001, (completedAtMs - firstTokenAtMs) / 1_000);

  return {
    rawText: outputText,
    thinkingContent,
    text: cleanedText,
    finishReason,
    modelName,
    metrics: {
      startedAt,
      firstTokenAt: firstTokenAtMs ? nowIsoString(firstTokenAtMs) : null,
      completedAt,
      durationMs,
      firstTokenLatencyMs:
        firstTokenAtMs === null ? null : firstTokenAtMs - startedAtMs,
      inputTokenCount,
      outputTokenCount,
      outputTokensPerSecond: Number(
        (outputTokenCount / streamDurationSeconds).toFixed(2),
      ),
      streamChunkCount,
      reasoningTokenCount,
    },
  };
}
