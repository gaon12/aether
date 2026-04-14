import type { CSSProperties } from "react";

export type StatusVariant =
  | "success"
  | "failed"
  | "ignored"
  | "queued"
  | "expired"
  | "token_warning"
  | "prompt_injection_suspected"
  | "running"
  | "received"
  | "parsing"
  | "ready"
  | "publishing";

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  size?: "sm" | "md";
  dot?: boolean;
}

const STATUS_CONFIG: Record<
  StatusVariant,
  { label: string; color: string; bg: string; border: string }
> = {
  success: {
    label: "성공",
    color: "var(--color-success)",
    bg: "var(--color-success-bg)",
    border: "var(--color-success-border)",
  },
  failed: {
    label: "실패",
    color: "var(--color-failed)",
    bg: "var(--color-failed-bg)",
    border: "var(--color-failed-border)",
  },
  ignored: {
    label: "무시",
    color: "var(--color-ignored)",
    bg: "var(--color-ignored-bg)",
    border: "var(--color-ignored-border)",
  },
  queued: {
    label: "대기",
    color: "var(--color-queued)",
    bg: "var(--color-queued-bg)",
    border: "var(--color-queued-border)",
  },
  expired: {
    label: "만료",
    color: "var(--color-failed)",
    bg: "var(--color-failed-bg)",
    border: "var(--color-failed-border)",
  },
  token_warning: {
    label: "토큰 경고",
    color: "var(--color-warning)",
    bg: "var(--color-warning-bg)",
    border: "var(--color-warning-border)",
  },
  prompt_injection_suspected: {
    label: "인젝션 의심",
    color: "var(--color-injection)",
    bg: "var(--color-injection-bg)",
    border: "var(--color-injection-border)",
  },
  running: {
    label: "처리 중",
    color: "var(--brand)",
    bg: "var(--brand-subtle)",
    border: "var(--border-focus)",
  },
  received: {
    label: "수신됨",
    color: "var(--text-secondary)",
    bg: "var(--bg-raised)",
    border: "var(--border)",
  },
  parsing: {
    label: "파싱 중",
    color: "var(--color-queued)",
    bg: "var(--color-queued-bg)",
    border: "var(--color-queued-border)",
  },
  ready: {
    label: "준비",
    color: "var(--brand)",
    bg: "var(--brand-subtle)",
    border: "var(--border-focus)",
  },
  publishing: {
    label: "발행 중",
    color: "var(--color-queued)",
    bg: "var(--color-queued-bg)",
    border: "var(--color-queued-border)",
  },
};

export function StatusBadge({
  status,
  label,
  size = "md",
  dot = true,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const displayLabel = label ?? config.label;

  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-1)",
    paddingInline: size === "sm" ? "var(--space-2)" : "var(--space-3)",
    paddingBlock: size === "sm" ? "1px" : "var(--space-1)",
    borderRadius: "var(--radius-full)",
    border: `1px solid ${config.border}`,
    backgroundColor: config.bg,
    color: config.color,
    fontSize: size === "sm" ? "var(--text-xs)" : "var(--text-sm)",
    fontWeight: "var(--weight-medium)" as CSSProperties["fontWeight"],
    lineHeight: 1.4,
    whiteSpace: "nowrap",
  };

  const dotStyle: CSSProperties = {
    width: size === "sm" ? 5 : 6,
    height: size === "sm" ? 5 : 6,
    borderRadius: "var(--radius-full)",
    backgroundColor: config.color,
    flexShrink: 0,
  };

  return (
    <span style={style}>
      {dot && <span style={dotStyle} aria-hidden />}
      {displayLabel}
    </span>
  );
}
