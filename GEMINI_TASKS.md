# Gemini 담당 업무

## 역할 요약

**백엔드 인프라 & 플랫폼 연동** 담당.  
Next.js Route Handler 기반 API, SQLite3 DB 설계 및 마이그레이션, Threads OAuth/토큰 관리, Webhook 수신 엔드포인트, 큐 시스템 구성을 책임진다.

---

## 1단계: 데이터베이스 기반 구성

### 1-1. DB 초기화 및 마이그레이션 스크립트

- [x] `scripts/migrate.ts` 작성
- [x] WAL 모드 활성화
- [x] 아래 테이블 생성 DDL 작성:
  - `threads_accounts`
  - `webhook_events`
  - `requests`
  - `replies`
  - `prompt_injection_events`
  - `llm_runs`
  - `worker_heartbeats`
  - `metrics_hourly`
- [x] 모든 ID는 UUIDv7 (또는 동등한 시간 정렬 가능 UUID 전략) 사용
- [x] 모든 시간 필드 명시적으로 포함 (`created_at`, `updated_at`, `received_at` 등)
- [x] 인덱스 명확히 설계 (통계 쿼리 최적화 고려)

### 1-2. DB 클라이언트 설정

- [x] `src/server/db/` 디렉터리에 SQLite3 클라이언트 래퍼 구현
- [x] 싱글턴 패턴으로 연결 관리
- [x] 환경변수 `SQLITE_DB_PATH`로 파일 경로 지정 (하드코딩 금지)
- [x] TypeScript 타입 정의 (`src/types/db.ts`)

---

## 2단계: Threads 플랫폼 연동

### 2-1. Threads OAuth 흐름

- [x] `app/api/auth/threads/callback/route.ts`
  - [x] OAuth callback 처리
  - [x] access token 수신 및 암호화 후 `threads_accounts` 저장
  - [x] token_expires_at 계산 및 저장

### 2-2. 토큰 관리 모듈

- [x] `src/server/threads/token.ts`
  - [x] 저장된 토큰 로드
  - [x] 만료 예정 감지 (threshold 설정 가능)
  - [x] long-lived access token 갱신 API 호출
  - [x] 갱신 결과 DB 저장 및 로그
  - [x] 갱신 실패 시 오류 상태 기록

### 2-3. Webhook 수신 엔드포인트

- [x] `app/api/webhooks/threads/route.ts`
  - [x] 요청 서명 검증
  - [x] raw payload를 `webhook_events`에 즉시 저장
  - [x] 중복 이벤트 확인 (provider_event_key 기준)
  - [x] 처리 작업을 큐에 적재
  - [x] 즉시 200 응답
  - [x] **금지**: 직접 모델 호출, 직접 Threads 답글 발행, 무거운 DB 집계 쿼리

---

## 3단계: 큐 시스템

### 3-1. 인메모리 큐 구현

- [x] `src/server/queue/` 디렉터리
- [x] DB 기반 영속 큐 (SQLite `requests` 테이블의 status 컬럼 활용)
- [x] 워커가 `queued` 상태 레코드를 polling 방식으로 소비
- [x] 워커와의 인터페이스 타입 정의

---

## 4단계: 대시보드 API 엔드포인트

Claude가 설계한 UI에서 사용할 API를 구현한다.

### 4-1. 개요 API

- [x] `app/api/dashboard/overview/route.ts`
  - [x] 업타임 (server start time 기준)
  - [x] 최근 N분 성공/실패/무시 수
  - [x] 평균 처리 시간, p95 처리 시간
  - [x] 현재 워커 상태 (worker_heartbeats 기준)
  - [x] 최근 에러 목록
  - [x] reply quota 사용량

### 4-2. 요청 목록 API

- [x] `app/api/dashboard/requests/route.ts`
  - [x] 페이지네이션 지원
  - [x] 필터: 상태, 명령 유형, 날짜 범위
  - [x] 정렬: 최신순

### 4-3. 답글 목록 API

- [x] `app/api/dashboard/replies/route.ts`
  - [x] request_id 기준 join
  - [x] publish_status 필터

### 4-4. 프롬프트 인젝션 API

- [x] `app/api/dashboard/prompt-injections/route.ts`
  - [x] 시간대별 집계
  - [x] 점수 분포
  - [x] 상세 목록 (excerpt 포함)

### 4-5. 헬스 API

- [x] `app/api/dashboard/health/route.ts`
  - [x] Threads 연결 상태
  - [x] 토큰 상태 및 만료 예정 시각
  - [x] Webhook 수신 상태 (최근 수신 시간)
  - [x] 워커 마지막 heartbeat
  - [x] SQLite 파일 상태

---

## 5단계: 환경변수 및 설정

- [x] `.env.example` 작성 (아래 키 포함)
  - [x] `SQLITE_DB_PATH`
  - [x] `THREADS_APP_ID`
  - [x] `THREADS_APP_SECRET`
  - [x] `THREADS_WEBHOOK_SECRET`
  - [x] `TOKEN_ENCRYPTION_KEY`
  - [x] `NEXT_PUBLIC_APP_URL`
  - [x] `OPENAI_BASE_URL` (로컬 모델 서버 주소)
  - [x] `OPENAI_MODEL_NAME`

---

## 주의사항

- 비밀값 하드코딩 절대 금지
- 모든 시간 필드 UTC ISO 8601 형식 저장
- UUID 없이 숫자 ID만 쓰는 방식 금지
- Webhook endpoint는 반드시 가볍게 유지
- 의문사항은 SHARES.md에 기록

## 협업 인터페이스

- DB 스키마 확정 후 `src/types/db.ts`에 타입 export → Codex, Claude 공유 사용
- API 응답 타입은 `src/types/api.ts`에 별도 정의
- 큐 인터페이스 (`src/server/queue/types.ts`) → Codex 워커가 소비
