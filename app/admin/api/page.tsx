import { headers } from "next/headers";
import type { CSSProperties } from "react";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { CopyField } from "@/components/admin/CopyField";
import { SecretRevealField } from "@/components/admin/SecretRevealField";
import { TestButton } from "@/components/admin/TestButton";
import {
  createThreadsOauthState,
  getAdminAuthConfigurationError,
  requireAdminPageAccess,
} from "@/server/admin/auth";
import {
  getResolvedRuntimeSettings,
  isLocalBaseUrl,
} from "@/server/admin/settings";
import { getDb } from "@/server/db";
import { resolvePublicAppUrlFromHeaders } from "@/server/http/public-url";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminApiPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireAdminPageAccess();
  const db = getDb();
  const settingsPromise = getResolvedRuntimeSettings();
  const resolvedSearchParamsPromise = searchParams;
  const threadsAccountPromise = db
    .selectFrom("threads_accounts")
    .select([
      "username",
      "threads_user_id",
      "token_expires_at",
      "token_last_refreshed_at",
    ])
    .orderBy("token_expires_at", "desc")
    .executeTakeFirst();

  const [settings, resolvedSearchParams, threadsAccount] = await Promise.all([
    settingsPromise,
    resolvedSearchParamsPromise,
    threadsAccountPromise,
  ]);

  const authConfigurationError = getAdminAuthConfigurationError();
  const saved = readParam(resolvedSearchParams.saved) === "1";
  const authSuccess = readParam(resolvedSearchParams.auth) === "success";
  const errorMessage = readParam(resolvedSearchParams.error);

  const headersList = await headers();
  const appUrl =
    resolvePublicAppUrlFromHeaders(headersList, settings.nextPublicAppUrl) ??
    settings.nextPublicAppUrl;
  const remoteOpenAi = !isLocalBaseUrl(settings.openAiBaseUrl);
  const oauthState = createThreadsOauthState(session.adminUserId);

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

  const fieldHintStyle: CSSProperties = {
    color: "var(--text-tertiary)",
    fontSize: "var(--text-xs)",
  };

  const fieldLabelStyle: CSSProperties = {
    fontWeight: "var(--weight-medium)",
    fontSize: "var(--text-sm)",
  };

  const gridStyle: CSSProperties = {
    display: "grid",
    gap: "var(--space-4)",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  };

  const statusItems = [
    {
      label: "세션 서명 키",
      value: authConfigurationError ? "확인 필요" : "정상",
      detail:
        authConfigurationError ??
        "TOKEN_ENCRYPTION_KEY가 정상적으로 준비되어 있습니다.",
      configured: !authConfigurationError,
    },
    {
      label: "Threads OAuth",
      value:
        settings.threadsAppId && settings.threadsAppSecret
          ? "준비됨"
          : "확인 필요",
      detail: "앱 ID와 앱 시크릿이 있어야 Threads 계정을 연결할 수 있습니다.",
      configured: Boolean(settings.threadsAppId && settings.threadsAppSecret),
    },
    {
      label: "Threads Webhook",
      value:
        settings.threadsWebhookVerifyToken && settings.threadsWebhookSecret
          ? "준비됨"
          : "확인 필요",
      detail: "검증 토큰과 서명 시크릿이 있어야 웹훅 검증이 동작합니다.",
      configured: Boolean(
        settings.threadsWebhookVerifyToken && settings.threadsWebhookSecret,
      ),
    },
    {
      label: "모델 연동",
      value:
        settings.openAiBaseUrl &&
        settings.openAiModelName &&
        (!remoteOpenAi || settings.openAiApiKey)
          ? "준비됨"
          : "확인 필요",
      detail: remoteOpenAi
        ? "원격 제공자는 API 키가 필요합니다."
        : "로컬 모델 서버는 API 키 없이도 동작할 수 있습니다.",
      configured: Boolean(
        settings.openAiBaseUrl &&
          settings.openAiModelName &&
          (!remoteOpenAi || settings.openAiApiKey),
      ),
    },
  ];

  /* ─── Tab contents ──────────────────────────────────────────────────── */

  const webhookUrl = appUrl ? `${appUrl}/api/webhooks/threads` : "";
  const oauthCallbackUrl = appUrl ? `${appUrl}/api/auth/threads/callback` : "";
  const deauthCallbackUrl = webhookUrl; // Webhook endpoint handles general Meta callbacks
  const dataDeletionUrl = appUrl ? `${appUrl}/legal/data-deletion` : "";

  const oauthUrl =
    settings.threadsAppId && appUrl
      ? `https://threads.net/oauth/authorize?client_id=${settings.threadsAppId}&redirect_uri=${encodeURIComponent(`${appUrl}/api/auth/threads/callback`)}&scope=threads_basic,threads_content_publish,threads_manage_mentions,threads_manage_replies,threads_read_replies&response_type=code&state=${encodeURIComponent(oauthState)}`
      : null;

  // Meta OAuth는 HTTPS redirect_uri를 요구합니다
  const appUrlIsHttp = appUrl?.startsWith("http://") ?? false;

  const tokenExpiresAt = threadsAccount?.token_expires_at
    ? new Date(threadsAccount.token_expires_at)
    : null;
  const tokenDaysLeft = tokenExpiresAt
    ? Math.ceil((tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const tokenStatus =
    tokenDaysLeft == null
      ? "missing"
      : tokenDaysLeft <= 0
        ? "expired"
        : tokenDaysLeft <= 7
          ? "expiring"
          : "valid";

  const webhookIcon = (
    <svg width={13} height={13} viewBox="0 0 13 13" fill="none" aria-hidden>
      <title>웹훅 테스트</title>
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M4 6.5h5M7.5 4.5l2 2-2 2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const tokenStatusColor =
    tokenStatus === "valid"
      ? "var(--color-success)"
      : tokenStatus === "expiring"
        ? "var(--color-warning)"
        : tokenStatus === "expired"
          ? "var(--color-failed)"
          : "var(--text-tertiary)";

  const tokenStatusLabel =
    tokenStatus === "valid"
      ? `유효 (${tokenDaysLeft}일 남음)`
      : tokenStatus === "expiring"
        ? `만료 임박 (${tokenDaysLeft}일 남음)`
        : tokenStatus === "expired"
          ? "만료됨"
          : "연결된 계정 없음";

  const threadsTab = (
    <div style={{ display: "grid", gap: "var(--space-5)" }}>
      {/* 계정 연결 현황 */}
      <section style={sectionCardStyle}>
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
            <h2
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: "var(--weight-semibold)",
              }}
            >
              Threads 계정 연결
            </h2>
            <p style={{ ...fieldHintStyle, marginTop: "var(--space-1)" }}>
              봇이 답글을 발행할 Threads 계정을 연결합니다.
            </p>
          </div>

          {oauthUrl ? (
            <a
              href={oauthUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-4)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--brand)",
                background: "var(--brand-subtle)",
                color: "var(--brand)",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-medium)",
                textDecoration: "none",
                whiteSpace: "nowrap",
                transition:
                  "background var(--transition-fast), color var(--transition-fast)",
              }}
            >
              <svg
                width={13}
                height={13}
                viewBox="0 0 13 13"
                fill="none"
                aria-hidden
              >
                <title>Threads 계정 연결</title>
                <path
                  d="M6.5 1C3.46 1 1 3.46 1 6.5S3.46 12 6.5 12"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <path
                  d="M9 4C9 2.9 8.1 2 7 2c-.7 0-1.33.36-1.7.9"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <circle
                  cx="10"
                  cy="10"
                  r="2"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path
                  d="M10 9v1l.65.65"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                />
              </svg>
              {threadsAccount ? "계정 재연결" : "Threads 계정 연결"}
            </a>
          ) : (
            <span style={{ ...fieldHintStyle, alignSelf: "center" }}>
              앱 ID와 앱 URL을 먼저 저장하세요
            </span>
          )}
        </div>

        {appUrlIsHttp && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-2)",
              padding: "var(--space-3) var(--space-4)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-warn-bg, #fffbeb)",
              border: "1px solid var(--color-warn-border, #fcd34d)",
              color: "var(--color-warn, #92400e)",
              fontSize: "var(--text-xs)",
              lineHeight: 1.6,
            }}
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
              style={{ flexShrink: 0, marginTop: 1 }}
            >
              <title>경고</title>
              <path
                d="M7 1.5L13 12.5H1L7 1.5Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d="M7 5.5v3M7 10.5h.01"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <span>
              현재 앱 URL이 <strong>HTTP</strong> ({appUrl})로 감지되었습니다.
              Meta OAuth는 HTTPS redirect_uri를 요구하므로 계정 연결이 차단될 수
              있습니다. 아래 <strong>앱 URL</strong> 설정에 HTTPS 주소를
              입력하거나, ngrok 등 HTTPS 터널을 사용하세요.
            </span>
          </div>
        )}

        {threadsAccount ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "var(--space-3)",
            }}
          >
            {[
              { label: "연결 계정", value: `@${threadsAccount.username}` },
              { label: "User ID", value: threadsAccount.threads_user_id },
              {
                label: "토큰 상태",
                value: tokenStatusLabel,
                color: tokenStatusColor,
              },
              {
                label: "마지막 갱신",
                value: threadsAccount.token_last_refreshed_at
                  ? new Date(
                      threadsAccount.token_last_refreshed_at,
                    ).toLocaleString("ko-KR")
                  : "—",
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border)",
                  background: "var(--bg-raised)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-1)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--weight-medium)",
                    color: item.color ?? "var(--text-primary)",
                    fontFamily:
                      item.label === "User ID" ? "var(--font-mono)" : undefined,
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p
            style={{
              ...fieldHintStyle,
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
            }}
          >
            아직 연결된 Threads 계정이 없습니다. 위 버튼으로 계정을 연결하면
            봇이 답글을 발행할 수 있습니다.
          </p>
        )}
      </section>

      {/* 입력 섹션 — Meta에서 받는 값 */}
      <section style={sectionCardStyle}>
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
            <h2
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: "var(--weight-semibold)",
              }}
            >
              Meta에서 받는 값
            </h2>
            <p style={{ ...fieldHintStyle, marginTop: "var(--space-1)" }}>
              Meta Developer Console에서 앱을 만들면 발급되는 값입니다. 비밀값
              입력란을 비워두면 기존 값이 유지됩니다.
            </p>
          </div>
          <TestButton
            testTarget="threads_app"
            label="앱 자격증명 테스트"
            icon={
              <svg
                width={13}
                height={13}
                viewBox="0 0 13 13"
                fill="none"
                aria-hidden
              >
                <title>앱 자격증명 테스트</title>
                <path
                  d="M6.5 1C3.46 1 1 3.46 1 6.5S3.46 12 6.5 12 12 9.54 12 6.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <path
                  d="M9 3.5C9 2.67 8.33 2 7.5 2S6 2.67 6 3.5c0 .55.3 1.03.75 1.29"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <path
                  d="M8.5 7l2 2 2-2"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10.5 9V6"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
        </div>

        <div style={gridStyle}>
          <label style={labelStyle}>
            <span style={fieldLabelStyle}>Threads App ID</span>
            <input
              name="threadsAppId"
              type="text"
              defaultValue={settings.threadsAppId ?? ""}
              className="admin-field"
            />
          </label>

          <div style={labelStyle}>
            <span style={fieldLabelStyle}>Threads App Secret</span>
            <SecretRevealField
              name="threadsAppSecret"
              currentValue={settings.threadsAppSecret}
              placeholder="새 값 입력 시 갱신"
            />
          </div>
        </div>
      </section>

      {/* 출력 섹션 — Meta에 입력할 값 */}
      <section style={sectionCardStyle}>
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
            <h2
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: "var(--weight-semibold)",
              }}
            >
              Meta Developer Console에 입력할 값
            </h2>
            <p style={{ ...fieldHintStyle, marginTop: "var(--space-1)" }}>
              아래 값들을 Meta Webhook 설정 화면에 그대로 붙여넣으세요. Verify
              Token은 저장 시 자동 생성됩니다.
            </p>
          </div>
          <TestButton
            testTarget="threads_webhook"
            label="웹훅 테스트"
            icon={webhookIcon}
          />
        </div>

        <div style={gridStyle}>
          <div style={labelStyle}>
            <span style={fieldLabelStyle}>OAuth Callback URL</span>
            <CopyField value={oauthCallbackUrl} />
          </div>

          <div style={labelStyle}>
            <span style={fieldLabelStyle}>Webhook URL</span>
            <CopyField value={webhookUrl} />
          </div>

          <div style={labelStyle}>
            <span style={fieldLabelStyle}>Deauthorization URL</span>
            <CopyField value={deauthCallbackUrl} />
          </div>

          <div style={labelStyle}>
            <span style={fieldLabelStyle}>Data Deletion URL</span>
            <CopyField value={dataDeletionUrl} />
          </div>

          <div style={labelStyle}>
            <span style={fieldLabelStyle}>Verify Token</span>
            <CopyField
              value={settings.threadsWebhookVerifyToken}
              masked
              placeholder="저장 시 자동 생성됩니다"
            />
          </div>
        </div>
      </section>
    </div>
  );

  const modelTab = (
    <section style={sectionCardStyle}>
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
          <h2
            style={{
              fontSize: "var(--text-lg)",
              fontWeight: "var(--weight-semibold)",
            }}
          >
            모델과 보안 토큰
          </h2>
          <p style={{ ...fieldHintStyle, marginTop: "var(--space-1)" }}>
            원격 Base URL을 쓰면 API 키가 필요합니다.
          </p>
        </div>
        <TestButton
          testTarget="model"
          label="모델 연결 테스트"
          icon={
            <svg
              width={13}
              height={13}
              viewBox="0 0 13 13"
              fill="none"
              aria-hidden
            >
              <title>모델 연결 테스트</title>
              <circle
                cx="6.5"
                cy="6.5"
                r="5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M4 6.5h5M7.5 4.5l2 2-2 2"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
      </div>

      <div style={gridStyle}>
        <label style={labelStyle}>
          <span style={fieldLabelStyle}>Base URL</span>
          <input
            name="openAiBaseUrl"
            type="url"
            defaultValue={settings.openAiBaseUrl}
            className="admin-field"
          />
        </label>

        <label style={labelStyle}>
          <span style={fieldLabelStyle}>Model Name</span>
          <input
            name="openAiModelName"
            type="text"
            defaultValue={settings.openAiModelName}
            className="admin-field"
          />
        </label>

        <div style={labelStyle}>
          <span style={fieldLabelStyle}>API Key</span>
          <SecretRevealField
            name="openAiApiKey"
            currentValue={settings.openAiApiKey}
            placeholder="새 값 입력 시 갱신"
          />
        </div>

        <label style={labelStyle}>
          <span style={fieldLabelStyle}>Timeout (ms)</span>
          <input
            name="openAiTimeoutMs"
            type="number"
            min={1000}
            max={600000}
            defaultValue={settings.openAiTimeoutMs}
            className="admin-field"
          />
        </label>
      </div>

      {/* Reasoning mode — full-width row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          padding: "var(--space-4) var(--space-5)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          background: "var(--bg-raised)",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
            flex: 1,
          }}
        >
          <span style={fieldLabelStyle}>추론 모드 (Reasoning)</span>
          <span style={fieldHintStyle}>
            켜면 모델에{" "}
            <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.9em" }}>
              reasoning_effort
            </code>
            를 전달하고, 응답에서{" "}
            <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.9em" }}>
              &lt;think&gt;
            </code>{" "}
            블록을 자동 제거합니다. 로컬 추론 모델(QwQ, DeepSeek-R1 등)과 OpenAI
            o-series에 유효합니다.
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
            flexShrink: 0,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              name="openAiReasoningEnabled"
              defaultChecked={settings.openAiReasoningEnabled}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            <span
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-medium)",
              }}
            >
              사용
            </span>
          </label>
          <label style={labelStyle}>
            <span style={{ ...fieldHintStyle, whiteSpace: "nowrap" }}>
              추론 강도
            </span>
            <select
              name="openAiReasoningEffort"
              defaultValue={settings.openAiReasoningEffort}
              className="admin-field"
              style={{ minWidth: 110 }}
            >
              <option value="low">low — 빠름</option>
              <option value="medium">medium — 균형</option>
              <option value="high">high — 정확</option>
            </select>
          </label>
        </div>
      </div>

      <div style={gridStyle}>
        <div style={labelStyle}>
          <span style={fieldLabelStyle}>Cron Secret</span>
          <SecretRevealField
            name="cronSecret"
            currentValue={settings.cronSecret}
            placeholder="새 값 입력 시 갱신"
          />
        </div>
      </div>
    </section>
  );

  const workerTab = (
    <section style={sectionCardStyle}>
      <div className="admin-section-title">
        <h2
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: "var(--weight-semibold)",
          }}
        >
          워커와 어댑터
        </h2>
        <p style={{ ...fieldHintStyle, marginTop: "var(--space-1)" }}>
          백그라운드 워커와 메트릭 백필 스크립트가 참조하는 런타임 설정입니다.
        </p>
      </div>

      <div style={gridStyle}>
        <label style={labelStyle}>
          <span style={fieldLabelStyle}>Worker Adapter Module</span>
          <input
            name="workerAdapterModule"
            type="text"
            defaultValue={settings.workerAdapterModule}
            className="admin-field"
          />
        </label>

        <label style={labelStyle}>
          <span style={fieldLabelStyle}>Metrics Adapter Module</span>
          <input
            name="metricsAdapterModule"
            type="text"
            defaultValue={settings.metricsAdapterModule}
            className="admin-field"
          />
        </label>

        <label style={labelStyle}>
          <span style={fieldLabelStyle}>Worker Poll (ms)</span>
          <input
            name="workerPollIntervalMs"
            type="number"
            min={100}
            max={600000}
            defaultValue={settings.workerPollIntervalMs}
            className="admin-field"
          />
        </label>

        <label style={labelStyle}>
          <span style={fieldLabelStyle}>Worker Heartbeat (ms)</span>
          <input
            name="workerHeartbeatIntervalMs"
            type="number"
            min={100}
            max={600000}
            defaultValue={settings.workerHeartbeatIntervalMs}
            className="admin-field"
          />
        </label>

        <label style={labelStyle}>
          <span style={fieldLabelStyle}>Token Refresh Check (ms)</span>
          <input
            name="tokenCheckIntervalMs"
            type="number"
            min={1000}
            max={2592000000}
            defaultValue={settings.tokenCheckIntervalMs}
            className="admin-field"
          />
        </label>
      </div>
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
          API 관리
        </span>
        <h1
          style={{
            fontSize: "var(--text-3xl)",
            fontWeight: "var(--weight-bold)",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
        >
          연동과 비밀값 관리
        </h1>
      </div>

      {/* Alerts */}
      {authSuccess ? (
        <div className="admin-alert admin-alert-success">
          <svg
            width={16}
            height={16}
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <title>연결 완료</title>
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
          Threads 계정이 성공적으로 연결되었습니다.
        </div>
      ) : null}

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
          연동 설정이 저장되었습니다.
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

      {/* Status cards */}
      <section
        style={{
          display: "grid",
          gap: "var(--space-3)",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        }}
      >
        {statusItems.map((item) => (
          <article
            key={item.label}
            style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--border)",
              borderLeft: `3px solid ${item.configured ? "var(--color-success)" : "var(--color-failed)"}`,
              borderRadius: "var(--radius-xl)",
              padding: "var(--space-4) var(--space-5)",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-2)",
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-tertiary)",
                  fontWeight: "var(--weight-medium)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {item.label}
              </span>
              <span
                className={`admin-status-pill ${item.configured ? "admin-status-pill-ok" : "admin-status-pill-error"}`}
              >
                <span
                  className={`admin-status-dot ${item.configured ? "admin-status-dot-ok" : "admin-status-dot-error"}`}
                />
                {item.configured ? "정상" : "미완료"}
              </span>
            </div>
            <strong
              style={{
                fontSize: "var(--text-base)",
                fontWeight: "var(--weight-semibold)",
              }}
            >
              {item.value}
            </strong>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "var(--text-xs)",
                lineHeight: 1.5,
              }}
            >
              {item.detail}
            </p>
          </article>
        ))}
      </section>

      {/* Tabbed form */}
      <AdminForm
        action="/api/admin/api"
        submitLabel="연동 설정 저장"
        reloadOnSuccess
      >
        <AdminTabs
          tabs={[
            {
              label: "Threads 연동",
              icon: (
                <svg
                  key="icon-threads"
                  width={14}
                  height={14}
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden
                >
                  <title>Threads 연동</title>
                  <path
                    d="M7 1.5C3.96 1.5 1.5 3.96 1.5 7S3.96 12.5 7 12.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9.5 5C9.5 3.62 8.38 2.5 7 2.5c-.83 0-1.57.4-2.03 1.02"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="10.5"
                    cy="10.5"
                    r="2"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M10.5 9.5v1l.7.7"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                  />
                </svg>
              ),
              content: threadsTab,
            },
            {
              label: "모델 / 보안",
              icon: (
                <svg
                  key="icon-model"
                  width={14}
                  height={14}
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden
                >
                  <title>모델 및 보안</title>
                  <rect
                    x="1.5"
                    y="4"
                    width="11"
                    height="8"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M4.5 4V3a2.5 2.5 0 0 1 5 0v1"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <circle cx="7" cy="8" r="1" fill="currentColor" />
                </svg>
              ),
              content: modelTab,
            },
            {
              label: "워커 / 어댑터",
              icon: (
                <svg
                  key="icon-worker"
                  width={14}
                  height={14}
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden
                >
                  <title>워커 및 어댑터</title>
                  <rect
                    x="1.5"
                    y="2"
                    width="11"
                    height="7"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M4.5 12h5M7 9v3"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M4 5.5h6"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              ),
              content: workerTab,
            },
          ]}
        />
      </AdminForm>
    </>
  );
}
