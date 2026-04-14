"use client";

import type { CSSProperties } from "react";
import { useDeferredValue, useEffect, useState } from "react";
import type { Column } from "@/components/ui/DataTable";
import { DataTable } from "@/components/ui/DataTable";
import {
  DetailDrawer,
  DrawerField,
  DrawerSection,
  DrawerSectionSkeleton,
} from "@/components/ui/DetailDrawer";
import {
  DateRangeFilter,
  FilterBar,
  SearchInput,
  SelectFilter,
} from "@/components/ui/FilterBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { StatusVariant } from "@/components/ui/StatusBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { RequestDetailInjection } from "@/features/dashboard/useLlmStats";
import { useRequestDetail } from "@/features/dashboard/useLlmStats";
import type { ReplyRow } from "@/features/dashboard/useReplies";
import { useReplies } from "@/features/dashboard/useReplies";
import { DRAWER, ERRORS } from "@/lib/i18n";

const STATUS_OPTIONS = [
  { value: "succeeded", label: "성공" },
  { value: "failed", label: "실패" },
  { value: "pending", label: "대기" },
];

const COMMAND_OPTIONS = [
  { value: "translate", label: "번역" },
  { value: "summary", label: "요약" },
  { value: "translate_summary", label: "번역+요약" },
];

function publishStatusToVariant(s: string): StatusVariant {
  if (s === "succeeded") return "success";
  if (s === "failed") return "failed";
  return "queued";
}

function formatParsedCommand(
  commandType: string | null | undefined,
  targetLanguage: string | null | undefined,
  summaryLength: number | null | undefined,
) {
  if (!commandType) return "파싱 실패 또는 미지원";

  const parts = [commandType];
  if (targetLanguage) parts.push(`lang=${targetLanguage}`);
  if (summaryLength != null) parts.push(`length=${summaryLength}`);
  return parts.join(" · ");
}

const COLUMNS: Column<ReplyRow>[] = [
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
    key: "command_raw",
    header: "명령",
    width: "180px",
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
        {r.command_raw.slice(0, 40)}
      </code>
    ),
  },
  {
    key: "model_name",
    header: "모델",
    width: "160px",
    render: (r) =>
      r.model_name ? (
        <code
          style={{
            fontSize: "var(--text-xs)",
            fontFamily: "var(--font-mono)",
            background: "var(--bg-raised)",
            padding: "2px 6px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            color: "var(--brand)",
          }}
        >
          {r.model_name}
        </code>
      ) : (
        <span
          style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}
        >
          —
        </span>
      ),
  },
  {
    key: "publish_status",
    header: "상태",
    width: "120px",
    render: (r) => (
      <StatusBadge
        status={publishStatusToVariant(r.publish_status)}
        size="sm"
      />
    ),
  },
  {
    key: "created_at",
    header: "생성 시각",
    width: "160px",
    render: (r) => (
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-secondary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {new Date(r.created_at).toLocaleString("ko-KR")}
      </span>
    ),
  },
];

async function retryRequest(requestId: string) {
  const res = await fetch(`/api/dashboard/requests/${requestId}/retry`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? ERRORS.retry_failed);
  }
}

