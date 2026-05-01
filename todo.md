# 프로젝트 TODO

샘깊은교회 장소 예약 서비스 — 생성부터 배포·운영까지 전체 작업 목록

---

## UI 구현 원칙

> **디자인 기준**: `styles/token.css` 토큰 + `styles/preview/` 컴포넌트 패턴
>
> - 버튼: pill(`--radius-pill`) 기본 CTA, `--radius-sm` 조밀한 행
> - 카드: `border: 1px solid var(--color-border-subtle)`, `border-radius: var(--radius-2xl)`, shadow 없음
> - 모달: `border-radius: var(--radius-3xl)` (32px)
> - 인풋: `border-radius: var(--radius-sm)` (8px)
> - 색상: `--color-accent` (#0066FF) 단일 포인트, 배경 white, 보더 `rgba(112,115,124,0.22)`
> - 다크 테마: `[data-theme="dark"]` 또는 `.theme-dark`

---

## Phase 1. 프로젝트 초기화

- [x] Next.js 15 프로젝트 생성 (`create-next-app`, App Router, TypeScript)
- [x] ESLint / Prettier 설정
- [x] Tailwind CSS 설치 및 `styles/token.css` 토큰 연동
  - `styles/globals.css`에서 import, 폰트 경로 `/fonts/...` 절대경로로 수정
- [x] Pretendard 폰트 (`public/fonts/`에 woff2 복사) 로드 설정
- [x] `next.config.ts` — `output: 'standalone'` 설정
- [x] `next-pwa` 설치 및 `manifest.json` 작성 (앱 이름·아이콘·`display: standalone`)
- [x] Storybook 설치 및 초기 설정 (`npx storybook@latest init`)
- [x] Vitest 설치 및 `vitest.config.ts` 설정
- [x] Playwright 설치 및 초기 설정 (`npx playwright install`)
- [x] 디렉토리 구조 세팅 (`app/`, `lib/`, `components/`, `tests/`)
- [x] 환경 변수 파일 정의 (`.env.local`, `.env.example`)

---

## Phase 2. DB 및 인증

### DB

- [x] `better-sqlite3` + Drizzle ORM 설치
- [x] SQLite WAL 모드 활성화
- [x] 스키마 정의
  - [x] `users` (이름, 전화번호, 역할, 승인 상태)
  - [x] `floors` (층)
  - [x] `places` (장소, 층 FK, 태그 관계)
  - [x] `tags`
  - [x] `place_tags`
  - [x] `reservations` (사용자 FK, 장소 FK, 시작·종료 시간, 목적, 구글 event_id)
  - [x] `calendar_settings` (구글 OAuth 토큰, 캘린더 ID)
  - [x] `sync_log` (동기화 오류 기록)
- [x] `db:generate` / `db:migrate` 명령어 확인

### 인증 (iron-session)

- [x] `iron-session` 설치 및 세션 설정 (`maxAge: 365일`)
- [x] 세션 타입 정의 (`SessionData`)
- [x] 로그인 Route Handler (`POST /api/auth/login`) — 이름 + 전화번호
- [x] 로그아웃 Route Handler (`POST /api/auth/logout`)
- [x] 세션 미들웨어 — 미승인 사용자 접근 차단, 관리자 전용 경로 보호

---

## Phase 3. 공용 컴포넌트 (shadcn/ui + 디자인 시스템)

> **전략**: `shadcn/ui`의 구조를 기반으로 `styles/preview/`의 시각적 요소를 적용한다.
> 모든 컴포넌트는 Storybook 스토리를 함께 작성한다.

### 초기 설정

- [x] `shadcn/ui` 초기화 (`npx shadcn@latest init`)
- [x] `styles/globals.css` — shadcn 테마 변수를 `token.css` 토큰과 매핑
- [x] `lib/utils.ts` — `cn` (clsx + tailwind-merge) 유틸리티 확인

### 기본 UI 컴포넌트 커스터마이징

- [x] **Button**: `preview/buttons.html` 기준 (pill, --radius-sm 등 Variant 정의)
- [ ] **Card**: `preview/cards.html` 기준 (border-subtle, --radius-2xl, shadow-none)
- [ ] **Input**: `preview/inputs.html` 기준 (--radius-sm)
- [ ] **Badge**: `preview/badges.html` 기준 (태그 및 상태 표시)
- [ ] **Dialog (Modal)**: `preview/elevation.html` 기준 (--radius-3xl)
- [ ] **Drawer (Bottom Sheet)**: 모바일 전용 UI

### 도메인 특화 컴포넌트

- [ ] **Layout**: 모바일 최대 430px 중앙 정렬 컨테이너
- [ ] **Weekly Calendar**: 주간 이동 및 날짜 선택 로직
- [ ] **Bottom Nav**: 하단 고정 네비게이션
- [ ] **Loading/Skeleton**: `preview/motion.html` 기반 로딩 상태 UI
- [ ] **Toast**: 알림 UI

---

## Phase 4. 인증 페이지

- [ ] 로그인 페이지 (`app/(auth)/login`) — 이름 + 전화번호
- [ ] 회원가입 페이지 (`app/(auth)/signup`)
- [ ] 가입 완료 / 승인 대기 안내 페이지

---

## Phase 5. 사용자 기능

### 예약하기 (`app/(user)/reserve`)

- [ ] 주간 캘린더로 날짜 선택
- [ ] 층 / 태그 필터 UI (`preview/badges.html` 필터칩 패턴)
- [ ] 장소 목록 표시 (카드 리스트)
- [ ] 선택 상태 유지 (뒤로 가기 시 복원)

### 예약 상세 (`app/(user)/reserve/[placeId]`)

- [ ] 선택 날짜 + 장소 기준 예약 현황 조회
- [ ] 예약자 이름 포함 시간 블록 표시
- [ ] 빈 시간 구간 계산 및 선택 UI (30분 단위)
- [ ] 시작·종료 시간 직접 선택 (중간 겹침 불가)
- [ ] 사용 목적 입력 (직접 입력 + 자주 쓰는 목적 선택)
- [ ] 예약 생성 API 연결
- [ ] 예약 수정 API 연결
- [ ] 예약 취소 API 연결

### 예약 완료 (`app/(user)/reserve/complete`)

- [ ] 예약 요약 표시 (장소, 날짜, 시간, 목적)
- [ ] 동일 장소 재예약 버튼
- [ ] 텍스트 복사 / 외부 공유 기능
- [ ] 홈 이동 버튼

### 나의 예약 (`app/(user)/my-reservations`)

- [ ] 주간 캘린더 + 날짜별 예약 표시
- [ ] 전체 예약 목록 (날짜 정렬)
- [ ] 층 / 태그 필터
- [ ] 본인 예약 수정
- [ ] 본인 예약 취소

### 사용자 설정 (`app/(user)/settings`)

- [ ] 로그아웃

---

## Phase 6. 예약 엔진 (Route Handlers)

- [ ] `POST /api/reservations` — 예약 생성 (트랜잭션, 중복 방지)
- [ ] `PATCH /api/reservations/[id]` — 예약 수정
- [ ] `DELETE /api/reservations/[id]` — 예약 취소
- [ ] `GET /api/reservations` — 목록 조회 (날짜·장소·사용자 필터)
- [ ] 30분 슬롯 단위 유효성 검증
- [ ] 동일 장소/시간 중복 체크 (DB 레벨 트랜잭션)
- [ ] **비즈니스 로직 유닛 테스트 (Vitest)**
  - [ ] 시간 겹침 판단 로직 검증
  - [ ] 30분 단위 슬롯 생성 로직 검증
  - [ ] 예약 가능 구간 추출 로직 검증

---

## Phase 7. 관리자 기능

### 대시보드 (`app/(admin)/dashboard`)

- [ ] 오늘 예약 수 표시
- [ ] 승인 대기 사용자 수 표시
- [ ] 최근 활동 로그 (예약 생성/취소, 사용자 승인, 장소 변경)

### 사용자 관리 (`app/(admin)/users`)

- [ ] 사용자 목록 조회
- [ ] 가입 승인 / 거절
- [ ] 관리자 권한 부여 / 해제

### 장소 관리 (`app/(admin)/places`)

- [ ] 층 CRUD
- [ ] 장소 CRUD (층 소속 지정)
- [ ] 태그 관리 (장소별 설정, 재사용)

### 예약 관리 (`app/(admin)/reservations`)

- [ ] 전체 예약 조회
- [ ] 날짜 범위 / 장소 / 층 / 사용자 필터
- [ ] 예약 수정 / 삭제

### 관리자 설정 (`app/(admin)/settings`)

- [ ] Google Calendar OAuth 연결 버튼
- [ ] 내부 캘린더 선택 (Write 대상)
- [ ] 외부 캘린더 선택 (Read 참고용)
- [ ] 동기화 상태 확인
- [ ] 수동 재동기화 트리거
- [ ] 계정 변경 / 연결 해제

---

## Phase 8. Google Calendar 연동

- [ ] Google Cloud 프로젝트 생성 및 Calendar API 활성화
- [ ] OAuth 2.0 클라이언트 ID / 시크릿 발급
- [ ] OAuth 인증 Route Handler (`GET /api/auth/google/callback`)
- [ ] 토큰 저장 및 갱신 (refresh token)
- [ ] 내부 캘린더 — 예약 생성 시 이벤트 생성 (`event_id` 저장)
- [ ] 내부 캘린더 — 예약 수정 시 이벤트 업데이트
- [ ] 내부 캘린더 — 예약 취소 시 이벤트 삭제
- [ ] 외부 캘린더 — 이벤트 조회 및 UI 표시 (참고용)
- [ ] 실패 시 재시도 로직 및 `sync_log` 기록
- [ ] 주기적 보정 동기화 (cron 또는 서버 스케줄러)

---

## Phase 9. 배포 준비

- [ ] `Dockerfile` 작성 (단일 컨테이너, standalone 빌드)
- [ ] `docker-compose.yml` 작성 (볼륨 마운트: SQLite 파일, 폰트)
- [ ] `.dockerignore` 작성
- [ ] SQLite 파일 영구 볼륨 경로 설정
- [ ] 프로덕션 환경 변수 목록 정리
- [ ] `npm run build` 성공 확인
- [ ] 컨테이너 로컬 빌드 및 동작 확인

---

## Phase 10. 배포 & 운영

- [ ] NAS / 온프레미스 서버에 Docker 환경 구성
- [ ] 이미지 배포 (Docker Hub 또는 직접 전송)
- [ ] 컨테이너 실행 및 포트 확인
- [ ] 리버스 프록시 설정 (Nginx 등, HTTPS 인증서)
- [ ] 초기 관리자 계정 생성 (DB 직접 삽입 또는 시드 스크립트)
- [ ] Google Calendar OAuth 프로덕션 도메인 등록
- [ ] PWA 설치 테스트 (홈 화면 추가)
- [ ] 백업 전략 수립 (SQLite 파일 정기 백업)
- [ ] 컨테이너 자동 재시작 설정 (`restart: unless-stopped`)
- [ ] 로그 수집 확인 (Docker 로그)

---

## Phase 11. QA & 테스트

- [ ] **E2E 테스트 시나리오 작성 및 실행 (Playwright)**
  - [ ] 회원가입 및 승인 대기 흐름
  - [ ] 장소 필터링 및 예약 상세 진입 흐름
  - [ ] 예약 생성 -> 완료 -> 확인 흐름
  - [ ] 본인 예약 수정 및 취소 흐름
- [ ] 예약 중복 방지 동시성 테스트
- [ ] Google Calendar 동기화 실패 → 재시도 시나리오 확인
- [ ] 관리자 승인 전 접근 차단 확인
- [ ] PWA 오프라인 동작 확인
- [ ] 모바일 브라우저(Safari, Chrome) UI 점검
