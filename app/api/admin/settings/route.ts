import { NextResponse } from "next/server";
import { getAdminSessionFromRequest, hasAdminUser } from "@/server/admin/auth";
import {
  getResolvedAppSettings,
  type TextAggregationMode,
  updateAppSettings,
} from "@/server/admin/settings";

function buildRedirect(request: Request, searchParams?: URLSearchParams) {
  const url = new URL("/admin/settings", request.url);

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

  return NextResponse.json(await getResolvedAppSettings());
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
    return buildRedirect(request, new URLSearchParams({ saved: "1" }));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "설정 저장 중 오류가 발생했습니다.";
    if (request.headers.get("accept")?.includes("application/json")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return buildRedirect(request, new URLSearchParams({ error: message }));
  }
}
