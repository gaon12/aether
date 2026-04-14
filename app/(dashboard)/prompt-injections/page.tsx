"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import type { Column } from "@/components/ui/DataTable";
import { DataTable } from "@/components/ui/DataTable";
import {
  DetailDrawer,
  DrawerField,
  DrawerSection,
} from "@/components/ui/DetailDrawer";
import { DateRangeFilter, FilterBar } from "@/components/ui/FilterBar";
import { HistogramChart } from "@/components/ui/HistogramChart";
import { KpiCard } from "@/components/ui/KpiCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TimeseriesChart } from "@/components/ui/TimeseriesChart";
import { useHourlyMetrics } from "@/features/dashboard/useMetrics";
import { usePromptInjections } from "@/features/dashboard/usePromptInjections";
import type { PromptInjectionEventsTable } from "@/types/db";

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 0.8
      ? "var(--color-failed)"
      : score >= 0.5
        ? "var(--color-warning)"
        : "var(--color-queued)";

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
    >
      <div
        style={{
          width: 60,
          height: 6,
          borderRadius: "var(--radius-full)",
          background: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.round(score * 100)}%`,
            background: color,
            borderRadius: "var(--radius-full)",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "var(--text-xs)",
          color,
          fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
          fontVariantNumeric: "tabular-nums",
          minWidth: 28,
        }}
      >
        {score.toFixed(2)}
      </span>
    </div>
  );
}

const COLUMNS: Column<PromptInjectionEventsTable>[] = [
  {
    key: "request_id",
    header: "요청 ID",
    width: "140px",
    render: (r) => (
      <code
        style={{
          fontSize: "var(--text-xs)",
          fontFamily: "var(--font-mono)",
          opacity: 0.7,
        }}
      >
        {r.request_id.slice(0, 8)}…
      </code>
    ),
  },
  {
    key: "score",
    header: "의심 점수",
    width: "130px",
    render: (r) => <ScoreBar score={r.score} />,
  },
  {
    key: "reason",
    header: "탐지 사유",
    render: (r) => (
      <span
        style={{ fontSize: "var(--text-sm)", color: "var(--color-injection)" }}
      >
        {r.reason}
      </span>
    ),
  },
  {
    key: "excerpt",
    header: "원문 발췌",
    width: "200px",
    render: (r) => (
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-secondary)",
          fontFamily: "var(--font-mono)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          display: "block",
          maxWidth: 200,
        }}
      >
        {r.excerpt}
      </span>
    ),
  },
  {
    key: "created_at",
    header: "시각",
    width: "160px",
    render: (r) => (
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-tertiary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {new Date(r.created_at).toLocaleString("ko-KR")}
      </span>
    ),
  },
];

interface InsightCardProps {
  title: string;
  items: { label: string; count: number; color?: string }[];
  loading?: boolean;
}

function InsightCard({ title, items, loading = false }: InsightCardProps) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const skeletonKeys = ["insight-a", "insight-b", "insight-c", "insight-d"];

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
        skeletonKeys.map((key) => (
          <div
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <div
              className="skeleton"
              style={{
                width: 10,
                height: 10,
                borderRadius: "var(--radius-full)",
                flexShrink: 0,
              }}
            />
            <div className="skeleton" style={{ width: "42%", height: 12 }} />
            <div
              className="skeleton"
              style={{
                width: "34%",
                height: 6,
                borderRadius: "var(--radius-full)",
                marginLeft: "auto",
              }}
            />
            <div className="skeleton" style={{ width: 28, height: 12 }} />
          </div>
        ))
      ) : items.length === 0 ? (
        <p
          style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}
        >
          데이터가 없습니다.
        </p>
      ) : (
        items.map((item) => {
          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
          const color = item.color ?? "var(--color-injection)";

          return (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "var(--radius-full)",
                  background: color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-primary)",
                  flex: 1,
                }}
              >
                {item.label}
              </span>
              <div
                style={{
                  width: 96,
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
                    borderRadius: "var(--radius-full)",
                    background: color,
                  }}
                />
              </div>
              <span
                style={{
                  width: 28,
                  textAlign: "right",
                  fontSize: "var(--text-xs)",
                  color: "var(--text-secondary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {item.count}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function PromptInjectionsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedRow, setSelectedRow] =
    useState<PromptInjectionEventsTable | null>(null);
  const [page, setPage] = useState(1);

  const { result, loading } = usePromptInjections({
    page,
    limit: 50,
    from: from || undefined,
    to: to || undefined,
  });
  const { data: chartData, loading: chartLoading } = useHourlyMetrics({
    from: from || undefined,
    to: to || undefined,
  });

  const stats = result?.stats;
  const pageCount = result ? Math.ceil(result.total / result.limit) : 1;

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "var(--space-4)",
  };

  const paginationStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
  };

  const btnStyle = (disabled: boolean): CSSProperties => ({
    padding: "var(--space-2) var(--space-4)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: "var(--bg-raised)",
    color: disabled ? "var(--text-tertiary)" : "var(--text-primary)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "var(--text-sm)",
  });
  const insightGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "var(--space-4)",
  };

  const scoreItems = (stats?.score_distribution ?? []).map((item) => ({
    label: item.label,
    count: item.count,
    color:
      item.bucket === "high"
        ? "var(--color-failed)"
        : item.bucket === "medium"
          ? "var(--color-warning)"
          : "var(--color-queued)",
  }));
  const patternItems = (stats?.top_patterns ?? []).map((pattern) => ({
    label: pattern.reason,
    count: pattern.count,
    color: "var(--color-injection)",
  }));

  return (
    <>
      <SectionHeader
        title="프롬프트 인젝션"
        description="인젝션 시도 패턴을 관측하고 기록합니다. 차단보다 분석이 목적입니다."
      />

      <div style={gridStyle}>
        <KpiCard
          label="총 시도 수"
          value={(stats?.total_count ?? 0).toLocaleString()}
          accent="injection"
          loading={loading}
        />
        <KpiCard
          label="고위험 (≥0.8)"
          value={(stats?.high_risk ?? 0).toLocaleString()}
          accent="failed"
          loading={loading}
        />
        <KpiCard
          label="중위험 (0.5~0.8)"
          value={(stats?.mid_risk ?? 0).toLocaleString()}
          accent="warning"
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
        <h2
          style={{
            fontSize: "var(--text-base)",
            fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
            color: "var(--text-primary)",
          }}
        >
          시간대별 인젝션 시도 추이
        </h2>
        <TimeseriesChart
          data={chartData}
          series={[
            {
              key: "prompt_injection",
              label: "인젝션 시도 수",
              color: "var(--color-injection)",
            },
          ]}
          height={180}
          loading={chartLoading}
          emptyText="시간대별 집계 데이터가 없습니다."
        />
      </div>

      <FilterBar>
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={(v) => {
            setFrom(v);
            setPage(1);
          }}
          onToChange={(v) => {
            setTo(v);
            setPage(1);
          }}
        />
      </FilterBar>

      <div style={insightGridStyle}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <h2
            style={{
              fontSize: "var(--text-base)",
              fontWeight:
                "var(--weight-semibold)" as CSSProperties["fontWeight"],
              color: "var(--text-primary)",
            }}
          >
            의심 점수 분포 히스토그램
          </h2>
          <HistogramChart
            data={scoreItems}
            height={220}
            loading={loading}
            emptyText="점수 분포 데이터가 없습니다."
          />
        </div>
        <InsightCard
          title="자주 나온 인젝션 패턴"
          items={patternItems}
          loading={loading}
        />
      </div>

      <DataTable
        columns={COLUMNS}
        data={result?.data ?? []}
        getRowKey={(r) => r.prompt_injection_event_id}
        onRowClick={setSelectedRow}
        loading={loading}
        emptyText="탐지된 인젝션 시도가 없습니다."
      />

      {result && result.total > result.limit && (
        <div style={paginationStyle}>
          <span>
            총 {result.total.toLocaleString()}건 · {page} / {pageCount} 페이지
          </span>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              type="button"
              style={btnStyle(page <= 1)}
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              이전
            </button>
            <button
              type="button"
              style={btnStyle(page >= pageCount)}
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </button>
          </div>
        </div>
      )}

      <DetailDrawer
        open={selectedRow !== null}
        onClose={() => setSelectedRow(null)}
        title="인젝션 시도 상세"
      >
        {selectedRow && (
          <>
            <DrawerSection title="식별자">
              <DrawerField
                label="이벤트 ID"
                value={selectedRow.prompt_injection_event_id}
                mono
              />
              <DrawerField
                label="요청 ID"
                value={selectedRow.request_id}
                mono
              />
              <DrawerField
                label="탐지 시각"
                value={new Date(selectedRow.created_at).toLocaleString("ko-KR")}
              />
            </DrawerSection>
            <DrawerSection title="탐지 결과">
              <DrawerField
                label="의심 점수"
                value={<ScoreBar score={selectedRow.score} />}
              />
              <DrawerField label="탐지 사유" value={selectedRow.reason} />
            </DrawerSection>
            <DrawerSection title="원문 발췌">
              <DrawerField
                label="excerpt"
                value={selectedRow.excerpt}
                mono
                multiline
              />
            </DrawerSection>
          </>
        )}
      </DetailDrawer>
    </>
  );
}
