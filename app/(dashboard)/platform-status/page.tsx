"use client";

import type { CSSProperties } from "react";
import { ErrorState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import type { HealthData } from "@/features/dashboard/useHealth";
import { useHealth } from "@/features/dashboard/useHealth";

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return "기록 없음";
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60_000));
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("ko-KR");
}

type StatusLevel = "ok" | "warn" | "error" | "neutral";

const API_CONNECTION_LABELS: Record<
  HealthData["threads"]["api_connection_status"],
  string
> = {
  reachable: "응답 정상",
  unreachable: "연결 실패",
  not_checked: "미확인",
};

function getStatusColor(level: StatusLevel) {
  switch (level) {
    case "ok":
      return "var(--color-success)";
    case "warn":
      return "var(--color-warning)";
    case "error":
      return "var(--color-failed)";
    default:
      return "var(--text-tertiary)";
  }
}

function getStatusBg(level: StatusLevel) {
  switch (level) {
    case "ok":
      return "var(--color-success-bg)";
    case "warn":
      return "var(--color-warning-bg)";
    case "error":
      return "var(--color-failed-bg)";
    default:
      return "var(--bg-raised)";
  }
}

function getStatusBorder(level: StatusLevel) {
  switch (level) {
    case "ok":
      return "var(--color-success-border)";
    case "warn":
      return "var(--color-warning-border)";
    case "error":
      return "var(--color-failed-border)";
    default:
      return "var(--border)";
  }
}

function getTokenLevel(status: HealthData["threads"]["status"]): StatusLevel {
  switch (status) {
    case "valid":
      return "ok";
    case "expiring":
      return "warn";
    case "expired":
      return "error";
    default:
      return "neutral";
  }
}

function getThreadsLevel(
  threads: HealthData["threads"] | undefined,
): StatusLevel {
  if (!threads) {
    return "neutral";
  }

  if (threads.api_connection_status === "unreachable") {
    return "error";
  }

  return getTokenLevel(threads.status);
}

const TOKEN_LABELS: Record<HealthData["threads"]["status"], string> = {
  valid: "유효",
  expiring: "만료 임박",
  expired: "만료됨",
  missing: "연동 없음",
};

const WORKER_LABELS: Record<HealthData["worker"]["status"], string> = {
  online: "온라인",
  warning: "지연 감지",
  offline: "오프라인",
};

interface StatusCardProps {
  title: string;
  level: StatusLevel;
  label: string;
  rows: { key: string; value: string }[];
  loading?: boolean;
}

function StatusCard({ title, level, label, rows, loading }: StatusCardProps) {
  const cardStyle: CSSProperties = {
    borderRadius: "var(--radius-xl)",
    border: `1px solid ${getStatusBorder(level)}`,
    background: "var(--bg-panel)",
    overflow: "hidden",
    boxShadow: "var(--shadow-sm)",
  };

  const headerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--space-4) var(--space-5)",
    borderBottom: "1px solid var(--border)",
    background: getStatusBg(level),
  };

  const dotStyle: CSSProperties = {
    width: 9,
    height: 9,
    borderRadius: "var(--radius-full)",
    background: getStatusColor(level),
    flexShrink: 0,
  };

  const pillStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-2)",
    padding: "var(--space-1) var(--space-3)",
    borderRadius: "var(--radius-full)",
    background: "color-mix(in srgb, var(--bg-panel) 60%, transparent)",
    border: `1px solid ${getStatusBorder(level)}`,
    color: getStatusColor(level),
    fontSize: "var(--text-xs)",
    fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
    backdropFilter: "blur(4px)",
  };

  const bodyStyle: CSSProperties = {
    padding: "var(--space-5)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
  };

  const rowStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "var(--space-4)",
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
            color: "var(--text-primary)",
          }}
        >
          {title}
        </span>
        {loading ? (
          <Skeleton width={80} height={22} radius="var(--radius-full)" />
        ) : (
          <span style={pillStyle}>
            <span style={dotStyle} />
            {label}
          </span>
        )}
      </div>
      <div style={bodyStyle}>
        {loading
          ? [0, 1, 2].map((i) => (
              <div key={i} style={rowStyle}>
                <Skeleton width="30%" height={13} />
                <Skeleton width="40%" height={13} />
              </div>
            ))
          : rows.map((row) => (
              <div key={row.key} style={rowStyle}>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-tertiary)",
                    flexShrink: 0,
                  }}
                >
                  {row.key}
                </span>
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-secondary)",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    wordBreak: "break-all",
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
      </div>
    </div>
  );
}

