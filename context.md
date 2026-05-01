# 프로젝트 컨텍스트

> 이 파일은 Claude와의 작업 세션 상태를 기록합니다. 새 채팅을 시작할 때 이 파일을 참고하세요.

## 현재 상태

기획/설계 단계. 코드 없음. 스택 확정 완료. 디자인 시스템 파일 구조 정비 완료.

## 확정된 결정사항

### 기술 스택
- **프레임워크**: Next.js 15 (App Router) + TypeScript
- **DB**: SQLite (WAL 모드) + Drizzle ORM
- **Auth**: iron-session (httpOnly 쿠키, maxAge 365일 — 세션 영구 유지)
- **PWA**: next-pwa (서비스 워커 + manifest.json)
- **배포**: Docker 단일 컨테이너 (NAS/온프레미스)
- **스타일**: Tailwind CSS + `design-system/colors_and_type.css` 토큰 병행

### UI 원칙
- 모바일 우선 (최대 430px 중앙 정렬)
- PC 접속 시에도 모바일처럼 보임
- 태블릿/데스크톱 반응형은 나중에 확장 예정

### 디자인 시스템 (Wanted Design System)
- 토큰 파일: `design-system/colors_and_type.css` (구 `design-system.css`에서 이전)
- 폰트: `fonts/` 내 Pretendard woff2 9종
- 로고: `logos/` — 한글명 원본 + ASCII명 사본 (`logo-default.svg`, `logo-black.svg`, `logo-gray.svg`, `logo-white.svg`)
- 주요 토큰: `--color-accent` (#0066FF), `--color-border-subtle` (rgba(112,115,124,0.22)), `--radius-2xl` (24px 카드), `--radius-3xl` (32px 모달)
- 다크 테마: `[data-theme="dark"]` 또는 `.theme-dark`

## 다음 단계

1. `npx create-next-app`으로 프로젝트 초기화
2. Drizzle ORM + SQLite 설정
3. iron-session 인증 설정
4. next-pwa 설정
5. `design-system/colors_and_type.css`를 `app/globals.css`에서 import, 폰트 경로를 `/fonts/...` 절대경로로 수정

## 주요 파일

- [CLAUDE.md](CLAUDE.md) — 전체 프로젝트 가이드
- [features.md](features.md) — 기능 명세
- [design-system/colors_and_type.css](design-system/colors_and_type.css) — 디자인 토큰
