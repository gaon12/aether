"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface AdminConsoleLayoutProps {
  children: ReactNode;
}

function IconHome({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <title>관리자 홈</title>
      <path
        d="M1.5 6.5 8 1.5l6.5 5V14a.5.5 0 0 1-.5.5H10V10H6v4.5H2a.5.5 0 0 1-.5-.5V6.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSettings({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <title>일반 설정</title>
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M2.929 2.929l1.414 1.414M11.657 11.657l1.414 1.414M2.929 13.071l1.414-1.414M11.657 4.343l1.414-1.414"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconApi({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <title>API 관리</title>
      <rect
        x="1.5"
        y="3.5"
        width="13"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M4.5 8h7M4.5 6h2M4.5 10h3.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPrompt({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <title>프롬프트 관리</title>
      <path
        d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v7a1.5 1.5 0 0 1-1.5 1.5H9l-2 2-2-2H3.5A1.5 1.5 0 0 1 2 10.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M5 5.5h6M5 8h4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ADMIN_NAV = [
  {
    href: "/admin",
    label: "관리자 홈",
    Icon: IconHome,
    exact: true,
  },
  { href: "/admin/settings", label: "일반 설정", Icon: IconSettings },
  { href: "/admin/api", label: "API 관리", Icon: IconApi },
  { href: "/admin/prompts", label: "프롬프트 관리", Icon: IconPrompt },
];

export function AdminConsoleLayout({ children }: AdminConsoleLayoutProps) {
  const pathname = usePathname();

  const shellStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "272px minmax(0, 1fr)",
    minHeight: "100vh",
    background: "var(--bg)",
  };

  const sidebarStyle: CSSProperties = {
    position: "sticky",
    top: 0,
    height: "100vh",
    overflowY: "auto",
    background: "var(--bg-panel)",
    borderRight: "1px solid var(--border)",
    padding: "var(--space-5) var(--space-4)",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5)",
  };

  return (
    <div style={shellStyle}>
      <aside style={sidebarStyle}>
        {/* Branding */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <Link
            href="/overview"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontSize: "var(--text-xs)",
              color: "var(--text-tertiary)",
              fontWeight: "var(--weight-medium)",
              textDecoration: "none",
              transition: "color var(--transition-fast)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--brand)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
          >
            <svg
              width={12}
              height={12}
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
            >
              <title>대시보드로 이동</title>
              <path
                d="M7.5 10 3.5 6l4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            대시보드
          </Link>

          <div
            style={{
              padding: "var(--space-4) var(--space-5)",
              borderRadius: "var(--radius-xl)",
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--brand) 10%, var(--bg-raised)), var(--bg-raised))",
              border:
                "1px solid color-mix(in srgb, var(--brand) 20%, var(--border))",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                marginBottom: "var(--space-2)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--radius-md)",
                  background: "var(--brand)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-inverse)",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--weight-bold)",
                  flexShrink: 0,
                }}
              >
                A
              </div>
              <div>
                <strong
                  style={{
                    fontSize: "var(--text-base)",
                    fontWeight: "var(--weight-bold)",
                    letterSpacing: "-0.02em",
                    display: "block",
                    lineHeight: 1.2,
                  }}
                >
                  Aether
                </strong>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Admin Console
                </span>
              </div>
            </div>
            <p
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              운영자 전용 설정 구역입니다.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-tertiary)",
              fontWeight: "var(--weight-semibold)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              paddingInline: "var(--space-4)",
              paddingBlock: "var(--space-2)",
            }}
          >
            메뉴
          </span>
          {ADMIN_NAV.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-link${isActive ? " active" : ""}`}
              >
                <item.Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
            paddingTop: "var(--space-4)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <ThemeToggle />
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="admin-btn-logout">
              <svg
                width={14}
                height={14}
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden
              >
                <title>로그아웃</title>
                <path
                  d="M5 12.5H2.5A1.5 1.5 0 0 1 1 11V3a1.5 1.5 0 0 1 1.5-1.5H5M9.5 10l3.5-3-3.5-3M13 7H5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              로그아웃
            </button>
          </form>
        </div>
      </aside>

      <main
        style={{
          minWidth: 0,
          padding: "var(--space-8)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 1100,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-6)",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
