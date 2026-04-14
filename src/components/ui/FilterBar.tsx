"use client";

import type { CSSProperties, ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
  actions?: ReactNode;
}

export function FilterBar({ children, actions }: FilterBarProps) {
  const barStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    flexWrap: "wrap",
    padding: "var(--space-4)",
    background: "var(--bg-panel)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-sm)",
  };

  const leftStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
    flexWrap: "wrap",
    flex: 1,
    minWidth: 0,
  };

  return (
    <div style={barStyle}>
      <div style={leftStyle}>{children}</div>
      {actions && (
        <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "검색…",
  width = "220px",
}: SearchInputProps) {
  const wrapStyle: CSSProperties = {
    position: "relative",
    width,
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    height: 34,
    paddingInline: "var(--space-3) var(--space-3)",
    paddingLeft: "var(--space-8)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: "var(--bg-raised)",
    color: "var(--text-primary)",
    fontSize: "var(--text-sm)",
    outline: "none",
    transition: "border-color var(--transition-fast)",
  };

  const iconStyle: CSSProperties = {
    position: "absolute",
    left: "var(--space-3)",
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-tertiary)",
    pointerEvents: "none",
    fontSize: 14,
  };

  return (
    <div style={wrapStyle}>
      <span style={iconStyle} aria-hidden>
        ⌕
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--border-focus)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
        }}
      />
    </div>
  );
}

interface SelectFilterProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectFilter({
  value,
  onChange,
  options,
  placeholder = "전체",
}: SelectFilterProps) {
  const selectStyle: CSSProperties = {
    height: 34,
    paddingInline: "var(--space-3)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: "var(--bg-raised)",
    color: "var(--text-primary)",
    fontSize: "var(--text-sm)",
    outline: "none",
    cursor: "pointer",
    transition: "border-color var(--transition-fast)",
  };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={selectStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--border-focus)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

interface DateRangeFilterProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
}: DateRangeFilterProps) {
  const inputStyle: CSSProperties = {
    height: 34,
    paddingInline: "var(--space-3)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    background: "var(--bg-raised)",
    color: "var(--text-primary)",
    fontSize: "var(--text-sm)",
    outline: "none",
    colorScheme: "inherit",
  };

  const labelStyle: CSSProperties = {
    fontSize: "var(--text-xs)",
    color: "var(--text-secondary)",
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
    >
      <span style={labelStyle}>기간</span>
      <input
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        style={inputStyle}
      />
      <span style={labelStyle}>~</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}
