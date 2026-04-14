import { NextResponse } from "next/server";
import { getAdminSessionFromRequest, hasAdminUser } from "@/server/admin/auth";
import {
  getResolvedAppSettings,
  type TextAggregationMode,
  updateAppSettings,
} from "@/server/admin/settings";
import { buildRedirectResponse } from "@/server/http/redirect";

export async function GET(request: Request) {
  if (!(await hasAdminUser())) {
    return buildRedirectResponse(request, "/setup");
  }

  if (!(await getAdminSessionFromRequest(request))) {
    return buildRedirectResponse(request, "/login");
  }

  return NextResponse.json(await getResolvedAppSettings());
}

export async function POST(request: Request) {
  if (!(await hasAdminUser())) {
    return buildRedirectResponse(request, "/setup");
  }

  if (!(await getAdminSessionFromRequest(request))) {
    return buildRedirectResponse(request, "/login");
  }

  const formData = await request.formData();

  try {
    await updateAppSettings({
      botHandle: String(formData.get("botHandle") ?? ""),
      minSourceCharacters: Number.parseInt(
        String(formData.get("minSourceCharacters") ?? ""),
        10,
      ),
      maxSummaryLength: Number.parseInt(
        String(formData.get("maxSummaryLength") ?? ""),
        10,
      ),
      defaultSummaryLength: Number.parseInt(
        String(formData.get("defaultSummaryLength") ?? ""),
        10,
      ),
      textAggregationMode:
        formData.get("textAggregationMode") === "primary_only"
          ? ("primary_only" as TextAggregationMode)
          : "combined",
    });

    if (request.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({ saved: true });
    }
    return buildRedirectResponse(request, "/admin/settings", {
      searchParams: new URLSearchParams({ saved: "1" }),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "설정 저장 중 오류가 발생했습니다.";
    if (request.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return buildRedirectResponse(request, "/admin/settings", {
      searchParams: new URLSearchParams({ error: message }),
    });
  }
}
