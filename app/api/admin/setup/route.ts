import {
  attachAdminSessionCookie,
  createAdminUser,
  getAdminAuthConfigurationError,
  hasAdminUser,
} from "@/server/admin/auth";
import { buildRedirectResponse } from "@/server/http/redirect";

export async function POST(request: Request) {
  const authConfigurationError = getAdminAuthConfigurationError();
  if (authConfigurationError) {
    return buildRedirectResponse(request, "/setup", {
      searchParams: new URLSearchParams({
        error: authConfigurationError,
      }),
    });
  }

  if (await hasAdminUser()) {
    return buildRedirectResponse(request, "/setup", {
      searchParams: new URLSearchParams({
        error:
          "관리자 계정이 이미 생성된 환경에서는 /setup을 다시 사용할 수 없습니다.",
      }),
    });
  }

  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password !== confirmPassword) {
    return buildRedirectResponse(request, "/setup", {
      searchParams: new URLSearchParams({
        error: "비밀번호 확인이 일치하지 않습니다.",
      }),
    });
  }

  try {
    const adminUser = await createAdminUser({ username, password });
    const response = buildRedirectResponse(request, "/admin", {
      searchParams: new URLSearchParams({ saved: "1" }),
    });
    attachAdminSessionCookie(response, {
      adminUserId: adminUser.adminUserId,
    });

    return response;
  } catch (error) {
    return buildRedirectResponse(request, "/setup", {
      searchParams: new URLSearchParams({
        error:
          error instanceof Error
            ? error.message
            : "관리자 계정 생성 중 오류가 발생했습니다.",
      }),
    });
  }
}
