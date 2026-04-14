import Link from "next/link";
import type { CSSProperties } from "react";
import { requireAdminPageAccess } from "@/server/admin/auth";
import { getResolvedAppSettings } from "@/server/admin/settings";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const quickLinks = [
  {
    href: "/admin/settings",
    title: "일반 설정",
    description:
      "요약 기본값, 본문 처리 방식, 멘션 핸들 같은 앱 동작을 관리합니다.",
    icon: (
      <svg width={20} height={20} viewBox="0 0 20 20" fill="none" aria-hidden>
        <title>일반 설정 아이콘</title>
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 2v2.5M10 15.5V18M2 10h2.5M15.5 10H18M3.636 3.636l1.768 1.768M14.596 14.596l1.768 1.768M3.636 16.364l1.768-1.768M14.596 5.404l1.768-1.768"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    color: "var(--brand)",
    colorBg: "var(--brand-subtle)",
  },
  {
    href: "/admin/api",
    title: "API 관리",
    description: "외부 연동값, 비밀값, 워커 런타임 설정을 DB에서 관리합니다.",
    icon: (
      <svg width={20} height={20} viewBox="0 0 20 20" fill="none" aria-hidden>
        <title>API 관리 아이콘</title>
        <rect
          x="2"
          y="4"
          width="16"
          height="12"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M6 10h8M6 7.5h3M6 12.5h4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    color: "var(--color-queued)",
    colorBg: "var(--color-queued-bg)",
  },
  {
    href: "/admin/prompts",
    title: "프롬프트 관리",
    description:
      "요약, 번역, 번역+요약 시스템 프롬프트를 직접 수정하고 저장합니다.",
    icon: (
      <svg width={20} height={20} viewBox="0 0 20 20" fill="none" aria-hidden>
        <title>프롬프트 관리 아이콘</title>
        <path
          d="M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v9a1.5 1.5 0 0 1-1.5 1.5H11.5l-3 2.5-3-2.5H4.5A1.5 1.5 0 0 1 3 13.5v-9Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M6.5 7h7M6.5 10h5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    color: "var(--color-success)",
    colorBg: "var(--color-success-bg)",
  },
];

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [session, settings, resolvedSearchParams] = await Promise.all([
    requireAdminPageAccess(),
    getResolvedAppSettings(),
    searchParams,
  ]);

  const saved = readParam(resolvedSearchParams.saved) === "1";

  const metricCardStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-1)",
    padding: "var(--space-4) var(--space-5)",
    background: "var(--bg-raised)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--border)",
  };

  return (
    <>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: "var(--weight-semibold)",
          }}
        >
          관리자 페이지
        </span>
        <h1
          style={{
            fontSize: "var(--text-3xl)",
            fontWeight: "var(--weight-bold)",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          운영 제어 센터
        </h1>
        <p style={{ color: "var(--text-secondary)", maxWidth: 680 }}>
          공개 대시보드는 누구나 볼 수 있고, 이 구역은 운영자만 설정을 변경할 수
          있습니다. 현재 로그인한 관리자:{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {session.username}
          </strong>
        </p>
      </div>

      {/* Success banner */}
      {saved ? (
        <div className="admin-alert admin-alert-success">
          <svg
            width={16}
            height={16}
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <title>저장 완료</title>
            <circle
              cx="8"
              cy="8"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1.25"
            />
            <path
              d="M5 8l2 2 4-4"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          관리자 계정이 준비되었습니다. 아래 섹션에서 세부 설정을 이어서 관리할
          수 있습니다.
        </div>
      ) : null}

      {/* Quick links */}
      <section
        style={{
          display: "grid",
          gap: "var(--space-4)",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        {quickLinks.map((item) => (
          <Link key={item.href} href={item.href} className="admin-card-link">
            <article className="admin-card-inner">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-lg)",
                  background: item.colorBg,
                  color: item.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <strong
                style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: "var(--weight-semibold)",
                  letterSpacing: "-0.01em",
                }}
              >
                {item.title}
              </strong>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "var(--text-sm)",
                  lineHeight: 1.6,
                }}
              >
                {item.description}
              </p>
              <span
                style={{
                  marginTop: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  color: "var(--brand)",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--weight-semibold)",
                }}
              >
                바로 열기
                <svg
                  width={12}
                  height={12}
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden
                >
                  <title>바로 열기</title>
                  <path
                    d="M2.5 6h7M6.5 3l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </article>
          </Link>
        ))}
      </section>

      {/* Current defaults */}
      <section
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-6)",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
        }}
      >
        <div className="admin-section-title">
          <h2
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: "var(--weight-semibold)",
              letterSpacing: "-0.01em",
            }}
          >
            현재 적용 중인 기본값
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-sm)",
              marginTop: "var(--space-1)",
            }}
          >
            일반 설정 페이지에서 언제든 변경할 수 있습니다.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gap: "var(--space-3)",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          {[
            { label: "봇 핸들", value: settings.botHandle ?? "자동 감지" },
            {
              label: "기본 요약 길이",
              value: `${settings.defaultSummaryLength}단계`,
            },
            {
              label: "최대 요약 길이",
              value: `${settings.maxSummaryLength}단계`,
            },
            {
              label: "본문 결합 방식",
              value:
                settings.textAggregationMode === "combined"
                  ? "여러 블록 통합"
                  : "첫 블록만 사용",
            },
            {
              label: "개인정보처리방침",
              value: settings.privacyPolicy ? "설정됨" : "미설정",
            },
            {
              label: "서비스 이용약관",
              value: settings.termsOfService ? "설정됨" : "미설정",
            },
          ].map((item) => (
            <div key={item.label} style={metricCardStyle}>
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: "var(--weight-medium)",
                }}
              >
                {item.label}
              </span>
              <strong
                style={{
                  fontSize: "var(--text-xl)",
                  fontWeight: "var(--weight-semibold)",
                  letterSpacing: "-0.01em",
                }}
              >
                {item.value}
              </strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
