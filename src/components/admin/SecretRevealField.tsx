"use client";

import { useState } from "react";

interface SecretRevealFieldProps {
  name: string;
  currentValue: string | null;
  placeholder?: string;
}

function EyeIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <title>보기</title>
      <path
        d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <title>숨기기</title>
      <path
        d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5M4.2 4.3C2.7 5.3 1.5 6.8 1 8c1 2.7 3.8 5 7 5a8 8 0 0 0 3.8-1M7 3.1A8 8 0 0 1 8 3c3.2 0 6 2.3 7 5a9 9 0 0 1-1.9 2.8"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SecretRevealField({
  name,
  currentValue,
  placeholder = "미설정",
}: SecretRevealFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const isSet = Boolean(currentValue);

  return (
    <div style={{ position: "relative" }}>
      <input
        name={name}
        type={revealed ? "text" : "password"}
        defaultValue={currentValue ?? ""}
        placeholder={isSet ? undefined : placeholder}
        className="admin-field"
        style={{ paddingRight: "3rem" }}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        title={revealed ? "값 숨기기" : "값 보기"}
        aria-label={revealed ? "값 숨기기" : "값 보기"}
        style={{
          position: "absolute",
          right: "0.75rem",
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.25rem",
          borderRadius: "var(--radius-sm)",
          color: revealed ? "var(--brand)" : "var(--text-tertiary)",
          transition: "color var(--transition-fast)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--brand)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = revealed
            ? "var(--brand)"
            : "var(--text-tertiary)";
        }}
      >
        {revealed ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
