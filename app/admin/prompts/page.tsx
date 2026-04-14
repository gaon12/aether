import type { CSSProperties, ReactNode } from "react";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { PromptEditor } from "@/components/admin/PromptEditor";
import { requireAdminPageAccess } from "@/server/admin/auth";
import { getResolvedRuntimeSettings } from "@/server/admin/settings";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function PromptSection({
  name,
  badge,
  badgeColor,
  badgeBg,
  description,
  value,
  promptType,
  prefixPrompt,
  children,
  enableTestPanel,
  resetTarget,
}: {
  name: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  description: string;
  value: string;
  promptType: "translate" | "summary" | "translateSummary";
  prefixPrompt?: string;
  children?: ReactNode;
  enableTestPanel?: boolean;
  resetTarget: "base" | "translate" | "summary" | "translateSummary";
}) {
  const sectionStyle: CSSProperties = {
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-xl)",
    padding: "var(--space-6)",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-4)",
  };

  return (
    <AdminForm
      action="/api/admin/prompts"
      submitLabel="저장"
      successMessage="프롬프트가 저장되었습니다."
      secondarySubmit={{
        label: "기본값으로 초기화",
        name: "promptAction",
        value: `reset:${resetTarget}`,
        successMessage: "기본 프롬프트로 초기화되었습니다.",
        reloadOnSuccess: true,
        confirmMessage:
          "현재 탭의 프롬프트를 기본값으로 되돌릴까요? 저장된 사용자 수정 내용은 사라집니다.",
      }}
    >
      <section style={sectionStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "var(--space-4)",
            flexWrap: "wrap",
          }}
        >
          <div className="admin-section-title">
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "var(--text-sm)",
                lineHeight: 1.5,
              }}
            >
              {description}
            </p>
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: "var(--radius-full)",
              padding: "0.3rem 0.75rem",
              fontSize: "var(--text-xs)",
              fontWeight: "var(--weight-semibold)",
              background: badgeBg,
              color: badgeColor,
              border: `1px solid color-mix(in srgb, ${badgeColor} 30%, transparent)`,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {badge}
          </span>
        </div>

        {children}

        <PromptEditor
          name={name}
          defaultValue={value}
          promptType={promptType}
          prefixPrompt={prefixPrompt}
          enableTestPanel={enableTestPanel}
        />
      </section>
    </AdminForm>
  );
}

