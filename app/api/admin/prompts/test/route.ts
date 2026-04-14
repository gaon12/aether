import { NextResponse } from "next/server";
import { getAdminSessionFromRequest, hasAdminUser } from "@/server/admin/auth";
import { getResolvedRuntimeSettings } from "@/server/admin/settings";
import { createOpenAIClient } from "@/server/llm/client";
import { streamChatCompletion } from "@/server/llm/stream";
import { detectPromptInjection } from "@/server/prompt-injection/detector";

type PromptType = "translate" | "summary" | "translateSummary";

/** Mirrors buildPromptTemplate's user-message logic for the test panel. */
function buildTestUserMessage(
  promptType: PromptType,
  userText: string,
  targetLang: string,
): string {
  const lang = targetLang.trim() || "ko";

  switch (promptType) {
    case "translate":
      return `Translate the following text into ${lang}.\n\n---\n${userText}`;
    case "summary":
      return `Summarize the following text in ${lang}. Write up to 3 bullet points (each starting with '• '). Start your response with the first bullet — no header, no intro sentence.\n\n---\n${userText}`;
    case "translateSummary":
      return `Translate the following text into ${lang} and then summarize it in the same language. Write up to 3 bullet points for the summary.\n\n---\n${userText}`;
  }
}

export async function POST(request: Request) {
  if (!(await hasAdminUser())) {
    return NextResponse.json(
      { error: "설정이 완료되지 않았습니다." },
      { status: 403 },
    );
  }

  if (!(await getAdminSessionFromRequest(request))) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  let body: {
    systemPrompt?: string;
    userMessage?: string;
    promptType?: PromptType;
    targetLang?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "요청 본문을 파싱할 수 없습니다." },
      { status: 400 },
    );
  }

  const systemPrompt = (body.systemPrompt ?? "").trim();
  const userText = (body.userMessage ?? "").trim();
  const promptType: PromptType = body.promptType ?? "translate";
  const targetLang = (body.targetLang ?? "ko").trim();

  if (!userText) {
    return NextResponse.json(
      { error: "테스트할 본문을 입력하세요." },
      { status: 400 },
    );
  }

  const userMessage = buildTestUserMessage(promptType, userText, targetLang);
  const injectionResult = detectPromptInjection(userText);

  try {
    const [bundle, settings] = await Promise.all([
      createOpenAIClient(),
      getResolvedRuntimeSettings(),
    ]);

    const llmResult = await streamChatCompletion({
      client: bundle.client,
      baseURL: bundle.baseURL,
      modelName: bundle.modelName,
      messages: [
        ...(systemPrompt
          ? [{ role: "system" as const, content: systemPrompt }]
          : []),
        { role: "user" as const, content: userMessage },
      ],
      reasoningEnabled: settings.openAiReasoningEnabled,
      reasoningEffort: settings.openAiReasoningEffort,
    });

    return NextResponse.json({
      result: llmResult.text,
      rawResult: llmResult.rawText,
      thinkingContent: llmResult.thinkingContent || null,
      constructedUserMessage: userMessage,
      metrics: {
        durationMs: llmResult.metrics.durationMs,
        inputTokens: llmResult.metrics.inputTokenCount,
        outputTokens: llmResult.metrics.outputTokenCount,
        reasoningTokens: llmResult.metrics.reasoningTokenCount,
        tokensPerSecond: llmResult.metrics.outputTokensPerSecond,
        model: llmResult.modelName,
      },
      injection: {
        detected: injectionResult.prompt_injection_attempt,
        score: injectionResult.prompt_injection_score,
        reason: injectionResult.prompt_injection_reason,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "LLM 호출 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
