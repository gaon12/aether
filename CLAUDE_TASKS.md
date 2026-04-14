# Claude 담당 업무

## 역할 요약

**PM + 디자인 시스템 + 대시보드 UI** 담당.  
프로젝트 전체 조율, 디자인 시스템 구축, 대시보드 6개 화면 UI 구현, 컴포넌트 라이브러리를 책임진다.

---

## PM 역할

- GEMINI_TASKS.md, CODEX_TASKS.md, CLAUDE_TASKS.md 유지 관리
- SHARES.md를 통한 팀 간 의사소통 중재
- 개발 우선순위 및 단계 조율
- 타입 인터페이스 충돌 방지 (DB 타입, API 타입, LLM 타입 통일)

---

## 1단계: 디자인 시스템 기반 구성

### 1-1. 글로벌 CSS 변수 시스템

- `app/globals.css` 재구성
- CSS 변수 기반 컬러 토큰:
  - 시맨틱 컬러: `--color-success`, `--color-failed`, `--color-ignored`, `--color-queued`, `--color-warning`, `--color-injection`
  - 배경, 서피스, 보더, 텍스트 계층 토큰
- 라이트/다크모드 지원 (`prefers-color-scheme` + 수동 토글 대비)
- 다국어(i18n) 설계 고려

### 1-2. 기본 컴포넌트 라이브러리

`src/components/ui/` 디렉터리:

- `KpiCard.tsx` — 지표 카드 (수치 + 라벨 + 변화량)
- `StatusBadge.tsx` — 상태 배지 (`success | failed | ignored | queued | expired | token_warning | prompt_injection_suspected`)
- `DataTable.tsx` — 정렬/필터 지원 테이블
- `FilterBar.tsx` — 필터 입력 모음 (날짜 범위, 상태 선택, 검색)
- `TimeseriesChart.tsx` — 시계열 차트 (경량 라이브러리 사용)
- `DetailDrawer.tsx` — 상세 드로어/모달
- `SectionHeader.tsx` — 화면 섹션 헤더
- `EmptyState.tsx` — 데이터 없음 상태
- `ErrorState.tsx` — 에러 상태

### 1-3. 레이아웃

- `src/components/layout/Sidebar.tsx` — 네비게이션 사이드바 (6개 화면)
- `src/components/layout/DashboardLayout.tsx` — 대시보드 공통 레이아웃
- `app/(dashboard)/layout.tsx` — Next.js 레이아웃 연결

---

## 2단계: 대시보드 화면 구현

Gemini가 구현한 API를 호출하는 클라이언트 컴포넌트 작성.

### 2-1. 개요 화면 (Overview)

- `app/(dashboard)/page.tsx` 또는 `app/(dashboard)/overview/page.tsx`
- 표시 항목:
  - 업타임 카드
  - 최근 성공/실패/무시 KPI 카드 (3개)
  - 평균 처리 시간 / p95 처리 시간 카드
  - 워커 상태 배지
  - 최근 에러 목록 (테이블)
  - Reply quota 사용량 게이지

### 2-2. 요청 분석 화면 (Request Analytics)

- `app/(dashboard)/requests/page.tsx`
- 표시 항목:
  - 시간대별 요청량 시계열 차트
  - 명령 종류별 비율 (도넛 또는 바 차트)
  - 번역/요약/복합 요청 비율
  - 대상 언어 분포
  - 원문 언어 분포
  - 짧아서 무시된 요청 수 카드
  - 이미지 전용 미지원 요청 수 카드

### 2-3. 명령 품질 화면 (Command Quality)

- `app/(dashboard)/command-quality/page.tsx`
- 표시 항목:
  - 잘못된 명령어 비율 KPI
  - 자주 틀리는 명령 패턴 테이블
  - 가장 많이 등장한 오타 목록
  - 파싱 실패 사유 분포
  - 중복 요청 수 카드

### 2-4. 응답 탐색 화면 (Response Explorer)

- `app/(dashboard)/responses/page.tsx`
- 표시 항목:
  - 필터 바 (날짜 범위, 상태, 명령 유형)
  - 최근 처리 답변 테이블 (request_id, 명령, 상태, 시간)
  - 행 클릭 시 상세 드로어:
    - 원문 텍스트
    - 파싱 결과
    - 최종 응답 텍스트
    - 답글 발행 성공 여부
    - request_id / reply_id / 생성 시간

### 2-5. 프롬프트 인젝션 화면 (Prompt Injection)

- `app/(dashboard)/prompt-injections/page.tsx`
- 표시 항목:
  - 인젝션 시도 수 KPI 카드
  - 시간대별 추이 시계열 차트
  - 자주 나온 패턴 목록
  - 의심 점수 분포 히스토그램
  - 요청별 상세 테이블 (점수, reason, excerpt)

### 2-6. 플랫폼 상태 화면 (Platform Status)

- `app/(dashboard)/platform/page.tsx`
- 표시 항목:
  - Threads 연결 상태 배지
  - 토큰 상태 + 만료 예정 시각 카드
  - 마지막 갱신 시도 시간
  - Webhook 수신 상태 (최근 수신 시각)
  - 워커 마지막 heartbeat 시각
  - SQLite 파일 상태 (용량, 경로 마스킹)

---

## 3단계: 데이터 페칭 레이어

- `src/features/dashboard/` 디렉터리
  - `useOverview.ts` — 개요 API 훅
  - `useRequests.ts` — 요청 목록 훅
  - `useReplies.ts` — 답글 목록 훅
  - `usePromptInjections.ts` — 인젝션 데이터 훅
  - `useHealth.ts` — 헬스 데이터 훅

---

## 4단계: i18n 기반 다국어 지원

- 기본 언어: 한국어(ko), 영어(en)
- 라벨, 상태 텍스트, 에러 메시지 등 문자열 분리
- `src/lib/i18n.ts` 또는 Next.js i18n 구성

---

## 디자인 원칙 (Doc.md §15 준수)

- 과한 시각 장식 금지
- 정보 밀도 높되 읽기 피로도 낮게
- 단정하고 차분한 톤 (운영 패널 스타일)
- 상태값 일관된 색상 체계
- 데스크톱 우선, 태블릿 대응, 모바일 읽기 전용 축소
- 라이트/다크모드 지원

---

## 협업 인터페이스

- API 응답 타입은 Gemini가 정의한 `src/types/api.ts` 사용
- DB 타입은 `src/types/db.ts` 사용
- LLM 관련 타입은 Codex가 정의한 `src/types/llm.ts` 참조
- API 경로 변경 시 반드시 SHARES.md에 공지
