import Link from "next/link";
import { AdminScreen } from "@/components/admin/AdminScreen";
import {
  getAdminAuthConfigurationError,
  getAdminSession,
  hasAdminUser,
} from "@/server/admin/auth";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SetupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const adminExists = await hasAdminUser();
  const session = adminExists ? await getAdminSession() : null;

  const resolvedSearchParams = await searchParams;
  const errorMessage = readParam(resolvedSearchParams.error);
  const authConfigurationError = getAdminAuthConfigurationError();
  const blockedMessage =
    adminExists &&
    "관리자 계정이 이미 생성된 환경입니다. /setup에서는 새 관리자 계정을 다시 만들 수 없습니다.";

  const notice = blockedMessage
    ? {
        tone: "error" as const,
        message: blockedMessage,
      }
    : errorMessage
      ? {
          tone: "error" as const,
          message: errorMessage,
        }
      : authConfigurationError
        ? {
            tone: "error" as const,
            message: authConfigurationError,
          }
        : {
            tone: "info" as const,
            message:
              "처음 한 번만 관리자 계정을 만들면 이후에는 웹에서 설정을 직접 관리할 수 있습니다.",
          };

  return (
    <AdminScreen
      title="관리자 계정 만들기"
      description="처음 한 번만 관리자 계정을 만들면 이후에는 웹에서 설정을 직접 관리할 수 있습니다."
      notice={notice}
      footer={
        blockedMessage ? (
          <>
            <Link
              href={session ? "/admin" : "/login"}
              style={{ color: "var(--brand)" }}
            >
              {session ? "관리자 화면" : "로그인 화면"}
            </Link>
            으로 이동하세요.
          </>
        ) : (
          <>
            이미 관리자 계정을 만들었다면{" "}
            <Link href="/login" style={{ color: "var(--brand)" }}>
              로그인 화면
            </Link>
            으로 이동하세요.
          </>
        )
      }
    >
      {blockedMessage ? null : (
        <form
          action="/api/admin/setup"
          method="post"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            <span
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-medium)",
              }}
            >
              관리자 아이디
            </span>
            <input
              name="username"
              type="text"
              autoComplete="username"
              disabled={Boolean(authConfigurationError)}
              required
              placeholder="admin"
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg)",
                borderRadius: "var(--radius-md)",
                padding: "0.85rem 0.95rem",
              }}
            />
          </label>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            <span
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-medium)",
              }}
            >
              비밀번호
            </span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              disabled={Boolean(authConfigurationError)}
              required
              minLength={8}
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg)",
                borderRadius: "var(--radius-md)",
                padding: "0.85rem 0.95rem",
              }}
            />
          </label>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            <span
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-medium)",
              }}
            >
              비밀번호 확인
            </span>
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              disabled={Boolean(authConfigurationError)}
              required
              minLength={8}
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg)",
                borderRadius: "var(--radius-md)",
                padding: "0.85rem 0.95rem",
              }}
            />
          </label>

          <button
            disabled={Boolean(authConfigurationError)}
            type="submit"
            style={{
              marginTop: "var(--space-2)",
              borderRadius: "var(--radius-md)",
              background: authConfigurationError
                ? "var(--text-tertiary)"
                : "var(--brand)",
              color: "var(--text-inverse)",
              padding: "0.95rem 1rem",
              fontWeight: "var(--weight-semibold)",
            }}
          >
            {authConfigurationError
              ? "환경 변수 설정 후 다시 시도"
              : "관리자 계정 생성"}
          </button>
        </form>
      )}
    </AdminScreen>
  );
}
