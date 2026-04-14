import { getResolvedRuntimeSettings } from "@/server/admin/settings";
import type { OpenAIClientBundle } from "@/server/llm/client";
import { buildPromptTemplate } from "@/server/llm/prompts";
import { streamChatCompletion } from "@/server/llm/stream";
import type { WorkerLlmRunner } from "@/server/worker/types";

export function createOpenAiLlmRunner(
  bundle: OpenAIClientBundle,
): WorkerLlmRunner {
  return {
    async generate({
      defaultSummaryLength,
      parseResult,
      sourceLanguage,
      sourceText,
    }) {
      const [promptTemplate, settings] = await Promise.all([
        buildPromptTemplate({
          defaultSummaryLength,
          parseResult,
          sourceLanguage,
          sourceText,
        }),
        getResolvedRuntimeSettings(),
      ]);

      const llmResult = await streamChatCompletion({
        client: bundle.client,
        baseURL: bundle.baseURL,
        modelName: bundle.modelName,
        messages: promptTemplate.messages,
        reasoningEnabled: settings.openAiReasoningEnabled,
        reasoningEffort: settings.openAiReasoningEffort,
      });

      return {
        ...llmResult,
        promptMetadata: promptTemplate.promptMetadata,
      };
    },
  };
}
