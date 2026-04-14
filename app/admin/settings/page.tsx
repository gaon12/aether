import { headers } from "next/headers";
import type { CSSProperties } from "react";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { LegalSettingsFields } from "@/components/admin/LegalSettingsFields";
import { requireAdminPageAccess } from "@/server/admin/auth";
import {
  DEFAULT_PRIVACY_POLICY,
  DEFAULT_TERMS_OF_SERVICE,
  DEFAULT_USER_DATA_DELETION,
  getResolvedAppSettings,
  getResolvedRuntimeSettings,
} from "@/server/admin/settings";
import { resolvePublicAppUrlFromHeaders } from "@/server/http/public-url";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [session, settings, runtimeSettings, resolvedSearchParams, headersList] =
    await Promise.all([
      requireAdminPageAccess(),
      getResolvedAppSettings(),
      getResolvedRuntimeSettings(),
      searchParams,
      headers(),
    ]);

  const appUrl =
    resolvePublicAppUrlFromHeaders(
      headersList,
      runtimeSettings.nextPublicAppUrl,
    ) ?? "";

  const saved = readParam(resolvedSearchParams.saved) === "1";
  const errorMessage = readParam(resolvedSearchParams.error);

  const sectionCardStyle: CSSProperties = {
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-xl)",
    padding: "var(--space-6)",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5)",
  };

  const labelStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-2)",
  };

  const fieldLabelStyle: CSSProperties = {
    fontWeight: "var(--weight-medium)",
    fontSize: "var(--text-sm)",
  };

  const fieldHintStyle: CSSProperties = {
    color: "var(--text-tertiary)",
    fontSize: "var(--text-xs)",
  };

  const gridStyle: CSSProperties = {
    display: "grid",
    gap: "var(--space-4)",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  };

  /* ─── Tab: 명령 해석 ─────────────────────────────────────────────── */
  const commandTab = (
    <section style={sectionCardStyle}>
      <div className="admin-section-title">
        <h2
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: "var(--weight-semibold)",
          }}
        >
          명령 해석
        </h2>
        <p style={{ ...fieldHintStyle, marginTop: "var(--space-1)" }}>
          요약 길이와 멘션 핸들처럼 명령 파서가 기본으로 참고할 값을 관리합니다.
        </p>
      </div>

      <div style={gridStyle}>
        <label style={labelStyle}>
          <span style={fieldLabelStyle}>봇 핸들</span>
          <input
            name="botHandle"
            type="text"
            defaultValue={settings.botHandle ?? ""}
            placeholder="@yourbot"
            className="admin-field"
          />
          <span style={fieldHintStyle}>
            비워두면 선행 멘션 없이도 명령을 해석합니다.
          </span>
        </label>

        <label style={labelStyle}>
          <span style={fieldLabelStyle}>최대 요약 길이</span>
          <input
            name="maxSummaryLength"
            type="number"
            min={1}
            max={10}
            defaultValue={settings.maxSummaryLength}
            className="admin-field"
          />
          <span style={fieldHintStyle}>
            사용자가 지정할 수 있는 요약 길이 상한입니다.
          </span>
        </label>

        <label style={labelStyle}>
          <span style={fieldLabelStyle}>기본 요약 길이</span>
          <input
            name="defaultSummaryLength"
            type="number"
            min={1}
            max={10}
            defaultValue={settings.defaultSummaryLength}
            className="admin-field"
          />
          <span style={fieldHintStyle}>
            사용자가 길이를 생략했을 때 적용할 기본값입니다.
          </span>
        </label>
      </div>
    </section>
  );

  /* ─── Tab: 본문 처리 ─────────────────────────────────────────────── */
  const textTab = (
    <section style={sectionCardStyle}>
      <div className="admin-section-title">
        <h2
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: "var(--weight-semibold)",
          }}
        >
          본문 처리
        </h2>
        <p style={{ ...fieldHintStyle, marginTop: "var(--space-1)" }}>
          본문 추출 기준과 여러 텍스트 블록을 하나로 묶을지 여부를 설정합니다.
        </p>
      </div>

      <div style={gridStyle}>
        <label style={labelStyle}>
          <span style={fieldLabelStyle}>최소 본문 글자 수</span>
          <input
            name="minSourceCharacters"
            type="number"
            min={1}
            max={5000}
            defaultValue={settings.minSourceCharacters}
            className="admin-field"
          />
          <span style={fieldHintStyle}>
            이 길이보다 짧은 포스트는 처리하지 않습니다.
          </span>
        </label>

        <label style={labelStyle}>
          <span style={fieldLabelStyle}>여러 텍스트 블록 처리</span>
          <select
            name="textAggregationMode"
            defaultValue={settings.textAggregationMode}
            className="admin-field"
          >
            <option value="combined">순서대로 합쳐서 한 덩어리로 처리</option>
            <option value="primary_only">첫 텍스트 블록만 처리</option>
          </select>
          <span style={fieldHintStyle}>
            번역과 요약이 여러 텍스트 블록을 어떤 기준으로 읽을지 결정합니다.
          </span>
        </label>
      </div>
    </section>
  );

  /* ─── Tab: 개인정보 및 약관 ───────────────────────────────────────── */
  const legalTab = (
    <section style={sectionCardStyle}>
      <div className="admin-section-title">
        <h2
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: "var(--weight-semibold)",
          }}
        >
          개인정보 및 약관
        </h2>
        <p style={{ ...fieldHintStyle, marginTop: "var(--space-1)" }}>
          Meta 개발자 설정 등에 입력할 개인정보처리방침과 약관 내용을 관리합니다.
          내용은 아래 URL로 제공됩니다.
        </p>
      </div>

      <LegalSettingsFields
        initialPrivacyPolicy={settings.privacyPolicy}
        initialTermsOfService={settings.termsOfService}
        initialUserDataDeletion={settings.userDataDeletion}
        defaultPrivacyPolicy={DEFAULT_PRIVACY_POLICY}
        defaultTermsOfService={DEFAULT_TERMS_OF_SERVICE}
        defaultUserDataDeletion={DEFAULT_USER_DATA_DELETION}
        appUrl={appUrl}
      />
    </section>
  );

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
          일반 설정
        </span>
        <h1
          style={{
            fontSize: "var(--text-3xl)",
            fontWeight: "var(--weight-bold)",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          운영 기본값
        </h1>
        <p style={{ color: "var(--text-secondary)", maxWidth: 680 }}>
          일반 동작 설정은 여기서 관리하고, 연동 비밀값과 워커 옵션은{" "}
          <code
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "0 5px",
              fontSize: "0.85em",
            }}
          >
            /admin/api
          </code>
          에서 관리합니다. 현재 로그인한 관리자:{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {session.username}
          </strong>
        </p>
      </div>

      {/* Alerts */}
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
          설정이 저장되었습니다.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="admin-alert admin-alert-error">
          <svg
            width={16}
            height={16}
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <title>오류</title>
            <circle
              cx="8"
              cy="8"
              r="6.5"
              stroke="currentColor"
              strokeWidth="1.25"
            />
            <path
              d="M8 5v3.5M8 11h.01"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </svg>
          {errorMessage}
        </div>
      ) : null}

      {/* Tabbed form */}
      <AdminForm action="/api/admin/settings" submitLabel="설정 저장">
        <AdminTabs
          tabs={[
            {
              label: "명령 해석",
              icon: (
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden
                >
                  <title>명령 해석</title>
                  <path
                    d="M2 4h10M2 7h6M2 10h8"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              ),
              content: commandTab,
            },
            {
              label: "본문 처리",
              icon: (
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden
                >
                  <title>본문 처리</title>
                  <rect
                    x="1.5"
                    y="2"
                    width="11"
                    height="10"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M4.5 5h5M4.5 7.5h3"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              ),
              content: textTab,
            },
            {
              label: "개인정보 / 약관",
              icon: (
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden
                >
                  <title>개인정보 및 약관</title>
                  <path
                    d="M3.5 1.5h7a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M5.5 4.5h3M5.5 7h3M5.5 9.5h2"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              ),
              content: legalTab,
            },
          ]}
        />
      </AdminForm>
    </>
  );
}
