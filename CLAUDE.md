# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요

샘깊은교회(SGEC) 장소 예약 서비스. 교회 내 장소를 날짜/시간대별로 예약하고 Google Calendar에 동기화하는 웹 서비스.

- 전체 기능 명세: [features.md](features.md)
- 디자인 시스템: [design-system.css](design-system.css)
- 구 화면 디자인 목업 (참고용, 실제 구현 기준 아님): [old-page-designs/](old-page-designs/)

## 기술 스택

| 역할        | 선택                                          |
| ----------- | --------------------------------------------- |
| 프레임워크  | Next.js 15 (App Router) + TypeScript          |
| DB          | SQLite (WAL 모드)                             |
| ORM         | Drizzle ORM                                   |
| Auth        | iron-session (httpOnly 쿠키 세션, 영구 유지)  |
| 스타일      | Tailwind CSS + design-system.css 토큰 병행    |
| PWA         | next-pwa (서비스 워커, 앱 설치 지원)          |
| 캘린더 연동 | googleapis npm 패키지                         |
| 배포        | Docker 단일 컨테이너 (`output: 'standalone'`) |

> NAS / 저사양 온프레미스 환경 기준. 컨테이너 1개로 Next.js + SQLite를 함께 실행한다.

### 개발 명령어

```bash
npm run dev          # 개발 서버 (localhost:3000)
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 실행
npm run db:generate  # Drizzle 마이그레이션 파일 생성
npm run db:migrate   # 마이그레이션 적용
npm run db:studio    # Drizzle Studio (DB GUI)
```

### 디렉토리 구조

```
app/                  # Next.js App Router 페이지 및 Route Handlers
  (auth)/             # 로그인·회원가입 페이지
  (user)/             # 일반 사용자 페이지 (예약하기, 예약 상세, 나의 예약)
  (admin)/            # 관리자 페이지
  api/                # Route Handlers (Google Calendar OAuth 콜백 등)
lib/
  db/                 # Drizzle 스키마, 마이그레이션, DB 클라이언트
  auth/               # iron-session 설정, 세션 유틸
  calendar/           # Google Calendar API 연동 로직
components/           # 공용 UI 컴포넌트
```

## UI / PWA 원칙

- **모바일 우선 레이아웃**: 1차 구현은 모바일 너비(최대 430px) 단일 레이아웃으로 중앙 정렬. 태블릿·데스크톱 반응형은 추후 확장 예정이며, Tailwind의 모바일 퍼스트 구조를 그대로 활용한다.
- **PWA**: `next-pwa`로 서비스 워커를 등록. `manifest.json`에 앱 이름·아이콘·`display: standalone` 설정. 홈 화면 추가 시 네이티브 앱처럼 실행.
- **세션 영구 유지**: iron-session 쿠키의 `maxAge`를 충분히 길게 설정(예: 365일). 사용자가 명시적으로 로그아웃하지 않는 한 세션이 만료되지 않는다.

## 아키텍처

현재 저장소는 디자인/기획 단계이며, 위 스택을 기반으로 구현 예정입니다.

### 핵심 도메인 개념

- **예약하기**: 사용자가 날짜(주간 캘린더)를 선택하고 장소를 층·태그 기준으로 필터링하는 진입점.
- **예약 상세**: 핵심 예약 화면. 이미 예약된 시간 블록을 보여주고, 빈 시간 구간을 추출하여 30분 단위로 예약을 생성/수정/취소.
- **나의 예약**: 주간 캘린더 + 전체 목록 조회, 본인 예약 수정·취소.
- **관리자**: 대시보드, 사용자 승인, 장소·층·태그 CRUD, 전체 예약 관리.

### 주요 시스템 제약

- 예약 엔진은 **30분 슬롯** 단위로 동작하며, 트랜잭션으로 동일 장소/시간 중복을 방지.
- **Google Calendar 연동**: 구글 계정 1개에 캘린더 2개 사용.
  - _내부 캘린더_ (쓰기): 예약 생성/수정/취소 시 이벤트를 즉시 동기화. `event_id`로 1:1 매핑.
  - _외부 캘린더_ (읽기 전용): UI에 참고용으로 표시만 하며, **충돌 판단에 사용하지 않음**.
  - 우리 DB가 기준 데이터. 불일치 시 캘린더를 우리 데이터로 덮어씀.
- 인증: 이름 + 전화번호 로그인. 신규 가입 시 관리자 승인 대기 상태로 생성.

## 디자인 시스템

모든 UI는 [design-system.css](design-system.css)의 토큰을 사용해야 합니다.

- **폰트**: Pretendard (`fonts/` 내 woff2 파일). 본문은 `var(--font-sans)`, 헤드라인은 `var(--font-display)`.
- **주요 색상**: `--color-accent` (`#0066FF`, Wanted Blue). 호버: `--color-accent-hover`. 눌림: `--color-accent-pressed`.
- **간격**: 4px 기반 (`--space-1` = 4px … `--space-12` = 128px), 레이아웃은 8px 그리드.
- **보더**: 기본 보더는 `var(--color-border-subtle)` = `rgba(112,115,124,0.22)`.
- **다크 테마**: 부모 요소에 `[data-theme="dark"]` 또는 `.theme-dark` 적용.
- 상태 색상: 성공 `--color-success`, 경고 `--color-warning`, 위험 `--color-danger`.
- 그림자: `--shadow-1`(은은) ~ `--shadow-5`(모달/오버레이).
