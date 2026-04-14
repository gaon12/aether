"use client";

import type { CSSProperties } from "react";
import type { Column } from "@/components/ui/DataTable";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/EmptyState";
import { KpiCard } from "@/components/ui/KpiCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { TimeseriesSeries } from "@/components/ui/TimeseriesChart";
import { TimeseriesChart } from "@/components/ui/TimeseriesChart";
import type {
  ModelBreakdown,
  PromptKindBreakdown,
  PromptProfileBreakdown,
} from "@/features/dashboard/useLlmStats";
import { useLlmStats } from "@/features/dashboard/useLlmStats";

const MODEL_COLUMNS: Column<ModelBreakdown>[] = [
  {
    key: "model_name",
    header: "모델",
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
        {r.model_name}
      </code>
    ),
  },
  {
    key: "runs",
    header: "실행 수",
    align: "right",
    width: "80px",
    render: (r) => (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {r.runs.toLocaleString()}
      </span>
    ),
  },
  {
    key: "avg_ms",
    header: "평균 소요",
    align: "right",
    width: "100px",
    render: (r) => (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {r.avg_ms.toLocaleString()} ms
      </span>
    ),
  },
  {
    key: "avg_tps",
    header: "평균 토큰/초",
    align: "right",
    width: "110px",
    render: (r) => (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {Number(r.avg_tps).toFixed(1)}
      </span>
    ),
  },
];

const PROMPT_KIND_COLUMNS: Column<PromptKindBreakdown>[] = [
  {
    key: "prompt_kind",
    header: "프롬프트 타입",
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
        {r.prompt_kind}
      </code>
    ),
  },
  {
    key: "runs",
    header: "실행 수",
    align: "right",
    width: "80px",
    render: (r) => (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {r.runs.toLocaleString()}
      </span>
    ),
  },
  {
    key: "avg_ms",
    header: "평균 소요",
    align: "right",
    width: "100px",
    render: (r) => (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {r.avg_ms.toLocaleString()} ms
      </span>
    ),
  },
  {
    key: "avg_input_tokens",
    header: "평균 입력 토큰",
    align: "right",
    width: "120px",
    render: (r) => (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {r.avg_input_tokens.toLocaleString()}
      </span>
    ),
  },
];

const PROMPT_PROFILE_COLUMNS: Column<PromptProfileBreakdown>[] = [
  {
    key: "prompt_profile_name",
    header: "공통 프롬프트 이름",
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
        {r.prompt_profile_name}
      </code>
    ),
  },
  {
    key: "runs",
    header: "실행 수",
    align: "right",
    width: "80px",
    render: (r) => (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {r.runs.toLocaleString()}
      </span>
    ),
  },
  {
    key: "avg_ms",
    header: "평균 소요",
    align: "right",
    width: "100px",
    render: (r) => (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {r.avg_ms.toLocaleString()} ms
      </span>
    ),
  },
  {
    key: "avg_system_prompt_tokens",
    header: "평균 시스템 토큰",
    align: "right",
    width: "120px",
    render: (r) => (
      <span style={{ fontVariantNumeric: "tabular-nums" }}>
        {r.avg_system_prompt_tokens.toLocaleString()}
      </span>
    ),
  },
];

