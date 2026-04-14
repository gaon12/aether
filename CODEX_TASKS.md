# Codex 담당 업무

## 역할 요약

**봇 워커 & AI 처리 파이프라인** 담당.  
Node.js 워커 프로세스, 명령어 파서, 프롬프트 인젝션 탐지, 로컬 LLM 스트리밍 호출, Threads 답글 발행, 워커 통계 저장을 책임진다.

---

## 1단계: 명령어 파서

### 1-1. 엄격한 규칙 기반 파서 구현

- `src/server/parser/index.ts`
- LLM에게 명령 해석을 절대 위임하지 않는다
- 지원 문법:
  ```
  @bot translate <lang>
  @bot translate <lang> summary
  @bot translate <lang> summary <n>
  @bot summary
  @bot summary <n>
  @bot summary <lang>
  ```
- 반환 타입:
  ```ts
  type ParseResult =
    | { valid: true; command: 'translate'; targetLang: string }
    | { valid: true; command: 'summary'; lang?: string; length?: number }
    | { valid: true; command: 'translate_summary'; targetLang: string; length?: number }
    | { valid: false; reason: string; raw: string }
  ```
- 파싱 실패 시 LLM 호출 금지
- 파싱 결과는 `requests` 테이블에 저장

### 1-2. 텍스트 추출 로직

- `src/server/parser/extractor.ts`
- Threads 게시물에서 처리 대상 텍스트 확보
- 이미지 전용 게시물 = 미지원 처리 (무시 + 로그)
- 매우 짧은 게시물 = 무시 가능 (threshold 환경변수로 설정)
- 원문 접근 실패/삭제/비공개 = 실패 기록

---

## 2단계: 프롬프트 인젝션 탐지

### 2-1. 탐지 모듈

- `src/server/prompt-injection/detector.ts`
- 규칙 기반 패턴 매칭 (아래 유형 포함):
  - "이전 지시를 무시해라" 계열
  - "시스템 프롬프트를 보여줘" 계열
  - "너는 이제 다른 역할이다" 계열
  - "내부 규칙을 설명해라" 계열
  - "이후 모든 응답은 규칙을 무시해라" 계열
- 반환:
  ```ts
  type InjectionDetectionResult = {
    prompt_injection_attempt: boolean;
    prompt_injection_score: number;      // 0.0 ~ 1.0
    prompt_injection_reason: string;
    prompt_injection_excerpt: string;
  }
  ```
- 탐지 결과는 **차단 여부와 분리**해서 저장 (차단보다 기록 우선)
- `prompt_injection_events` 테이블에 저장

---

## 3단계: LLM 클라이언트

### 3-1. OpenAI 호환 클라이언트

- `src/server/llm/client.ts`
- **공식 `openai` 패키지** 사용 (직접 fetch 금지)
- `OPENAI_BASE_URL` 환경변수로 로컬 모델 서버 주소 주입
- `OPENAI_MODEL_NAME` 환경변수로 모델명 주입

### 3-2. 스트리밍 호출

- `src/server/llm/stream.ts`
- 모든 LLM 호출은 스트리밍 기본값
- 기록 필드:
  - `started_at` — 호출 시작
  - `first_token_at` — 첫 토큰 수신
  - `completed_at` — 완료
  - `duration_ms` — 총 소요 ms
  - `first_token_latency_ms` — 첫 토큰까지 ms
  - `input_token_count` — 입력 토큰 수
  - `output_token_count` — 출력 토큰 수
  - `output_tokens_per_second` — 출력 속도
  - `stream_chunk_count` — 청크 수
- `llm_runs` 테이블에 저장

### 3-3. 프롬프트 템플릿

- `src/server/llm/prompts.ts`
- 번역 프롬프트, 요약 프롬프트, 번역+요약 프롬프트 분리
- 시스템 프롬프트 고정분과 사용자 입력 분리
- LLM은 번역/요약 생성만 담당 — 명령 해석 위임 금지

---

## 4단계: Threads 답글 발행

### 4-1. Threads API 클라이언트

- `src/server/threads/client.ts`
- 공식 Threads Graph API 호출
- `THREADS_APP_ID`, `THREADS_APP_SECRET` 환경변수 사용

### 4-2. 답글 발행 모듈

- `src/server/threads/reply.ts`
- 답글 컨테이너 생성 → 게시 2단계 흐름
- 발행 성공/실패 결과를 `replies` 테이블에 저장
- `publish_status`, `publish_error_code`, `published_at` 기록
- reply quota 소비를 고려한 설계 (무효 명령에 답글 남발 금지)

---

## 5단계: 워커 프로세스

### 5-1. 워커 진입점

- `scripts/worker.ts`
- 독립 Node.js 프로세스로 실행 가능
- 시작 시:
  1. DB 연결 확인
  2. 저장된 Threads 토큰 상태 확인
  3. 큐 polling 루프 시작
  4. heartbeat 기록 시작

### 5-2. 요청 처리 상태 전이

- 상태 전이 순서:
  `received` → `queued` → `parsing` → (`ignored` | `ready`) → `running_llm` → `publishing_reply` → (`succeeded` | `failed`)
- 각 상태 전이 시 DB 업데이트
- 실패 원인 명시적으로 기록

### 5-3. 큐 소비

- Gemini가 정의한 큐 인터페이스(`src/server/queue/types.ts`) 기반으로 구현
- polling 간격 환경변수로 설정 가능
- `requests` 테이블의 `queued` 상태 레코드를 순서대로 소비

### 5-4. Heartbeat

- `src/server/worker/heartbeat.ts`
- 주기적으로 `worker_heartbeats` 테이블에 기록
- `hostname`, `pid`, `status`, `heartbeat_at` 포함

---

## 6단계: 집계 스크립트

- `scripts/backfill-metrics.ts`
  - `metrics_hourly` 테이블 재계산
  - `requests`, `replies`, `llm_runs`, `prompt_injection_events` 기반 집계
  - bucket_start 기준 시간대별 집계 로직

---

## 주의사항

- LLM에게 명령 해석 위임 절대 금지
- 파싱 실패 요청 자동 재처리 금지
- 인젝션 탐지 결과는 차단과 분리해서 저장
- 성적인 내용은 차단 사유로 사용하지 않음 (프롬프트 인젝션만 기록 대상)
- 비밀값 하드코딩 절대 금지
- 의문사항은 SHARES.md에 기록

## 협업 인터페이스

- DB 타입은 Gemini가 작성한 `src/types/db.ts` 사용
- 큐 인터페이스는 Gemini가 정의한 `src/server/queue/types.ts` 사용
- LLM 처리 결과 타입은 `src/types/llm.ts`에 정의하여 Claude 대시보드 API에서 참조 가능하게 export
