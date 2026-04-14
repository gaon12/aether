import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "var(--space-10) var(--space-6)",
        lineHeight: 1.7,
        color: "var(--text-primary)",
      }}
    >
      <div
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-8) var(--space-10)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {children}
        <footer
          style={{
            marginTop: "var(--space-10)",
            paddingTop: "var(--space-6)",
            borderTop: "1px solid var(--border)",
            fontSize: "var(--text-xs)",
            color: "var(--text-tertiary)",
            textAlign: "center",
          }}
        >
          &copy; {new Date().getFullYear()} Aether. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
