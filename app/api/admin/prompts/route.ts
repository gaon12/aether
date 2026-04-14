import { NextResponse } from "next/server";
import { getAdminSessionFromRequest, hasAdminUser } from "@/server/admin/auth";
import {
  getResolvedRuntimeSettings,
  updateRuntimeSettings,
} from "@/server/admin/settings";
import {
  DEFAULT_BASE_SYSTEM_PROMPT,
  DEFAULT_BASE_SYSTEM_PROMPT_NAME,
  DEFAULT_SUMMARY_SYSTEM_PROMPT,
  DEFAULT_TRANSLATE_SUMMARY_SYSTEM_PROMPT,
  DEFAULT_TRANSLATE_SYSTEM_PROMPT,
} from "@/server/llm/default-prompts";

function buildRedirect(request: Request, searchParams?: URLSearchParams) {
  const url = new URL("/admin/prompts", request.url);

  if (searchParams) {
    url.search = searchParams.toString();
  }

  return NextResponse.redirect(url, { status: 303 });
}

export async function GET(request: Request) {
  if (!(await hasAdminUser())) {
    return NextResponse.redirect(new URL("/setup", request.url), {
      status: 303,
    });
  }

  if (!(await getAdminSessionFromRequest(request))) {
    return NextResponse.redirect(new URL("/login", request.url), {
      status: 303,
    });
  }

  const settings = await getResolvedRuntimeSettings();

  return NextResponse.json({
    baseSystemPromptName: settings.baseSystemPromptName,
    baseSystemPrompt: settings.baseSystemPrompt,
    translateSystemPrompt: settings.translateSystemPrompt,
    summarySystemPrompt: settings.summarySystemPrompt,
    translateSummarySystemPrompt: settings.translateSummarySystemPrompt,
  });
}

export async function POST(request: Request) {
  if (!(await hasAdminUser())) {
    return NextResponse.redirect(new URL("/setup", request.url), {
      status: 303,
    });
  }

  if (!(await getAdminSessionFromRequest(request))) {
    return NextResponse.redirect(new URL("/login", request.url), {
      status: 303,
    });
  }

  const formData = await request.formData();

  try {
    const currentSettings = await getResolvedRuntimeSettings();
    const promptAction = String(formData.get("promptAction") ?? "");

    if (promptAction.startsWith("reset:")) {
      const resetTarget = promptAction.slice("reset:".length);

      if (resetTarget === "base") {
        await updateRuntimeSettings({
          ...currentSettings,
          baseSystemPromptName: DEFAULT_BASE_SYSTEM_PROMPT_NAME,
          baseSystemPrompt: DEFAULT_BASE_SYSTEM_PROMPT,
        });
      } else if (resetTarget === "translate") {
        await updateRuntimeSettings({
          ...currentSettings,
          translateSystemPrompt: DEFAULT_TRANSLATE_SYSTEM_PROMPT,
        });
      } else if (resetTarget === "summary") {
        await updateRuntimeSettings({
          ...currentSettings,
          summarySystemPrompt: DEFAULT_SUMMARY_SYSTEM_PROMPT,
        });
      } else if (resetTarget === "translateSummary") {
        await updateRuntimeSettings({
          ...currentSettings,
          translateSummarySystemPrompt: DEFAULT_TRANSLATE_SUMMARY_SYSTEM_PROMPT,
        });
      } else {
        throw new Error("알 수 없는 프롬프트 초기화 대상입니다.");
      }

      return NextResponse.json({ saved: true });
    }

    // Only update fields that are actually present in this form submission
    // (supports per-tab independent forms)
    await updateRuntimeSettings({
      ...currentSettings,
      ...(formData.has("baseSystemPromptName") && {
        baseSystemPromptName: String(formData.get("baseSystemPromptName")),
      }),
      ...(formData.has("baseSystemPrompt") && {
        baseSystemPrompt: String(formData.get("baseSystemPrompt")),
      }),
      ...(formData.has("translateSystemPrompt") && {
        translateSystemPrompt: String(formData.get("translateSystemPrompt")),
      }),
      ...(formData.has("summarySystemPrompt") && {
        summarySystemPrompt: String(formData.get("summarySystemPrompt")),
      }),
      ...(formData.has("translateSummarySystemPrompt") && {
        translateSummarySystemPrompt: String(
          formData.get("translateSummarySystemPrompt"),
        ),
      }),
    });

    if (request.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({ saved: true });
    }
    return buildRedirect(request, new URLSearchParams({ saved: "1" }));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "프롬프트 저장 중 오류가 발생했습니다.";
    if (request.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return buildRedirect(request, new URLSearchParams({ error: message }));
  }
}
