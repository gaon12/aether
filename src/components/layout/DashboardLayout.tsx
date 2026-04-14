import type { CSSProperties, ReactNode } from "react";
import { Sidebar } from "./Sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const shellStyle: CSSProperties = {
    display: "flex",
    minHeight: "100vh",
  };

  const mainStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    padding: "var(--space-8)",
    maxWidth: "var(--content-max)",
    width: "100%",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-6)",
  };

  return (
    <div style={shellStyle}>
      <Sidebar />
      <main style={mainStyle}>
        <div style={contentStyle}>{children}</div>
      </main>
    </div>
  );
}
