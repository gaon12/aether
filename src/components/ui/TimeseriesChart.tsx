"use client";

import type { CSSProperties } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/Skeleton";

export interface TimeseriesDataPoint {
  time: string; // display label (e.g. "04-13 14:00")
  [key: string]: string | number;
}

export interface TimeseriesSeries {
  key: string;
  label: string;
  color: string;
}

interface TimeseriesChartProps {
  data: TimeseriesDataPoint[];
  series: TimeseriesSeries[];
  height?: number;
  emptyText?: string;
  loading?: boolean;
}

interface TooltipEntry {
  dataKey?: string | number;
  name?: string;
  value?: number;
  color?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const tooltipStyle: CSSProperties = {
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "var(--space-3) var(--space-4)",
    boxShadow: "var(--shadow-md)",
    fontSize: "var(--text-xs)",
  };

  const labelStyle: CSSProperties = {
    color: "var(--text-secondary)",
    marginBottom: "var(--space-2)",
    fontWeight: 500,
  };

  const rowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    marginBottom: 2,
  };

  const dotStyle = (color: string): CSSProperties => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: color,
    flexShrink: 0,
  });

  return (
    <div style={tooltipStyle}>
      <p style={labelStyle}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={rowStyle}>
          <span style={dotStyle(entry.color ?? "#6366f1")} />
          <span style={{ color: "var(--text-secondary)" }}>{entry.name}:</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {entry.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function TimeseriesChart({
  data,
  series,
  height = 200,
  emptyText = "데이터가 없습니다.",
  loading = false,
}: TimeseriesChartProps) {
  const wrapStyle: CSSProperties = {
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-5) var(--space-6) var(--space-4)",
    boxShadow: "var(--shadow-sm)",
  };

  if (loading) {
    const chartAreaHeight = Math.max(height - 36, 96);
    const barHeights = [
      { key: "bar-a", height: "38%" },
      { key: "bar-b", height: "62%" },
      { key: "bar-c", height: "48%" },
      { key: "bar-d", height: "78%" },
      { key: "bar-e", height: "58%" },
      { key: "bar-f", height: "86%" },
      { key: "bar-g", height: "64%" },
      { key: "bar-h", height: "72%" },
    ];
    const axisKeys = ["axis-a", "axis-b", "axis-c", "axis-d"];

    return (
      <div style={wrapStyle}>
        <div
          aria-hidden
          style={{
            height,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "var(--space-4)",
          }}
        >
          <div
            style={{
              height: chartAreaHeight,
              display: "flex",
              alignItems: "flex-end",
              gap: "var(--space-3)",
            }}
          >
            {barHeights.map((bar) => (
              <Skeleton
                key={bar.key}
                width="100%"
                height={bar.height}
                radius="var(--radius)"
                style={{ flex: 1 }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "var(--space-3)",
            }}
          >
            {axisKeys.map((axisKey) => (
              <Skeleton key={axisKey} width="18%" height={10} />
            ))}
          </div>
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
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
        >
          <defs>
            {series.map((s) => (
              <linearGradient
                key={s.key}
                id={`grad-${s.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={s.color} stopOpacity={0.15} />
                <stop offset="95%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="time"
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
            content={<CustomTooltip />}
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#grad-${s.key})`}
              dot={false}
              activeDot={{ r: 4, fill: s.color, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
