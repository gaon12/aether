import { redirect } from "next/navigation";
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

function getNotice(searchParams: Awaited<SearchParams>) {
  const errorMessage = readParam(searchParams.error);
  if (errorMessage) {
    return {
      tone: "error" as const,
      message: errorMessage,
    };
  }

  if (readParam(searchParams.loggedOut) === "1") {
    return {
      tone: "success" as const,
      message: "관리자 로그아웃이 완료되었습니다.",
    };
  }

  return undefined;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!(await hasAdminUser())) {
    redirect("/setup");
  }

  const session = await getAdminSession();
  if (session) {
    redirect("/admin");
  }

  const resolvedSearchParams = await searchParams;
  const authConfigurationError = getAdminAuthConfigurationError();

  return (
    <AdminScreen
      title="관리자 로그인"
      description="Aether 관리자 화면에 로그인하면 연동 설정, 프롬프트 정책, 운영 기본값을 웹에서 관리할 수 있습니다."
      notice={
        authConfigurationError
          ? {
              tone: "error",
              message: authConfigurationError,
            }
          : getNotice(resolvedSearchParams)
      }
    >
      <form
        action="/api/admin/login"
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
            autoComplete="current-password"
            disabled={Boolean(authConfigurationError)}
            required
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
          {authConfigurationError ? "환경 변수 설정 필요" : "로그인"}
        </button>
      </form>
    </AdminScreen>
  );
}
