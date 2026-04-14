"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import type { FeedEntry } from "@/features/public/useFeed";
import { useFeed } from "@/features/public/useFeed";

const SKELETON_CARD_KEYS = [
  "skeleton-1",
  "skeleton-2",
  "skeleton-3",
  "skeleton-4",
  "skeleton-5",
  "skeleton-6",
];

/* ─── helpers ───────────────────────────────────────────────────────────── */

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return "";
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60_000));
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}

function commandLabel(type: string | null): string {
  switch (type) {
    case "translate":
      return "번역";
    case "summary":
      return "요약";
    case "translate_summary":
      return "번역 + 요약";
    default:
      return "처리";
  }
}

function commandColor(type: string | null): {
  bg: string;
  color: string;
  border: string;
} {
  switch (type) {
    case "translate":
      return {
        bg: "var(--brand-subtle)",
        color: "var(--brand)",
        border: "color-mix(in srgb, var(--brand) 20%, transparent)",
      };
    case "summary":
      return {
        bg: "var(--color-success-bg)",
        color: "var(--color-success)",
        border: "var(--color-success-border)",
      };
    case "translate_summary":
      return {
        bg: "var(--color-injection-bg)",
        color: "var(--color-injection)",
        border: "var(--color-injection-border)",
      };
    default:
      return {
        bg: "var(--bg-raised)",
        color: "var(--text-tertiary)",
        border: "var(--border)",
      };
  }
}

function langDisplay(
  type: string | null,
  sourceLang: string | null,
  targetLang: string | null,
): string {
  if (type === "translate" || type === "translate_summary") {
    const parts: string[] = [];
    if (sourceLang) parts.push(sourceLang.toUpperCase());
    if (targetLang) parts.push(targetLang.toUpperCase());
    if (parts.length > 0) return parts.join(" → ");
  }
  if (type === "summary" && targetLang) {
    return targetLang.toUpperCase();
  }
  return "";
}

/* ─── skeleton ───────────────────────────────────────────────────────────── */

function CardSkeleton() {
  const cardStyle: CSSProperties = {
    borderRadius: "var(--radius-xl)",
    border: "1px solid var(--border)",
    background: "var(--bg-panel)",
    padding: "var(--space-5)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-4)",
    boxShadow: "var(--shadow-sm)",
  };

  const skeletonStyle = (
    width: string,
    height: number,
    radius = "var(--radius)",
  ): CSSProperties => ({
    width,
    height,
    borderRadius: radius,
    background:
      "linear-gradient(90deg, var(--bg-skeleton) 0%, var(--bg-skeleton-glow) 50%, var(--bg-skeleton) 100%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  });

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={skeletonStyle("60px", 20, "var(--radius-full)")} />
        <div style={skeletonStyle("50px", 14)} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        <div style={skeletonStyle("100%", 13)} />
        <div style={skeletonStyle("80%", 13)} />
        <div style={skeletonStyle("60%", 13)} />
      </div>
      <div
        style={{
          height: 1,
          background: "var(--border)",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        <div style={skeletonStyle("100%", 13)} />
        <div style={skeletonStyle("75%", 13)} />
      </div>
    </div>
  );
}

/* ─── reply card ─────────────────────────────────────────────────────────── */

function ReplyCard({ entry }: { entry: FeedEntry }) {
  const colors = commandColor(entry.command_type);
  const lang = langDisplay(
    entry.command_type,
    entry.source_language,
    entry.target_language,
  );

  const cardStyle: CSSProperties = {
    borderRadius: "var(--radius-xl)",
    border: "1px solid var(--border)",
    background: "var(--bg-panel)",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    boxShadow: "var(--shadow-sm)",
    overflow: "hidden",
    transition:
      "box-shadow var(--transition-fast), border-color var(--transition-fast)",
  };

  const headerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--space-4) var(--space-5)",
    borderBottom: "1px solid var(--border)",
    gap: "var(--space-3)",
  };

  const badgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-1)",
    padding: "3px var(--space-3)",
    borderRadius: "var(--radius-full)",
    background: colors.bg,
    color: colors.color,
    border: `1px solid ${colors.border}`,
    fontSize: "var(--text-xs)",
    fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
    whiteSpace: "nowrap",
  };

  const metaStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    flexShrink: 0,
  };

  const bodyStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    flex: 1,
  };

  const textBlockStyle = (isMuted: boolean): CSSProperties => ({
    padding: "var(--space-4) var(--space-5)",
    fontSize: "var(--text-sm)",
    lineHeight: 1.65,
    color: isMuted ? "var(--text-secondary)" : "var(--text-primary)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  });

  const dividerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    padding: "0 var(--space-5)",
  };

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <span style={badgeStyle}>{commandLabel(entry.command_type)}</span>
        <div style={metaStyle}>
          {lang && (
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {lang}
            </span>
          )}
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-tertiary)",
            }}
          >
            {formatRelativeTime(entry.published_at)}
          </span>
        </div>
      </div>

      <div style={bodyStyle}>
        {entry.source_text && (
          <p style={textBlockStyle(true)}>{entry.source_text}</p>
        )}

        <div style={dividerStyle}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <svg
            width={14}
            height={14}
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden
            style={{ color: "var(--text-tertiary)", flexShrink: 0 }}
          >
            <title>구분선</title>
            <path
              d="M7 2v10M3.5 8.5 7 12l3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <p style={textBlockStyle(false)}>{entry.reply_text}</p>
      </div>
    </div>
  );
}

