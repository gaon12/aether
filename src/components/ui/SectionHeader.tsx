"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** If provided, shows "N초 전 갱신" auto-updating timestamp */
  lastUpdatedAt?: Date | null;
  /** Show a pulsing live indicator dot */
  live?: boolean;
}

function useRelativeTime(date: Date | null | undefined) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!date) {
      setLabel("");
      return;
    }

    function update() {
      if (!date) return;
      const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
      if (diffSec < 5) setLabel("방금 갱신");
      else if (diffSec < 60) setLabel(`${diffSec}초 전 갱신`);
      else if (diffSec < 3600)
        setLabel(`${Math.floor(diffSec / 60)}분 전 갱신`);
      else setLabel(`${Math.floor(diffSec / 3600)}시간 전 갱신`);
    }

    update();
    const timer = setInterval(update, 5000);
    return () => clearInterval(timer);
  }, [date]);

  return label;
}

export function SectionHeader({
  title,
  description,
  actions,
  lastUpdatedAt,
  live,
}: SectionHeaderProps) {
  const relTime = useRelativeTime(lastUpdatedAt);

  const wrapStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "var(--space-4)",
  };

  const textStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-1)",
  };

  const titleStyle: CSSProperties = {
    fontSize: "var(--text-xl)",
    fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
    color: "var(--text-primary)",
    lineHeight: 1.3,
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
  };

  const descStyle: CSSProperties = {
    fontSize: "var(--text-sm)",
    color: "var(--text-secondary)",
  };

  const metaStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    flexShrink: 0,
    marginTop: "var(--space-1)",
  };

  return (
    <div style={wrapStyle}>
      <div style={textStyle}>
        <h1 style={titleStyle}>
          {live && (
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "var(--radius-full)",
                background: "var(--color-success)",
                flexShrink: 0,
                boxShadow: "0 0 0 2px var(--color-success-bg)",
                animation: "pulse 2s ease-in-out infinite",
              }}
              title="자동 갱신 중"
            />
          )}
          {title}
        </h1>
        {description && <p style={descStyle}>{description}</p>}
      </div>
      <div style={metaStyle}>
        {relTime && (
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-tertiary)",
              whiteSpace: "nowrap",
            }}
          >
            {relTime}
          </span>
        )}
        {actions && (
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
