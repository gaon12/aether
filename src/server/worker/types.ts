import type {
  ExtractableThreadsPost,
  ExtractedTextResult,
} from "@/server/parser/extractor";
import type { InjectionDetectionResult } from "@/server/prompt-injection/detector";
import type {
  RequestStatus,
  RequestsTable,
  WorkerHeartbeatsTable,
} from "@/types/db";
import type { LlmRunRecordInput, LlmStreamResult } from "@/types/llm";
import type { ParseResult } from "@/types/parser";

export interface QueuedRequest extends RequestsTable {}

export interface WorkerRequestRepository {
  claimNextQueuedRequest(): Promise<QueuedRequest | null>;
  updateStatus(
    requestId: string,
    status: RequestStatus,
    options?: {
      processedAt?: string | null;
      ignoreReason?: string | null;
      sourceText?: string | null;
      sourceLanguage?: string | null;
      commandType?: string | null;
      targetLanguage?: string | null;
      summaryLength?: number | null;
      incrementRetryCount?: boolean;
    },
  ): Promise<void>;
}

export interface WorkerSourceResolver {
  resolve(request: QueuedRequest): Promise<ExtractableThreadsPost>;
}

export interface WorkerParseRepository {
  saveParseResult(requestId: string, result: ParseResult): Promise<void>;
}

export interface WorkerPromptInjectionRepository {
  saveDetection(
    requestId: string,
    detection: InjectionDetectionResult,
  ): Promise<void>;
}

export interface WorkerLlmRunRepository {
  saveRun(record: LlmRunRecordInput): Promise<void>;
}

export interface WorkerReplyPublisher {
  publish(input: {
    requestId: string;
    replyText: string;
    replyToId: string;
  }): Promise<void>;
}

export interface WorkerHeartbeatRepository {
  saveHeartbeat(record: WorkerHeartbeatsTable): Promise<void>;
}

export interface WorkerLlmRunner {
  generate(input: {
    defaultSummaryLength?: number;
    requestId: string;
    sourceText: string;
    sourceLanguage?: string | null;
    parseResult: Extract<ParseResult, { valid: true }>;
  }): Promise<LlmStreamResult>;
}

export interface WorkerDependencies {
  requestRepository: WorkerRequestRepository;
  sourceResolver: WorkerSourceResolver;
  parseRepository: WorkerParseRepository;
  promptInjectionRepository: WorkerPromptInjectionRepository;
  llmRunRepository: WorkerLlmRunRepository;
  replyPublisher: WorkerReplyPublisher;
  llmRunner: WorkerLlmRunner;
  heartbeatRepository: WorkerHeartbeatRepository;
}

export interface WorkerRuntimeConfig {
  botHandle?: string;
  defaultSummaryLength?: number;
  heartbeatIntervalMs: number;
  hostname: string;
  maxSummaryLength?: number;
  minSourceCharacters?: number;
  pollIntervalMs: number;
  textAggregationMode?: "combined" | "primary_only";
  workerRunId: string;
}

export interface WorkerAdapterModule {
  createWorkerDependencies(): Promise<WorkerDependencies> | WorkerDependencies;
}

export interface WorkerRunOutcome {
  requestId: string;
  extraction: ExtractedTextResult;
  parseResult: ParseResult;
  llmResult?: LlmStreamResult;
}
