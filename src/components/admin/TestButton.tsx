"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

type TestTarget = "app_url" | "threads_app" | "threads_webhook" | "model";

interface TestButtonProps {
  testTarget: TestTarget;
  label: string;
  icon?: ReactNode;
}

interface TestResult {
  status: "success" | "error";
  message: string;
}

const TARGET_LABEL: Record<TestTarget, string> = {
  app_url: "공개 URL 테스트",
  threads_app: "앱 자격증명 테스트",
  threads_webhook: "웹훅 검증 테스트",
  model: "모델 연결 테스트",
};

function SpinnerIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <title>로딩</title>
      <circle
        cx="7"
        cy="7"
        r="5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="26"
        strokeDashoffset="18"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" aria-hidden>
      <title>성공</title>
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 10.5l2.5 2.5 4.5-5"
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
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" aria-hidden>
      <title>오류</title>
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6.5v4M10 13.5h.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
      <title>닫기</title>
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface TestModalProps {
  target: TestTarget;
  result: TestResult | null;
  loading: boolean;
  onClose: () => void;
}

function TestModal({ target, result, loading, onClose }: TestModalProps) {
  const backdropPressedRef = useRef(false);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const isSuccess = result?.status === "success";

  return (
    <div
      className="admin-modal-backdrop"
      onMouseDown={(event) => {
        backdropPressedRef.current = event.target === event.currentTarget;
      }}
      onMouseUp={(event) => {
        const shouldClose =
          backdropPressedRef.current && event.target === event.currentTarget;
        backdropPressedRef.current = false;

        if (shouldClose) {
          onClose();
        }
      }}
      onMouseLeave={() => {
        backdropPressedRef.current = false;
      }}
      aria-hidden
    >
      <div
        className="admin-modal"
        role="dialog"
        aria-modal
        aria-label="테스트 결과"
      >
        {/* Modal header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-5) var(--space-6)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-lg)",
                background: loading
                  ? "var(--bg-raised)"
                  : isSuccess
                    ? "var(--color-success-bg)"
                    : "var(--color-failed-bg)",
                color: loading
                  ? "var(--text-secondary)"
                  : isSuccess
                    ? "var(--color-success)"
                    : "var(--color-failed)",
                border: `1px solid ${
                  loading
                    ? "var(--border)"
                    : isSuccess
                      ? "var(--color-success-border)"
                      : "var(--color-failed-border)"
                }`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all var(--transition)",
              }}
            >
              {loading ? (
                <SpinnerIcon />
              ) : isSuccess ? (
                <CheckIcon />
              ) : (
                <ErrorIcon />
              )}
            </div>
            <div>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-tertiary)",
                  marginBottom: 2,
                }}
              >
                {TARGET_LABEL[target]}
              </p>
              <strong
                style={{
                  fontSize: "var(--text-base)",
                  fontWeight: "var(--weight-semibold)",
                }}
              >
                {loading
                  ? "테스트 중..."
                  : isSuccess
                    ? "테스트 성공"
                    : "테스트 실패"}
              </strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="admin-btn-ghost"
            style={{ padding: "0.4rem" }}
            aria-label="닫기"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Modal body */}
        <div style={{ padding: "var(--space-6)" }}>
          {loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-4)",
                padding: "var(--space-6) 0",
                color: "var(--text-secondary)",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-full)",
                  border: "3px solid var(--border)",
                  borderTopColor: "var(--brand)",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <p style={{ fontSize: "var(--text-sm)" }}>
                서버와 통신하는 중입니다…
              </p>
            </div>
          ) : result ? (
            <div
              style={{
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-4)",
                background: isSuccess
                  ? "var(--color-success-bg)"
                  : "var(--color-failed-bg)",
                border: `1px solid ${isSuccess ? "var(--color-success-border)" : "var(--color-failed-border)"}`,
                color: isSuccess
                  ? "var(--color-success)"
                  : "var(--color-failed)",
                fontSize: "var(--text-sm)",
                lineHeight: 1.6,
                wordBreak: "break-word",
              }}
            >
              {result.message}
            </div>
          ) : null}
        </div>

        {/* Modal footer */}
        {!loading && (
          <div
            style={{
              padding: "var(--space-4) var(--space-6)",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="admin-btn-primary"
            >
              확인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function TestButton({ testTarget, label, icon }: TestButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const form = (e.currentTarget as HTMLButtonElement).closest("form");
    if (!form) return;

    const formData = new FormData(form);
    formData.set("testTarget", testTarget);

    setLoading(true);
    setResult(null);
    setModalOpen(true);

    try {
      const res = await fetch("/api/admin/api/test", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`서버 오류 (HTTP ${res.status})`);
      }

      const data = (await res.json()) as {
        testStatus: "success" | "error";
        testMessage: string;
      };
      setResult({ status: data.testStatus, message: data.testMessage });
    } catch (err) {
      setResult({
        status: "error",
        message:
          err instanceof Error ? err.message : "네트워크 오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    if (loading) return;
    setModalOpen(false);
    setResult(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="admin-btn-ghost"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? <SpinnerIcon /> : icon}
        {loading ? "테스트 중…" : label}
      </button>

      {modalOpen && (
        <TestModal
          target={testTarget}
          result={result}
          loading={loading}
          onClose={closeModal}
        />
      )}
    </>
  );
}
