"use client";

import { useId, useRef, useState } from "react";

type PromptType = "translate" | "summary" | "translateSummary";

interface TestMetrics {
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  tokensPerSecond: number | null;
  model: string;
}

interface InjectionInfo {
  detected: boolean;
  score: number;
  reason: string;
}

interface TestResult {
  ok: true;
  text: string;
  rawResult: string;
  thinkingContent: string | null;
  constructedUserMessage: string;
  metrics: TestMetrics;
  injection: InjectionInfo;
}

interface TestError {
  ok: false;
  message: string;
}

type TestOutcome = TestResult | TestError;

function SpinnerIcon() {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden
      style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}
    >
      <title>로딩</title>
      <circle
        cx="6.5"
        cy="6.5"
        r="5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="22"
        strokeDashoffset="15"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 13 13" fill="none" aria-hidden>
      <title>실행</title>
      <path
        d="M3.5 2.5l7 4-7 4V2.5z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      style={{
        transition: "transform var(--transition-fast)",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        flexShrink: 0,
      }}
    >
      <title>{open ? "접기" : "펼치기"}</title>
      <path
        d="M3 4.5l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface PromptEditorProps {
  name: string;
  defaultValue: string;
  promptType: PromptType;
  prefixPrompt?: string;
  enableTestPanel?: boolean;
}

