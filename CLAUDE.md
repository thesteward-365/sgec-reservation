# CLAUDE.md (SGEC Reservation)

## 프로젝트 개요

샘깊은교회(SGEC) 장소 예약 서비스. 날짜/장소별 예약 및 Google Calendar 동기화.

- 명세서: [features.md](features.md) / 로드맵: [todo.md](todo.md)
- 컨벤션 & 아키텍처: [CONVENTIONS.md](CONVENTIONS.md)

## 기술 스택

- **Framework**: Next.js 15 (App Router), TypeScript
- **DB/ORM**: SQLite (WAL), Drizzle ORM
- **Auth**: iron-session (httpOnly 쿠키, 365일 유지)
- **Style**: Tailwind CSS, [design-system/](design-system/)
- **PWA**: next-pwa
- **UI/Test**: Storybook, Vitest, Playwright
- **Deploy**: Docker (Standalone 모드)

## 주요 명령어

- `npm run dev`: 개발 서버
- `npm run db:generate | db:migrate`: DB 마이그레이션
- `npm run storybook`: UI 개발
- `npm run test | test:e2e`: 테스트 실행

## 개발 원칙 (핵심)

1. **모바일 퍼스트**: 최대 430px 중앙 정렬 레이아웃.
2. **Storybook 우선**: UI 컴포넌트는 독립적으로 선 개발.
3. **로직 테스트**: 예약 엔진 등 핵심 로직은 Vitest 필수.
4. **30분 슬롯**: 예약은 30분 단위, 트랜잭션으로 중복 방지.
5. **DB 기준**: Google Calendar 불일치 시 우리 DB 데이터를 우선함.

## 디렉토리 구조

- `app/`: 라우팅 및 페이지
- `components/`: UI 컴포넌트 & 스토리
- `lib/`: DB, 인증, 서비스 로직, 캘린더 연동
- `tests/`: 테스트 코드
- `public/`: 폰트, 로고, 아이콘
