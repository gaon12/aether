import type { CSSProperties, ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  trend?: {
    direction: "up" | "down" | "neutral";
    value: string;
    positive?: boolean; // up이 좋은 건지 나쁜 건지
  };
  accent?: "default" | "success" | "failed" | "warning" | "injection";
  loading?: boolean;
}

const ACCENT_COLOR: Record<string, string> = {
  default: "var(--brand)",
  success: "var(--color-success)",
  failed: "var(--color-failed)",
  warning: "var(--color-warning)",
  injection: "var(--color-injection)",
};

export function KpiCard({
  label,
  value,
  sub,
  icon,
  trend,
  accent = "default",
  loading = false,
}: KpiCardProps) {
  const accentColor = ACCENT_COLOR[accent];

  const cardStyle: CSSProperties = {
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-5) var(--space-6)",
    boxShadow: "var(--shadow-sm)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
    position: "relative",
    overflow: "hidden",
  };

  const accentBarStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: accentColor,
    borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
  };

  const headerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "var(--space-2)",
  };

  const labelStyle: CSSProperties = {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
    fontWeight: "var(--weight-medium)" as CSSProperties["fontWeight"],
  };

  const iconStyle: CSSProperties = {
    color: accentColor,
    opacity: 0.8,
    display: "flex",
    alignItems: "center",
  };

  const valueStyle: CSSProperties = {
    fontSize: "var(--text-3xl)",
    fontWeight: "var(--weight-bold)" as CSSProperties["fontWeight"],
    lineHeight: 1,
    color: "var(--text-primary)",
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.02em",
  };

  const footerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    fontSize: "var(--text-xs)",
    color: "var(--text-tertiary)",
  };

  let trendColor = "var(--text-tertiary)";
  if (trend) {
    const isGood =
      trend.direction === "neutral"
        ? false
        : trend.direction === "up"
          ? trend.positive !== false
          : trend.positive === false;
    trendColor = isGood ? "var(--color-success)" : "var(--color-failed)";
  }

  return (
    <div style={cardStyle}>
      <div style={accentBarStyle} aria-hidden />
      <div style={headerStyle}>
        <span style={labelStyle}>{label}</span>
        {icon && <span style={iconStyle}>{icon}</span>}
      </div>
      {loading ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <Skeleton width="58%" height={30} radius="var(--radius-sm)" />
          <Skeleton width="42%" height={12} />
        </div>
      ) : (
        <span style={valueStyle}>{value}</span>
      )}
      {!loading && (trend || sub) && (
        <div style={footerStyle}>
          {trend && (
            <span
              style={{
                color: trendColor,
                fontWeight:
                  "var(--weight-medium)" as CSSProperties["fontWeight"],
              }}
            >
              {trend.direction === "up"
                ? "↑"
                : trend.direction === "down"
                  ? "↓"
                  : "→"}{" "}
              {trend.value}
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  );
}
