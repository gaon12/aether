/**
 * Centralised string constants for the Aether dashboard UI.
 * Default language: Korean (ko).
 *
 * All user-visible labels, status text and error messages should be sourced
 * from this file so that adding an English locale later requires changes
 * only here, not scattered across components.
 */

export const STATUS_LABELS = {
  success: "성공",
  failed: "실패",
  ignored: "무시됨",
  queued: "대기 중",
  received: "수신됨",
  parsing: "파싱 중",
  ready: "준비됨",
  running_llm: "LLM 실행 중",
  publishing_reply: "답글 발행 중",
  succeeded: "성공",
  expired: "만료됨",
  token_warning: "토큰 경고",
  prompt_injection_suspected: "인젝션 의심",
  pending: "대기",
} as const;

export const COMMAND_LABELS = {
  translate: "번역",
  summary: "요약",
  translate_summary: "번역+요약",
} as const;

export const THEME_LABELS = {
  system: "시스템",
  light: "라이트",
  dark: "다크",
} as const;

export const PLATFORM_STATUS_LABELS = {
  online: "정상",
  warning: "경고",
  offline: "오프라인",
  ok: "정상",
  degraded: "저하됨",
  unknown: "알 수 없음",
} as const;

export const ERRORS = {
  load_failed: "데이터를 불러오지 못했습니다.",
  retry_failed: "재처리 요청에 실패했습니다.",
  not_found: "항목을 찾을 수 없습니다.",
} as const;

export const EMPTY = {
  no_data: "데이터가 없습니다.",
  no_requests: "조건에 맞는 요청이 없습니다.",
  no_replies: "조건에 맞는 응답이 없습니다.",
  no_injections: "인젝션 이벤트가 없습니다.",
  no_errors: "최근 오류가 없습니다.",
} as const;

export const DRAWER = {
  identifiers: "식별자",
  result: "처리 결과",
  source: "원문 텍스트",
  response: "최종 응답",
  request_id: "요청 ID",
  reply_id: "답글 ID",
  created_at: "생성 시각",
  status: "상태",
  error_code: "발행 오류 코드",
  published_at: "발행 시각",
  command_raw: "명령 원문",
  source_text: "원문",
  reply_text: "응답 텍스트",
  none: "없음",
} as const;
