"use client";

import type { CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/Skeleton";

export interface HistogramBar {
  label: string;
  count: number;
  color?: string;
}

interface HistogramChartProps {
  data: HistogramBar[];
  height?: number;
  emptyText?: string;
  loading?: boolean;
}

function HistogramTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: HistogramBar }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0]?.payload;

  return (
    <div
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "var(--space-3) var(--space-4)",
        boxShadow: "var(--shadow-md)",
        fontSize: "var(--text-xs)",
      }}
    >
      <p
        style={{
          color: "var(--text-secondary)",
          marginBottom: "var(--space-2)",
          fontWeight: 500,
        }}
      >
        {label}
      </p>
      <p style={{ color: "var(--text-primary)", fontWeight: 600 }}>
        {(item?.count ?? 0).toLocaleString()}건
      </p>
    </div>
  );
}

export function HistogramChart({
  data,
  height = 220,
  emptyText = "데이터가 없습니다.",
  loading = false,
}: HistogramChartProps) {
  const wrapStyle: CSSProperties = {
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-5) var(--space-6) var(--space-4)",
    boxShadow: "var(--shadow-sm)",
  };

  if (loading) {
    const skeletonKeys = [
      "hist-a",
      "hist-b",
      "hist-c",
      "hist-d",
      "hist-e",
      "hist-f",
    ];

    return (
      <div style={wrapStyle}>
        <div
          style={{
            height,
            display: "flex",
            alignItems: "flex-end",
            gap: "var(--space-3)",
          }}
        >
          {skeletonKeys.map((key, index) => (
            <Skeleton
              key={key}
              width="100%"
              height={`${35 + index * 8}%`}
              radius="var(--radius)"
              style={{ flex: 1 }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        style={{
          ...wrapStyle,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-tertiary)",
          fontSize: "var(--text-sm)",
        }}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            allowDecimals={false}
          />
          <Tooltip
            content={<HistogramTooltip />}
            cursor={{
              fill: "color-mix(in srgb, var(--bg-raised) 60%, transparent)",
            }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.color ?? "var(--brand)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