export default function PlatformStatusPage() {
  const { data, loading, error } = useHealth(30_000);

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "var(--space-4)",
  };

  if (error && !data) {
    return (
      <>
        <SectionHeader
          title="플랫폼 상태"
          description="Threads 연동, 토큰, 웹훅, 워커, 데이터베이스 상태를 확인합니다."
        />
        <ErrorState message={error} />
      </>
    );
  }

  const threads = data?.threads;
  const webhook = data?.webhook;
  const worker = data?.worker;
  const database = data?.database;

  const tokenLevel = getThreadsLevel(threads);
  const workerLevel: StatusLevel =
    worker?.status === "online"
      ? "ok"
      : worker?.status === "warning"
        ? "warn"
        : loading
          ? "neutral"
          : "error";
  const dbLevel: StatusLevel =
    database?.status === "ok" ? "ok" : loading ? "neutral" : "error";

  const webhookLevel: StatusLevel = webhook?.last_received_at
    ? webhook.last_signature_valid
      ? "ok"
      : "error"
    : loading
      ? "neutral"
      : "neutral";

  return (
    <>
      <SectionHeader
        title="플랫폼 상태"
        description="Threads 연동, 토큰, 웹훅, 워커, 데이터베이스 상태를 확인합니다."
      />

      <div style={gridStyle}>
        <StatusCard
          title="Threads 계정 & 토큰"
          level={tokenLevel}
          label={threads ? TOKEN_LABELS[threads.status] : "—"}
          loading={loading}
          rows={[
            {
              key: "계정",
              value: threads?.username ? `@${threads.username}` : "—",
            },
            {
              key: "토큰 만료",
              value: formatDateTime(threads?.token_expires_at),
            },
            {
              key: "마지막 점검",
              value: formatRelativeTime(threads?.last_checked_at),
            },
            {
              key: "마지막 갱신",
              value: formatRelativeTime(threads?.last_refreshed_at),
            },
            {
              key: "API 연결",
              value: threads
                ? API_CONNECTION_LABELS[threads.api_connection_status]
                : "—",
            },
            {
              key: "연결 확인 시각",
              value: formatRelativeTime(threads?.api_connection_checked_at),
            },
            {
              key: "연결 오류",
              value: threads?.api_connection_error ?? "—",
            },
          ]}
        />

        <StatusCard
          title="Webhook 수신"
          level={webhookLevel}
          label={
            webhook?.last_received_at
              ? webhook.last_signature_valid
                ? "정상"
                : "서명 오류"
              : "수신 없음"
          }
          loading={loading}
          rows={[
            {
              key: "마지막 수신",
              value: formatRelativeTime(webhook?.last_received_at),
            },
            {
              key: "수신 일시",
              value: formatDateTime(webhook?.last_received_at),
            },
            {
              key: "서명 검증",
              value:
                webhook?.last_received_at === undefined || loading
                  ? "—"
                  : webhook.last_signature_valid
                    ? "유효"
                    : "실패",
            },
          ]}
        />

        <StatusCard
          title="워커 프로세스"
          level={workerLevel}
          label={worker ? WORKER_LABELS[worker.status] : "—"}
          loading={loading}
          rows={[
            {
              key: "상태",
              value: worker ? WORKER_LABELS[worker.status] : "—",
            },
            {
              key: "마지막 heartbeat",
              value: formatRelativeTime(worker?.last_heartbeat),
            },
            {
              key: "호스트",
              value: worker?.hostname ?? "—",
            },
            {
              key: "PID",
              value: worker?.pid != null ? String(worker.pid) : "—",
            },
          ]}
        />

        <StatusCard
          title="데이터베이스 (SQLite)"
          level={dbLevel}
          label={
            database?.status === "ok" ? "정상" : loading ? "—" : "파일 없음"
          }
          loading={loading}
          rows={[
            {
              key: "상태",
              value: database?.status === "ok" ? "정상" : "파일 없음",
            },
            {
              key: "경로",
              value: database?.path_masked ?? "—",
            },
            {
              key: "크기",
              value: database?.size_human ?? "—",
            },
          ]}
        />
      </div>

      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-tertiary)",
          textAlign: "right",
        }}
      >
        30초마다 자동 갱신됩니다.
      </p>
    </>
  );
}
