"use client";

import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/* ─── Toast ──────────────────────────────────────────────────────────────── */

interface ToastData {
  id: number;
  status: "success" | "error";
  message: string;
}

const AUTO_DISMISS_MS = 4000;

function CheckIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" aria-hidden>
      <title>성공</title>
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 9.5l2.5 2.5 4.5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none" aria-hidden>
      <title>오류</title>
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9 6v4M9 13h.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden>
      <title>닫기</title>
      <path
        d="M3 3l8 8M11 3l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: number) => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(toast.id), 200);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    if (toast.status === "success") {
      timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss, toast.status]);

  const isSuccess = toast.status === "success";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`admin-toast ${isSuccess ? "admin-toast-success" : "admin-toast-error"}${leaving ? " leaving" : ""}`}
      style={{ position: "relative" }}
    >
      {/* Icon */}
      <span
        style={{
          flexShrink: 0,
          marginTop: 1,
          color: isSuccess ? "var(--color-success)" : "var(--color-failed)",
        }}
      >
        {isSuccess ? <CheckIcon /> : <AlertIcon />}
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: "var(--weight-semibold)",
            fontSize: "var(--text-sm)",
            marginBottom: 2,
          }}
        >
          {isSuccess ? "저장 완료" : "저장 실패"}
        </p>
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          {toast.message}
        </p>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="알림 닫기"
        style={{
          flexShrink: 0,
          alignSelf: "flex-start",
          color: "var(--text-tertiary)",
          padding: "2px",
          borderRadius: "var(--radius-sm)",
          transition: "color var(--transition-fast)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-tertiary)";
        }}
      >
        <XIcon />
      </button>

      {/* Auto-dismiss progress bar */}
      {isSuccess && (
        <span
          className="admin-toast-progress"
          style={{ "--duration": `${AUTO_DISMISS_MS}ms` } as CSSProperties}
        />
      )}
    </div>
  );
}

/* ─── AdminForm ──────────────────────────────────────────────────────────── */

interface AdminFormProps {
  action: string;
  submitLabel: string;
  successMessage?: string;
  reloadOnSuccess?: boolean;
  secondarySubmit?: {
    label: string;
    name: string;
    value: string;
    successMessage?: string;
    confirmMessage?: string;
    reloadOnSuccess?: boolean;
  };
  children: ReactNode;
}

export function AdminForm({
  action,
  submitLabel,
  successMessage = "설정이 저장되었습니다.",
  reloadOnSuccess = false,
  secondarySubmit,
  children,
}: AdminFormProps) {
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const counterRef = useRef(0);

  function addToast(status: "success" | "error", message: string) {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, status, message }]);
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    const nativeEvent = e.nativeEvent as SubmitEvent;
    const submitter =
      nativeEvent.submitter instanceof HTMLButtonElement
        ? nativeEvent.submitter
        : null;
    const confirmMessage = submitter?.dataset.confirmMessage;
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    const formData = submitter
      ? new FormData(e.currentTarget, submitter)
      : new FormData(e.currentTarget);
    const submitSuccessMessage =
      submitter?.dataset.successMessage ?? successMessage;
    const shouldReloadOnSuccess =
      submitter?.dataset.reloadOnSuccess === "true" || reloadOnSuccess;
    setSaving(true);

    try {
      const res = await fetch(action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });

      const data = (await res.json()) as { saved?: boolean; error?: string };

      if (data.saved) {
        addToast("success", submitSuccessMessage);
        if (shouldReloadOnSuccess) {
          setTimeout(() => window.location.reload(), 1500);
        }
      } else {
        addToast("error", data.error ?? "저장 중 오류가 발생했습니다.");
      }
    } catch {
      addToast("error", "네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: "var(--space-5)" }}
      >
        {children}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-2)",
            flexWrap: "wrap",
          }}
        >
          {secondarySubmit ? (
            <button
              type="submit"
              name={secondarySubmit.name}
              value={secondarySubmit.value}
              className="admin-btn-ghost"
              disabled={saving}
              data-success-message={
                secondarySubmit.successMessage ?? "기본값으로 초기화되었습니다."
              }
              data-confirm-message={secondarySubmit.confirmMessage}
              data-reload-on-success={
                secondarySubmit.reloadOnSuccess ? "true" : undefined
              }
            >
              {secondarySubmit.label}
            </button>
          ) : null}
          <button
            type="submit"
            className="admin-btn-primary"
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? (
              <>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "var(--radius-full)",
                    border:
                      "2px solid color-mix(in srgb, currentColor 30%, transparent)",
                    borderTopColor: "currentColor",
                    flexShrink: 0,
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                저장 중…
              </>
            ) : (
              <>
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden
                >
                  <title>저장</title>
                  <path
                    d="M2 7.5 5.5 11 12 3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {submitLabel}
              </>
            )}
          </button>
        </div>
      </form>

      {/* Toast portal */}
      {toasts.length > 0 && (
        <div className="admin-toast-wrap">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onDismiss={dismissToast} />
          ))}
        </div>
      )}
    </>
  );
}
