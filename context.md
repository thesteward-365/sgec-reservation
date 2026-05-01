# 프로젝트 컨텍스트 (SGEC Reservation)

> 이 파일은 작업 세션 상태를 기록합니다. 새 세션 시작 시 이 파일을 가장 먼저 읽으세요.

## 1. 현재 상태

- **Phase 1 (초기화) 완료**: 프로젝트 뼈대 구축 및 개발 환경 설정 완료.
- **진행 중**: Phase 2 (DB 및 인증) 진입 준비.

## 2. 작업 내역 (Phase 1 완료)

- **프레임워크**: Next.js 15 (App Router) 초기화 및 `src` 구조 세팅.
- **디자인 시스템**:
  - `src/styles/token.css`를 `src/styles/globals.css`에 연동.
  - Pretendard 폰트 및 로고 에셋 최적화 (`public/fonts`, `public/logos`).
- **PWA**: `next-pwa` 및 `manifest.json` 설정 완료.
- **도구 및 테스트**:
  - Storybook 10, Vitest, Playwright 설치 및 환경 구성.
  - ESLint, Prettier 설정 및 Turbopack 호환성 패치.
- **기타**: `.env.local`, `.env.example` 정의 완료.

## 3. 기술 스택 (확정)

- **Framework**: Next.js 15, TypeScript
- **DB/ORM**: SQLite (WAL), Drizzle ORM
- **Auth**: iron-session (httpOnly 쿠키, 365일 유지)
- **Style**: Tailwind CSS v4 + Wanted Design Tokens
- **PWA**: next-pwa
- **Test**: Vitest, Playwright, Storybook

## 4. 아키텍처 & 규칙

- **모바일 퍼스트**: 최대 너비 430px 중앙 정렬 레이아웃 필수.
- **Storybook 우선**: UI 컴포넌트 선 개발 후 조립.
- **DB 기준**: Google Calendar 불일치 시 로컬 DB 데이터를 우선함.

## 5. 주요 디렉토리

- `src/app/`: 라우팅 및 페이지
- `src/components/`: UI 컴포넌트
- `src/lib/`: DB, 인증, 비즈니스 로직
- `src/styles/`: 디자인 토큰 및 HTML 프리뷰
- `public/`: 정적 에셋 (fonts, logos, manifest)

## 6. 다음 단계

- **Phase 2. DB 및 인증**:
  - `better-sqlite3` + Drizzle ORM 설치 및 스키마 정의.
  - `iron-session` 연동 및 로그인/로그아웃 Route Handler 구현.

---

_마지막 업데이트: 2026-05-01_