export default async function AdminPromptsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminPageAccess();

  const [settings, resolvedSearchParams] = await Promise.all([
    getResolvedRuntimeSettings(),
    searchParams,
  ]);

  const saved = readParam(resolvedSearchParams.saved) === "1";
  const errorMessage = readParam(resolvedSearchParams.error);

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
          프롬프트 관리
        </span>
        <h1
          style={{
            fontSize: "var(--text-3xl)",
            fontWeight: "var(--weight-bold)",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          실제 운영 프롬프트 편집
        </h1>
        <p style={{ color: "var(--text-secondary)", maxWidth: 680 }}>
          여기서 저장한 시스템 프롬프트가 실제 요약, 번역, 번역+요약 처리에 바로
          반영됩니다. 공통 기본 프롬프트는 모든 작업에 선행 적용되고, 작업별
          프롬프트는 그 뒤에 이어 붙습니다. 명령 구조와 길이 지시는 코드에서
          붙습니다.
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
          프롬프트가 저장되었습니다.
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

      <div className="admin-alert admin-alert-info">
        <svg
          width={16}
          height={16}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          style={{ flexShrink: 0, marginTop: 1 }}
        >
          <title>안내</title>
          <circle
            cx="8"
            cy="8"
            r="6.5"
            stroke="currentColor"
            strokeWidth="1.25"
          />
          <path
            d="M8 7v4.5M8 5.5h.01"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
        각 탭은 독립적으로 저장됩니다. 변경 사항은 다음 요청부터 즉시
        반영됩니다.
      </div>

      {/* Tabs — each tab has its own form & save button */}
      <AdminTabs
        tabs={[
          {
            label: "공통 기본",
            icon: (
              <svg
                width={14}
                height={14}
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden
              >
                <title>공통 기본</title>
                <path
                  d="M7 1.5l4.5 2.2v3.1c0 2.4-1.6 4.5-4.5 5.7C4.1 11.3 2.5 9.2 2.5 6.8V3.7L7 1.5z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.5 6.7l1 1 2-2"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ),
            content: (
              <PromptSection
                name="baseSystemPrompt"
                badge={settings.baseSystemPromptName}
                badgeColor="var(--color-injection)"
                badgeBg="var(--color-injection-bg)"
                description="모든 LLM 요청에 공통 적용되는 기본 시스템 프롬프트입니다. 프롬프트 인젝션 방어, 숨김 규칙 보호, 공통 운영 원칙 같은 전역 규칙을 여기서 관리하세요."
                value={settings.baseSystemPrompt}
                promptType="summary"
                enableTestPanel={false}
                resetTarget="base"
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                  }}
                >
                  <label
                    htmlFor="base-system-prompt-name"
                    style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--weight-medium)",
                      color: "var(--text-tertiary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    프롬프트 프로필 이름
                  </label>
                  <input
                    id="base-system-prompt-name"
                    name="baseSystemPromptName"
                    defaultValue={settings.baseSystemPromptName}
                    className="admin-field"
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                  <p
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    이 이름은 LLM 실행 기록과 통계 화면에 함께 저장됩니다.
                  </p>
                </div>
              </PromptSection>
            ),
          },
          {
            label: "번역",
            icon: (
              <svg
                width={14}
                height={14}
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden
              >
                <title>번역</title>
                <path
                  d="M1.5 3h6M4.5 1.5v1.5M7 3c-.5 2.5-2.5 4.5-5 5M3.5 5.5c.7.8 1.8 1.5 3 2"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 9.5l1.5-4 1.5 4M8.7 8h1.6"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ),
            content: (
              <PromptSection
                name="translateSystemPrompt"
                badge="translate"
                badgeColor="var(--brand)"
                badgeBg="var(--brand-subtle)"
                description="`translate` 명령에서 사용합니다. 공통 기본 프롬프트 뒤에 이어 붙는 번역 전용 역할 지시와 출력 형식을 작성하세요."
                value={settings.translateSystemPrompt}
                promptType="translate"
                prefixPrompt={settings.baseSystemPrompt}
                resetTarget="translate"
              />
            ),
          },
          {
            label: "요약",
            icon: (
              <svg
                width={14}
                height={14}
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden
              >
                <title>요약</title>
                <path
                  d="M2 3.5h10M2 6.5h7M2 9.5h5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            ),
            content: (
              <PromptSection
                name="summarySystemPrompt"
                badge="summary"
                badgeColor="var(--color-success)"
                badgeBg="var(--color-success-bg)"
                description="`summary` 명령에서 사용합니다. 공통 기본 프롬프트 뒤에 이어 붙는 요약 스타일과 출력 형식을 작성하세요."
                value={settings.summarySystemPrompt}
                promptType="summary"
                prefixPrompt={settings.baseSystemPrompt}
                resetTarget="summary"
              />
            ),
          },
          {
            label: "번역+요약",
            icon: (
              <svg
                width={14}
                height={14}
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden
              >
                <title>번역 및 요약</title>
                <path
                  d="M2 3h4M4 1.5V3M6 3c-.3 1.5-1.5 3-3 3.5M3.5 4.5c.4.5 1 1 1.8 1.3M7.5 8.5l1-2.5 1 2.5M7.8 7.7h1.4M11 3.5h1.5"
                  stroke="currentColor"
                  strokeWidth="1.15"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ),
            content: (
              <PromptSection
                name="translateSummarySystemPrompt"
                badge="translate + summary"
                badgeColor="var(--color-queued)"
                badgeBg="var(--color-queued-bg)"
                description="`translate xx summary` 명령에서 사용합니다. 공통 기본 프롬프트 뒤에 이어 붙는 번역+요약 통합 처리 지시를 작성하세요."
                value={settings.translateSummarySystemPrompt}
                promptType="translateSummary"
                prefixPrompt={settings.baseSystemPrompt}
                resetTarget="translateSummary"
              />
            ),
          },
        ]}
      />
    </>
  );
}
