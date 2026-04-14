import { NextResponse } from "next/server";
import {
  attachAdminSessionCookie,
  authenticateAdminUser,
  getAdminAuthConfigurationError,
  hasAdminUser,
} from "@/server/admin/auth";

// 슬라이딩 윈도우 인메모리 Rate Limiter
// 단일 서버 기준이며, 다중 인스턴스 환경에서는 Redis 등을 사용해야 한다.
const loginAttempts = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15분
const RATE_LIMIT_MAX_ATTEMPTS = 10; // 15분 내 최대 시도 수

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "unknown";
}

function checkLoginRateLimit(ip: string): {
  blocked: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const timestamps = (loginAttempts.get(ip) ?? []).filter(
    (t) => t > windowStart,
  );

  if (timestamps.length >= RATE_LIMIT_MAX_ATTEMPTS) {
    loginAttempts.set(ip, timestamps);
    const oldestInWindow = timestamps[0];
    const retryAfterSeconds = Math.ceil(
      (oldestInWindow + RATE_LIMIT_WINDOW_MS - now) / 1000,
    );
    return { blocked: true, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }

  timestamps.push(now);
  loginAttempts.set(ip, timestamps);
  return { blocked: false, retryAfterSeconds: 0 };
}

function buildRedirect(
  request: Request,
  path: string,
  searchParams?: URLSearchParams,
) {
  const url = new URL(path, request.url);

  if (searchParams) {
    url.search = searchParams.toString();
  }

  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const { blocked, retryAfterSeconds } = checkLoginRateLimit(clientIp);

  if (blocked) {
    const response = buildRedirect(
      request,
      "/login",
      new URLSearchParams({
        error: `로그인 시도가 너무 많습니다. ${retryAfterSeconds}초 후 다시 시도해 주세요.`,
      }),
    );
    response.headers.set("Retry-After", String(retryAfterSeconds));
    return response;
  }

  const authConfigurationError = getAdminAuthConfigurationError();
  if (authConfigurationError) {
    return buildRedirect(
      request,
      "/login",
      new URLSearchParams({
        error: authConfigurationError,
      }),
    );
  }

  if (!(await hasAdminUser())) {
    return buildRedirect(request, "/setup");
  }

  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    const adminUser = await authenticateAdminUser({ username, password });

    if (!adminUser) {
      return buildRedirect(
        request,
        "/login",
        new URLSearchParams({
          error: "아이디 또는 비밀번호가 올바르지 않습니다.",
        }),
      );
    }

    const response = buildRedirect(request, "/admin");
    attachAdminSessionCookie(response, {
      adminUserId: adminUser.adminUserId,
    });

    return response;
  } catch (error) {
    return buildRedirect(
      request,
      "/login",
      new URLSearchParams({
        error:
          error instanceof Error
            ? error.message
            : "로그인 처리 중 오류가 발생했습니다.",
      }),
    );
  }
}