export function PromptEditor({
  name,
  defaultValue,
  promptType,
  prefixPrompt,
  enableTestPanel = true,
}: PromptEditorProps) {
  const [promptValue, setPromptValue] = useState(defaultValue);
  const [panelOpen, setPanelOpen] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [targetLang, setTargetLang] = useState("ko");
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<TestOutcome | null>(null);
  const [showThinking, setShowThinking] = useState(false);
  const [showRawResult, setShowRawResult] = useState(false);
  const [showConstructed, setShowConstructed] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const targetLangInputId = useId();
  const userMessageInputId = useId();

  const labelStyle: React.CSSProperties = {
    fontSize: "var(--text-xs)",
    fontWeight: "var(--weight-medium)",
    color: "var(--text-tertiary)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  };

  async function runTest() {
    if (loading || !userMessage.trim()) return;
    setLoading(true);
    setOutcome(null);
    setShowThinking(false);
    setShowRawResult(false);

    try {
      const mergedSystemPrompt = [prefixPrompt?.trim(), promptValue.trim()]
        .filter(Boolean)
        .join("\n\n");

      const res = await fetch("/api/admin/prompts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: mergedSystemPrompt,
          userMessage: userMessage.trim(),
          promptType,
          targetLang: targetLang.trim() || "ko",
        }),
      });

      const data = (await res.json()) as {
        result?: string;
        rawResult?: string;
        thinkingContent?: string | null;
        constructedUserMessage?: string;
        metrics?: TestMetrics;
        injection?: InjectionInfo;
        error?: string;
      };

      if (!res.ok || data.error) {
        setOutcome({ ok: false, message: data.error ?? `HTTP ${res.status}` });
      } else if (!data.metrics) {
        setOutcome({
          ok: false,
          message: "테스트 결과 메트릭을 읽지 못했습니다.",
        });
      } else {
        setOutcome({
          ok: true,
          text: data.result ?? "",
          rawResult: data.rawResult ?? data.result ?? "",
          thinkingContent: data.thinkingContent ?? null,
          constructedUserMessage: data.constructedUserMessage ?? "",
          metrics: data.metrics,
          injection: data.injection ?? {
            detected: false,
            score: 0,
            reason: "",
          },
        });
        setTimeout(
          () =>
            resultRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            }),
          50,
        );
      }
    } catch (err) {
      setOutcome({
        ok: false,
        message:
          err instanceof Error ? err.message : "네트워크 오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      {prefixPrompt ? (
        <p
          style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}
        >
          이 테스트는 현재 공통 기본 프롬프트와 아래 작업 프롬프트를 합쳐서
          실행됩니다.
        </p>
      ) : null}

      {/* System prompt textarea — controlled so test panel sees latest value */}
      <textarea
        name={name}
        value={promptValue}
        onChange={(e) => setPromptValue(e.target.value)}
        className="admin-field"
        style={{
          minHeight: 280,
          resize: "vertical",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "var(--text-sm)",
          lineHeight: 1.65,
        }}
      />

      {/* Test panel */}
      {enableTestPanel ? (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
          {/* Toggle header */}
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--space-3) var(--space-4)",
              background: panelOpen ? "var(--bg-raised)" : "transparent",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--weight-medium)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition:
                "background var(--transition-fast), color var(--transition-fast)",
              gap: "var(--space-2)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = "var(--text-primary)";
              if (!panelOpen) el.style.background = "var(--bg-raised)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = "var(--text-secondary)";
              if (!panelOpen) el.style.background = "transparent";
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <svg
                width={13}
                height={13}
                viewBox="0 0 13 13"
                fill="none"
                aria-hidden
              >
                <title>프롬프트 테스트</title>
                <path
                  d="M3.5 2.5l7 4-7 4V2.5z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
              프롬프트 테스트
            </span>
            <ChevronIcon open={panelOpen} />
          </button>

          {panelOpen && (
            <div
              style={{
                borderTop: "1px solid var(--border)",
                padding: "var(--space-4)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
                background: "var(--bg-raised)",
              }}
            >
              {/* Config row: language */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "var(--space-3)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                  }}
                >
                  <label htmlFor={targetLangInputId} style={labelStyle}>
                    대상 언어 코드
                  </label>
                  <input
                    id={targetLangInputId}
                    type="text"
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    placeholder="ko, en, ja, zh …"
                    className="admin-field"
                    style={{ fontSize: "var(--text-sm)" }}
                  />
                  <p
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    번역·요약 대상 언어. 실제 파이프라인과 동일하게 적용됩니다.
                  </p>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                  }}
                >
                  <span style={labelStyle}>프롬프트 유형</span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      height: 38,
                      padding: "0 var(--space-3)",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                      background: "var(--bg-panel)",
                      fontSize: "var(--text-sm)",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {promptType}
                  </div>
                  <p
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    현재 탭 기준으로 자동 선택됩니다.
                  </p>
                </div>
              </div>

              {/* User message input */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                <label htmlFor={userMessageInputId} style={labelStyle}>
                  테스트 본문
                </label>
                <textarea
                  id={userMessageInputId}
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  placeholder="LLM에게 전달할 원문을 입력하세요…"
                  className="admin-field"
                  style={{
                    minHeight: 120,
                    resize: "vertical",
                    fontSize: "var(--text-sm)",
                    lineHeight: 1.6,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                      void runTest();
                  }}
                />
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Ctrl+Enter로 즉시 실행. 위 프롬프트의 현재 내용(미저장 포함)이
                  그대로 적용됩니다.
                </p>
              </div>

              {/* Run button */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={runTest}
                  disabled={loading || !userMessage.trim()}
                  className="admin-btn-primary"
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      <SpinnerIcon />
                      실행 중…
                    </>
                  ) : (
                    <>
                      <PlayIcon />
                      테스트 실행
                    </>
                  )}
                </button>
              </div>

              {/* Results */}
              {outcome && (
                <div
                  ref={resultRef}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-3)",
                  }}
                >
                  {/* Metrics bar */}
                  {outcome.ok && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "var(--radius-full)",
                          background: "var(--color-success)",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--weight-semibold)",
                          color: "var(--color-success)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        응답 결과
                      </span>
                      <span
                        style={{
                          fontSize: "var(--text-xs)",
                          color: "var(--text-tertiary)",
                          marginLeft: "auto",
                        }}
                      >
                        {outcome.metrics.durationMs.toLocaleString()}ms
                        {outcome.metrics.tokensPerSecond != null && (
                          <>
                            {" "}
                            · {outcome.metrics.tokensPerSecond.toFixed(1)} tok/s
                          </>
                        )}
                        {outcome.metrics.inputTokens != null && (
                          <>
                            {" "}
                            · in {outcome.metrics.inputTokens} / out{" "}
                            {outcome.metrics.outputTokens} tok
                          </>
                        )}
                        {outcome.metrics.reasoningTokens != null &&
                          outcome.metrics.reasoningTokens > 0 && (
                            <>
                              {" "}
                              ·{" "}
                              <span style={{ color: "var(--color-warning)" }}>
                                추론 {outcome.metrics.reasoningTokens} tok
                              </span>
                            </>
                          )}
                        {" · "}
                        {outcome.metrics.model}
                      </span>

                      {/* Prompt injection badge */}
                      {outcome.injection.detected && (
                        <span
                          title={`score: ${outcome.injection.score} · ${outcome.injection.reason}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "var(--space-1)",
                            padding: "2px var(--space-2)",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--color-failed)",
                            background:
                              "color-mix(in srgb, var(--color-failed) 10%, transparent)",
                            color: "var(--color-failed)",
                            fontSize: "var(--text-xs)",
                            fontWeight: "var(--weight-semibold)",
                            whiteSpace: "nowrap",
                            cursor: "default",
                          }}
                        >
                          <svg
                            width={10}
                            height={10}
                            viewBox="0 0 10 10"
                            fill="none"
                            aria-hidden
                          >
                            <title>경고</title>
                            <path
                              d="M5 1L9 8.5H1L5 1z"
                              stroke="currentColor"
                              strokeWidth="1.1"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M5 4v2M5 7.5h.01"
                              stroke="currentColor"
                              strokeWidth="1.1"
                              strokeLinecap="round"
                            />
                          </svg>
                          인젝션 탐지{" "}
                          {Math.round(outcome.injection.score * 100)}%
                        </span>
                      )}

                      {/* Result raw/cleaned toggle — only when thinking content exists */}
                      {outcome.thinkingContent && (
                        <button
                          type="button"
                          onClick={() => setShowRawResult((v) => !v)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-1)",
                            padding: "2px var(--space-2)",
                            borderRadius: "var(--radius-sm)",
                            border: `1px solid ${showRawResult ? "var(--color-warning)" : "var(--border)"}`,
                            background: showRawResult
                              ? "color-mix(in srgb, var(--color-warning) 10%, transparent)"
                              : "transparent",
                            color: showRawResult
                              ? "var(--color-warning)"
                              : "var(--text-tertiary)",
                            fontSize: "var(--text-xs)",
                            cursor: "pointer",
                            transition: "all var(--transition-fast)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <svg
                            width={11}
                            height={11}
                            viewBox="0 0 11 11"
                            fill="none"
                            aria-hidden
                          >
                            <title>결과 보기</title>
                            <rect
                              x="1.5"
                              y="2"
                              width="8"
                              height="7"
                              rx="1"
                              stroke="currentColor"
                              strokeWidth="1.1"
                            />
                            <path
                              d="M3.5 4.5h4M3.5 6.5h2"
                              stroke="currentColor"
                              strokeWidth="1.1"
                              strokeLinecap="round"
                            />
                          </svg>
                          결과에 추론 {showRawResult ? "포함됨" : "제외됨"}
                        </button>
                      )}

                      {/* Separate thinking block toggle */}
                      {outcome.thinkingContent && (
                        <button
                          type="button"
                          onClick={() => setShowThinking((v) => !v)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-1)",
                            padding: "2px var(--space-2)",
                            borderRadius: "var(--radius-sm)",
                            border: `1px solid ${showThinking ? "var(--color-warning)" : "var(--border)"}`,
                            background: showThinking
                              ? "color-mix(in srgb, var(--color-warning) 10%, transparent)"
                              : "transparent",
                            color: showThinking
                              ? "var(--color-warning)"
                              : "var(--text-tertiary)",
                            fontSize: "var(--text-xs)",
                            cursor: "pointer",
                            transition: "all var(--transition-fast)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <svg
                            width={11}
                            height={11}
                            viewBox="0 0 11 11"
                            fill="none"
                            aria-hidden
                          >
                            <title>추론 보기</title>
                            <circle
                              cx="5.5"
                              cy="5.5"
                              r="4"
                              stroke="currentColor"
                              strokeWidth="1.2"
                            />
                            <path
                              d="M5.5 3.5v2.5l1.5 1"
                              stroke="currentColor"
                              strokeWidth="1.1"
                              strokeLinecap="round"
                            />
                          </svg>
                          추론 과정 {showThinking ? "숨기기" : "보기"}
                        </button>
                      )}

                      {/* Constructed message toggle */}
                      <button
                        type="button"
                        onClick={() => setShowConstructed((v) => !v)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-1)",
                          padding: "2px var(--space-2)",
                          borderRadius: "var(--radius-sm)",
                          border: `1px solid ${showConstructed ? "var(--brand)" : "var(--border)"}`,
                          background: showConstructed
                            ? "var(--brand-subtle)"
                            : "transparent",
                          color: showConstructed
                            ? "var(--brand)"
                            : "var(--text-tertiary)",
                          fontSize: "var(--text-xs)",
                          cursor: "pointer",
                          transition: "all var(--transition-fast)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        실제 전달 메시지 {showConstructed ? "숨기기" : "보기"}
                      </button>
                    </div>
                  )}

                  {/* Error result */}
                  {!outcome.ok && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "var(--radius-full)",
                          background: "var(--color-failed)",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--weight-semibold)",
                          color: "var(--color-failed)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        오류
                      </span>
                    </div>
                  )}

                  {/* Constructed message */}
                  {outcome.ok && showConstructed && (
                    <div
                      style={{
                        padding: "var(--space-3)",
                        borderRadius: "var(--radius-lg)",
                        border: "1px solid var(--brand)",
                        background: "var(--brand-subtle)",
                        fontSize: "var(--text-xs)",
                        fontFamily: "var(--font-mono)",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {outcome.constructedUserMessage}
                    </div>
                  )}

                  {/* Thinking content — separate expandable block */}
                  {outcome.ok && showThinking && outcome.thinkingContent && (
                    <div
                      style={{
                        padding: "var(--space-3)",
                        borderRadius: "var(--radius-lg)",
                        border:
                          "1px solid color-mix(in srgb, var(--color-warning) 40%, transparent)",
                        background:
                          "color-mix(in srgb, var(--color-warning) 6%, transparent)",
                        fontSize: "var(--text-xs)",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <p
                        style={{
                          fontWeight: "var(--weight-semibold)",
                          color: "var(--color-warning)",
                          marginBottom: "var(--space-2)",
                          fontSize: "var(--text-xs)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        추론 과정 (포스팅 제외)
                      </p>
                      {outcome.thinkingContent}
                    </div>
                  )}

                  {/* Main result */}
                  <div
                    style={{
                      padding: "var(--space-4)",
                      borderRadius: "var(--radius-lg)",
                      border: `1px solid ${outcome.ok ? "var(--color-success-border)" : "var(--color-failed-border)"}`,
                      background: outcome.ok
                        ? "var(--color-success-bg)"
                        : "var(--color-failed-bg)",
                      color: outcome.ok
                        ? "var(--text-primary)"
                        : "var(--color-failed)",
                      fontSize: "var(--text-sm)",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {outcome.ok
                      ? (showRawResult ? outcome.rawResult : outcome.text) ||
                        "(빈 응답)"
                      : outcome.message}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
