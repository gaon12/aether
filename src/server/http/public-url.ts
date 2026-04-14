import "@/server/lib/server-only";

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function resolvePublicAppUrlFromHeaders(
  headers: Pick<Headers, "get">,
  configuredAppUrl?: string | null,
  fallbackOrigin?: string | null,
) {
  if (configuredAppUrl?.trim()) {
    return trimTrailingSlash(configuredAppUrl.trim());
  }

  const forwardedHost = headers.get("x-forwarded-host");
  const host = forwardedHost?.split(",")[0]?.trim() || headers.get("host");

  if (!host) {
    return fallbackOrigin ? trimTrailingSlash(fallbackOrigin) : null;
  }

  const forwardedProto = headers.get("x-forwarded-proto");
  const detectedProto = forwardedProto?.split(",")[0]?.trim();
  // x-forwarded-proto가 있으면 항상 우선 신뢰 (HTTPS 개발 환경 포함)
  const protocol = detectedProto
    ? detectedProto
    : host.startsWith("localhost") || host.startsWith("127.")
      ? "http"
      : "https";

  return `${protocol}://${host}`;
}

export function resolvePublicAppUrlFromRequest(
  request: Pick<Request, "headers" | "url">,
  configuredAppUrl?: string | null,
) {
  return resolvePublicAppUrlFromHeaders(
    request.headers,
    configuredAppUrl,
    new URL(request.url).origin,
  );
}
