import type { CSSProperties, ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  const wrapStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-16) var(--space-8)",
    gap: "var(--space-3)",
    textAlign: "center",
  };

  const iconStyle: CSSProperties = {
    fontSize: 32,
    color: "var(--text-tertiary)",
    marginBottom: "var(--space-2)",
  };

  const titleStyle: CSSProperties = {
    fontSize: "var(--text-base)",
    fontWeight: "var(--weight-medium)" as CSSProperties["fontWeight"],
    color: "var(--text-secondary)",
  };

  const descStyle: CSSProperties = {
    fontSize: "var(--text-sm)",
    color: "var(--text-tertiary)",
    maxWidth: 360,
  };

  return (
    <div style={wrapStyle}>
      {icon && <span style={iconStyle}>{icon}</span>}
      <p style={titleStyle}>{title}</p>
      {description && <p style={descStyle}>{description}</p>}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "데이터를 불러오지 못했습니다.",
  onRetry,
}: ErrorStateProps) {
  const btnStyle: CSSProperties = {
    marginTop: "var(--space-2)",
    padding: "var(--space-2) var(--space-4)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    background: "var(--bg-raised)",
    cursor: "pointer",
  };

  return (
    <EmptyState
      icon="⚠"
      title="오류"
      description={message}
      action={
        onRetry ? (
          <button type="button" style={btnStyle} onClick={onRetry}>
            다시 시도
          </button>
        ) : undefined
      }
    />
  );
}
