"use client";

import { useState } from "react";

interface CopyFieldProps {
  value: string | null;
  placeholder?: string;
  masked?: boolean;
}

function CopyIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden>
      <title>복사</title>
      <rect
        x="4.5"
        y="4.5"
        width="8"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M4.5 9.5H2.5A1.5 1.5 0 0 1 1 8V2.5A1.5 1.5 0 0 1 2.5 1H8A1.5 1.5 0 0 1 9.5 2.5V4.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden>
      <title>복사 완료</title>
      <path
        d="M2 7.5 5.5 11 12 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden>
      <title>복사 실패</title>
      <path
        d="M3 3l8 8M11 3l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CopyField({
  value,
  placeholder = "—",
  masked = false,
}: CopyFieldProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [revealed, setRevealed] = useState(false);

  const isEmpty = !value;
  const displayValue = isEmpty
    ? placeholder
    : masked && !revealed
      ? "••••••••••••••••"
      : value;

  async function handleCopy() {
    if (!value) return;

    let success = false;
    try {
      await navigator.clipboard.writeText(value);
      success = true;
    } catch {
      // Fallback for HTTP environments or permission denied
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(ta);
        ta.select();
        success = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        success = false;
      }
    }

    setCopyState(success ? "copied" : "failed");
    setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-raised)",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          flex: 1,
          padding: "0.85rem 0.95rem",
          fontSize: "var(--text-sm)",
          fontFamily: isEmpty
            ? "inherit"
            : "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          color: isEmpty ? "var(--text-tertiary)" : "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          letterSpacing: masked && !revealed && !isEmpty ? "0.1em" : undefined,
        }}
        title={!masked && value ? value : undefined}
      >
        {displayValue}
      </span>

      {masked && !isEmpty && (
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          title={revealed ? "숨기기" : "보기"}
          style={{
            padding: "0 0.75rem",
            height: "100%",
            color: "var(--text-tertiary)",
            borderLeft: "1px solid var(--border)",
            transition:
              "color var(--transition-fast), background var(--transition-fast)",
            fontSize: "var(--text-xs)",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--brand)";
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--brand-subtle)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--text-tertiary)";
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
          }}
        >
          {revealed ? "숨기기" : "보기"}
        </button>
      )}

      <button
        type="button"
        onClick={handleCopy}
        disabled={isEmpty}
        title={
          copyState === "copied"
            ? "복사됨!"
            : copyState === "failed"
              ? "복사 실패"
              : "클립보드에 복사"
        }
        style={{
          padding: "0 0.9rem",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1)",
          color:
            copyState === "copied"
              ? "var(--color-success)"
              : copyState === "failed"
                ? "var(--color-failed)"
                : "var(--text-tertiary)",
          borderLeft: "1px solid var(--border)",
          fontSize: "var(--text-xs)",
          fontWeight: "var(--weight-medium)",
          whiteSpace: "nowrap",
          transition:
            "color var(--transition-fast), background var(--transition-fast)",
          opacity: isEmpty ? 0.4 : 1,
        }}
        onMouseEnter={(e) => {
          if (isEmpty || copyState !== "idle") return;
          (e.currentTarget as HTMLButtonElement).style.color = "var(--brand)";
          (e.currentTarget as HTMLButtonElement).style.background =
            "var(--brand-subtle)";
        }}
        onMouseLeave={(e) => {
          if (copyState !== "idle") return;
          (e.currentTarget as HTMLButtonElement).style.color =
            "var(--text-tertiary)";
          (e.currentTarget as HTMLButtonElement).style.background =
            "transparent";
        }}
      >
        {copyState === "copied" ? (
          <CheckIcon />
        ) : copyState === "failed" ? (
          <ErrorIcon />
        ) : (
          <CopyIcon />
        )}
        {copyState === "copied"
          ? "복사됨"
          : copyState === "failed"
            ? "복사 실패"
            : "복사"}
      </button>
    </div>
  );
}
