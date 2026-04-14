import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import type { ParseSuccess, SupportedCommandType } from "@/types/parser";

export type LlmPromptKind = SupportedCommandType;

export interface LlmPromptMetadata {
  kind: LlmPromptKind;
  basePromptName: string;
  systemPromptTokenCount: number;
  basePromptTokenCount: number;
  taskPromptTokenCount: number;
}

export interface PromptTemplateInput {
  defaultSummaryLength?: number;
  parseResult: ParseSuccess;
  sourceText: string;
  sourceLanguage?: string | null;
}

export interface LlmPromptTemplate {
  kind: LlmPromptKind;
  modelInputText: string;
  sourceLanguage?: string | null;
  messages: ChatCompletionMessageParam[];
  promptMetadata: LlmPromptMetadata;
}

export interface LlmStreamMetrics {
  startedAt: string;
  firstTokenAt: string | null;
  completedAt: string;
  durationMs: number;
  firstTokenLatencyMs: number | null;
  inputTokenCount: number;
  outputTokenCount: number;
  outputTokensPerSecond: number;
  streamChunkCount: number;
  reasoningTokenCount: number | null;
}

export interface LlmStreamResult {
  text: string;
  finishReason: string | null;
  metrics: LlmStreamMetrics;
  modelName: string;
  promptMetadata: LlmPromptMetadata;
}

export interface LlmRunRecordInput {
  llmRunId: string;
  requestId: string;
  modelName: string;
  metrics: LlmStreamMetrics;
  promptMetadata: LlmPromptMetadata;
}
