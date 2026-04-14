import { randomUUID } from "node:crypto";
import { extractProcessableText } from "@/server/parser/extractor";
import { parseCommand } from "@/server/parser/index";
import { detectPromptInjection } from "@/server/prompt-injection/detector";
import { startWorkerHeartbeat } from "@/server/worker/heartbeat";
import type {
  WorkerAdapterModule,
  WorkerDependencies,
  WorkerRunOutcome,
  WorkerRuntimeConfig,
} from "@/server/worker/types";

function nowIsoString() {
  return new Date().toISOString();
}

/**
 * Unicode 블록 분석 기반 언어 감지.
 * 완벽하지 않지만 번역/요약 봇의 원문 언어 기록 용도로 충분하다.
 */
function detectLanguage(text: string): string | null {
  const sample = text.slice(0, 500).replace(/\s/g, "");
  if (!sample) return null;

  const total = sample.length;
  const ko = (sample.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) ?? [])
    .length;
  const ja = (sample.match(/[\u3040-\u30FF\u31F0-\u31FF]/g) ?? []).length;
  const zh = (sample.match(/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g) ?? [])
    .length;
  const ar = (sample.match(/[\u0600-\u06FF\u0750-\u077F]/g) ?? []).length;

  if (ko / total > 0.1) return "ko";
  // 히라가나/가타카나가 있으면 일본어, CJK만 있으면 중국어
  if (ja / total > 0.05) return "ja";
  if (zh / total > 0.15) return "zh";
  if (ar / total > 0.1) return "ar";
  return "en";
}

function resolveSummaryLength(
  parseResult: Extract<WorkerRunOutcome["parseResult"], { valid: true }>,
  defaultSummaryLength?: number,
) {
  if (parseResult.command === "translate") {
    return null;
  }

  return parseResult.length ?? defaultSummaryLength ?? null;
}

