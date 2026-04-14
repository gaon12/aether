import { NextResponse } from "next/server";
import {
  attachAdminSessionCookie,
  createAdminUser,
  getAdminAuthConfigurationError,
  hasAdminUser,
} from "@/server/admin/auth";

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
  const authConfigurationError = getAdminAuthConfigurationError();
  if (authConfigurationError) {
    return buildRedirect(
      request,
      "/setup",
      new URLSearchParams({
        error: authConfigurationError,
      }),
    );
  }

  if (await hasAdminUser()) {
    return buildRedirect(
      request,
      "/setup",
      new URLSearchParams({
        error: "관리자 계정이 이미 생성된 환경에서는 /setup을 다시 사용할 수 없습니다.",
      }),
    );
  }

  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password !== confirmPassword) {
    return buildRedirect(
      request,
      "/setup",
      new URLSearchParams({
        error: "비밀번호 확인이 일치하지 않습니다.",
      }),
    );
  }

  try {
    const adminUser = await createAdminUser({ username, password });
    const response = buildRedirect(
      request,
      "/admin",
      new URLSearchParams({ saved: "1" }),
    );
    attachAdminSessionCookie(response, {
      adminUserId: adminUser.adminUserId,
    });

    return response;
  } catch (error) {
    return buildRedirect(
      request,
      "/setup",
      new URLSearchParams({
        error:
          error instanceof Error
            ? error.message
            : "관리자 계정 생성 중 오류가 발생했습니다.",
      }),
    );
  }
}
