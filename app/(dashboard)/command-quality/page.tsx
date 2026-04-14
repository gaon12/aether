"use client";

import type { CSSProperties } from "react";
import type { Column } from "@/components/ui/DataTable";
import { DataTable } from "@/components/ui/DataTable";
import { KpiCard } from "@/components/ui/KpiCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useCommandQuality } from "@/features/dashboard/useCommandQuality";

interface ReasonRow {
  reason: string;
  count: number;
}
interface PatternRow {
  pattern: string;
  count: number;
}
interface TypoRow {
  token: string;
  count: number;
}

const REASON_COLUMNS: Column<ReasonRow>[] = [
  { key: "reason", header: "실패 사유" },
  {
    key: "count",
    header: "횟수",
    align: "right",
    width: "80px",
    render: (r) => (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {r.count.toLocaleString()}
      </span>
    ),
  },
];

const PATTERN_COLUMNS: Column<PatternRow>[] = [
  {
    key: "pattern",
    header: "명령 원문",
    render: (r) => (
      <code
        style={{
          fontSize: "var(--text-xs)",
          fontFamily: "var(--font-mono)",
          background: "var(--bg-raised)",
          padding: "2px 6px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
        }}
      >
        {r.pattern}
      </code>
    ),
  },
  {
    key: "count",
    header: "횟수",
    align: "right",
    width: "80px",
    render: (r) => (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {r.count.toLocaleString()}
      </span>
    ),
  },
];

const TYPO_COLUMNS: Column<TypoRow>[] = [
  {
    key: "token",
    header: "오타 토큰",
    render: (r) => (
      <code
        style={{
          fontSize: "var(--text-xs)",
          fontFamily: "var(--font-mono)",
          background: "var(--bg-raised)",
          padding: "2px 6px",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
        }}
      >
        {r.token}
      </code>
    ),
  },
  {
    key: "count",
    header: "횟수",
    align: "right",
    width: "80px",
    render: (r) => (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {r.count.toLocaleString()}
      </span>
    ),
  },
];

export default function CommandQualityPage() {
  const { data, loading } = useCommandQuality();

  const invalidRate = data
    ? `${(data.invalid_command_rate * 100).toFixed(1)}%`
    : "—";

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "var(--space-4)",
  };

  const sectionGridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "var(--space-4)",
  };

  const subHeadStyle: CSSProperties = {
    fontSize: "var(--text-base)",
    fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
    color: "var(--text-primary)",
  };

  return (
    <>
      <SectionHeader
        title="명령 품질"
        description="잘못된 명령 패턴을 분석해 봇 사용 가이드 개선에 활용합니다."
      />

      <div style={gridStyle}>
        <KpiCard
          label="잘못된 명령어 비율"
          value={invalidRate}
          accent="warning"
          loading={loading}
        />
        <KpiCard
          label="파싱 실패 수"
          value={(data?.invalid_command_count ?? 0).toLocaleString()}
          accent="failed"
          loading={loading}
        />
        <KpiCard
          label="중복 요청 수"
          value={(data?.duplicate_request_count ?? 0).toLocaleString()}
          loading={loading}
        />
      </div>

      <div style={sectionGridStyle}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <h2 style={subHeadStyle}>파싱 실패 사유 분포</h2>
          <DataTable
            columns={REASON_COLUMNS}
            data={data?.parse_failure_reasons ?? []}
            getRowKey={(r) => r.reason}
            loading={loading}
            emptyText="파싱 실패 기록이 없습니다."
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <h2 style={subHeadStyle}>가장 많이 등장한 오타</h2>
          <DataTable
            columns={TYPO_COLUMNS}
            data={data?.top_typos ?? []}
            getRowKey={(r) => r.token}
            loading={loading}
            emptyText="집계된 오타가 없습니다."
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <h2 style={subHeadStyle}>자주 틀리는 명령 패턴</h2>
          <DataTable
            columns={PATTERN_COLUMNS}
            data={data?.top_typo_patterns ?? []}
            getRowKey={(r) => r.pattern}
            loading={loading}
            emptyText="데이터가 없습니다."
          />
        </div>
      </div>
    </>
  );
}