/* ─── empty state ────────────────────────────────────────────────────────── */

function EmptyFeed() {
  return (
    <div
      style={{
        gridColumn: "1 / -1",
        padding: "var(--space-16) var(--space-8)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-3)",
        textAlign: "center",
      }}
    >
      <svg
        width={40}
        height={40}
        viewBox="0 0 40 40"
        fill="none"
        style={{ color: "var(--border)", opacity: 0.8 }}
      >
        <title>빈 상태</title>
        <rect
          x="4"
          y="4"
          width="32"
          height="32"
          rx="8"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M13 20h14M13 14h8M13 26h5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <p
        style={{
          fontSize: "var(--text-base)",
          fontWeight: "var(--weight-medium)" as CSSProperties["fontWeight"],
          color: "var(--text-secondary)",
        }}
      >
        아직 처리된 답변이 없습니다
      </p>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-tertiary)",
          maxWidth: 320,
        }}
      >
        봇이 요청을 처리하면 여기에 결과가 표시됩니다.
      </p>
    </div>
  );
}

/* ─── view ───────────────────────────────────────────────────────────────── */

interface FeedViewProps {
  showHero?: boolean;
}

export function FeedView({ showHero = true }: FeedViewProps) {
  const [page, setPage] = useState(1);
  const { data, loading } = useFeed(page, 30_000);

  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const entries = data?.data ?? [];

  const heroStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
  };

  const statsBarStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-6)",
    flexWrap: "wrap",
  };

  const statItemStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-1)",
  };

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
    gap: "var(--space-4)",
    alignItems: "start",
  };

  const paginationStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-2)",
    paddingTop: "var(--space-4)",
  };

  const pageButtonStyle = (
    active: boolean,
    disabled: boolean,
  ): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
    height: 36,
    padding: "0 var(--space-3)",
    borderRadius: "var(--radius)",
    border: `1px solid ${active ? "var(--brand)" : "var(--border)"}`,
    background: active ? "var(--brand)" : "var(--bg-panel)",
    color: active
      ? "white"
      : disabled
        ? "var(--text-tertiary)"
        : "var(--text-secondary)",
    fontSize: "var(--text-sm)",
    fontWeight: active
      ? ("var(--weight-semibold)" as CSSProperties["fontWeight"])
      : ("var(--weight-normal)" as CSSProperties["fontWeight"]),
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition:
      "background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast)",
    textDecoration: "none",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-8)",
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {showHero && (
        <div style={heroStyle}>
          <h1
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              fontWeight: "var(--weight-bold)" as CSSProperties["fontWeight"],
              color: "var(--text-primary)",
              letterSpacing: "-0.04em",
              lineHeight: 1.1,
            }}
          >
            봇 답변 피드
          </h1>
          <p
            style={{
              fontSize: "var(--text-base)",
              color: "var(--text-secondary)",
              maxWidth: 480,
            }}
          >
            Threads에서 처리된 번역 및 요약 결과를 실시간으로 확인합니다.
          </p>
        </div>
      )}

      <div style={statsBarStyle}>
        <div style={statItemStyle}>
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-tertiary)",
            }}
          >
            총 처리 건수
          </span>
          <span
            style={{
              fontSize: "var(--text-xl)",
              fontWeight:
                "var(--weight-semibold)" as CSSProperties["fontWeight"],
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.03em",
            }}
          >
            {loading && total === 0 ? "—" : total.toLocaleString()}
          </span>
        </div>
        <div style={{ width: 1, height: 32, background: "var(--border)" }} />
        <div style={statItemStyle}>
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-tertiary)",
            }}
          >
            페이지
          </span>
          <span
            style={{
              fontSize: "var(--text-xl)",
              fontWeight:
                "var(--weight-semibold)" as CSSProperties["fontWeight"],
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.03em",
            }}
          >
            {page} / {totalPages}
          </span>
        </div>
        <div style={{ width: 1, height: 32, background: "var(--border)" }} />
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-tertiary)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "var(--radius-full)",
              background: "var(--color-success)",
              flexShrink: 0,
              animation: "pulse 2s infinite",
            }}
          />
          30초마다 자동 갱신
        </div>
      </div>

      <div style={gridStyle}>
        {loading && entries.length === 0 ? (
          SKELETON_CARD_KEYS.map((key) => <CardSkeleton key={key} />)
        ) : entries.length === 0 ? (
          <EmptyFeed />
        ) : (
          entries.map((entry) => (
            <ReplyCard key={entry.reply_id} entry={entry} />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div style={paginationStyle}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={pageButtonStyle(false, page === 1)}
          >
            ←
          </button>

          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }

            return (
              <button
                type="button"
                key={pageNum}
                onClick={() => setPage(pageNum)}
                style={pageButtonStyle(pageNum === page, false)}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={pageButtonStyle(false, page === totalPages)}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