export default function ResponsesPage() {
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cmdFilter, setCmdFilter] = useState("");
  const [selectedRow, setSelectedRow] = useState<ReplyRow | null>(null);
  const [page, setPage] = useState(1);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const deferredSearch = useDeferredValue(search.trim());

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/admin/session", { cache: "no-store" })
      .then((res) =>
        res.ok
          ? (res.json() as Promise<{ authenticated?: boolean }>)
          : { authenticated: false },
      )
      .then((payload) => {
        if (!cancelled) {
          setCanRetry(Boolean(payload.authenticated));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCanRetry(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { data: detail, loading: detailLoading } = useRequestDetail(
    selectedRow?.request_id ?? null,
  );

  const { result, loading } = useReplies({
    page,
    limit: 50,
    publish_status: statusFilter || undefined,
    command_type: cmdFilter || undefined,
    search: deferredSearch || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const pageCount = result ? Math.ceil(result.total / result.limit) : 1;

  async function handleRetry() {
    if (!selectedRow) return;
    setRetrying(true);
    setRetryError(null);
    try {
      await retryRequest(selectedRow.request_id);
      setSelectedRow(null);
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : ERRORS.retry_failed);
    } finally {
      setRetrying(false);
    }
  }

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

  return (
    <>
      <SectionHeader
        title="응답 탐색"
        description="처리된 요청과 최종 응답을 확인하고 비교합니다."
      />

      <FilterBar>
        <DateRangeFilter
          from={from}
          to={to}
          onFromChange={(value) => {
            setFrom(value);
            setPage(1);
          }}
          onToChange={(value) => {
            setTo(value);
            setPage(1);
          }}
        />
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="요청 ID 또는 원문 검색…"
        />
        <SelectFilter
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
          placeholder="모든 상태"
        />
        <SelectFilter
          value={cmdFilter}
          onChange={(value) => {
            setCmdFilter(value);
            setPage(1);
          }}
          options={COMMAND_OPTIONS}
          placeholder="모든 명령"
        />
      </FilterBar>

      <DataTable
        columns={COLUMNS}
        data={result?.data ?? []}
        getRowKey={(r) => r.reply_id}
        onRowClick={setSelectedRow}
        loading={loading}
        emptyText="조건에 맞는 응답이 없습니다."
      />

      {/* Pagination */}
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
        title="응답 상세"
        width="560px"
      >
        {selectedRow && (
          <>
            <DrawerSection title={DRAWER.identifiers}>
              <DrawerField
                label={DRAWER.request_id}
                value={selectedRow.request_id}
                mono
              />
              <DrawerField
                label={DRAWER.reply_id}
                value={selectedRow.reply_id}
                mono
              />
              <DrawerField
                label={DRAWER.created_at}
                value={new Date(selectedRow.created_at).toLocaleString("ko-KR")}
              />
            </DrawerSection>

            <DrawerSection title={DRAWER.result}>
              <DrawerField
                label={DRAWER.status}
                value={
                  <StatusBadge
                    status={publishStatusToVariant(selectedRow.publish_status)}
                  />
                }
              />
              <DrawerField
                label={DRAWER.error_code}
                value={selectedRow.publish_error_code ?? DRAWER.none}
                mono
              />
              <DrawerField
                label={DRAWER.published_at}
                value={
                  selectedRow.published_at
                    ? new Date(selectedRow.published_at).toLocaleString("ko-KR")
                    : "—"
                }
              />

              {selectedRow.publish_status === "failed" && canRetry && (
                <div
                  style={{
                    marginTop: "var(--space-3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                  }}
                >
                  <button
                    type="button"
                    style={{
                      padding: "var(--space-2) var(--space-4)",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--color-warning)",
                      background: "transparent",
                      color: "var(--color-warning)",
                      fontSize: "var(--text-sm)",
                      cursor: retrying ? "not-allowed" : "pointer",
                      opacity: retrying ? 0.6 : 1,
                      alignSelf: "flex-start",
                    }}
                    disabled={retrying}
                    onClick={handleRetry}
                  >
                    {retrying ? "재처리 중…" : "재처리"}
                  </button>
                  {retryError && (
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--color-failed)",
                      }}
                    >
                      {retryError}
                    </span>
                  )}
                </div>
              )}
            </DrawerSection>

            {detailLoading && (
              <DrawerSectionSkeleton title="파싱 결과" rows={5} />
            )}

            {detail?.request && (
              <DrawerSection title="파싱 결과">
                <DrawerField
                  label="명령 타입"
                  value={detail.request.command_type ?? "파싱 실패 또는 미지원"}
                  mono
                />
                <DrawerField
                  label="해석 결과"
                  value={formatParsedCommand(
                    detail.request.command_type,
                    detail.request.target_language,
                    detail.request.summary_length,
                  )}
                  mono
                />
                <DrawerField
                  label="원문 언어"
                  value={detail.request.source_language ?? "미탐지"}
                />
                <DrawerField
                  label="요청 상태"
                  value={detail.request.request_status}
                  mono
                />
                <DrawerField
                  label="무시 사유"
                  value={detail.request.ignore_reason ?? "—"}
                  mono
                />
              </DrawerSection>
            )}

            <DrawerSection title={DRAWER.source}>
              <DrawerField
                label={DRAWER.command_raw}
                value={selectedRow.command_raw}
                mono
              />
              <DrawerField
                label={DRAWER.source_text}
                value={selectedRow.source_text ?? "—"}
                multiline
              />
            </DrawerSection>

            <DrawerSection title={DRAWER.response}>
              <DrawerField
                label={DRAWER.reply_text}
                value={selectedRow.reply_text}
                multiline
              />
            </DrawerSection>

            {detailLoading && (
              <DrawerSectionSkeleton title="LLM 실행 통계" rows={10} />
            )}

            {detail?.llm_run && (
              <DrawerSection title="LLM 실행 통계">
                <DrawerField
                  label="모델"
                  value={String(detail.llm_run.model_name ?? "—")}
                  mono
                />
                <DrawerField
                  label="프롬프트 타입"
                  value={detail.llm_run.prompt_kind ?? "legacy"}
                  mono
                />
                <DrawerField
                  label="공통 프롬프트 이름"
                  value={detail.llm_run.prompt_profile_name ?? "legacy"}
                  mono
                />
                <DrawerField
                  label="소요 시간"
                  value={
                    detail.llm_run.duration_ms != null
                      ? `${String(detail.llm_run.duration_ms)} ms`
                      : "—"
                  }
                />
                <DrawerField
                  label="첫 토큰 지연"
                  value={
                    detail.llm_run.first_token_latency_ms != null
                      ? `${String(detail.llm_run.first_token_latency_ms)} ms`
                      : "—"
                  }
                />
                <DrawerField
                  label="입력 토큰"
                  value={
                    detail.llm_run.input_token_count != null
                      ? String(detail.llm_run.input_token_count)
                      : "—"
                  }
                />
                <DrawerField
                  label="출력 토큰"
                  value={
                    detail.llm_run.output_token_count != null
                      ? String(detail.llm_run.output_token_count)
                      : "—"
                  }
                />
                <DrawerField
                  label="추론 토큰"
                  value={
                    detail.llm_run.reasoning_token_count != null
                      ? String(detail.llm_run.reasoning_token_count)
                      : "—"
                  }
                />
                <DrawerField
                  label="토큰/초"
                  value={
                    detail.llm_run.output_tokens_per_second != null
                      ? Number(detail.llm_run.output_tokens_per_second).toFixed(
                          1,
                        )
                      : "—"
                  }
                />
                <DrawerField
                  label="시스템 프롬프트 토큰"
                  value={
                    detail.llm_run.system_prompt_token_count != null
                      ? String(detail.llm_run.system_prompt_token_count)
                      : "—"
                  }
                />
                <DrawerField
                  label="공통 프롬프트 토큰"
                  value={
                    detail.llm_run.base_prompt_token_count != null
                      ? String(detail.llm_run.base_prompt_token_count)
                      : "—"
                  }
                />
                <DrawerField
                  label="작업 프롬프트 토큰"
                  value={
                    detail.llm_run.task_prompt_token_count != null
                      ? String(detail.llm_run.task_prompt_token_count)
                      : "—"
                  }
                />
              </DrawerSection>
            )}

            {/* Prompt injection events */}
            {detail?.prompt_injections &&
              detail.prompt_injections.length > 0 && (
                <DrawerSection title="프롬프트 인젝션 탐지">
                  {detail.prompt_injections.map(
                    (inj: RequestDetailInjection) => (
                      <div
                        key={inj.prompt_injection_event_id}
                        style={{
                          padding: "var(--space-3) var(--space-4)",
                          borderRadius: "var(--radius-lg)",
                          border: "1px solid var(--color-failed-border)",
                          background: "var(--color-failed-bg)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "var(--space-2)",
                          marginBottom: "var(--space-2)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                          }}
                        >
                          <svg
                            width={13}
                            height={13}
                            viewBox="0 0 13 13"
                            fill="none"
                            aria-hidden
                          >
                            <title>인젝션 경고</title>
                            <path
                              d="M6.5 1.5L12 11.5H1L6.5 1.5z"
                              stroke="var(--color-failed)"
                              strokeWidth="1.2"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M6.5 5.5v2.5M6.5 10h.01"
                              stroke="var(--color-failed)"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                            />
                          </svg>
                          <span
                            style={{
                              fontSize: "var(--text-xs)",
                              fontWeight: "var(--weight-semibold)",
                              color: "var(--color-failed)",
                            }}
                          >
                            인젝션 탐지 — 점수 {inj.score.toFixed(2)}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "var(--text-xs)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {inj.reason}
                        </span>
                        {inj.excerpt && (
                          <code
                            style={{
                              fontSize: "var(--text-xs)",
                              fontFamily: "var(--font-mono)",
                              color: "var(--text-tertiary)",
                              wordBreak: "break-all",
                            }}
                          >
                            {inj.excerpt}
                          </code>
                        )}
                      </div>
                    ),
                  )}
                </DrawerSection>
              )}
          </>
        )}
      </DetailDrawer>
    </>
  );
}
