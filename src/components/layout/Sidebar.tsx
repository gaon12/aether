"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
}

const Icons = {
  Overview: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  Feed: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" />
    </svg>
  ),
  Requests: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Quality: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Responses: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Injections: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 14 4-4" />
      <path d="m3.34 19 1.4-1.4" />
      <path d="m5.8 8.8-1.4-1.4" />
      <path d="M9.03 21 5.7 17.7" />
      <path d="M16 21a2 2 0 0 0 2-2" />
      <path d="M21 16a2 2 0 0 0-2-2" />
      <path d="m5.4 14.6 3.4 3.4" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="M16 8h3" />
      <path d="M5 8H2" />
    </svg>
  ),
  Stats: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Status: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "개요", icon: <Icons.Overview />, exact: true },
  { href: "/feed", label: "봇 답변 피드", icon: <Icons.Feed />, exact: true },
  { href: "/requests", label: "요청 분석", icon: <Icons.Requests /> },
  { href: "/command-quality", label: "명령 품질", icon: <Icons.Quality /> },
  { href: "/responses", label: "응답 탐색", icon: <Icons.Responses /> },
  { href: "/prompt-injections", label: "프롬프트 인젝션", icon: <Icons.Injections /> },
  { href: "/llm-stats", label: "LLM 통계", icon: <Icons.Stats /> },
  { href: "/platform-status", label: "플랫폼 상태", icon: <Icons.Status /> },
];

export function Sidebar() {
  const pathname = usePathname();

  const sidebarStyle: CSSProperties = {
    width: "var(--sidebar-width)",
    minHeight: "100vh",
    background: "var(--bg-panel)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    position: "sticky",
    top: 0,
    height: "100vh",
    overflowY: "auto",
  };

  const logoStyle: CSSProperties = {
    padding: "var(--space-5) var(--space-5) var(--space-4)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    gap: "var(--space-3)",
  };

  const logoMarkStyle: CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: "var(--radius)",
    background: "var(--brand)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontSize: 13,
    fontWeight: "var(--weight-bold)" as CSSProperties["fontWeight"],
    flexShrink: 0,
  };

  const logoTextStyle: CSSProperties = {
    fontSize: "var(--text-base)",
    fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
  };

  const navStyle: CSSProperties = {
    padding: "var(--space-3) var(--space-2)",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    flex: 1,
  };

  const navSectionLabel: CSSProperties = {
    fontSize: "var(--text-xs)",
    fontWeight: "var(--weight-semibold)" as CSSProperties["fontWeight"],
    color: "var(--text-tertiary)",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    padding: "var(--space-3) var(--space-3) var(--space-1)",
  };

  const footerStyle: CSSProperties = {
    padding: "var(--space-4) var(--space-3)",
    borderTop: "1px solid var(--border)",
    fontSize: "var(--text-xs)",
    color: "var(--text-tertiary)",
  };

  return (
    <aside style={sidebarStyle}>
      <div style={logoStyle}>
        <div style={logoMarkStyle}>A</div>
        <span style={logoTextStyle}>Aether</span>
      </div>

      <nav style={navStyle}>
        <span style={navSectionLabel}>대시보드</span>
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          const itemStyle: CSSProperties = {
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius)",
            fontSize: "var(--text-sm)",
            fontWeight: isActive
              ? ("var(--weight-medium)" as CSSProperties["fontWeight"])
              : ("var(--weight-normal)" as CSSProperties["fontWeight"]),
            color: isActive ? "var(--brand)" : "var(--text-secondary)",
            background: isActive ? "var(--brand-subtle)" : "transparent",
            transition:
              "background var(--transition-fast), color var(--transition-fast)",
            textDecoration: "none",
          };

          const iconStyle: CSSProperties = {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            flexShrink: 0,
            opacity: isActive ? 1 : 0.6,
          };

          return (
            <Link
              key={item.href}
              href={item.href}
              style={itemStyle}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--bg-raised)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              <div style={iconStyle}>{item.icon}</div>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          ...footerStyle,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        <ThemeToggle />
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Link
            href="/admin"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "var(--space-2) var(--space-3)",
              color: "var(--text-secondary)",
              background: "var(--bg-raised)",
              textDecoration: "none",
              fontSize: "var(--text-xs)",
            }}
          >
            관리자 설정
          </Link>
        </div>
        <span>Aether v0.1.0</span>
      </div>
    </aside>
  );
}
