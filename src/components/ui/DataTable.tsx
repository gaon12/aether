"use client";

import type { CSSProperties, ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (row: T, index: number) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  loading?: boolean;
}

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "var(--text-sm)",
};

const thStyle: CSSProperties = {
  padding: "var(--space-3) var(--space-4)",
  textAlign: "left",
  fontSize: "var(--text-xs)",
  fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--border)",
  whiteSpace: "nowrap",
  background: "var(--bg-raised)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: CSSProperties = {
  padding: "var(--space-3) var(--space-4)",
  borderBottom: "1px solid var(--border)",
  color: "var(--text-primary)",
  verticalAlign: "middle",
};

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  onRowClick,
  emptyText = "데이터가 없습니다.",
  loading = false,
}: DataTableProps<T>) {
  const wrapperStyle: CSSProperties = {
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
    boxShadow: "var(--shadow-sm)",
  };

  const scrollStyle: CSSProperties = {
    overflowX: "auto",
  };
  const skeletonRows = ["row-a", "row-b", "row-c", "row-d", "row-e"];

  if (loading) {
    return (
      <div style={wrapperStyle}>
        <div style={scrollStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      ...thStyle,
                      width: col.width,
                      textAlign: col.align ?? "left",
                    }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skeletonRows.map((rowKey) => (
                <tr key={rowKey}>
                  {columns.map((col, colIdx) => (
                    <td
                      key={`${rowKey}-${col.key}`}
                      style={{
                        ...tdStyle,
                        textAlign: col.align ?? "left",
                      }}
                    >
                      <Skeleton
                        width={
                          col.align === "right"
                            ? 56
                            : col.width
                              ? "70%"
                              : colIdx === 0
                                ? "46%"
                                : colIdx === columns.length - 1
                                  ? "54%"
                                  : "82%"
                        }
                        height={12}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <div style={scrollStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    ...thStyle,
                    width: col.width,
                    textAlign: col.align ?? "left",
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    color: "var(--text-tertiary)",
                    padding: "var(--space-12)",
                    border: "none",
                  }}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={getRowKey(row, idx)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{
                    cursor: onRowClick ? "pointer" : "default",
                    transition: "background var(--transition-fast)",
                  }}
                  onMouseEnter={(e) => {
                    if (onRowClick) {
                      (
                        e.currentTarget as HTMLTableRowElement
                      ).style.background = "var(--bg-raised)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "transparent";
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        ...tdStyle,
                        textAlign: col.align ?? "left",
                      }}
                    >
                      {col.render
                        ? col.render(row, idx)
                        : String(
                            (row as Record<string, unknown>)[col.key] ?? "—",
                          )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
