"use client";

import type { CSSProperties } from "react";
import type { Column } from "@/components/ui/DataTable";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import type { StatusVariant } from "@/components/ui/StatusBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useHourlyMetrics } from "@/features/dashboard/useMetrics";
import {
  formatUptime,
  type OverviewData,
  useOverview,
} from "@/features/dashboard/useOverview";

interface ErrorRow {
  id: string;
  time: string;
  message: string;
  status: string;
}

interface HistoryBucket {
  time: string;
  success?: number;
  failed?: number;
  ignored?: number;
  prompt_injection?: number;
}

const ERROR_COLUMNS: Column<ErrorRow>[] = [
  {
    key: "time",
    header: "시각",
    width: "180px",
    render: (r) => (
      <span
        style={{
          fontSize: "var(--text-xs)",
          fontVariantNumeric: "tabular-nums",
          color: "var(--text-secondary)",
        }}
      >
        {new Date(r.time).toLocaleString("ko-KR")}
      </span>
    ),
  },
  { key: "message", header: "오류 메시지" },
  {
    key: "status",
    header: "상태",
    width: "100px",
    render: (r) => <StatusBadge status={r.status as StatusVariant} size="sm" />,
  },
];

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

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatLatency(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}s`;
  }

  return `${Math.round(value)}ms`;
}

function getHistoryBucketState(bucket: HistoryBucket) {
  const success = Number(bucket.success ?? 0);
  const failed = Number(bucket.failed ?? 0);
  const ignored = Number(bucket.ignored ?? 0);
  const total = success + failed + ignored;

  if (failed > 0 && success === 0) {
    return {
      label: "Down",
      accent: "var(--color-failed)",
      height: 34,
      opacity: 1,
    };
  }

  if (failed > 0) {
    return {
      label: "Degraded",
      accent: "var(--color-warning)",
      height: 34,
      opacity: 1,
    };
  }

  if (success > 0) {
    return {
      label: "Up",
      accent: "var(--color-success)",
      height: 34,
      opacity: 1,
    };
  }

  return {
    label: "Idle",
    accent: "var(--bg-skeleton)",
    height: 22,
    opacity: total > 0 ? 0.64 : 0.32,
  };
}

function getStatusTone(
  workerStatus: OverviewData["worker_status"] | undefined,
): {
  label: string;
  shortLabel: string;
  message: string;
  accent: string;
  surface: string;
  border: string;
} {
  if (workerStatus === "online") {
    return {
      label: "Operational",
      shortLabel: "Up",
      message: "워커와 응답 파이프라인이 안정적으로 동작하고 있습니다.",
      accent: "var(--color-success)",
      surface: "var(--color-success-bg)",
      border: "var(--color-success-border)",
    };
  }

  if (workerStatus === "warning") {
    return {
      label: "Degraded",
      shortLabel: "Warn",
      message: "heartbeat 지연이 감지되어 관찰이 필요한 상태입니다.",
      accent: "var(--color-warning)",
      surface: "var(--color-warning-bg)",
      border: "var(--color-warning-border)",
    };
  }

  return {
    label: "Disrupted",
    shortLabel: "Down",
    message: "워커 heartbeat가 없어 처리 파이프라인 점검이 필요합니다.",
    accent: "var(--color-failed)",
    surface: "var(--color-failed-bg)",
    border: "var(--color-failed-border)",
  };
}

export default function OverviewPage() {
  const { data, loading, error } = useOverview(30_000);
  const { data: hourlyData, loading: historyLoading } = useHourlyMetrics();

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "var(--space-4)",
  };

  const subLabelStyle: CSSProperties = {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    fontWeight: "var(--weight-medium)" as CSSProperties["fontWeight"],
  };

  if (error && !data) {
    return (
      <>
        <SectionHeader
          title="개요"
          description="봇 운영 현황을 한눈에 확인합니다."
        />
        <ErrorState message={error} />
      </>
    );
  }

  const quotaPct = data
    ? Math.min(
        100,
        Math.round((data.reply_quota_used / data.reply_quota_total) * 100),
      )
    : 0;
  const quotaColor =
    quotaPct >= 90
      ? "var(--color-failed)"
      : quotaPct >= 70
        ? "var(--color-warning)"
        : "var(--color-success)";

  const workerVariant: StatusVariant =
    data?.worker_status === "online"
      ? "success"
      : data?.worker_status === "warning"
        ? "token_warning"
        : "ignored";
  const statusTone = getStatusTone(data?.worker_status);
  const statusHistory = hourlyData.slice(-24);
  const processedCount =
    (data?.recent_success_count ?? 0) + (data?.recent_failed_count ?? 0);
  const successRate =
    processedCount > 0
      ? ((data?.recent_success_count ?? 0) / processedCount) * 100
      : 100;
  const healthyHours = statusHistory.filter(
    (bucket) =>
      Number(bucket.failed ?? 0) === 0 && Number(bucket.success ?? 0) > 0,
  ).length;
  const degradedHours = statusHistory.filter((bucket) => {
    const success = Number(bucket.success ?? 0);
    const failed = Number(bucket.failed ?? 0);

    return failed > 0 && success > 0;
  }).length;
  const failedHours = statusHistory.filter((bucket) => {
    const success = Number(bucket.success ?? 0);
    const failed = Number(bucket.failed ?? 0);

    return failed > 0 && success === 0;
  }).length;
  const uptime24h =
    statusHistory.length > 0 ? (healthyHours / statusHistory.length) * 100 : 0;
  const historySlots: HistoryBucket[] = Array.from(
    { length: Math.max(24, statusHistory.length) },
    (_, index) =>
      statusHistory[index] ?? {
        time: `empty-${index}`,
        success: 0,
        failed: 0,
        ignored: 0,
        prompt_injection: 0,
      },
  );

  const heroStyle: CSSProperties = {
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--bg-panel) 88%, var(--bg) 12%) 0%, var(--bg-panel) 100%)",
    border: `1px solid ${statusTone.border}`,
    borderRadius: "var(--radius-xl)",
    boxShadow: "var(--shadow-sm)",
    padding: "var(--space-6)",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 1.2fr)",
    gap: "var(--space-6)",
    alignItems: "stretch",
  };

  const heroHeadlineStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-4)",
  };

  const statGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "var(--space-3)",
  };

  const monitorGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "var(--space-3)",
  };

  return (
    <>
      <SectionHeader
        title="개요"
        description="봇 운영 현황을 한눈에 확인합니다."
      />

      <div style={heroStyle}>
        <div style={heroHeadlineStyle}>
          {loading ? (
            <>
              <Skeleton width={140} height={28} radius="var(--radius-full)" />
              <Skeleton width="44%" height={16} />
              <Skeleton width="58%" height={58} radius="var(--radius-md)" />
              <Skeleton width="72%" height={14} />
              <div style={statGridStyle}>
                {["uptime-a", "uptime-b", "uptime-c"].map((key) => (
                  <div
                    key={key}
                    style={{
                      padding: "var(--space-4)",
                      borderRadius: "var(--radius-lg)",
                      border: "1px solid var(--border)",
                      background: "var(--bg-panel)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-2)",
                    }}
                  >
                    <Skeleton width="46%" height={10} />
                    <Skeleton width="68%" height={18} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  width: "fit-content",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: "var(--radius-full)",
                  background: statusTone.surface,
                  color: statusTone.accent,
                  border: `1px solid ${statusTone.border}`,
                  fontSize: "var(--text-sm)",
                  fontWeight:
                    "var(--weight-semibold)" as CSSProperties["fontWeight"],
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "var(--radius-full)",
                    background: statusTone.accent,
                    boxShadow: `0 0 0 4px ${statusTone.surface}`,
                  }}
                />
                현재 상태 {statusTone.label}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-secondary)",
                  }}
                >
                  현재 서비스 업타임
                </span>
                <strong
                  style={{
                    fontSize: "clamp(2.8rem, 6vw, 4.7rem)",
                    lineHeight: 0.95,
                    letterSpacing: "-0.06em",
                    color: "var(--text-primary)",
                    fontWeight:
                      "var(--weight-bold)" as CSSProperties["fontWeight"],
                  }}
                >
                  {formatUptime(data?.uptime_seconds ?? 0)}
                </strong>
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-secondary)",
                    maxWidth: 480,
                  }}
                >
                  {statusTone.message}
                </p>
              </div>

              <div style={statGridStyle}>
                {[
                  {
                    label: "최근 1시간 성공률",
                    value: formatPercent(successRate),
                  },
                  {
                    label: "최근 24시간 업타임",
                    value: formatPercent(uptime24h),
                  },
                  {
                    label: "마지막 heartbeat",
                    value: formatRelativeTime(data?.worker_last_heartbeat),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: "var(--space-4)",
                      borderRadius: "var(--radius-lg)",
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border)",
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
                    <strong
                      style={{
                        fontSize: "var(--text-lg)",
                        fontWeight:
                          "var(--weight-semibold)" as CSSProperties["fontWeight"],
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {item.value}
                    </strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-5)",
          }}
        >
          {loading ? (
            <>
              <Skeleton width="38%" height={14} />
              <div style={{ display: "flex", gap: "8px" }}>
                {Array.from({ length: 18 }, (_, index) => (
                  <Skeleton
                    key={`history-skeleton-${String.fromCharCode(97 + index)}`}
                    width="100%"
                    height={38}
                    radius="var(--radius-full)"
                    style={{ flex: 1 }}
                  />
                ))}
              </div>
              <div style={monitorGridStyle}>
                {["monitor-a", "monitor-b", "monitor-c", "monitor-d"].map(
                  (key) => (
                    <div
                      key={key}
                      style={{
                        padding: "var(--space-4)",
                        borderRadius: "var(--radius-lg)",
                        border: "1px solid var(--border)",
                        background: "var(--bg-panel)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-2)",
                      }}
                    >
                      <Skeleton width="46%" height={10} />
                      <Skeleton width="68%" height={18} />
                    </div>
                  ),
                )}
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "var(--space-4)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-1)",
                  }}
                >
                  <span style={subLabelStyle}>최근 24시간 상태 히스토리</span>
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    정상 {healthyHours}시간, 경고 {degradedHours}시간, 장애{" "}
                    {failedHours}시간
                  </span>
                </div>

                <div
                  style={{
                    minWidth: 112,
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "24px",
                    background: statusTone.accent,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
                    lineHeight: 1,
                    fontWeight:
                      "var(--weight-bold)" as CSSProperties["fontWeight"],
                    letterSpacing: "-0.06em",
                  }}
                >
                  {statusTone.shortLabel}
                </div>
              </div>

              <div
                style={{
                  background: "var(--bg-panel)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-xl)",
                  padding: "var(--space-5)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-4)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  {(historyLoading ? [] : historySlots).map((bucket, index) => {
                    const bucketState = getHistoryBucketState(bucket);
                    const success = Number(bucket.success ?? 0);
                    const failed = Number(bucket.failed ?? 0);
                    const ignored = Number(bucket.ignored ?? 0);

                    return (
                      <div
                        key={`${bucket.time}-${index}`}
                        title={
                          bucket.time.startsWith("empty-")
                            ? "아직 집계 데이터가 없습니다."
                            : `${bucket.time} · 성공 ${success} · 실패 ${failed} · 무시 ${ignored}`
                        }
                        style={{
                          minWidth: 0,
                          height: bucketState.height,
                          borderRadius: "999px",
                          background: bucketState.accent,
                          opacity: bucketState.opacity,
                          boxShadow: bucket.time.startsWith("empty-")
                            ? "none"
                            : `inset 0 -6px 0 color-mix(in srgb, ${bucketState.accent} 82%, white)`,
                        }}
                      />
                    );
                  })}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    fontSize: "var(--text-xs)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  <span>30초마다 자동 갱신</span>
                </div>
              </div>

              <div style={monitorGridStyle}>
                {[
                  {
                    label: "현재 평균 처리 시간",
                    value: formatLatency(data?.avg_latency_ms ?? 0),
                    note: "최근 1시간",
                  },
                  {
                    label: "지연 상위 구간",
                    value: formatLatency(data?.p95_latency_ms ?? 0),
                    note: "p95 기준",
                  },
                  {
                    label: "최근 24시간 업타임",
                    value: formatPercent(uptime24h),
                    note: "상태 히스토리 기준",
                  },
                  {
                    label: "최근 오류",
                    value: `${data?.recent_errors.length ?? 0}건`,
                    note: "마지막 10개 표시",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: "var(--space-4)",
                      borderRadius: "var(--radius-lg)",
                      border: "1px solid var(--border)",
                      background: "var(--bg-panel)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-2)",
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
                    <strong
                      style={{
                        fontSize: "clamp(1.35rem, 2vw, 1.9rem)",
                        color: "var(--text-primary)",
                        fontWeight:
                          "var(--weight-semibold)" as CSSProperties["fontWeight"],
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {item.value}
                    </strong>
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {item.note}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={subLabelStyle}>Reply Quota</span>
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      color: quotaColor,
                      fontWeight:
                        "var(--weight-semibold)" as CSSProperties["fontWeight"],
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {data?.reply_quota_used ?? 0} /{" "}
                    {data?.reply_quota_total ?? 250}
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: "var(--radius-full)",
                    background: "var(--border)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${quotaPct}%`,
                      background: quotaColor,
                      borderRadius: "var(--radius-full)",
                      transition: "width var(--transition-slow)",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "var(--space-3)",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    쿼터가 70%를 넘으면 경고, 90%를 넘으면 위험 상태로 봅니다.
                  </span>
                  <StatusBadge
                    status={workerVariant}
                    label={data?.worker_status ?? "unknown"}
                    size="sm"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={gridStyle}>
        <KpiCard
          label="최근 성공 (1h)"
          value={(data?.recent_success_count ?? 0).toLocaleString()}
          accent="success"
          loading={loading}
        />
        <KpiCard
          label="최근 실패 (1h)"
          value={(data?.recent_failed_count ?? 0).toLocaleString()}
          accent="failed"
          loading={loading}
        />
        <KpiCard
          label="무시된 요청 (1h)"
          value={(data?.recent_ignored_count ?? 0).toLocaleString()}
          sub="파싱 실패, 짧은 본문 등"
          loading={loading}
        />
        <KpiCard
          label="평균 처리 시간"
          value={`${data?.avg_latency_ms ?? 0}ms`}
          accent="default"
          loading={loading}
        />
        <KpiCard
          label="p95 처리 시간"
          value={`${data?.p95_latency_ms ?? 0}ms`}
          accent="default"
          loading={loading}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <h2
          style={{
            fontSize: "var(--text-base)",
            fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
            color: "var(--text-primary)",
          }}
        >
          최근 오류
        </h2>
        <DataTable
          columns={ERROR_COLUMNS}
          data={data?.recent_errors ?? []}
          getRowKey={(row) => row.id}
          loading={loading}
          emptyText="최근 오류가 없습니다."
        />
      </div>
    </>
  );
}
