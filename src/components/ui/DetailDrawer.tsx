"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
}

export function DetailDrawer({
  open,
  onClose,
  title,
  children,
  width = "520px",
}: DetailDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const overlayStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "var(--bg-overlay)",
    zIndex: 100,
    backdropFilter: "blur(2px)",
  };

  const drawerStyle: CSSProperties = {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width,
    maxWidth: "100vw",
    background: "var(--bg-panel)",
    borderLeft: "1px solid var(--border)",
    boxShadow: "var(--shadow-xl)",
    zIndex: 101,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  };

  const headerStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "var(--space-5) var(--space-6)",
    borderBottom: "1px solid var(--border)",
    position: "sticky",
    top: 0,
    background: "var(--bg-panel)",
    zIndex: 1,
  };

  const titleStyle: CSSProperties = {
    fontSize: "var(--text-base)",
    fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
    color: "var(--text-primary)",
  };

  const closeBtnStyle: CSSProperties = {
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--radius)",
    color: "var(--text-secondary)",
    fontSize: 16,
    transition:
      "background var(--transition-fast), color var(--transition-fast)",
    flexShrink: 0,
  };

  const bodyStyle: CSSProperties = {
    padding: "var(--space-6)",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-6)",
  };

  return (
    <>
      <div style={overlayStyle} onClick={onClose} aria-hidden />
      <div
        style={drawerStyle}
        role="dialog"
        aria-modal
        aria-label={title ?? "상세 정보"}
      >
        <div style={headerStyle}>
          {title && <span style={titleStyle}>{title}</span>}
          <button
            type="button"
            style={closeBtnStyle}
            onClick={onClose}
            aria-label="닫기"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-raised)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            ✕
          </button>
        </div>
        <div style={bodyStyle}>{children}</div>
      </div>
    </>
  );
}

interface DrawerFieldProps {
  label: string;
  value?: string | ReactNode;
  children?: ReactNode;
  mono?: boolean;
  multiline?: boolean;
}

export function DrawerField({
  label,
  value,
  children,
  mono,
  multiline,
}: DrawerFieldProps) {
  const fieldStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-1)",
  };

  const labelStyle: CSSProperties = {
    fontSize: "var(--text-xs)",
    fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const valueStyle: CSSProperties = {
    fontSize: "var(--text-sm)",
    color: "var(--text-primary)",
    fontFamily: mono ? "var(--font-mono)" : undefined,
    wordBreak: multiline ? "break-word" : "break-all",
    whiteSpace: multiline ? "pre-wrap" : undefined,
    background: mono ? "var(--bg-raised)" : undefined,
    padding: mono ? "var(--space-3)" : undefined,
    borderRadius: mono ? "var(--radius)" : undefined,
    border: mono ? "1px solid var(--border)" : undefined,
  };

  return (
    <div style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{children ?? value ?? "—"}</span>
    </div>
  );
}

interface DrawerSectionProps {
  title: string;
  children: ReactNode;
}

export function DrawerSection({ title, children }: DrawerSectionProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      <h3
        style={{
          fontSize: "var(--text-xs)",
          fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
          color: "var(--text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          paddingBottom: "var(--space-2)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

interface DrawerSectionSkeletonProps {
  title: string;
  rows?: number;
}

export function DrawerSectionSkeleton({
  title,
  rows = 3,
}: DrawerSectionSkeletonProps) {
  const rowKeys = ["row-a", "row-b", "row-c", "row-d", "row-e", "row-f"];

  return (
    <DrawerSection title={title}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        {rowKeys.slice(0, rows).map((rowKey, index) => (
          <div
            key={`${title}-${rowKey}`}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            <Skeleton width="26%" height={10} />
            <Skeleton
              width={index % 2 === 0 ? "92%" : "68%"}
              height={index === rows - 1 ? 36 : 14}
              radius="var(--radius)"
            />
          </div>
        ))}
      </div>
    </DrawerSection>
  );
}
