import type { CSSProperties, ReactNode } from "react";

interface AdminScreenProps {
  title: string;
  description: string;
  notice?: {
    tone: "error" | "success" | "info";
    message: string;
  };
  children: ReactNode;
  footer?: ReactNode;
}

export function AdminScreen({
  title,
  description,
  notice,
  children,
  footer,
}: AdminScreenProps) {
  const toneStyles: Record<
    NonNullable<AdminScreenProps["notice"]>["tone"],
    CSSProperties
  > = {
    error: {
      background: "var(--color-failed-bg)",
      color: "var(--color-failed)",
      border: "1px solid var(--color-failed-border)",
    },
    success: {
      background: "var(--color-success-bg)",
      color: "var(--color-success)",
      border: "1px solid var(--color-success-border)",
    },
    info: {
      background: "var(--brand-subtle)",
      color: "var(--brand)",
      border: "1px solid color-mix(in srgb, var(--brand) 22%, var(--border))",
    },
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "var(--space-8)",
        background:
          "radial-gradient(circle at top, color-mix(in srgb, var(--brand) 12%, transparent), transparent 38%), var(--bg)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-8)",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-6)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-md)",
              background: "var(--brand)",
              color: "var(--text-inverse)",
              fontWeight: "var(--weight-bold)",
            }}
          >
            A
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            <h1
              style={{
                fontSize: "var(--text-2xl)",
                fontWeight: "var(--weight-bold)",
                lineHeight: 1.2,
              }}
            >
              {title}
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "var(--text-sm)",
              }}
            >
              {description}
            </p>
          </div>
        </div>

        {notice ? (
          <div
            style={{
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3) var(--space-4)",
              fontSize: "var(--text-sm)",
              ...toneStyles[notice.tone],
            }}
          >
            {notice.message}
          </div>
        ) : null}

        {children}

        {footer ? (
          <div
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
            }}
          >
            {footer}
          </div>
        ) : null}
      </section>
    </main>
  );
}
