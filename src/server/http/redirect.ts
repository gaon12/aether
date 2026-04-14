import "@/server/lib/server-only";

import { NextResponse } from "next/server";

import { resolvePublicAppUrlFromRequest } from "@/server/http/public-url";

interface BuildRedirectOptions {
  configuredAppUrl?: string | null;
  searchParams?: URLSearchParams;
  status?: number;
}

export function buildAppUrl(
  request: Pick<Request, "headers" | "url">,
  path: string,
  configuredAppUrl?: string | null,
) {
  const appOrigin =
    resolvePublicAppUrlFromRequest(request, configuredAppUrl) ??
    new URL(request.url).origin;

  return new URL(path, appOrigin);
}

export function buildRedirectResponse(
  request: Request,
  path: string,
  options: BuildRedirectOptions = {},
) {
  const url = buildAppUrl(request, path, options.configuredAppUrl);

  if (options.searchParams) {
    url.search = options.searchParams.toString();
  }

  return NextResponse.redirect(url, { status: options.status ?? 303 });
}