export async function processQueuedRequest(
  dependencies: WorkerDependencies,
  config: WorkerRuntimeConfig,
): Promise<WorkerRunOutcome | null> {
  const request = await dependencies.requestRepository.claimNextQueuedRequest();

  if (!request) {
    return null;
  }

  try {
    await dependencies.requestRepository.updateStatus(
      request.request_id,
      "parsing",
    );

    const sourcePost = await dependencies.sourceResolver.resolve(request);
    const extraction = extractProcessableText(sourcePost, {
      aggregationMode: config.textAggregationMode,
      minCharacters: config.minSourceCharacters,
    });

    if (extraction.status !== "ready") {
      await dependencies.requestRepository.updateStatus(
        request.request_id,
        "ignored",
        {
          processedAt: nowIsoString(),
          ignoreReason: extraction.reason,
          sourceText: request.source_text,
        },
      );

      return {
        requestId: request.request_id,
        extraction,
        parseResult: {
          valid: false,
          reason: "empty_command",
          raw: request.command_raw,
        },
      };
    }

    const parseResult = parseCommand(request.command_raw, {
      botHandle: config.botHandle,
      maxSummaryLength: config.maxSummaryLength,
    });

    await dependencies.parseRepository.saveParseResult(
      request.request_id,
      parseResult,
    );

    if (!parseResult.valid) {
      await dependencies.requestRepository.updateStatus(
        request.request_id,
        "ignored",
        {
          processedAt: nowIsoString(),
          ignoreReason: parseResult.reason,
          sourceText: extraction.sourceText,
          commandType: null,
          targetLanguage: null,
          summaryLength: null,
        },
      );

      return {
        requestId: request.request_id,
        extraction,
        parseResult,
      };
    }

    const detectedLanguage = detectLanguage(extraction.sourceText);

    await dependencies.requestRepository.updateStatus(
      request.request_id,
      "ready",
      {
        sourceText: extraction.sourceText,
        sourceLanguage: detectedLanguage,
        commandType: parseResult.command,
        targetLanguage:
          parseResult.command === "translate" ||
          parseResult.command === "translate_summary"
            ? parseResult.targetLang
            : (parseResult.lang ?? null),
        summaryLength: resolveSummaryLength(
          parseResult,
          config.defaultSummaryLength,
        ),
      },
    );

    const injectionDetection = detectPromptInjection(extraction.sourceText);
    if (injectionDetection.prompt_injection_attempt) {
      await dependencies.promptInjectionRepository.saveDetection(
        request.request_id,
        injectionDetection,
      );

      // 고위험 인젝션은 LLM 호출 없이 차단 (기본 임계값 0.8, 환경변수로 조정 가능)
      const blockThreshold = Number(
        process.env.INJECTION_BLOCK_THRESHOLD ?? "0.8",
      );
      if (injectionDetection.prompt_injection_score >= blockThreshold) {
        console.warn(
          `[worker] request=${request.request_id} prompt_injection_blocked score=${injectionDetection.prompt_injection_score.toFixed(2)}`,
        );
        await dependencies.requestRepository.updateStatus(
          request.request_id,
          "ignored",
          {
            processedAt: nowIsoString(),
            ignoreReason: `prompt_injection_blocked`,
          },
        );
        return {
          requestId: request.request_id,
          extraction,
          parseResult,
        };
      }
    }

    await dependencies.requestRepository.updateStatus(
      request.request_id,
      "running_llm",
    );

    const llmResult = await dependencies.llmRunner.generate({
      defaultSummaryLength: config.defaultSummaryLength,
      requestId: request.request_id,
      parseResult,
      sourceLanguage: detectedLanguage,
      sourceText: extraction.sourceText,
    });

    await dependencies.llmRunRepository.saveRun({
      llmRunId: randomUUID(),
      requestId: request.request_id,
      modelName: llmResult.modelName,
      metrics: llmResult.metrics,
      promptMetadata: llmResult.promptMetadata,
    });

    console.log(
      `[worker] request=${request.request_id} model=${llmResult.modelName}` +
        (llmResult.metrics.durationMs != null
          ? ` duration=${llmResult.metrics.durationMs}ms`
          : "") +
        (llmResult.metrics.outputTokenCount != null
          ? ` out_tokens=${llmResult.metrics.outputTokenCount}`
          : ""),
    );

    await dependencies.requestRepository.updateStatus(
      request.request_id,
      "publishing_reply",
    );

    await dependencies.replyPublisher.publish({
      requestId: request.request_id,
      replyText: llmResult.text,
      replyToId: request.reply_to_id ?? request.source_media_id,
    });

    await dependencies.requestRepository.updateStatus(
      request.request_id,
      "succeeded",
      {
        processedAt: nowIsoString(),
      },
    );

    return {
      requestId: request.request_id,
      extraction,
      parseResult,
      llmResult,
    };
  } catch (error) {
    await dependencies.requestRepository.updateStatus(
      request.request_id,
      "failed",
      {
        processedAt: nowIsoString(),
        ignoreReason:
          error instanceof Error ? error.message : "unknown_worker_error",
      },
    );
    throw error;
  }
}

export function createWorkerRuntime(
  dependencies: WorkerDependencies,
  config: WorkerRuntimeConfig,
) {
  const heartbeat = startWorkerHeartbeat(
    dependencies.heartbeatRepository,
    config,
  );
  let isRunning = false;
  let stopRequested = false;

  return {
    async runLoop() {
      if (isRunning) {
        return;
      }

      isRunning = true;

      try {
        while (!stopRequested) {
          let outcome: WorkerRunOutcome | null = null;

          try {
            outcome = await processQueuedRequest(dependencies, config);
          } catch (error) {
            console.error("Worker iteration failed:", error);
          }

          if (!outcome) {
            await heartbeat.pulse("idle");
            await new Promise((resolve) =>
              setTimeout(resolve, config.pollIntervalMs),
            );
            continue;
          }

          await heartbeat.pulse("running");
        }
      } finally {
        heartbeat.stop();
        isRunning = false;
      }
    },
    stop() {
      stopRequested = true;
      heartbeat.stop();
    },
  };
}

export async function loadWorkerAdapter(modulePath: string) {
  const importedModule = (await import(modulePath)) as
    | WorkerAdapterModule
    | { default?: WorkerAdapterModule };
  const adapterModule =
    "createWorkerDependencies" in importedModule
      ? importedModule
      : importedModule.default;

  if (
    !adapterModule ||
    typeof adapterModule.createWorkerDependencies !== "function"
  ) {
    throw new Error(
      `Adapter module "${modulePath}" must export createWorkerDependencies().`,
    );
  }

  return adapterModule.createWorkerDependencies();
}
