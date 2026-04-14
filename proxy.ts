import { type NextRequest, NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE_NAME } from "@/server/admin/constants";

/**
 * 세션 쿠키가 올바른 형식인지 확인한다 (payload.signature 형태).
 * 실제 서명 검증은 route handler에서 수행하며, 여기서는 명백히 무효한 값을 빠르게 걸러낸다.
 */
function hasValidSessionCookieFormat(value: string | undefined): boolean {
  if (!value) return false;
  const dotIndex = value.indexOf(".");
  // payload와 signature 모두 최소한의 길이를 가져야 한다
  return dotIndex > 0 && dotIndex < value.length - 1;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookieValue = request.cookies.get(
    ADMIN_SESSION_COOKIE_NAME,
  )?.value;

  if (
    pathname.startsWith("/admin") &&
    !hasValidSessionCookieFormat(sessionCookieValue)
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
