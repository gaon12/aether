"use client";

import type { CSSProperties } from "react";

interface SkeletonProps {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  radius?: CSSProperties["borderRadius"];
  style?: CSSProperties;
}

export function Skeleton({
  width = "100%",
  height = "1em",
  radius = "var(--radius-sm)",
  style,
}: SkeletonProps) {
  return (
    <span
      aria-hidden
      className="skeleton"
      style={{
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  widths?: Array<CSSProperties["width"]>;
  lineHeight?: CSSProperties["height"];
  gap?: CSSProperties["gap"];
}

export function SkeletonText({
  lines = 3,
  widths = ["100%", "92%", "72%"],
  lineHeight = 12,
  gap = "var(--space-2)",
}: SkeletonTextProps) {
  const lineKeys = ["line-a", "line-b", "line-c", "line-d", "line-e", "line-f"];

  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        flexDirection: "column",
        gap,
        width: "100%",
      }}
    >
      {lineKeys.slice(0, lines).map((lineKey, index) => (
        <Skeleton
          key={`${lineKey}-${String(widths[index] ?? widths[widths.length - 1] ?? "100%")}`}
          width={widths[index] ?? widths[widths.length - 1] ?? "100%"}
          height={lineHeight}
        />
      ))}
    </div>
  );
}
