"use client";

import type { CSSProperties } from "react";
import { KpiCard } from "@/components/ui/KpiCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TimeseriesSeries } from "@/components/ui/TimeseriesChart";
import { TimeseriesChart } from "@/components/ui/TimeseriesChart";
import { useHourlyMetrics } from "@/features/dashboard/useMetrics";
import { useRequests } from "@/features/dashboard/useRequests";

const CHART_SERIES: TimeseriesSeries[] = [
  { key: "success", label: "성공", color: "var(--color-success)" },
  { key: "failed", label: "실패", color: "var(--color-failed)" },
  { key: "ignored", label: "무시", color: "var(--color-ignored)" },
];

const PALETTE = [
  "var(--brand)",
  "var(--color-success)",
  "var(--color-queued)",
  "var(--color-warning)",
  "var(--color-injection)",
  "var(--color-ignored)",
];

interface DistributionItemProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function DistributionItem({
  label,
  count,
  total,
  color,
}: DistributionItemProps) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-2) 0",
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          flex: 1,
          fontSize: "var(--text-sm)",
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 80,
            height: 6,
            borderRadius: "var(--radius-full)",
            background: "var(--border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: color,
              borderRadius: "var(--radius-full)",
            }}
          />
        </div>
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-secondary)",
            width: 36,
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {pct}%
        </span>
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-tertiary)",
            width: 40,
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {count.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

interface DistributionCardProps {
  title: string;
  items: { label: string; count: number }[];
  loading?: boolean;
}

function DistributionCard({
  title,
  items,
  loading = false,
}: DistributionCardProps) {
  const total = items.reduce((s, i) => s + i.count, 0);
  const skeletonKeys = ["item-a", "item-b", "item-c", "item-d"];

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5) var(--space-6)",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      <span
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
          color: "var(--text-secondary)",
        }}
      >
        {title}
      </span>
      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          {skeletonKeys.map((itemKey) => (
            <div
              key={`${title}-${itemKey}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
              }}
            >
              <Skeleton width={10} height={10} radius="var(--radius-full)" />
              <Skeleton width="34%" height={12} />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  marginLeft: "auto",
                }}
              >
                <Skeleton width={80} height={6} radius="var(--radius-full)" />
                <Skeleton width={28} height={12} />
                <Skeleton width={32} height={12} />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p
          style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}
        >
          데이터가 없습니다.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((item, idx) => (
            <DistributionItem
              key={item.label}
              label={item.label}
              count={item.count}
              total={total}
              color={PALETTE[idx % PALETTE.length]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RequestsPage() {
  const { result, loading } = useRequests({ limit: 1 });
  const { data: chartData, loading: chartLoading } = useHourlyMetrics();
  const stats = result?.stats;

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "var(--space-4)",
  };

  const twoColStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "var(--space-4)",
  };

  const subHeadStyle: CSSProperties = {
    fontSize: "var(--text-base)",
    fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
    color: "var(--text-primary)",
  };

  const cmdItems = (stats?.command_distribution ?? []).map((d) => ({
    label: d.command_type ?? "(알 수 없음)",
    count: d.count,
  }));

  const langItems = (stats?.language_distribution ?? []).map((d) => ({
    label: d.target_language ?? "(없음)",
    count: d.count,
  }));
  const sourceLangItems = (stats?.source_language_distribution ?? []).map(
    (d) => ({
      label: d.source_language ?? "(없음)",
      count: d.count,
    }),
  );

  return (
    <>
      <SectionHeader
        title="요청 분석"
        description="시간대별 요청량과 명령 유형 분포를 분석합니다."
      />

      <div style={gridStyle}>
        <KpiCard
          label="전체 요청"
          value={(result?.total ?? 0).toLocaleString()}
          loading={loading}
        />
        <KpiCard
          label="짧은 본문 무시"
          value={(stats?.ignored_short_text ?? 0).toLocaleString()}
          sub="최소 길이 미달"
          loading={loading}
        />
        <KpiCard
          label="이미지 전용 미지원"
          value={(stats?.ignored_image_only ?? 0).toLocaleString()}
          sub="텍스트 없는 게시물"
          loading={loading}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        <h2 style={subHeadStyle}>시간대별 요청량</h2>
        <TimeseriesChart
          data={chartData}
          series={CHART_SERIES}
          height={200}
          loading={chartLoading}
          emptyText="아직 표시할 요청 추이가 없어요. 요청이 쌓이면 이곳에 자동으로 그래프가 나타납니다."
        />
      </div>

      <div style={twoColStyle}>
        <DistributionCard
          title="번역·요약·복합 요청 비율"
          items={cmdItems}
          loading={loading}
        />
        <DistributionCard
          title="대상 언어 분포"
          items={langItems}
          loading={loading}
        />
      </div>

      <div style={twoColStyle}>
        <DistributionCard
          title="원문 언어 분포"
          items={sourceLangItems}
          loading={loading}
        />
      </div>
    </>
  );
}