export default function LlmStatsPage() {
  const { data, loading, error } = useLlmStats(60_000);

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "var(--space-4)",
  };

  const twoColStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "var(--space-4)",
  };

  const subHeadStyle: CSSProperties = {
    fontSize: "var(--text-base)",
    fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
    color: "var(--text-primary)",
  };

  const chartSeries: TimeseriesSeries[] = [
    { key: "avg_ms", label: "평균 소요(ms)", color: "var(--brand)" },
  ];

  if (error && !data) {
    return (
      <>
        <SectionHeader
          title="LLM 통계"
          description="로컬 모델 실행 성능 지표를 분석합니다."
        />
        <ErrorState message={error} />
      </>
    );
  }

  const fmtMs = (v: number | undefined) =>
    v != null ? `${v.toLocaleString()} ms` : "—";

  return (
    <>
      <SectionHeader
        title="LLM 통계"
        description="로컬 모델 실행 횟수, 응답 지연, 토큰 소모량을 분석합니다."
      />

      <div style={gridStyle}>
        <KpiCard
          label="총 실행 수"
          value={(data?.total_runs ?? 0).toLocaleString()}
          loading={loading}
        />
        <KpiCard
          label="평균 소요 시간"
          value={fmtMs(data?.avg_duration_ms)}
          loading={loading}
        />
        <KpiCard
          label="p95 소요 시간"
          value={fmtMs(data?.p95_duration_ms)}
          accent="warning"
          loading={loading}
        />
        <KpiCard
          label="평균 TTFT"
          value={fmtMs(data?.avg_ttft_ms)}
          loading={loading}
        />
        <KpiCard
          label="평균 출력 토큰/초"
          value={data?.avg_tokens_per_second.toFixed(1) ?? "—"}
          loading={loading}
        />
        <KpiCard
          label="평균 입력 토큰"
          value={(data?.avg_input_tokens ?? 0).toLocaleString()}
          loading={loading}
        />
        <KpiCard
          label="평균 출력 토큰"
          value={(data?.avg_output_tokens ?? 0).toLocaleString()}
          loading={loading}
        />
        <KpiCard
          label="총 입력 토큰"
          value={(data?.total_input_tokens ?? 0).toLocaleString()}
          loading={loading}
        />
        <KpiCard
          label="총 출력 토큰"
          value={(data?.total_output_tokens ?? 0).toLocaleString()}
          loading={loading}
        />
        <KpiCard
          label="총 추론 토큰"
          value={(data?.total_reasoning_tokens ?? 0).toLocaleString()}
          accent={
            (data?.total_reasoning_tokens ?? 0) > 0 ? "warning" : undefined
          }
          loading={loading}
        />
        <KpiCard
          label="평균 추론 토큰"
          value={(data?.avg_reasoning_tokens ?? 0).toLocaleString()}
          loading={loading}
        />
        <KpiCard
          label="평균 시스템 프롬프트 토큰"
          value={(data?.avg_system_prompt_tokens ?? 0).toLocaleString()}
          loading={loading}
        />
        <KpiCard
          label="평균 공통 프롬프트 토큰"
          value={(data?.avg_base_prompt_tokens ?? 0).toLocaleString()}
          loading={loading}
        />
        <KpiCard
          label="평균 작업 프롬프트 토큰"
          value={(data?.avg_task_prompt_tokens ?? 0).toLocaleString()}
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
        <h2 style={subHeadStyle}>시간대별 평균 소요 시간 (최근 24시간)</h2>
        <TimeseriesChart
          data={(data?.hourly_trend ?? []).map((d) => ({
            time: d.time,
            avg_ms: d.avg_ms,
          }))}
          series={chartSeries}
          height={220}
          loading={loading}
          emptyText="LLM 실행 기록이 없습니다."
        />
      </div>

      <div style={twoColStyle}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <h2 style={subHeadStyle}>모델별 성능 비교</h2>
          <DataTable
            columns={MODEL_COLUMNS}
            data={data?.by_model ?? []}
            getRowKey={(r) => r.model_name}
            loading={loading}
            emptyText="모델 실행 기록이 없습니다."
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <h2 style={subHeadStyle}>프롬프트 타입별 실행</h2>
          <DataTable
            columns={PROMPT_KIND_COLUMNS}
            data={data?.by_prompt_kind ?? []}
            getRowKey={(r) => r.prompt_kind}
            loading={loading}
            emptyText="프롬프트 타입별 기록이 없습니다."
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <h2 style={subHeadStyle}>공통 프롬프트 프로필</h2>
          <DataTable
            columns={PROMPT_PROFILE_COLUMNS}
            data={data?.by_prompt_profile ?? []}
            getRowKey={(r) => r.prompt_profile_name}
            loading={loading}
            emptyText="공통 프롬프트 프로필 기록이 없습니다."
          />
        </div>
      </div>
    </>
  );
}
