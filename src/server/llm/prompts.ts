import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { getResolvedRuntimeSettings } from "@/server/admin/settings";
import { estimateTokenCount, joinPromptSections } from "@/server/llm/tokens";
import type { LlmPromptTemplate, PromptTemplateInput } from "@/types/llm";

function buildMessages(
  systemPrompt: string,
  userPrompt: string,
): ChatCompletionMessageParam[] {
  return [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userPrompt,
    },
  ];
}

function getSummaryLengthInstruction(summaryLength?: number) {
  switch (summaryLength) {
    case 1:
      return "Write ONE sentence that states the core point directly. No framing phrases (e.g. 'The text discusses...' or 'According to...'). Start immediately with the substance.";
    case 2:
      return "Write exactly 2 bullet points (each starting with '• '). Start your response with the first bullet — no header, no intro sentence.";
    case 3:
      return "Write exactly 3 bullet points (each starting with '• '). Start your response with the first bullet — no header, no intro sentence.";
    case 4:
      return "Write exactly 4 bullet points (each starting with '• '). Start your response with the first bullet — no header, no intro sentence.";
    case 5:
      return "Write exactly 5 bullet points (each starting with '• '). Start your response with the first bullet — no header, no intro sentence.";
    default:
      return "Write up to 3 bullet points (each starting with '• '). Start your response with the first bullet — no header, no intro sentence.";
  }
}

export async function buildPromptTemplate({
  defaultSummaryLength,
  parseResult,
  sourceLanguage,
  sourceText,
}: PromptTemplateInput): Promise<LlmPromptTemplate> {
  const settings = await getResolvedRuntimeSettings();
  const effectiveSummaryLength =
    "length" in parseResult
      ? (parseResult.length ?? defaultSummaryLength)
      : undefined;

  function buildSystemPrompt(
    kind: LlmPromptTemplate["kind"],
    taskPrompt: string,
  ) {
    const systemPrompt = joinPromptSections([
      settings.baseSystemPrompt,
      taskPrompt,
    ]);

    return {
      systemPrompt,
      promptMetadata: {
        kind,
        basePromptName: settings.baseSystemPromptName,
        systemPromptTokenCount: estimateTokenCount(systemPrompt),
        basePromptTokenCount: estimateTokenCount(settings.baseSystemPrompt),
        taskPromptTokenCount: estimateTokenCount(taskPrompt),
      },
    };
  }

  if (parseResult.command === "translate") {
    const { systemPrompt, promptMetadata } = buildSystemPrompt(
      parseResult.command,
      settings.translateSystemPrompt,
    );
    const userPrompt = [
      `Translate the following text into ${parseResult.targetLang}.`,
      sourceLanguage ? `Source language hint: ${sourceLanguage}.` : null,
      "",
      sourceText,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      kind: parseResult.command,
      sourceLanguage,
      modelInputText: userPrompt,
      messages: buildMessages(systemPrompt, userPrompt),
      promptMetadata,
    };
  }

  if (parseResult.command === "summary") {
    const { systemPrompt, promptMetadata } = buildSystemPrompt(
      parseResult.command,
      settings.summarySystemPrompt,
    );
    const userPrompt = [
      parseResult.lang
        ? `Summarize the following text in ${parseResult.lang}.`
        : "Summarize the following text in the source language.",
      getSummaryLengthInstruction(effectiveSummaryLength),
      sourceLanguage ? `Source language hint: ${sourceLanguage}.` : null,
      "",
      sourceText,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      kind: parseResult.command,
      sourceLanguage,
      modelInputText: userPrompt,
      messages: buildMessages(systemPrompt, userPrompt),
      promptMetadata,
    };
  }

  const { systemPrompt, promptMetadata } = buildSystemPrompt(
    parseResult.command,
    settings.translateSummarySystemPrompt,
  );
  const userPrompt = [
    `Translate the following text into ${parseResult.targetLang} and then summarize it in the same language.`,
    getSummaryLengthInstruction(effectiveSummaryLength),
    sourceLanguage ? `Source language hint: ${sourceLanguage}.` : null,
    "",
    sourceText,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    kind: parseResult.command,
    sourceLanguage,
    modelInputText: userPrompt,
    messages: buildMessages(systemPrompt, userPrompt),
    promptMetadata,
  };
}
