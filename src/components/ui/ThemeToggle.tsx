"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const initial = stored ?? "system";
    setTheme(initial);
    applyTheme(initial);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      const latestStored =
        (localStorage.getItem("theme") as Theme | null) ?? "system";
      if (latestStored === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  function cycle() {
    const order: Theme[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    applyTheme(next);
    localStorage.setItem("theme", next);
  }

  const ICON: Record<Theme, string> = {
    system: "◑",
    light: "○",
    dark: "●",
  };

  const LABEL: Record<Theme, string> = {
    system: "시스템",
    light: "라이트",
    dark: "다크",
  };

  const btnStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "var(--space-2)",
    padding: "var(--space-2) var(--space-3)",
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: "var(--bg-raised)",
    color: "var(--text-secondary)",
    fontSize: "var(--text-xs)",
    cursor: "pointer",
    transition:
      "background var(--transition-fast), color var(--transition-fast)",
    whiteSpace: "nowrap",
  };

  return (
    <button
      type="button"
      style={btnStyle}
      onClick={cycle}
      title={`테마: ${LABEL[theme]}`}
      aria-label={`테마 변경 (현재: ${LABEL[theme]})`}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--brand-subtle)";
        e.currentTarget.style.color = "var(--brand)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-raised)";
        e.currentTarget.style.color = "var(--text-secondary)";
      }}
    >
      <span style={{ fontSize: 14 }}>{ICON[theme]}</span>
      {LABEL[theme]}
    </button>
  );
}
